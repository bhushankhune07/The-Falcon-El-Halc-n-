import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface Props {
  altitude_m: number;
}

export function AtmosphereSky({ altitude_m }: Props) {
  const skyMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const milkyWayRef = useRef<THREE.Points>(null);

  // Generate 1,400 background stars + 700 dense Milky Way band particles
  const { starPositions, starColors } = useMemo(() => {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 750.0;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star color temperatures (O/B blue, A/F white, G yellow, K orange, M red)
      const temp = Math.random();
      if (temp > 0.85) {
        colors[i * 3] = 0.75;
        colors[i * 3 + 1] = 0.88;
        colors[i * 3 + 2] = 1.0; // O/B Blue-White
      } else if (temp > 0.4) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0; // A/F Pure White
      } else if (temp > 0.15) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.92;
        colors[i * 3 + 2] = 0.65; // G Solar Gold
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.6;
        colors[i * 3 + 2] = 0.45; // M Red Giant
      }
    }
    return { starPositions: positions, starColors: colors };
  }, []);

  // Dense Milky Way celestial band
  const { mwPositions, mwColors } = useMemo(() => {
    const mwCount = 700;
    const positions = new Float32Array(mwCount * 3);
    const colors = new Float32Array(mwCount * 3);

    for (let i = 0; i < mwCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const bandSpread = (Math.random() - 0.5) * 0.35; // Narrow galactic plane
      const r = 745.0;

      // Inclined galactic plane
      const lx = r * Math.cos(angle);
      const ly = r * Math.sin(angle);
      const lz = r * bandSpread;

      // Rotate by 55 deg tilt
      const tilt = 0.96;
      positions[i * 3] = lx;
      positions[i * 3 + 1] = ly * Math.cos(tilt) - lz * Math.sin(tilt);
      positions[i * 3 + 2] = ly * Math.sin(tilt) + lz * Math.cos(tilt);

      // Milky Way dust and star cluster colors (subtle cyan/violet/gold)
      const cType = Math.random();
      if (cType > 0.6) {
        colors[i * 3] = 0.7;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 1.0;
      } else if (cType > 0.3) {
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.7;
      }
    }
    return { mwPositions: positions, mwColors: colors };
  }, []);

  // Dynamic sky dome colors
  const cGround = useMemo(() => new THREE.Color('#38bdf8'), []); // 0 km: Coastal sky blue
  const cStratosphere = useMemo(() => new THREE.Color('#1e1b4b'), []); // 30 km: Deep indigo
  const cSpace = useMemo(() => new THREE.Color('#020617'), []); // >80 km: Inky space black

  const currentColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const hKm = altitude_m / 1000.0;

    if (hKm <= 25.0) {
      const alpha = hKm / 25.0;
      currentColor.copy(cGround).lerp(cStratosphere, alpha);
    } else if (hKm <= 80.0) {
      const alpha = (hKm - 25.0) / 55.0;
      currentColor.copy(cStratosphere).lerp(cSpace, alpha);
    } else {
      currentColor.copy(cSpace);
    }

    if (skyMeshRef.current) {
      (skyMeshRef.current.material as THREE.MeshBasicMaterial).color.copy(currentColor);
    }

    // Stars become visible above 25 km and full brightness above 70 km
    const starOpacity = Math.max(0, Math.min(1.0, (hKm - 25.0) / 45.0));
    if (starsRef.current) {
      (starsRef.current.material as THREE.PointsMaterial).opacity = starOpacity;
    }
    if (milkyWayRef.current) {
      (milkyWayRef.current.material as THREE.PointsMaterial).opacity = starOpacity * 0.75;
    }
  });

  return (
    <group>
      {/* Atmosphere Sky Dome */}
      <mesh ref={skyMeshRef}>
        <sphereGeometry args={[780, 32, 24]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>

      {/* Procedural Multi-Color Starfield */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.9}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>

      {/* Procedural Milky Way Galactic Dust Band */}
      <points ref={milkyWayRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[mwPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[mwColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={2.4}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Sun Light Source */}
      <directionalLight
        position={[250, 450, 200]}
        intensity={altitude_m > 70000 ? 2.4 : 1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <ambientLight intensity={Math.max(0.15, 0.4 - (altitude_m / 120000.0) * 0.25)} />
    </group>
  );
}
