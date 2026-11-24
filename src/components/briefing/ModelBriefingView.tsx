import { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Rocket,
  Satellite,
  Globe,
  Sun as SunIcon,
  RotateCcw,
  Play,
  Pause,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PRESET_MISSIONS } from '../../sim';
import { SimFrameState } from '../scene/types';
import { ProceduralPSLV } from '../scene/ProceduralPSLV';
import { ScaledEarth } from '../scene/ScaledEarth';
import {
  EOS04Spacecraft,
  MOMSpacecraft,
  AdityaL1Spacecraft,
} from '../scene/ProceduralSpacecraft';
import {
  getProceduralMarsPBRTextures,
  createSunShaderMaterial,
} from '../scene/textures/proceduralTextures';
import { INSPECTABLE_COMPONENTS, InspectableComponent } from '../scene/inspectData';

export type ModelId =
  | 'pslv_xl'
  | 'eos04'
  | 'mom'
  | 'aditya'
  | 'earth'
  | 'mars'
  | 'sun';

interface ModelMeta {
  id: ModelId;
  name: string;
  hindiName: string;
  category: 'Launch Vehicle' | 'Spacecraft' | 'Celestial Body';
  icon: typeof Rocket;
  tagline: string;
  isroDesignation: string;
  dimensions: string;
  mass: string;
  targetOrbit: string;
  missionLife: string;
  keySubsystems: { id: string; name: string; badge: string }[];
  overview: string;
  historicalSignificance: string;
}

const MODELS_META: Record<ModelId, ModelMeta> = {
  pslv_xl: {
    id: 'pslv_xl',
    name: 'PSLV-XL Rocket Stack',
    hindiName: 'ध्रुवीय उपग्रह प्रक्षेपण यान (PSLV-XL)',
    category: 'Launch Vehicle',
    icon: Rocket,
    tagline: "ISRO's 4-Stage Operational Workhorse Launch Vehicle",
    isroDesignation: 'PSLV-XL Configuration (6x S12 Boosters)',
    dimensions: '44.4 m height × 2.8 m core diameter',
    mass: '320,000 kg (320 t) Gross Liftoff Weight',
    targetOrbit: 'Sun-Synchronous Orbit (1,750 kg) / Sub-GTO / Interplanetary',
    missionLife: 'Expendable (Ascent duration ~1,030 seconds)',
    keySubsystems: [
      { id: 'ps1_core', name: 'PS1 Solid Core (S139)', badge: 'Stage 1' },
      { id: 'strap_ons', name: '6x S12 Strap-on Boosters', badge: 'Auxiliary' },
      { id: 'ps2_vikas', name: 'PS2 Vikas Liquid Engine', badge: 'Stage 2' },
      { id: 'ps3_hps3', name: 'PS3 HPS3 Solid Motor', badge: 'Stage 3' },
      { id: 'ps4_twin', name: 'PS4 Twin Liquid Engines', badge: 'Stage 4' },
      { id: 'payload_fairing', name: '3.2m Isogrid Heat Shield', badge: 'Fairing' },
    ],
    overview:
      "PSLV-XL is the upgraded heavy variant of India's Polar Satellite Launch Vehicle. It features six stretched S12 solid strap-ons (PSOM-XL) carrying 12.2 tonnes of propellant each. Renowned worldwide for unmatched reliability, PSLV has launched Chandrayaan-1, Mangalyaan (MOM), Aditya-L1, AstroSat, and hundreds of commercial international satellites.",
    historicalSignificance:
      'Boasts over 50 successful missions with a >95% success record, establishing Indian low-cost access to space.',
  },
  eos04: {
    id: 'eos04',
    name: 'EOS-04 (RISAT-1A)',
    hindiName: 'ईओएस-04 (रडार इमेजिंग उपग्रह)',
    category: 'Spacecraft',
    icon: Satellite,
    tagline: 'C-band Synthetic Aperture Radar (SAR) Earth Observation Satellite',
    isroDesignation: 'RISAT-1A / EOS-04 (PSLV-C52)',
    dimensions: '1.8 m × 1.8 m × 2.4 m bus | 9.6 m solar span | 6.0 m SAR antenna',
    mass: '1,710 kg wet liftoff mass',
    targetOrbit: '529 km Sun-Synchronous Polar Orbit (97.5° inclination)',
    missionLife: '10 years operational design life',
    keySubsystems: [
      { id: 'eos04_sar', name: 'C-band SAR Active Phased Array', badge: 'Payload' },
      { id: 'eos04_solar', name: 'Dual Deployable GaAs Solar Wings', badge: 'Power' },
      { id: 'eos04_bus', name: 'Spacecraft Bus & 3-Axis Avionics', badge: 'Bus' },
    ],
    overview:
      'EOS-04 is an advanced all-weather, day-and-night radar imaging satellite designed by U R Rao Satellite Centre (URSC) and Space Applications Centre (SAC). Operating at 5.35 GHz (C-band), its microwave beams penetrate clouds, fog, monsoonal rainfall, and vegetation to deliver critical imagery for agriculture, flood disaster management, soil moisture mapping, and national defense surveillance.',
    historicalSignificance:
      'Successfully injected into a circular 529 km SSO by PSLV-C52 on February 14, 2022, securing Indian SAR data sovereignty.',
  },
  mom: {
    id: 'mom',
    name: 'Mangalyaan (MOM)',
    hindiName: 'मंगलयान (Mars Orbiter Mission)',
    category: 'Spacecraft',
    icon: Satellite,
    tagline: "India's Historic First Interplanetary Mars Orbiter",
    isroDesignation: 'MOM / PSLV-C25',
    dimensions: '1.5 m × 1.5 m × 1.6 m bus | 1.4 m HGA dish | 4.2 m solar array',
    mass: '1,337 kg at liftoff (852 kg propellant)',
    targetOrbit: 'Highly elliptical Areocentric Orbit (421 km × 76,993 km)',
    missionLife: 'Designed for 6 months; operated for nearly 8 years (2014–2022)',
    keySubsystems: [
      { id: 'mom_mcc', name: 'Mars Colour Camera (MCC)', badge: 'Optics' },
      { id: 'mom_tis', name: 'Thermal Infrared Spectrometer (TIS)', badge: 'Thermal' },
      { id: 'mom_lap', name: 'Lyman Alpha Photometer (LAP)', badge: 'Exosphere' },
      { id: 'mom_menca', name: 'MENCA Neutral Mass Spectrometer', badge: 'Chemistry' },
      { id: 'mom_lam', name: '440N Liquid Apogee Motor (LAM)', badge: 'Propulsion' },
      { id: 'mom_hga', name: '1.4m Parabolic High Gain Antenna', badge: 'Comms' },
    ],
    overview:
      "Launched on November 5, 2013, aboard PSLV-C25, Mangalyaan traveled over 660 million kilometers across interplanetary space. On September 24, 2014, its 440N LAM engine fired with absolute precision to inject the probe into Martian orbit. The mission carried five scientific instruments to investigate Martian surface geology, morphology, atmospheric composition, and deuterium-to-hydrogen ratios.",
    historicalSignificance:
      'Made India the 1st Asian nation to reach Mars, and the 1st country worldwide to achieve Mars orbit on its maiden attempt.',
  },
  aditya: {
    id: 'aditya',
    name: 'Aditya-L1',
    hindiName: 'आदित्य-एल1 (सौर वेधशाला)',
    category: 'Spacecraft',
    icon: Satellite,
    tagline: "India's First Dedicated Solar Space Observatory at Sun-Earth L1",
    isroDesignation: 'Aditya-L1 / PSLV-C57',
    dimensions: 'Hexagonal bus 1.6 m × 2.2 m | 6.0 m solar wingspan',
    mass: '1,475 kg wet mass at liftoff',
    targetOrbit: 'Halo Orbit around Sun-Earth Lagrange Point 1 (1.5M km from Earth)',
    missionLife: '5 years operational primary mission',
    keySubsystems: [
      { id: 'aditya_velc', name: 'Visible Emission Line Coronagraph (VELC)', badge: 'Primary' },
      { id: 'aditya_suit', name: 'Solar Ultraviolet Imaging Telescope (SUIT)', badge: 'UV Imager' },
      { id: 'aditya_aspex', name: 'Aditya Solar Wind Particle Exp (ASPEX)', badge: 'Particles' },
      { id: 'aditya_papa', name: 'Plasma Analyser Package for Aditya (PAPA)', badge: 'Plasma' },
      { id: 'aditya_solexs', name: 'Solar Low Energy X-ray Spectrometer', badge: 'X-Ray' },
      { id: 'aditya_hel1os', name: 'High Energy L1 Orbiting X-ray Spectrometer', badge: 'Hard X-Ray' },
    ],
    overview:
      'Aditya-L1 is positioned in a halo orbit around the Sun-Earth L1 point, approximately 1.5 million kilometers from Earth. This location provides continuous, unobstructed 24×7 observation of the Sun without any occultation or eclipses. Its seven scientific payloads observe the solar corona, chromosphere, photosphere, solar wind dynamics, and Coronal Mass Ejections (CMEs) that drive space weather on Earth.',
    historicalSignificance:
      'Launched on September 2, 2023, by PSLV-C57; successfully entered its halo orbit on January 6, 2024, placing India in the elite group of solar observatory operators.',
  },
  earth: {
    id: 'earth',
    name: 'Earth (SSO Reference)',
    hindiName: 'पृथ्वी (लॉन्च प्लेटफॉर्म एवं संदर्भ ग्रह)',
    category: 'Celestial Body',
    icon: Globe,
    tagline: 'Primary Terrestrial Launch Platform & 529 km SSO Reference Body',
    isroDesignation: 'Planetary Launch Platform / SDSC SHAR',
    dimensions: '6,378.137 km equatorial radius | 40,075 km circumference',
    mass: '5.9722 × 10²⁴ kg | Surface gravity 9.80665 m/s²',
    targetOrbit: 'Surface origin (SDSC SHAR: 13.72°N, 80.23°E)',
    missionLife: '4.54 billion years',
    keySubsystems: [
      { id: 'ps1_core', name: 'Satish Dhawan Space Centre (SDSC SHAR)', badge: 'Launch Site' },
      { id: 'eos04_bus', name: 'Sun-Synchronous Polar Corridor (97.5°)', badge: 'Corridor' },
      { id: 'eos04_sar', name: 'NRSC Shadnagar Ground Station', badge: 'Telemetry' },
    ],
    overview:
      "Earth serves as the physical anchor for all ISRO orbital missions. The Satish Dhawan Space Centre (SDSC SHAR) in Sriharikota, Andhra Pradesh, takes strategic advantage of its low latitude (13.72°N) to impart a natural Earth-rotation velocity boost (v₀ ≈ 290 m/s at 140° azimuth) while launching east over the Bay of Bengal for polar and sub-GTO inclinations.",
    historicalSignificance:
      'Home to ISRO First and Second Launch Pads, tracking radar telemetry networks across Port Blair, Brunei, and Mauritius.',
  },
  mars: {
    id: 'mars',
    name: 'Mars (MOM Target)',
    hindiName: 'मंगल ग्रह (MOM का लक्ष्य ग्रह)',
    category: 'Celestial Body',
    icon: Globe,
    tagline: 'Target Planetary Destination for the Mars Orbiter Mission',
    isroDesignation: 'Martian System / Areocentric Target',
    dimensions: '3,389.5 km mean radius | 21,344 km circumference',
    mass: '6.4171 × 10²³ kg | Surface gravity 3.72 m/s² (0.38g)',
    targetOrbit: 'Heliocentric orbit at 1.524 AU (227.9 million km from Sun)',
    missionLife: '4.6 billion years',
    keySubsystems: [
      { id: 'mom_mcc', name: 'Valles Marineris Grand Canyon System', badge: 'Feature' },
      { id: 'mom_tis', name: 'Olympus Mons & Volcanic Tharsis Plains', badge: 'Feature' },
      { id: 'mom_lap', name: 'Martian Atmosphere & Polar Carbon Ice Caps', badge: 'Atmosphere' },
    ],
    overview:
      'The Red Planet features a thin carbon dioxide atmosphere (surface pressure ~610 Pa, <1% of Earth). Its reddish hue comes from pervasive iron oxide (rust) in the surface regolith. Mangalyaan entered Martian orbit to map its dynamic dust storms, investigate methane signatures, and measure hydrogen escape rates in the exosphere.',
    historicalSignificance:
      'Subject of historic exploration that demonstrated India’s world-class capability in autonomous deep-space navigation.',
  },
  sun: {
    id: 'sun',
    name: 'Sun (Aditya-L1 Target)',
    hindiName: 'सूर्य (आदित्य-एल1 का वेधशाला लक्ष्य)',
    category: 'Celestial Body',
    icon: SunIcon,
    tagline: 'Central Star of the Solar System & Space Weather Source',
    isroDesignation: 'G2V Main-Sequence Star / Solar System Core',
    dimensions: '1,392,700 km diameter (109 × Earth) | 1.989 × 10³⁰ kg mass',
    mass: '333,000 Earth masses | Surface temp 5,778 K | Corona 1–3 million K',
    targetOrbit: 'Galactic orbit (26,000 light years from Milky Way core)',
    missionLife: '4.6 billion years (Main Sequence)',
    keySubsystems: [
      { id: 'aditya_velc', name: 'Solar Corona & Coronal Mass Ejections (CMEs)', badge: 'Corona' },
      { id: 'aditya_suit', name: 'Photosphere & Sunspots (Magnetic Flux)', badge: 'Photosphere' },
      { id: 'aditya_aspex', name: 'Solar Wind Plasma Streams & Solar Protons', badge: 'Solar Wind' },
    ],
    overview:
      'The Sun drives space weather across the entire solar system. Its outer atmosphere, the corona, exhibits extreme temperatures of 1 to 3 million Kelvin—far hotter than the 5,778 Kelvin surface—a mystery known as the Coronal Heating Problem. Aditya-L1 continuously studies how solar flares and coronal mass ejections affect Earth’s magnetosphere and satellite communications.',
    historicalSignificance:
      'Target of India’s flagship heliophysics mission observing space weather phenomena from Sun-Earth L1.',
  },
};

export function ModelBriefingView() {
  const [selectedModelId, setSelectedModelId] = useState<ModelId>('pslv_xl');
  const [selectedComponent, setSelectedComponent] = useState<InspectableComponent | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<InspectableComponent | null>(null);
  const [blueprintMode, setBlueprintMode] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);

  const modelMeta = MODELS_META[selectedModelId];
  const activeComponent = selectedComponent || hoveredComponent;

  // Static nominal simulation frame for the launch vehicle
  const nominalFrame: SimFrameState = useMemo(
    () => ({
      time_s: 0,
      altitude_m: 0,
      speed_ms: 0,
      pitch_deg: 90,
      flightPathAngle_deg: 90,
      downrange_m: 0,
      thrust_N: 0,
      sensedG: 1.0,
      dynamicPressure_kPa: 0,
      activeStages: ['ps1_core'],
      events: [],
      isOrbitAchieved: false,
      groundStraponsDetached: false,
      airStraponsDetached: false,
      ps1Detached: false,
      fairingSeparated: false,
      ps2Detached: false,
      ps3Detached: false,
      ps4Cutoff: false,
    }),
    []
  );

  const defaultMission = PRESET_MISSIONS['pslv-c52-eos04'];

  const handleSelectSubsystem = (subId: string) => {
    if (INSPECTABLE_COMPONENTS[subId]) {
      setSelectedComponent(INSPECTABLE_COMPONENTS[subId]);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-slate-950 font-sans select-none">
      {/* ======================================================== */}
      {/* LEFT COLUMN: MODEL CATALOG SELECTOR (~20% WIDTH)         */}
      {/* ======================================================== */}
      <aside className="w-full lg:w-72 flex-none border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950/90 flex flex-col overflow-y-auto p-3 gap-4">
        <div className="flex items-center gap-2 px-2 pt-1">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            3D Showroom Catalog
          </h2>
        </div>

        {/* Group 1: Launch Vehicles */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 font-semibold">
            Launch Vehicles
          </span>
          {(['pslv_xl'] as ModelId[]).map((id) => {
            const m = MODELS_META[id];
            const isSelected = selectedModelId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedModelId(id);
                  setSelectedComponent(null);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs font-mono border ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500/60 text-white font-bold shadow-md shadow-orange-950/40'
                    : 'bg-slate-900/60 border-slate-800/70 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center flex-none ${
                    isSelected ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Rocket className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {m.isroDesignation}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Group 2: Spacecraft */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 font-semibold">
            ISRO Spacecraft
          </span>
          {(['eos04', 'mom', 'aditya'] as ModelId[]).map((id) => {
            const m = MODELS_META[id];
            const isSelected = selectedModelId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedModelId(id);
                  setSelectedComponent(null);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs font-mono border ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/60 text-white font-bold shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 border-slate-800/70 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center flex-none ${
                    isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {m.isroDesignation}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Group 3: Celestial Bodies */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 font-semibold">
            Celestial Bodies
          </span>
          {(['earth', 'mars', 'sun'] as ModelId[]).map((id) => {
            const m = MODELS_META[id];
            const isSelected = selectedModelId === id;
            const Icon = m.icon;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedModelId(id);
                  setSelectedComponent(null);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs font-mono border ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white font-bold shadow-md shadow-amber-950/40'
                    : 'bg-slate-900/60 border-slate-800/70 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center flex-none ${
                    isSelected ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {m.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scientific Honesty Notice */}
        <div className="mt-auto p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[10px] font-mono text-slate-400 leading-relaxed">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Procedural 3D</span>
          </div>
          <span>
            Rendered in real-time via procedural Three.js geometry &amp; HTML5 canvas textures. Zero external 3D files.
          </span>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* CENTER: 3D STUDIO SHOWROOM CANVAS (~50% WIDTH)           */}
      {/* ======================================================== */}
      <section className="flex-1 h-full min-h-[400px] relative bg-[#020617] overflow-hidden flex flex-col">
        {/* Top Floating Studio Controls Bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          {/* Active Model Pill */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs font-mono shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-white">{modelMeta.name}</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              | {modelMeta.category}
            </span>
          </div>

          {/* Right Tools: Auto-Rotate & Blueprint Mode */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono border transition-all shadow-md ${
                isAutoRotating
                  ? 'bg-slate-900/90 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle automatic turntable rotation"
            >
              {isAutoRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="hidden sm:inline">Turntable</span>
            </button>

            <button
              onClick={() => setBlueprintMode(!blueprintMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold border transition-all shadow-md ${
                blueprintMode
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-cyan-950/50'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              <span>📐 Blueprint: {blueprintMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* 3D WebGL Canvas */}
        <div className="flex-1 w-full h-full relative">
          <Canvas
            gl={{
              antialias: true,
              logarithmicDepthBuffer: true,
              powerPreference: 'high-performance',
            }}
            camera={{ position: [0, 6, 32], fov: 46, near: 0.1, far: 50000 }}
          >
            {/* 3-Point Studio Lighting */}
            <ambientLight intensity={0.65} />
            <directionalLight position={[25, 40, 30]} intensity={2.6} castShadow />
            <directionalLight position={[-25, 15, -20]} intensity={1.2} />
            <directionalLight position={[0, -20, -30]} intensity={0.8} />

            {/* 360° Studio Orbit Controls */}
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              autoRotate={isAutoRotating}
              autoRotateSpeed={1.0}
              maxDistance={120}
              minDistance={6}
            />

            {/* Studio Showroom Pedestal Platform */}
            <group position={[0, -18.2, 0]}>
              {/* Outer circular brushed ring */}
              <mesh receiveShadow position={[0, -0.25, 0]}>
                <cylinderGeometry args={[22, 24, 0.5, 48]} />
                <meshStandardMaterial
                  color="#0f172a"
                  roughness={0.6}
                  metalness={0.7}
                  wireframe={blueprintMode}
                />
              </mesh>
              {/* Center illuminated turntable disc */}
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[12, 21.8, 48]} />
                <meshBasicMaterial
                  color={blueprintMode ? '#00f0ff' : '#1e293b'}
                  transparent
                  opacity={blueprintMode ? 0.4 : 0.75}
                  wireframe={blueprintMode}
                />
              </mesh>
            </group>

            {/* Model Presentation Group */}
            <StudioModelRenderer
              modelId={selectedModelId}
              blueprintMode={blueprintMode}
              nominalFrame={nominalFrame}
              defaultMission={defaultMission}
              onSelectComponent={setSelectedComponent}
              onHoverComponent={setHoveredComponent}
            />
          </Canvas>

          {/* Subsystem Hover Pill (Bottom Center of Showroom) */}
          {activeComponent ? (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur border border-cyan-500/50 shadow-xl shadow-cyan-950/40 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-white font-bold">{activeComponent.name}</span>
                <span className="text-[10px] text-cyan-300">
                  | {activeComponent.thrustOrResolution || activeComponent.propellantOrSensor}
                </span>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur border border-slate-800 text-[10px] font-mono text-slate-400">
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Drag to rotate 360° • Scroll to zoom • Click parts to inspect</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: DETAILED BRIEFING PANEL (~30% WIDTH)       */}
      {/* ======================================================== */}
      <section className="w-full lg:w-96 flex-none border-t lg:border-t-0 lg:border-l border-slate-800/80 bg-slate-950/95 flex flex-col overflow-y-auto p-4 gap-4">
        {activeComponent ? (
          /* Subsystem Inspection Detail Card */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider">
                {activeComponent.category}
              </span>
              <button
                onClick={() => {
                  setSelectedComponent(null);
                  setHoveredComponent(null);
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-white transition-colors underline"
              >
                Clear / Full Overview ✕
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{activeComponent.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{activeComponent.mission}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <p>{activeComponent.isroRole}</p>
            </div>

            {/* Technical Parameters Table */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Engineering Specifications
              </span>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/60 text-xs font-mono">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-slate-400">Dimensions / Mass</span>
                  <span className="text-amber-300 font-semibold text-right">
                    {activeComponent.dimensionsOrMass}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-slate-400">Propellant / Sensor</span>
                  <span className="text-slate-200 text-right">
                    {activeComponent.propellantOrSensor}
                  </span>
                </div>
                {activeComponent.thrustOrResolution ? (
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400">Thrust / Performance</span>
                    <span className="text-cyan-300 font-semibold text-right">
                      {activeComponent.thrustOrResolution}
                    </span>
                  </div>
                ) : null}
                {Object.entries(activeComponent.technicalSpecs).map(([key, val]) => (
                  <div key={key} className="flex justify-between px-3 py-2">
                    <span className="text-slate-400">{key}</span>
                    <span className="text-slate-200 text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Full Model Briefing Overview */
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider font-semibold">
                  {modelMeta.category}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {modelMeta.isroDesignation}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{modelMeta.name}</h3>
              <p className="text-xs text-amber-400/90 font-mono mt-0.5">{modelMeta.hindiName}</p>
              <p className="text-xs text-slate-400 mt-1 leading-normal">{modelMeta.tagline}</p>
            </div>

            {/* Quick Physical Parameters Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Dimensions
                </span>
                <span className="text-slate-200 font-semibold mt-0.5 block truncate">
                  {modelMeta.dimensions}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Mass / Payload
                </span>
                <span className="text-amber-400 font-semibold mt-0.5 block truncate">
                  {modelMeta.mass}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Target Destination
                </span>
                <span className="text-cyan-300 font-semibold mt-0.5 block truncate">
                  {modelMeta.targetOrbit}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Operational Life
                </span>
                <span className="text-emerald-400 font-semibold mt-0.5 block truncate">
                  {modelMeta.missionLife}
                </span>
              </div>
            </div>

            {/* Subsystem Quick-Select Pills */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Clickable 3D Subsystems
              </span>
              <div className="flex flex-col gap-1.5">
                {modelMeta.keySubsystems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubsystem(sub.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 text-left transition-all text-xs font-mono group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                      <span className="text-slate-200 font-semibold">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {sub.badge}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mission Overview Paragraph */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Mission Role &amp; Context
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                {modelMeta.overview}
              </p>
            </div>

            {/* Historical Significance Callout */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-200 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 flex-none mt-0.5" />
              <span>{modelMeta.historicalSignificance}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * 3D Sub-Renderer routing to appropriate 3D model geometry
 */
function StudioModelRenderer({
  modelId,
  blueprintMode,
  nominalFrame,
  defaultMission,
  onSelectComponent,
  onHoverComponent,
}: {
  modelId: ModelId;
  blueprintMode: boolean;
  nominalFrame: SimFrameState;
  defaultMission: any;
  onSelectComponent: (comp: InspectableComponent) => void;
  onHoverComponent: (comp: InspectableComponent | null) => void;
}) {
  const marsPBR = useMemo(() => getProceduralMarsPBRTextures(), []);
  const sunMaterial = useMemo(() => createSunShaderMaterial(), []);

  const sunGroupRef = useRef<THREE.Group>(null);
  const marsGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (sunMaterial.uniforms?.uTime) {
      sunMaterial.uniforms.uTime.value += delta;
    }
    if (sunGroupRef.current) {
      sunGroupRef.current.rotation.y += delta * 0.05;
    }
    if (marsGroupRef.current) {
      marsGroupRef.current.rotation.y += delta * 0.08;
    }
  });

  if (modelId === 'pslv_xl') {
    return (
      <group position={[0, -18, 0]}>
        <ProceduralPSLV
          simFrame={nominalFrame}
          mission={defaultMission}
          onSelectComponent={onSelectComponent}
          onHoverComponent={onHoverComponent}
        />
      </group>
    );
  }

  if (modelId === 'eos04') {
    return (
      <group position={[0, 0, 0]} scale={[2.6, 2.6, 2.6]}>
        <EOS04Spacecraft
          blueprintMode={blueprintMode}
          inspectData={INSPECTABLE_COMPONENTS}
          onSelectComponent={onSelectComponent}
          onHoverComponent={onHoverComponent}
        />
      </group>
    );
  }

  if (modelId === 'mom') {
    return (
      <group position={[0, 0, 0]} scale={[2.8, 2.8, 2.8]}>
        <MOMSpacecraft
          blueprintMode={blueprintMode}
          inspectData={INSPECTABLE_COMPONENTS}
          onSelectComponent={onSelectComponent}
          onHoverComponent={onHoverComponent}
        />
      </group>
    );
  }

  if (modelId === 'aditya') {
    return (
      <group position={[0, 0, 0]} scale={[2.6, 2.6, 2.6]}>
        <AdityaL1Spacecraft
          blueprintMode={blueprintMode}
          inspectData={INSPECTABLE_COMPONENTS}
          onSelectComponent={onSelectComponent}
          onHoverComponent={onHoverComponent}
        />
      </group>
    );
  }

  if (modelId === 'earth') {
    return (
      <group position={[0, 0, 0]}>
        <ScaledEarth radius={10.0} />
      </group>
    );
  }

  if (modelId === 'mars') {
    return (
      <group ref={marsGroupRef} position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[9.0, 64, 48]} />
          {blueprintMode ? (
            <meshStandardMaterial wireframe color="#00f0ff" />
          ) : (
            <meshStandardMaterial
              map={marsPBR.map}
              bumpMap={marsPBR.bumpMap}
              bumpScale={0.16}
              roughnessMap={marsPBR.roughnessMap}
              roughness={0.78}
              metalness={0.06}
            />
          )}
        </mesh>
        {/* Subtle Martian atmospheric limb */}
        <mesh>
          <sphereGeometry args={[9.3, 36, 28]} />
          <meshBasicMaterial
            color="#f97316"
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

  if (modelId === 'sun') {
    return (
      <group ref={sunGroupRef} position={[0, 0, 0]}>
        <mesh material={blueprintMode ? undefined : sunMaterial}>
          <sphereGeometry args={[11.0, 64, 48]} />
          {blueprintMode && <meshStandardMaterial wireframe color="#00f0ff" />}
        </mesh>
        {/* Pulsating solar corona shell */}
        <mesh>
          <sphereGeometry args={[13.2, 36, 28]} />
          <meshBasicMaterial
            color="#fde047"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
        <pointLight color="#fef08a" intensity={4.8} distance={140} decay={2} />
      </group>
    );
  }

  return null;
}
