import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  getProceduralGoldMLITextures,
  getProceduralSolarPanelTexture,
  getProceduralRadarTexture,
} from './textures/proceduralTextures';
import { InspectableComponent } from './inspectData';

interface SpacecraftProps {
  blueprintMode?: boolean;
  onSelectComponent?: (comp: InspectableComponent) => void;
  onHoverComponent?: (comp: InspectableComponent | null) => void;
  inspectData?: Record<string, InspectableComponent>;
}

interface EOS04Props extends SpacecraftProps {
  solarDeployScale?: number; // 0..1
  sarAntennaRotation?: number; // radians
  isRcsFiring?: boolean;
  sunPosition?: [number, number, number];
}

/**
 * High-Fidelity EOS-04 (RISAT-1A) C-band SAR Radar Satellite
 */
export function EOS04Spacecraft({
  blueprintMode = false,
  solarDeployScale = 1.0,
  sarAntennaRotation = Math.PI * 0.22,
  isRcsFiring = false,
  onSelectComponent,
  onHoverComponent,
  inspectData,
}: EOS04Props) {
  const mliTextures = useMemo(() => getProceduralGoldMLITextures(), []);
  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);
  const radarTexture = useMemo(() => getProceduralRadarTexture(), []);
  const solarGimbalRef = useRef<THREE.Group>(null);

  const handleClick = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    if (inspectData && inspectData[compId] && onSelectComponent) {
      onSelectComponent(inspectData[compId]);
    }
  };

  const handlePointerOver = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (inspectData && inspectData[compId] && onHoverComponent) {
      onHoverComponent(inspectData[compId]);
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    if (onHoverComponent) {
      onHoverComponent(null);
    }
  };

  return (
    <group>
      {/* 1. Main Spacecraft Bus Structure (Gold Kapton MLI) */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => handleClick(e, 'eos04_bus')}
        onPointerOver={(e) => handlePointerOver(e, 'eos04_bus')}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[1.5, 1.8, 1.2]} />
        {blueprintMode ? (
          <meshStandardMaterial
            wireframe
            color="#00f0ff"
            emissive="#00f0ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        ) : (
          <meshStandardMaterial
            color="#d4a017"
            metalness={0.92}
            roughness={0.28}
            bumpMap={mliTextures.bumpMap}
            bumpScale={0.06}
            roughnessMap={mliTextures.roughnessMap}
          />
        )}
      </mesh>

      {/* Silver avionics equipment decks & telemetry patch plates */}
      <mesh position={[0, 0.91, 0]}>
        <boxGeometry args={[1.4, 0.04, 1.1]} />
        <meshStandardMaterial
          color={blueprintMode ? '#00f0ff' : '#e2e8f0'}
          metalness={0.8}
          roughness={0.2}
          wireframe={blueprintMode}
        />
      </mesh>
      <mesh position={[0, -0.91, 0]}>
        <boxGeometry args={[1.4, 0.04, 1.1]} />
        <meshStandardMaterial
          color={blueprintMode ? '#00f0ff' : '#475569'}
          metalness={0.85}
          roughness={0.3}
          wireframe={blueprintMode}
        />
      </mesh>

      {/* 2. Dual Deployable Solar Array Wings (+X and -X) */}
      <group
        ref={solarGimbalRef}
        scale={[solarDeployScale, 1, 1]}
        onClick={(e) => handleClick(e, 'eos04_solar')}
        onPointerOver={(e) => handlePointerOver(e, 'eos04_solar')}
        onPointerOut={handlePointerOut}
      >
        {/* +X Solar Wing (3 articulated panels) */}
        <group position={[0.75, 0, 0]}>
          <mesh position={[1.8, 0, 0]} castShadow>
            <boxGeometry args={[3.4, 1.2, 0.03]} />
            {blueprintMode ? (
              <meshStandardMaterial
                wireframe
                color="#00f0ff"
                emissive="#00f0ff"
                emissiveIntensity={0.5}
              />
            ) : (
              <meshStandardMaterial
                map={solarTexture}
                color="#0284c7"
                metalness={0.4}
                roughness={0.18}
              />
            )}
          </mesh>
          {/* Yoke / SADM mount strut */}
          <mesh position={[0.1, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} wireframe={blueprintMode} />
          </mesh>
        </group>

        {/* -X Solar Wing (3 articulated panels) */}
        <group position={[-0.75, 0, 0]}>
          <mesh position={[-1.8, 0, 0]} castShadow>
            <boxGeometry args={[3.4, 1.2, 0.03]} />
            {blueprintMode ? (
              <meshStandardMaterial
                wireframe
                color="#00f0ff"
                emissive="#00f0ff"
                emissiveIntensity={0.5}
              />
            ) : (
              <meshStandardMaterial
                map={solarTexture}
                color="#0284c7"
                metalness={0.4}
                roughness={0.18}
              />
            )}
          </mesh>
          <mesh position={[-0.1, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} wireframe={blueprintMode} />
          </mesh>
        </group>
      </group>

      {/* 3. C-Band SAR Active Phased Array Planar Antenna (-Y Nadir face) */}
      <group
        position={[0, -0.92, 0]}
        rotation={[sarAntennaRotation, 0, 0]}
        onClick={(e) => handleClick(e, 'eos04_sar')}
        onPointerOver={(e) => handlePointerOver(e, 'eos04_sar')}
        onPointerOut={handlePointerOut}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.8, 0.08, 1.4]} />
          {blueprintMode ? (
            <meshStandardMaterial
              wireframe
              color="#00f0ff"
              emissive="#00f0ff"
              emissiveIntensity={0.8}
            />
          ) : (
            <meshStandardMaterial
              map={radarTexture}
              color="#fbbf24"
              metalness={0.7}
              roughness={0.25}
            />
          )}
        </mesh>
        {/* Antenna support truss frame */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[3.6, 0.04, 1.2]} />
          <meshStandardMaterial color="#334155" metalness={0.8} wireframe={blueprintMode} />
        </mesh>
      </group>

      {/* 4. High-Gain X-band Telemetry Parabolic Dish (+Z axis) */}
      <group position={[0, 0.3, 0.65]} rotation={[0.3, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          <meshStandardMaterial
            color={blueprintMode ? '#00f0ff' : '#f8fafc'}
            metalness={0.75}
            roughness={0.25}
            side={THREE.DoubleSide}
            wireframe={blueprintMode}
          />
        </mesh>
        {/* Feedhorn antenna */}
        <mesh position={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.02, 0.04, 0.25, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} wireframe={blueprintMode} />
        </mesh>
      </group>

      {/* 5. Monopropellant Reaction Control System (RCS) Thruster Pods */}
      {[-0.72, 0.72].map((x) =>
        [-0.58, 0.58].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0.82, z]}>
            <mesh>
              <boxGeometry args={[0.08, 0.08, 0.08]} />
              <meshStandardMaterial color="#475569" metalness={0.8} wireframe={blueprintMode} />
            </mesh>
            {/* Thruster micro-pulse flame puff */}
            {isRcsFiring && (
              <mesh position={[x > 0 ? 0.08 : -0.08, 0, 0]} rotation={[0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2]}>
                <coneGeometry args={[0.06, 0.25, 8]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  transparent
                  opacity={0.85}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        ))
      )}
    </group>
  );
}

/**
 * High-Fidelity Mangalyaan (Mars Orbiter Mission — MOM) Spacecraft
 */
export function MOMSpacecraft({
  blueprintMode = false,
  onSelectComponent,
  onHoverComponent,
  inspectData,
}: SpacecraftProps) {
  const mliTextures = useMemo(() => getProceduralGoldMLITextures(), []);
  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);

  const handleClick = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    if (inspectData && inspectData[compId] && onSelectComponent) {
      onSelectComponent(inspectData[compId]);
    }
  };

  const handlePointerOver = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (inspectData && inspectData[compId] && onHoverComponent) {
      onHoverComponent(inspectData[compId]);
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    if (onHoverComponent) onHoverComponent(null);
  };

  return (
    <group>
      {/* 1. Main Cuboid Satellite Bus */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => handleClick(e, 'mom_mcc')}
        onPointerOver={(e) => handlePointerOver(e, 'mom_mcc')}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[1.5, 1.5, 1.6]} />
        {blueprintMode ? (
          <meshStandardMaterial
            wireframe
            color="#00f0ff"
            emissive="#00f0ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        ) : (
          <meshStandardMaterial
            color="#d4a017"
            metalness={0.92}
            roughness={0.28}
            bumpMap={mliTextures.bumpMap}
            bumpScale={0.06}
            roughnessMap={mliTextures.roughnessMap}
          />
        )}
      </mesh>

      {/* 2. 1.4m Parabolic High Gain Antenna (HGA) Dish */}
      <group
        position={[0, 1.15, 0]}
        rotation={[0.45, 0, 0]}
        onClick={(e) => handleClick(e, 'mom_hga')}
        onPointerOver={(e) => handlePointerOver(e, 'mom_hga')}
        onPointerOut={handlePointerOut}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial
            color={blueprintMode ? '#00f0ff' : '#f8fafc'}
            metalness={0.8}
            roughness={0.25}
            side={THREE.DoubleSide}
            wireframe={blueprintMode}
          />
        </mesh>
        <mesh position={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.015, 0.03, 0.35, 8]} />
          <meshStandardMaterial color="#eab308" metalness={0.9} wireframe={blueprintMode} />
        </mesh>
      </group>

      {/* 3. Mars Colour Camera (MCC) & TIS Payloads */}
      <group
        position={[0, -0.4, 0.85]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => handleClick(e, 'mom_mcc')}
        onPointerOver={(e) => handlePointerOver(e, 'mom_mcc')}
        onPointerOut={handlePointerOut}
      >
        {/* MCC Camera Optical Tube */}
        <mesh>
          <cylinderGeometry args={[0.16, 0.2, 0.45, 16]} />
          <meshStandardMaterial
            color={blueprintMode ? '#00f0ff' : '#0f172a'}
            metalness={0.9}
            roughness={0.2}
            wireframe={blueprintMode}
          />
        </mesh>
        {/* Camera Lens Element */}
        <mesh position={[0, 0.23, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 16]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* 4. 440N Liquid Apogee Motor (LAM) Nozzle */}
      <mesh
        position={[0, 0, -0.92]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => handleClick(e, 'mom_lam')}
        onPointerOver={(e) => handlePointerOver(e, 'mom_lam')}
        onPointerOut={handlePointerOut}
      >
        <coneGeometry args={[0.26, 0.48, 16, 1, true]} />
        <meshStandardMaterial
          color={blueprintMode ? '#00f0ff' : '#334155'}
          metalness={0.88}
          roughness={0.3}
          side={THREE.DoubleSide}
          wireframe={blueprintMode}
        />
      </mesh>

      {/* 5. Tri-Panel Solar Array Wing */}
      <group position={[1.5, 0, 0]} castShadow>
        <mesh position={[1.3, 0, 0]}>
          <boxGeometry args={[2.6, 1.2, 0.03]} />
          {blueprintMode ? (
            <meshStandardMaterial wireframe color="#00f0ff" />
          ) : (
            <meshStandardMaterial map={solarTexture} color="#0284c7" metalness={0.4} roughness={0.18} />
          )}
        </mesh>
      </group>
    </group>
  );
}

/**
 * High-Fidelity Aditya-L1 Solar Observatory Spacecraft
 */
export function AdityaL1Spacecraft({
  blueprintMode = false,
  onSelectComponent,
  onHoverComponent,
  inspectData,
}: SpacecraftProps) {
  const mliTextures = useMemo(() => getProceduralGoldMLITextures(), []);
  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);

  const handleClick = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    if (inspectData && inspectData[compId] && onSelectComponent) {
      onSelectComponent(inspectData[compId]);
    }
  };

  const handlePointerOver = (e: { stopPropagation: () => void }, compId: string) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (inspectData && inspectData[compId] && onHoverComponent) {
      onHoverComponent(inspectData[compId]);
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    if (onHoverComponent) onHoverComponent(null);
  };

  return (
    <group>
      {/* 1. Hexagonal Spacecraft Bus */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => handleClick(e, 'aditya_velc')}
        onPointerOver={(e) => handlePointerOver(e, 'aditya_velc')}
        onPointerOut={handlePointerOut}
      >
        <cylinderGeometry args={[0.9, 0.9, 1.6, 6]} />
        {blueprintMode ? (
          <meshStandardMaterial
            wireframe
            color="#00f0ff"
            emissive="#00f0ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        ) : (
          <meshStandardMaterial
            color="#d4a017"
            metalness={0.92}
            roughness={0.28}
            bumpMap={mliTextures.bumpMap}
            bumpScale={0.06}
            roughnessMap={mliTextures.roughnessMap}
          />
        )}
      </mesh>

      {/* 2. VELC Solar Coronagraph Aperture Tube (Facing Sun on +X or Top) */}
      <group
        position={[0, 1.15, 0]}
        onClick={(e) => handleClick(e, 'aditya_velc')}
        onPointerOver={(e) => handlePointerOver(e, 'aditya_velc')}
        onPointerOut={handlePointerOut}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.7, 20]} />
          <meshStandardMaterial
            color={blueprintMode ? '#00f0ff' : '#0f172a'}
            metalness={0.85}
            roughness={0.25}
            wireframe={blueprintMode}
          />
        </mesh>
        {/* Optical internal baffle ring */}
        <mesh position={[0, 0.36, 0]}>
          <ringGeometry args={[0.1, 0.28, 20]} />
          <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 3. SUIT Solar Ultraviolet Imaging Telescope Tube */}
      <group
        position={[0.45, 0.95, 0.3]}
        onClick={(e) => handleClick(e, 'aditya_suit')}
        onPointerOver={(e) => handlePointerOver(e, 'aditya_suit')}
        onPointerOut={handlePointerOut}
      >
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.55, 16]} />
          <meshStandardMaterial
            color={blueprintMode ? '#00f0ff' : '#38bdf8'}
            metalness={0.7}
            roughness={0.3}
            wireframe={blueprintMode}
          />
        </mesh>
      </group>

      {/* 4. ASPEX & PAPA Solar Wind Particle Analyzers */}
      <group
        position={[-0.65, 0, 0.45]}
        onClick={(e) => handleClick(e, 'aditya_aspex')}
        onPointerOver={(e) => handlePointerOver(e, 'aditya_aspex')}
        onPointerOut={handlePointerOut}
      >
        <mesh>
          <boxGeometry args={[0.25, 0.35, 0.25]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} wireframe={blueprintMode} />
        </mesh>
      </group>

      {/* 5. Dual Articulated Solar Array Wings */}
      <group position={[0.9, 0, 0]}>
        <mesh position={[1.4, 0, 0]} castShadow>
          <boxGeometry args={[2.8, 1.1, 0.03]} />
          {blueprintMode ? (
            <meshStandardMaterial wireframe color="#00f0ff" />
          ) : (
            <meshStandardMaterial map={solarTexture} color="#0284c7" metalness={0.4} roughness={0.18} />
          )}
        </mesh>
      </group>
    </group>
  );
}
