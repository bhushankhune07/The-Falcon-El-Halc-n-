import { useState, useMemo, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rocket, Orbit, ShieldCheck, Compass } from 'lucide-react';
import { SimulationEngine, PRESET_MISSIONS, DEFAULT_MISSION_ID, SimulationState } from './sim';
import { MissionCanvas, deriveSimFrameState, CameraMode } from './components/scene';

export default function App() {
  const mission = PRESET_MISSIONS[DEFAULT_MISSION_ID];

  // Precompute full ascent trajectory from pure TypeScript simulation engine
  const trajectory = useMemo(() => {
    const engine = new SimulationEngine(mission, { enabled: false });
    return engine.runSimulation();
  }, [mission]);

  const [currentTime_s, setCurrentTime_s] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeWarp, setTimeWarp] = useState<number>(5);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');

  const maxTime_s = trajectory.summary.cutoffTime_s;
  const animRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Playback animation loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimestampRef.current !== null && isPlaying) {
        const dt_s = (timestamp - lastTimestampRef.current) / 1000.0;
        setCurrentTime_s((prev) => {
          const next = prev + dt_s * timeWarp;
          if (next >= maxTime_s) {
            setIsPlaying(false);
            return maxTime_s;
          }
          return next;
        });
      }
      lastTimestampRef.current = timestamp;
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, timeWarp, maxTime_s]);

  // Interpolate current simulation telemetry state
  const currentState: SimulationState = useMemo(() => {
    const states = trajectory.states;
    if (!states || states.length === 0) {
      throw new Error('Simulation states empty');
    }
    const idx = Math.min(states.length - 1, Math.max(0, Math.floor(currentTime_s)));
    const s0 = states[idx];
    const s1 = states[Math.min(states.length - 1, idx + 1)];
    const frac = currentTime_s - Math.floor(currentTime_s);

    return {
      ...s0,
      time_s: currentTime_s,
      altitude_m: s0.altitude_m + (s1.altitude_m - s0.altitude_m) * frac,
      downrange_m: s0.downrange_m + (s1.downrange_m - s0.downrange_m) * frac,
      speed_ms: s0.speed_ms + (s1.speed_ms - s0.speed_ms) * frac,
      pitch_deg: s0.pitch_deg + (s1.pitch_deg - s0.pitch_deg) * frac,
      flightPathAngle_deg: s0.flightPathAngle_deg + (s1.flightPathAngle_deg - s0.flightPathAngle_deg) * frac,
      thrust_N: frac < 0.5 ? s0.thrust_N : s1.thrust_N,
      sensedG: s0.sensedG + (s1.sensedG - s0.sensedG) * frac,
      dynamicPressure_kPa: s0.dynamicPressure_kPa + (s1.dynamicPressure_kPa - s0.dynamicPressure_kPa) * frac,
      events: s0.events.length > 0 ? s0.events : s1.events,
      activeStages: s0.activeStages,
      isOrbitAchieved: s0.isOrbitAchieved,
    };
  }, [trajectory.states, currentTime_s]);

  const simFrame = useMemo(() => {
    return deriveSimFrameState(currentState, mission.fairing.jettisonTime_s);
  }, [currentState, mission.fairing.jettisonTime_s]);

  // Jump to specific trajectory milestone
  const jumpTo = (time_s: number, targetCamMode?: CameraMode) => {
    setCurrentTime_s(time_s);
    if (targetCamMode) {
      setCameraMode(targetCamMode);
    }
  };

  const altKm = currentState.altitude_m / 1000.0;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-100 font-sans overflow-hidden select-none">
      {/* ======================================================== */}
      {/* MISSION CONTROL HEADER                                   */}
      {/* ======================================================== */}
      <header className="flex-none h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">BharatLaunch 3D</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                ASTRA 2026
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">|</span>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">{mission.name}</span>
            </div>
          </div>
        </div>

        {/* Live Staging / Scene Indicator Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">STAGE:</span>
            <span className="font-semibold text-emerald-400">
              {currentState.activeStages.length > 0 ? currentState.activeStages.join(' + ') : 'COAST'}
            </span>
          </div>

          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Data Provenance</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3D MISSION VIEWPORT (CANVAS)                             */}
      {/* ======================================================== */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-slate-950">
        <MissionCanvas
          simFrame={simFrame}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
        />

        {/* Top-Left Telemetry Overlay Ribbon */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-3 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-xs font-mono shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            LIVE TELEMETRY
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">MISSION CLOCK</span>
            <span className="font-semibold text-white">T+{currentTime_s.toFixed(1)}s</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">ALTITUDE</span>
            <span className="font-semibold text-amber-400">{altKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">INERTIAL VELOCITY</span>
            <span className="font-semibold text-sky-400">{currentState.speed_ms.toFixed(0)} m/s</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">PITCH ANGLE</span>
            <span className="font-semibold text-emerald-400">{currentState.pitch_deg.toFixed(1)}°</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">DOWNRANGE</span>
            <span className="font-semibold text-slate-300">{(currentState.downrange_m / 1000.0).toFixed(1)} km</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-slate-400">SENSED ACCEL</span>
            <span className="font-semibold text-purple-400">{currentState.sensedG.toFixed(2)} G</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PLAYBACK & TIMELINE CONTROL BAR                          */}
      {/* ======================================================== */}
      <footer className="flex-none border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-3 z-20 flex flex-col gap-2">
        {/* Timeline Slider with Milestone Markers */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 w-16">
            T+{currentTime_s.toFixed(0)}s
          </span>
          <input
            type="range"
            min={0}
            max={maxTime_s}
            step={0.5}
            value={currentTime_s}
            onChange={(e) => setCurrentTime_s(parseFloat(e.target.value))}
            className="flex-1 accent-orange-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-400 w-16 text-right">
            T+{maxTime_s.toFixed(0)}s
          </span>
        </div>

        {/* Playback Controls & Quick Jumps */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Play/Pause & Speed Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setCurrentTime_s(0);
                setIsPlaying(false);
                setCameraMode('pad');
              }}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset to T-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Time-Warp Presets */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 ml-2">
              {[1, 5, 10, 20].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setTimeWarp(rate)}
                  className={`px-2 py-0.5 text-xs font-mono rounded ${
                    timeWarp === rate
                      ? 'bg-orange-500 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Quick Jump Buttons for Judges / Demos */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => jumpTo(0, 'pad')}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              T-0 (Pad)
            </button>
            <button
              onClick={() => jumpTo(70, 'chase')}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Strap-on Sep (T+70s)
            </button>
            <button
              onClick={() => jumpTo(110, 'chase')}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              PS1 Sep (T+110s)
            </button>
            <button
              onClick={() => jumpTo(180, 'orbit')}
              className="px-2.5 py-1 rounded bg-sky-950 border border-sky-800 hover:bg-sky-900 text-sky-200 font-semibold transition-colors flex items-center gap-1"
            >
              <FastForward className="w-3 h-3 text-cyan-400" />
              125 km (Orbit View)
            </button>
            <button
              onClick={() => jumpTo(1029, 'orbit')}
              className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 text-emerald-200 font-semibold transition-colors flex items-center gap-1"
            >
              <Orbit className="w-3 h-3 text-emerald-400" />
              Orbit Insertion / SAR
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
