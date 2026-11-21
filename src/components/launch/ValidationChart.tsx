import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Scatter,
  CartesianGrid,
} from 'recharts';
import { TrajectoryResult, ISROMilestone } from '../../sim';

interface Props {
  trajectory: TrajectoryResult;
  currentTime_s: number;
  publishedMilestones: ISROMilestone[];
}

export function ValidationChart({
  trajectory,
  currentTime_s,
  publishedMilestones,
}: Props) {
  const [metric, setMetric] = useState<'altitude' | 'velocity'>('altitude');

  // Downsample states for Recharts high performance (every 10s gives ~100 points)
  const chartData = useMemo(() => {
    const states = trajectory.states;
    const sampled: Array<{
      time_s: number;
      simAltitude_km: number;
      simVelocity_ms: number;
      isroAltitude_km?: number;
      isroVelocity_ms?: number;
      eventLabel?: string;
    }> = [];

    // Map published milestones by nearest second
    const milestoneMap = new Map<number, ISROMilestone>();
    for (const m of publishedMilestones) {
      milestoneMap.set(Math.round(m.time_s), m);
    }

    for (let i = 0; i < states.length; i += 10) {
      const s = states[i];
      const t = Math.round(s.time_s);
      const milestone = milestoneMap.get(t);

      sampled.push({
        time_s: t,
        simAltitude_km: parseFloat((s.altitude_m / 1000.0).toFixed(1)),
        simVelocity_ms: parseFloat(s.speed_ms.toFixed(0)),
        isroAltitude_km: milestone?.expectedAltitude_km,
        isroVelocity_ms: milestone?.expectedVelocity_ms,
        eventLabel: milestone?.event,
      });
    }

    // Always include final cutoff point
    const last = states[states.length - 1];
    const lastMilestone = publishedMilestones[publishedMilestones.length - 1];
    sampled.push({
      time_s: Math.round(last.time_s),
      simAltitude_km: parseFloat((last.altitude_m / 1000.0).toFixed(1)),
      simVelocity_ms: parseFloat(last.speed_ms.toFixed(0)),
      isroAltitude_km: lastMilestone?.expectedAltitude_km,
      isroVelocity_ms: lastMilestone?.expectedVelocity_ms,
      eventLabel: lastMilestone?.event,
    });

    return sampled;
  }, [trajectory.states, publishedMilestones]);

  // Find the closest published milestone to current mission clock
  const currentMilestoneComparison = useMemo(() => {
    const comps = trajectory.summary.milestoneComparisons;
    if (!comps || comps.length === 0) return null;

    // Milestone closest to currentTime_s
    let closest = comps[0];
    let minDiff = Math.abs(currentTime_s - closest.time_s);

    for (const c of comps) {
      const diff = Math.abs(currentTime_s - c.time_s);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    return closest;
  }, [trajectory.summary.milestoneComparisons, currentTime_s]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/60 rounded-xl border border-slate-800 p-4 shadow-xl">
      {/* Header & Metric Switcher */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-mono font-bold text-white tracking-wider">
            MODEL VS. PUBLISHED ISRO MILESTONES
          </h3>
          <p className="text-[10px] font-mono text-slate-400">
            PSLV-C52 Golden Run Calibration Check
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setMetric('altitude')}
            className={`px-2.5 py-1 rounded transition-colors ${
              metric === 'altitude'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Altitude (km)
          </button>
          <button
            onClick={() => setMetric('velocity')}
            className={`px-2.5 py-1 rounded transition-colors ${
              metric === 'velocity'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Velocity (m/s)
          </button>
        </div>
      </div>

      {/* Live Active Milestone Accuracy Badge */}
      {currentMilestoneComparison ? (
        <div className="mb-3 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-semibold truncate max-w-[190px]">
              {currentMilestoneComparison.event}
            </span>
            <span className="text-slate-400">@ T+{currentMilestoneComparison.time_s.toFixed(0)}s</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                Math.abs(currentMilestoneComparison.altitudeErrorPct) <= 5.0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              Alt Err: {currentMilestoneComparison.altitudeErrorPct > 0 ? '+' : ''}
              {currentMilestoneComparison.altitudeErrorPct.toFixed(2)}%
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                Math.abs(currentMilestoneComparison.velocityErrorPct) <= 5.0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              Vel Err: {currentMilestoneComparison.velocityErrorPct > 0 ? '+' : ''}
              {currentMilestoneComparison.velocityErrorPct.toFixed(2)}%
            </span>
          </div>
        </div>
      ) : null}

      {/* Recharts Chart Area */}
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time_s"
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => `T+${v}s`}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              domain={metric === 'altitude' ? [0, 600] : [0, 8500]}
              tickFormatter={(v) => (metric === 'altitude' ? `${v}k` : `${v}`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              formatter={(val: number) => [
                metric === 'altitude' ? `${val} km` : `${val} m/s`,
                '',
              ]}
              labelFormatter={(label) => `Mission Clock: T+${label}s`}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

            {/* Live Vertical Playhead Marker */}
            <ReferenceLine
              x={Math.round(currentTime_s)}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: `T+${currentTime_s.toFixed(0)}s`,
                fill: '#f97316',
                fontSize: 10,
                position: 'top',
              }}
            />

            {metric === 'altitude' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="simAltitude_km"
                  name="Simulated RK4 Alt (km)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Scatter
                  dataKey="isroAltitude_km"
                  name="Published ISRO Target"
                  fill="#06b6d4"
                  shape="circle"
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="simVelocity_ms"
                  name="Simulated Velocity (m/s)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Scatter
                  dataKey="isroVelocity_ms"
                  name="Published ISRO Target"
                  fill="#10b981"
                  shape="circle"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
