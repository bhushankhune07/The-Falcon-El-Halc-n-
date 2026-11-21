/**
 * Atmospheric Model & Aerodynamic Drag for PSLV Ascent
 * Exponential atmosphere simplification: ρ(h) = 1.225 * exp(-h / 7500)
 */

import { WindScenario } from './types';

export const RHO_SEA_LEVEL = 1.225; // kg/m^3
export const SCALE_HEIGHT = 7500.0; // m (7.5 km scale height)
export const PSLV_FAIRING_RADIUS = 1.4; // m (2.8 m diameter)
export const FAIRING_FRONTAL_AREA = Math.PI * PSLV_FAIRING_RADIUS * PSLV_FAIRING_RADIUS; // ~6.1575 m^2

/**
 * Exponential atmospheric density model:
 * ρ(h) = 1.225 * exp(-h / 7500)
 * Tag: Exponential atmosphere simplification
 */
export function getAtmosphericDensity(altitude_m: number): number {
  if (altitude_m < 0) altitude_m = 0;
  if (altitude_m > 125000) return 0; // Negligible drag above 125 km
  return RHO_SEA_LEVEL * Math.exp(-altitude_m / SCALE_HEIGHT);
}

/**
 * Speed of sound approximation (ISA temperature gradient)
 */
export function getSpeedOfSound(altitude_m: number): number {
  let T_k = 288.15 - 0.0065 * Math.min(altitude_m, 11000);
  if (altitude_m > 11000 && altitude_m <= 25000) {
    T_k = 216.65;
  } else if (altitude_m > 25000) {
    T_k = 216.65 + 0.0028 * Math.min(altitude_m - 25000, 22000);
  }
  const gamma = 1.4;
  const R_air = 287.05; // J/(kg*K)
  return Math.sqrt(gamma * R_air * Math.max(T_k, 180));
}

/**
 * Mach-dependent Drag Coefficient Cd(Mach) for PSLV:
 * Subsonic: ~0.30
 * Transonic: peaks ~0.55 near Mach 1.05
 * Supersonic/Hypersonic: decays smoothly to ~0.28
 */
export function getDragCoefficient(mach: number): number {
  if (mach <= 0.8) {
    return 0.30;
  } else if (mach < 1.05) {
    // Transonic rise from 0.30 to 0.55
    const t = (mach - 0.8) / (1.05 - 0.8);
    return 0.30 + 0.25 * (0.5 * (1 - Math.cos(Math.PI * t)));
  } else if (mach < 1.4) {
    // Transonic peak drop
    const t = (mach - 1.05) / (1.4 - 1.05);
    return 0.55 - 0.15 * t;
  } else if (mach < 3.5) {
    // Supersonic decrease
    const t = (mach - 1.4) / (3.5 - 1.4);
    return 0.40 - 0.12 * Math.min(t, 1.0);
  } else {
    // Asymptotic hypersonic
    return 0.28;
  }
}

/**
 * Synthetic wind profiles for Challenge Mode
 * Tag: SYNTHETIC (Explicitly labelled "Synthetic scenario presets, not live MOSDAC data")
 */
export function getSyntheticWindSpeed(altitude_m: number, scenario: WindScenario): number {
  if (scenario === 'nominal') return 0;
  
  // Peak jet stream occurs between 9,000m and 14,000m
  const jetCenter = 11500;
  const jetWidth = 3500;
  const gaussian = Math.exp(-Math.pow((altitude_m - jetCenter) / jetWidth, 2));

  if (scenario === 'moderate') {
    // ~22 m/s headwind at jet stream
    return 22.0 * gaussian;
  }
  if (scenario === 'high_crosswind') {
    // ~48 m/s severe shear headwind
    return 48.0 * gaussian;
  }
  return 0;
}

/**
 * Aerodynamic Drag calculation:
 * D = 0.5 * ρ * v_rel² * Cd(Mach) * A
 */
export function calculateAerodynamics(
  altitude_m: number,
  relSpeed_ms: number,
  area_m2: number = FAIRING_FRONTAL_AREA
) {
  const density = getAtmosphericDensity(altitude_m);
  const a = getSpeedOfSound(altitude_m);
  const mach = relSpeed_ms / (a > 0 ? a : 340);
  const cd = getDragCoefficient(mach);
  
  // Dynamic pressure q = 0.5 * rho * v^2
  const dynamicPressure_Pa = 0.5 * density * relSpeed_ms * relSpeed_ms;
  const dynamicPressure_kPa = dynamicPressure_Pa / 1000.0;
  
  // Total drag force in Newtons
  const drag_N = dynamicPressure_Pa * cd * area_m2;

  return {
    density,
    mach,
    cd,
    dynamicPressure_kPa,
    drag_N,
  };
}
