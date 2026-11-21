import { Award, Sliders, Wind, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react';
import { ChallengeModeModifiers, TrajectoryResult, PRESET_MISSIONS, MissionConfig } from '../../sim';
import { DownrangeMap } from './DownrangeMap';

interface Props {
  selectedMissionId: string;
  onSelectMission: (id: string) => void;
  modifiers: ChallengeModeModifiers;
  onUpdateModifiers: (mods: ChallengeModeModifiers) => void;
  trajectory: TrajectoryResult;
  onProceedToLaunch: () => void;
}

function computeGLOW(m: MissionConfig): string {
  const stageMass = m.stages.reduce(
    (sum, s) => sum + (s.dryMassPerUnit_kg + s.propellantMassPerUnit_kg) * (s.count ?? 1),
    0
  );
  const totalKg = stageMass + m.fairing.mass_kg + m.payloadMass_kg;
  return `${(totalKg / 1000).toFixed(1)} t`;
}

function getPredictedOutcomePreview(
  modifiers: ChallengeModeModifiers,
  s: TrajectoryResult['summary']
): string {
  if (!modifiers.enabled) {
    return 'Nominal gravity turn profile: Calibrated for stable orbit injection and minimal insertion residuals.';
  }

  const verdict = `RK4 solver result: ${s.orbitAchieved ? 'orbit insertion achieved' : 'target orbit NOT achieved'} (cutoff ${s.finalAltitude_km.toFixed(1)} km, perigee ${s.finalPerigee_km.toFixed(1)} km).`;

  const notes: string[] = [];
  if (modifiers.payloadDeltaKg > 800) {
    notes.push(`Heavy payload overload (+${modifiers.payloadDeltaKg} kg) imposes substantial delta-V penalty, risking sub-orbital velocity shortfall.`);
  } else if (modifiers.payloadDeltaKg > 200) {
    notes.push(`Payload increase (+${modifiers.payloadDeltaKg} kg) depresses terminal cutoff velocity; increases propellant exhaustion risk.`);
  } else if (modifiers.payloadDeltaKg < -200) {
    notes.push(`Reduced payload mass (${modifiers.payloadDeltaKg} kg) yields delta-V surplus; orbit injection cutoff will reach higher elliptical orbit.`);
  }

  if (modifiers.pitchKickDeg > 2.0) {
    notes.push(`Steep gravity turn (+${modifiers.pitchKickDeg.toFixed(1)}°) lowers flight path angle prematurely, elevating Max-Q dynamic pressure in dense troposphere.`);
  } else if (modifiers.pitchKickDeg < -2.0) {
    notes.push(`Lofted ascent (${modifiers.pitchKickDeg.toFixed(1)}°) wastes delta-V against gravity drag, lofting apogee while compromising perigee insertion.`);
  }

  if (modifiers.windScenario === 'high_crosswind') {
    notes.push('Jet-stream crosswind induces elevated aerodynamic drag and Max-Q side-load penalties during transonic transition.');
  }

  const detail = notes.length > 0
    ? notes.join(' ')
    : 'Small perturbation: outcome depends on the RK4 result shown above.';

  return `${verdict} ${detail}`;
}

export function PreLaunchBrief({
  selectedMissionId,
  onSelectMission,
  modifiers,
  onUpdateModifiers,
  trajectory,
  onProceedToLaunch,
}: Props) {
  const currentMission = PRESET_MISSIONS[selectedMissionId] || PRESET_MISSIONS['pslv-c52-eos04'];

  // Engineering Readout metrics derived from simulation
  const payloadDelta = modifiers.enabled ? modifiers.payloadDeltaKg : 0;
  const totalPayloadKg = currentMission.payloadMass_kg + payloadDelta;
  const t0State = trajectory.states[0];
  const liftoffTWR = t0State && t0State.totalMass_kg > 0
    ? (t0State.thrust_N / (t0State.totalMass_kg * 9.80665)).toFixed(2)
    : '1.68';
  const predictedImpact = getPredictedOutcomePreview(modifiers, trajectory.summary);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 flex flex-col gap-6">
      {/* ======================================================== */}
      {/* BRIEF HEADER BANNER                                      */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              MISSION BRIEFING // T-0 PREPARATION
            </span>
            <span className="text-xs font-mono text-slate-400">SDSC SHAR FLP</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {currentMission.name}
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            {currentMission.description}
          </p>
        </div>

        <button
          onClick={onProceedToLaunch}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono font-bold text-sm shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>PROCEED TO LAUNCHPAD (T-0)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* MAIN BRIEF CONTENT GRID                                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Mission Architecture & Guidance */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 1. MISSION PRESET SELECTOR */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-mono font-semibold text-slate-200 tracking-wider">
              SELECT MISSION PRESET
            </h3>

            <div className="flex flex-col gap-2.5">
              {/* Preset 1: PSLV-C52 / EOS-04 (Default Golden Path) */}
              <button
                onClick={() => onSelectMission('pslv-c52-eos04')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedMissionId === 'pslv-c52-eos04'
                    ? 'bg-slate-900/90 border-orange-500/80 shadow-md shadow-orange-500/10'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    PSLV-C52 / EOS-04
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Award className="w-2.5 h-2.5" /> GOLDEN PATH
                    </span>
                  </span>
                  {selectedMissionId === 'pslv-c52-eos04' ? (
                    <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  ) : null}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  PSLV-XL 4-stage vehicle carrying RISAT-1A (EOS-04) into 529 km Sun-Synchronous Orbit. Unlocks Bhoonidhi C-band SAR satellite explorer.
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>GLOW: {computeGLOW(PRESET_MISSIONS['pslv-c52-eos04'])}</span>
                  <span>Payload: 1,736 kg</span>
                  <span className="text-cyan-400">Target: 529 km SSO</span>
                </div>
              </button>

              {/* Preset 2: PSLV-C25 / Mangalyaan (MOM) */}
              <button
                onClick={() => onSelectMission('pslv-c25-mom')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedMissionId === 'pslv-c25-mom'
                    ? 'bg-slate-900/90 border-cyan-500/80 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">PSLV-C25 / Mangalyaan (MOM)</span>
                  {selectedMissionId === 'pslv-c25-mom' ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  ) : null}
                </div>
                <div className="mb-2 flex flex-col gap-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    EXPERIMENTAL — launch-phase model, not validated vs ISRO
                  </span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/60 text-slate-400">
                    Launch &amp; Earth Parking-Orbit Phase only — interplanetary cruise not modelled
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>GLOW: {computeGLOW(PRESET_MISSIONS['pslv-c25-mom'])}</span>
                  <span>Craft: 1,337 kg</span>
                  <span className="text-cyan-400">Target: 250 km Parking Orbit</span>
                </div>
              </button>

              {/* Preset 3: PSLV-C57 / Aditya-L1 */}
              <button
                onClick={() => onSelectMission('pslv-c57-aditya-l1')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedMissionId === 'pslv-c57-aditya-l1'
                    ? 'bg-slate-900/90 border-amber-500/80 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">PSLV-C57 / Aditya-L1</span>
                  {selectedMissionId === 'pslv-c57-aditya-l1' ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  ) : null}
                </div>
                <div className="mb-2 flex flex-col gap-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    EXPERIMENTAL — launch-phase model, not validated vs ISRO
                  </span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/60 text-slate-400">
                    Launch &amp; Earth Parking-Orbit Phase only — L1 cruise not modelled
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>GLOW: {computeGLOW(PRESET_MISSIONS['pslv-c57-aditya-l1'])}</span>
                  <span>Observatory: 1,481 kg</span>
                  <span className="text-cyan-400">Target: 235 km Parking Orbit</span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. GUIDANCE & CHALLENGE MODE TOGGLE */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-mono font-semibold text-slate-200 tracking-wider">
                  GUIDANCE MODE
                </h3>
              </div>

              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => onUpdateModifiers({ ...modifiers, enabled: false })}
                  className={`px-3 py-1 rounded transition-colors ${
                    !modifiers.enabled
                      ? 'bg-orange-500 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Auto-Guidance
                </button>
                <button
                  onClick={() => onUpdateModifiers({ ...modifiers, enabled: true })}
                  className={`px-3 py-1 rounded transition-colors ${
                    modifiers.enabled
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Challenge Mode
                </button>
              </div>
            </div>

            {/* Challenge Mode Parameter Sliders */}
            {modifiers.enabled ? (
              <div className="space-y-4 p-3.5 rounded-lg bg-slate-950/80 border border-amber-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 font-semibold border-b border-slate-800 pb-2">
                  <span>MODIFIER PERTURBATIONS</span>
                  <span className="text-[10px] text-slate-400 font-normal">Active Stress-Test</span>
                </div>

                {/* Slider 1: Payload Mass Delta */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">Payload Mass Delta:</span>
                    <span className="font-bold text-amber-400">
                      {modifiers.payloadDeltaKg >= 0 ? `+${modifiers.payloadDeltaKg}` : modifiers.payloadDeltaKg} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-500}
                    max={1500}
                    step={50}
                    value={modifiers.payloadDeltaKg}
                    onChange={(e) =>
                      onUpdateModifiers({ ...modifiers, payloadDeltaKg: parseInt(e.target.value) })
                    }
                    className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>-500 kg (Light)</span>
                    <span>0 kg (Nominal)</span>
                    <span>+1500 kg (Overload)</span>
                  </div>
                </div>

                {/* Slider 2: Pitch Kick Delta */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">Pitch Kick Bias:</span>
                    <span className="font-bold text-cyan-400">
                      {modifiers.pitchKickDeg >= 0 ? `+${modifiers.pitchKickDeg.toFixed(1)}` : modifiers.pitchKickDeg.toFixed(1)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-5.0}
                    max={5.0}
                    step={0.5}
                    value={modifiers.pitchKickDeg}
                    onChange={(e) =>
                      onUpdateModifiers({ ...modifiers, pitchKickDeg: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>-5° (Lofted climb)</span>
                    <span>0° (Calibrated)</span>
                    <span>+5° (Shallow burn)</span>
                  </div>
                </div>

                {/* Selector 3: Wind Scenario Preset */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-blue-400" />
                      Atmospheric Wind Preset:
                    </span>
                    <span className="font-bold text-sky-400 uppercase text-[11px]">
                      {modifiers.windScenario === 'high_crosswind' ? 'Jet-stream headwind' : modifiers.windScenario}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {(['nominal', 'moderate', 'high_crosswind'] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => onUpdateModifiers({ ...modifiers, windScenario: w })}
                        className={`py-1.5 px-2 rounded border text-center transition-all ${
                          modifiers.windScenario === w
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {w === 'nominal' ? 'Nominal' : w === 'moderate' ? 'Moderate' : 'Jet-stream headwind'}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono text-slate-400 gap-1 pt-1">
                    <span className="italic">
                      * Synthetic upper-air wind scenarios inspired by SAC MOSDAC cyclone/wind profiles.
                    </span>
                    <a
                      href="https://mosdac.gov.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-semibold flex-none"
                    >
                      <span>SAC MOSDAC Portal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                {/* 4. Live Student Engineering Readout Card */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold">
                    <span>LIVE ENGINEERING READOUT</span>
                    <span className="text-[10px] text-slate-400 font-normal">RK4 Solver Prediction</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">LIFTOFF TWR</span>
                      <span className="font-bold text-amber-400">{liftoffTWR} <span className="text-[10px] text-slate-400">T/W</span></span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">TOTAL PAYLOAD</span>
                      <span className="font-bold text-sky-400">{totalPayloadKg.toLocaleString()} <span className="text-[10px] text-slate-400">kg</span></span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono leading-relaxed">
                    <span className="text-slate-400 block text-[9px] font-bold text-amber-400 mb-1">PREDICTED OUTCOME PREVIEW:</span>
                    <p className="text-slate-300 text-[10px]">{predictedImpact}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
                <span>
                  Auto-Guidance active: Calibrated pitch law targetting {currentMission.targetOrbit.altitude_km} km {currentMission.targetOrbit.type}.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Leaflet Downrange Map */}
        <div className="lg:col-span-7 flex flex-col min-h-[460px]">
          <DownrangeMap mission={currentMission} trajectory={trajectory} />
        </div>
      </div>
    </div>
  );
}
