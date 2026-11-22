import { TrajectoryResult } from '../sim';

/**
 * Exports simulated flight telemetry table as CSV download.
 * Columns: time_s,altitude_km,velocity_ms,downrange_km,pitch_deg,dynamic_pressure_kpa,sensed_g,stage
 */
export function exportTelemetryCsv(trajectory: TrajectoryResult, missionName: string): void {
  const headers = [
    'time_s',
    'altitude_km',
    'velocity_ms',
    'downrange_km',
    'pitch_deg',
    'dynamic_pressure_kpa',
    'sensed_g',
    'stage',
  ];

  const rows = trajectory.states.map((s) => [
    s.time_s.toFixed(2),
    (s.altitude_m / 1000.0).toFixed(3),
    s.speed_ms.toFixed(2),
    (s.downrange_m / 1000.0).toFixed(3),
    s.pitch_deg.toFixed(2),
    s.dynamicPressure_kPa.toFixed(2),
    s.sensedG.toFixed(3),
    `"${s.activeStages.join(' + ')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = missionName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  link.download = `urdhva_${safeName}_telemetry_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
