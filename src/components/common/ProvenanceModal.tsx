import { useEffect, useRef } from 'react';
import { X, ShieldCheck, CheckCircle2, Sliders, Info, Heart } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ProvenanceModal({ isOpen, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: focus close button on open and restore focus on close
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 0);
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* MODAL HEADER                                             */}
        {/* ======================================================== */}
        <div className="flex-none px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="provenance-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                Data Provenance, Assumptions &amp; Credits
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Scientific Honesty &amp; Technical Verification Framework
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* MODAL BODY (SCROLLABLE)                                  */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans text-slate-300">
          {/* Mission Honesty Statement */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 text-slate-300 leading-relaxed space-y-1">
            <span className="font-bold text-emerald-400 font-mono text-[11px] block">
              OUR SCIENTIFIC COMMITMENT:
            </span>
            <p>
              In adherence to hackathon evaluation guidelines and rigorous aerospace simulation standards, every metric, trajectory equation, and visual component in <strong>BharatLaunch 3D</strong> is explicitly tagged by provenance. We clearly demarcate published official data from calibrated model derivations and synthetic outputs.
            </p>
          </div>

          {/* ======================================================== */}
          {/* 3 COLOR-CODED PROVENANCE CATEGORIES                      */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-200">
              PROVENANCE CLASSIFICATION SCHEME
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category 1: REAL */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    REAL (ISRO / NRSC)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Directly sourced from published ISRO brochures, mission timelines, and official NRSC Bhoonidhi metadata standards.
                </p>
                <ul className="space-y-1 text-[11px] font-mono text-slate-300 list-disc list-inside">
                  <li>PSLV-XL 4-stage architecture &amp; 6x S12 strap-on specs</li>
                  <li>EOS-04 payload mass (1,710 kg / 1,736 kg total)</li>
                  <li>Published sequence-of-events milestones (T+70s, T+92s, T+110s, T+177s, T+263s, T+478s, T+1030s)</li>
                  <li>Target Orbit: 529 km, 97.6° SSO</li>
                  <li>Bhoonidhi C-band SAR MRS Level-2 GeoTIFF schema</li>
                  <li>ISRO Deep-Space Payload Specs: MOM (MCC, TIS, MSM, LAP, MENCA) &amp; Aditya-L1 (VELC, SUIT, SoLEXS, HEL1OS, ASPEX, PAPA, MAG)</li>
                  <li>4 Official ISRO Portals: Bhoonidhi, Bhuvan, MOSDAC, and VEDAS</li>
                </ul>
              </div>

              {/* Category 2: CALIBRATED */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    CALIBRATED (Model-Derived)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Aerodynamic and trajectory parameters balanced through numerical tuning to match published milestones within ±5%. C52 stage loads/thrust are tuned to match milestones and differ from nominal PSLV-XL values; JSON thrust fields are unused (thrust = m_dot * g0 * Isp).
                </p>
                <ul className="space-y-1 text-[11px] font-mono text-slate-300 list-disc list-inside">
                  <li>Auto-Guidance Hermite pitch schedule</li>
                  <li>Stage inert mass balance (276.6 t sim-computed GLOW)</li>
                  <li>PS4 effective thrust (9,500 N, calibrated to 533.6 km cutoff)</li>
                  <li>Piecewise Mach-dependent Cd, hand-built</li>
                  <li>Exponential atmosphere scale height (7,500 m)</li>
                </ul>
              </div>

              {/* Category 3: SYNTHETIC */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="font-mono font-bold text-purple-400 text-xs">
                    SYNTHETIC (Model Output)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Generated by physics engine calculations or procedural visual shaders; not directly recorded during the actual flight.
                </p>
                <ul className="space-y-1 text-[11px] font-mono text-slate-300 list-disc list-inside">
                  <li>Challenge Mode wind profiles (NOT live MOSDAC data)</li>
                  <li>Downrange booster splashdown corridor polygons</li>
                  <li>Continuous Max-Q &amp; Sensed G-force curves</li>
                  <li>Procedural 3D FLP launchpad, umbilical tower, Earth night-lights &amp; SAR backscatter</li>
                  <li>Schematic Deep-Space Transfer Phase (MOM Mars transfer arc &amp; Aditya-L1 Sun-L1 halo orbit; ascent physics = RK4)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MATHEMATICAL MODELS & ASSUMPTIONS                        */}
          {/* ======================================================== */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              PHYSICAL ASSUMPTIONS &amp; MODEL SIMPLIFICATIONS
            </h3>

            <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-none mt-0.5" />
                <div>
                  <strong className="text-white">Planar Ascent Trajectory (2D): </strong>
                  The simulation integrates vehicle motion in a 2D launch plane along Sriharikota&apos;s 140° azimuth. The real-world dogleg maneuver performed around Sri Lanka to prevent overflight is not modelled.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-none mt-0.5" />
                <div>
                  <strong className="text-white">Exponential Atmosphere Simplification: </strong>
                  Density follows &rho;(h) = 1.225 &middot; exp(-h / 7500) kg/m&sup3; with a Mach-dependent drag coefficient Cd(M). Dynamic temperature and local thermospheric seasonal variations are omitted.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-none mt-0.5" />
                <div>
                  <strong className="text-white">Map Tile Provider (OpenStreetMap): </strong>
                  ISRO Bhuvan tile services require dynamic token authentication that is prone to CORS and rate-limiting blocks in static frontend environments. OpenStreetMap tiles are used for the downrange map; tile rendering requires an active internet connection.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-none mt-0.5" />
                <div>
                  <strong className="text-white">Closed-Loop Auto-Guidance Law: </strong>
                  Proportional vertical-rate trim toward the mission target altitude during t &ge; 750 s; no guarantee of orbit.
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ACKNOWLEDGMENTS & CREDITS                                */}
          {/* ======================================================== */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              ACKNOWLEDGMENTS &amp; THIRD-PARTY ATTRIBUTIONS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="font-bold text-white block mb-0.5">ISRO &amp; Department of Space</span>
                <span className="text-slate-400 leading-normal block">
                  Official PSLV-C52 / EOS-04 Mission Brochure (February 2022) &amp; public launch documentation.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="font-bold text-white block mb-0.5">NRSC Bhoonidhi Portal</span>
                <span className="text-slate-400 leading-normal block">
                  National Remote Sensing Centre (NRSC) Bhoonidhi Open Data standard metadata schema for EOS-04 C-SAR.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="font-bold text-white block mb-0.5">&copy; OpenStreetMap Contributors</span>
                <span className="text-slate-400 leading-normal block">
                  Global basemap tiles provided under the Open Database License (ODbL).
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="font-bold text-white block mb-0.5">Open-Source Ecosystem</span>
                <span className="text-slate-400 leading-normal block">
                  React 18, Vite 6, TypeScript 5, Tailwind CSS, Three.js (r170), @react-three/fiber, @react-three/drei, Recharts, Leaflet, and Vitest.
                </span>
              </div>
            </div>

            {/* AI Development Disclosure */}
            <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/20 text-sky-200 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 flex-none mt-0.5" />
              <div>
                <strong>AI-Assisted Development Disclosure: </strong>
                Developed with assistance from Google DeepMind Antigravity agentic workflows for rapid numerical modeling, procedural 3D math, and automated Vitest validation.
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODAL FOOTER                                             */}
        {/* ======================================================== */}
        <div className="flex-none px-6 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            BharatLaunch 3D &bull; ASTRA 2026 Hackathon
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
