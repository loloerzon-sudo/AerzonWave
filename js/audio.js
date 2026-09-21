/**
 * Audio Engine for Web 3D Music Visualizer
 * Handles Web Audio API Analyser, file streaming, beat detection,
 * procedural synth beats, MediaStreamDestination for MP4 recording,
 * and completely echo-free live System Audio (Spotify/YouTube) / Microphone capture.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.speakerBus = null; // Output bus to speakers (USED ONLY FOR LOCAL FILES & SYNTH)
    this.streamDestination = null; // Recording stream bus

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.audioElement.loop = false;

    // Live Capture State (Spotify / System Audio / Microphone)
    this.liveStream = null;
    this.liveSourceNode = null;
    this.isLiveCapture = false;

    // Procedural Synth State
    this.isSynthPlaying = false;
    this.synthTimer = null;
    this.synthStep = 0;
    this.bpm = 124;

    // Analyzer parameters
    this.fftSize = 2048;
    this.smoothing = 0.78; // Balanced: responsive beat detection without visual jitter
    this.frequencyData = null;
    this.timeDomainData = null;

    // Real-time audio metrics
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.overall = 0;

    // Tuning multipliers
    this.bassBoost = 1.2;
    this.trebleBoost = 1.0;
    this.sensitivity = 1.0;

    // Beat Detection
    this.beatDetected = false;
    this.beatCutoff = 0;
    this.beatDecayRate = 0.92;
    this.lastBeatTime = 0;
    this.minBeatInterval = 160;

    // State
    this.isPlaying = false;
    this.currentTrackName = "Procedural Cyberwave (Demo)";
    this.onBeatCallbacks = [];
    this.onTrackChangeCallbacks = [];
    this.onTrackEndedCallbacks = [];
    this.onLiveStatusCallbacks = [];

    this.externalProvider = null;

    this.audioElement.addEventListener("ended", () => {
      this.isPlaying = false;
      this.notifyTrackEnded();
    });
  }

  setExternalProvider(provider) {
    this.externalProvider = provider;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // 1. Analyser Node (Terminal analysis node - NEVER directly connected to speakers!)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;

      // 2. Speaker Bus (Only local files & synth connect here)
      this.speakerBus = this.ctx.createGain();
      this.speakerBus.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.speakerBus.connect(this.ctx.destination);

      // 3. Stream Destination for video recording
      this.streamDestination = this.ctx.createMediaStreamDestination();

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);

      // 4. Connect HTML5 audio element: to Analyser (for visuals) AND SpeakerBus (for hearing), AND streamDestination
      this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
      this.sourceNode.connect(this.analyser);
      this.sourceNode.connect(this.speakerBus);
      this.sourceNode.connect(this.streamDestination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /* ==========================================================================
     Live System Audio (Spotify / YouTube / Games) & Microphone Capture
     NO ECHO: Digital sound is routed strictly to analyser & recording.
     NEVER routed back to speakers (speakerBus / ctx.destination).
     ========================================================================== */
  async startSystemAudio() {
    this.initContext();
    this.stopLiveAudio();
    this.stopSynth();
    if (this.audioElement) {
      this.audioElement.pause();
    }

    try {
      // Screen & System audio capture via getDisplayMedia
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error("NO_AUDIO_TRACK");
      }

      this.liveStream = stream;
      this.liveSourceNode = this.ctx.createMediaStreamSource(stream);

      // CRITICAL: Connect live audio ONLY to analyser (for 3D graphics) and recording stream.
      // DO NOT connect to speakerBus or ctx.destination! That prevents any echo/feedback!
      this.liveSourceNode.connect(this.analyser);
      this.liveSourceNode.connect(this.streamDestination);

      this.isLiveCapture = true;
      this.isPlaying = true;
      this.currentTrackName = "Live System Audio (Spotify / YouTube)";
      this.notifyTrackChange(this.currentTrackName, "Live Digital Loopback (No Echo)");
      this.notifyLiveStatus(true, "system");

      // Auto-cleanup if user stops sharing in browser toolbar
      audioTracks[0].onended = () => {
        this.stopLiveAudio();
      };

      return true;
    } catch (err) {
      console.warn("System audio capture error:", err);
      this.stopLiveAudio();
      if (err.message === "NO_AUDIO_TRACK") {
        throw new Error("Make sure to check 'Share audio' or 'Also share system audio' in the prompt!");
      }
      throw err;
    }
  }

  async startMicAudio() {
    this.initContext();
    this.stopLiveAudio();
    this.stopSynth();
    if (this.audioElement) {
      this.audioElement.pause();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      });

      this.liveStream = stream;
      this.liveSourceNode = this.ctx.createMediaStreamSource(stream);

      // CRITICAL: Connect ONLY to analyser & recording stream. NEVER to speakers!
      this.liveSourceNode.connect(this.analyser);
      this.liveSourceNode.connect(this.streamDestination);

      this.isLiveCapture = true;
      this.isPlaying = true;
      this.currentTrackName = "Live Microphone / Room Audio";
      this.notifyTrackChange(this.currentTrackName, "Live Input (No Echo)");
      this.notifyLiveStatus(true, "mic");

      stream.getAudioTracks()[0].onended = () => {
        this.stopLiveAudio();
      };

      return true;
    } catch (err) {
      console.warn("Mic audio capture error:", err);
      this.stopLiveAudio();
      throw err;
    }
  }

  stopLiveAudio() {
    if (this.liveStream) {
      this.liveStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.liveStream = null;
    }

    if (this.liveSourceNode) {
      try {
        this.liveSourceNode.disconnect();
      } catch (e) {}
      this.liveSourceNode = null;
    }

    if (this.isLiveCapture) {
      this.isLiveCapture = false;
      this.isPlaying = false;
      this.currentTrackName = "Live Sync Disconnected";
      this.notifyTrackChange(this.currentTrackName, "Click Play or load an audio file");
      this.notifyLiveStatus(false, null);
    }
  }

  onLiveStatus(cb) {
    this.onLiveStatusCallbacks.push(cb);
  }

  notifyLiveStatus(active, type) {
    for (const cb of this.onLiveStatusCallbacks) {
      cb(active, type);
    }
  }

  getAudioStream() {
    this.initContext();
    return this.streamDestination ? this.streamDestination.stream : null;
  }

  rewind() {
    if (this.audioElement && !this.isLiveCapture) {
      this.audioElement.currentTime = 0;
    }
  }

  getDuration() {
    if (this.isLiveCapture) return 0;
    if (this.isSynthPlaying) return 60;
    return (this.audioElement && !isNaN(this.audioElement.duration)) ? this.audioElement.duration : 0;
  }

  getCurrentTime() {
    if (this.isLiveCapture) return 0;
    if (this.isSynthPlaying) return this.ctx ? (this.ctx.currentTime % 60) : 0;
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  loadUserFile(file) {
    this.stopLiveAudio();
    this.initContext();
    this.stopSynth();

    const fileUrl = URL.createObjectURL(file);
    this.audioElement.src = fileUrl;
    this.currentTrackName = file.name.replace(/\.[^/.]+$/, "");
    this.notifyTrackChange(this.currentTrackName, "Local File");

    this.audioElement.play().then(() => {
      this.isPlaying = true;
    }).catch(err => {
      console.warn("Autoplay blocked, user interaction required:", err);
    });
  }

  togglePlay() {
    this.initContext();

    if (this.isLiveCapture) {
      this.stopLiveAudio();
      return false;
    }

    if (this.isSynthPlaying) {
      this.stopSynth();
      this.isPlaying = false;
      return false;
    }

    if (this.audioElement.src && this.audioElement.src !== "") {
      if (this.audioElement.paused) {
        this.audioElement.play();
        this.isPlaying = true;
        return true;
      } else {
        this.audioElement.pause();
        this.isPlaying = false;
        return false;
      }
    } else {
      this.startSynth();
      this.isPlaying = true;
      return true;
    }
  }

  play() {
    this.initContext();
    if (this.isLiveCapture) return;

    if (this.audioElement.src && this.audioElement.src !== "") {
      this.audioElement.play();
      this.isPlaying = true;
    } else {
      this.startSynth();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.isLiveCapture) {
      this.stopLiveAudio();
      return;
    }
    if (this.isSynthPlaying) {
      this.stopSynth();
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
  }

  startSynth() {
    this.initContext();
    this.stopLiveAudio();
    if (this.isSynthPlaying) return;

    if (!this.audioElement.paused) {
      this.audioElement.pause();
    }

    this.isSynthPlaying = true;
    this.isPlaying = true;
    this.synthStep = 0;
    this.currentTrackName = "Procedural Cyberwave (Built-in Demo)";
    this.notifyTrackChange(this.currentTrackName, "Live Generative Audio");

    const stepTime = (60 / this.bpm) / 4;
    let nextNoteTime = this.ctx.currentTime + 0.05;

    const schedule = () => {
      if (!this.isSynthPlaying) return;

      while (nextNoteTime < this.ctx.currentTime + 0.15) {
        this.playSynthStep(this.synthStep, nextNoteTime);
        nextNoteTime += stepTime;
        this.synthStep = (this.synthStep + 1) % 16;
      }

      this.synthTimer = setTimeout(schedule, 25);
    };

    schedule();
  }

  stopSynth() {
    this.isSynthPlaying = false;
    if (this.synthTimer) {
      clearTimeout(this.synthTimer);
      this.synthTimer = null;
    }
  }

  playSynthStep(step, time) {
    if (!this.ctx || !this.analyser) return;

    const synthMaster = this.ctx.createGain();
    synthMaster.gain.setValueAtTime(0.7, time);

    // Synth connects to Analyser (visuals), SpeakerBus (so user hears it), and streamDestination (for recording)
    synthMaster.connect(this.analyser);
    if (this.speakerBus) {
      synthMaster.connect(this.speakerBus);
    }
    if (this.streamDestination) {
      synthMaster.connect(this.streamDestination);
    }

    // 1. Kick
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
      gain.gain.setValueAtTime(1.0, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
      osc.connect(gain);
      gain.connect(synthMaster);
      osc.start(time);
      osc.stop(time + 0.3);
    }

    // 2. Snare
    if (step === 4 || step === 12) {
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(synthMaster);
      noise.start(time);
      noise.stop(time + 0.15);
    }

    // 3. Hi-Hat
    if (step % 2 === 0) {
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

      const hat = this.ctx.createBufferSource();
      hat.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, time);
      const gain = this.ctx.createGain();
      const vol = (step % 4 === 2) ? 0.35 : 0.15;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.04);
      hat.connect(filter);
      filter.connect(gain);
      gain.connect(synthMaster);
      hat.start(time);
      hat.stop(time + 0.05);
    }

    // 4. Bassline
    const scale = [55, 65.41, 73.42, 82.41, 98, 110, 130.81, 164.81];
    const noteIndex = (step * 3 + Math.floor(step / 4)) % scale.length;
    const baseFreq = scale[noteIndex];

    const bassOsc = this.ctx.createOscillator();
    bassOsc.type = (step % 2 === 0) ? "sawtooth" : "square";
    bassOsc.frequency.setValueAtTime(baseFreq, time);
    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = "lowpass";
    const filterEnv = 400 + (Math.sin(time * 2) * 0.5 + 0.5) * 2200;
    bassFilter.frequency.setValueAtTime(filterEnv, time);
    bassFilter.Q.setValueAtTime(4, time);
    const bassGain = this.ctx.createGain();
    bassGain.gain.setValueAtTime(0.3, time);
    bassGain.gain.exponentialRampToValueAtTime(0.005, time + 0.18);
    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(synthMaster);
    bassOsc.start(time);
    bassOsc.stop(time + 0.2);
  }

  update() {
    if (!this.analyser || !this.isPlaying) {
      if (this.externalProvider && typeof this.externalProvider.isActive === "function" && this.externalProvider.isActive()) {
        const ext = this.externalProvider.getAudioMetrics();
        this.bass = Math.min(1.0, ext.bass * this.bassBoost * this.sensitivity);
        this.mid = Math.min(1.0, ext.mid * this.sensitivity);
        this.treble = Math.min(1.0, ext.treble * this.trebleBoost * this.sensitivity);
        this.overall = Math.min(1.0, ext.overall * this.sensitivity);
        this.frequencyData = ext.frequencyData;
        this.timeDomainData = ext.timeDomainData;
        this.beatDetected = ext.beatDetected;
        if (this.beatDetected) {
          this.notifyBeat();
        }
        return;
      }

      this.bass = Math.max(0, this.bass * 0.94);
      this.mid = Math.max(0, this.mid * 0.94);
      this.treble = Math.max(0, this.treble * 0.94);
      this.overall = Math.max(0, this.overall * 0.94);
      this.beatDetected = false;
      return;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const binCount = this.analyser.frequencyBinCount;

    let bassSum = 0;
    const bassEnd = Math.min(14, binCount);
    for (let i = 1; i < bassEnd; i++) bassSum += this.frequencyData[i];
    const rawBass = (bassSum / (bassEnd - 1)) / 255;

    let midSum = 0;
    const midEnd = Math.min(120, binCount);
    for (let i = bassEnd; i < midEnd; i++) midSum += this.frequencyData[i];
    const rawMid = (midSum / (midEnd - bassEnd)) / 255;

    let trebleSum = 0;
    const trebleEnd = Math.min(450, binCount);
    for (let i = midEnd; i < trebleEnd; i++) trebleSum += this.frequencyData[i];
    const rawTreble = (trebleSum / (trebleEnd - midEnd)) / 255;

    const rawOverall = (rawBass * 0.5 + rawMid * 0.3 + rawTreble * 0.2);

    this.bass = Math.min(1.0, rawBass * this.bassBoost * this.sensitivity);
    this.mid = Math.min(1.0, rawMid * this.sensitivity);
    this.treble = Math.min(1.0, rawTreble * this.trebleBoost * this.sensitivity);
    this.overall = Math.min(1.0, rawOverall * this.sensitivity);

    const now = performance.now();
    this.beatCutoff *= this.beatDecayRate;
    if (this.beatCutoff < 0.25) this.beatCutoff = 0.25;

    if (this.bass > this.beatCutoff && (now - this.lastBeatTime) > this.minBeatInterval) {
      this.beatDetected = true;
      this.beatCutoff = this.bass * 1.15;
      this.lastBeatTime = now;
      this.notifyBeat();
    } else {
      this.beatDetected = false;
    }
  }

  onBeat(cb) {
    this.onBeatCallbacks.push(cb);
  }

  notifyBeat() {
    for (const cb of this.onBeatCallbacks) cb(this.bass);
  }

  onTrackChange(cb) {
    this.onTrackChangeCallbacks.push(cb);
  }

  notifyTrackChange(title, artist) {
    for (const cb of this.onTrackChangeCallbacks) cb(title, artist);
  }

  onTrackEnded(cb) {
    this.onTrackEndedCallbacks.push(cb);
  }

  notifyTrackEnded() {
    for (const cb of this.onTrackEndedCallbacks) cb();
  }

  setSmoothing(val) {
    this.smoothing = val;
    if (this.analyser) this.analyser.smoothingTimeConstant = val;
  }

  setBassBoost(val) { this.bassBoost = val; }
  setTrebleBoost(val) { this.trebleBoost = val; }
  setSensitivity(val) { this.sensitivity = val; }

  getBassAverage() { return this.bass; }
  getMidAverage() { return this.mid; }
  getTrebleAverage() { return this.treble; }
}

window.AudioEngine = AudioEngine;
