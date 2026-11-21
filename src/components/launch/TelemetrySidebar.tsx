import { Flame, Gauge, CheckCircle, Clock } from 'lucide-react';
import { TrajectoryResult, ISROMilestone, SimulationState } from '../../sim';
import { ValidationChart } from './ValidationChart';

interface Props {
  trajectory: TrajectoryResult;
  currentState: SimulationState;
  publishedMilestones: ISROMilestone[];
}

export function TelemetrySidebar({
  trajectory,
  currentState,
  publishedMilestones,
}: Props) {
  const { summary } = trajectory;
  const t = currentState.time_s;

  return (
    <div className="flex flex-col h-full w-full gap-4 overflow-y-auto pr-1">
      {/* ======================================================== */}
      {/* 1. VALIDATION CHART (MODEL VS ISRO)                      */}
      {/* ======================================================== */}
      <div className="flex-none h-[300px]">
        <ValidationChart
          trajectory={trajectory}
          currentTime_s={t}
          publishedMilestones={publishedMilestones}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. MODEL-ONLY FLIGHT LOADS (MAX-Q & SENSED G-FORCE)      */}
      {/* ======================================================== */}
      <div className="flex-none p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            AERODYNAMIC &amp; INERTIAL FLIGHT LOADS
          </h3>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            MODEL OUTPUT
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Max-Q Card */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>DYNAMIC PRESSURE</span>
              <Flame className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {currentState.dynamicPressure_kPa.toFixed(1)} <span className="text-xs text-slate-400">kPa</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              Max-Q: <span className="text-white font-semibold">{summary.maxQ_kPa.toFixed(1)} kPa</span> @ T+{summary.maxQTime_s.toFixed(0)}s
            </div>
          </div>

          {/* Sensed G-Force Card */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>SENSED ACCELERATION</span>
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-400">
              {currentState.sensedG.toFixed(2)} <span className="text-xs text-slate-400">G</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              Peak Accel: <span className="text-white font-semibold">{summary.maxG.toFixed(2)} G</span> @ T+{summary.maxGTime_s.toFixed(0)}s
            </div>
          </div>
        </div>

        <p className="text-[10px] font-mono text-slate-400 italic">
          * Model output (derived from RK4 aerodynamic drag and mass flow thrust; not published in mission brochure).
        </p>
      </div>

      {/* ======================================================== */}
      {/* 3. LIVE EVENT & STAGING MILESTONE LOG                    */}
      {/* ======================================================== */}
      <div className="flex-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          ISRO ASCENT SEQUENCE OF EVENTS
        </h3>

        <div className="space-y-2">
          {publishedMilestones.map((m, idx) => {
            const isCompleted = t >= m.time_s;
            const isCurrent = Math.abs(t - m.time_s) <= 15.0;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-between ${
                  isCurrent
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-sm shadow-amber-500/20'
                    : isCompleted
                    ? 'bg-slate-950/50 border-slate-800/60 text-slate-400'
                    : 'bg-slate-950/20 border-slate-800/30 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-none" />
                  )}
                  <span className={isCurrent ? 'font-bold text-amber-300' : isCompleted ? 'text-slate-300' : 'text-slate-400'}>
                    {m.event}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-[11px]">
                  <span className="text-slate-400">T+{m.time_s.toFixed(1)}s</span>
                  <span className="font-semibold text-slate-400">{m.expectedAltitude_km} km</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
