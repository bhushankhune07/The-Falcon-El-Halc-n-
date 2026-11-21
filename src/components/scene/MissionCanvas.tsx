import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SimFrameState, CameraMode } from './types';
import { SceneErrorBoundary } from './ErrorBoundary';
import { AscentScene } from './AscentScene';
import { OrbitScene } from './OrbitScene';

interface Props {
  simFrame: SimFrameState;
  cameraMode?: CameraMode;
  onCameraModeChange?: (mode: CameraMode) => void;
}

export function MissionCanvas({
  simFrame,
  cameraMode = 'chase',
  onCameraModeChange,
}: Props) {
  const [showOrbitBadge, setShowOrbitBadge] = useState(false);

  // Cross-fade threshold around 120 km
  const altKm = simFrame.altitude_m / 1000.0;
  const isAscentVisible = altKm < 130.0;
  const isOrbitVisible = altKm >= 110.0;

  // Show "ENTERING ORBITAL VIEW" badge around 120 km transition
  useEffect(() => {
    if (altKm >= 115.0 && altKm <= 145.0) {
      setShowOrbitBadge(true);
      // Automatically switch to 'orbit' camera mode if in 'pad' view
      if (cameraMode === 'pad' && onCameraModeChange) {
        onCameraModeChange('orbit');
      }
    } else {
      setShowOrbitBadge(false);
    }
  }, [altKm, cameraMode, onCameraModeChange]);

  // Dynamic cross-fade opacities
  let ascentOpacity = 1.0;
  let orbitOpacity = 1.0;
  if (altKm >= 110.0 && altKm <= 130.0) {
    const fade = (altKm - 110.0) / 20.0;
    ascentOpacity = 1.0 - fade;
    orbitOpacity = fade;
  } else if (altKm < 110.0) {
    orbitOpacity = 0.0;
  } else {
    ascentOpacity = 0.0;
  }

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
            position: cameraMode === 'orbit' ? [0, 80, 130] : [-18, 16, 36],
            fov: 45,
            near: 0.1,
            far: 5000,
          }}
        >
          {/* Controls: Enable OrbitControls in all modes with smooth damping */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            maxDistance={cameraMode === 'orbit' ? 400 : 150}
            minDistance={cameraMode === 'orbit' ? 65 : 4}
            target={cameraMode === 'orbit' ? [0, 0, 0] : [0, 20, 0]}
          />

          {/* ======================================================== */}
          {/* SCENE A: FLOATING-ORIGIN ASCENT SCENE (0 to 120 km)      */}
          {/* ======================================================== */}
          {isAscentVisible ? (
            <group visible={ascentOpacity > 0.01}>
              <AscentScene simFrame={simFrame} cameraMode={cameraMode} />
            </group>
          ) : null}

          {/* ======================================================== */}
          {/* SCENE B: SCALED 3D EARTH ORBIT SCENE (> 120 km)          */}
          {/* ======================================================== */}
          {isOrbitVisible ? (
            <group visible={orbitOpacity > 0.01}>
              <OrbitScene simFrame={simFrame} />
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

      {/* ======================================================== */}
      {/* CAMERA MODE SELECTOR PILLS (FLOATING ON CANVAS)          */}
      {/* ======================================================== */}
      {onCameraModeChange ? (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 p-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-lg">
          <button
            onClick={() => onCameraModeChange('pad')}
            disabled={altKm > 70}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
              cameraMode === 'pad'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-400'
            }`}
          >
            Pad View
          </button>
          <button
            onClick={() => onCameraModeChange('chase')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
              cameraMode === 'chase'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chase Cam
          </button>
          <button
            onClick={() => onCameraModeChange('orbit')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
              cameraMode === 'orbit'
                ? 'bg-emerald-500 text-white shadow-sm'
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
