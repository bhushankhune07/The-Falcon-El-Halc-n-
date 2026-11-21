import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';
import { StageDefinition } from '../../sim';

interface Props {
  simFrame: SimFrameState;
  stages?: StageDefinition[];
}

export function ExhaustPlume({ simFrame, stages }: Props) {
  const solidPlumeRef = useRef<THREE.Group>(null);
  const liquidPlumeRef = useRef<THREE.Group>(null);
  const padSmokeRef = useRef<THREE.Group>(null);
  const liftoffLightRef = useRef<THREE.PointLight>(null);

  const t = simFrame.time_s;
  const isThrusting = simFrame.thrust_N > 1000;

  const ps1 = stages?.find((s) => s.type === 'ps1_core');
  const ps2 = stages?.find((s) => s.type === 'ps2');
  const ps3 = stages?.find((s) => s.type === 'ps3');
  const ps4 = stages?.find((s) => s.type === 'ps4');

  const ps1BurnEnd = ps1 ? ps1.ignitionTime_s + ps1.burnDuration_s : 108.0;
  const ps2Ign = ps2?.ignitionTime_s ?? 110.0;
  const ps2BurnEnd = ps2 ? ps2.ignitionTime_s + ps2.burnDuration_s : 263.2;
  const ps3Ign = ps3?.ignitionTime_s ?? 264.0;
  const ps3BurnEnd = ps3 ? ps3.ignitionTime_s + ps3.burnDuration_s : 376.5;
  const ps4Ign = ps4?.ignitionTime_s ?? 580.0;
  const ps4BurnEnd = ps4 ? ps4.ignitionTime_s + ps4.burnDuration_s : 1029.0;

  // Determine active propulsion type from mission stages
  // Solid stages: PS1 / strap-ons (t < ps1BurnEnd) or PS3 (t >= ps3Ign && t < ps3BurnEnd)
  const isSolidActive = (t < ps1BurnEnd) || (t >= ps3Ign && t < ps3BurnEnd);

  // Liquid stages: PS2 Vikas or PS4 twin (gated on !simFrame.ps4Cutoff)
  const isLiquidActive =
    (t >= ps2Ign && t < ps2BurnEnd) ||
    (t >= ps4Ign && t < ps4BurnEnd && !simFrame.ps4Cutoff);

  // Active stage nozzle positions relative to rocket group
  const solidY = (t >= ps3Ign && t < ps3BurnEnd) ? 33.0 : -1.2;
  const liquidY = (t >= ps4Ign) ? 37.35 : 20.0;

  // Plume vacuum expansion factor (flares wider at high altitude)
  const vacExpansion = Math.min(2.5, 1.0 + simFrame.altitude_m / 60000.0);

  // High-altitude vacuum plume expansion factor ("space jellyfish" effect above 35 km)
  const highAltRatio = Math.max(0, (simFrame.altitude_m - 35000.0) / 45000.0);
  const liquidVacRadial = vacExpansion * (1.0 + Math.min(2.8, highAltRatio * 2.4));

  // Normalize thrust to 0..1 scale
  const throttle = Math.min(1.0, Math.max(0.1, simFrame.thrust_N / 4800000.0));

  useFrame((_, delta) => {
    // Dynamic flame flicker
    const flicker = 0.9 + Math.sin(t * 45.0) * 0.08 + Math.cos(t * 70.0) * 0.04;

    if (solidPlumeRef.current) {
      solidPlumeRef.current.position.y = solidY;
      const targetScaleY = isSolidActive && isThrusting ? throttle * flicker * 12.0 : 0.001;
      const targetScaleXZ = isSolidActive && isThrusting ? flicker * vacExpansion : 0.001;

      solidPlumeRef.current.scale.y = THREE.MathUtils.damp(solidPlumeRef.current.scale.y, targetScaleY, 15, delta);
      solidPlumeRef.current.scale.x = THREE.MathUtils.damp(solidPlumeRef.current.scale.x, targetScaleXZ, 15, delta);
      solidPlumeRef.current.scale.z = THREE.MathUtils.damp(solidPlumeRef.current.scale.z, targetScaleXZ, 15, delta);
    }

    if (liquidPlumeRef.current) {
      liquidPlumeRef.current.position.y = liquidY;
      const targetScaleY = isLiquidActive && isThrusting ? (0.6 + throttle * 0.8) * flicker * 9.0 : 0.001;
      const targetScaleXZ = isLiquidActive && isThrusting ? flicker * liquidVacRadial * 1.2 : 0.001;

      liquidPlumeRef.current.scale.y = THREE.MathUtils.damp(liquidPlumeRef.current.scale.y, targetScaleY, 15, delta);
      liquidPlumeRef.current.scale.x = THREE.MathUtils.damp(liquidPlumeRef.current.scale.x, targetScaleXZ, 15, delta);
      liquidPlumeRef.current.scale.z = THREE.MathUtils.damp(liquidPlumeRef.current.scale.z, targetScaleXZ, 15, delta);
    }

    // Pad liftoff dynamic lighting (T+0.1s to T+10s)
    if (liftoffLightRef.current) {
      if (t > 0.1 && t <= 10.0 && simFrame.altitude_m < 400) {
        const altitudeFalloff = Math.max(0, 1.0 - simFrame.altitude_m / 350);
        const timeFalloff = Math.max(0, 1.0 - (t - 0.1) / 9.9);
        liftoffLightRef.current.visible = true;
        liftoffLightRef.current.intensity = (8.0 + flicker * 4.0) * altitudeFalloff * timeFalloff;
        liftoffLightRef.current.position.y = -simFrame.altitude_m + 4.0;
      } else {
        liftoffLightRef.current.visible = false;
        liftoffLightRef.current.intensity = 0;
      }
    }

    // Pad liftoff smoke expansion (T+0.1s to T+12s) - completely hidden at t <= 0.1
    if (padSmokeRef.current) {
      if (t > 0.1 && t <= 12 && simFrame.altitude_m < 600) {
        padSmokeRef.current.visible = true;
        const spread = 1.0 + t * 1.6;
        padSmokeRef.current.scale.set(spread, Math.min(2.5, 0.6 + t * 0.15), spread);
        // Anchor to ground flame trench level
        padSmokeRef.current.position.y = -simFrame.altitude_m - 18.0;
      } else {
        padSmokeRef.current.visible = false;
      }
    }
  });

  const padSmokeOpacity = Math.max(0, 0.45 * (1.0 - t / 12.0));

  return (
    <group position={[0, -0.5, 0]}>
      {/* ======================================================== */}
      {/* SOLID PROPELLANT PLUME (S12 Strap-ons & PS1 / PS3 Core)   */}
      {/* Bright Orange-Gold, fiery, dynamic                       */}
      {/* ======================================================== */}
      <group ref={solidPlumeRef} position={[0, solidY, 0]}>
        {/* Core incandescent hot cone */}
        <mesh position={[0, -1.5, 0]}>
          <coneGeometry args={[0.9, 3.5, 24, 1, true]} />
          <meshBasicMaterial
            color="#fffbeb"
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Outer fiery flame cone */}
        <mesh position={[0, -2.5, 0]}>
          <coneGeometry args={[1.6, 5.5, 24, 1, true]} />
          <meshBasicMaterial
            color="#f97316"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Turbulent outer glow cone */}
        <mesh position={[0, -3.5, 0]}>
          <coneGeometry args={[2.2, 7.5, 24, 1, true]} />
          <meshBasicMaterial
            color="#ea580c"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Dynamic Point Light from solid flame */}
        <pointLight color="#ff7700" intensity={4.5} distance={60} decay={2} />
      </group>

      {/* ======================================================== */}
      {/* LIQUID PROPELLANT PLUME (PS2 Vikas & PS4 Twin Engines)   */}
      {/* Translucent Cyan-Violet, shock diamonds, high Isp        */}
      {/* ======================================================== */}
      <group ref={liquidPlumeRef} position={[0, liquidY, 0]}>
        {/* Inner bright plasma core */}
        <mesh position={[0, -1.0, 0]}>
          <cylinderGeometry args={[0.2, 0.55, 2.2, 16]} />
          <meshBasicMaterial
            color="#e0f2fe"
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Middle hypergolic shock cone */}
        <mesh position={[0, -2.0, 0]}>
          <coneGeometry args={[1.1, 4.2, 20, 1, true]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Outer soft vacuum glow envelope */}
        <mesh position={[0, -3.2, 0]}>
          <coneGeometry args={[2.0, 6.2, 20, 1, true]} />
          <meshBasicMaterial
            color="#c084fc"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* High-Altitude Vacuum Expansion Jellyfish Envelope (>35 km) */}
        {simFrame.altitude_m > 35000 && isLiquidActive ? (
          <mesh position={[0, -4.5, 0]}>
            <coneGeometry args={[3.8, 9.0, 24, 1, true]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={Math.min(0.25, highAltRatio * 0.25)}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ) : null}

        <pointLight color="#60a5fa" intensity={3.5} distance={45} decay={2} />
      </group>

      {/* Dynamic liftoff pad light */}
      <pointLight
        ref={liftoffLightRef}
        color="#f97316"
        distance={90}
        decay={2}
        visible={false}
      />

      {/* ======================================================== */}
      {/* T-0.1 TO T+12s COMPACT GROUND FLAME TRENCH EXHAUST CLOUDS*/}
      {/* Hidden completely at t <= 0.1                            */}
      {/* ======================================================== */}
      <group ref={padSmokeRef} visible={false}>
        {/* West flame trench cloud */}
        <mesh position={[-7, 2, 0]}>
          <sphereGeometry args={[5, 12, 10]} />
          <meshBasicMaterial
            color="#fed7aa"
            transparent
            opacity={padSmokeOpacity}
          />
        </mesh>
        {/* East flame trench cloud */}
        <mesh position={[7, 2, 0]}>
          <sphereGeometry args={[5, 12, 10]} />
          <meshBasicMaterial
            color="#fde047"
            transparent
            opacity={padSmokeOpacity * 0.9}
          />
        </mesh>
        {/* Water deluge lateral steam billows */}
        <mesh position={[-14, 2.5, 0]}>
          <sphereGeometry args={[6.5, 12, 10]} />
          <meshBasicMaterial
            color="#f1f5f9"
            transparent
            opacity={padSmokeOpacity * 0.85}
          />
        </mesh>
        <mesh position={[14, 2.5, 0]}>
          <sphereGeometry args={[6.5, 12, 10]} />
          <meshBasicMaterial
            color="#e2e8f0"
            transparent
            opacity={padSmokeOpacity * 0.85}
          />
        </mesh>
        {/* South trench cloud */}
        <mesh position={[0, 2, 8]}>
          <sphereGeometry args={[4.5, 12, 10]} />
          <meshBasicMaterial
            color="#cbd5e1"
            transparent
            opacity={padSmokeOpacity * 0.75}
          />
        </mesh>
        {/* North trench cloud */}
        <mesh position={[0, 2, -8]}>
          <sphereGeometry args={[4.5, 12, 10]} />
          <meshBasicMaterial
            color="#e2e8f0"
            transparent
            opacity={padSmokeOpacity * 0.75}
          />
        </mesh>
      </group>
    </group>
  );
}
