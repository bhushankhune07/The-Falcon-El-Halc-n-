/**
 * BharatLaunch 3D: Scene Telemetry & Camera Types
 * Binds directly to the simulation engine telemetry state.
 */

import { MissionConfig, StageDefinition, FairingDefinition } from '../../sim';

export type CameraMode = 'chase' | 'pad' | 'orbit';

export interface SimFrameState {
  time_s: number;
  altitude_m: number;
  speed_ms: number;
  pitch_deg: number; // 90° = vertical, 0° = horizontal
  flightPathAngle_deg: number;
  downrange_m: number;
  thrust_N: number;
  sensedG: number;
  dynamicPressure_kPa: number;
  activeStages: string[];
  events: string[];
  isOrbitAchieved: boolean;

  // Staging animation flags
  groundStraponsDetached: boolean;
  airStraponsDetached: boolean;
  ps1Detached: boolean;
  fairingSeparated: boolean;
  ps2Detached: boolean;
  ps3Detached: boolean;
  ps4Cutoff: boolean;
}

/**
 * Helper to convert SimulationState from engine into SimFrameState
 * Reads separation times and cutoff time from mission.stages
 */
export function deriveSimFrameState(
  state: {
    time_s: number;
    altitude_m: number;
    speed_ms: number;
    pitch_deg: number;
    flightPathAngle_deg: number;
    downrange_m: number;
    thrust_N: number;
    sensedG: number;
    dynamicPressure_kPa: number;
    activeStages: string[];
    events: string[];
    isOrbitAchieved: boolean;
  },
  mission?: MissionConfig | { stages: StageDefinition[]; fairing: FairingDefinition }
): SimFrameState {
  const stages = mission?.stages ?? [];
  const fairing = mission?.fairing;

  const ground = stages.find((s) => s.type === 'strap_on_ground');
  const air = stages.find((s) => s.type === 'strap_on_air');
  const ps1 = stages.find((s) => s.type === 'ps1_core');
  const ps2 = stages.find((s) => s.type === 'ps2');
  const ps3 = stages.find((s) => s.type === 'ps3');
  const ps4 = stages.find((s) => s.type === 'ps4');

  const groundSep = ground?.separationTime_s ?? 69.9;
  const airSep = air?.separationTime_s ?? 92.0;
  const ps1Sep = ps1?.separationTime_s ?? 109.8;
  const ps2Sep = ps2?.separationTime_s ?? 263.2;
  const ps3Sep = ps3?.separationTime_s ?? 580.0;
  const fairingTime = fairing?.jettisonTime_s ?? 176.6;
  const fairingAlt = fairing?.jettisonAltitude_m ?? 110000;

  const ps4Cutoff = ps4
    ? state.time_s >= ps4.ignitionTime_s + ps4.burnDuration_s
    : state.time_s >= 1029.0;

  return {
    ...state,
    groundStraponsDetached: state.time_s >= groundSep,
    airStraponsDetached: state.time_s >= airSep,
    ps1Detached: state.time_s >= ps1Sep,
    fairingSeparated: state.time_s >= fairingTime || state.altitude_m >= fairingAlt,
    ps2Detached: state.time_s >= ps2Sep,
    ps3Detached: state.time_s >= ps3Sep,
    ps4Cutoff,
  };
}
