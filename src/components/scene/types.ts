/**
 * BharatLaunch 3D: Scene Telemetry & Camera Types
 * Binds directly to the simulation engine telemetry state.
 */

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
  fairingJettisonTime_s: number = 176.6
): SimFrameState {
  return {
    ...state,
    groundStraponsDetached: state.time_s >= 69.9,
    airStraponsDetached: state.time_s >= 92.0,
    ps1Detached: state.time_s >= 109.8,
    fairingSeparated: state.time_s >= fairingJettisonTime_s || state.altitude_m >= 110000,
    ps2Detached: state.time_s >= 263.2,
    ps3Detached: state.time_s >= 580.0,
    ps4Cutoff: state.time_s >= 1029.0 || state.isOrbitAchieved,
  };
}
