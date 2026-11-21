import { Play, Pause, RotateCcw, FastForward, Orbit, ChevronRight } from 'lucide-react';
import { MissionConfig, TrajectoryResult, SimulationState } from '../../sim';
import { MissionCanvas, SimFrameState, CameraMode } from '../scene';
import { TelemetrySidebar } from './TelemetrySidebar';

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

            {/* Quick Demo Milestones (Clamped to maxTime_s, Item D10) */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
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
