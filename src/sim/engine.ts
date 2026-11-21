/**
 * Simulation Orchestrator & Trajectory Generator
 * Fixed-step RK4 integration of complete ascent profile.
 * Generates both high-density simulation states and 1 Hz telemetry points.
 */

import { MissionConfig, ChallengeModeModifiers, TrajectoryResult, SimulationState, MilestoneComparison } from './types';
import { PropulsionSystem } from './propulsion';
import { GuidanceProgram } from './guidance';
import { RK4Integrator } from './rk4';
import { SIM_DT } from './constants';

export class SimulationEngine {
  private mission: MissionConfig;
  private modifiers: ChallengeModeModifiers;

  constructor(mission: MissionConfig, modifiers?: Partial<ChallengeModeModifiers>) {
    this.mission = mission;
    this.modifiers = {
      enabled: modifiers?.enabled ?? false,
      payloadDeltaKg: modifiers?.payloadDeltaKg ?? 0,
      pitchKickDeg: modifiers?.pitchKickDeg ?? 0,
      windScenario: modifiers?.windScenario ?? 'nominal',
    };
  }

  /**
   * Runs full trajectory simulation from T=0 to PS4 cutoff
   */
  public runSimulation(): TrajectoryResult {
    const propulsion = new PropulsionSystem(
      this.mission.stages,
      this.mission.fairing,
      this.mission.payloadMass_kg,
      this.modifiers
    );

    const targetAlt_m = this.mission.targetOrbit.altitude_km * 1000.0;
    const guidance = new GuidanceProgram(this.mission.pitchSchedule, this.modifiers, targetAlt_m);
    const integrator = new RK4Integrator(
      propulsion,
      guidance,
      this.mission.launchSite.azimuth_deg,
      this.modifiers.windScenario
    );

    // Determine simulation cutoff time from stages
    let maxStageTime = 0;
    for (const stage of this.mission.stages) {
      const stageEnd = stage.ignitionTime_s + stage.burnDuration_s;
      if (stageEnd > maxStageTime) {
        maxStageTime = stageEnd;
      }
    }
    const cutoffTime_s = Math.max(1030, maxStageTime);

    let state = integrator.getInitialState();
    let t = 0;
    let stepCount = 0;

    const sampledStates: SimulationState[] = [];
    const triggeredEvents = new Set<string>();
    let pendingEvents: string[] = [];

    let maxQ_kPa = 0;
    let maxQTime_s = 0;
    let maxG = 0;
    let maxGTime_s = 0;

    let nextSampleTime = 0;
    const sampleInterval_s = 1.0; // 1 Hz telemetry sampling

    while (t <= cutoffTime_s) {
      // Step RK4
      const { nextState, info } = integrator.step(t, state, SIM_DT);

      const r = Math.sqrt(state.x * state.x + state.y * state.y);
      const alt_m = Math.max(0, r - 6.378137e6);

      // Fairing jettison event check on threshold crossing
      if (
        !triggeredEvents.has('fairing') &&
        (alt_m >= this.mission.fairing.jettisonAltitude_m || t >= this.mission.fairing.jettisonTime_s)
      ) {
        triggeredEvents.add('fairing');
        pendingEvents.push('Payload Fairing (Heat Shield) Separation');
      }

      // Stage events check on threshold crossings
      for (const stage of this.mission.stages) {
        const ignKey = `${stage.id}_ign`;
        if (!triggeredEvents.has(ignKey) && t >= stage.ignitionTime_s) {
          triggeredEvents.add(ignKey);
          pendingEvents.push(`${stage.name} Ignition`);
        }

        const boKey = `${stage.id}_bo`;
        const burnEnd = stage.ignitionTime_s + stage.burnDuration_s;
        if (!triggeredEvents.has(boKey) && t >= burnEnd) {
          triggeredEvents.add(boKey);
          pendingEvents.push(`${stage.name} Burnout`);
        }

        const sepKey = `${stage.id}_sep`;
        if (!triggeredEvents.has(sepKey) && t >= stage.separationTime_s) {
          triggeredEvents.add(sepKey);
          pendingEvents.push(`${stage.name} Separation`);
        }
      }

      // Track Max-Q and Max-G
      if (info.dynamicPressure_kPa > maxQ_kPa) {
        maxQ_kPa = info.dynamicPressure_kPa;
        maxQTime_s = t;
      }
      if (t > 5.0 && info.sensedG > maxG) {
        maxG = info.sensedG;
        maxGTime_s = t;
      }

      // Sample at 1 Hz for UI charts and telemetry
      if (t >= nextSampleTime || t >= cutoffTime_s - SIM_DT) {
        const simState = integrator.toSimulationState(t, state, info, pendingEvents);
        sampledStates.push(simState);
        pendingEvents = [];
        nextSampleTime += sampleInterval_s;
      }

      // Ground impact safety check
      if (t > 15.0 && alt_m <= 0) {
        // Rocket crashed
        break;
      }

      state = nextState;
      t += SIM_DT;
      stepCount++;
    }

    // Final evaluation at cutoff
    const finalInfo = integrator.evaluateDerivatives(t, state);
    const finalState = integrator.toSimulationState(t, state, finalInfo, pendingEvents);

    // Ensure final state is recorded
    if (sampledStates.length === 0 || sampledStates[sampledStates.length - 1].time_s < t - 0.5) {
      sampledStates.push(finalState);
    }

    // Compare with published ISRO milestones
    const milestoneComparisons: MilestoneComparison[] = [];
    for (const milestone of this.mission.publishedMilestones) {
      // Find sampled state closest to milestone time
      let closest = sampledStates[0];
      let minDt = 999999;
      for (const s of sampledStates) {
        const dt = Math.abs(s.time_s - milestone.time_s);
        if (dt < minDt) {
          minDt = dt;
          closest = s;
        }
      }

      const actualAlt_km = closest.altitude_m / 1000.0;
      const actualVel_ms = closest.speed_ms;

      const altErrPct = ((actualAlt_km - milestone.expectedAltitude_km) / milestone.expectedAltitude_km) * 100.0;
      const velErrPct = ((actualVel_ms - milestone.expectedVelocity_ms) / milestone.expectedVelocity_ms) * 100.0;

      const tolPct = milestone.tolerancePct ?? 5.0;
      const passed = Math.abs(altErrPct) <= tolPct && Math.abs(velErrPct) <= tolPct;

      milestoneComparisons.push({
        event: milestone.event,
        time_s: milestone.time_s,
        targetAltitude_km: milestone.expectedAltitude_km,
        actualAltitude_km: Math.round(actualAlt_km * 10) / 10,
        altitudeErrorPct: Math.round(altErrPct * 100) / 100,
        targetVelocity_ms: milestone.expectedVelocity_ms,
        actualVelocity_ms: Math.round(actualVel_ms),
        velocityErrorPct: Math.round(velErrPct * 100) / 100,
        tolerancePct: tolPct,
        passed,
      });
    }

    const finalPerigee = finalState.perigee_km;
    const finalApogee = finalState.apogee_km;
    const finalAlt = finalState.altitude_m / 1000.0;
    const finalVel = finalState.speed_ms;

    // Mission-derived orbital insertion threshold (positive perigee > Math.max(150, 0.85 * targetAlt))
    const targetAlt = this.mission.targetOrbit.altitude_km;
    const minPerigee = Math.max(150, 0.85 * targetAlt);
    const orbitAchieved = finalPerigee > minPerigee && Math.abs(finalAlt - targetAlt) / targetAlt < 0.10;

    return {
      mission: this.mission,
      modifiers: this.modifiers,
      states: sampledStates,
      fullStateCount: stepCount,
      summary: {
        cutoffTime_s: Math.round(t * 10) / 10,
        finalAltitude_km: Math.round(finalAlt * 10) / 10,
        finalVelocity_ms: Math.round(finalVel),
        finalPerigee_km: Math.round(finalPerigee * 10) / 10,
        finalApogee_km: Math.round(finalApogee * 10) / 10,
        finalEccentricity: finalState.eccentricity,
        maxQ_kPa: Math.round(maxQ_kPa * 10) / 10,
        maxQTime_s: Math.round(maxQTime_s * 10) / 10,
        maxG: Math.round(maxG * 100) / 100,
        maxGTime_s: Math.round(maxGTime_s * 10) / 10,
        orbitAchieved,
        orbitTargetAltitude_km: targetAlt,
        milestoneComparisons,
      },
    };
  }
}
