import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';

interface Props {
  simFrame: SimFrameState;
}

export function ExhaustPlume({ simFrame }: Props) {
  const solidPlumeRef = useRef<THREE.Group>(null);
  const liquidPlumeRef = useRef<THREE.Group>(null);
  const padSmokeRef = useRef<THREE.Mesh>(null);

  const t = simFrame.time_s;
  const isThrusting = simFrame.thrust_N > 1000;

  // Determine active propulsion type:
  // Solid stages: PS1 core (0-110s), Ground S12 (0-70s), Air S12 (25-92s), PS3 (264-376s)
  // Liquid stages: PS2 Vikas (110-263s), PS4 twin (580-1030s)
  const isLiquidActive = (t >= 110 && t < 263.2) || (t >= 580 && t < 1030 && !simFrame.isOrbitAchieved);
  const isSolidActive = (t < 110) || (t >= 264 && t < 376.5);

  // Plume vacuum expansion factor (flares wider at high altitude)
  const vacExpansion = Math.min(2.5, 1.0 + simFrame.altitude_m / 60000.0);

  // Normalize thrust to 0..1 scale
  const throttle = Math.min(1.0, Math.max(0.1, simFrame.thrust_N / 4800000.0));

  useFrame((_, delta) => {
    // Dynamic flame flicker
    const flicker = 0.9 + Math.sin(t * 45.0) * 0.08 + Math.cos(t * 70.0) * 0.04;

    if (solidPlumeRef.current) {
      const targetScaleY = isSolidActive && isThrusting ? throttle * flicker * 12.0 : 0.001;
      const targetScaleXZ = isSolidActive && isThrusting ? flicker * vacExpansion : 0.001;

      solidPlumeRef.current.scale.y = THREE.MathUtils.damp(solidPlumeRef.current.scale.y, targetScaleY, 15, delta);
      solidPlumeRef.current.scale.x = THREE.MathUtils.damp(solidPlumeRef.current.scale.x, targetScaleXZ, 15, delta);
      solidPlumeRef.current.scale.z = THREE.MathUtils.damp(solidPlumeRef.current.scale.z, targetScaleXZ, 15, delta);
    }

    if (liquidPlumeRef.current) {
      const targetScaleY = isLiquidActive && isThrusting ? (0.6 + throttle * 0.8) * flicker * 9.0 : 0.001;
      const targetScaleXZ = isLiquidActive && isThrusting ? flicker * vacExpansion * 1.2 : 0.001;

      liquidPlumeRef.current.scale.y = THREE.MathUtils.damp(liquidPlumeRef.current.scale.y, targetScaleY, 15, delta);
      liquidPlumeRef.current.scale.x = THREE.MathUtils.damp(liquidPlumeRef.current.scale.x, targetScaleXZ, 15, delta);
      liquidPlumeRef.current.scale.z = THREE.MathUtils.damp(liquidPlumeRef.current.scale.z, targetScaleXZ, 15, delta);
    }

    // Pad liftoff smoke expansion (T+0 to T+10s)
    if (padSmokeRef.current) {
      if (t >= 0 && t <= 12 && simFrame.altitude_m < 500) {
        padSmokeRef.current.visible = true;
        const smokeScale = 1.0 + t * 2.5;
        padSmokeRef.current.scale.set(smokeScale, smokeScale * 0.6, smokeScale);
      } else {
        padSmokeRef.current.visible = false;
      }
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* ======================================================== */}
      {/* SOLID PROPELLANT PLUME (S12 Strap-ons & PS1 / PS3 Core)   */}
      {/* Bright Orange-Gold, fiery, dynamic                       */}
      {/* ======================================================== */}
      <group ref={solidPlumeRef} position={[0, -2.5, 0]}>
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
      <group
        ref={liquidPlumeRef}
        position={[
          0,
          t >= 580 ? 32.5 : 12.0, // Attached to PS4 base (high) or PS2 base
          0,
        ]}
      >
        {/* Inner high-temp Mach shock core */}
        <mesh position={[0, -1.0, 0]}>
          <cylinderGeometry args={[0.2, 0.6, 2.2, 16]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Outer translucent hypergolic plume envelope */}
        <mesh position={[0, -2.0, 0]}>
          <coneGeometry args={[1.4, 4.5, 20, 1, true]} />
          <meshBasicMaterial
            color="#818cf8"
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Vacuum flare envelope */}
        <mesh position={[0, -3.0, 0]}>
          <coneGeometry args={[2.4, 6.5, 20, 1, true]} />
          <meshBasicMaterial
            color="#c084fc"
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>

        <pointLight color="#60a5fa" intensity={3.0} distance={45} decay={2} />
      </group>

      {/* ======================================================== */}
      {/* T-0 TO T+10s LAUNCH PAD EXHAUST BILLOWING GLOW           */}
      {/* ======================================================== */}
      <mesh
        ref={padSmokeRef}
        position={[0, -simFrame.altitude_m - 2.0, 0]}
        visible={false}
      >
        <sphereGeometry args={[18, 16, 12]} />
        <meshBasicMaterial
          color="#fed7aa"
          transparent
          opacity={Math.max(0, 0.4 - t * 0.035)}
          wireframe={false}
        />
      </mesh>
    </group>
  );
}
