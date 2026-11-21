import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface Props {
  altitude_m: number;
}

export function AtmosphereSky({ altitude_m }: Props) {
  const skyMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);

  // Generate 800 random celestial background stars
  const { starPositions, starColors } = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Uniform distribution on sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 750.0;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star color temperatures (white, pale blue, warm yellow)
      const temp = Math.random();
      if (temp > 0.8) {
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0; // Blue-white
      } else if (temp > 0.3) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0; // Pure white
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.6; // Warm gold
      }
    }
    return { starPositions: positions, starColors: colors };
  }, []);

  // Dynamic sky dome colors
  const cGround = useMemo(() => new THREE.Color('#38bdf8'), []);    // 0 km: Coastal sky blue
  const cStratosphere = useMemo(() => new THREE.Color('#1e1b4b'), []); // 30 km: Deep indigo
  const cSpace = useMemo(() => new THREE.Color('#020617'), []);        // >80 km: Deep space black

  const currentColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const hKm = altitude_m / 1000.0;

    if (hKm <= 30.0) {
      const alpha = hKm / 30.0;
      currentColor.copy(cGround).lerp(cStratosphere, alpha);
    } else if (hKm <= 80.0) {
      const alpha = (hKm - 30.0) / 50.0;
      currentColor.copy(cStratosphere).lerp(cSpace, alpha);
    } else {
      currentColor.copy(cSpace);
    }

    if (skyMeshRef.current) {
      (skyMeshRef.current.material as THREE.MeshBasicMaterial).color.copy(currentColor);
    }

    // Stars become visible above 35 km and full brightness above 75 km
    if (starsRef.current) {
      const starOpacity = Math.max(0, Math.min(1.0, (hKm - 30.0) / 45.0));
      (starsRef.current.material as THREE.PointsMaterial).opacity = starOpacity;
    }
  });

  return (
    <group>
      {/* Atmosphere Sky Dome */}
      <mesh ref={skyMeshRef}>
        <sphereGeometry args={[780, 32, 24]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>

      {/* Procedural Starfield */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[starColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.8}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
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
