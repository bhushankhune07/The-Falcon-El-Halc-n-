import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ScaledEarth } from './ScaledEarth';
import {
  getProceduralMarsPBRTextures,
  createSunShaderMaterial,
  createSunCoronaShaderMaterial,
} from './textures/proceduralTextures';
import { INSPECTABLE_COMPONENTS, InspectableComponent } from './inspectData';
import { MOMSpacecraft, AdityaL1Spacecraft } from './ProceduralSpacecraft';

interface Props {
  missionId: string; // 'pslv-c25-mom' | 'pslv-c57-aditya-l1'
  phaseProgress: number; // 0.0 to 1.0 (Phase 1 -> Phase 2 -> Phase 3)
  onSelectComponent?: (comp: InspectableComponent) => void;
  onHoverComponent?: (comp: InspectableComponent | null) => void;
}

export function DeepSpaceScene({
  missionId,
  phaseProgress,
  onSelectComponent,
  onHoverComponent,
}: Props) {
  const marsRef = useRef<THREE.Mesh>(null);
  const marsGroupRef = useRef<THREE.Group>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const probeGroupRef = useRef<THREE.Group>(null);
  const l1ReticuleRef = useRef<THREE.Group>(null);

  const marsTextures = useMemo(() => getProceduralMarsPBRTextures(), []);
  const sunMaterial = useMemo(() => createSunShaderMaterial(), []);
  const sunCoronaMaterial = useMemo(() => createSunCoronaShaderMaterial(), []);

  const isMOM = missionId === 'pslv-c25-mom';
  const isAditya = missionId === 'pslv-c57-aditya-l1';

  // Earth center in Deep Space scene
  const earthCenter = useMemo(() => new THREE.Vector3(-20, 0, 40), []);
  const sunCenter = useMemo(() => new THREE.Vector3(260, 0, 0), []);
  const marsRendezvous = useMemo(() => new THREE.Vector3(210, 0, -110), []);
  const l1Point = useMemo(() => new THREE.Vector3(135, 0, 15), []);

  // Dynamic animation loop
  useFrame((_, delta) => {
    // 1. Sun plasma shader & corona animation
    if (sunMaterial.uniforms?.uTime) {
      sunMaterial.uniforms.uTime.value += delta;
    }
    if (sunCoronaMaterial.uniforms?.uTime) {
      sunCoronaMaterial.uniforms.uTime.value += delta;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.z += delta * 0.018;
      coronaRef.current.rotation.y += delta * 0.008;
    }

    // 2. Mars rotation & orbital movement along heliocentric arc
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.012;
    }
    if (marsGroupRef.current) {
      // Mars travels along heliocentric arc and meets probe at phaseProgress >= 0.80
      const currentMarsAngle = -0.48 - Math.max(0, 0.80 - phaseProgress) * 0.45;
      const currentMarsX = Math.cos(currentMarsAngle) * 236;
      const currentMarsZ = Math.sin(currentMarsAngle) * 236;
      marsGroupRef.current.position.set(currentMarsX, 0, currentMarsZ);
    }

    // 3. L1 Reticule pulse & rotation
    if (l1ReticuleRef.current) {
      l1ReticuleRef.current.rotation.z += delta * 0.4;
    }

    // 4. Spacecraft position and attitude tracking (Mathematically C0-continuous)
    if (probeGroupRef.current) {
      if (isMOM) {
        if (phaseProgress < 0.30) {
          // ==========================================
          // PHASE 1: Earth-bound Apogee Raising Phasing Loops (0% - 30%)
          // 5 Expanding Phasing Loops with 440N LAM perigee burns
          // ==========================================
          const u = phaseProgress / 0.30; // 0 to 1
          const loopCount = 5;
          const currentLoop = u * loopCount;
          const loopFraction = currentLoop % 1.0;
          const loopIndex = Math.min(4, Math.floor(currentLoop));

          const a = 42 + loopIndex * 10.0; // 42 -> 82
          const e = 0.15 + loopIndex * 0.12; // 0.15 -> 0.63
          const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));

          const theta = loopFraction * Math.PI * 2;
          const posX = earthCenter.x + (a * Math.cos(theta) - a * e);
          const posY = earthCenter.y + Math.sin(theta) * (4 + loopIndex * 1.8);
          const posZ = earthCenter.z + b * Math.sin(theta);
          probeGroupRef.current.position.set(posX, posY, posZ);

          const nextTheta = (loopFraction + 0.015) * Math.PI * 2;
          const nextX = earthCenter.x + (a * Math.cos(nextTheta) - a * e);
          const nextY = earthCenter.y + Math.sin(nextTheta) * (4 + loopIndex * 1.8);
          const nextZ = earthCenter.z + b * Math.sin(nextTheta);
          probeGroupRef.current.lookAt(nextX, nextY, nextZ);
        } else if (phaseProgress < 0.40) {
          // ==========================================
          // PHASE 2: Trans-Mars Injection (TMI) Departure Burn (30% - 40%)
          // Hyperbolic escape burn injecting probe into interplanetary space
          // ==========================================
          const tau = (phaseProgress - 0.30) / 0.10; // 0 to 1
          const startX = earthCenter.x + 30.34;
          const startY = 0;
          const startZ = earthCenter.z;
          const endX = earthCenter.x + 65.0;
          const endY = Math.sin(0.12 * Math.PI) * 48;
          const endZ = earthCenter.z - Math.sin(0.12 * Math.PI) * 32;

          const posX = startX + tau * (endX - startX);
          const posY = startY + tau * (endY - startY) + Math.sin(tau * Math.PI) * 4.5;
          const posZ = startZ + tau * (endZ - startZ);
          probeGroupRef.current.position.set(posX, posY, posZ);

          const tauNext = Math.min(1.0, tau + 0.02);
          const nextX = startX + tauNext * (endX - startX);
          const nextY = startY + tauNext * (endY - startY) + Math.sin(tauNext * Math.PI) * 4.5;
          const nextZ = startZ + tauNext * (endZ - startZ);
          probeGroupRef.current.lookAt(nextX, nextY, nextZ);
        } else if (phaseProgress < 0.72) {
          // ==========================================
          // PHASE 3: Heliocentric Hohmann Transfer Cruise & TCM (40% - 72%)
          // ==========================================
          const w = (phaseProgress - 0.40) / 0.32; // 0 to 1
          const startX = earthCenter.x + 65.0;
          const startZ = earthCenter.z;
          const endX = marsRendezvous.x + 45;
          const endZ = marsRendezvous.z;

          const progressFrac = 0.12 + w * 0.88;
          const posX = startX + w * (endX - startX);
          const posY = Math.sin(progressFrac * Math.PI) * 48;
          const posZ = startZ + w * (endZ - startZ) - Math.sin(progressFrac * Math.PI) * 32;
          probeGroupRef.current.position.set(posX, posY, posZ);

          const wNext = Math.min(1.0, w + 0.015);
          const nextFrac = 0.12 + wNext * 0.88;
          const nextX = startX + wNext * (endX - startX);
          const nextY = Math.sin(nextFrac * Math.PI) * 48;
          const nextZ = startZ + wNext * (endZ - startZ) - Math.sin(nextFrac * Math.PI) * 32;
          probeGroupRef.current.lookAt(nextX, nextY, nextZ);
        } else if (phaseProgress < 0.84) {
          // ==========================================
          // PHASE 4: Mars Orbit Insertion (MOI) Retro-Burn (72% - 84%)
          // Spacecraft flips 180° retrograde to fire 440N LAM (-1,099 m/s)
          // ==========================================
          const v = (phaseProgress - 0.72) / 0.12; // 0 to 1
          const curMars = marsGroupRef.current ? marsGroupRef.current.position : marsRendezvous;
          const a = 71.0;
          const c = 21.0;
          const b = 67.82;
          const tilt = 0.52;
          const theta = v * Math.PI * 0.75;

          const orbX = a * Math.cos(theta) - c + (1.0 - v) * 24.0;
          const orbZ = b * Math.sin(theta) + (1.0 - v) * 14.0;
          const rotY = orbZ * Math.sin(tilt);
          const rotZ = orbZ * Math.cos(tilt);

          probeGroupRef.current.position.set(
            curMars.x + orbX,
            curMars.y + rotY,
            curMars.z + rotZ
          );

          // Retrograde attitude flip: point LAM engine backward along velocity vector
          const vNext = Math.min(1.0, v + 0.02);
          const nextTheta = vNext * Math.PI * 0.75;
          const nextOrbX = a * Math.cos(nextTheta) - c + (1.0 - vNext) * 24.0;
          const nextOrbZ = b * Math.sin(nextTheta) + (1.0 - vNext) * 14.0;
          const nextRotY = nextOrbZ * Math.sin(tilt);
          const nextRotZ = nextOrbZ * Math.cos(tilt);

          const fwdX = nextOrbX - orbX;
          const fwdY = nextRotY - rotY;
          const fwdZ = nextRotZ - rotZ;
          probeGroupRef.current.lookAt(
            curMars.x + orbX - fwdX,
            curMars.y + rotY - fwdY,
            curMars.z + rotZ - fwdZ
          );
        } else {
          // ==========================================
          // PHASE 5: Mars Capture Orbit (84% - 100%)
          // Smooth stable elliptical Areocentric orbit around Mars
          // ==========================================
          const s = (phaseProgress - 0.84) / 0.16; // 0 to 1
          const a = 71.0;
          const c = 21.0;
          const b = 67.82;
          const tilt = 0.52;
          const theta = Math.PI * 0.75 + s * Math.PI * 4.8;

          const orbX = a * Math.cos(theta) - c;
          const orbZ = b * Math.sin(theta);
          const rotY = orbZ * Math.sin(tilt);
          const rotZ = orbZ * Math.cos(tilt);

          const curMars = marsGroupRef.current ? marsGroupRef.current.position : marsRendezvous;
          probeGroupRef.current.position.set(
            curMars.x + orbX,
            curMars.y + rotY,
            curMars.z + rotZ
          );

          // Attitude: Scientific camera instruments pointed strictly toward Mars center
          probeGroupRef.current.lookAt(curMars.x, curMars.y, curMars.z);
        }
      } else if (isAditya) {
        if (phaseProgress < 0.30) {
          // ==========================================
          // PHASE 1: Earth-bound Expanding Loops (0% - 30%)
          // ==========================================
          const u = phaseProgress / 0.30;
          const loopCount = 5;
          const currentLoop = u * loopCount;
          const loopFraction = currentLoop % 1.0;
          const loopIndex = Math.min(4, Math.floor(currentLoop));

          const a = 40 + loopIndex * 8.0; // 40 -> 72
          const e = 0.12 + loopIndex * 0.11; // 0.12 -> 0.56
          const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));

          const theta = loopFraction * Math.PI * 2;
          const posX = earthCenter.x + (a * Math.cos(theta) - a * e);
          const posY = earthCenter.y + Math.sin(theta) * 6;
          const posZ = earthCenter.z + b * Math.sin(theta);
          probeGroupRef.current.position.set(posX, posY, posZ);
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        } else if (phaseProgress < 0.40) {
          // ==========================================
          // PHASE 2: Trans-L1 Injection (TLI) Burn (30% - 40%)
          // ==========================================
          const tau = (phaseProgress - 0.30) / 0.10;
          const startX = earthCenter.x + 31.68;
          const startY = 0;
          const startZ = earthCenter.z;
          const endX = earthCenter.x + 62;
          const endY = 8;
          const endZ = earthCenter.z;

          const posX = startX + tau * (endX - startX);
          const posY = startY + tau * (endY - startY);
          const posZ = startZ + tau * (endZ - startZ);
          probeGroupRef.current.position.set(posX, posY, posZ);
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        } else if (phaseProgress < 0.72) {
          // ==========================================
          // PHASE 3: Trans-L1 Cruise & TCM (40% - 72%)
          // ==========================================
          const w = (phaseProgress - 0.40) / 0.32;
          const startX = earthCenter.x + 62;
          const startY = 8;
          const startZ = earthCenter.z;
          const endX = l1Point.x - 12;
          const endY = l1Point.y + 20;
          const endZ = l1Point.z;

          const posX = startX + w * (endX - startX);
          const posY = startY + Math.sin(w * Math.PI) * 16 + w * (endY - startY);
          const posZ = startZ + w * (endZ - startZ);
          probeGroupRef.current.position.set(posX, posY, posZ);
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        } else if (phaseProgress < 0.84) {
          // ==========================================
          // PHASE 4: Halo Orbit Insertion (HOI) Braking Burn (72% - 84%)
          // 440N LAM + AOCS thrusters fire braking burn
          // ==========================================
          const v = (phaseProgress - 0.72) / 0.12;
          const startX = l1Point.x - 12;
          const startY = l1Point.y + 20;
          const startZ = l1Point.z;
          const endX = l1Point.x;
          const endY = l1Point.y + 24;
          const endZ = l1Point.z;

          const posX = startX + v * (endX - startX);
          const posY = startY + v * (endY - startY);
          const posZ = startZ + v * (endZ - startZ);
          probeGroupRef.current.position.set(posX, posY, posZ);
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        } else {
          // ==========================================
          // PHASE 5: Sun-Earth L1 3D Halo Orbit (84% - 100%)
          // ==========================================
          const s = (phaseProgress - 0.84) / 0.16;
          const theta = s * Math.PI * 4;

          const haloX = l1Point.x + Math.sin(theta * 2) * 5.5;
          const haloY = l1Point.y + Math.cos(theta) * 24;
          const haloZ = l1Point.z + Math.sin(theta) * 30;

          probeGroupRef.current.position.set(haloX, haloY, haloZ);
          probeGroupRef.current.lookAt(sunCenter.x, sunCenter.y, sunCenter.z);
        }
      }
    }
  });

  // ========================================================
  // TRAJECTORY CURVES MEMOIZATION (C0-Continuous Path Stitching)
  // ========================================================

  // 1. MOM Earth Launch-to-Parking Injection Arc (0% - 10%)
  const momEntryArc = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const p0X = earthCenter.x + 36;
    const p0Y = earthCenter.y - 12;
    const p0Z = earthCenter.z - 18;
    const injX = earthCenter.x + 35.7;
    const injY = earthCenter.y;
    const injZ = earthCenter.z;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = p0X + t * (injX - p0X);
      const y = p0Y + Math.sin(t * Math.PI * 0.5) * (injY - p0Y) + Math.sin(t * Math.PI) * 6;
      const z = p0Z + t * (injZ - p0Z);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [earthCenter]);

  // 2. MOM Earth-bound Phasing Loops (Apogee Raising Maneuvers 1 to 5)
  const momPhasingLoops = useMemo(() => {
    const lines: THREE.Line[] = [];
    for (let loop = 0; loop < 5; loop++) {
      const a = 42 + loop * 10.0;
      const e = 0.15 + loop * 0.12;
      const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            earthCenter.x + (a * Math.cos(theta) - a * e),
            earthCenter.y + Math.sin(theta) * (4 + loop * 1.8),
            earthCenter.z + b * Math.sin(theta)
          )
        );
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: loop === 4 ? 0xf59e0b : 0x0284c7,
        transparent: true,
        opacity: 0.35 + loop * 0.12,
      });
      lines.push(new THREE.Line(geom, mat));
    }
    return lines;
  }, [earthCenter]);

  // 3. MOM Hohmann Transfer Ellipse Arc (40% - 80%)
  const momTransferCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const startX = earthCenter.x + 30.34;
    const startZ = earthCenter.z;
    const endX = marsRendezvous.x + 50;
    const endZ = marsRendezvous.z;
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const x = startX + t * (endX - startX);
      const y = Math.sin(t * Math.PI) * 48;
      const z = startZ + t * (endZ - startZ) - Math.sin(t * Math.PI) * 32;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 4.5,
      gapSize: 2.5,
      transparent: true,
      opacity: 0.9,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [earthCenter, marsRendezvous]);

  // 4. Mars Orbital Heliocentric Arc
  const marsHeliocentricArc = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = -30; i <= 30; i++) {
      const rad = 236;
      const angle = -0.48 + (i / 30) * 0.35;
      pts.push(new THREE.Vector3(Math.cos(angle) * rad, 0, Math.sin(angle) * rad));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xea580c,
      dashSize: 6,
      gapSize: 4,
      transparent: true,
      opacity: 0.45,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, []);

  // 5. Mars Capture Elliptical Orbit (Attached to Mars Center with Strict Clearance > 1.55x Mars Radius)
  const marsCaptureOrbit = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const a = 71.0;
    const c = 21.0;
    const b = 67.82;
    const tilt = 0.52;
    for (let i = 0; i <= 80; i++) {
      const theta = (i / 80) * Math.PI * 2;
      const orbX = a * Math.cos(theta) - c;
      const orbZ = b * Math.sin(theta);
      const rotY = orbZ * Math.sin(tilt);
      const rotZ = orbZ * Math.cos(tilt);
      pts.push(new THREE.Vector3(orbX, rotY, rotZ));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.Line(geom, mat);
  }, []);

  // 6. Aditya-L1 Earth Launch Injection Arc (0% - 10%)
  const adityaEntryArc = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const p0X = earthCenter.x + 36;
    const p0Y = earthCenter.y - 12;
    const p0Z = earthCenter.z - 18;
    const injX = earthCenter.x + 35.2;
    const injY = earthCenter.y;
    const injZ = earthCenter.z;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = p0X + t * (injX - p0X);
      const y = p0Y + Math.sin(t * Math.PI * 0.5) * (injY - p0Y) + Math.sin(t * Math.PI) * 6;
      const z = p0Z + t * (injZ - p0Z);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [earthCenter]);

  // 7. Aditya-L1 Earth-bound Loops (10% - 40%)
  const adityaPhasingLoops = useMemo(() => {
    const lines: THREE.Line[] = [];
    for (let loop = 0; loop < 5; loop++) {
      const a = 40 + loop * 8.0;
      const e = 0.12 + loop * 0.11;
      const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            earthCenter.x + (a * Math.cos(theta) - a * e),
            earthCenter.y + Math.sin(theta) * 6,
            earthCenter.z + b * Math.sin(theta)
          )
        );
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: loop === 4 ? 0x38bdf8 : 0x0ea5e9,
        transparent: true,
        opacity: 0.35 + loop * 0.12,
      });
      lines.push(new THREE.Line(geom, mat));
    }
    return lines;
  }, [earthCenter]);

  // 8. Aditya-L1 Trans-L1 Injection (TLI) Trajectory Line (40% - 80%)
  const adityaTliCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const startX = earthCenter.x + 31.68;
    const startY = 0;
    const startZ = earthCenter.z;
    const endX = l1Point.x;
    const endY = l1Point.y + 24;
    const endZ = l1Point.z;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = startX + t * (endX - startX);
      const y = startY + Math.sin(t * Math.PI) * 20 + t * (endY - startY);
      const z = startZ + t * (endZ - startZ);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 5,
      gapSize: 3,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [earthCenter, l1Point]);

  // 9. Aditya-L1 3D Inclined Halo Orbit Loop around L1 (80% - 100%)
  const l1HaloCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const theta = (i / 72) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          l1Point.x + Math.sin(theta * 2) * 5.5,
          l1Point.y + Math.cos(theta) * 24,
          l1Point.z + Math.sin(theta) * 30
        )
      );
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });
    return new THREE.Line(geom, mat);
  }, [l1Point]);

  // Dispose materials/textures & trajectory lines on unmount
  useEffect(() => {
    return () => {
      sunMaterial.dispose();
      sunCoronaMaterial.dispose();
      marsTextures.map.dispose();
      marsTextures.bumpMap.dispose();
      marsTextures.roughnessMap.dispose();
      momEntryArc.geometry.dispose();
      (momEntryArc.material as THREE.Material).dispose();
      momPhasingLoops.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      momTransferCurve.geometry.dispose();
      (momTransferCurve.material as THREE.Material).dispose();
      marsHeliocentricArc.geometry.dispose();
      (marsHeliocentricArc.material as THREE.Material).dispose();
      marsCaptureOrbit.geometry.dispose();
      (marsCaptureOrbit.material as THREE.Material).dispose();
      adityaEntryArc.geometry.dispose();
      (adityaEntryArc.material as THREE.Material).dispose();
      adityaPhasingLoops.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      adityaTliCurve.geometry.dispose();
      (adityaTliCurve.material as THREE.Material).dispose();
      l1HaloCurve.geometry.dispose();
      (l1HaloCurve.material as THREE.Material).dispose();
    };
  }, [
    sunMaterial,
    sunCoronaMaterial,
    marsTextures,
    momEntryArc,
    momPhasingLoops,
    momTransferCurve,
    marsHeliocentricArc,
    marsCaptureOrbit,
    adityaEntryArc,
    adityaPhasingLoops,
    adityaTliCurve,
    l1HaloCurve,
  ]);

  const isMOMBraking = isMOM && phaseProgress >= 0.72 && phaseProgress <= 0.84;
  const isAdityaBraking = isAditya && phaseProgress >= 0.72 && phaseProgress <= 0.84;

  return (
    <group>
      {/* ======================================================== */}
      {/* 1. EARTH REFERENCE SPHERE (Departure Origin)              */}
      {/* ======================================================== */}
      <group position={[earthCenter.x, earthCenter.y, earthCenter.z]} scale={[0.65, 0.65, 0.65]}>
        <ScaledEarth radius={55} />
      </group>

      {/* ======================================================== */}
      {/* 2. MANGALYAAN (MOM) DEEP-SPACE ENVIRONMENT (→ MARS)      */}
      {/* ======================================================== */}
      {isMOM ? (
        <group>
          {/* Phase 1: Earth Launch-to-Parking Injection Arc */}
          <primitive object={momEntryArc} />

          {/* Phase 2: Expanding Earth-bound Apogee Raising Maneuver Loops */}
          {momPhasingLoops.map((line, idx) => (
            <primitive key={`mom-loop-${idx}`} object={line} />
          ))}

          {/* Phase 3: Hohmann Trans-Mars Injection Transfer Arc */}
          <primitive object={momTransferCurve} />

          {/* Mars Heliocentric Orbital Segment */}
          <primitive object={marsHeliocentricArc} />

          {/* 3D MARS GLOBE (Moving along heliocentric orbit to rendezvous at 100%) */}
          <group ref={marsGroupRef} position={[marsRendezvous.x, marsRendezvous.y, marsRendezvous.z]}>
            {/* Mars Sphere with PBR bump & roughness maps */}
            <mesh ref={marsRef} castShadow receiveShadow>
              <sphereGeometry args={[32, 64, 48]} />
              <meshStandardMaterial
                map={marsTextures.map}
                bumpMap={marsTextures.bumpMap}
                bumpScale={0.14}
                roughnessMap={marsTextures.roughnessMap}
                roughness={0.78}
                metalness={0.06}
              />
            </mesh>

            {/* Thin Martian Dusty Atmospheric Rim */}
            <mesh>
              <sphereGeometry args={[32 * 1.035, 48, 36]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.24}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Phase 4: Mars Capture Elliptical Orbit (Attached to Mars Center with Strict Clearance > 1.55x Mars Radius) */}
            <primitive object={marsCaptureOrbit} />

            {/* Mars Ambient Point Light */}
            <pointLight color="#ea580c" intensity={1.5} distance={75} />
          </group>

          {/* HIGH-FIDELITY PROCEDURAL MOM SPACECRAFT */}
          <group ref={probeGroupRef}>
            <MOMSpacecraft
              onSelectComponent={onSelectComponent}
              onHoverComponent={onHoverComponent}
              inspectData={INSPECTABLE_COMPONENTS}
            />
            {/* 440N LAM Retro-Burn Plume during MOI (72% - 84%) */}
            {isMOMBraking && (
              <group position={[0, 0, -1.2]} rotation={[Math.PI, 0, 0]}>
                <mesh position={[0, -0.8, 0]}>
                  <coneGeometry args={[0.32, 1.8, 16, 1, true]} />
                  <meshBasicMaterial
                    color="#f59e0b"
                    transparent
                    opacity={0.85}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
                <mesh position={[0, -0.5, 0]}>
                  <coneGeometry args={[0.18, 1.1, 16, 1, true]} />
                  <meshBasicMaterial
                    color="#fef08a"
                    transparent
                    opacity={0.9}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
                <pointLight color="#f59e0b" intensity={3.5} distance={20} />
              </group>
            )}
          </group>
        </group>
      ) : null}

      {/* ======================================================== */}
      {/* 3. ADITYA-L1 ENVIRONMENT (→ SUN-EARTH L1 LAGRANGE POINT)  */}
      {/* ======================================================== */}
      {isAditya ? (
        <group>
          {/* Phase 1: Earth Launch-to-Parking Injection Arc */}
          <primitive object={adityaEntryArc} />

          {/* Phase 2: Earth-bound Expanding Orbit Loops */}
          {adityaPhasingLoops.map((line, idx) => (
            <primitive key={`aditya-loop-${idx}`} object={line} />
          ))}

          {/* Phase 3: Trans-L1 Injection (TLI) Trajectory */}
          <primitive object={adityaTliCurve} />

          {/* Phase 4: 3D Inclined Halo Orbit Loop around L1 */}
          <primitive object={l1HaloCurve} />

          {/* GLSL ANIMATED SUN PHOTOSPHERE & CORONA */}
          <group position={[sunCenter.x, sunCenter.y, sunCenter.z]}>
            {/* Real-time GLSL Sun Sphere with 3D FBM Plasma Convection */}
            <mesh ref={sunMeshRef} material={sunMaterial}>
              <sphereGeometry args={[52, 64, 48]} />
            </mesh>

            {/* Custom GLSL Smooth Additive Corona Shader (Zero Hard Edges) */}
            <mesh ref={coronaRef} material={sunCoronaMaterial}>
              <sphereGeometry args={[82, 48, 36]} />
            </mesh>

            {/* Dynamic Sun Omni-Light */}
            <pointLight color="#fef08a" intensity={4.8} distance={800} decay={1.4} />
          </group>

          {/* SUN-EARTH L1 LAGRANGE POINT RETICULE & CALLOUT */}
          <group position={[l1Point.x, l1Point.y, l1Point.z]}>
            <group ref={l1ReticuleRef}>
              {/* Outer pulsing ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[3.2, 3.6, 32]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.8}
                />
              </mesh>
              {/* Crosshair lines */}
              <mesh>
                <boxGeometry args={[8, 0.1, 0.1]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.1, 8, 0.1]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
              </mesh>
            </group>
            {/* L1 Center Marker */}
            <mesh>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
          </group>

          {/* HIGH-FIDELITY PROCEDURAL ADITYA-L1 OBSERVATORY SPACECRAFT */}
          <group ref={probeGroupRef}>
            <AdityaL1Spacecraft
              onSelectComponent={onSelectComponent}
              onHoverComponent={onHoverComponent}
              inspectData={INSPECTABLE_COMPONENTS}
            />
            {/* 440N LAM Braking Burn Plume during HOI (72% - 84%) */}
            {isAdityaBraking && (
              <group position={[0, -0.9, 0]} rotation={[0, 0, Math.PI]}>
                <mesh position={[0, -0.8, 0]}>
                  <coneGeometry args={[0.3, 1.6, 16, 1, true]} />
                  <meshBasicMaterial
                    color="#f59e0b"
                    transparent
                    opacity={0.85}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
                <mesh position={[0, -0.5, 0]}>
                  <coneGeometry args={[0.16, 1.0, 16, 1, true]} />
                  <meshBasicMaterial
                    color="#fef08a"
                    transparent
                    opacity={0.9}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
                <pointLight color="#f59e0b" intensity={3.5} distance={20} />
              </group>
            )}
          </group>
        </group>
      ) : null}

      {/* Deep Space Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[150, 100, 100]} intensity={1.8} />
    </group>
  );
}
