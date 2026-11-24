import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ScaledEarth } from './ScaledEarth';
import {
  getProceduralMarsPBRTextures,
  createSunShaderMaterial,
} from './textures/proceduralTextures';
import { INSPECTABLE_COMPONENTS, InspectableComponent } from './inspectData';
import { MOMSpacecraft, AdityaL1Spacecraft } from './ProceduralSpacecraft';

interface Props {
  missionId: string; // 'pslv-c25-mom' | 'pslv-c57-aditya-l1'
  phaseProgress: number; // 0.0 to 1.0 (Phase 1 -> Phase 2 -> Phase 3)
  onSelectComponent?: (comp: InspectableComponent) => void;
  onHoverComponent?: (comp: InspectableComponent | null) => void;
}

export function DeepSpaceScene({
  missionId,
  phaseProgress,
  onSelectComponent,
  onHoverComponent,
}: Props) {
  const marsRef = useRef<THREE.Mesh>(null);
  const marsGroupRef = useRef<THREE.Group>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const probeGroupRef = useRef<THREE.Group>(null);
  const l1ReticuleRef = useRef<THREE.Group>(null);

  const marsTextures = useMemo(() => getProceduralMarsPBRTextures(), []);
  const sunMaterial = useMemo(() => createSunShaderMaterial(), []);

  const isMOM = missionId === 'pslv-c25-mom';
  const isAditya = missionId === 'pslv-c57-aditya-l1';

  // Earth center in Deep Space scene
  const earthCenter = useMemo(() => new THREE.Vector3(-20, 0, 40), []);
  const sunCenter = useMemo(() => new THREE.Vector3(260, 0, 0), []);
  const marsRendezvous = useMemo(() => new THREE.Vector3(210, 0, -110), []);
  const l1Point = useMemo(() => new THREE.Vector3(135, 0, 15), []);

  // Dispose materials/textures on unmount
  useEffect(() => {
    return () => {
      sunMaterial.dispose();
      marsTextures.map.dispose();
      marsTextures.bumpMap.dispose();
      marsTextures.roughnessMap.dispose();
    };
  }, [sunMaterial, marsTextures]);

  // Dynamic animation loop
  useFrame((_, delta) => {
    // 1. Sun plasma shader animation
    if (sunMaterial.uniforms?.uTime) {
      sunMaterial.uniforms.uTime.value += delta;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.z += delta * 0.018;
      coronaRef.current.rotation.y += delta * 0.008;
    }

    // 2. Mars rotation & orbital movement along heliocentric arc
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.012;
    }
    if (marsGroupRef.current) {
      const currentMarsAngle = -0.48 - Math.max(0, 0.67 - phaseProgress) * 0.45;
      const currentMarsX = Math.cos(currentMarsAngle) * 236;
      const currentMarsZ = Math.sin(currentMarsAngle) * 236;
      marsGroupRef.current.position.set(currentMarsX, 0, currentMarsZ);
    }

    // 3. L1 Reticule pulse & rotation
    if (l1ReticuleRef.current) {
      l1ReticuleRef.current.rotation.z += delta * 0.4;
    }

    // 4. Spacecraft position and attitude tracking
    if (probeGroupRef.current) {
      if (isMOM) {
        if (phaseProgress < 0.33) {
          // ==========================================
          // PHASE 1: Earth-bound Apogee-Raising Loops
          // ==========================================
          const p = phaseProgress / 0.33; // 0 to 1
          // Apogee raising: loop index 0 to 5
          const loopCount = 6;
          const currentLoop = p * loopCount;
          const loopFraction = currentLoop % 1.0;
          const loopIndex = Math.floor(currentLoop);

          // Eccentricity grows with each burn
          const a = 42 + loopIndex * 8.5; // Semi-major axis
          const e = 0.15 + loopIndex * 0.11; // Eccentricity
          const b = a * Math.sqrt(Math.max(0.01, 1 - e * e)); // Semi-minor axis

          // Angle along orbit
          const theta = loopFraction * Math.PI * 2;
          const localX = a * Math.cos(theta) - a * e;
          const localZ = b * Math.sin(theta);
          const localY = Math.sin(theta) * (4 + loopIndex * 1.5);

          const posX = earthCenter.x + localX;
          const posY = earthCenter.y + localY;
          const posZ = earthCenter.z + localZ;

          probeGroupRef.current.position.set(posX, posY, posZ);

          // Compute tangent velocity vector for forward attitude
          const nextTheta = (loopFraction + 0.01) * Math.PI * 2;
          const nextX = earthCenter.x + (a * Math.cos(nextTheta) - a * e);
          const nextZ = earthCenter.z + b * Math.sin(nextTheta);
          const nextY = earthCenter.y + Math.sin(nextTheta) * (4 + loopIndex * 1.5);
          probeGroupRef.current.lookAt(nextX, nextY, nextZ);
        } else if (phaseProgress < 0.67) {
          // ==========================================
          // PHASE 2: Heliocentric Hohmann Transfer
          // ==========================================
          const p = (phaseProgress - 0.33) / 0.34; // 0 to 1
          // Departure tangent from Earth to Mars rendezvous
          const t = p;
          // Smooth bezier-like elliptic arc
          const x = earthCenter.x + t * (marsRendezvous.x - earthCenter.x);
          const y = Math.sin(t * Math.PI) * 48;
          const z = earthCenter.z + t * (marsRendezvous.z - earthCenter.z) - Math.sin(t * Math.PI) * 28;

          probeGroupRef.current.position.set(x, y, z);

          // Orientation: Tangent to flight path
          const tNext = Math.min(1.0, t + 0.01);
          const nX = earthCenter.x + tNext * (marsRendezvous.x - earthCenter.x);
          const nY = Math.sin(tNext * Math.PI) * 48;
          const nZ = earthCenter.z + tNext * (marsRendezvous.z - earthCenter.z) - Math.sin(tNext * Math.PI) * 28;
          probeGroupRef.current.lookAt(nX, nY, nZ);
        } else {
          // ==========================================
          // PHASE 3: Mars Capture Orbit (421 km x 76,993 km)
          // ==========================================
          const p = (phaseProgress - 0.67) / 0.33; // 0 to 1
          const a = 46; // Semi-major axis
          const b = 22; // High eccentricity
          const theta = p * Math.PI * 6; // 3 full revolutions in phase
          const tilt = 0.55; // 35 deg inclination

          const orbX = a * Math.cos(theta);
          const orbZ = b * Math.sin(theta);
          const rotY = orbZ * Math.sin(tilt);
          const rotZ = orbZ * Math.cos(tilt);

          probeGroupRef.current.position.set(
            marsRendezvous.x + orbX,
            marsRendezvous.y + rotY,
            marsRendezvous.z + rotZ
          );

          // Attitude: Scientific camera instruments pointed strictly toward Mars center
          probeGroupRef.current.lookAt(marsRendezvous.x, marsRendezvous.y, marsRendezvous.z);
        }
      } else if (isAditya) {
        if (phaseProgress < 0.33) {
          // ==========================================
          // PHASE 1: Earth-bound Expanding Loops
          // ==========================================
          const p = phaseProgress / 0.33;
          const loopCount = 5;
          const currentLoop = p * loopCount;
          const loopFraction = currentLoop % 1.0;
          const loopIndex = Math.floor(currentLoop);

          const a = 40 + loopIndex * 7.5;
          const e = 0.12 + loopIndex * 0.12;
          const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));

          const theta = loopFraction * Math.PI * 2;
          const posX = earthCenter.x + (a * Math.cos(theta) - a * e);
          const posZ = earthCenter.z + b * Math.sin(theta);
          const posY = earthCenter.y + Math.sin(theta) * 6;

          probeGroupRef.current.position.set(posX, posY, posZ);
          // Solar payload facing toward the Sun direction (+X)
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        } else if (phaseProgress < 0.67) {
          // ==========================================
          // PHASE 2: Trans-L1 Injection (TLI) Cruise
          // ==========================================
          const p = (phaseProgress - 0.33) / 0.34;
          const t = p;
          const x = earthCenter.x + t * (l1Point.x - earthCenter.x);
          const y = earthCenter.y + Math.sin(t * Math.PI) * 20;
          const z = earthCenter.z + t * (l1Point.z - earthCenter.z);

          probeGroupRef.current.position.set(x, y, z);
          // Solar instruments continuously pointed toward the Sun
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        } else {
          // ==========================================
          // PHASE 3: Sun-Earth L1 Halo Orbit (Lissajous)
          // ==========================================
          const p = (phaseProgress - 0.67) / 0.33;
          const theta = p * Math.PI * 4; // Multiple halo revolutions

          // Halo orbit: Oscillates primarily in Y-Z plane perpendicular to Sun-Earth line
          const haloX = l1Point.x + Math.sin(theta * 2) * 5.5;
          const haloY = l1Point.y + Math.cos(theta) * 24;
          const haloZ = l1Point.z + Math.sin(theta) * 30;

          probeGroupRef.current.position.set(haloX, haloY, haloZ);
          // Primary payload apertures (VELC, SUIT) strictly point toward the Sun (+X)
          probeGroupRef.current.lookAt(sunCenter.x, haloY * 0.2, haloZ * 0.2);
        }
      }
    }
  });

  // ========================================================
  // TRAJECTORY CURVES MEMOIZATION
  // ========================================================

  // 1. MOM Earth-bound Phasing Loops (Apogee Raising Maneuvers 1 to 6)
  const momPhasingLoops = useMemo(() => {
    const lines: THREE.Line[] = [];
    for (let loop = 0; loop < 6; loop++) {
      const a = 42 + loop * 8.5;
      const e = 0.15 + loop * 0.11;
      const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            earthCenter.x + (a * Math.cos(theta) - a * e),
            earthCenter.y + Math.sin(theta) * (4 + loop * 1.5),
            earthCenter.z + b * Math.sin(theta)
          )
        );
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: loop === 5 ? 0xf59e0b : 0x0284c7,
        transparent: true,
        opacity: 0.35 + loop * 0.1,
      });
      lines.push(new THREE.Line(geom, mat));
    }
    return lines;
  }, [earthCenter]);

  // 2. MOM Hohmann Transfer Ellipse Arc
  const momTransferCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const x = earthCenter.x + t * (marsRendezvous.x - earthCenter.x);
      const y = Math.sin(t * Math.PI) * 48;
      const z = earthCenter.z + t * (marsRendezvous.z - earthCenter.z) - Math.sin(t * Math.PI) * 28;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 4.5,
      gapSize: 2.5,
      transparent: true,
      opacity: 0.9,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [earthCenter, marsRendezvous]);

  // 3. Mars Orbital Heliocentric Arc
  const marsHeliocentricArc = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = -30; i <= 30; i++) {
      const rad = 236;
      const angle = -0.48 + (i / 30) * 0.35;
      pts.push(new THREE.Vector3(Math.cos(angle) * rad, 0, Math.sin(angle) * rad));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xea580c,
      dashSize: 6,
      gapSize: 4,
      transparent: true,
      opacity: 0.45,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, []);

  // 4. Mars Capture Elliptical Orbit (421 km x 76,993 km)
  const marsCaptureOrbit = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const a = 46;
    const b = 22;
    const tilt = 0.55;
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      const orbX = a * Math.cos(theta);
      const orbZ = b * Math.sin(theta);
      const rotY = orbZ * Math.sin(tilt);
      const rotZ = orbZ * Math.cos(tilt);
      pts.push(
        new THREE.Vector3(
          marsRendezvous.x + orbX,
          marsRendezvous.y + rotY,
          marsRendezvous.z + rotZ
        )
      );
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.Line(geom, mat);
  }, [marsRendezvous]);

  // 5. Aditya-L1 Earth-bound Loops
  const adityaPhasingLoops = useMemo(() => {
    const lines: THREE.Line[] = [];
    for (let loop = 0; loop < 5; loop++) {
      const a = 40 + loop * 7.5;
      const e = 0.12 + loop * 0.12;
      const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            earthCenter.x + (a * Math.cos(theta) - a * e),
            earthCenter.y + Math.sin(theta) * 6,
            earthCenter.z + b * Math.sin(theta)
          )
        );
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: loop === 4 ? 0x38bdf8 : 0x0ea5e9,
        transparent: true,
        opacity: 0.35 + loop * 0.12,
      });
      lines.push(new THREE.Line(geom, mat));
    }
    return lines;
  }, [earthCenter]);

  // 6. Aditya-L1 Trans-L1 Injection (TLI) Trajectory Line
  const adityaTliCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = earthCenter.x + t * (l1Point.x - earthCenter.x);
      const y = earthCenter.y + Math.sin(t * Math.PI) * 20;
      const z = earthCenter.z + t * (l1Point.z - earthCenter.z);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 5,
      gapSize: 3,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [earthCenter, l1Point]);

  // 7. Aditya-L1 3D Inclined Halo Orbit Loop around L1
  const l1HaloCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const theta = (i / 72) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          l1Point.x + Math.sin(theta * 2) * 5.5,
          l1Point.y + Math.cos(theta) * 24,
          l1Point.z + Math.sin(theta) * 30
        )
      );
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });
    return new THREE.Line(geom, mat);
  }, [l1Point]);

  return (
    <group>
      {/* ======================================================== */}
      {/* 1. EARTH REFERENCE SPHERE (Departure Origin)              */}
      {/* ======================================================== */}
      <group position={[earthCenter.x, earthCenter.y, earthCenter.z]} scale={[0.65, 0.65, 0.65]}>
        <ScaledEarth radius={55} />
      </group>

      {/* ======================================================== */}
      {/* 2. MANGALYAAN (MOM) DEEP-SPACE ENVIRONMENT (→ MARS)      */}
      {/* ======================================================== */}
      {isMOM ? (
        <group>
          {/* Phase 1: Expanding Earth-bound Apogee Raising Maneuver Loops */}
          {momPhasingLoops.map((line, idx) => (
            <primitive key={`mom-loop-${idx}`} object={line} />
          ))}

          {/* Phase 2: Hohmann Trans-Mars Injection Transfer Arc */}
          <primitive object={momTransferCurve} />

          {/* Mars Heliocentric Orbital Segment */}
          <primitive object={marsHeliocentricArc} />

          {/* Phase 3: Mars Capture Elliptical Orbit (421 km x 76,993 km) */}
          <primitive object={marsCaptureOrbit} />

          {/* 3D MARS GLOBE (Moving along heliocentric orbit to rendezvous at 100%) */}
          <group ref={marsGroupRef} position={[marsRendezvous.x, marsRendezvous.y, marsRendezvous.z]}>
            {/* Mars Sphere with PBR bump & roughness maps */}
            <mesh ref={marsRef} castShadow receiveShadow>
              <sphereGeometry args={[32, 64, 48]} />
              <meshStandardMaterial
                map={marsTextures.map}
                bumpMap={marsTextures.bumpMap}
                bumpScale={0.14}
                roughnessMap={marsTextures.roughnessMap}
                roughness={0.78}
                metalness={0.06}
              />
            </mesh>

            {/* Thin Martian Dusty Atmospheric Rim */}
            <mesh>
              <sphereGeometry args={[32 * 1.035, 48, 36]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.24}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Mars Ambient Point Light */}
            <pointLight color="#ea580c" intensity={1.5} distance={75} />
          </group>

          {/* HIGH-FIDELITY PROCEDURAL MOM SPACECRAFT */}
          <group ref={probeGroupRef}>
            <MOMSpacecraft
              onSelectComponent={onSelectComponent}
              onHoverComponent={onHoverComponent}
              inspectData={INSPECTABLE_COMPONENTS}
            />
          </group>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* 3. ADITYA-L1 ENVIRONMENT (→ SUN-EARTH L1 LAGRANGE POINT)  */}
      {/* ======================================================== */}
      {isAditya ? (
        <group>
          {/* Phase 1: Earth-bound Expanding Orbit Loops */}
          {adityaPhasingLoops.map((line, idx) => (
            <primitive key={`aditya-loop-${idx}`} object={line} />
          ))}

          {/* Phase 2: Trans-L1 Injection (TLI) Trajectory */}
          <primitive object={adityaTliCurve} />

          {/* Phase 3: 3D Inclined Halo Orbit Loop around L1 */}
          <primitive object={l1HaloCurve} />

          {/* GLSL ANIMATED SUN PHOTOSPHERE & CORONA AT [260, 0, 0] */}
          <group position={[sunCenter.x, sunCenter.y, sunCenter.z]}>
            {/* Real-time GLSL Sun Sphere with 3D FBM Plasma Convection */}
            <mesh ref={sunMeshRef} material={sunMaterial}>
              <sphereGeometry args={[55, 64, 48]} />
            </mesh>

            {/* Volumetric Corona Glow Envelope */}
            <mesh ref={coronaRef}>
              <sphereGeometry args={[75, 48, 36]} />
              <meshBasicMaterial
                color="#fde047"
                transparent
                opacity={0.38}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>

            {/* Outer Radiant Flare Shell */}
            <mesh>
              <sphereGeometry args={[98, 32, 24]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.2}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>

            {/* Dynamic Sun Omni-Light */}
            <pointLight color="#fef08a" intensity={4.8} distance={700} decay={1.4} />
          </group>

          {/* SUN-EARTH L1 LAGRANGE POINT RETICULE & CALLOUT */}
          <group position={[l1Point.x, l1Point.y, l1Point.z]}>
            <group ref={l1ReticuleRef}>
              {/* Outer pulsing ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[3.2, 3.6, 32]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.8}
                />
              </mesh>
              {/* Crosshair lines */}
              <mesh>
                <boxGeometry args={[8, 0.1, 0.1]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.1, 8, 0.1]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
              </mesh>
            </group>
            {/* L1 Center Marker */}
            <mesh>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
          </group>

          {/* HIGH-FIDELITY PROCEDURAL ADITYA-L1 OBSERVATORY SPACECRAFT */}
          <group ref={probeGroupRef}>
            <AdityaL1Spacecraft
              onSelectComponent={onSelectComponent}
              onHoverComponent={onHoverComponent}
              inspectData={INSPECTABLE_COMPONENTS}
            />
          </group>
        </group>
      ) : null}

      {/* Deep Space Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[150, 100, 100]} intensity={1.8} />
    </group>
  );
}
