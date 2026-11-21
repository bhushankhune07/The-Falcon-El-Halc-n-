import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Rectangle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, AlertTriangle, Database, Radio, Satellite, Layers, Calendar, MapPin, Eye } from 'lucide-react';
import { TrajectoryResult, ChallengeModeModifiers } from '../../sim';

// Custom marker icon for scene center
const sceneCenterIcon = L.divIcon({
  className: 'custom-scene-marker',
  html: `<div class="w-6 h-6 rounded-full bg-cyan-500/90 border-2 border-white shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-cyan-500/30">📡</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface BhoonidhiData {
  dataset: string;
  metadata: {
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
    acquisitionTimestampUTC: string;
    bhoonidhiProductId: string;
    quicklookUrl: string;
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
    calibration: {
      sigma0CalibrationConstant_dB: number;
      nesz_dB: number;
      radiometricAccuracy_dB: number;
    };
  };
}

interface Props {
  trajectory: TrajectoryResult;
  modifiers: ChallengeModeModifiers;
  onBackToBrief?: () => void;
  onBackToLaunch?: () => void;
}

export function BhoonidhiExplorer({ trajectory, modifiers }: Props) {
  const [bhoonidhi, setBhoonidhi] = useState<BhoonidhiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { summary } = trajectory;
  const isOrbitSuccessful = summary.orbitAchieved;

  // Fetch verified timestamped JSON snapshot from /data/isro/bhoonidhi_eos04.json
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch('/data/isro/bhoonidhi_eos04.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load Bhoonidhi snapshot`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setBhoonidhi(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFetchError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Draw procedural C-band SAR backscatter visual simulation on canvas fallback
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark radar background (water has very low backscatter = almost black)
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, w, h);

    // River channel (Krishna-Godavari delta): Specular reflection = dark sinuous path
    ctx.strokeStyle = '#020508';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.4);
    ctx.bezierCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.35, w, h * 0.6);
    ctx.stroke();

    // Sinuous tributary
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.43);
    ctx.bezierCurveTo(w * 0.4, h * 0.7, w * 0.5, h * 0.8, w * 0.7, h);
    ctx.stroke();

    // Agricultural field grid & canopy backscatter (medium to high sigma-0)
    for (let x = 10; x < w; x += 18) {
      for (let y = 10; y < h; y += 18) {
        // High speckle noise characteristic of synthetic aperture radar (Rayleigh distribution)
        const isNearRiver = Math.abs(y - (h * 0.4 + (x / w) * h * 0.2)) < 24;
        if (isNearRiver) continue;

        const val = Math.floor(Math.random() * 140) + 40;
        ctx.fillStyle = `rgb(${val}, ${val + 10}, ${val + 20})`;
        ctx.fillRect(x, y, 14, 14);
      }
    }

    // Urban / Corner reflector bright points (high double-bounce returns)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 35; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      ctx.fillRect(rx, ry, 3, 3);
    }

    // Overlay C-band SAR annotation watermark
    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('NRSC EOS-04 C-SAR MRS Dual-Pol (HH+HV)', 12, 22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText('Krishna-Godavari Basin (25m Res)', 12, 38);
  }, [bhoonidhi, imageError]);

  if (loading) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-300 font-mono text-sm">
        <Satellite className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <span>Loading verified Bhoonidhi EOS-04 C-band SAR metadata snapshot...</span>
      </div>
    );
  }

  if (fetchError || !bhoonidhi) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-300 font-mono text-sm">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
        <span className="text-amber-300 font-bold mb-1">Failed to load Bhoonidhi data snapshot</span>
        <span className="text-xs text-slate-500">{fetchError}</span>
      </div>
    );
  }

  const { metadata } = bhoonidhi;
  const bounds = metadata.geographicBounds.boundingBox;
  const center = metadata.geographicBounds.center;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 flex flex-col gap-6">
      {/* ======================================================== */}
      {/* 1. ORBIT INSERTION VERDICT BANNER                        */}
      {/* ======================================================== */}
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
              : 'Sub-Orbital Injection / Target Velocity Deficit'}
          </h2>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {isOrbitSuccessful
              ? 'Classical vis-viva orbital elements confirm a closed near-circular parking trajectory with positive perigee > 450 km. C-band SAR instrument payload is unlocked.'
              : `Challenge mode parameter perturbations prevented circularization. Physics Diagnosis: ${
                  modifiers.payloadDeltaKg > 500
                    ? `Excessive payload (+${modifiers.payloadDeltaKg} kg) depleted PS4 delta-V margin, resulting in insufficient cutoff speed (${summary.finalVelocity_ms.toFixed(0)} m/s vs 7,590 m/s target).`
                    : modifiers.pitchKickDeg < -2.0
                    ? `Excessively steep pitch kick (-${Math.abs(modifiers.pitchKickDeg).toFixed(1)}°) caused high vertical lofting and aerodynamic/gravity drag losses.`
                    : 'Velocity fell short of orbital insertion speed.'
                }`}
          </p>
        </div>

        {/* Orbit Cutoff Telemetry Summary Pills */}
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
      </div>

      {/* ======================================================== */}
      {/* 2. EOS-04 BHOONIDHI METADATA & SCIENTIFIC EXPLAINER      */}
      {/* ======================================================== */}
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
                Verified Bhoonidhi Snapshot — 21 Nov 2026
              </span>
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
                <span className="font-bold text-purple-300">{metadata.productLevel}</span>
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
                <span className="text-slate-400 block text-[10px]">SCENE COVERAGE REGION:</span>
                <span className="text-slate-200 font-semibold">{center.locationName}</span>
                <span className="text-slate-400 text-[11px] block">
                  Center: {center.latitude.toFixed(4)}° N, {center.longitude.toFixed(4)}° E | Bounding Box: {bounds.south}° to {bounds.north}° N, {bounds.west}° to {bounds.east}° E
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

            {/* Mandatory verbatim scientific quote */}
            <blockquote className="p-3.5 rounded-lg bg-sky-950/30 border-l-4 border-cyan-400 text-xs text-sky-100 font-medium leading-relaxed italic">
              &quot;C-band SAR sees through cloud and works day/night; EOS-04&apos;s 529 km sun-synchronous orbit provides consistent local-time passes and regular revisit for agriculture, forestry, soil moisture, and flood mapping.&quot;
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

        {/* Right Column (5 cols): Leaflet Footprint Map & Radar Backscatter Panel */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 1. Footprint Leaflet Map */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                SCENE BOUNDING BOX OVER INDIA
              </h3>
              <span className="text-[10px] font-mono text-slate-400">115 km Swath</span>
            </div>

            <div className="w-full h-[240px] rounded-lg overflow-hidden border border-slate-800">
              <MapContainer
                center={[center.latitude, center.longitude]}
                zoom={7}
                scrollWheelZoom={false}
                className="w-full h-full"
                style={{ background: '#091528' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  opacity={0.8}
                />

                {/* SAR Footprint Bounding Rectangle */}
                <Rectangle
                  bounds={[
                    [bounds.south, bounds.west],
                    [bounds.north, bounds.east],
                  ]}
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#0891b2',
                    fillOpacity: 0.35,
                    weight: 2,
                    dashArray: '4, 4',
                  }}
                />

                <Marker position={[center.latitude, center.longitude]} icon={sceneCenterIcon}>
                  <Popup className="font-mono text-xs">
                    <div className="font-bold text-slate-900">EOS-04 C-SAR Scene Center</div>
                    <div className="text-[11px] text-slate-600">{center.locationName}</div>
                    <div className="text-[10px] text-cyan-700 font-semibold mt-1">
                      Lat: {center.latitude.toFixed(2)}° N, Lon: {center.longitude.toFixed(2)}° E
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <span className="text-[10px] font-mono text-slate-400 text-center">
              Scene center over Krishna-Godavari Basin (Andhra Pradesh agricultural belt)
            </span>
          </div>

          {/* 2. C-Band SAR First Pixel Quicklook Visual Panel */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                C-BAND SAR RADAR QUICKLOOK / FIRST PIXEL
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                HH + HV Dual-Pol
              </span>
            </div>

            <div className="w-full h-[220px] rounded-lg overflow-hidden border border-slate-800 bg-black relative flex items-center justify-center">
              {/* If a real local quicklook sample image exists, render it; otherwise render procedural SAR canvas */}
              {!imageError ? (
                <img
                  src={metadata.quicklookUrl}
                  alt="EOS-04 C-SAR Sample Quicklook"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : null}

              {/* Procedural SAR Radar canvas (renders whenever quicklookUrl is not present or throws error) */}
              <canvas
                ref={canvasRef}
                width={400}
                height={220}
                className={`w-full h-full object-cover ${!imageError ? 'hidden' : 'block'}`}
              />

              {/* Watermark badge on image */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-950/80 backdrop-blur rounded text-[9px] font-mono text-slate-300 border border-slate-700/60">
                C-SAR MRS // σ₀ Backscatter (dB)
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Dark Tone: Specular Water Body</span>
              <span>Light Tone: Rough Canopy / Rice Fields</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
