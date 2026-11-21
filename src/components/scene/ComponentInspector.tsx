import { X, Layers, Radio, Cpu, Wrench, Shield, CheckCircle2 } from 'lucide-react';
import { InspectableComponent } from './inspectData';

interface Props {
  component: InspectableComponent | null;
  onClose: () => void;
}

export function ComponentInspector({ component, onClose }: Props) {
  if (!component) return null;

  const categoryColor = {
    stage: 'border-orange-500/50 bg-orange-950/40 text-orange-400',
    payload: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400',
    instrument: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-400',
    structure: 'border-purple-500/50 bg-purple-950/40 text-purple-400',
  }[component.category];

  const categoryIcon = {
    stage: <Layers className="w-4 h-4 text-orange-400" />,
    payload: <Cpu className="w-4 h-4 text-emerald-400" />,
    instrument: <Radio className="w-4 h-4 text-cyan-400" />,
    structure: <Shield className="w-4 h-4 text-purple-400" />,
  }[component.category];

  return (
    <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-[420px] max-w-full bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/50">
        <div className="flex items-center gap-2">
          {categoryIcon}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              {component.mission}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold w-fit uppercase ${categoryColor}`}
            >
              {component.category}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* Component Title */}
        <div>
          <h2 className="text-base font-bold text-white leading-snug">{component.name}</h2>
          <span className="text-[11px] text-cyan-400 block mt-0.5">
            {component.propellantOrSensor}
          </span>
        </div>

        {/* Primary Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {component.thrustOrResolution ? (
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">
                Thrust / Resolution
              </span>
              <span className="font-bold text-amber-400 break-words">
                {component.thrustOrResolution}
              </span>
            </div>
          ) : null}

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">
              Mass &amp; Dimensions
            </span>
            <span className="font-bold text-slate-200 break-words">
              {component.dimensionsOrMass}
            </span>
          </div>
        </div>

        {/* Real ISRO Role & Operational Significance */}
        <div className="p-3.5 rounded-lg bg-sky-950/30 border border-sky-800/50 space-y-1.5">
          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            Operational Role &amp; Significance
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {component.isroRole}
          </p>
        </div>

        {/* Detailed Technical Specs Table */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Technical Subsystems &amp; Parameters
          </span>
          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
            {Object.entries(component.technicalSpecs).map(([key, val]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 gap-1 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5 flex-none font-medium">
                  <CheckCircle2 className="w-3 h-3 text-cyan-500 flex-none" />
                  {key}
                </span>
                <span className="text-slate-200 font-semibold text-right sm:max-w-[60%] break-words">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Verified ISRO Mission Spec</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
