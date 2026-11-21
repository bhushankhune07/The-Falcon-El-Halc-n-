/**
 * Atmospheric Model & Aerodynamic Drag for PSLV Ascent
 * Note: Exponential atmosphere simplification as specified in mission architecture.
 */

export const RHO_SEA_LEVEL = 1.225; // kg/m^3
export const SCALE_HEIGHT = 7500; // m (7.5 km scale height)
export const PSLV_FAIRING_RADIUS = 1.4; // m (2.8m diameter)
export const FAIRING_FRONTAL_AREA = Math.PI * PSLV_FAIRING_RADIUS * PSLV_FAIRING_RADIUS; // ~6.1575 m^2

/**
 * Exponential atmospheric density model:
 * ρ(h) = 1.225 * exp(-h / 7500)
 * Tag: Exponential atmosphere simplification
 */
export function getAtmosphericDensity(altitude_m: number): number {
  if (altitude_m < 0) altitude_m = 0;
  if (altitude_m > 120000) return 0; // Negligible drag above 120 km (Kármán+ boundary)
  return RHO_SEA_LEVEL * Math.exp(-altitude_m / SCALE_HEIGHT);
}

/**
 * Standard atmospheric speed of sound approximation (US Standard Atmosphere / ISA gradient)
 */
export function getSpeedOfSound(altitude_m: number): number {
  // Approximate temperature profile up to stratopause
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
 * Mach-dependent Drag Coefficient Cd(Mach) for slender launch vehicle:
 * Cd ≈ 0.30 subsonic, peaking ~0.55 near Mach 1 (transonic drag rise), ~0.28 supersonic/hypersonic
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
  } else if (mach < 4.0) {
    // Supersonic decrease towards 0.28
    const t = (mach - 1.4) / (4.0 - 1.4);
    return 0.40 - 0.12 * Math.min(t, 1.0);
  } else {
    // Hypersonic asymptotic value
    return 0.28;
  }
}

/**
 * Aerodynamic Drag calculation:
 * D = 0.5 * ρ * v² * Cd(Mach) * A
 */
export function calculateAerodynamics(altitude_m: number, speed_ms: number, area_m2: number = FAIRING_FRONTAL_AREA) {
  const density = getAtmosphericDensity(altitude_m);
  const a = getSpeedOfSound(altitude_m);
  const mach = speed_ms / (a > 0 ? a : 340);
  const cd = getDragCoefficient(mach);
  
  // Dynamic pressure q = 0.5 * rho * v^2
  const dynamicPressure_Pa = 0.5 * density * speed_ms * speed_ms;
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
