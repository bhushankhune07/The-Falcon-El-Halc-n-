import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';
import { ScaledEarth } from './ScaledEarth';
import {
  getProceduralSolarPanelTexture,
  getProceduralRadarTexture,
} from './textures/proceduralTextures';

interface Props {
  simFrame: SimFrameState;
}

export function OrbitScene({ simFrame }: Props) {
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const radarConeRef = useRef<THREE.Mesh>(null);
  const radarFootprintRef = useRef<THREE.Mesh>(null);
  const solarWingsRef = useRef<THREE.Group>(null);

  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);
  const radarTexture = useMemo(() => getProceduralRadarTexture(), []);

  const earthRadius = 60.0;
  // Scaled orbital radius: Earth (60) + altitude proportion (534 km / 6378 km * 60 ~= 5.0) -> ~65.0
  const orbitRadius = earthRadius + (Math.max(120000, simFrame.altitude_m) / 6378137.0) * earthRadius;

  // Compute 3D orbit trajectory arc points
  const trajectoryPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 120;
    // 97.6° SSO inclination: orbit plane is tilted ~8° from pure polar
    const incRad = (97.6 * Math.PI) / 180.0;
    const r = earthRadius + 5.0; // 529 km orbit

    for (let i = 0; i <= count; i++) {
      const u = (i / count) * Math.PI * 2.0;
      // Orbit in inclined plane
      const ox = r * Math.sin(u);
      const oy = r * Math.cos(u) * Math.cos(incRad);
      const oz = r * Math.cos(u) * Math.sin(incRad);
      pts.push(new THREE.Vector3(ox, oy, oz));
    }
    return pts;
  }, [earthRadius]);

  const trajectoryGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
  }, [trajectoryPoints]);

  const trajectoryLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    return new THREE.Line(trajectoryGeometry, mat);
  }, [trajectoryGeometry]);

  // Position of EOS-04 satellite along the orbit arc based on simulation downrange/progress
  useFrame((_, delta) => {
    // Map time or downrange to orbital angle
    // PS4 cutoff at ~1030s reaches injection position over Bay of Bengal / Indian Ocean
    const progress = Math.min(1.0, Math.max(0.0, (simFrame.time_s - 120) / 910.0));
    // Orbital angle from Sriharikota liftoff (u = 0.35) into polar orbit
    const incRad = (97.6 * Math.PI) / 180.0;
    const orbitAngle = 0.35 + progress * 1.8;

    const satX = orbitRadius * Math.sin(orbitAngle);
    const satY = orbitRadius * Math.cos(orbitAngle) * Math.cos(incRad);
    const satZ = orbitRadius * Math.cos(orbitAngle) * Math.sin(incRad);

    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.position.set(satX, satY, satZ);
      // Tangent direction along orbit for spacecraft attitude alignment
      const nextAngle = orbitAngle + 0.01;
      const targetVec = new THREE.Vector3(
        orbitRadius * Math.sin(nextAngle),
        orbitRadius * Math.cos(nextAngle) * Math.cos(incRad),
        orbitRadius * Math.cos(nextAngle) * Math.sin(incRad)
      );
      satelliteGroupRef.current.lookAt(targetVec);
    }

    // Radar cone and footprint animation when orbit is achieved or PS4 cuts off
    const isRadarActive = simFrame.isOrbitAchieved || simFrame.time_s >= 800;

    if (radarConeRef.current) {
      radarConeRef.current.visible = isRadarActive;
      if (isRadarActive) {
        // Radar pulse animation
        const pulse = 0.35 + Math.sin(simFrame.time_s * 4.0) * 0.12;
        (radarConeRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }

    if (radarFootprintRef.current) {
      radarFootprintRef.current.visible = isRadarActive;
      if (isRadarActive) {
        // Track ground point directly below satellite
        const norm = new THREE.Vector3(satX, satY, satZ).normalize();
        const groundPos = norm.clone().multiplyScalar(earthRadius + 0.15);
        radarFootprintRef.current.position.copy(groundPos);
        radarFootprintRef.current.lookAt(new THREE.Vector3(0, 0, 0));
      }
    }

    // Solar array deployment animation
    if (solarWingsRef.current) {
      const targetScale = isRadarActive ? 1.0 : 0.1;
      solarWingsRef.current.scale.x = THREE.MathUtils.damp(
        solarWingsRef.current.scale.x,
        targetScale,
        3.0,
        delta
      );
    }
  });

  return (
    <group>
      {/* 1. Scaled 3D Earth Globe with Detailed Indian Subcontinent */}
      <ScaledEarth radius={earthRadius} />

      {/* 2. Orbit Trajectory Arc Line */}
      <primitive object={trajectoryLine} />

      {/* 3. Upper Stage PS4 + EOS-04 Spacecraft in Orbit */}
      <group ref={satelliteGroupRef}>
        {/* Upper Stage PS4 Tank (if not yet separated) */}
        {!simFrame.isOrbitAchieved ? (
          <mesh position={[0, 0, -1.2]}>
            <cylinderGeometry args={[0.5, 0.5, 1.4, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        ) : null}

        {/* EOS-04 Spacecraft Main Body (Gold Thermal MLI) */}
        <mesh castShadow>
          <boxGeometry args={[1.2, 1.4, 1.0]} />
          <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Deployable Solar Panel Wings */}
        <group ref={solarWingsRef} scale={[0.1, 1, 1]}>
          {/* Left Wing */}
          <mesh position={[-2.2, 0, 0]}>
            <boxGeometry args={[2.8, 1.0, 0.04]} />
            <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
          </mesh>
          {/* Right Wing */}
          <mesh position={[2.2, 0, 0]}>
            <boxGeometry args={[2.8, 1.0, 0.04]} />
            <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>

        {/* C-band Synthetic Aperture Radar (SAR) Antenna Planar Array */}
        <mesh position={[0, -0.6, 0.5]} rotation={[Math.PI * 0.2, 0, 0]}>
          <boxGeometry args={[2.4, 1.2, 0.06]} />
          <meshStandardMaterial map={radarTexture} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Radar Swath Cone: Translucent beam sweeping down to Earth */}
        <mesh
          ref={radarConeRef}
          position={[0, -2.6, 0]}
          rotation={[Math.PI, 0, 0]}
          visible={false}
        >
          <coneGeometry args={[2.5, 5.2, 16, 1, true]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Status beacon light */}
        <pointLight color="#38bdf8" intensity={1.5} distance={15} />
      </group>

      {/* 4. Radar Ground Footprint Swath on Earth's Surface */}
      <mesh ref={radarFootprintRef} visible={false}>
        <ringGeometry args={[0.5, 3.2, 24]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Deep Space Starfield & Ambient */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[200, 300, 150]} intensity={2.0} />
    </group>
  );
}
