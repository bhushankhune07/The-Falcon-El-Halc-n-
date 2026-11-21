/**
 * Propulsion & Mass Dynamics for PSLV-XL
 * Strictly SI Units: Thrust in N, Mass in kg, Mass Flow in kg/s, Isp in s
 * Equation: T = m_dot * g0 * Isp
 * Pure evaluation function (no side-effecting state mutations)
 */

import { G0 } from './constants';
import { StageDefinition, FairingDefinition, ChallengeModeModifiers } from './types';
import { getAtmosphericDensity, RHO_SEA_LEVEL } from './atmosphere';

export interface VehicleMassThrustState {
  totalMass_kg: number;
  totalThrust_N: number;
  totalMassFlow_kgs: number;
  activeStageIds: string[];
  activeStageNames: string[];
  isFairingJettisoned: boolean;
  jettisonedStages: string[];
  events: string[];
}

export class PropulsionSystem {
  private stages: StageDefinition[];
  private fairing: FairingDefinition;
  private payloadMass_kg: number;

  constructor(
    stages: StageDefinition[],
    fairing: FairingDefinition,
    basePayloadMass_kg: number,
    modifiers?: ChallengeModeModifiers
  ) {
    this.stages = JSON.parse(JSON.stringify(stages));
    this.fairing = { ...fairing };
    
    // Apply Challenge Mode payload mass delta
    const payloadDelta = modifiers?.enabled ? modifiers.payloadDeltaKg : 0;
    this.payloadMass_kg = Math.max(100, basePayloadMass_kg + payloadDelta);
  }

  /**
   * Computes the initial gross liftoff mass (GLOW) of the vehicle at T=0
   */
  public getInitialMass(): number {
    let mass = this.payloadMass_kg + this.fairing.mass_kg;
    for (const stage of this.stages) {
      mass += stage.count * (stage.dryMassPerUnit_kg + stage.propellantMassPerUnit_kg);
    }
    return mass;
  }

  /**
   * Pure evaluation of instantaneous vehicle mass, thrust, and mass flow at time t and altitude
   */
  public evaluate(time_s: number, altitude_m: number): VehicleMassThrustState {
    const activeStageIds: string[] = [];
    const activeStageNames: string[] = [];
    const jettisonedStages: string[] = [];

    // Density ratio for Isp sea-level to vacuum expansion
    const rhoRatio = Math.min(1.0, getAtmosphericDensity(altitude_m) / RHO_SEA_LEVEL);

    let totalThrust_N = 0;
    let totalMassFlow_kgs = 0;
    let totalMass_kg = this.payloadMass_kg;

    // Pure fairing check (by altitude or by time)
    const isFairingJettisoned =
      altitude_m >= this.fairing.jettisonAltitude_m || time_s >= this.fairing.jettisonTime_s;
    if (!isFairingJettisoned) {
      totalMass_kg += this.fairing.mass_kg;
    }

    // Evaluate each stage component
    for (const stage of this.stages) {
      // Check if already staged / separated
      if (time_s >= stage.separationTime_s) {
        jettisonedStages.push(stage.id);
        continue; // Entire stage dry mass and any residual propellant dropped
      }

      // If not yet staged, dry mass is retained
      totalMass_kg += stage.count * stage.dryMassPerUnit_kg;

      // Check burning status
      const burnEnd_s = stage.ignitionTime_s + stage.burnDuration_s;
      const isBurning = time_s >= stage.ignitionTime_s && time_s < burnEnd_s;

      if (isBurning) {
        activeStageIds.push(stage.id);
        activeStageNames.push(stage.name);

        // Interpolate Isp between sea-level and vacuum
        const isp = stage.ispVacuum_s - (stage.ispVacuum_s - stage.ispSeaLevel_s) * rhoRatio;
        
        // Consistent mass flow from stage propellant and burn duration: m_dot = m_prop / t_burn
        const stageMassFlow = (stage.count * stage.propellantMassPerUnit_kg) / stage.burnDuration_s;
        
        // Thrust derived consistently from mass flow: T = m_dot * g0 * Isp
        const stageThrust = stageMassFlow * G0 * isp;

        totalThrust_N += stageThrust;
        totalMassFlow_kgs += stageMassFlow;

        // Remaining propellant in this stage
        const burnedFraction = (time_s - stage.ignitionTime_s) / stage.burnDuration_s;
        const remainingPropPerUnit = stage.propellantMassPerUnit_kg * (1.0 - Math.min(1.0, burnedFraction));
        totalMass_kg += stage.count * remainingPropPerUnit;
      } else if (time_s < stage.ignitionTime_s) {
        // Not yet ignited, full propellant remains
        totalMass_kg += stage.count * stage.propellantMassPerUnit_kg;
      }
      // If burned out but not yet separated, zero propellant remains and dry mass is already added
    }

    return {
      totalMass_kg,
      totalThrust_N,
      totalMassFlow_kgs,
      activeStageIds,
      activeStageNames,
      isFairingJettisoned,
      jettisonedStages,
      events: [],
    };
  }
}
