import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState } from './types';
import { MissionConfig } from '../../sim';
import {
  getProceduralRocketDecal,
  getProceduralSolarPanelTexture,
  getProceduralRadarTexture,
} from './textures/proceduralTextures';

interface Props {
  simFrame: SimFrameState;
  mission?: MissionConfig;
  showInternalPayload?: boolean;
}

export function ProceduralPSLV({ simFrame, mission }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const fairingLeftRef = useRef<THREE.Group>(null);
  const fairingRightRef = useRef<THREE.Group>(null);
  const solarLeftRef = useRef<THREE.Group>(null);
  const solarRightRef = useRef<THREE.Group>(null);
  const sarAntennaRef = useRef<THREE.Group>(null);

  const decalTexture = useMemo(() => getProceduralRocketDecal(), []);
  const solarTexture = useMemo(() => getProceduralSolarPanelTexture(), []);
  const radarTexture = useMemo(() => getProceduralRadarTexture(), []);

  // Geometry dimensions (1 unit = 1 meter approx, scaled for 3D visibility)
  // Total stack height: ~44 meters
  const coreRadius = 1.4; // 2.8m diameter
  const ps1Height = 20.0;
  const ps2Height = 12.0;
  const ps3Height = 4.0;
  const ps4Height = 3.0;
  const fairingHeight = 8.5;
  const straponRadius = 0.5;
  const straponHeight = 12.0;

  // Staging elapsed times derived from mission stages
  const t = simFrame.time_s;
  const stages = mission?.stages ?? [];
  const ground = stages.find((s) => s.type === 'strap_on_ground');
  const air = stages.find((s) => s.type === 'strap_on_air');
  const ps1 = stages.find((s) => s.type === 'ps1_core');
  const ps2 = stages.find((s) => s.type === 'ps2');
  const ps3 = stages.find((s) => s.type === 'ps3');
  const fairing = mission?.fairing;

  const groundSep = ground?.separationTime_s ?? 69.9;
  const airSep = air?.separationTime_s ?? 92.0;
  const ps1Sep = ps1?.separationTime_s ?? 109.8;
  const fairingTime = fairing?.jettisonTime_s ?? 176.6;
  const ps2Sep = ps2?.separationTime_s ?? 263.2;
  const ps3Sep = ps3?.separationTime_s ?? 580.0;

  const dtGround = Math.max(0, t - groundSep);
  const dtAir = Math.max(0, t - airSep);
  const dtPS1 = Math.max(0, t - ps1Sep);
  const dtFairing = simFrame.fairingSeparated ? Math.max(0, t - fairingTime) : 0;
  const dtPS2 = Math.max(0, t - ps2Sep);
  const dtPS3 = Math.max(0, t - ps3Sep);

  // Transonic vapor cone (Prandtl-Glauert singularity) around fairing shoulder
  const soundSpeed = simFrame.altitude_m < 11000 ? 340 - (simFrame.altitude_m / 11000) * 45 : 295;
  const approxMach = simFrame.speed_ms / soundSpeed;
  const vaporConeOpacity =
    !simFrame.fairingSeparated && approxMach >= 0.90 && approxMach <= 1.15 && simFrame.altitude_m < 20000
      ? Math.max(0, 1.0 - Math.abs(approxMach - 1.02) / 0.13) * 0.72
      : 0;

  // Smooth deployment of satellite solar panels and SAR antenna gated on ps4Cutoff
  useFrame((_, delta) => {
    if (simFrame.fairingSeparated) {
      // Split fairing halves
      const sepDist = Math.min(25, dtFairing * 3.5);
      const tumble = Math.min(Math.PI * 0.4, dtFairing * 0.3);

      if (fairingLeftRef.current) {
        fairingLeftRef.current.position.x = -coreRadius - sepDist;
        fairingLeftRef.current.position.y = ps1Height + ps2Height + ps3Height + ps4Height - dtFairing * 2.0;
        fairingLeftRef.current.rotation.z = tumble;
      }
      if (fairingRightRef.current) {
        fairingRightRef.current.position.x = coreRadius + sepDist;
        fairingRightRef.current.position.y = ps1Height + ps2Height + ps3Height + ps4Height - dtFairing * 2.0;
        fairingRightRef.current.rotation.z = -tumble;
      }
    }

    // Solar panels unfolding gated on ps4Cutoff
    if (solarLeftRef.current && solarRightRef.current) {
      const targetScaleX = simFrame.ps4Cutoff ? 1.0 : 0.05;
      solarLeftRef.current.scale.x = THREE.MathUtils.damp(solarLeftRef.current.scale.x, targetScaleX, 3.0, delta);
      solarRightRef.current.scale.x = THREE.MathUtils.damp(solarRightRef.current.scale.x, targetScaleX, 3.0, delta);
    }

    // SAR antenna deployment tilt gated on ps4Cutoff
    if (sarAntennaRef.current) {
      const targetRotX = simFrame.ps4Cutoff ? Math.PI * 0.25 : 0;
      sarAntennaRef.current.rotation.x = THREE.MathUtils.damp(sarAntennaRef.current.rotation.x, targetRotX, 2.5, delta);
    }
  });

  // Calculate 6 strap-ons angular positions around PS1 core:
  // 4 Ground-lit (0°, 90°, 180°, 270°)
  // 2 Air-lit (45°, 225°)
  const straponConfigs = useMemo(() => [
    { id: 'g0', type: 'ground', angle: 0 },
    { id: 'g1', type: 'ground', angle: Math.PI * 0.5 },
    { id: 'g2', type: 'ground', angle: Math.PI },
    { id: 'g3', type: 'ground', angle: Math.PI * 1.5 },
    { id: 'a0', type: 'air', angle: Math.PI * 0.25 },
    { id: 'a1', type: 'air', angle: Math.PI * 1.25 },
  ], []);

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* ======================================================== */}
      {/* STAGE 1: PS1 Solid Core (S139) with ISRO Tricolour & Band */}
      {/* ======================================================== */}
      {!simFrame.ps1Detached || dtPS1 < 30 ? (
        <group
          position={[
            0,
            simFrame.ps1Detached ? ps1Height / 2 - dtPS1 * 8.0 - 0.5 * 9.8 * dtPS1 * dtPS1 * 0.05 : ps1Height / 2,
            0,
          ]}
          rotation={[
            simFrame.ps1Detached ? dtPS1 * 0.08 : 0,
            0,
            simFrame.ps1Detached ? dtPS1 * 0.04 : 0,
          ]}
        >
          {/* Main White Body Cylinder */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[coreRadius, coreRadius, ps1Height, 32]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
          </mesh>

          {/* ISRO Tricolour Decal Ring */}
          <mesh position={[0, ps1Height * 0.15, 0]}>
            <cylinderGeometry args={[coreRadius + 0.015, coreRadius + 0.015, 4.0, 32]} />
            <meshStandardMaterial map={decalTexture} transparent roughness={0.4} />
          </mesh>

          {/* Base Red-Orange Transition Ring */}
          <mesh position={[0, -ps1Height / 2 + 1.2, 0]}>
            <cylinderGeometry args={[coreRadius + 0.02, coreRadius + 0.02, 2.4, 32]} />
            <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.2} />
          </mesh>

          {/* PS1 Core Engine Nozzle Bell */}
          <mesh position={[0, -ps1Height / 2 - 1.2, 0]}>
            <coneGeometry args={[1.1, 2.4, 32, 1, true]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* 6x S12 STRAP-ON BOOSTERS (4 Ground-lit + 2 Air-lit) */}
      {/* ======================================================== */}
      {straponConfigs.map((cfg) => {
        const isGround = cfg.type === 'ground';
        const isDetached = isGround ? simFrame.groundStraponsDetached : simFrame.airStraponsDetached;
        const dtSep = isGround ? dtGround : dtAir;

        if (isDetached && dtSep > 25) return null; // Fully fallen out of view

        // Radial vector from core center
        const dirX = Math.cos(cfg.angle);
        const dirZ = Math.sin(cfg.angle);
        const baseRadius = coreRadius + straponRadius + 0.15;

        // Separation displacement: Radial push outward + downward gravity drag + backward tilt
        const radialPush = isDetached ? Math.min(40, dtSep * 6.0) : 0;
        const dropY = isDetached ? -dtSep * 7.0 - 0.5 * 9.8 * dtSep * dtSep * 0.1 : 0;
        const posX = (baseRadius + radialPush) * dirX;
        const posZ = (baseRadius + radialPush) * dirZ;
        const posY = straponHeight / 2 + 0.5 + dropY;

        // Tumble rotation
        const rotPitch = isDetached ? Math.min(1.2, dtSep * 0.4) : 0;

        return (
          <group
            key={cfg.id}
            position={[posX, posY, posZ]}
            rotation={[rotPitch * dirZ, -cfg.angle, rotPitch * dirX]}
          >
            {/* Cylindrical Booster Body */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[straponRadius, straponRadius, straponHeight, 20]} />
              <meshStandardMaterial
                color={isGround ? '#ffffff' : '#f1f5f9'}
                roughness={0.35}
                metalness={0.15}
              />
            </mesh>

            {/* Aerodynamic Nosecone */}
            <mesh position={[0, straponHeight / 2 + 1.2, 0]} castShadow>
              <coneGeometry args={[straponRadius, 2.4, 20]} />
              <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.2} />
            </mesh>

            {/* Canted Nozzle */}
            <mesh position={[0, -straponHeight / 2 - 0.7, 0]} rotation={[0.15 * dirX, 0, 0.15 * dirZ]}>
              <coneGeometry args={[0.42, 1.4, 20, 1, true]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Structural Attachment Struts */}
            {!isDetached ? (
              <mesh position={[-dirX * 0.35, 2.0, -dirZ * 0.35]}>
                <boxGeometry args={[0.3, 0.2, 0.3]} />
                <meshStandardMaterial color="#475569" metalness={0.6} />
              </mesh>
            ) : null}
          </group>
        );
      })}

      {/* ======================================================== */}
      {/* INTERSTAGE 1/2 TRUSS */}
      {/* ======================================================== */}
      {!simFrame.ps1Detached ? (
        <mesh position={[0, ps1Height + 0.6, 0]}>
          <cylinderGeometry args={[coreRadius - 0.05, coreRadius, 1.2, 24, 2, true]} />
          <meshStandardMaterial color="#334155" wireframe metalness={0.7} roughness={0.4} />
        </mesh>
      ) : null}

      {/* ======================================================== */}
      {/* STAGE 2: PS2 VIKAS LIQUID ENGINE STAGE */}
      {/* ======================================================== */}
      {!simFrame.ps2Detached || dtPS2 < 30 ? (
        <group
          position={[
            0,
            simFrame.ps2Detached
              ? ps1Height + 1.2 + ps2Height / 2 - dtPS2 * 8.0 - 0.5 * 9.8 * dtPS2 * dtPS2 * 0.05
              : ps1Height + 1.2 + ps2Height / 2,
            0,
          ]}
          rotation={[simFrame.ps2Detached ? dtPS2 * 0.05 : 0, 0, 0]}
        >
          {/* Liquid Propellant Tank (UH25 + N2O4) */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[coreRadius, coreRadius, ps2Height, 32]} />
            <meshStandardMaterial color="#b45309" roughness={0.45} metalness={0.5} />
          </mesh>

          {/* Vikas Gimbal Engine Nozzle */}
          <mesh position={[0, -ps2Height / 2 - 1.1, 0]}>
            <coneGeometry args={[0.95, 2.2, 32, 1, true]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* STAGE 3: PS3 SOLID MOTOR (HPS3) */}
      {/* ======================================================== */}
      {!simFrame.ps3Detached || dtPS3 < 30 ? (
        <group
          position={[
            0,
            simFrame.ps3Detached
              ? ps1Height + ps2Height + 1.5 + ps3Height / 2 - dtPS3 * 7.0
              : ps1Height + ps2Height + 1.5 + ps3Height / 2,
            0,
          ]}
        >
          {/* Carbon/Kevlar Filament Wound Case */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1.0, 1.0, ps3Height, 28]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} metalness={0.2} />
          </mesh>
          {/* Submerged Flex Nozzle */}
          <mesh position={[0, -ps3Height / 2 - 0.6, 0]}>
            <coneGeometry args={[0.65, 1.2, 28, 1, true]} />
            <meshStandardMaterial color="#475569" metalness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* STAGE 4: PS4 TWIN LIQUID ENGINES (MMH + MON3) */}
      {/* ======================================================== */}
      <group position={[0, ps1Height + ps2Height + ps3Height + 1.8 + ps4Height / 2, 0]}>
        {/* Upper Stage Equipment Bay & Tanks */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[coreRadius * 0.75, coreRadius * 0.75, ps4Height, 28]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.4} />
        </mesh>

        {/* Spherical Titanium Fuel Tanks */}
        <mesh position={[0.5, 0, 0]}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[-0.5, 0, 0]}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Twin Gimbal Engines */}
        <mesh position={[0.35, -ps4Height / 2 - 0.45, 0]}>
          <coneGeometry args={[0.25, 0.9, 16, 1, true]} />
          <meshStandardMaterial color="#334155" metalness={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.35, -ps4Height / 2 - 0.45, 0]}>
          <coneGeometry args={[0.25, 0.9, 16, 1, true]} />
          <meshStandardMaterial color="#334155" metalness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* EOS-04 SPACECRAFT (RADAR IMAGING SATELLITE RISAT-1A) */}
      {/* ======================================================== */}
      <group position={[0, ps1Height + ps2Height + ps3Height + ps4Height + 3.2, 0]}>
        {/* Satellite Bus Structure (Gold MLI blanket) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.6, 2.2, 1.6]} />
          <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Deployable Solar Panel Array (Left Wing) */}
        <group ref={solarLeftRef} position={[-0.8, 0.2, 0]}>
          <mesh position={[-1.8, 0, 0]}>
            <boxGeometry args={[3.4, 1.4, 0.05]} />
            <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>

        {/* Deployable Solar Panel Array (Right Wing) */}
        <group ref={solarRightRef} position={[0.8, 0.2, 0]}>
          <mesh position={[1.8, 0, 0]}>
            <boxGeometry args={[3.4, 1.4, 0.05]} />
            <meshStandardMaterial map={solarTexture} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>

        {/* C-band Synthetic Aperture Radar (SAR) Planar Antenna */}
        <group ref={sarAntennaRef} position={[0, -0.6, 0.85]}>
          <mesh castShadow>
            <boxGeometry args={[3.2, 1.8, 0.08]} />
            <meshStandardMaterial map={radarTexture} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* ======================================================== */}
      {/* PRANDTL-GLAUERT TRANSONIC CONDENSATION VAPOR CONE        */}
      {/* Dynamic collar visible during transonic buffeting        */}
      {/* ======================================================== */}
      {vaporConeOpacity > 0.01 ? (
        <group position={[0, ps1Height + ps2Height + ps3Height + ps4Height + 1.8 + fairingHeight * 0.65, 0]}>
          <mesh>
            <coneGeometry args={[coreRadius * 1.55, 2.2, 32, 1, true]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={vaporConeOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, -0.6, 0]}>
            <cylinderGeometry args={[coreRadius * 1.45, coreRadius * 1.1, 1.2, 32, 1, true]} />
            <meshBasicMaterial
              color="#e0f2fe"
              transparent
              opacity={vaporConeOpacity * 0.65}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* 2-HALF CLAMSHELL PAYLOAD FAIRING (HEAT SHIELD) */}
      {/* ======================================================== */}
      {/* Left Fairing Half */}
      {(!simFrame.fairingSeparated || dtFairing < 20) ? (
        <group
          ref={fairingLeftRef}
          position={[0, ps1Height + ps2Height + ps3Height + ps4Height + 1.8, 0]}
        >
          {/* Outer Shell Cylinder Half */}
          <mesh position={[0, fairingHeight * 0.35, 0]}>
            <cylinderGeometry
              args={[coreRadius + 0.1, coreRadius + 0.1, fairingHeight * 0.7, 32, 1, false, 0, Math.PI]}
            />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
          </mesh>
          {/* Inner Acoustic Soundproofing Foam Layer */}
          <mesh position={[0, fairingHeight * 0.35, 0]}>
            <cylinderGeometry
              args={[coreRadius + 0.07, coreRadius + 0.07, fairingHeight * 0.68, 32, 1, false, 0.04, Math.PI - 0.08]}
            />
            <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>

          {/* Outer Shell Conical Ogive Nosecone Half */}
          <mesh position={[0, fairingHeight * 0.7 + fairingHeight * 0.15, 0]}>
            <coneGeometry
              args={[coreRadius + 0.1, fairingHeight * 0.3, 32, 1, false, 0, Math.PI]}
            />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
          </mesh>
          {/* Inner Nosecone Acoustic Layer */}
          <mesh position={[0, fairingHeight * 0.7 + fairingHeight * 0.15, 0]}>
            <coneGeometry
              args={[coreRadius + 0.07, fairingHeight * 0.28, 32, 1, false, 0.04, Math.PI - 0.08]}
            />
            <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}

      {/* Right Fairing Half */}
      {(!simFrame.fairingSeparated || dtFairing < 20) ? (
        <group
          ref={fairingRightRef}
          position={[0, ps1Height + ps2Height + ps3Height + ps4Height + 1.8, 0]}
        >
          {/* Outer Shell Cylinder Half */}
          <mesh position={[0, fairingHeight * 0.35, 0]}>
            <cylinderGeometry
              args={[coreRadius + 0.1, coreRadius + 0.1, fairingHeight * 0.7, 32, 1, false, Math.PI, Math.PI]}
            />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
          </mesh>
          {/* Inner Acoustic Soundproofing Foam Layer */}
          <mesh position={[0, fairingHeight * 0.35, 0]}>
            <cylinderGeometry
              args={[coreRadius + 0.07, coreRadius + 0.07, fairingHeight * 0.68, 32, 1, false, Math.PI + 0.04, Math.PI - 0.08]}
            />
            <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>

          {/* Outer Shell Conical Ogive Nosecone Half */}
          <mesh position={[0, fairingHeight * 0.7 + fairingHeight * 0.15, 0]}>
            <coneGeometry
              args={[coreRadius + 0.1, fairingHeight * 0.3, 32, 1, false, Math.PI, Math.PI]}
            />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
          </mesh>
          {/* Inner Nosecone Acoustic Layer */}
          <mesh position={[0, fairingHeight * 0.7 + fairingHeight * 0.15, 0]}>
            <coneGeometry
              args={[coreRadius + 0.07, fairingHeight * 0.28, 32, 1, false, Math.PI + 0.04, Math.PI - 0.08]}
            />
            <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
