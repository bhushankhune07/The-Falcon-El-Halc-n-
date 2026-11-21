import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { Rocket, ShieldCheck, Database, Compass, Orbit } from 'lucide-react';
import {
  PRESET_MISSIONS,
  DEFAULT_MISSION_ID,
  ChallengeModeModifiers,
  SimulationEngine,
  SimulationState,
} from './sim';
import { PreLaunchBrief } from './components/brief/PreLaunchBrief';
import { LaunchView } from './components/launch/LaunchView';
import { BhoonidhiExplorer } from './components/orbit/BhoonidhiExplorer';
import { CameraMode, deriveSimFrameState } from './components/scene';
import { ProvenanceModal } from './components/common/ProvenanceModal';

export type ScreenId = 'brief' | 'launch' | 'orbit';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('brief');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(DEFAULT_MISSION_ID);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);
  const [challengeModifiers, setChallengeModifiers] = useState<ChallengeModeModifiers>({
    enabled: false,
    payloadDeltaKg: 0,
    pitchKickDeg: 0,
    windScenario: 'nominal',
  });

  const mission = PRESET_MISSIONS[selectedMissionId] || PRESET_MISSIONS[DEFAULT_MISSION_ID];

  // Wrap trajectory computation in useDeferredValue (Item D13)
  const deferredModifiers = useDeferredValue(challengeModifiers);
  const trajectory = useMemo(() => {
    const engine = new SimulationEngine(mission, deferredModifiers);
    return engine.runSimulation();
  }, [mission, deferredModifiers]);

  const [currentTime_s, setCurrentTime_s] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeWarp, setTimeWarp] = useState<number>(5);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const autoPlayNextRef = useRef<boolean>(false);

  // Reset currentTime_s to 0 when modifiers change; pause unless auto-play was explicitly requested
  useEffect(() => {
    setCurrentTime_s(0);
    if (autoPlayNextRef.current) {
      autoPlayNextRef.current = false;
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [challengeModifiers]);

  const maxTime_s = trajectory.summary.cutoffTime_s;
  const animRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Playback animation loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimestampRef.current !== null && isPlaying) {
        const dt_s = (timestamp - lastTimestampRef.current) / 1000.0;
        setCurrentTime_s((prev) => {
          const next = prev + dt_s * timeWarp;
          if (next >= maxTime_s) {
            setIsPlaying(false);
            return maxTime_s;
          }
          return next;
        });
      }
      lastTimestampRef.current = timestamp;
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, timeWarp, maxTime_s]);

  // Interpolate current simulation telemetry state
  const currentState: SimulationState = useMemo(() => {
    const states = trajectory.states;
    if (!states || states.length === 0) {
      throw new Error('Simulation states empty');
    }
    const idx = Math.min(states.length - 1, Math.max(0, Math.floor(currentTime_s)));
    const s0 = states[idx];
    const s1 = states[Math.min(states.length - 1, idx + 1)];
    const frac = currentTime_s - Math.floor(currentTime_s);

    return {
      ...s0,
      time_s: currentTime_s,
      altitude_m: s0.altitude_m + (s1.altitude_m - s0.altitude_m) * frac,
      downrange_m: s0.downrange_m + (s1.downrange_m - s0.downrange_m) * frac,
      speed_ms: s0.speed_ms + (s1.speed_ms - s0.speed_ms) * frac,
      pitch_deg: s0.pitch_deg + (s1.pitch_deg - s0.pitch_deg) * frac,
      flightPathAngle_deg: s0.flightPathAngle_deg + (s1.flightPathAngle_deg - s0.flightPathAngle_deg) * frac,
      thrust_N: frac < 0.5 ? s0.thrust_N : s1.thrust_N,
      sensedG: s0.sensedG + (s1.sensedG - s0.sensedG) * frac,
      dynamicPressure_kPa: s0.dynamicPressure_kPa + (s1.dynamicPressure_kPa - s0.dynamicPressure_kPa) * frac,
      events: s0.events.length > 0 ? s0.events : s1.events,
      activeStages: s0.activeStages,
      isOrbitAchieved: s0.isOrbitAchieved,
    };
  }, [trajectory.states, currentTime_s]);

  const simFrame = useMemo(() => {
    return deriveSimFrameState(currentState, mission);
  }, [currentState, mission]);

  // Memoize ProvenanceModal onClose (Item D13)
  const handleCloseProvenance = useCallback(() => {
    setIsProvenanceOpen(false);
  }, []);

  // Transition to Launchpad and start ascent playback
  const handleProceedToLaunch = () => {
    setCurrentTime_s(0);
    setIsPlaying(true);
    setCameraMode('pad');
    setActiveScreen('launch');
  };

  // Reset to calibrated Golden Run and automatically start playback from T-0 Pad View
  const handleResetGoldenRun = useCallback(() => {
    const isAlreadyNominal =
      !challengeModifiers.enabled &&
      challengeModifiers.payloadDeltaKg === 0 &&
      challengeModifiers.pitchKickDeg === 0 &&
      challengeModifiers.windScenario === 'nominal';

    setCurrentTime_s(0);
    setCameraMode('pad');
    setActiveScreen('launch');

    if (isAlreadyNominal) {
      setIsPlaying(true);
    } else {
      autoPlayNextRef.current = true;
      setChallengeModifiers({
        enabled: false,
        payloadDeltaKg: 0,
        pitchKickDeg: 0,
        windScenario: 'nominal',
      });
    }
  }, [challengeModifiers]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-100 font-sans overflow-hidden">
      {/* ======================================================== */}
      {/* TOP MISSION CONTROL NAVIGATION BAR                       */}
      {/* ======================================================== */}
      <header className="flex-none h-14 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-4 flex items-center justify-between z-20">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                BharatLaunch 3D
                <span className="text-[10px] font-mono font-normal text-slate-400 hidden sm:inline">
                  — T-0 to First Pixel
                </span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                ASTRA 2026
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Screen Switcher */}
        <nav className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveScreen('brief')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeScreen === 'brief'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden md:inline">1. Pre-Launch Brief</span>
            <span className="md:hidden">1. Brief</span>
          </button>

          <button
            onClick={() => setActiveScreen('launch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeScreen === 'launch'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span className="hidden md:inline">2. 3D Launch &amp; Validation</span>
            <span className="md:hidden">2. Launch</span>
          </button>

          <button
            onClick={() => setActiveScreen('orbit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeScreen === 'orbit'
                ? 'bg-emerald-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">3. Orbit &amp; Bhoonidhi Data</span>
            <span className="md:hidden">3. Orbit</span>
          </button>
        </nav>

        {/* Active Mission & Provenance Button */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">MISSION:</span>
            <span className="text-amber-400 font-semibold">{mission.variant}</span>
          </div>

          <button
            onClick={() => setIsProvenanceOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Provenance &amp; Credits</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT (SWITCHES SCREEN 1, 2, OR 3)               */}
      {/* ======================================================== */}
      <main className="flex-1 w-full h-full overflow-hidden relative">
        {activeScreen === 'brief' && (
          <PreLaunchBrief
            selectedMissionId={selectedMissionId}
            onSelectMission={(id) => {
              setSelectedMissionId(id);
              setCurrentTime_s(0);
              setIsPlaying(false);
              setCameraMode('pad');
            }}
            modifiers={challengeModifiers}
            onUpdateModifiers={setChallengeModifiers}
            trajectory={trajectory}
            onProceedToLaunch={handleProceedToLaunch}
          />
        )}

        {activeScreen === 'launch' && (
          <LaunchView
            mission={mission}
            trajectory={trajectory}
            currentState={currentState}
            simFrame={simFrame}
            currentTime_s={currentTime_s}
            onSeek={setCurrentTime_s}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            timeWarp={timeWarp}
            onSetTimeWarp={setTimeWarp}
            cameraMode={cameraMode}
            onSetCameraMode={setCameraMode}
            onSkipToOrbit={() => setActiveScreen('orbit')}
          />
        )}

        {activeScreen === 'orbit' && (
          <BhoonidhiExplorer
            mission={mission}
            trajectory={trajectory}
            modifiers={challengeModifiers}
            onBackToBrief={() => setActiveScreen('brief')}
            onBackToLaunch={() => setActiveScreen('launch')}
            onResetGoldenRun={handleResetGoldenRun}
          />
        )}
      </main>

      {/* Data Provenance & Scientific Honesty Modal */}
      <ProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={handleCloseProvenance}
      />
    </div>
  );
}
