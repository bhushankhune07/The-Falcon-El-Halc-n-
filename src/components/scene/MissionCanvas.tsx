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
  cameraMode = 'chase',
  onCameraModeChange,
  deepSpaceActive = false,
  deepSpacePhase = 0.5,
  onSelectComponent,
}: Props) {
  const [showOrbitBadge, setShowOrbitBadge] = useState(false);

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
                onSelectComponent={onSelectComponent}
              />
            </group>
          ) : null}
        </Canvas>
      </SceneErrorBoundary>

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

      {/* Camera Mode Selector Pill (Bottom-Left) */}
      {!deepSpaceActive ? (
        <div className="absolute bottom-4 left-4 z-10 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 text-xs font-mono shadow-xl">
          <button
            onClick={() => onCameraModeChange && onCameraModeChange('pad')}
            className={`px-3 py-1 rounded transition-colors ${
              cameraMode === 'pad'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pad View
          </button>
          <button
            onClick={() => onCameraModeChange && onCameraModeChange('chase')}
            className={`px-3 py-1 rounded transition-colors ${
              cameraMode === 'chase'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chase View
          </button>
          <button
            onClick={() => onCameraModeChange && onCameraModeChange('orbit')}
            className={`px-3 py-1 rounded transition-colors ${
              cameraMode === 'orbit'
                ? 'bg-sky-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Orbit View
          </button>
        </div>
      ) : null}
    </div>
  );
}
