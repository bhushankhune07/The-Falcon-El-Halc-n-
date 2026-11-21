/**
 * Gravitational & Astrodynamical Equations
 * Strictly SI Units: μ (m^3/s^2), R (m), v (m/s), h (m)
 */

import { MU_EARTH, R_EARTH, OMEGA_EARTH, SHAR_LATITUDE_DEG } from './constants';

/**
 * Altitude-dependent Newtonian gravitational acceleration:
 * g(h) = μ / (R + h)²
 */
export function getGravityAcceleration(altitude_m: number): number {
  const r = R_EARTH + Math.max(0, altitude_m);
  return MU_EARTH / (r * r);
}

/**
 * Earth rotation linear velocity boost at Sriharikota (SDSC SHAR):
 * v0 = ω_E * R * cos(13.72°) * sin(Az)
 * Note: ~451.9 m/s due east (Az = 90°).
 * UI note: "2D planar ascent; coastal dogleg maneuver not modelled."
 */
export function getEarthRotationBoost(azimuth_deg: number, latitude_deg: number = SHAR_LATITUDE_DEG): number {
  const latRad = (latitude_deg * Math.PI) / 180;
  const azRad = (azimuth_deg * Math.PI) / 180;
  return OMEGA_EARTH * R_EARTH * Math.cos(latRad) * Math.sin(azRad);
}

/**
 * Computes Keplerian orbital elements from instantaneous state vector (vis-viva equation)
 * @param r_m Radial distance from Earth center (m)
 * @param v_ms Inertial speed (m/s)
 * @param flightPathAngle_deg Flight path angle from local horizontal (deg)
 */
export function computeOrbitalElements(r_m: number, v_ms: number, flightPathAngle_deg: number) {
  if (r_m <= 0 || v_ms <= 0) {
    return {
      semiMajorAxis_km: 0,
      perigee_km: 0,
      apogee_km: 0,
      eccentricity: 1,
      specificEnergy_Jkg: 0,
      isBoundOrbit: false,
    };
  }

  // Vis-viva: 1/a = 2/r - v^2/μ
  const invA = 2.0 / r_m - (v_ms * v_ms) / MU_EARTH;
  const semiMajorAxis_m = invA !== 0 ? 1.0 / invA : 0;

  // Specific mechanical energy ε = v^2/2 - μ/r
  const specificEnergy = (v_ms * v_ms) / 2.0 - MU_EARTH / r_m;

  // Specific angular momentum h = r * v * cos(flightPathAngle)
  const gammaRad = (flightPathAngle_deg * Math.PI) / 180.0;
  const h_ang = r_m * v_ms * Math.cos(gammaRad);

  // Eccentricity e = sqrt(1 + 2 * ε * h^2 / μ^2)
  const eSq = 1.0 + (2.0 * specificEnergy * h_ang * h_ang) / (MU_EARTH * MU_EARTH);
  const eccentricity = eSq > 0 ? Math.sqrt(eSq) : 0;

  // Perigee and Apogee altitudes
  let perigee_m = 0;
  let apogee_m = 0;

  if (semiMajorAxis_m > 0 && eccentricity < 1.0) {
    // Elliptical bound orbit
    perigee_m = semiMajorAxis_m * (1.0 - eccentricity) - R_EARTH;
    apogee_m = semiMajorAxis_m * (1.0 + eccentricity) - R_EARTH;
  } else {
    // Parabolic / Hyperbolic or suborbital
    perigee_m = (h_ang * h_ang) / (MU_EARTH * (1.0 + eccentricity)) - R_EARTH;
    apogee_m = -999999;
  }

  return {
    semiMajorAxis_km: semiMajorAxis_m / 1000.0,
    perigee_km: perigee_m / 1000.0,
    apogee_km: apogee_m / 1000.0,
    eccentricity: Math.round(eccentricity * 10000) / 10000,
    specificEnergy_Jkg: specificEnergy,
    isBoundOrbit: semiMajorAxis_m > 0 && eccentricity < 1.0 && perigee_m > 0,
  };
}
