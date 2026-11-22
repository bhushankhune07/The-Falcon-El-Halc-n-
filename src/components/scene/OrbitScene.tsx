import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';
import { ScaledEarth } from './ScaledEarth';
import { DeepSpaceScene } from './DeepSpaceScene';
import {
  getProceduralSolarPanelTexture,
  getProceduralRadarTexture,
} from './textures/proceduralTextures';
import { INSPECTABLE_COMPONENTS, InspectableComponent } from './inspectData';
import { MissionConfig } from '../../sim';

interface Props {
  simFrame: SimFrameState;
  mission?: MissionConfig;
  targetOrbit?: {
    altitude_km: number;
    inclination_deg: number;
  };
  deepSpaceActive?: boolean;
  deepSpacePhase?: number; // 0..1
  blueprintMode?: boolean;
  onSelectComponent?: (comp: InspectableComponent) => void;
  onHoverComponent?: (comp: InspectableComponent | null) => void;
}

/**
 * Deep Space Starfield & Subtle Milky Way Band
 */
function DeepStarfield() {
  const points = useMemo(() => {
    const pts: number[] = [];
    const count = 750;
    const r = 320;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const rad = r + (Math.random() * 40 - 20);
      pts.push(
        rad * Math.sin(phi) * Math.cos(theta),
        rad * Math.sin(phi) * Math.sin(theta),
        rad * Math.cos(phi)
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geom;
  }, []);

  useEffect(() => {
    return () => {
      points.dispose();
    };
  }, [points]);

  return (
    <group>
      <points geometry={points}>
        <pointsMaterial
          size={1.4}
          color="#f8fafc"
          transparent
          opacity={0.85}
          sizeAttenuation={false}
        />
      </points>

      {/* Subtle Milky Way Galactic Dust Band */}
      <mesh rotation={[Math.PI * 0.25, Math.PI * 0.35, 0]}>
        <ringGeometry args={[260, 360, 48]} />
        <meshBasicMaterial
          color="#93c5fd"
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function OrbitScene({
  simFrame,
  mission,
  targetOrbit,
  deepSpaceActive = false,
  deepSpacePhase = 0.5,
  blueprintMode = false,
  onSelectComponent,
  onHoverComponent,
}: Props) {
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const radarConeRef = useRef<THREE.Mesh>(null);
  const radarFootprintRef = useRef<THREE.Mesh>(null);
  const solarWingsRef = useRef<THREE.Group>(null);
  const sarAntennaRef = useRef<THREE.Group>(null);
  const ps4GroupRef = useRef<THREE.Group>(null);

  const targetVecRef = useRef(new THREE.Vector3());
  const normVecRef = useRef(new THREE.Vector3());
  const groundPosRef = useRef(new THREE.Vector3());
  const originRef = useRef(new THREE.Vector3(0, 0, 0));

  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);
  const radarTexture = useMemo(() => getProceduralRadarTexture(), []);

  const earthRadius = 60.0;
  const incDeg = targetOrbit?.inclination_deg ?? 97.6;
  const incRad = (incDeg * Math.PI) / 180.0;
  const targetAltKm = targetOrbit?.altitude_km ?? 529.0;
  const targetOrbitRadius = earthRadius + (targetAltKm / 6378.137) * earthRadius;

  const orbitRadius = earthRadius + (Math.max(120000, simFrame.altitude_m) / 6378137.0) * earthRadius;

  // Post-Cutoff Commissioning Elapsed Time
  const ps4Stage = mission?.stages?.find((s) => s.type === 'ps4');
  const cutoffTime = ps4Stage ? ps4Stage.ignitionTime_s + ps4Stage.burnDuration_s : 1029.0;
  const dtCutoff = simFrame.ps4Cutoff ? Math.max(0, simFrame.time_s - cutoffTime) : 0;

  const handlePointerOver = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (onHoverComponent && INSPECTABLE_COMPONENTS[compId]) {
      onHoverComponent(INSPECTABLE_COMPONENTS[compId]);
    }
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    if (onHoverComponent) {
      onHoverComponent(null);
    }
  };
  const handleClick = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    if (onSelectComponent && INSPECTABLE_COMPONENTS[compId]) {
      onSelectComponent(INSPECTABLE_COMPONENTS[compId]);
    }
  };

  // Trajectory arc points derived from mission.targetOrbit
  const trajectoryPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 120;
    const r = targetOrbitRadius;

    for (let i = 0; i <= count; i++) {
      const u = (i / count) * Math.PI * 2.0;
      const ox = r * Math.sin(u);
      const oy = r * Math.cos(u) * Math.cos(incRad);
      const oz = r * Math.cos(u) * Math.sin(incRad);
      pts.push(new THREE.Vector3(ox, oy, oz));
    }
    return pts;
  }, [targetOrbitRadius, incRad]);

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

  useEffect(() => {
    return () => {
      trajectoryGeometry.dispose();
      (trajectoryLine.material as THREE.Material).dispose();
    };
  }, [trajectoryGeometry, trajectoryLine]);

  useFrame((_, delta) => {
    if (deepSpaceActive) return;

    const progress = Math.min(1.0, Math.max(0.0, (simFrame.time_s - 120) / 910.0));
    const orbitAngle = 0.35 + progress * 1.8;

    const satX = orbitRadius * Math.sin(orbitAngle);
    const satY = orbitRadius * Math.cos(orbitAngle) * Math.cos(incRad);
    const satZ = orbitRadius * Math.cos(orbitAngle) * Math.sin(incRad);

    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.position.set(satX, satY, satZ);
      const nextAngle = orbitAngle + 0.01;
      targetVecRef.current.set(
        orbitRadius * Math.sin(nextAngle),
        orbitRadius * Math.cos(nextAngle) * Math.cos(incRad),
        orbitRadius * Math.cos(nextAngle) * Math.sin(incRad)
      );
      satelliteGroupRef.current.lookAt(targetVecRef.current);
    }

    // Step 1: PS4 Upper Stage separation drift (backward along Z axis)
    if (ps4GroupRef.current) {
      const targetPs4Z = simFrame.ps4Cutoff ? -1.2 - Math.min(28.0, dtCutoff * 4.2) : -1.2;
      const targetPs4Y = simFrame.ps4Cutoff ? -Math.min(8.0, dtCutoff * 0.8) : 0;
      ps4GroupRef.current.position.z = THREE.MathUtils.damp(ps4GroupRef.current.position.z, targetPs4Z, 4.0, delta);
      ps4GroupRef.current.position.y = THREE.MathUtils.damp(ps4GroupRef.current.position.y, targetPs4Y, 4.0, delta);
    }

    // Step 2: Solar Array Deployment (hinges outward from 0° to 90° over 3 seconds, dtCutoff >= 3s)
    if (solarWingsRef.current) {
      const targetScale = !simFrame.ps4Cutoff
        ? 0.05
        : dtCutoff < 3.0
        ? 0.05
        : Math.min(1.0, 0.05 + ((dtCutoff - 3.0) / 3.0) * 0.95);
      solarWingsRef.current.scale.x = THREE.MathUtils.damp(solarWingsRef.current.scale.x, targetScale, 3.0, delta);
    }

    // Step 3: Instrument Activation (EOS-04 C-SAR antenna unfolds & activates radar cone)
    if (sarAntennaRef.current) {
      const targetRot = !simFrame.ps4Cutoff
        ? 0.0
        : dtCutoff < 5.5
        ? 0.0
        : Math.min(Math.PI * 0.22, ((dtCutoff - 5.5) / 2.0) * (Math.PI * 0.22));
      sarAntennaRef.current.rotation.x = THREE.MathUtils.damp(sarAntennaRef.current.rotation.x, targetRot, 2.5, delta);
    }

    const isRadarActive = simFrame.ps4Cutoff && dtCutoff >= 6.5;

    if (radarConeRef.current) {
      radarConeRef.current.visible = isRadarActive;
      if (isRadarActive) {
        const pulse = 0.35 + Math.sin(simFrame.time_s * 4.0) * 0.12;
        (radarConeRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }

    if (radarFootprintRef.current) {
      radarFootprintRef.current.visible = isRadarActive;
      if (isRadarActive) {
        normVecRef.current.set(satX, satY, satZ).normalize();
        groundPosRef.current.copy(normVecRef.current).multiplyScalar(earthRadius + 0.15);
        radarFootprintRef.current.position.copy(groundPosRef.current);
        radarFootprintRef.current.lookAt(originRef.current);
      }
    }
  });

  const isDeepSpaceMission = mission?.id === 'pslv-c25-mom' || mission?.id === 'pslv-c57-aditya-l1';

  return (
    <group>
      {/* Starfield background */}
      <DeepStarfield />

      {/* Render Deep-Space Interplanetary Transfer if active */}
      {deepSpaceActive && isDeepSpaceMission ? (
        <DeepSpaceScene
          missionId={mission.id}
          phaseProgress={deepSpacePhase}
          onSelectComponent={onSelectComponent}
          onHoverComponent={onHoverComponent}
        />
      ) : (
        /* Standard Earth Orbit View (EOS-04 & Ascent Parking Orbits) */
        <group>
          {/* 1. Scaled 3D Earth Globe with Detailed Indian Subcontinent & Cities */}
          <ScaledEarth radius={earthRadius} />

          {/* 2. Orbit Trajectory Arc Line */}
          <primitive object={trajectoryLine} />

          {/* 3. Upper Stage PS4 + Satellite in Orbit */}
          <group ref={satelliteGroupRef}>
            {/* Upper Stage PS4 Tank (visibly drifts backward after separation) */}
            <group
              ref={ps4GroupRef}
              position={[0, 0, -1.2]}
              onClick={(e) => handleClick(e, 'ps4_twin')}
              onPointerOver={(e) => handlePointerOver(e, 'ps4_twin')}
              onPointerOut={handlePointerOut}
            >
              <mesh>
                <cylinderGeometry args={[0.5, 0.5, 1.4, 16]} />
                {blueprintMode ? (
                  <meshStandardMaterial
                    wireframe
                    color="#00f0ff"
                    emissive="#00f0ff"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                  />
                ) : (
                  <meshStandardMaterial color="#64748b" metalness={0.8} />
                )}
              </mesh>
            </group>

            {/* Spacecraft Main Body (Gold Thermal MLI or Blueprint Wireframe) - Clickable */}
            <mesh
              castShadow
              onClick={(e) => handleClick(e, 'eos04_bus')}
              onPointerOver={(e) => handlePointerOver(e, 'eos04_bus')}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={[1.2, 1.4, 1.0]} />
              {blueprintMode ? (
                <meshStandardMaterial
                  wireframe
                  color="#00f0ff"
                  emissive="#00f0ff"
                  emissiveIntensity={0.6}
                  transparent
                  opacity={0.88}
                />
              ) : (
                <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
              )}
            </mesh>

            {/* Deployable Solar Panel Wings - Clickable */}
            <group
              ref={solarWingsRef}
              scale={[0.05, 1, 1]}
              onClick={(e) => handleClick(e, 'eos04_solar')}
              onPointerOver={(e) => handlePointerOver(e, 'eos04_solar')}
              onPointerOut={handlePointerOut}
            >
              {/* Left Wing */}
              <mesh position={[-2.2, 0, 0]}>
                <boxGeometry args={[2.8, 1.0, 0.04]} />
                {blueprintMode ? (
                  <meshStandardMaterial
                    wireframe
                    color="#00f0ff"
                    emissive="#00f0ff"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                  />
                ) : (
                  <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
                )}
              </mesh>
              {/* Right Wing */}
              <mesh position={[2.2, 0, 0]}>
                <boxGeometry args={[2.8, 1.0, 0.04]} />
                {blueprintMode ? (
                  <meshStandardMaterial
                    wireframe
                    color="#00f0ff"
                    emissive="#00f0ff"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                  />
                ) : (
                  <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
                )}
              </mesh>
            </group>

            {/* C-band Synthetic Aperture Radar (SAR) Antenna Planar Array - Clickable */}
            <group
              ref={sarAntennaRef}
              position={[0, -0.6, 0.5]}
              onClick={(e) => handleClick(e, 'eos04_sar')}
              onPointerOver={(e) => handlePointerOver(e, 'eos04_sar')}
              onPointerOut={handlePointerOut}
            >
              <mesh>
                <boxGeometry args={[2.4, 1.2, 0.06]} />
                {blueprintMode ? (
                  <meshStandardMaterial
                    wireframe
                    color="#00f0ff"
                    emissive="#00f0ff"
                    emissiveIntensity={0.7}
                    transparent
                    opacity={0.88}
                  />
                ) : (
                  <meshStandardMaterial map={radarTexture} metalness={0.7} roughness={0.3} />
                )}
              </mesh>
            </group>

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

            {/* Blueprint 3D Dimension Callout Annotations */}
            {blueprintMode ? (
              <group>
                {/* Horizontal Solar Span Dimension Line */}
                <mesh position={[0, 1.2, 0]}>
                  <boxGeometry args={[7.2, 0.02, 0.02]} />
                  <meshBasicMaterial color="#00f0ff" />
                </mesh>
                <mesh position={[-3.6, 1.2, 0]}>
                  <boxGeometry args={[0.02, 0.3, 0.02]} />
                  <meshBasicMaterial color="#00f0ff" />
                </mesh>
                <mesh position={[3.6, 1.2, 0]}>
                  <boxGeometry args={[0.02, 0.3, 0.02]} />
                  <meshBasicMaterial color="#00f0ff" />
                </mesh>

                {/* Vertical Bus Dimension Line */}
                <mesh position={[-1.2, 0, 0]}>
                  <boxGeometry args={[0.02, 1.8, 0.02]} />
                  <meshBasicMaterial color="#00f0ff" />
                </mesh>
              </group>
            ) : null}

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

          {/* Earth Orbit Directional Sun & Ambient Lighting (Rich, Bright & Clear) */}
          <ambientLight intensity={0.75} />
          <hemisphereLight args={['#60a5fa', '#0f172a', 0.9]} />
          <directionalLight position={[180, 220, 160]} intensity={3.2} />
          <directionalLight position={[-150, -80, -120]} intensity={0.6} color="#38bdf8" />
        </group>
      )}
    </group>
  );
}
