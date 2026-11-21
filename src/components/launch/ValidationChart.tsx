import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrajectoryResult, ISROMilestone, MissionConfig } from '../../sim';

interface Props {
  trajectory: TrajectoryResult;
  currentTime_s: number;
  publishedMilestones: ISROMilestone[];
  mission?: MissionConfig;
  isGoldenRun?: boolean;
}

export function ValidationChart({
  trajectory,
  currentTime_s,
  publishedMilestones,
  mission,
  isGoldenRun = true,
}: Props) {
  const [metric, setMetric] = useState<'altitude' | 'velocity'>('altitude');
  const missionName = mission?.name ?? trajectory.mission?.name ?? 'PSLV-C52 / EOS-04';

  // Sample simulation trajectory states for high performance
  const chartData = useMemo(() => {
    const states = trajectory.states;
    const sampled: Array<{
      time_s: number;
      simVal: number;
    }> = [];

    for (let i = 0; i < states.length; i += 10) {
      const s = states[i];
      const t = Math.round(s.time_s);
      sampled.push({
        time_s: t,
        simVal:
          metric === 'altitude'
            ? parseFloat((s.altitude_m / 1000.0).toFixed(1))
            : parseFloat(s.speed_ms.toFixed(0)),
      });
    }

    // Always include final cutoff point
    const last = states[states.length - 1];
    sampled.push({
      time_s: Math.round(last.time_s),
      simVal:
        metric === 'altitude'
          ? parseFloat((last.altitude_m / 1000.0).toFixed(1))
          : parseFloat(last.speed_ms.toFixed(0)),
    });

    return sampled;
  }, [trajectory.states, metric]);

  // Published ISRO milestones as a separate Scatter dataset
  const milestoneData = useMemo(() => {
    return publishedMilestones.map((m) => ({
      time_s: m.time_s,
      isroVal: metric === 'altitude' ? m.expectedAltitude_km : m.expectedVelocity_ms,
      event: m.event,
      tolerancePct: m.tolerancePct ?? 5.0,
    }));
  }, [publishedMilestones, metric]);

  // Find the closest published milestone to current mission clock
  const currentMilestoneComparison = useMemo(() => {
    const comps = trajectory.summary.milestoneComparisons;
    if (!comps || comps.length === 0) return null;

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

  const tolPct = currentMilestoneComparison?.tolerancePct ?? 5.0;

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/60 rounded-xl border border-slate-800 p-4 shadow-xl">
      {/* Header & Metric Switcher */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
            {isGoldenRun
              ? `${missionName} — FIT RESIDUALS (CALIBRATED TO THESE POINTS)`
              : `${missionName.toUpperCase()} — FLIGHT TELEMETRY`}
          </h3>
          <p className="text-[10px] font-mono text-slate-400">
            {isGoldenRun
              ? 'Model checkpoints calibrated to published ISRO sequence of events'
              : 'Simulated Telemetry (Experimental — not validated vs ISRO)'}
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

      {/* Live Active Milestone Fit Residual Badge (Golden Run only) */}
      {isGoldenRun && currentMilestoneComparison ? (
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
                Math.abs(currentMilestoneComparison.altitudeErrorPct) <= tolPct
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              Alt Residual: {currentMilestoneComparison.altitudeErrorPct > 0 ? '+' : ''}
              {currentMilestoneComparison.altitudeErrorPct.toFixed(2)}%
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                Math.abs(currentMilestoneComparison.velocityErrorPct) <= tolPct
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              Vel Residual: {currentMilestoneComparison.velocityErrorPct > 0 ? '+' : ''}
              {currentMilestoneComparison.velocityErrorPct.toFixed(2)}%
            </span>
          </div>
        </div>
      ) : null}

      {/* Recharts ComposedChart Area (Item C9) */}
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time_s"
              type="number"
              domain={[0, 'dataMax']}
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => `T+${v}s`}
            />
            <YAxis
              domain={[0, 'auto']}
              stroke="#64748b"
              fontSize={10}
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

            {/* Continuous Simulated Curve */}
            <Line
              type="monotone"
              dataKey="simVal"
              name={metric === 'altitude' ? 'Simulated RK4 Alt (km)' : 'Simulated Velocity (m/s)'}
              stroke={metric === 'altitude' ? '#f59e0b' : '#38bdf8'}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Discrete Published ISRO Milestones as Separate Scatter Series (Golden Run only) */}
            {isGoldenRun ? (
              <Scatter
                data={milestoneData}
                dataKey="isroVal"
                name="Published ISRO Target"
                fill="#06b6d4"
                shape="circle"
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
