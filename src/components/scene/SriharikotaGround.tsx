import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getProceduralPadTexture } from './textures/proceduralTextures';

interface Props {
  altitude_m: number;
  downrange_m: number;
  time_s: number;
}

export function SriharikotaGround({ altitude_m, downrange_m, time_s }: Props) {
  const groundGroupRef = useRef<THREE.Group>(null);
  const umbilicalArmRef = useRef<THREE.Group>(null);
  const padTexture = useMemo(() => getProceduralPadTexture(), []);

  // Update floating origin ground displacement
  useFrame(() => {
    if (groundGroupRef.current) {
      // Ground plane sinks down as rocket ascends
      groundGroupRef.current.position.y = -altitude_m;
      // Ground moves backwards as downrange distance increases (sub-scaled for floating-origin visuals)
      groundGroupRef.current.position.x = -Math.min(5000, downrange_m * 0.1);
    }

    // Umbilical swing arm retraction at T+0s
    if (umbilicalArmRef.current) {
      const armRetract = time_s > 0 ? Math.min(Math.PI * 0.45, time_s * 0.8) : 0;
      umbilicalArmRef.current.rotation.y = armRetract;
    }
  });

  // Only render ground if altitude < 60 km to save draw calls when high in the atmosphere
  if (altitude_m > 60000) return null;

  return (
    <group ref={groundGroupRef}>
      {/* ======================================================== */}
      {/* FIRST LAUNCH PAD (FLP) CONCRETE DECK                      */}
      {/* ======================================================== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={padTexture} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Flame Deflector Trench Cavity */}
      <mesh position={[0, -3.0, 0]}>
        <boxGeometry args={[16, 5.5, 36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* ======================================================== */}
      {/* UMBILICAL LAUNCH TOWER & SWING ARMS                       */}
      {/* ======================================================== */}
      <group position={[-6.5, 0, 0]}>
        {/* Main Umbilical Tower Mast (~48m lattice tower) */}
        <mesh position={[0, 24, 0]} castShadow>
          <boxGeometry args={[4.5, 48, 4.5]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} wireframe={false} />
        </mesh>

        {/* Retractable Umbilical Swing Arm (retracts at T-0) */}
        <group ref={umbilicalArmRef} position={[2.2, 38, 0]}>
          <mesh position={[2.2, 0, 0]}>
            <boxGeometry args={[4.4, 1.2, 1.0]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.7} />
          </mesh>
        </group>

        {/* Tower Top Lightning Mast */}
        <mesh position={[0, 52, 0]}>
          <cylinderGeometry args={[0.1, 0.4, 8, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* SRIHARIKOTA ISLAND COASTLINE & BAY OF BENGAL OCEAN        */}
      {/* ======================================================== */}
      {/* Sandy Beach / Coastal Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[2200, 2200]} />
        <meshStandardMaterial color="#365314" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Bay of Bengal Ocean Surface (East of launch pad) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[600, -0.2, 0]} receiveShadow>
        <planeGeometry args={[1800, 2200]} />
        <meshStandardMaterial
          color="#0369a1"
          roughness={0.2}
          metalness={0.4}
          transparent
          opacity={0.88}
        />
      </mesh>
    </group>
  );
}
