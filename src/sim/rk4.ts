/**
 * Fixed-step 4th-Order Runge-Kutta (RK4) Planar Ascent Integrator
 * SI Units: X, Y, r (m), V_X, V_Y (m/s), a (m/s^2), dt (s)
 */

import { MU_EARTH, R_EARTH, G0, SHAR_LATITUDE_DEG, SIM_DT } from './constants';
import { PropulsionSystem } from './propulsion';
import { GuidanceProgram } from './guidance';
import { calculateAerodynamics, getSyntheticWindSpeed } from './atmosphere';
import { computeOrbitalElements, getEarthRotationBoost } from './gravity';
import { SimulationState, WindScenario } from './types';

export interface StateVector {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface DerivativeVector {
  dx: number;
  dy: number;
  dvx: number;
  dvy: number;
}

export class RK4Integrator {
  private propulsion: PropulsionSystem;
  private guidance: GuidanceProgram;
  private azimuth_deg: number;
  private windScenario: WindScenario;

  constructor(
    propulsion: PropulsionSystem,
    guidance: GuidanceProgram,
    azimuth_deg: number,
    windScenario: WindScenario = 'nominal'
  ) {
    this.propulsion = propulsion;
    this.guidance = guidance;
    this.azimuth_deg = azimuth_deg;
    this.windScenario = windScenario;
  }

  /**
   * Evaluates the time derivatives of the state vector at (t, state)
   */
  public evaluateDerivatives(time_s: number, state: StateVector): {
    derivatives: DerivativeVector;
    density: number;
    dynamicPressure_kPa: number;
    dragForce_N: number;
    thrust_N: number;
    totalMass_kg: number;
    massFlow_kgs: number;
    cd: number;
    mach: number;
    relSpeed_ms: number;
    pitch_deg: number;
    sensedG: number;
    activeStageNames: string[];
    events: string[];
    isFairingJettisoned: boolean;
  } {
    const r = Math.sqrt(state.x * state.x + state.y * state.y);
    const altitude_m = Math.max(0, r - R_EARTH);

    // Unit vectors in 2D launch plane
    const ur_x = state.x / r;
    const ur_y = state.y / r;

    // Local horizontal unit vector (pointing in direction of orbital flight)
    const uth_x = -ur_y;
    const uth_y = ur_x;

    // Evaluate propulsion system at current t and altitude
    const propState = this.propulsion.evaluate(time_s, altitude_m);
    const m = Math.max(100.0, propState.totalMass_kg);

    // Radial velocity (vr) and horizontal tangential velocity (vth)
    const vr = state.vx * ur_x + state.vy * ur_y;
    const vth = -state.vx * ur_y + state.vy * ur_x;

    // Evaluate commanded pitch angle ψ from local horizontal (with Auto-Guidance feedback)
    const pitch_deg = this.guidance.getPitchAngle(time_s, vr, vth, altitude_m);
    const pitchRad = (pitch_deg * Math.PI) / 180.0;

    // Commanded thrust direction: u_T = cos(ψ) * u_θ + sin(ψ) * u_r
    const uT_x = Math.cos(pitchRad) * uth_x + Math.sin(pitchRad) * ur_x;
    const uT_y = Math.cos(pitchRad) * uth_y + Math.sin(pitchRad) * ur_y;

    const Tx = propState.totalThrust_N * uT_x;
    const Ty = propState.totalThrust_N * uT_y;

    // Atmospheric rotation velocity with Earth + synthetic wind
    const latRad = (SHAR_LATITUDE_DEG * Math.PI) / 180.0;
    const azRad = (this.azimuth_deg * Math.PI) / 180.0;
    const omegaEarth = 7.2921159e-5;
    const vAtmosphere = omegaEarth * r * Math.cos(latRad) * Math.sin(azRad);
    const vWind = getSyntheticWindSpeed(altitude_m, this.windScenario);
    const netAtmosphereSpeed = vAtmosphere - vWind;

    // Relative velocity w.r.t. air
    const vRel_x = state.vx - netAtmosphereSpeed * uth_x;
    const vRel_y = state.vy - netAtmosphereSpeed * uth_y;
    const relSpeed_ms = Math.sqrt(vRel_x * vRel_x + vRel_y * vRel_y);

    // Aerodynamics (Drag opposes relative velocity)
    const aero = calculateAerodynamics(altitude_m, relSpeed_ms);
    let Dx = 0;
    let Dy = 0;
    if (relSpeed_ms > 0.01) {
      Dx = -aero.drag_N * (vRel_x / relSpeed_ms);
      Dy = -aero.drag_N * (vRel_y / relSpeed_ms);
    }

    // Gravitational acceleration: g = -μ * r_vec / r^3
    const gravFactor = -MU_EARTH / (r * r * r);
    const gx = gravFactor * state.x;
    const gy = gravFactor * state.y;

    // Total accelerations
    const ax = (Tx + Dx) / m + gx;
    const ay = (Ty + Dy) / m + gy;

    // Sensed acceleration (non-gravitational specific force) in G's
    const sensedForce_N = Math.sqrt((Tx + Dx) * (Tx + Dx) + (Ty + Dy) * (Ty + Dy));
    const sensedG = sensedForce_N / (m * G0);

    return {
      derivatives: {
        dx: state.vx,
        dy: state.vy,
        dvx: ax,
        dvy: ay,
      },
      density: aero.density,
      dynamicPressure_kPa: aero.dynamicPressure_kPa,
      dragForce_N: aero.drag_N,
      thrust_N: propState.totalThrust_N,
      totalMass_kg: m,
      massFlow_kgs: propState.totalMassFlow_kgs,
      cd: aero.cd,
      mach: aero.mach,
      relSpeed_ms,
      pitch_deg,
      sensedG,
      activeStageNames: propState.activeStageNames,
      events: propState.events,
      isFairingJettisoned: propState.isFairingJettisoned,
    };
  }

  /**
   * Executes a single RK4 integration step of size dt
   */
  public step(time_s: number, state: StateVector, dt: number = SIM_DT): {
    nextState: StateVector;
    info: ReturnType<RK4Integrator['evaluateDerivatives']>;
  } {
    // k1 = f(t, y)
    const eval1 = this.evaluateDerivatives(time_s, state);
    const k1 = eval1.derivatives;

    // k2 = f(t + dt/2, y + dt/2 * k1)
    const state2: StateVector = {
      x: state.x + 0.5 * dt * k1.dx,
      y: state.y + 0.5 * dt * k1.dy,
      vx: state.vx + 0.5 * dt * k1.dvx,
      vy: state.vy + 0.5 * dt * k1.dvy,
    };
    const eval2 = this.evaluateDerivatives(time_s + 0.5 * dt, state2);
    const k2 = eval2.derivatives;

    // k3 = f(t + dt/2, y + dt/2 * k2)
    const state3: StateVector = {
      x: state.x + 0.5 * dt * k2.dx,
      y: state.y + 0.5 * dt * k2.dy,
      vx: state.vx + 0.5 * dt * k2.dvx,
      vy: state.vy + 0.5 * dt * k2.dvy,
    };
    const eval3 = this.evaluateDerivatives(time_s + 0.5 * dt, state3);
    const k3 = eval3.derivatives;

    // k4 = f(t + dt, y + dt * k3)
    const state4: StateVector = {
      x: state.x + dt * k3.dx,
      y: state.y + dt * k3.dy,
      vx: state.vx + dt * k3.dvx,
      vy: state.vy + dt * k3.dvy,
    };
    const eval4 = this.evaluateDerivatives(time_s + dt, state4);
    const k4 = eval4.derivatives;

    // Next state: y + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
    const nextState: StateVector = {
      x: state.x + (dt / 6.0) * (k1.dx + 2.0 * k2.dx + 2.0 * k3.dx + k4.dx),
      y: state.y + (dt / 6.0) * (k1.dy + 2.0 * k2.dy + 2.0 * k3.dy + k4.dy),
      vx: state.vx + (dt / 6.0) * (k1.dvx + 2.0 * k2.dvx + 2.0 * k3.dvx + k4.dvx),
      vy: state.vy + (dt / 6.0) * (k1.dvy + 2.0 * k2.dvy + 2.0 * k3.dvy + k4.dvy),
    };

    return {
      nextState,
      info: eval1,
    };
  }

  /**
   * Converts a state vector and step evaluation into a clean SimulationState
   */
  public toSimulationState(
    time_s: number,
    state: StateVector,
    info: ReturnType<RK4Integrator['evaluateDerivatives']>,
    events: string[] = []
  ): SimulationState {
    const r = Math.sqrt(state.x * state.x + state.y * state.y);
    const altitude_m = Math.max(0, r - R_EARTH);
    
    // Surface arc downrange distance
    const downrangeAngle = Math.atan2(state.y, state.x);
    const downrange_m = R_EARTH * downrangeAngle;

    // Inertial speed
    const speed_ms = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

    // Flight path angle w.r.t. local horizontal
    const ur_x = state.x / r;
    const ur_y = state.y / r;
    const vr = state.vx * ur_x + state.vy * ur_y;
    const vth = -state.vx * ur_y + state.vy * ur_x;
    const flightPathAngle_deg = (Math.atan2(vr, vth) * 180.0) / Math.PI;

    // Vis-viva orbital elements
    const orb = computeOrbitalElements(r, speed_ms, flightPathAngle_deg);
    const finalEvents = events.length > 0 ? events : info.events;

    return {
      time_s,
      r_m: r,
      altitude_m,
      downrange_m,
      vx_ms: state.vx,
      vy_ms: state.vy,
      speed_ms,
      relSpeed_ms: info.relSpeed_ms,
      mach: info.mach,
      pitch_deg: info.pitch_deg,
      flightPathAngle_deg,
      totalMass_kg: info.totalMass_kg,
      thrust_N: info.thrust_N,
      massFlow_kgs: info.massFlow_kgs,
      sensedG: info.sensedG,
      density_kgm3: info.density,
      dynamicPressure_kPa: info.dynamicPressure_kPa,
      dragForce_N: info.dragForce_N,
      cd: info.cd,
      semiMajorAxis_km: orb.semiMajorAxis_km,
      perigee_km: orb.perigee_km,
      apogee_km: orb.apogee_km,
      eccentricity: orb.eccentricity,
      activeStages: info.activeStageNames,
      events: finalEvents,
      isOrbitAchieved: orb.isBoundOrbit && orb.perigee_km > 150.0,
      isStagingEvent: finalEvents.length > 0,
    };
  }

  /**
   * Creates the initial liftoff state at Sriharikota
   */
  public getInitialState(): StateVector {
    const r0 = R_EARTH;
    const v0 = getEarthRotationBoost(this.azimuth_deg, SHAR_LATITUDE_DEG);

    return {
      x: r0,
      y: 0,
      vx: 0,
      vy: v0,
    };
  }
}
