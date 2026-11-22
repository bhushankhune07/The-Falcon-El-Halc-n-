import { useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SimFrameState, CameraMode } from './types';
import { SceneErrorBoundary } from './ErrorBoundary';
import { AscentScene } from './AscentScene';
import { OrbitScene } from './OrbitScene';
import { MissionConfig } from '../../sim';
import { InspectableComponent } from './inspectData';

interface Props {
  simFrame: SimFrameState;
  mission?: MissionConfig;
  cameraMode?: CameraMode;
  onCameraModeChange?: (mode: CameraMode) => void;
  deepSpaceActive?: boolean;
  deepSpacePhase?: number;
  blueprintMode?: boolean;
  onToggleBlueprint?: () => void;
  onSelectComponent?: (comp: InspectableComponent) => void;
}

/**
 * CameraManager detects cameraMode, deep space mode, and altitude boundary transitions (120 km)
 * to smoothly frame either the floating-origin rocket, orbital Earth, or deep-space transfer scene.
 */
function CameraManager({
  cameraMode,
  isHigh,
  deepSpaceActive,
  missionId,
}: {
  cameraMode: CameraMode;
  isHigh: boolean;
  deepSpaceActive?: boolean;
  missionId?: string;
}) {
  const { camera } = useThree();
  const prevRef = useRef<{ mode: CameraMode; high: boolean; ds?: boolean } | null>(null);

  useEffect(() => {
    if (
      !prevRef.current ||
      prevRef.current.mode !== cameraMode ||
      prevRef.current.high !== isHigh ||
      prevRef.current.ds !== deepSpaceActive
    ) {
      prevRef.current = { mode: cameraMode, high: isHigh, ds: deepSpaceActive };

      if (deepSpaceActive) {
        // Deep Space Camera Framing
        if (missionId === 'pslv-c25-mom') {
          camera.position.set(110, 100, 240);
          camera.lookAt(100, 0, -20);
        } else {
          // Aditya-L1 Sun-L1 transfer framing
          camera.position.set(130, 80, 210);
          camera.lookAt(140, 0, 0);
        }
      } else if (cameraMode === 'orbit') {
        if (isHigh) {
          // Orbit view above 120km: frame the Earth (radius 60) and satellite cleanly
          camera.position.set(0, 75, 140);
          camera.lookAt(0, 0, 0);
        } else {
          // Free-orbit around the rocket below 120km: frame the entire 44m PSLV-XL stack cleanly
          camera.position.set(-55, 48, 95);
          camera.lookAt(0, 43, 0);
        }
      }
    }
  }, [cameraMode, isHigh, deepSpaceActive, missionId, camera]);

  return null;
}

export function MissionCanvas({
  simFrame,
  mission,
  cameraMode = 'auto',
  onCameraModeChange,
  deepSpaceActive = false,
  deepSpacePhase = 0.5,
  blueprintMode = false,
  onToggleBlueprint,
  onSelectComponent,
}: Props) {
  const [showOrbitBadge, setShowOrbitBadge] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<InspectableComponent | null>(null);

  // Cross-fade threshold around 120 km
  const altKm = simFrame.altitude_m / 1000.0;
  const isHigh = altKm >= 120.0;
  const isAscentVisible = !deepSpaceActive && altKm < 130.0;
  const isOrbitVisible = deepSpaceActive || altKm >= 110.0;

  // Auto-switch to Orbit framing whenever altitude >= 120 km
  useEffect(() => {
    if (isHigh && !deepSpaceActive) {
      if (cameraMode !== 'orbit' && onCameraModeChange) {
        onCameraModeChange('orbit');
      }
    }
  }, [isHigh, cameraMode, deepSpaceActive, onCameraModeChange]);

  // Show "ENTERING ORBITAL VIEW" badge around 120 km transition
  useEffect(() => {
    if (!deepSpaceActive && altKm >= 115.0 && altKm <= 145.0) {
      setShowOrbitBadge(true);
    } else {
      setShowOrbitBadge(false);
    }
  }, [altKm, deepSpaceActive]);

  // Post-Cutoff elapsed time for commissioning sequence
  const ps4Stage = mission?.stages?.find((s) => s.type === 'ps4');
  const cutoffTime = ps4Stage ? ps4Stage.ignitionTime_s + ps4Stage.burnDuration_s : 1029.0;
  const dtCutoff = simFrame.ps4Cutoff ? Math.max(0, simFrame.time_s - cutoffTime) : 0;

  // Dynamic cross-fade opacities
  let ascentOpacity = 1.0;
  let orbitOpacity = 1.0;
  if (deepSpaceActive) {
    ascentOpacity = 0.0;
    orbitOpacity = 1.0;
  } else if (altKm >= 110.0 && altKm <= 130.0) {
    const fade = (altKm - 110.0) / 20.0;
    ascentOpacity = 1.0 - fade;
    orbitOpacity = fade;
  } else if (altKm < 110.0) {
    orbitOpacity = 0.0;
  } else {
    ascentOpacity = 0.0;
  }

  const orbitControlsTarget: [number, number, number] = deepSpaceActive
    ? mission?.id === 'pslv-c25-mom'
      ? [100, 0, -20]
      : [140, 0, 0]
    : isHigh
    ? [0, 0, 0]
    : [0, 43, 0];

  return (
    <div className="relative w-full h-full min-h-[450px] bg-slate-950 overflow-hidden select-none">
      <SceneErrorBoundary>
        <Canvas
          gl={{
            antialias: true,
            logarithmicDepthBuffer: true,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: deepSpaceActive
              ? [110, 100, 240]
              : cameraMode === 'orbit'
              ? isHigh
                ? [0, 75, 140]
                : [-55, 48, 95]
              : [-18, 16, 36],
            fov: 45,
            near: 0.1,
            far: 400000,
          }}
        >
          {/* Manages camera transitions when switching modes, crossing 120 km, or toggling deep space */}
          <CameraManager
            cameraMode={cameraMode}
            isHigh={isHigh}
            deepSpaceActive={deepSpaceActive}
            missionId={mission?.id}
          />

          {/* Controls: Enable OrbitControls when in 'orbit' mode or during deep-space phase */}
          <OrbitControls
            enabled={cameraMode === 'orbit' || deepSpaceActive}
            enableDamping
            dampingFactor={0.05}
            maxDistance={deepSpaceActive ? 800 : isHigh ? 400 : 120}
            minDistance={deepSpaceActive ? 40 : isHigh ? 65 : 20}
            target={orbitControlsTarget}
          />

          {/* ======================================================== */}
          {/* SCENE A: FLOATING-ORIGIN ASCENT SCENE (0 to 120 km)      */}
          {/* ======================================================== */}
          {isAscentVisible ? (
            <group visible={ascentOpacity > 0.01}>
              <AscentScene
                simFrame={simFrame}
                cameraMode={cameraMode}
                mission={mission}
                onSelectComponent={onSelectComponent}
                onHoverComponent={setHoveredComponent}
              />
            </group>
          ) : null}

          {/* ======================================================== */}
          {/* SCENE B: SCALED 3D EARTH ORBIT / DEEP-SPACE (> 120 km)   */}
          {/* ======================================================== */}
          {isOrbitVisible ? (
            <group visible={orbitOpacity > 0.01}>
              <OrbitScene
                simFrame={simFrame}
                mission={mission}
                targetOrbit={mission?.targetOrbit}
                deepSpaceActive={deepSpaceActive}
                deepSpacePhase={deepSpacePhase}
                blueprintMode={blueprintMode}
                onSelectComponent={onSelectComponent}
                onHoverComponent={setHoveredComponent}
              />
            </group>
          ) : null}
        </Canvas>
      </SceneErrorBoundary>

      {/* ======================================================== */}
      {/* HOVER TOOLTIP BADGE (INSTANT NAME DISPLAY OVER 3D PART)  */}
      {/* ======================================================== */}
      {hoveredComponent ? (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in duration-150">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-950/90 backdrop-blur-md border border-cyan-400/60 shadow-xl shadow-cyan-950/50 flex flex-col items-center gap-0.5 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide">
                {hoveredComponent.name}
              </span>
            </div>
            <span className="text-[10px] text-cyan-300">
              Click component to inspect engineering specifications ↗
            </span>
          </div>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* 120 KM TRANSITION HUD BADGE                              */}
      {/* ======================================================== */}
      {showOrbitBadge ? (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-500 animate-pulse">
          <div className="flex items-center gap-2 px-4 py-2 bg-sky-950/90 border border-sky-400/60 rounded-full shadow-lg shadow-sky-900/40 text-xs font-mono font-semibold tracking-wider text-sky-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            ENTERING ORBITAL VIEW (120 KM FAIRING JETTISON)
          </div>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* ORBITAL COMMISSIONING SEQUENCE INDICATOR PILLS           */}
      {/* ======================================================== */}
      {isOrbitVisible && !deepSpaceActive && simFrame.ps4Cutoff ? (
        <div className="absolute top-16 right-4 z-20 flex flex-col gap-1.5 text-[10px] font-mono pointer-events-none">
          <div className="px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 shadow-lg">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>1. PS4 STAGE SEPARATION</span>
          </div>
          <div
            className={`px-2.5 py-1 rounded backdrop-blur border flex items-center gap-1.5 shadow-lg transition-colors ${
              dtCutoff >= 3.0
                ? 'bg-slate-950/85 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className={dtCutoff >= 3.0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {dtCutoff >= 3.0 ? '✓' : '○'}
            </span>
            <span>2. SOLAR ARRAYS DEPLOYED</span>
          </div>
          <div
            className={`px-2.5 py-1 rounded backdrop-blur border flex items-center gap-1.5 shadow-lg transition-colors ${
              dtCutoff >= 6.5
                ? 'bg-slate-950/85 border-cyan-500/50 text-cyan-300 animate-pulse'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className={dtCutoff >= 6.5 ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
              {dtCutoff >= 6.5 ? '✓' : '○'}
            </span>
            <span>3. C-SAR RADAR ACTIVE</span>
          </div>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* BLUEPRINT MODE TOGGLE BUTTON (ORBITAL VIEW)              */}
      {/* ======================================================== */}
      {isOrbitVisible && !deepSpaceActive && onToggleBlueprint ? (
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={onToggleBlueprint}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shadow-lg ${
              blueprintMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-cyan-950/60'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            <span>📐 Blueprint Mode: {blueprintMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      ) : null}

      {/* Camera Mode Selector Pill (Bottom-Left) */}
      {!deepSpaceActive ? (
        <div className="absolute bottom-4 left-4 z-10 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 text-xs font-mono shadow-xl">
          <button
            onClick={() => onCameraModeChange && onCameraModeChange('auto')}
            className={`px-3 py-1 rounded transition-colors ${
              cameraMode === 'auto' || cameraMode === 'pad'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Cinematic broadcast director camera tracking liftoff to orbit"
          >
            Broadcast Cam
          </button>
          <button
            onClick={() => onCameraModeChange && onCameraModeChange('chase')}
            className={`px-3 py-1 rounded transition-colors ${
              cameraMode === 'chase'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Over-the-shoulder chase camera tracking rocket fuselage"
          >
            Chase Cam
          </button>
          <button
            onClick={() => onCameraModeChange && onCameraModeChange('orbit')}
            className={`px-3 py-1 rounded transition-colors ${
              cameraMode === 'orbit'
                ? 'bg-sky-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Free OrbitControls camera to rotate around vehicle or Earth"
          >
            Free Orbit
          </button>
        </div>
      ) : null}
    </div>
  );
}
