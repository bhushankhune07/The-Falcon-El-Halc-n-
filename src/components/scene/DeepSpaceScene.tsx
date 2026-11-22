import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ScaledEarth } from './ScaledEarth';
import {
  getProceduralMarsTexture,
  getProceduralSunTexture,
  getProceduralSolarPanelTexture,
} from './textures/proceduralTextures';
import { INSPECTABLE_COMPONENTS, InspectableComponent } from './inspectData';

interface Props {
  missionId: string; // 'pslv-c25-mom' | 'pslv-c57-aditya-l1'
  phaseProgress: number; // 0.0 to 1.0 (Phase 1 -> Phase 2 -> Phase 3)
  onSelectComponent?: (comp: InspectableComponent) => void;
  onHoverComponent?: (comp: InspectableComponent | null) => void;
}

export function DeepSpaceScene({ missionId, phaseProgress, onSelectComponent, onHoverComponent }: Props) {
  const marsRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const probeGroupRef = useRef<THREE.Group>(null);

  const marsTexture = useMemo(() => getProceduralMarsTexture(), []);
  const sunTexture = useMemo(() => getProceduralSunTexture(), []);
  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);

  const isMOM = missionId === 'pslv-c25-mom';
  const isAditya = missionId === 'pslv-c57-aditya-l1';

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

  // Dynamic animation for Mars, Sun corona, and Spacecraft positioning
  useFrame((_, delta) => {
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.01;
    }
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.005;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.z += delta * 0.015;
    }

    if (probeGroupRef.current) {
      // Map phaseProgress (0 to 1) to spatial trajectory
      if (isMOM) {
        if (phaseProgress < 0.33) {
          // Phase 1: Earth Geocentric orbit raising (progress 0..0.33)
          const p = phaseProgress / 0.33;
          const r = 68 + p * 24;
          const a = p * Math.PI * 4;
          probeGroupRef.current.position.set(r * Math.cos(a), 8 * Math.sin(a), r * Math.sin(a));
          probeGroupRef.current.lookAt(0, 0, 0);
        } else if (phaseProgress < 0.67) {
          // Phase 2: Trans-Mars Injection Heliocentric Cruise (0.33..0.67)
          const p = (phaseProgress - 0.33) / 0.34;
          const x = -10 + p * 220;
          const y = Math.sin(p * Math.PI) * 45;
          const z = 85 - p * 190;
          probeGroupRef.current.position.set(x, y, z);
          probeGroupRef.current.lookAt(210, 0, -110);
        } else {
          // Phase 3: Mars Orbit Insertion & Martian capture orbit (0.67..1.0)
          const p = (phaseProgress - 0.67) / 0.33;
          const marsX = 210;
          const marsZ = -110;
          const a = p * Math.PI * 4;
          const r = 42 + Math.cos(a) * 16;
          probeGroupRef.current.position.set(marsX + r * Math.cos(a), 12 * Math.sin(a), marsZ + r * Math.sin(a));
          probeGroupRef.current.lookAt(marsX, 0, marsZ);
        }
      } else if (isAditya) {
        if (phaseProgress < 0.4) {
          // Phase 1: Earth Departure & Trans-L1 Insertion
          const p = phaseProgress / 0.4;
          const x = -10 + p * 90;
          const y = p * 15;
          const z = 20 - p * 40;
          probeGroupRef.current.position.set(x, y, z);
          probeGroupRef.current.lookAt(240, 0, 0);
        } else {
          // Phase 2 & 3: Sun-Earth L1 Halo Orbit (facing Sun at +X)
          const p = (phaseProgress - 0.4) / 0.6;
          const l1X = 135;
          const a = p * Math.PI * 4;
          // Halo orbit: Lissajous-like oval perpendicular to Sun line
          probeGroupRef.current.position.set(l1X + Math.sin(a * 2) * 4, Math.cos(a) * 22, Math.sin(a) * 28);
          // Always point scientific telescopes toward Sun (+X)
          probeGroupRef.current.lookAt(260, 0, 0);
        }
      }
    }
  });

  // Hohmann Transfer Curve Points (Earth to Mars)
  const momTransferCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const p = i / 60;
      const x = -10 + p * 220;
      const y = Math.sin(p * Math.PI) * 45;
      const z = 85 - p * 190;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 4,
      gapSize: 2.5,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, []);

  // L1 Halo Orbit Curve Points (Aditya-L1)
  const l1HaloCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const l1X = 135;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(l1X + Math.sin(a * 2) * 4, Math.cos(a) * 22, Math.sin(a) * 28));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    return new THREE.Line(geom, mat);
  }, []);

  return (
    <group>
      {/* ======================================================== */}
      {/* 1. EARTH REFERENCE SPHERE (Departure Origin)              */}
      {/* ======================================================== */}
      <group position={[-20, 0, 40]} scale={[0.65, 0.65, 0.65]}>
        <ScaledEarth radius={55} />
      </group>

      {/* ======================================================== */}
      {/* 2. MANGALYAAN (MOM) DEEP-SPACE ENVIRONMENT (→ MARS)      */}
      {/* ======================================================== */}
      {isMOM ? (
        <group>
          {/* Hohmann Trans-Mars Injection Transfer Arc */}
          <primitive object={momTransferCurve} />

          {/* 3D MARS GLOBE (Destination at [210, 0, -110]) */}
          <group position={[210, 0, -110]}>
            {/* Mars Sphere */}
            <mesh ref={marsRef} castShadow receiveShadow>
              <sphereGeometry args={[32, 48, 36]} />
              <meshStandardMaterial
                map={marsTexture}
                roughness={0.8}
                metalness={0.1}
              />
            </mesh>

            {/* Thin Martian Dusty Atmospheric Rim */}
            <mesh>
              <sphereGeometry args={[32 * 1.035, 36, 28]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.22}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Mars Capture Elliptical Orbit Ring */}
            <mesh rotation={[Math.PI * 0.35, 0, 0]}>
              <ringGeometry args={[41, 42.5, 64]} />
              <meshBasicMaterial
                color="#ef4444"
                transparent
                opacity={0.65}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Mars Annotation Pin */}
            <pointLight color="#ea580c" intensity={1.5} distance={70} />
          </group>

          {/* PROCEDURAL MOM SPACECRAFT MODEL */}
          <group ref={probeGroupRef}>
            {/* Gold Thermal MLI Bus */}
            <mesh
              castShadow
              receiveShadow
              onClick={(e) => handleClick(e, 'mom_bus')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_bus')}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={[2.2, 2.2, 2.2]} />
              <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
            </mesh>

            {/* 1.4m High-Gain Parabolic Dish Antenna (Earth pointing) */}
            <group
              position={[0, 1.4, 0.4]}
              rotation={[Math.PI * 0.3, 0, 0]}
              onClick={(e) => handleClick(e, 'mom_dish')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_dish')}
              onPointerOut={handlePointerOut}
            >
              <mesh>
                <coneGeometry args={[1.5, 0.6, 24, 1, true]} />
                <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} side={THREE.DoubleSide} />
              </mesh>
              {/* Central Feedhorn */}
              <mesh position={[0, -0.4, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
            </group>

            {/* 3-Panel Single-Wing Solar Array */}
            <group
              position={[-2.8, 0, 0]}
              onClick={(e) => handleClick(e, 'mom_bus')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_bus')}
              onPointerOut={handlePointerOut}
            >
              <mesh position={[-1.8, 0, 0]}>
                <boxGeometry args={[3.8, 1.6, 0.06]} />
                <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
              </mesh>
            </group>

            {/* 440 N Liquid Apogee Motor (LAM) Nozzle at base */}
            <mesh position={[0, -1.5, 0]}>
              <coneGeometry args={[0.45, 0.9, 16, 1, true]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} side={THREE.DoubleSide} />
            </mesh>

            {/* PAYLOAD: Mars Colour Camera (MCC) */}
            <mesh
              position={[0.8, 0.4, 1.15]}
              onClick={(e) => handleClick(e, 'mom_mcc')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_mcc')}
              onPointerOut={handlePointerOut}
            >
              <cylinderGeometry args={[0.2, 0.22, 0.5, 12]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.8} />
            </mesh>

            {/* PAYLOAD: Thermal Infrared Spectrometer (TIS) */}
            <mesh
              position={[-0.8, 0.4, 1.15]}
              onClick={(e) => handleClick(e, 'mom_tis')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_tis')}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={[0.35, 0.35, 0.4]} />
              <meshStandardMaterial color="#a855f7" metalness={0.7} />
            </mesh>

            {/* PAYLOAD: Methane Sensor for Mars (MSM) */}
            <mesh
              position={[0.5, -0.5, 1.15]}
              onClick={(e) => handleClick(e, 'mom_msm')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_msm')}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial color="#10b981" metalness={0.6} />
            </mesh>

            {/* PAYLOAD: Lyman Alpha Photometer (LAP) */}
            <mesh
              position={[-0.5, -0.5, 1.15]}
              onClick={(e) => handleClick(e, 'mom_lap')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_lap')}
              onPointerOut={handlePointerOut}
            >
              <cylinderGeometry args={[0.12, 0.12, 0.45, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} />
            </mesh>

            {/* PAYLOAD: MENCA Mass Spectrometer */}
            <mesh
              position={[0, -1.0, 1.15]}
              onClick={(e) => handleClick(e, 'mom_menca')}
              onPointerOver={(e) => handlePointerOver(e, 'mom_menca')}
              onPointerOut={handlePointerOut}
            >
              <cylinderGeometry args={[0.15, 0.15, 0.6, 12]} />
              <meshStandardMaterial color="#ec4899" metalness={0.7} />
            </mesh>
          </group>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* 3. ADITYA-L1 ENVIRONMENT (→ SUN-EARTH L1 LAGRANGE POINT)  */}
      {/* ======================================================== */}
      {isAditya ? (
        <group>
          {/* Glowing 3D Sun Photosphere & Corona at [260, 0, 0] */}
          <group position={[260, 0, 0]}>
            {/* Radiant Sun Sphere */}
            <mesh ref={sunRef}>
              <sphereGeometry args={[55, 48, 36]} />
              <meshBasicMaterial map={sunTexture} />
            </mesh>

            {/* Volumetric Corona Glow Envelope */}
            <mesh ref={coronaRef}>
              <sphereGeometry args={[75, 32, 24]} />
              <meshBasicMaterial
                color="#fde047"
                transparent
                opacity={0.35}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>

            {/* Outer Radiant Flare Shell */}
            <mesh>
              <sphereGeometry args={[95, 24, 18]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.18}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>

            {/* Dynamic Sun Omni-Light */}
            <pointLight color="#fef08a" intensity={4.5} distance={600} decay={1.5} />
          </group>

          {/* L1 Lagrange Point Marker (135, 0, 0) */}
          <group position={[135, 0, 0]}>
            <mesh>
              <sphereGeometry args={[1.5, 16, 16]} />
              <meshBasicMaterial color="#38bdf8" wireframe />
            </mesh>
          </group>

          {/* 3D Halo Orbit Loop around L1 */}
          <primitive object={l1HaloCurve} />

          {/* PROCEDURAL ADITYA-L1 SPACECRAFT MODEL */}
          <group ref={probeGroupRef}>
            {/* Spacecraft Main Bus */}
            <mesh
              castShadow
              receiveShadow
              onClick={(e) => handleClick(e, 'aditya_velc')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_velc')}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={[2.0, 2.2, 2.0]} />
              <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
            </mesh>

            {/* Symmetrical Dual Solar Array Wings */}
            {/* Left Solar Wing */}
            <group
              position={[0, 0, -2.2]}
              onClick={(e) => handleClick(e, 'aditya_velc')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_velc')}
              onPointerOut={handlePointerOut}
            >
              <mesh position={[0, 0, -1.8]}>
                <boxGeometry args={[1.6, 1.4, 3.4]} />
                <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
              </mesh>
            </group>
            {/* Right Solar Wing */}
            <group
              position={[0, 0, 2.2]}
              onClick={(e) => handleClick(e, 'aditya_velc')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_velc')}
              onPointerOut={handlePointerOut}
            >
              <mesh position={[0, 0, 1.8]}>
                <boxGeometry args={[1.6, 1.4, 3.4]} />
                <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
              </mesh>
            </group>

            {/* PAYLOAD 1: VELC (Visible Emission Line Coronagraph - Main Aperture) */}
            <group
              position={[1.15, 0.5, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              onClick={(e) => handleClick(e, 'aditya_velc')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_velc')}
              onPointerOut={handlePointerOut}
            >
              <mesh>
                <cylinderGeometry args={[0.45, 0.55, 0.8, 16]} />
                <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Internal Occulter Baffle Aperture */}
              <mesh position={[0, 0.41, 0]}>
                <circleGeometry args={[0.38, 16]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
            </group>

            {/* PAYLOAD 2: SUIT (Solar Ultraviolet Imaging Telescope) */}
            <mesh
              position={[1.15, -0.4, 0.45]}
              rotation={[0, 0, -Math.PI / 2]}
              onClick={(e) => handleClick(e, 'aditya_suit')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_suit')}
              onPointerOut={handlePointerOut}
            >
              <cylinderGeometry args={[0.25, 0.28, 0.6, 16]} />
              <meshStandardMaterial color="#a855f7" metalness={0.7} />
            </mesh>

            {/* PAYLOAD 3 & 4: SoLEXS & HEL1OS X-ray Spectrometers */}
            <mesh
              position={[1.15, -0.4, -0.45]}
              onClick={(e) => handleClick(e, 'aditya_solexs')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_solexs')}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={[0.3, 0.4, 0.5]} />
              <meshStandardMaterial color="#10b981" metalness={0.6} />
            </mesh>

            {/* PAYLOAD 5 & 6: ASPEX & PAPA Plasma / Solar Wind Analyzers */}
            <mesh
              position={[0, 1.2, 0.4]}
              onClick={(e) => handleClick(e, 'aditya_aspex')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_aspex')}
              onPointerOut={handlePointerOut}
            >
              <cylinderGeometry args={[0.2, 0.2, 0.4, 12]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} />
            </mesh>

            {/* PAYLOAD 7: 6m Deployable Magnetometer (MAG) Boom */}
            <group
              position={[-1.1, 0, 0]}
              onClick={(e) => handleClick(e, 'aditya_mag')}
              onPointerOver={(e) => handlePointerOver(e, 'aditya_mag')}
              onPointerOut={handlePointerOut}
            >
              {/* Long composite boom extending aft (-X) */}
              <mesh position={[-2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 5.0, 8]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
              {/* Inboard MAG Fluxgate Sensor (at 2.5m) */}
              <mesh position={[-2.5, 0, 0]}>
                <boxGeometry args={[0.25, 0.25, 0.25]} />
                <meshStandardMaterial color="#e11d48" metalness={0.8} />
              </mesh>
              {/* Outboard MAG Fluxgate Sensor (at 5.0m tip) */}
              <mesh position={[-5.0, 0, 0]}>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial color="#e11d48" metalness={0.8} />
              </mesh>
            </group>
          </group>
        </group>
      ) : null}

      {/* Deep Space Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[150, 100, 100]} intensity={1.8} />
    </group>
  );
}
