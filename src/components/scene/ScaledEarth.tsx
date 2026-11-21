import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  getProceduralEarthTexture,
  getProceduralCloudsTexture,
} from './textures/proceduralTextures';

interface Props {
  radius?: number;
}

export function ScaledEarth({ radius = 60 }: Props) {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthTexture = useMemo(() => getProceduralEarthTexture(), []);
  const cloudsTexture = useMemo(() => getProceduralCloudsTexture(), []);

  // Subtle rotation of Earth & Cloud layer
  useFrame((_, delta) => {
    if (earthMeshRef.current) {
      earthMeshRef.current.rotation.y += delta * 0.002;
    }
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += delta * 0.005;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ======================================================== */}
      {/* 1. HIGH-FIDELITY EARTH GLOBE (Continent Bathymetry & Cities) */}
      {/* ======================================================== */}
      <mesh ref={earthMeshRef} receiveShadow>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.55}
          metalness={0.15}
        />
      </mesh>

      {/* ======================================================== */}
      {/* 2. ROTATING PROCEDURAL CLOUD DECK (Radius * 1.012)        */}
      {/* ======================================================== */}
      <mesh ref={cloudsMeshRef}>
        <sphereGeometry args={[radius * 1.012, 48, 36]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.35}
          roughness={1.0}
          depthWrite={false}
        />
      </mesh>

      {/* ======================================================== */}
      {/* 3. RAYLEIGH-SCATTERING CYAN-BLUE ATMOSPHERIC LIMB GLOW    */}
      {/* ======================================================== */}
      <mesh>
        <sphereGeometry args={[radius * 1.038, 48, 36]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.32}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
