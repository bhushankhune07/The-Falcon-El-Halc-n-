import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Orbit,
  ChevronRight,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MissionConfig, TrajectoryResult, SimulationState } from '../../sim';
import { MissionCanvas, SimFrameState, CameraMode } from '../scene';
import { TelemetrySidebar } from './TelemetrySidebar';
import { exportTelemetryCsv } from '../../utils/csvExport';
import { createRocketAudio, RocketAudioManager } from '../../utils/rocketAudio';

interface Props {
  mission: MissionConfig;
  trajectory: TrajectoryResult;
  currentState: SimulationState;
  simFrame: SimFrameState;
  currentTime_s: number;
  onSeek: (time_s: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  timeWarp: number;
  onSetTimeWarp: (warp: number) => void;
  cameraMode: CameraMode;
  onSetCameraMode: (mode: CameraMode) => void;
  onSkipToOrbit: () => void;
}

function getFlightDirectorCallout(t: number, maxTime: number): { phase: string; details: string } {
  if (t <= 2.0) {
    return {
      phase: 'T-0 LIFTOFF',
      details: 'PS1 Core & Ground Strap-Ons Ignited — Sriharikota FLP Pad Clear',
    };
  }
  if (t < 25.0) {
    return {
      phase: 'PITCH OVER / GRAVITY TURN',
      details: 'Programmed gravity turn initiated towards Bay of Bengal corridor',
    };
  }
  if (t < 50.0) {
    return {
      phase: 'AIR-LIT STRAP-ONS IGNITED',
      details: 'All 6 S12 Solid Boosters delivering peak combined thrust',
    };
  }
  if (t < 70.0) {
    return {
      phase: 'MAX-Q TRANSONIC LOADS',
      details: 'Transonic punch-through under peak aerodynamic dynamic pressure',
    };
  }
  if (t < 92.0) {
    return {
      phase: 'GROUND STRAP-ONS JETTISONED',
      details: '4 spent ground-lit motors decoupled cleanly into sea splash zone',
    };
  }
  if (t < 110.0) {
    return {
      phase: 'AIR STRAP-ONS JETTISONED',
      details: '2 air-lit strap-ons separated; PS1 core nearing propellant burnout',
    };
  }
  if (t < 176.0) {
    return {
      phase: 'PS1 SEPARATION & PS2 IGNITION',
      details: 'Vikas hypergolic liquid stage ignited; closed-loop guidance active',
    };
  }
  if (t < 263.0) {
    return {
      phase: 'PAYLOAD FAIRING JETTISONED',
      details: 'Above 100km Kármán boundary; heat shield split to expose spacecraft',
    };
  }
  if (t < 380.0) {
    return {
      phase: 'PS2 SEPARATION & PS3 SOLID MOTOR',
      details: 'HPS3 composite motor burning; high-Isp vacuum velocity build-up',
    };
  }
  if (t < 580.0) {
    return {
      phase: 'PS3 BURNOUT & COAST PHASE',
      details: 'Long exo-atmospheric coast phase aligning trajectory to local horizontal',
    };
  }
  if (t < maxTime - 2.0) {
    return {
      phase: 'PS4 TWIN ENGINES ACTIVE',
      details: 'Final orbital circularization burn trimming cutoff velocity vector',
    };
  }
  return {
    phase: 'ORBIT CUTOFF CONFIRMED',
    details: 'Spacecraft injected into target trajectory; payload separation primed',
  };
}

export function LaunchView({
  mission,
  trajectory,
  currentState,
  simFrame,
  currentTime_s,
  onSeek,
  isPlaying,
  onTogglePlay,
  timeWarp,
  onSetTimeWarp,
  cameraMode,
  onSetCameraMode,
  onSkipToOrbit,
}: Props) {
  const maxTime_s = trajectory.summary.cutoffTime_s;
  const altKm = currentState.altitude_m / 1000.0;
  const callout = getFlightDirectorCallout(currentTime_s, maxTime_s);

  // Web Audio procedural rocket sound manager
  const rocketAudio = useRef<RocketAudioManager | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(false);

  useEffect(() => {
    rocketAudio.current = createRocketAudio();
    return () => {
      rocketAudio.current?.dispose();
      rocketAudio.current = null;
    };
  }, []);

  useEffect(() => {
    rocketAudio.current?.update(currentState.thrust_N, currentState.altitude_m, isPlaying);
  }, [currentState.thrust_N, currentState.altitude_m, isPlaying]);

  const handleToggleAudio = () => {
    if (rocketAudio.current) {
      const next = rocketAudio.current.toggle();
      setIsAudioOn(next);
    }
  };

  const soundSpeed = currentState.altitude_m < 11000 ? 340 - (currentState.altitude_m / 11000) * 45 : 295;
  const mach = currentState.speed_ms / soundSpeed;

  const stageTimeline = [
    { label: 'T-0', isDone: currentTime_s > 0, isActive: currentTime_s <= 2.0 },
    { label: 'S12', isDone: simFrame.airStraponsDetached, isActive: currentTime_s > 0 && !simFrame.airStraponsDetached },
    { label: 'PS1', isDone: simFrame.ps1Detached, isActive: !simFrame.ps1Detached && currentTime_s > 2.0 },
    { label: 'PS2', isDone: simFrame.ps2Detached, isActive: simFrame.ps1Detached && !simFrame.ps2Detached },
    { label: 'FAIRING', isDone: simFrame.fairingSeparated, isActive: currentTime_s >= 170 && !simFrame.fairingSeparated },
    { label: 'PS3', isDone: simFrame.ps3Detached, isActive: simFrame.ps2Detached && !simFrame.ps3Detached },
    { label: 'PS4', isDone: simFrame.ps4Cutoff, isActive: simFrame.ps3Detached && !simFrame.ps4Cutoff },
    { label: 'ORBIT', isDone: simFrame.isOrbitAchieved, isActive: simFrame.ps4Cutoff },
  ];

  // First state crossing 125 km altitude (Item D10)
  const t125km = trajectory.states.find((s) => s.altitude_m >= 125000)?.time_s ?? 180;

  // Clamped jump helper
  const jumpTo = (t_s: number, cam?: CameraMode) => {
    const clamped = Math.max(0, Math.min(maxTime_s, t_s));
    onSeek(clamped);
    if (cam) onSetCameraMode(cam);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* ======================================================== */}
      {/* LEFT PANE (~65%): 3D CANVAS & TIMELINE CONTROLS          */}
      {/* ======================================================== */}
      <div className="flex-1 lg:flex-[65] flex flex-col h-full min-h-[420px] relative border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* 3D WebGL Canvas */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950">
          <MissionCanvas
            simFrame={simFrame}
            mission={mission}
            cameraMode={cameraMode}
            onCameraModeChange={onSetCameraMode}
          />

          {/* Top-Center Flight Director Live Mission Callout Ticker */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-[90%] sm:max-w-md pointer-events-none">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-xl shadow-cyan-950/40 text-xs font-mono">
              <span className="relative flex h-2 w-2 flex-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <div className="flex flex-col truncate">
                <span className="font-bold text-cyan-300 tracking-wider text-[11px] leading-tight">
                  {callout.phase}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-tight">
                  {callout.details}
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right "Skip to Orbit & Data" Judge Demo Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onSkipToOrbit}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Skip to Orbit &amp; Data</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floating Compact Telemetry HUD (Top-Left) */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 p-2.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-xs font-mono shadow-xl pointer-events-none">
            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-400 text-[10px]">MISSION CLOCK</span>
              <span className="font-bold text-white">T+{currentTime_s.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-400 text-[10px]">ALTITUDE</span>
              <span className="font-bold text-amber-400">{altKm.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-400 text-[10px]">VELOCITY</span>
              <span className="font-bold text-sky-400">{currentState.speed_ms.toFixed(0)} m/s</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-400 text-[10px]">PITCH</span>
              <span className="font-bold text-emerald-400">{currentState.pitch_deg.toFixed(1)}°</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-400 text-[10px]">DOWNRANGE</span>
              <span className="font-bold text-slate-300">{(currentState.downrange_m / 1000.0).toFixed(1)} km</span>
            </div>
          </div>

          {/* ISRO/SpaceX-Style Broadcast Telemetry Strip (Bottom of 3D Canvas) */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl font-mono text-xs">
            {/* Left: Attitude / Pitch Gyro Indicator */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="relative w-8 h-8 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Dynamic Artificial Horizon / Pitch Line */}
                <div
                  className="absolute w-7 h-0.5 bg-emerald-400 shadow-sm"
                  style={{
                    transform: `rotate(${-currentState.pitch_deg}deg)`,
                    transition: 'transform 0.1s linear',
                  }}
                />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Attitude</span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  {currentState.pitch_deg.toFixed(1)}°
                </span>
              </div>
            </div>

            {/* Center: Stage Sequence Timeline Strip */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/60 overflow-x-auto text-[10px]">
              {stageTimeline.map((item) => (
                <div
                  key={item.label}
                  className={`px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                    item.isActive
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm shadow-cyan-950'
                      : item.isDone
                      ? 'bg-slate-900 border-emerald-900/80 text-emerald-400/80'
                      : 'border-slate-800 text-slate-600'
                  }`}
                >
                  {item.isDone ? <span className="text-emerald-400 text-[9px]">✓</span> : null}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Right: Tabular Speed/Mach/G-force + Audio Toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">Velocity</span>
                  <span className="font-bold text-sky-400 tabular-nums">
                    {(currentState.speed_ms / 1000).toFixed(2)} km/s
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">Mach</span>
                  <span className="font-bold text-purple-400 tabular-nums">{mach.toFixed(1)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 uppercase">G-Force</span>
                  <span className="font-bold text-amber-400 tabular-nums">{currentState.sensedG.toFixed(1)} G</span>
                </div>
              </div>

              {/* Procedural Audio Toggle */}
              <button
                onClick={handleToggleAudio}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  isAudioOn
                    ? 'bg-orange-600/90 border-orange-400 text-white shadow-lg shadow-orange-950/60'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isAudioOn ? 'Mute Procedural Rocket Sound' : 'Enable Procedural Combustion Rumble (Web Audio API)'}
              >
                {isAudioOn ? <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] tracking-wide">{isAudioOn ? 'AUDIO ON' : 'AUDIO OFF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Playback & Scrubber Controls */}
        <div className="flex-none border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-3 flex flex-col gap-2 z-10">
          {/* Timeline Slider with T-0 to Cutoff */}
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
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 w-16 text-right">
              T+{maxTime_s.toFixed(0)}s
            </span>
          </div>

          {/* Controls Bar: Play, Time-Warp & Quick Demo Milestones */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onTogglePlay}
                className="p-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  onSeek(0);
                  onSetCameraMode('pad');
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
                    onClick={() => onSetTimeWarp(rate)}
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

            {/* Quick Demo Milestones & Export CSV Button */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                onClick={() => exportTelemetryCsv(trajectory, mission.name)}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                title="Download full trajectory telemetry table as CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => jumpTo(0, 'pad')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                T-0
              </button>
              <button
                onClick={() => jumpTo(70, 'chase')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Strap-on Sep (70s)
              </button>
              <button
                onClick={() => jumpTo(110, 'chase')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                PS1 Sep (110s)
              </button>
              <button
                onClick={() => jumpTo(t125km, 'orbit')}
                className="px-2.5 py-1 rounded bg-sky-950 border border-sky-800 hover:bg-sky-900 text-sky-200 font-semibold transition-colors flex items-center gap-1"
              >
                <FastForward className="w-3 h-3 text-cyan-400" />
                125 km (Cross-Fade)
              </button>
              <button
                onClick={() => jumpTo(maxTime_s, 'orbit')}
                className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 text-emerald-200 font-semibold transition-colors flex items-center gap-1"
              >
                <Orbit className="w-3 h-3 text-emerald-400" />
                Orbit Cutoff
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANE (~35%): VALIDATION SIDEBAR                    */}
      {/* ======================================================== */}
      <div className="flex-1 lg:flex-[35] h-full p-4 overflow-hidden bg-slate-950">
        <TelemetrySidebar
          trajectory={trajectory}
          currentState={currentState}
          mission={mission}
          publishedMilestones={mission.publishedMilestones}
        />
      </div>
    </div>
  );
}
