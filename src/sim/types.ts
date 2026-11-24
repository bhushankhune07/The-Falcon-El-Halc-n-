/**
 * Urdhva: Mission, Physics & Telemetry Types
 * Strictly decoupled from React / Three.js. 100% SI Units.
 */

export type ProvenanceTag = 'REAL' | 'CALIBRATED' | 'SYNTHETIC';

export interface StageDefinition {
  id: string;
  name: string;
  type: 'strap_on_ground' | 'strap_on_air' | 'ps1_core' | 'ps2' | 'ps3' | 'ps4';
  propellantName: string;
  count: number; // e.g. 4 for ground strap-ons, 2 for air strap-ons, 1 for stages
  dryMassPerUnit_kg: number;
  propellantMassPerUnit_kg: number;
  thrustVacuumPerUnit_N: number;
  thrustSeaLevelPerUnit_N: number;
  ispVacuum_s: number;
  ispSeaLevel_s: number;
  burnDuration_s: number;
  ignitionTime_s: number;
  separationTime_s: number;
}

export interface FairingDefinition {
  mass_kg: number;
  diameter_m: number;
  jettisonTime_s: number;
  jettisonAltitude_m: number;
}

export interface ISROMilestone {
  time_s: number;
  event: string;
  expectedAltitude_km: number;
  expectedVelocity_ms: number;
  tolerancePct?: number; // default 5%
  isPublished: boolean;
}

export interface PitchScheduleNode {
  time_s: number;
  pitchDeg: number; // Angle relative to local horizontal (90 = straight up, 0 = parallel to surface)
}

export interface MissionProvenance {
  sources: {
    brochure: string;
    bhoonidhi: string;
    astrodynamics: string;
  };
  tags: Record<string, ProvenanceTag>;
}

export interface MissionConfig {
  id: string;
  name: string;
  variant: 'PSLV-XL';
  description: string;
  payloadName: string;
  payloadMass_kg: number;
  launchSite: {
    name: string;
    latitude_deg: number;
    longitude_deg: number;
    azimuth_deg: number;
    elevation_m: number;
  };
  targetOrbit: {
    type: string;
    altitude_km: number;
    inclination_deg: number;
    period_min: number;
  };
  fairing: FairingDefinition;
  stages: StageDefinition[];
  pitchSchedule: PitchScheduleNode[];
  publishedMilestones: ISROMilestone[];
  provenance: MissionProvenance;
  disclaimer?: string;
}

export interface SimulationState {
  time_s: number;
  
  // Coordinates in 2D launch plane
  // X: inertial horizontal/orbital coordinate (m)
  // Y: inertial vertical/orbital coordinate (m)
  // r: distance from Earth center (m)
  // h: altitude above Earth radius (m)
  // downrange_m: surface arc distance from Sriharikota pad (m)
  r_m: number;
  altitude_m: number;
  downrange_m: number;

  // Inertial velocity
  vx_ms: number;
  vy_ms: number;
  speed_ms: number; // inertial speed

  // Relative velocity (w.r.t. rotating atmosphere)
  relSpeed_ms: number;
  mach: number;

  // Angles
  pitch_deg: number; // Pitch w.r.t. local horizontal
  flightPathAngle_deg: number; // Velocity angle w.r.t. local horizontal

  // Propulsion & Mass
  totalMass_kg: number;
  thrust_N: number;
  massFlow_kgs: number;
  sensedG: number; // (Thrust - Drag) / (m * g0)

  // Atmosphere
  density_kgm3: number;
  dynamicPressure_kPa: number;
  dragForce_N: number;
  cd: number;

  // Orbital Elements at current instant
  semiMajorAxis_km: number;
  perigee_km: number;
  apogee_km: number;
  eccentricity: number;

  // Events & Staging
  activeStages: string[];
  events: string[];
  isOrbitAchieved: boolean;
  isStagingEvent: boolean;
}

export type WindScenario = 'nominal' | 'moderate' | 'high_crosswind';

export interface ChallengeModeModifiers {
  enabled: boolean;
  payloadDeltaKg: number; // -500 to +1500 kg
  pitchKickDeg: number; // delta to pitch kick (-5 to +5 deg)
  windScenario: WindScenario;
}

export interface MilestoneComparison {
  event: string;
  time_s: number;
  targetAltitude_km: number;
  actualAltitude_km: number;
  altitudeErrorPct: number;
  targetVelocity_ms: number;
  actualVelocity_ms: number;
  velocityErrorPct: number;
  tolerancePct?: number;
  passed: boolean;
}

export interface TrajectoryResult {
  mission: MissionConfig;
  modifiers: ChallengeModeModifiers;
  states: SimulationState[]; // 1 Hz sampled states for fast telemetry/charting
  fullStateCount: number;
  summary: {
    cutoffTime_s: number;
    finalAltitude_km: number;
    finalVelocity_ms: number;
    finalPerigee_km: number;
    finalApogee_km: number;
    finalEccentricity: number;
    maxQ_kPa: number;
    maxQTime_s: number;
    maxG: number;
    maxGTime_s: number;
    orbitAchieved: boolean;
    orbitTargetAltitude_km: number;
    milestoneComparisons: MilestoneComparison[];
  };
}
