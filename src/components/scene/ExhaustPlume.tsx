import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';
import { StageDefinition } from '../../sim';
import { createRocketPlumeShaderMaterial } from './textures/proceduralTextures';

interface Props {
  simFrame: SimFrameState;
  stages?: StageDefinition[];
}

export function ExhaustPlume({ simFrame, stages }: Props) {
  const solidPlumeRef = useRef<THREE.Group>(null);
  const liquidPlumeRef = useRef<THREE.Group>(null);
  const ps4PlumesRef = useRef<THREE.Group>(null);
  const retroPuffsRef = useRef<THREE.Group>(null);
  const padSmokeRef = useRef<THREE.Group>(null);
  const liftoffLightRef = useRef<THREE.PointLight>(null);
  const shockDiamondsRef = useRef<THREE.Group>(null);

  // Dynamic GLSL plume shader materials
  const solidPlumeMat = useMemo(
    () => createRocketPlumeShaderMaterial('#fffbeb', '#f97316', '#ea580c'),
    []
  );
  const liquidPlumeMat = useMemo(
    () => createRocketPlumeShaderMaterial('#f0f9ff', '#38bdf8', '#c084fc'),
    []
  );
  const ps4PlumeMat = useMemo(
    () => createRocketPlumeShaderMaterial('#e0f2fe', '#06b6d4', '#818cf8'),
    []
  );

  useEffect(() => {
    return () => {
      solidPlumeMat.dispose();
      liquidPlumeMat.dispose();
      ps4PlumeMat.dispose();
    };
  }, [solidPlumeMat, liquidPlumeMat, ps4PlumeMat]);

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

  // Staging separation flame gap: 1.5s cutoff window around PS1 -> PS2 and PS2 -> PS3
  const isPS1toPS2Gap = t >= ps1BurnEnd - 0.2 && t < ps2Ign + 0.3;
  const isPS2toPS3Gap = t >= ps2BurnEnd - 0.2 && t < ps3Ign + 0.3;
  const isStagingFlameCutoff = isPS1toPS2Gap || isPS2toPS3Gap;

  // Determine active propulsion type from mission stages
  const isSolidActive =
    !isStagingFlameCutoff &&
    (t < ps1BurnEnd - 0.2 || (t >= ps3Ign + 0.3 && t < ps3BurnEnd));

  // Liquid stage: PS2 Vikas
  const isPS2Active = !isStagingFlameCutoff && t >= ps2Ign + 0.3 && t < ps2BurnEnd - 0.2;

  // Upper stage: PS4 twin liquid engines
  const isPS4Active =
    !isStagingFlameCutoff &&
    t >= ps4Ign &&
    t < ps4BurnEnd &&
    !simFrame.ps4Cutoff &&
    isThrusting;

  // Active stage nozzle positions relative to rocket group
  const solidY = t >= ps3Ign && t < ps3BurnEnd ? 33.0 : -1.2;
  const liquidY = 20.0; // PS2 Vikas center nozzle exit
  const ps4Y = 38.1; // PS4 twin engines exit level

  // Plume vacuum expansion factor (flares wider at high altitude)
  const vacExpansion = Math.min(2.5, 1.0 + simFrame.altitude_m / 60000.0);

  // High-altitude vacuum plume expansion factor ("space jellyfish" effect above 35 km)
  const highAltRatio = Math.max(0, (simFrame.altitude_m - 35000.0) / 45000.0);
  const liquidVacRadial = vacExpansion * (1.0 + Math.min(2.8, highAltRatio * 2.4));

  // Normalize thrust to 0..1 scale
  const throttle = Math.min(1.0, Math.max(0.1, simFrame.thrust_N / 4800000.0));

  useFrame((_, delta) => {
    // Dynamic flame flicker & GLSL shader time updates
    const flicker = 0.9 + Math.sin(t * 45.0) * 0.08 + Math.cos(t * 70.0) * 0.04;

    if (solidPlumeMat.uniforms?.uTime) {
      solidPlumeMat.uniforms.uTime.value += delta;
    }
    if (liquidPlumeMat.uniforms?.uTime) {
      liquidPlumeMat.uniforms.uTime.value += delta;
    }
    if (ps4PlumeMat.uniforms?.uTime) {
      ps4PlumeMat.uniforms.uTime.value += delta;
    }

    if (solidPlumeRef.current) {
      solidPlumeRef.current.position.y = solidY;
      const targetScaleY = isSolidActive && isThrusting ? throttle * flicker * 12.0 : 0.001;
      const targetScaleXZ = isSolidActive && isThrusting ? flicker * vacExpansion : 0.001;

      solidPlumeRef.current.scale.y = THREE.MathUtils.damp(
        solidPlumeRef.current.scale.y,
        targetScaleY,
        18,
        delta
      );
      solidPlumeRef.current.scale.x = THREE.MathUtils.damp(
        solidPlumeRef.current.scale.x,
        targetScaleXZ,
        18,
        delta
      );
      solidPlumeRef.current.scale.z = THREE.MathUtils.damp(
        solidPlumeRef.current.scale.z,
        targetScaleXZ,
        18,
        delta
      );
    }

    if (liquidPlumeRef.current) {
      liquidPlumeRef.current.position.y = liquidY;
      const targetScaleY =
        isPS2Active && isThrusting ? (0.6 + throttle * 0.8) * flicker * 9.0 : 0.001;
      const targetScaleXZ = isPS2Active && isThrusting ? flicker * liquidVacRadial * 1.2 : 0.001;

      liquidPlumeRef.current.scale.y = THREE.MathUtils.damp(
        liquidPlumeRef.current.scale.y,
        targetScaleY,
        18,
        delta
      );
      liquidPlumeRef.current.scale.x = THREE.MathUtils.damp(
        liquidPlumeRef.current.scale.x,
        targetScaleXZ,
        18,
        delta
      );
      liquidPlumeRef.current.scale.z = THREE.MathUtils.damp(
        liquidPlumeRef.current.scale.z,
        targetScaleXZ,
        18,
        delta
      );
    }

    if (ps4PlumesRef.current) {
      ps4PlumesRef.current.position.y = ps4Y;
      const targetScaleY = isPS4Active ? flicker * 1.0 : 0.001;
      const targetScaleXZ = isPS4Active ? flicker * 1.0 : 0.001;

      ps4PlumesRef.current.scale.y = THREE.MathUtils.damp(
        ps4PlumesRef.current.scale.y,
        targetScaleY,
        18,
        delta
      );
      ps4PlumesRef.current.scale.x = THREE.MathUtils.damp(
        ps4PlumesRef.current.scale.x,
        targetScaleXZ,
        18,
        delta
      );
      ps4PlumesRef.current.scale.z = THREE.MathUtils.damp(
        ps4PlumesRef.current.scale.z,
        targetScaleXZ,
        18,
        delta
      );
      ps4PlumesRef.current.visible = isPS4Active || ps4PlumesRef.current.scale.y > 0.01;
    }

    // Animate Mach shock diamonds along the exhaust axis
    if (shockDiamondsRef.current && isPS2Active) {
      const diamondPulse = 0.85 + Math.sin(t * 55.0) * 0.15;
      shockDiamondsRef.current.scale.set(diamondPulse, diamondPulse, diamondPulse);
    }

    // Staging retro-rocket puffs during separation gap
    if (retroPuffsRef.current) {
      retroPuffsRef.current.visible = isStagingFlameCutoff;
      if (isStagingFlameCutoff) {
        const puffScale = 0.8 + Math.sin(t * 30.0) * 0.2;
        retroPuffsRef.current.scale.set(puffScale, puffScale, puffScale);
        retroPuffsRef.current.position.y = isPS1toPS2Gap ? 19.5 : 32.5;
      }
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
      {/* GLSL Shader Material with turbulent scrolling noise      */}
      {/* ======================================================== */}
      <group ref={solidPlumeRef} position={[0, solidY, 0]}>
        {/* Core animated GLSL flame cone */}
        <mesh position={[0, -2.5, 0]} material={solidPlumeMat}>
          <coneGeometry args={[1.5, 5.5, 28, 1, true]} />
        </mesh>

        {/* Outer incandescent envelope */}
        <mesh position={[0, -3.8, 0]}>
          <coneGeometry args={[2.4, 8.0, 24, 1, true]} />
          <meshBasicMaterial
            color="#ea580c"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Soft Solid Nozzle Lip Glow */}
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.3, 1.2, 20]} />
          <meshBasicMaterial
            color="#ffedd5"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Dynamic Point Light from solid flame */}
        <pointLight color="#ff7700" intensity={4.5} distance={65} decay={2} />
      </group>

      {/* ======================================================== */}
      {/* LIQUID PROPELLANT PLUME (PS2 Vikas Hypergolic)           */}
      {/* GLSL Shader with shock diamonds and vacuum flare         */}
      {/* ======================================================== */}
      <group ref={liquidPlumeRef} position={[0, liquidY, 0]}>
        {/* Inner animated GLSL hypergolic plume */}
        <mesh position={[0, -2.2, 0]} material={liquidPlumeMat}>
          <coneGeometry args={[1.2, 4.8, 24, 1, true]} />
        </mesh>

        {/* Outer soft vacuum glow envelope */}
        <mesh position={[0, -3.6, 0]}>
          <coneGeometry args={[2.2, 7.2, 24, 1, true]} />
          <meshBasicMaterial
            color="#c084fc"
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Pulsing Mach Shock Diamonds (Electric Cyan/White) */}
        <group ref={shockDiamondsRef}>
          {[1.2, 2.2, 3.2, 4.2].map((dy, idx) => (
            <mesh key={dy} position={[0, -dy, 0]}>
              <octahedronGeometry args={[0.26 - idx * 0.04, 0]} />
              <meshBasicMaterial
                color="#e0f2fe"
                transparent
                opacity={0.9 - idx * 0.15}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>

        {/* Soft Dynamic Nozzle Lip Glow */}
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.2, 0.9, 16]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* High-Altitude Vacuum Expansion Jellyfish Envelope (>35 km) */}
        {simFrame.altitude_m > 35000 && isPS2Active ? (
          <mesh position={[0, -4.8, 0]}>
            <coneGeometry args={[4.2, 9.8, 28, 1, true]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={Math.min(0.28, highAltRatio * 0.28)}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ) : null}

        <pointLight color="#60a5fa" intensity={3.5} distance={50} decay={2} />
      </group>

      {/* ======================================================== */}
      {/* PS4 TWIN-ENGINE VACUUM EXPANDED PLUMES                   */}
      {/* Symmetrical GLSL cyan/violet vacuum bells                */}
      {/* ======================================================== */}
      <group ref={ps4PlumesRef} visible={false}>
        {[-0.35, 0.35].map((engineX) => (
          <group key={engineX} position={[engineX, 0, 0]}>
            {/* GLSL Vacuum Plume Bell */}
            <mesh position={[0, -1.2, 0]} material={ps4PlumeMat}>
              <coneGeometry args={[0.8, 2.6, 20, 1, true]} />
            </mesh>

            {/* Soft violet outer vacuum bloom */}
            <mesh position={[0, -2.4, 0]}>
              <coneGeometry args={[1.8, 5.0, 24, 1, true]} />
              <meshBasicMaterial
                color="#a855f7"
                transparent
                opacity={0.25}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>

            {/* Cyan throat ring glow */}
            <mesh position={[0, -0.05, 0]}>
              <ringGeometry args={[0.05, 0.28, 16]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        <pointLight color="#67e8f9" intensity={2.5} distance={28} decay={2} />
      </group>

      {/* ======================================================== */}
      {/* STAGING RETRO-MOTOR SEPARATION PUFFS                     */}
      {/* White-grey exhaust puffs as stage drops away cleanly      */}
      {/* ======================================================== */}
      <group ref={retroPuffsRef} visible={false}>
        {[-1.2, 1.2].map((rx) =>
          [-1.2, 1.2].map((rz) => (
            <group key={`${rx}-${rz}`} position={[rx, 0, rz]}>
              <mesh position={[0, 0.8, 0]}>
                <coneGeometry args={[0.35, 1.4, 12, 1, true]} />
                <meshBasicMaterial
                  color="#f8fafc"
                  transparent
                  opacity={0.75}
                  side={THREE.DoubleSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              <mesh position={[0, 1.6, 0]}>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshBasicMaterial
                  color="#cbd5e1"
                  transparent
                  opacity={0.5}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))
        )}
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
