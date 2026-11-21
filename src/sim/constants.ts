/**
 * Physical & Astrodynamical Constants (SI Units)
 * Reference: WGS84 & COESA Standard Atmosphere
 */

export const MU_EARTH = 3.986004418e14; // m^3 / s^2 (Standard gravitational parameter)
export const R_EARTH = 6.378137e6; // m (WGS84 Earth equatorial radius)
export const G0 = 9.80665; // m/s^2 (Standard gravity for specific impulse conversion)
export const OMEGA_EARTH = 7.2921159e-5; // rad/s (Earth sidereal rotation rate)

// SDSC SHAR (Satish Dhawan Space Centre, Sriharikota)
export const SHAR_LATITUDE_DEG = 13.7199; // 13.7199° N
export const SHAR_LONGITUDE_DEG = 80.2304; // 80.2304° E
export const SHAR_ELEVATION_M = 3.0; // m above MSL

// Default Integration Step
export const SIM_DT = 0.05; // seconds (Fixed-step RK4)
