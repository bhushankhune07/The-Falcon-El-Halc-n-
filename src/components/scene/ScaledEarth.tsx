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

  const { map, normalMap, roughnessMap, cloudsMap } = useMemo(
    () => getProceduralEarthPBRTextures(),
    []
  );

  const atmosphereMaterial = useMemo(
    () => createAtmosphereShaderMaterial('#38bdf8', 0.65, 3.0),
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
      {/* 1. High-Fidelity Earth Globe with PBR Normal & Roughness */}
      <mesh ref={earthMeshRef} receiveShadow castShadow>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial
          map={map}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={roughnessMap}
          roughness={0.65}
          metalness={0.15}
          emissive="#0a2444"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* 2. Rotating Procedural Cloud Layer Shell (Radius * 1.012) */}
      <mesh ref={cloudsMeshRef}>
        <sphereGeometry args={[radius * 1.012, 48, 36]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.42}
          roughness={1.0}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Custom GLSL Rayleigh Atmospheric Limb Scatter Halo (Radius * 1.026) */}
      <mesh>
        <sphereGeometry args={[radius * 1.026, 48, 36]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  );
}
