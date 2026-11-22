import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState, CameraMode } from './types';
import { ProceduralPSLV } from './ProceduralPSLV';
import { ExhaustPlume } from './ExhaustPlume';
import { SriharikotaGround } from './SriharikotaGround';
import { AtmosphereSky } from './AtmosphereSky';
import { MissionConfig } from '../../sim';
import { InspectableComponent } from './inspectData';

interface Props {
  simFrame: SimFrameState;
  cameraMode: CameraMode;
  mission?: MissionConfig;
  onSelectComponent?: (comp: InspectableComponent) => void;
  onHoverComponent?: (comp: InspectableComponent | null) => void;
}

export function AscentScene({ simFrame, cameraMode, mission, onSelectComponent, onHoverComponent }: Props) {
  const rocketGroupRef = useRef<THREE.Group>(null);
  const targetCamPosRef = useRef(new THREE.Vector3(-18, 22, 38));
  const autoCamPosRef = useRef(new THREE.Vector3(-48, 18, 72));
  const autoLookAtRef = useRef(new THREE.Vector3(0, 32, 0));

  // Surface-relative downrange calculation (removes initial Earth-rotation drift boost)
  // v0_earth is computed dynamically from the active mission's launch site coordinates and azimuth
  const OMEGA_EARTH = 7.2921159e-5;
  const R_EARTH = 6.378137e6;
  const azimuth_deg = mission?.launchSite?.azimuth_deg ?? 140.0;
  const lat_deg = mission?.launchSite?.latitude_deg ?? 13.7199;
  const v0_earth =
    OMEGA_EARTH *
    R_EARTH *
    Math.cos((lat_deg * Math.PI) / 180.0) *
    Math.sin((azimuth_deg * Math.PI) / 180.0);
  const surfaceDownrange_m = Math.max(0, simFrame.downrange_m - v0_earth * simFrame.time_s);

  // Update rocket pitch tilt smoothly in floating origin
  useFrame((state, delta) => {
    if (state.camera.far !== 400000) {
      state.camera.far = 400000;
      state.camera.updateProjectionMatrix();
    }

    if (rocketGroupRef.current) {
      // Smooth cubic blend factor: t = clamp((altitude_m - 80) / 420, 0, 1); blend = t * t * (3 - 2 * t)
      // Clamps dead-vertical (90°) while clearing the 54m umbilical tower, then pitches over smoothly
      const tBlend = Math.min(1.0, Math.max(0.0, (simFrame.altitude_m - 80.0) / 420.0));
      const blend = tBlend * tBlend * (3.0 - 2.0 * tBlend);
      const visualPitch_deg = THREE.MathUtils.lerp(90.0, simFrame.pitch_deg, blend);
      const pitchRad = (visualPitch_deg * Math.PI) / 180.0;
      // Tilt around Z axis: vertical (pitch 90) -> 0 tilt; horizontal (pitch 0) -> -PI/2 tilt
      const targetTiltZ = -(Math.PI / 2.0 - pitchRad);
      rocketGroupRef.current.rotation.z = THREE.MathUtils.damp(
        rocketGroupRef.current.rotation.z,
        targetTiltZ,
        4.0,
        delta
      );
    }

    // Dynamic Camera management in floating origin
    const isAuto = cameraMode === 'auto' || cameraMode === 'pad';
    if (isAuto) {
      // Broadcast Auto-Cam: Starts at hero low-angle shot framing the rocket, red umbilical tower,
      // and Bay of Bengal shoreline (-48, groundY + 18, 72).
      // Smoothly tracks upward as the rocket clears the tower, then seamlessly glides into
      // a cinematic over-the-shoulder chase framing above 1.2 km (1200m).
      const cam = state.camera;
      const groundY = -simFrame.altitude_m;

      if (simFrame.altitude_m < 1200) {
        const climbRatio = Math.min(1.0, simFrame.altitude_m / 1200.0);
        const smoothRatio = climbRatio * climbRatio * (3.0 - 2.0 * climbRatio);
        
        // Interpolate camera position from pad tracking to high-ascent chase
        const padX = -48;
        const padY = groundY + 18;
        const padZ = 72;

        const chaseX = -18;
        const chaseY = 22;
        const chaseZ = 38;

        autoCamPosRef.current.set(
          THREE.MathUtils.lerp(padX, chaseX, smoothRatio),
          THREE.MathUtils.lerp(padY, chaseY, smoothRatio),
          THREE.MathUtils.lerp(padZ, chaseZ, smoothRatio)
        );

        // Smooth upward pan on rocket target
        const lookY = THREE.MathUtils.lerp(32, 20, smoothRatio);
        autoLookAtRef.current.set(0, lookY, 0);

        cam.position.copy(autoCamPosRef.current);
        cam.lookAt(autoLookAtRef.current);
      } else {
        // High ascent: Steady over-the-shoulder chase view
        targetCamPosRef.current.set(-18, 22, 38);
        cam.position.lerp(targetCamPosRef.current, delta * 3.0);
        cam.lookAt(0, 18, 0);
      }
    } else if (cameraMode === 'chase') {
      // Rocket chase camera: dynamic over-the-shoulder tracking looking down the fuselage toward Sriharikota
      const cam = state.camera;
      targetCamPosRef.current.set(-18, 22, 38);
      cam.position.lerp(targetCamPosRef.current, delta * 3.0);
      cam.lookAt(0, 18, 0);
    }

    // Physically motivated camera micro-shake (liftoff acoustic vibration & Max-Q buffeting)
    // Zero shake when paused (delta === 0)
    if (delta > 0.0001 && (isAuto || cameraMode === 'chase')) {
      const t = simFrame.time_s;
      let shakeIntensity = 0;

      // Liftoff vibration (T+0.1s to T+12s, tapering smoothly as rocket clears umbilical tower)
      if (t > 0.1 && t <= 12 && simFrame.altitude_m < 600) {
        const liftoffTaper = Math.max(0, 1.0 - (t - 0.1) / 12.0);
        shakeIntensity += liftoffTaper * (isAuto ? 0.35 : 0.18);
      }

      // Max-Q aerodynamic buffeting (dynamicPressure_kPa > 50)
      if (simFrame.dynamicPressure_kPa > 50) {
        const qRatio = Math.min(1.0, (simFrame.dynamicPressure_kPa - 50) / 40.0);
        shakeIntensity += qRatio * 0.06;
      }

      if (shakeIntensity > 0.001) {
        const jx = (Math.sin(t * 67.0) * 0.65 + Math.cos(t * 103.0) * 0.35) * shakeIntensity;
        const jy = (Math.cos(t * 79.0) * 0.65 + Math.sin(t * 119.0) * 0.35) * shakeIntensity * 0.7;
        state.camera.position.x += jx;
        state.camera.position.y += jy;
      }
    }
  });

  return (
    <group>
      {/* Dynamic Sky Dome & Stars */}
      <AtmosphereSky altitude_m={simFrame.altitude_m} />

      {/* Receding Ground & Sriharikota Launch Pad (Surface-relative downrange) */}
      <SriharikotaGround
        altitude_m={simFrame.altitude_m}
        downrange_m={surfaceDownrange_m}
        time_s={simFrame.time_s}
      />

      {/* 2. Procedural PSLV-XL Staged Vehicle */}
      <group ref={rocketGroupRef} position={[0, 20, 0]}>
        <ProceduralPSLV
          simFrame={simFrame}
          mission={mission}
          onSelectComponent={onSelectComponent}
          onHoverComponent={onHoverComponent}
        />
        <ExhaustPlume simFrame={simFrame} stages={mission?.stages} />
      </group>

      {/* Atmospheric lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 50]} intensity={1.8} castShadow />
      <directionalLight position={[-30, 20, -30]} intensity={0.5} />
    </group>
  );
}
