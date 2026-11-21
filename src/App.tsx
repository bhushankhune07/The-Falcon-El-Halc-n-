import { Rocket, Orbit, Database, ShieldCheck } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              BharatLaunch 3D <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">ASTRA 2026</span>
            </h1>
            <p className="text-xs text-slate-400">ISRO Rocket Ascent Simulator &amp; Bhoonidhi Data Explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Provenance &amp; Credits
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl text-center space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-200 to-cyan-400 bg-clip-text text-transparent">
            T-0 to First Pixel
          </h2>
          <p className="text-sm text-slate-400">
            High-fidelity PSLV-XL ascent trajectory simulation, decoupled RK4 physics engine, procedural 3D staging, and NRSC Bhoonidhi Earth Observation data integration.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <Rocket className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <span>RK4 Ascent Engine</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <Orbit className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <span>Two-Scene 3D View</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <Database className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <span>Bhoonidhi Radar Swath</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
