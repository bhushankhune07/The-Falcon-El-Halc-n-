import { describe, it, expect } from 'vitest';
import { SimulationEngine, PRESET_MISSIONS } from './index';

describe('Urdhva: RK4 Planar Ascent Physics Engine', () => {
  const pslvC52 = PRESET_MISSIONS['pslv-c52-eos04'];
  const pslvC25 = PRESET_MISSIONS['pslv-c25-mom'];
  const pslvC57 = PRESET_MISSIONS['pslv-c57-aditya-l1'];

  describe('PSLV-C52 / EOS-04 Golden Run Accuracy Validation (ISRO published ±5%)', () => {
    const engine = new SimulationEngine(pslvC52, { enabled: false });
    const result = engine.runSimulation();
    const { summary, states } = result;

    it('generates non-empty, finite telemetry without NaN or Infinity', () => {
      expect(states.length).toBeGreaterThan(100);
      for (let i = 0; i < states.length; i += 50) {
        const s = states[i];
        console.log(`T+${s.time_s.toFixed(0)}s: Alt=${(s.altitude_m/1000).toFixed(1)}km, Vel=${s.speed_ms.toFixed(0)}m/s, Pitch=${s.pitch_deg.toFixed(1)}°, Thrust=${(s.thrust_N/1000).toFixed(0)}kN, Mass=${(s.totalMass_kg/1000).toFixed(1)}t, SensedG=${s.sensedG.toFixed(2)}G`);
      }
      for (const s of states) {
        expect(Number.isFinite(s.altitude_m)).toBe(true);
        expect(Number.isFinite(s.speed_ms)).toBe(true);
        expect(Number.isFinite(s.downrange_m)).toBe(true);
        expect(Number.isFinite(s.dynamicPressure_kPa)).toBe(true);
        expect(Number.isFinite(s.sensedG)).toBe(true);
        expect(Number.isNaN(s.altitude_m)).toBe(false);
        expect(Number.isNaN(s.speed_ms)).toBe(false);
      }
    });

    it('reaches target cutoff altitude within ±5% of ISRO published ~534 km', () => {
      const isroTargetAlt_km = 534.0;
      const lowerBound = isroTargetAlt_km * 0.95; // 507.3 km
      const upperBound = isroTargetAlt_km * 1.05; // 560.7 km

      console.log(`[PSLV-C52 Golden Run] Simulated Cutoff Altitude: ${summary.finalAltitude_km} km (ISRO: ${isroTargetAlt_km} km)`);
      expect(summary.finalAltitude_km).toBeGreaterThanOrEqual(lowerBound);
      expect(summary.finalAltitude_km).toBeLessThanOrEqual(upperBound);
    });

    it('reaches target cutoff velocity within ±5% of ISRO published ~7,590 m/s', () => {
      const isroTargetVel_ms = 7590.0;
      const lowerBound = isroTargetVel_ms * 0.95; // 7,210.5 m/s
      const upperBound = isroTargetVel_ms * 1.05; // 7,969.5 m/s

      console.log(`[PSLV-C52 Golden Run] Simulated Cutoff Velocity: ${summary.finalVelocity_ms} m/s (ISRO: ${isroTargetVel_ms} m/s)`);
      expect(summary.finalVelocity_ms).toBeGreaterThanOrEqual(lowerBound);
      expect(summary.finalVelocity_ms).toBeLessThanOrEqual(upperBound);
    });

    it('achieves a valid closed orbit with positive perigee > 450 km', () => {
      console.log(`[PSLV-C52 Golden Run] Final Perigee: ${summary.finalPerigee_km} km, Apogee: ${summary.finalApogee_km} km, Eccentricity: ${summary.finalEccentricity}`);
      expect(summary.finalPerigee_km).toBeGreaterThan(450.0);
      expect(summary.finalApogee_km).toBeGreaterThan(summary.finalPerigee_km);
      expect(summary.finalEccentricity).toBeLessThan(0.15);
      expect(summary.orbitAchieved).toBe(true);
    });

    it('reaches realistic Max-Q and Sensed G-Forces during ascent', () => {
      console.log(`[PSLV-C52 Golden Run] Max-Q: ${summary.maxQ_kPa} kPa at T+${summary.maxQTime_s}s, Peak G: ${summary.maxG}G at T+${summary.maxGTime_s}s`);
      // Typical solid-boosted rocket Max-Q is 20-85 kPa occurring during first stage / strap-on burn (T+40 to T+70s)
      expect(summary.maxQ_kPa).toBeGreaterThan(15.0);
      expect(summary.maxQ_kPa).toBeLessThan(85.0);
      expect(summary.maxQTime_s).toBeGreaterThan(30.0);
      expect(summary.maxQTime_s).toBeLessThan(90.0);

      // Peak G-force is typically 3.0 to 5.5 G's
      expect(summary.maxG).toBeGreaterThan(2.5);
      expect(summary.maxG).toBeLessThan(6.0);
    });

    it('validates each published ISRO milestone within tolerance', () => {
      for (const comp of summary.milestoneComparisons) {
        console.log(`[Milestone Check] ${comp.event} @ T+${comp.time_s}s: Alt ${comp.actualAltitude_km} km (tgt ${comp.targetAltitude_km} km, ${comp.altitudeErrorPct}%), Vel ${comp.actualVelocity_ms} m/s (tgt ${comp.targetVelocity_ms} m/s, ${comp.velocityErrorPct}%) -> ${comp.passed ? 'PASS' : 'FAIL'}`);
        expect(Math.abs(comp.altitudeErrorPct)).toBeLessThanOrEqual(5.0);
        expect(Math.abs(comp.velocityErrorPct)).toBeLessThanOrEqual(5.0);
      }
    });
  });

  describe('Challenge Mode Degradation Verification', () => {
    it('excessive payload mass causes orbit degradation / insertion failure', () => {
      // Add +1,500 kg excess payload (almost doubling satellite mass)
      const degradedEngine = new SimulationEngine(pslvC52, {
        enabled: true,
        payloadDeltaKg: 1500,
        pitchKickDeg: 0,
        windScenario: 'nominal',
      });
      const degradedResult = degradedEngine.runSimulation();

      console.log(`[Challenge Mode +1500kg] Cutoff Vel: ${degradedResult.summary.finalVelocity_ms} m/s, Perigee: ${degradedResult.summary.finalPerigee_km} km`);
      // Final velocity should be significantly lower than golden run (7,590 m/s)
      expect(degradedResult.summary.finalVelocity_ms).toBeLessThan(7500.0);
    });

    it('severe pitch kick steepness causes orbit miss (apogee lofted, perigee crash)', () => {
      // Pitch kick too steep (-4 degrees higher loft)
      const loftedEngine = new SimulationEngine(pslvC52, {
        enabled: true,
        payloadDeltaKg: 0,
        pitchKickDeg: -4.0,
        windScenario: 'nominal',
      });
      const loftedResult = loftedEngine.runSimulation();

      console.log(`[Challenge Mode Lofted] Cutoff Alt: ${loftedResult.summary.finalAltitude_km} km, Cutoff Vel: ${loftedResult.summary.finalVelocity_ms} m/s`);
      // Rocket lofts too high and lacks horizontal velocity to circularize
      expect(loftedResult.summary.finalVelocity_ms).toBeLessThan(7500.0);
    });
  });

  describe('Preset Missions (PSLV-C25 Mangalyaan & PSLV-C57 Aditya-L1)', () => {
    it('PSLV-C25 Mangalyaan executes cleanly to valid Earth Parking Orbit', () => {
      const momEngine = new SimulationEngine(pslvC25, { enabled: false });
      const momResult = momEngine.runSimulation();

      console.log(`[MOM C25 Parking Orbit] Cutoff Alt: ${momResult.summary.finalAltitude_km} km, Vel: ${momResult.summary.finalVelocity_ms} m/s, Perigee: ${momResult.summary.finalPerigee_km} km`);
      expect(momResult.summary.finalAltitude_km).toBeGreaterThan(200.0);
      expect(momResult.summary.finalVelocity_ms).toBeGreaterThan(7500.0);
      expect(momResult.states.length).toBeGreaterThan(100);
    });

    it('PSLV-C57 Aditya-L1 executes cleanly to valid Earth Parking Orbit', () => {
      const adityaEngine = new SimulationEngine(pslvC57, { enabled: false });
      const adityaResult = adityaEngine.runSimulation();

      console.log(`[Aditya-L1 C57 Parking Orbit] Cutoff Alt: ${adityaResult.summary.finalAltitude_km} km, Vel: ${adityaResult.summary.finalVelocity_ms} m/s, Perigee: ${adityaResult.summary.finalPerigee_km} km`);
      expect(adityaResult.summary.finalAltitude_km).toBeGreaterThan(200.0);
      expect(adityaResult.summary.finalVelocity_ms).toBeGreaterThan(7500.0);
      expect(adityaResult.states.length).toBeGreaterThan(100);
    });
  });
});
