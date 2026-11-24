import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  getProceduralEarthPBRTextures,
  createAtmosphereShaderMaterial,
} from './textures/proceduralTextures';

interface Props {
  radius?: number;
}

/**
 * Photorealistic Scaled 3D Earth Globe with PBR Materials, Topography Bump,
 * Specular Ocean Water Glints, Rotating Cloud Shell & Rayleigh Atmosphere Scatter
 */
export function ScaledEarth({ radius = 60 }: Props) {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const cloudsMeshRef = useRef<THREE.Mesh>(null);

  const { map, bumpMap, roughnessMap, cloudsMap } = useMemo(
    () => getProceduralEarthPBRTextures(),
    []
  );

  const atmosphereMaterial = useMemo(
    () => createAtmosphereShaderMaterial('#38bdf8', 0.8, 2.8),
    []
  );

  // Subtle physical rotation of Earth & Cloud layers
  useFrame((_, delta) => {
    if (earthMeshRef.current) {
      earthMeshRef.current.rotation.y += delta * 0.0025;
    }
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.rotation.y += delta * 0.0055;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. High-Fidelity Earth Globe with PBR Bump & Roughness */}
      <mesh ref={earthMeshRef} receiveShadow castShadow>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial
          map={map}
          bumpMap={bumpMap}
          bumpScale={0.8}
          roughnessMap={roughnessMap}
          roughness={0.65}
          metalness={0.12}
          emissive="#0a2444"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* 2. Rotating Procedural Cloud Layer Shell (Radius * 1.014) */}
      <mesh ref={cloudsMeshRef}>
        <sphereGeometry args={[radius * 1.014, 48, 36]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.38}
          roughness={1.0}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Custom GLSL Rayleigh Atmospheric Limb Scatter Halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.035, 48, 36]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  );
}
