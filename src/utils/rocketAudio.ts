/**
 * Procedural Rocket Audio Synthesizer (Web Audio API)
 * 100% browser-native & zero external audio files.
 * Synthesizes low-frequency combustion rumble with atmospheric vacuum attenuation.
 */

export interface RocketAudioManager {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => boolean;
  update: (thrust_N: number, altitude_m: number, isPlaying: boolean) => void;
  dispose: () => void;
}

export function createRocketAudio(): RocketAudioManager {
  let ctx: AudioContext | null = null;
  let noiseNode: AudioBufferSourceNode | null = null;
  let filterNode: BiquadFilterNode | null = null;
  let gainNode: GainNode | null = null;
  let isAudioEnabled = false;

  const initContext = () => {
    if (ctx) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      ctx = new AudioContextClass();

      // Generate 2 seconds of procedural pink/brownian noise
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brownian noise filter (integrated white noise) with slight high-frequency crackle
        lastOut = (lastOut + 0.025 * white) / 1.025;
        output[i] = lastOut * 3.5 + white * 0.08;
      }

      noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Resonant Lowpass Filter for engine rumble
      filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(110, ctx.currentTime);
      filterNode.Q.setValueAtTime(2.2, ctx.currentTime);

      // Master Gain Node (defaults to 0 / muted)
      gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);

      noiseNode.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseNode.start(0);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  return {
    isEnabled: () => isAudioEnabled,

    setEnabled: (enabled: boolean) => {
      isAudioEnabled = enabled;
      if (isAudioEnabled) {
        initContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } else if (gainNode && ctx) {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      }
    },

    toggle: () => {
      isAudioEnabled = !isAudioEnabled;
      if (isAudioEnabled) {
        initContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } else if (gainNode && ctx) {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      }
      return isAudioEnabled;
    },

    update: (thrust_N: number, altitude_m: number, isPlaying: boolean) => {
      if (!isAudioEnabled || !ctx || !gainNode || !filterNode) return;

      if (!isPlaying || thrust_N < 1000) {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        return;
      }

      // Atmospheric acoustic transmission factor (attenuates to silence in vacuum above 50 km)
      const densityAttenuation = Math.max(0, Math.exp(-altitude_m / 14000.0) - 0.02);

      // Throttle normalization (0 to 1)
      const throttle = Math.min(1.0, Math.max(0.15, thrust_N / 4800000.0));

      // Cutoff frequency scales with thrust (80 Hz to 180 Hz)
      const targetFreq = 80 + throttle * 90;
      filterNode.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);

      // Volume: audible only when atmosphere present
      const targetVol = throttle * densityAttenuation * 0.35;
      gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.06);
    },

    dispose: () => {
      try {
        if (noiseNode) {
          noiseNode.stop();
          noiseNode.disconnect();
        }
        if (filterNode) filterNode.disconnect();
        if (gainNode) gainNode.disconnect();
        if (ctx && ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {
        // Safe disposal
      }
      ctx = null;
      noiseNode = null;
      filterNode = null;
      gainNode = null;
    },
  };
}
