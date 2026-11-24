import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';
import { ScaledEarth } from './ScaledEarth';
import { DeepSpaceScene } from './DeepSpaceScene';
import { EOS04Spacecraft } from './ProceduralSpacecraft';
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
  commissioningTime?: number;
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
    const colors: number[] = [];
    const count = 1200;
    const r = 360;

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const rad = r + (Math.random() * 60 - 30);
      pts.push(
        rad * Math.sin(phi) * Math.cos(theta),
        rad * Math.sin(phi) * Math.sin(theta),
        rad * Math.cos(phi)
      );

      // Star color variation (pure white, soft cyan-blue, warm golden)
      const starType = Math.random();
      if (starType > 0.8) {
        colors.push(0.7, 0.85, 1.0); // O/B blue-white star
      } else if (starType < 0.2) {
        colors.push(1.0, 0.88, 0.7); // K/M warm star
      } else {
        colors.push(0.96, 0.98, 1.0); // G/F white star
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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
          size={1.6}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation={false}
        />
      </points>

      {/* Subtle Milky Way Galactic Dust Band */}
      <mesh rotation={[Math.PI * 0.25, Math.PI * 0.35, 0]}>
        <ringGeometry args={[260, 420, 64]} />
        <meshBasicMaterial
          color="#93c5fd"
          transparent
          opacity={0.08}
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
  deepSpacePhase = 0,
  commissioningTime = 0,
  blueprintMode = false,
  onSelectComponent,
  onHoverComponent,
}: Props) {
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const ps4GroupRef = useRef<THREE.Group>(null);
  const radarConeRef = useRef<THREE.Mesh>(null);
  const swathStripRef = useRef<THREE.Line>(null);

  const continuousOrbitAngleRef = useRef<number>(0);
  const basisMatrixRef = useRef(new THREE.Matrix4());
  const zenithVecRef = useRef(new THREE.Vector3());
  const alongTrackVecRef = useRef(new THREE.Vector3());
  const crossTrackVecRef = useRef(new THREE.Vector3());

  const earthRadius = 60.0;
  const incDeg = targetOrbit?.inclination_deg ?? 97.6;
  const incRad = (incDeg * Math.PI) / 180.0;
  const targetOrbitRadius = earthRadius * 1.32;
  const orbitRadius = earthRadius * 1.32;

  // Post-Cutoff Commissioning Elapsed Time (Independent real-time elapsed timer 0..10s)
  const dtCutoff = simFrame.ps4Cutoff ? (commissioningTime ?? 0) : 0;
  const isRcsFiring = simFrame.ps4Cutoff && dtCutoff < 3.2;

  // Trajectory arc points derived from mission.targetOrbit
  const trajectoryPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 180;
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

  // Swath ribbon ground-track line painted across Earth's surface
  const swathGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 180;
    const r = earthRadius + 0.16;
    for (let i = 0; i <= count; i++) {
      const u = (i / count) * Math.PI * 2.0;
      pts.push(
        new THREE.Vector3(
          r * Math.sin(u),
          r * Math.cos(u) * Math.cos(incRad),
          r * Math.cos(u) * Math.sin(incRad)
        )
      );
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [earthRadius, incRad]);

  const swathLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.7,
      linewidth: 3,
    });
    return new THREE.Line(swathGeometry, mat);
  }, [swathGeometry]);

  useEffect(() => {
    return () => {
      trajectoryGeometry.dispose();
      (trajectoryLine.material as THREE.Material).dispose();
      swathGeometry.dispose();
      (swathLine.material as THREE.Material).dispose();
    };
  }, [trajectoryGeometry, trajectoryLine, swathGeometry, swathLine]);

  useFrame((_, delta) => {
    if (deepSpaceActive) return;

    // 1. Continuous smooth orbital revolution around Earth
    const baseProgress = Math.min(1.0, Math.max(0.0, (simFrame.time_s - 120) / 910.0));
    if (simFrame.ps4Cutoff || simFrame.time_s >= 1020) {
      continuousOrbitAngleRef.current += delta * 0.08;
    } else {
      continuousOrbitAngleRef.current = 0;
    }
    const orbitAngle = 0.35 + baseProgress * 1.8 + continuousOrbitAngleRef.current;

    // Spacecraft Orbital Position
    const satX = orbitRadius * Math.sin(orbitAngle);
    const satY = orbitRadius * Math.cos(orbitAngle) * Math.cos(incRad);
    const satZ = orbitRadius * Math.cos(orbitAngle) * Math.sin(incRad);

    // 2. Orbital Local-Vertical / Local-Horizontal (LVLH) Attitude Frame
    // Zenith (+Y_body): radially outward away from Earth center (0,0,0)
    // Nadir (-Y_body): SAR antenna strictly points toward Earth center (0,0,0)
    // Along-track (+Z_body): forward velocity tangent vector along 97.6° SSO
    // Cross-track (+X_body): solar arrays axis along orbit normal
    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.position.set(satX, satY, satZ);

      zenithVecRef.current.set(satX, satY, satZ).normalize();

      // Velocity tangent: d/d(theta) of orbit position
      const vx = orbitRadius * Math.cos(orbitAngle);
      const vy = -orbitRadius * Math.sin(orbitAngle) * Math.cos(incRad);
      const vz = -orbitRadius * Math.sin(orbitAngle) * Math.sin(incRad);
      alongTrackVecRef.current.set(vx, vy, vz).normalize();

      // X = Y × Z
      crossTrackVecRef.current
        .crossVectors(zenithVecRef.current, alongTrackVecRef.current)
        .normalize();

      // Re-orthogonalize Z = X × Y
      alongTrackVecRef.current
        .crossVectors(crossTrackVecRef.current, zenithVecRef.current)
        .normalize();

      // Set rotation matrix: X=crossTrack, Y=zenith, Z=alongTrack
      basisMatrixRef.current.makeBasis(
        crossTrackVecRef.current,
        zenithVecRef.current,
        alongTrackVecRef.current
      );
      satelliteGroupRef.current.quaternion.setFromRotationMatrix(basisMatrixRef.current);
    }

    // 3. PS4 Upper Stage separation drift (backward along -alongTrack)
    if (ps4GroupRef.current) {
      const targetPs4Z = simFrame.ps4Cutoff ? -1.2 - Math.min(32.0, dtCutoff * 4.8) : -1.2;
      const targetPs4Y = simFrame.ps4Cutoff ? -Math.min(8.0, dtCutoff * 0.9) : 0;
      ps4GroupRef.current.position.z = THREE.MathUtils.damp(
        ps4GroupRef.current.position.z,
        targetPs4Z,
        4.0,
        delta
      );
      ps4GroupRef.current.position.y = THREE.MathUtils.damp(
        ps4GroupRef.current.position.y,
        targetPs4Y,
        4.0,
        delta
      );
    }

    // 4. C-band SAR Radar Beam Sweeping Ground Track
    const isRadarActive = simFrame.ps4Cutoff && dtCutoff >= 6.0;

    if (radarConeRef.current) {
      radarConeRef.current.visible = isRadarActive;
      if (isRadarActive) {
        // Pulse sweep effect
        const pulse = 0.3 + Math.sin(continuousOrbitAngleRef.current * 14.0) * 0.12;
        (radarConeRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }

    if (swathStripRef.current) {
      swathStripRef.current.visible = isRadarActive;
    }
  });

  const isDeepSpaceMission =
    mission?.id === 'pslv-c25-mom' || mission?.id === 'pslv-c57-aditya-l1';

  // Solar array deployment animation scale
  const solarDeployScale = !simFrame.ps4Cutoff
    ? 0.05
    : dtCutoff < 3.0
    ? 0.05
    : Math.min(1.0, 0.05 + ((dtCutoff - 3.0) / 3.0) * 0.95);

  // SAR antenna deployment rotation
  const sarAntennaRotation = !simFrame.ps4Cutoff
    ? 0.0
    : dtCutoff < 4.8
    ? 0.0
    : Math.min(Math.PI * 0.22, ((dtCutoff - 4.8) / 1.2) * (Math.PI * 0.22));

  return (
    <group>
      {/* 1. Deep Space Starfield & Milky Way */}
      <DeepStarfield />

      {/* 2. Deep-Space Interplanetary Transfer if active */}
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
          {/* Scaled 3D Earth Globe with PBR Materials & Clouds */}
          <ScaledEarth radius={earthRadius} />

          {/* Target Orbit Trajectory Arc Line */}
          <primitive object={trajectoryLine} />

          {/* Glowing Ground-Track Swath Strip Painted on Earth */}
          <primitive ref={swathStripRef} object={swathLine} visible={false} />

          {/* Spacecraft + PS4 Upper Stage in Orbit */}
          <group ref={satelliteGroupRef}>
            {/* PS4 Spent Upper Stage (Drifts backward on separation) */}
            <group
              ref={ps4GroupRef}
              position={[0, 0, -1.2]}
              onClick={(e) => {
                e.stopPropagation();
                if (INSPECTABLE_COMPONENTS['ps4_twin'] && onSelectComponent) {
                  onSelectComponent(INSPECTABLE_COMPONENTS['ps4_twin']);
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                if (INSPECTABLE_COMPONENTS['ps4_twin'] && onHoverComponent) {
                  onHoverComponent(INSPECTABLE_COMPONENTS['ps4_twin']);
                }
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
                if (onHoverComponent) onHoverComponent(null);
              }}
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
                  <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.35} />
                )}
              </mesh>
            </group>

            {/* High-Fidelity EOS-04 Spacecraft in LVLH Nadir Alignment */}
            <EOS04Spacecraft
              blueprintMode={blueprintMode}
              solarDeployScale={solarDeployScale}
              sarAntennaRotation={sarAntennaRotation}
              isRcsFiring={isRcsFiring}
              onSelectComponent={onSelectComponent}
              onHoverComponent={onHoverComponent}
              inspectData={INSPECTABLE_COMPONENTS}
            />

            {/* Radar Swath Cone: Translucent beam sweeping down strictly toward Nadir */}
            <mesh
              ref={radarConeRef}
              position={[0, -0.92 - (orbitRadius - earthRadius) / 2, 0]}
              rotation={[0, 0, 0]}
              visible={false}
            >
              <coneGeometry args={[3.2, orbitRadius - earthRadius, 24, 1, true]} />
              <meshBasicMaterial
                color="#22d3ee"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Blueprint 3D Dimension Callouts */}
            {blueprintMode && (
              <group>
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
              </group>
            )}

            {/* Spacecraft status beacon */}
            <pointLight color="#38bdf8" intensity={1.8} distance={18} />
          </group>

          {/* Orbital Scene Lighting */}
          <ambientLight intensity={0.8} />
          <hemisphereLight args={['#60a5fa', '#0f172a', 0.95]} />
          <directionalLight position={[180, 220, 160]} intensity={3.4} castShadow />
          <directionalLight position={[-150, -80, -120]} intensity={0.7} color="#38bdf8" />
        </group>
      )}
    </group>
  );
}
