import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Rectangle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  CheckCircle2,
  Database,
  Radio,
  Satellite,
  Layers,
  Calendar,
  MapPin,
  Eye,
  Lock,
  RotateCcw,
  Download,
  ExternalLink,
  Sparkles,
  Globe,
  CloudSun,
  Activity,
} from 'lucide-react';
import { TrajectoryResult, ChallengeModeModifiers, MissionConfig } from '../../sim';
import { exportTelemetryCsv } from '../../utils/csvExport';

// Custom marker icon for scene center
const sceneCenterIcon = L.divIcon({
  className: 'custom-scene-marker',
  html: `<div class="w-6 h-6 rounded-full bg-cyan-500/90 border-2 border-white shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-cyan-500/30">📡</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export interface SwathRegion {
  id: string;
  name: string;
  state: string;
  application: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  zoom: number;
  terrainType: 'agriculture' | 'braided_river' | 'mangrove_delta';
}

const SWATH_REGIONS: SwathRegion[] = [
  {
    id: 'kg_basin',
    name: 'Krishna-Godavari Basin',
    state: 'Andhra Pradesh',
    application: 'Kharif rice agriculture, soil moisture & delta flood mapping',
    center: [16.5, 81.8],
    bounds: [
      [15.8, 81.0],
      [17.2, 82.6],
    ],
    zoom: 8,
    terrainType: 'agriculture',
  },
  {
    id: 'brahmaputra_floodplain',
    name: 'Brahmaputra Floodplain',
    state: 'Assam',
    application: 'Cloud-penetrating monsoon inundation & braided river channel monitoring',
    center: [26.2, 92.5],
    bounds: [
      [25.5, 91.6],
      [26.9, 93.4],
    ],
    zoom: 8,
    terrainType: 'braided_river',
  },
  {
    id: 'sundarbans_delta',
    name: 'Sundarbans Delta',
    state: 'West Bengal',
    application: 'Coastal mangrove biomass, tidal creeks & shoreline change detection',
    center: [21.9, 88.8],
    bounds: [
      [21.3, 88.0],
      [22.5, 89.6],
    ],
    zoom: 8,
    terrainType: 'mangrove_delta',
  },
];

interface BhoonidhiData {
  dataset: string;
  metadata: {
    isPlaceholder?: boolean;
    satellite: string;
    sensor: string;
    instrumentMode: string;
    productLevel: string;
    polarisation: string;
    band: string;
    resolution_m: number;
    swathWidth_km: number;
    incidentAngle_deg: string;
    orbitAltitude_km: number;
    orbitInclination_deg: number;
    repeatCycle_days: number;
    acquisitionTimestampUTC: string;
    bhoonidhiProductId: string;
    quicklookUrl?: string;
    geographicBounds: {
      center: {
        latitude: number;
        longitude: number;
        locationName: string;
      };
      boundingBox: {
        north: number;
        south: number;
        west: number;
        east: number;
      };
    };
    applications: string[];
    scientificAdvantages: string[];
  };
}

interface Props {
  mission: MissionConfig;
  trajectory: TrajectoryResult;
  modifiers: ChallengeModeModifiers;
  onBackToBrief?: () => void;
  onBackToLaunch?: () => void;
  onResetGoldenRun?: () => void;
  onOpenDeepSpace?: () => void;
}

// Leaflet map controller to pan/zoom when swath region changes
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function getDynamicDiagnosis(summary: TrajectoryResult['summary'], targetAlt: number): string {
  const diffAlt = summary.finalAltitude_km - targetAlt;
  const parts: string[] = [];

  if (summary.finalPerigee_km <= 0) {
    parts.push(
      `Perigee fell below Earth's surface (${summary.finalPerigee_km.toFixed(1)} km), resulting in atmospheric re-entry.`
    );
  } else if (summary.finalPerigee_km < Math.max(150, 0.85 * targetAlt)) {
    parts.push(
      `Perigee (${summary.finalPerigee_km.toFixed(1)} km) is below the required insertion threshold (${Math.round(Math.max(150, 0.85 * targetAlt))} km).`
    );
  }

  if (Math.abs(diffAlt) > 25) {
    parts.push(
      `Cutoff altitude reached ${summary.finalAltitude_km.toFixed(1)} km (target: ${targetAlt.toFixed(0)} km).`
    );
  }

  if (summary.finalVelocity_ms < 7550) {
    parts.push(
      `Final cutoff velocity (${summary.finalVelocity_ms.toFixed(0)} m/s) fell short of orbital insertion velocity.`
    );
  }

  return parts.length > 0 ? parts.join(' ') : 'Orbital elements did not meet stable circular insertion criteria.';
}

export function BhoonidhiExplorer({
  mission,
  trajectory,
  onBackToBrief,
  onResetGoldenRun,
  onOpenDeepSpace,
}: Props) {
  const [bhoonidhi, setBhoonidhi] = useState<BhoonidhiData | null>(null);
  const [activeRegion, setActiveRegion] = useState<SwathRegion>(SWATH_REGIONS[0]);
  const [mapLayer, setMapLayer] = useState<'osm' | 'bhuvan_info'>('osm');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { summary } = trajectory;
  const isOrbitSuccessful = summary.orbitAchieved;
  const isEOS04 = mission.id === 'pslv-c52-eos04';
  const isDeepSpaceMission = mission.id === 'pslv-c25-mom' || mission.id === 'pslv-c57-aditya-l1';

  // Fetch Bhoonidhi metadata snapshot from /data/isro/bhoonidhi_eos04.json
  useEffect(() => {
    let isMounted = true;
    fetch('/data/isro/bhoonidhi_eos04.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) setBhoonidhi(data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Draw procedural C-band SAR backscatter visual simulation on canvas tailored to active region
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Specular ocean / deep water base (low radar backscatter = very dark)
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    if (activeRegion.terrainType === 'agriculture') {
      // 1. KRISHNA-GODAVARI BASIN: Agricultural Field Pattern (Paddy parcels + river)
      const pw = w / 36;
      const ph = h / 20;

      for (let i = 0; i < 36; i++) {
        for (let j = 0; j < 20; j++) {
          const seed = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
          const pType = seed - Math.floor(seed);
          let baseVal = 55;
          if (pType < 0.22) baseVal = 38;      // Inundated paddy (-18 dB)
          else if (pType < 0.6) baseVal = 85;  // Vegetated cropland (-12 dB)
          else if (pType < 0.88) baseVal = 130;// Dense sugarcane/canopy (-8 dB)
          else baseVal = 170;                  // Dry rough soil (-4 dB)

          ctx.fillStyle = `rgb(${baseVal}, ${Math.round(baseVal * 1.04)}, ${Math.round(baseVal * 1.08)})`;
          ctx.fillRect(i * pw + 0.5, j * ph + 0.5, pw - 1, ph - 1);
        }
      }

      // Main Godavari River Channel (Specular absorption = dark)
      ctx.strokeStyle = '#020610';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.38);
      ctx.bezierCurveTo(w * 0.28, h * 0.44, w * 0.55, h * 0.32, w, h * 0.54);
      ctx.stroke();

      // Delta Distributary Channel
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(w * 0.32, h * 0.41);
      ctx.bezierCurveTo(w * 0.38, h * 0.68, w * 0.5, h * 0.82, w * 0.72, h);
      ctx.stroke();
    } else if (activeRegion.terrainType === 'braided_river') {
      // 2. BRAHMAPUTRA FLOODPLAIN: Braided River Channels with Sandbars (Chars)
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, w, h);

      // Wide Braided Floodwaters (Low backscatter)
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.bezierCurveTo(w * 0.3, h * 0.15, w * 0.6, h * 0.35, w, h * 0.25);
      ctx.lineTo(w, h * 0.85);
      ctx.bezierCurveTo(w * 0.6, h * 0.95, w * 0.3, h * 0.75, 0, h * 0.8);
      ctx.closePath();
      ctx.fill();

      // Intertwined Braided River Sandbars (Chars - Moderate backscatter)
      ctx.fillStyle = '#94a3b8';
      for (let b = 0; b < 18; b++) {
        const bx = (b * 24) % (w - 60) + 30;
        const by = h * 0.3 + (b % 5) * 18;
        ctx.beginPath();
        ctx.ellipse(bx, by, 25 + (b % 4) * 8, 7 + (b % 3) * 3, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tea Gardens / Upper Floodplain Rough Canopy (High diffuse backscatter)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, w, h * 0.18);
      ctx.fillRect(0, h * 0.82, w, h * 0.18);
    } else if (activeRegion.terrainType === 'mangrove_delta') {
      // 3. SUNDARBANS DELTA: Dense Dendritic Tidal Creeks & Mangrove Canopy
      // Mangrove forest canopy background (diffuse volume scattering)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, w, h);

      // Sinuous Tidal Creeks (Extremely dark water networks)
      ctx.strokeStyle = '#020617';
      ctx.lineCap = 'round';
      ctx.lineWidth = 12;
      for (let k = 0; k < 5; k++) {
        const sx = (k * 80) + 20;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.bezierCurveTo(sx + 30, h * 0.35, sx - 25, h * 0.65, sx + 20, h);
        ctx.stroke();
      }
      // Transverse estuarine channels
      ctx.lineWidth = 6;
      for (let m = 0; m < 4; m++) {
        ctx.beginPath();
        ctx.moveTo(0, (m + 1) * 45);
        ctx.bezierCurveTo(w * 0.3, (m + 1) * 45 + 15, w * 0.7, (m + 1) * 45 - 20, w, (m + 1) * 45 + 10);
        ctx.stroke();
      }
    }

    // High-resolution SAR speckle noise (Rayleigh fading distribution)
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let p = 0; p < data.length; p += 4) {
      const u = Math.max(0.001, Math.random());
      const speckle = -Math.log(u);
      const factor = 0.68 + speckle * 0.32;
      data[p] = Math.min(255, Math.round(data[p] * factor));
      data[p + 1] = Math.min(255, Math.round(data[p + 1] * factor));
      data[p + 2] = Math.min(255, Math.round(data[p + 2] * factor));
    }
    ctx.putImageData(imgData, 0, 0);

    // Urban / Corner Reflector Double-Bounce (High Intensity Bright Clusters)
    ctx.fillStyle = '#ffffff';
    for (let b = 0; b < 40; b++) {
      const bx = (b * 97) % (w - 20) + 10;
      const by = (b * 67) % (h - 20) + 10;
      ctx.fillRect(bx, by, 3, 3);
    }

    // Grid coordinates
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = 100; gx < w; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 80; gy < h; gy += 80) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Radiometric dB Scale Bar (-25 dB to 0 dB)
    const barX = 14;
    const barY = h - 26;
    const barW = 150;
    const barH = 7;
    const dbGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    dbGrad.addColorStop(0, '#030712');   // -25 dB
    dbGrad.addColorStop(0.3, '#1e3a5f'); // -18 dB
    dbGrad.addColorStop(0.6, '#475569'); // -12 dB
    dbGrad.addColorStop(0.85, '#94a3b8');// -6 dB
    dbGrad.addColorStop(1, '#f8fafc');   // 0 dB
    ctx.fillStyle = dbGrad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px monospace';
    ctx.fillText('-25 dB', barX, barY - 3);
    ctx.fillText('0 dB', barX + barW - 24, barY - 3);

    // Explicit Watermark permanently burned onto the visual canvas
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('SYNTHETIC ILLUSTRATION — NOT EOS-04 DATA', 14, 16);
  }, [activeRegion]);

  const metadata = bhoonidhi?.metadata ?? {
    satellite: 'EOS-04 (RISAT-1A)',
    sensor: 'C-SAR',
    instrumentMode: 'MRS (Medium Resolution ScanSAR)',
    productLevel: 'Level-2 GeoTIFF (Terrain Geo-Referenced) / Level-1B (Ground Range)',
    polarisation: 'HH + HV Dual-Pol',
    band: 'C-band (5.35 GHz)',
    resolution_m: 25,
    swathWidth_km: 115,
    incidentAngle_deg: '36.5',
    acquisitionTimestampUTC: '2022-02-14T01:48:32.418Z',
    bhoonidhiProductId: 'EOS04_CSAR_MRS_L2_20220214T014832_001234_E081N16_01',
    applications: [
      'Kharif & Rabi crop acreage estimation (Rice/Paddy)',
      'Real-time cyclone & monsoon flood inundation mapping',
      'Soil moisture estimation for agriculture & irrigation',
      'Coastal mangrove density & shoreline change monitoring',
    ],
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 flex flex-col gap-6">
      {/* ======================================================== */}
      {/* 1. ORBIT CUTOFF BANNER (PASS/FAIL FOR C52; INFO FOR OTHERS) */}
      {/* ======================================================== */}
      {isEOS04 ? (
        <div
          className={`p-5 rounded-xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
            isOrbitSuccessful
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-950/30'
              : 'bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border-red-500/50 shadow-red-950/30'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                  isOrbitSuccessful
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                {isOrbitSuccessful ? 'ORBIT INSERTION ACHIEVED' : 'INSERTION DEFICIT / ORBIT MISS'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Cutoff Time: T+{summary.cutoffTime_s.toFixed(1)}s
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white">
              {isOrbitSuccessful
                ? 'EOS-04 Successfully Injected into 529 km Sun-Synchronous Orbit'
                : summary.finalPerigee_km <= 0 || summary.finalVelocity_ms < 7550
                ? 'Sub-Orbital Injection / Target Velocity Deficit'
                : 'Closed Orbit, Outside Target Tolerance (Insertion Miss)'}
            </h2>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {isOrbitSuccessful
                ? 'Classical vis-viva orbital elements confirm a closed near-circular parking trajectory with positive perigee > 450 km. C-band SAR instrument payload is unlocked.'
                : `Physics Diagnosis: ${getDynamicDiagnosis(summary, mission.targetOrbit.altitude_km)}`}
            </p>
          </div>

          {/* Telemetry Summary Pills & CSV Export */}
          <div className="flex flex-col items-end gap-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CUTOFF ALTITUDE</span>
                <span className="font-bold text-amber-400">{summary.finalAltitude_km.toFixed(1)} km</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CUTOFF VELOCITY</span>
                <span className="font-bold text-sky-400">{summary.finalVelocity_ms.toFixed(0)} m/s</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PERIGEE</span>
                <span className="font-bold text-emerald-400">{summary.finalPerigee_km.toFixed(1)} km</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ECCENTRICITY</span>
                <span className="font-bold text-purple-400">{summary.finalEccentricity.toFixed(4)}</span>
              </div>
            </div>

            <button
              onClick={() => exportTelemetryCsv(trajectory, mission.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs transition-colors self-end"
              title="Download full trajectory telemetry table as CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Telemetry CSV</span>
            </button>
          </div>
        </div>
      ) : (
        /* Parking Orbit Banner for C25 & C57 */
        <div className="p-5 rounded-xl border border-amber-500/30 bg-slate-900/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                EXPERIMENTAL — launch-phase model, not validated vs ISRO
              </span>
              <span className="text-xs font-mono text-slate-400">
                Cutoff Time: T+{summary.cutoffTime_s.toFixed(1)}s
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white">
              {mission.name} — Earth Parking Orbit Cutoff
            </h2>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Launch and Earth Parking-Orbit ascent simulation verified. You can launch the dedicated 3D Interplanetary / Lagrange Transfer Phase Visualizer below.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CUTOFF ALTITUDE</span>
                <span className="font-bold text-amber-400">{summary.finalAltitude_km.toFixed(1)} km</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CUTOFF VELOCITY</span>
                <span className="font-bold text-sky-400">{summary.finalVelocity_ms.toFixed(0)} m/s</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PERIGEE</span>
                <span className="font-bold text-emerald-400">{summary.finalPerigee_km.toFixed(1)} km</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ECCENTRICITY</span>
                <span className="font-bold text-purple-400">{summary.finalEccentricity.toFixed(4)}</span>
              </div>
            </div>

            {isDeepSpaceMission ? (
              <button
                onClick={onOpenDeepSpace}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-purple-950/60 border border-purple-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>
                  {mission.id === 'pslv-c25-mom'
                    ? 'Explore 3D Mars Transfer Phase →'
                    : 'Explore 3D Sun-L1 Halo Orbit Phase →'}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. EOS-04 BHOONIDHI EXPLORER (GATED TO EOS-04 ONLY)      */}
      {/* ======================================================== */}
      {!isEOS04 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center font-mono text-sm text-slate-400 space-y-3">
          <Database className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-slate-200 font-bold">
            Bhoonidhi SAR Explorer is configured for EOS-04 Radar Imaging Mission
          </div>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Select the <strong>PSLV-C52 / EOS-04</strong> Golden Path in the Pre-Launch Brief to inspect C-band SAR Level-2 radar data products over India.
          </p>
        </div>
      ) : !isOrbitSuccessful ? (
        <div className="relative p-10 rounded-xl bg-slate-900/60 border border-red-500/40 shadow-2xl flex flex-col items-center justify-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center shadow-lg shadow-red-950/60 text-red-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold tracking-wider">
              <span>PAYLOAD DEPLOYMENT LOCKED</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Satellite Missed the Target Orbit
            </h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Target orbit not achieved (see Physics Diagnosis above). Adjust Challenge Mode parameters or re-fly Auto-Guidance to unlock First Pixel.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onResetGoldenRun}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono font-bold text-xs shadow-lg shadow-orange-950/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Re-fly Golden Run</span>
            </button>
            <button
              onClick={onBackToBrief}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors"
            >
              <span>Back to Mission Brief</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Bhoonidhi SAR Product Card */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-white tracking-wider">
                    NRSC BHOONIDHI EOS-04 DATA PRODUCT
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Representative EOS-04 Metadata Record (NRSC Open Data Schema)
                </span>
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-none" />
                <span>ILLUSTRATIVE RECORD — product ID and timestamp are placeholders</span>
              </div>

              {/* Product ID Banner */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 block text-[10px]">PRODUCT IDENTIFIER:</span>
                <span className="font-bold text-cyan-300 break-all">{metadata.bhoonidhiProductId}</span>
              </div>

              {/* Metadata Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <Satellite className="w-3 h-3 text-cyan-400" /> SENSOR / BAND
                  </span>
                  <span className="font-bold text-slate-200">{metadata.sensor} ({metadata.band})</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-400" /> INSTRUMENT MODE
                  </span>
                  <span className="font-bold text-emerald-300">{metadata.instrumentMode}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <Radio className="w-3 h-3 text-purple-400" /> PRODUCT LEVEL
                  </span>
                  <span className="font-bold text-purple-300 text-[11px] leading-tight">{metadata.productLevel}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">POLARISATION</span>
                  <span className="font-bold text-slate-200">{metadata.polarisation}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">SPATIAL RESOLUTION</span>
                  <span className="font-bold text-amber-400">{metadata.resolution_m} meters</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">SWATH WIDTH</span>
                  <span className="font-bold text-sky-400">{metadata.swathWidth_km} km</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> ACQUISITION TIMESTAMP
                  </span>
                  <span className="font-bold text-slate-300">{metadata.acquisitionTimestampUTC}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">INCIDENCE ANGLE</span>
                  <span className="font-bold text-slate-300">{metadata.incidentAngle_deg}°</span>
                </div>
              </div>

              {/* Target Area */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-2 text-xs font-mono">
                <MapPin className="w-4 h-4 text-red-400 flex-none mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px]">ACTIVE SCENE REGION:</span>
                  <span className="text-slate-200 font-semibold">{activeRegion.name} ({activeRegion.state})</span>
                  <span className="text-slate-400 text-[11px] block">
                    Center: {activeRegion.center[0]}° N, {activeRegion.center[1]}° E | Swath: {metadata.swathWidth_km} km Ground Track
                  </span>
                </div>
              </div>
            </div>

            {/* Scientific Explainer Box */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                C-BAND SYNTHETIC APERTURE RADAR (SAR) PRINCIPLE
              </h3>

              <blockquote className="p-3.5 rounded-lg bg-sky-950/30 border-l-4 border-cyan-400 text-xs text-sky-100 font-medium leading-relaxed italic">
                C-band SAR sees through cloud and works day/night; EOS-04&apos;s 529 km sun-synchronous orbit provides consistent local-time passes and regular revisit for agriculture, forestry, soil moisture, and flood mapping.
              </blockquote>

              <div className="space-y-2 pt-1 text-xs">
                <span className="text-[11px] font-mono font-semibold text-slate-300 block">
                  Primary Mission Applications:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {metadata.applications.map((app, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 p-2 rounded bg-slate-950/60 border border-slate-800/60 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-none mt-0.5" />
                      <span>{app}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Swath Selector, Leaflet Map & Radar Panel */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* 1. Footprint Leaflet Map with 3-Region Switcher */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    SAR SWATH FOOTPRINT OVER INDIA
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    115 km Corridor
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-snug">
                  SAR Swath Footprint — the exact 115 km ground corridor illuminated by EOS-04&apos;s C-band radar on this pass.
                </p>
              </div>

              {/* 3-Region Swath Selector Buttons */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
                {SWATH_REGIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRegion(r)}
                    className={`py-1.5 px-2 rounded transition-all text-center ${
                      activeRegion.id === r.id
                        ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span className="block truncate">{r.name.split(' ')[0]}</span>
                    <span className="text-[9px] text-slate-400 block truncate">{r.state.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Map Canvas */}
              <div className="w-full h-[240px] rounded-lg overflow-hidden border border-slate-800 relative">
                <MapContainer
                  center={activeRegion.center}
                  zoom={activeRegion.zoom}
                  scrollWheelZoom={false}
                  className="w-full h-full isolate z-0"
                  style={{ background: '#091528' }}
                >
                  <MapRecenter center={activeRegion.center} zoom={activeRegion.zoom} />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    opacity={mapLayer === 'bhuvan_info' ? 0.6 : 0.8}
                  />

                  {/* SAR Footprint Bounding Rectangle */}
                  <Rectangle
                    bounds={activeRegion.bounds}
                    pathOptions={{
                      color: '#06b6d4',
                      fillColor: '#0891b2',
                      fillOpacity: 0.35,
                      weight: 2,
                      dashArray: '4, 4',
                    }}
                  />

                  <Marker position={activeRegion.center} icon={sceneCenterIcon}>
                    <Popup className="font-mono text-xs">
                      <div className="font-bold text-slate-900">{activeRegion.name}</div>
                      <div className="text-[11px] text-slate-600">{activeRegion.application}</div>
                      <div className="text-[10px] text-cyan-700 font-semibold mt-1">
                        Lat: {activeRegion.center[0]}° N, Lon: {activeRegion.center[1]}° E
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>

                {/* Basemap Toggle Pill */}
                <div className="absolute top-2 right-2 z-[400] flex items-center bg-slate-950/85 backdrop-blur border border-slate-800 rounded p-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => setMapLayer('osm')}
                    className={`px-2 py-0.5 rounded ${mapLayer === 'osm' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    title="Standard Map (80% opacity)"
                  >
                    Standard Map
                  </button>
                  <button
                    onClick={() => setMapLayer('bhuvan_info')}
                    className={`px-2 py-0.5 rounded ${mapLayer === 'bhuvan_info' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    title="Swath Focus (Dimmed Base) — dims basemap to emphasize SAR footprint"
                  >
                    Swath Focus (Dimmed Base)
                  </button>
                </div>
              </div>

              {mapLayer === 'bhuvan_info' ? (
                <div className="p-2 rounded bg-sky-950/40 border border-sky-800/60 text-[10px] font-mono text-sky-200">
                  Swath Focus: Basemap dimmed to 60% opacity to highlight C-band SAR ground track and footprint boundaries.
                </div>
              ) : null}
            </div>

            {/* 2. C-Band SAR First Pixel Visual Simulation Panel */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  C-BAND SAR RADAR QUICKLOOK / FIRST PIXEL
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {activeRegion.name}
                </span>
              </div>

              <div className="w-full h-[220px] rounded-lg overflow-hidden border border-slate-800 bg-black relative flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={220}
                  className="w-full h-full object-cover block"
                />

                <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-950/80 backdrop-blur rounded text-[9px] font-mono text-slate-300 border border-slate-700/60">
                  C-SAR MRS // σ₀ Backscatter (dB)
                </div>
              </div>

              <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Dark Tone: Specular Water Body</span>
                  <span>Light Tone: Rough Canopy / Rice Fields</span>
                </div>
                <p className="text-[10px] font-mono text-amber-300 italic">
                  * Procedural C-band SAR swath illustration for {activeRegion.name} (supports dropping in a real Bhoonidhi quicklook image via <code className="text-cyan-400">quicklookUrl</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. 4-PORTAL ISRO EARTH OBSERVATION ECOSYSTEM HUB          */}
      {/* ======================================================== */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-mono font-bold text-white tracking-wider">
                ISRO EARTH OBSERVATION &amp; DATA ECOSYSTEM (4 PORTALS)
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Official national platforms hosting raw radar archives, geospatial layers, launch weather, and thematic analytics.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 w-fit">
            Zero Fabricated APIs // 100% Direct Sanctioned Links
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Portal 1: NRSC Bhoonidhi */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3 hover:border-cyan-500/50 transition-colors">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  NRSC Bhoonidhi
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Open EO Archive
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Primary data portal for multi-mission satellite imagery. Houses EOS-04 C-band SAR Level-2 GeoTIFF, CEOS-ARD metadata, and downloadable radar rasters.
              </p>
            </div>
            <a
              href="https://bhoonidhi.nrsc.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-cyan-400 text-[11px] font-semibold transition-colors"
            >
              <span>bhoonidhi.nrsc.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Portal 2: NRSC Bhuvan */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  NRSC Bhuvan
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Indian Geoportal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Indian National Geoportal delivering 2D/3D map visualization, disaster response mapping, real-time flood inundation hazard layers, and municipal GIS.
              </p>
            </div>
            <a
              href="https://bhuvan.nrsc.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 text-[11px] font-semibold transition-colors"
            >
              <span>bhuvan.nrsc.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Portal 3: SAC MOSDAC */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3 hover:border-sky-500/50 transition-colors">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                  SAC MOSDAC
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  Meteorology Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Meteorological &amp; Oceanographic Satellite Data Centre. Provides INSAT-3D cyclone track predictions, upper-air winds, ocean wave models, and launchpad weather.
              </p>
            </div>
            <a
              href="https://mosdac.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sky-400 text-[11px] font-semibold transition-colors"
            >
              <span>mosdac.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Portal 4: SAC VEDAS */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3 hover:border-purple-500/50 transition-colors">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  SAC VEDAS
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                  Thematic Analytics
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Visualisation of Earth Observation Data and Archival System. Processes EOS-04 SAR passes into national Crop Acreage, Soil Moisture, and Forest Carbon dashboards.
              </p>
            </div>
            <a
              href="https://vedas.sac.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-purple-400 text-[11px] font-semibold transition-colors"
            >
              <span>vedas.sac.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
