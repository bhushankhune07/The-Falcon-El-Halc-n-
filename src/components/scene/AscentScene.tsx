import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimFrameState, CameraMode } from './types';
import { ProceduralPSLV } from './ProceduralPSLV';
import { ExhaustPlume } from './ExhaustPlume';
import { SriharikotaGround } from './SriharikotaGround';
import { AtmosphereSky } from './AtmosphereSky';

interface Props {
  simFrame: SimFrameState;
  cameraMode: CameraMode;
}

export function AscentScene({ simFrame, cameraMode }: Props) {
  const rocketGroupRef = useRef<THREE.Group>(null);

  // Update rocket pitch tilt smoothly in floating origin
  useFrame((state, delta) => {
    if (rocketGroupRef.current) {
      // 90° = vertical, 0° = horizontal
      const pitchRad = (simFrame.pitch_deg * Math.PI) / 180.0;
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
    if (cameraMode === 'pad') {
      // Pad tracking camera: looks up from ground at rocket
      const cam = state.camera;
      // Rocket height in camera space is at altitude_m, but in floating origin rocket is at (0, 20, 0)
      // and ground is at (0, -altitude_m, 0).
      // So if camera is placed relative to ground:
      const groundY = -simFrame.altitude_m;
      cam.position.set(-45, groundY + 12, 65);
      cam.lookAt(0, 20, 0);
    } else if (cameraMode === 'chase') {
      // Rocket chase camera: smooth follow behind and below
      const cam = state.camera;
      const targetCamPos = new THREE.Vector3(-18, 16, 36);
      cam.position.lerp(targetCamPos, delta * 3.0);
      cam.lookAt(0, 22, 0);
    }
  });

  return (
    <group>
      {/* Dynamic Sky Dome & Stars */}
      <AtmosphereSky altitude_m={simFrame.altitude_m} />

      {/* Receding Ground & Sriharikota Launch Pad */}
      <SriharikotaGround
        altitude_m={simFrame.altitude_m}
        downrange_m={simFrame.downrange_m}
        time_s={simFrame.time_s}
      />

      {/* Floating-Origin Rocket Group (Centers near origin) */}
      <group ref={rocketGroupRef} position={[0, 0, 0]}>
        <ProceduralPSLV simFrame={simFrame} />
        <ExhaustPlume simFrame={simFrame} />
      </group>
    </group>
  );
}
