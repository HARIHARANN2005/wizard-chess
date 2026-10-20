/**
 * Wizard Chess 3D - Sacred Sanctum Audio Engine
 * High-fidelity procedural Web Audio API synthesis for ambient cathedral acoustics
 * and tactile sculpted stone piece interactions.
 */

class WizardSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private isMuted: boolean = false;
  private isAmbientRunning: boolean = false;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private listeners: Set<(enabled: boolean) => void> = new Set();
  private userInteracted: boolean = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // Load persisted sound preference (default to enabled = true)
    try {
      const stored = localStorage.getItem('wizard_chess_sound_enabled');
      if (stored !== null) {
        this.isMuted = stored === 'false';
      }
    } catch {
      this.isMuted = false;
    }

    // Auto-resume on first user gesture
    const handleGesture = () => {
      this.userInteracted = true;
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.isMuted && !this.isAmbientRunning) {
        this.startAmbientCathedral();
      }
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Ambient Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // Create Cathedral Reverb Impulse Response
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createCathedralImpulseResponse(this.ctx, 2.6, 2.2);

      const reverbDryWet = this.ctx.createGain();
      reverbDryWet.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.reverbNode.connect(reverbDryWet);
      reverbDryWet.connect(this.masterGain);

      if (!this.isMuted && this.userInteracted) {
        this.startAmbientCathedral();
      }
    } catch (err) {
      console.warn('Web Audio initialization error:', err);
    }

    return this.ctx;
  }

  /**
   * Generates a stereo synthetic impulse response modeling a vast vaulted stone cathedral.
   */
  private createCathedralImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);

    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        // Exponential decay envelope modulated with subtle cavernous room resonances
        const envelope = Math.pow(1 - t / duration, decay);
        const noise = (Math.random() * 2 - 1) * envelope;
        data[i] = noise;
      }
    }
    return impulse;
  }

  /**
   * Starts procedural ambient cathedral soundscape:
   * Low Gothic organ pedal drone, cavernous resonant draft, and sacred fifth harmonics.
   */
  private startAmbientCathedral(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.isAmbientRunning || !this.ambientGain) return;
    this.isAmbientRunning = true;

    try {
      // 1. Gothic Cathedral Harmonic Drone Oscillators (A1: 55Hz, A2: 110Hz, E3: 164.8Hz, A3: 220Hz)
      const freqs = [55, 110, 164.81, 220];
      const gains = [0.12, 0.08, 0.05, 0.03];
      const types: OscillatorType[] = ['sine', 'triangle', 'sine', 'sine'];

      this.ambientOscillators = [];

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = types[i];
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Gentle chorus drift
        osc.detune.setValueAtTime((i - 1.5) * 4.0, ctx.currentTime);

        g.gain.setValueAtTime(gains[i], ctx.currentTime);
        osc.connect(g);
        g.connect(this.ambientGain!);
        osc.start();
        this.ambientOscillators.push(osc);
      });

      // 2. Cavernous stone draft / vaulted ceiling air sweep
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Low-pass filtered pink noise for gentle wind draft
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(180, ctx.currentTime);
      bandpass.Q.setValueAtTime(2.5, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, ctx.currentTime);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.ambientGain!);

      noiseSource.start();
      this.ambientNoiseSource = noiseSource;
    } catch (e) {
      console.warn('Ambient cathedral soundscape error:', e);
    }
  }

  private stopAmbientCathedral(): void {
    this.ambientOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.ambientOscillators = [];

    if (this.ambientNoiseSource) {
      try {
        this.ambientNoiseSource.stop();
        this.ambientNoiseSource.disconnect();
      } catch {}
      this.ambientNoiseSource = null;
    }
    this.isAmbientRunning = false;
  }

  // =========================================================================
  // Public Controls & Toggle
  // =========================================================================

  public isEnabled(): boolean {
    return !this.isMuted;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.userInteracted = true;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    this.isMuted = !enabled;

    if (this.masterGain && ctx) {
      // Smooth fade to prevent audio clicks/pops
      const targetGain = enabled ? 1.0 : 0.0;
      this.masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.035);
    }

    if (enabled && !this.isAmbientRunning) {
      this.startAmbientCathedral();
    }

    try {
      localStorage.setItem('wizard_chess_sound_enabled', enabled ? 'true' : 'false');
    } catch {}

    this.notifyListeners(enabled);
    this.updateDOMButtons(enabled);

    // Subtle audible confirmation chime if enabled
    if (enabled) {
      setTimeout(() => this.playSelectSound(), 50);
    }
  }

  public toggleSound(forcedState?: boolean): boolean {
    const nextState = forcedState !== undefined ? forcedState : this.isMuted;
    this.setSoundEnabled(nextState);
    return nextState;
  }

  public addListener(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(!this.isMuted);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(enabled: boolean): void {
    this.listeners.forEach((fn) => {
      try {
        fn(enabled);
      } catch {}
    });
  }

  private updateDOMButtons(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    const btns = document.querySelectorAll('#btn-sound-toggle, .btn-sound-toggle');
    btns.forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.textContent = enabled ? 'Sound Effects: ON' : 'Sound Effects: Muted';
      el.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      if (enabled) {
        el.classList.add('active');
        el.classList.remove('muted');
      } else {
        el.classList.remove('active');
        el.classList.add('muted');
      }
    });
  }

  // =========================================================================
  // Tactile Piece & Game Sound Synthesizers
  // =========================================================================

  /**
   * Piece selection: Resonant stone chime and crisp crystal transient
   */
  public playSelectSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;

      // Resonant harmonic stone chime (A5 + E6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(540, now + 0.14);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now); // A5
      osc2.frequency.exponentialRampToValueAtTime(820, now + 0.12);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      // High stone tap click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1400, now);
      clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

      clickGain.gain.setValueAtTime(0.28, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      clickOsc.start(now);

      osc1.stop(now + 0.16);
      osc2.stop(now + 0.16);
      clickOsc.stop(now + 0.04);
    } catch {}
  }

  /**
   * Deselect / cancel selection: Subtle muted stone pedestal tap
   */
  public playDeselectSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /**
   * Piece movement slide: Heavy sculpted stone sliding across polished marble altar
   */
  public playMoveSlideSound(duration: number = 0.5): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const dur = Math.max(0.2, Math.min(1.2, duration));

      // Filtered noise simulating stone texture sliding over marble
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + dur);
      filter.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + dur * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + dur);
    } catch {}
  }

  /**
   * Piece landing / placement: Solid stone pedestal resting with subtle altar thud
   */
  public playMoveLandSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.12);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  /**
   * Combat melee swing: Heavy stone blade cleave / whoosh
   */
  public playMeleeSwingSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const dur = 0.24;

      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + dur);
      filter.Q.setValueAtTime(2.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + dur);
    } catch {}
  }

  /**
   * Stone shatter explosion: The iconic Wizard Chess melee destruction!
   * Multi-layered sub-bass shockwave, violent stone fracturing crack, and tumbling stone shard clatter.
   */
  public playStoneShatterSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;

      // Layer 1: Sub-bass stone impact shockwave
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.38);

      subGain.gain.setValueAtTime(0.65, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      // Layer 2: Violent stone fracture crack (high-energy noise burst)
      const crackDur = 0.28;
      const crackBufSize = Math.floor(ctx.sampleRate * crackDur);
      const crackBuf = ctx.createBuffer(1, crackBufSize, ctx.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackBufSize; i++) {
        crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
      }

      const crackNoise = ctx.createBufferSource();
      crackNoise.buffer = crackBuf;

      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(1800, now);
      crackFilter.Q.setValueAtTime(1.8, now);

      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.55, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + crackDur);

      crackNoise.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(this.sfxGain);

      // Send a portion to the Cathedral Reverb for cavernous echo!
      if (this.reverbNode) {
        crackGain.connect(this.reverbNode);
      }

      // Layer 3: Scattering stone shard clatter (3-5 randomized debris clicks)
      for (let i = 0; i < 4; i++) {
        const shardDelay = 0.05 + Math.random() * 0.22;
        const shardOsc = ctx.createOscillator();
        const shardGain = ctx.createGain();

        shardOsc.type = 'triangle';
        const shardFreq = 600 + Math.random() * 1200;
        shardOsc.frequency.setValueAtTime(shardFreq, now + shardDelay);
        shardOsc.frequency.exponentialRampToValueAtTime(200, now + shardDelay + 0.04);

        shardGain.gain.setValueAtTime(0.18, now + shardDelay);
        shardGain.gain.exponentialRampToValueAtTime(0.001, now + shardDelay + 0.045);

        shardOsc.connect(shardGain);
        shardGain.connect(this.sfxGain);

        shardOsc.start(now + shardDelay);
        shardOsc.stop(now + shardDelay + 0.05);
      }

      subOsc.start(now);
      crackNoise.start(now);

      subOsc.stop(now + 0.44);
      crackNoise.stop(now + crackDur);
    } catch (e) {
      console.warn('Stone shatter sound error:', e);
    }
  }

  /**
   * Check sound: Gothic warning chord echoing in the cathedral
   */
  public playCheckSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      [330, 392, 493.88].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.2, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        if (this.reverbNode) gain.connect(this.reverbNode);
        osc.start(now + i * 0.04);
        osc.stop(now + 0.7);
      });
    } catch {}
  }

  /**
   * King fall & checkmate: Solemn cathedral bronze bell toll and heavy stone pedestal crash
   */
  public playKingFallSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy Bronze Cathedral Bell Toll (Partials: 110, 220, 330, 442, 660 Hz)
      const partials = [110, 220, 330, 442, 660];
      const partialGains = [0.45, 0.32, 0.22, 0.16, 0.1];
      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(partialGains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        if (this.reverbNode) gain.connect(this.reverbNode);

        osc.start(now);
        osc.stop(now + 2.9);
      });

      // 2. Heavy King pedestal ground crash
      const impactOsc = ctx.createOscillator();
      const impactGain = ctx.createGain();
      impactOsc.type = 'sine';
      impactOsc.frequency.setValueAtTime(85, now);
      impactOsc.frequency.exponentialRampToValueAtTime(24, now + 0.45);

      impactGain.gain.setValueAtTime(0.7, now);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      impactOsc.connect(impactGain);
      impactGain.connect(this.sfxGain);

      impactOsc.start(now);
      impactOsc.stop(now + 0.52);
    } catch (e) {
      console.warn('King fall sound error:', e);
    }
  }

  /**
   * Button / UI click
   */
  public playButtonClickSound(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }
}

// Global Singleton Instance
export const soundEngine = new WizardSoundEngine();

// Expose on window for engine and debugging access
if (typeof window !== 'undefined') {
  (window as unknown as { wizardChessSound: WizardSoundEngine }).wizardChessSound = soundEngine;
}
