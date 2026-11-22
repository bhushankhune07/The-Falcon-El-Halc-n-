import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getProceduralPadTexture } from './textures/proceduralTextures';

interface Props {
  altitude_m: number;
  downrange_m: number;
  time_s: number;
}

function LightningTower({ position }: { position: [number, number, number] }) {
  // 56m tall lattice mast with alternating red and white warning bands
  const segH = 11;
  return (
    <group position={position}>
      {/* 5-section tapering lattice structure */}
      <mesh position={[0, segH * 0.5, 0]} castShadow>
        <boxGeometry args={[2.6, segH, 2.6]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
      <mesh position={[0, segH * 1.5, 0]} castShadow>
        <boxGeometry args={[2.2, segH, 2.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, segH * 2.5, 0]} castShadow>
        <boxGeometry args={[1.8, segH, 1.8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
      <mesh position={[0, segH * 3.5, 0]} castShadow>
        <boxGeometry args={[1.4, segH, 1.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, segH * 4.5, 0]} castShadow>
        <boxGeometry args={[1.0, segH, 1.0]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>

      {/* Top lightning arrestor spike */}
      <mesh position={[0, segH * 5 + 4, 0]}>
        <cylinderGeometry args={[0.08, 0.35, 8, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Pulsating red aviation obstruction beacon */}
      <mesh position={[0, segH * 5 + 8.2, 0]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Pad illumination floodlight bracket */}
      <mesh position={[0, segH * 3.2, 0]}>
        <boxGeometry args={[2.0, 0.5, 2.0]} />
        <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Instanced Casuarina / Coastal Palm Treeline
 * Uses 1 single draw call for 140 trees around SDSC SHAR perimeter
 */
function InstancedCoastalTreeline() {
  const count = 140;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(() => {
    const arr: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      // Distribute trees around perimeter (excluding pad area within 70m)
      const angle = (i / count) * Math.PI * 2.0;
      const dist = 85 + (Math.sin(i * 12.3) * 0.5 + 0.5) * 180;
      const x = Math.cos(angle) * dist - (xDist(angle) > 0 ? 0 : 40);
      const z = Math.sin(angle) * dist;

      // Keep pad area clear
      if (Math.abs(x) < 55 && Math.abs(z) < 55) continue;

      const scale = 0.8 + ((i * 17) % 10) * 0.08;
      dummy.position.set(x, 0, z);
      dummy.scale.set(scale, scale * (1.0 + ((i * 7) % 5) * 0.1), scale);
      dummy.rotation.y = (i * 37) % Math.PI;
      dummy.updateMatrix();
      arr.push(dummy.matrix.clone());
    }
    return arr;
  }, [count]);

  function xDist(a: number) {
    return Math.cos(a);
  }

  useFrame(() => {
    if (meshRef.current && meshRef.current.count !== matrices.length) {
      matrices.forEach((mat, idx) => {
        meshRef.current?.setMatrixAt(idx, mat);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, matrices.length]}
      position={[0, 0, 0]}
    >
      <coneGeometry args={[2.8, 9, 7]} />
      <meshStandardMaterial color="#14532d" roughness={0.9} />
    </instancedMesh>
  );
}

/**
 * Mid-Atmosphere Procedural Cloud Deck (3 km to 8 km)
 * The vehicle punches cleanly through this multi-layered stratum during ascent!
 */
function CloudDeckStratum({ altitude_m }: { altitude_m: number }) {
  // Only render when rocket is below 16 km
  if (altitude_m > 16000) return null;

  return (
    <group position={[0, 4500, 0]}>
      {/* Lower Stratus Layer (3.5 km) */}
      <mesh position={[0, -1000, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18000, 18000, 8, 8]} />
        <meshStandardMaterial
          color="#f8fafc"
          transparent
          opacity={0.32}
          roughness={1.0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mid Cumulus Cloud Tufts */}
      {[-300, 250, 800, -900].map((cx, idx) => (
        <mesh key={idx} position={[cx, ((idx % 3) - 1) * 350, ((idx * 400) % 1200) - 600]}>
          <sphereGeometry args={[950 + idx * 150, 16, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.22}
            roughness={1.0}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Upper Altocumulus Deck (7 km) */}
      <mesh position={[0, 2500, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22000, 22000, 8, 8]} />
        <meshStandardMaterial
          color="#f1f5f9"
          transparent
          opacity={0.25}
          roughness={1.0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function SriharikotaGround({ altitude_m, downrange_m, time_s }: Props) {
  const groundGroupRef = useRef<THREE.Group>(null);
  const arm1Ref = useRef<THREE.Group>(null);
  const arm2Ref = useRef<THREE.Group>(null);
  const arm3Ref = useRef<THREE.Group>(null);
  const padTexture = useMemo(() => getProceduralPadTexture(), []);

  // Update floating origin ground displacement
  // DOWNRANGE FIX: downrange_m passed in is surface-relative downrange (Earth-rotation drift subtracted)
  useFrame(() => {
    if (groundGroupRef.current) {
      // Ground sinks vertically as rocket ascends
      groundGroupRef.current.position.y = -altitude_m;
      // Ground translates backward only with surface-relative downrange
      groundGroupRef.current.position.x = -Math.min(5000, downrange_m * 0.08);
    }

    // Realistic multi-tier Umbilical Swing Arm retractions (T+0 to T+3s)
    if (arm1Ref.current && arm2Ref.current && arm3Ref.current) {
      const retract = time_s > 0 ? Math.min(Math.PI * 0.48, time_s * 0.9) : 0;
      arm1Ref.current.rotation.y = retract;
      arm2Ref.current.rotation.y = retract * 0.95;
      arm3Ref.current.rotation.y = retract * 0.9;
    }
  });

  // Only render ground if altitude < 55 km to save GPU resources high in the mesosphere
  if (altitude_m > 55000) return null;

  return (
    <group ref={groundGroupRef}>
      {/* 360° Seamless Horizon Fog blending ground smoothly into the atmospheric sky dome */}
      <fog attach="fog" args={['#081220', 850, 3200]} />

      {/* Mid-atmosphere Cloud Deck (3 km - 8 km) */}
      <CloudDeckStratum altitude_m={altitude_m} />

      {/* ======================================================== */}
      {/* 1. ELEVATED CONCRETE LAUNCH PEDESTAL & FLAME TRENCHES     */}
      {/* ======================================================== */}
      {/* Concrete Pad Ground Apron (Clean Y-offset: y = 0.05) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial map={padTexture} roughness={0.75} metalness={0.2} />
      </mesh>

      {/* Main Elevated Pedestal Structure */}
      <mesh position={[0, 1.85, 0]} receiveShadow castShadow>
        <boxGeometry args={[42, 3.6, 42]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Circular Steel Launch Mount Ring & Hold-down Pedestals (y = 3.85) */}
      <mesh position={[0, 3.8, 0]}>
        <cylinderGeometry args={[4.2, 4.5, 0.4, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* 4 Corner Hold-down Clamps */}
      {[-3.2, 3.2].map((cx) =>
        [-3.2, 3.2].map((cz) => (
          <mesh key={`${cx}-${cz}`} position={[cx, 4.15, cz]} castShadow>
            <boxGeometry args={[1.0, 1.0, 1.0]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
          </mesh>
        ))
      )}

      {/* Twin East-West Concrete Flame Deflector Trenches (scorched inner walls) */}
      <mesh position={[-28, -0.6, 0]} receiveShadow>
        <boxGeometry args={[24, 3.2, 18]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.95} />
      </mesh>
      <mesh position={[28, -0.6, 0]} receiveShadow>
        <boxGeometry args={[24, 3.2, 18]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.95} />
      </mesh>

      {/* Scorched Central Flame Deflector Wedge (Inverted V-shape deflector) */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[5.5, 5.5, 14]} />
        <meshStandardMaterial color="#05070c" roughness={0.9} />
      </mesh>

      {/* ======================================================== */}
      {/* 2. UMBILICAL LAUNCH TOWER & 3-TIER SWING ARMS            */}
      {/* ======================================================== */}
      <group position={[-9.5, 3.6, 0]}>
        {/* Main 54-meter Red Lattice Tower Mast */}
        <mesh position={[0, 27, 0]} castShadow>
          <boxGeometry args={[5.2, 54, 5.2]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.5} />
        </mesh>

        {/* Structural Catwalk Platforms at 18m, 32m, 44m */}
        {[18, 32, 44].map((py) => (
          <mesh key={py} position={[1.2, py, 0]}>
            <boxGeometry args={[7.5, 0.6, 6.8]} />
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </mesh>
        ))}

        {/* Retractable Swing Arm 1: S12 / PS1 Umbilicals (y = 20) */}
        <group ref={arm1Ref} position={[2.6, 20, 0]}>
          <mesh position={[2.5, 0, 0]}>
            <boxGeometry args={[5.0, 1.2, 1.1]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.6} />
          </mesh>
        </group>

        {/* Retractable Swing Arm 2: PS2 Liquid Servicing (y = 33) */}
        <group ref={arm2Ref} position={[2.6, 33, 0]}>
          <mesh position={[2.5, 0, 0]}>
            <boxGeometry args={[5.0, 1.1, 1.0]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.6} />
          </mesh>
        </group>

        {/* Retractable Swing Arm 3: Fairing / Satellite Environmental Duct (y = 45) */}
        <group ref={arm3Ref} position={[2.6, 45, 0]}>
          <mesh position={[2.4, 0, 0]}>
            <boxGeometry args={[4.8, 1.0, 0.9]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.7} />
          </mesh>
        </group>

        {/* Top Lightning Mast Needle */}
        <mesh position={[0, 58, 0]}>
          <cylinderGeometry args={[0.08, 0.4, 8, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 3. MOBILE SERVICE TOWER (MST) RAIL TRACKS                */}
      {/* ======================================================== */}
      {/* 2 Sets of Heavy Steel Rails leading 120m West from pad   */}
      {[-3.5, -2.2, 2.2, 3.5].map((rz) => (
        <mesh key={rz} position={[-60, 3.7, rz]}>
          <boxGeometry args={[120, 0.2, 0.25]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Concrete MST Rail Bed */}
      <mesh position={[-60, 3.63, 0]}>
        <boxGeometry args={[120, 0.1, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* ======================================================== */}
      {/* 4. PROPELLANT & CRYO STORAGE SPHERES (WHITE)             */}
      {/* ======================================================== */}
      <group position={[-50, 6.0, 45]}>
        <mesh castShadow>
          <sphereGeometry args={[5.5, 24, 20]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.25} />
        </mesh>
        {/* Support cradle legs */}
        <mesh position={[0, -4.0, 0]}>
          <cylinderGeometry args={[4.0, 4.5, 3.5, 8, 1, true]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
      </group>
      <group position={[-38, 5.0, 50]}>
        <mesh castShadow>
          <sphereGeometry args={[4.2, 24, 20]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.25} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 5. PERIMETER CONCRETE BLAST DEFENSE WALLS                */}
      {/* ======================================================== */}
      <mesh position={[0, 4.8, 65]}>
        <boxGeometry args={[130, 2.5, 1.2]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.8, -65]}>
        <boxGeometry args={[130, 2.5, 1.2]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>

      {/* ======================================================== */}
      {/* 6. 4 TALL LIGHTNING PROTECTION LATTICE TOWERS            */}
      {/* ======================================================== */}
      <LightningTower position={[46, 0, 46]} />
      <LightningTower position={[-46, 0, 46]} />
      <LightningTower position={[46, 0, -46]} />
      <LightningTower position={[-46, 0, -46]} />

      {/* Floodlights illuminating the launch pad */}
      <pointLight position={[46, 38, 46]} intensity={1.2} color="#fef08a" distance={110} />
      <pointLight position={[-46, 38, 46]} intensity={1.2} color="#fef08a" distance={110} />
      <pointLight position={[46, 38, -46]} intensity={1.2} color="#fef08a" distance={110} />
      <pointLight position={[-46, 38, -46]} intensity={1.2} color="#fef08a" distance={110} />

      {/* ======================================================== */}
      {/* 7. INSTANCED COASTAL CASUARINA / PALM TREELINE           */}
      {/* ======================================================== */}
      <InstancedCoastalTreeline />

      {/* ======================================================== */}
      {/* 8. SRIHARIKOTA ISLAND COASTLINE & BAY OF BENGAL OCEAN    */}
      {/* ======================================================== */}
      {/* Sandy Beach / Coastal Terrain at y = -0.3 with polygonOffset */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[3200, 3200]} />
        <meshStandardMaterial
          color="#2d401e"
          roughness={0.9}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Bay of Bengal Ocean Surface at y = -1.2 (clean vertical separation, zero z-fighting) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[800, -1.2, 0]} receiveShadow>
        <planeGeometry args={[2200, 3200]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.15}
          metalness={0.5}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Rich PBR Lighting: warm golden morning sun + sky/ground bounce */}
      <hemisphereLight args={['#38bdf8', '#1e293b', 0.65]} />
      <directionalLight
        position={[90, 140, 70]}
        intensity={2.2}
        color="#fef3c7"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}
