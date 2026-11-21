import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getProceduralEarthTexture } from './textures/proceduralTextures';

interface Props {
  radius?: number;
}

export function ScaledEarth({ radius = 60 }: Props) {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);
  const earthTexture = useMemo(() => getProceduralEarthTexture(), []);

  // Subtle rotation of Earth & Cloud layer
  useFrame((_, delta) => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Earth Globe with Detailed Indian Subcontinent Texture */}
      <mesh ref={earthMeshRef} receiveShadow>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.65}
          metalness={0.1}
        />
      </mesh>

      {/* Atmospheric Thin Cloud Shell */}
      <mesh ref={cloudsMeshRef}>
        <sphereGeometry args={[radius * 1.008, 48, 36]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.16}
          roughness={1.0}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric Rim Glow (Fresnel Halo) */}
      <mesh>
        <sphereGeometry args={[radius * 1.035, 48, 36]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.22}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
