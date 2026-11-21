/**
 * BharatLaunch 3D: Mission, Physics & Telemetry Types
 * Reference: ISRO PSLV-C52 / EOS-04 Mission Brochure & Flight Characteristics
 */

export interface StageConfig {
  name: string; // e.g. "S12 Ground Strap-ons", "PS1 Core", "S12 Air-lit Strap-ons", "PS2", "PS3", "PS4"
  type: 'strap_on_ground' | 'ps1_core' | 'strap_on_air' | 'ps2' | 'ps3' | 'ps4';
  fuelType: 'Solid' | 'Liquid' | 'Earth Storable Liquid';
  propellantName: string; // e.g. "HTPB", "UH25 + N2O4", "Mono Methyl Hydrazine + MON3"
  dryMass_kg: number;
  propellantMass_kg: number;
  thrustVacuum_kN: number;
  thrustSeaLevel_kN: number;
  ispVacuum_s: number;
  ispSeaLevel_s: number;
  burnDuration_s: number;
  startTime_s: number; // Ignited at T+
  separationTime_s: number; // Staged / jettisoned at T+
}

export interface FairingConfig {
  mass_kg: number;
  diameter_m: number;
  jettisonAltitude_km: number;
  jettisonTime_s: number;
}

export interface ISROMilestone {
  time_s: number;
  event: string;
  expectedAltitude_km: number;
  expectedVelocity_ms: number;
  tolerancePct?: number; // default +/- 5%
  isPublished: boolean;
}

export interface MissionConfig {
  id: string;
  name: string;
  variant: 'PSLV-XL';
  description: string;
  payloadName: string;
  payloadMass_kg: number;
  targetOrbit: {
    type: string; // e.g., "Sun-Synchronous Polar Orbit (SSO)"
    altitude_km: number;
    inclination_deg: number;
    period_min: number;
  };
  launchSite: {
    name: string;
    latitude_deg: number;
    longitude_deg: number;
    azimuth_deg: number;
    elevation_m: number;
  };
  pitchKick: {
    altitudeStart_m: number;
    altitudeEnd_m: number;
    initialAngle_deg: number; // Angle from vertical
  };
  stages: StageConfig[];
  fairing: FairingConfig;
  publishedMilestones: ISROMilestone[];
  disclaimer?: string;
}

export interface SimulationState {
  time_s: number;
  stageIndex: number;
  activeStageName: string;
  
  // State coordinates in 2D launch plane
  // x: horizontal downrange distance (m) along launch azimuth
  // y: altitude (m) above Earth surface
  // r: distance from Earth center (m)
  x_m: number;
  y_m: number;
  r_m: number;

  // Velocity components
  vx_ms: number;
  vy_ms: number;
  speed_ms: number;
  mach: number;

  // Rocket orientation and flight path
  pitchAngle_deg: number; // Pitch from local horizontal (90 = straight up, 0 = horizontal)
  flightPathAngle_deg: number; // Angle of velocity vector from horizontal
  angleofAttack_deg: number;

  // Mass & Propulsion
  mass_kg: number;
  thrust_N: number;
  massFlow_kgs: number;
  gSensed: number; // in G's

  // Atmospheric properties
  density_kgm3: number;
  dynamicPressure_kPa: number;
  dragForce_N: number;
  cd: number;

  // Orbital mechanics
  semiMajorAxis_km: number;
  perigeeAltitude_km: number;
  apogeeAltitude_km: number;
  eccentricity: number;
  orbitEnergy_Jkg: number;

  // Event flags
  events: string[];
  isOrbitReached: boolean;
  isStagingHappening: boolean;
  stagedComponents: string[];
}

export interface ChallengeModeParams {
  enabled: boolean;
  payloadMassDelta_kg: number; // e.g. -500 to +1000 kg
  pitchKickAngleDelta_deg: number; // e.g. -5 to +5 deg
  windPreset: 'calm' | 'moderate_headwind' | 'severe_shear' | 'tailwind_boost';
}

export interface SimulationTrajectory {
  mission: MissionConfig;
  samples: SimulationState[];
  summary: {
    cutoffTime_s: number;
    finalAltitude_km: number;
    finalVelocity_ms: number;
    finalPerigee_km: number;
    finalApogee_km: number;
    maxQ_kPa: number;
    maxQTime_s: number;
    maxGSensed: number;
    maxGTime_s: number;
    orbitSuccess: boolean;
    milestoneErrors: {
      event: string;
      time_s: number;
      actualAlt_km: number;
      targetAlt_km: number;
      altErrorPct: number;
      actualVel_ms: number;
      targetVel_ms: number;
      velErrorPct: number;
      passed: boolean;
    }[];
  };
}
