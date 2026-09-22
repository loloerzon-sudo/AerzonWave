/**
 * Main Application Coordinator
 * Connects Web Audio Engine, Video Recording Engine (MP4 export),
 * Three.js Visualizer (7 modes), Kinetic Text Studio, HUD controls, and shortcuts.
 */

class App {
  constructor() {
    this.audio = new AudioEngine();
    this.presets = new PresetManager();

    this.canvasWrapper = document.getElementById("canvas-wrapper");
    this.renderCanvas = document.getElementById("render-canvas");
    this.spectrumCanvas = document.getElementById("spectrum-canvas");
    this.spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext("2d") : null;

    this.visualizer = new VisualizerEngine(this.renderCanvas, this.canvasWrapper);
    this.recorder = new VideoRecorder(this.renderCanvas, this.audio);

    this.isHudLocked = false;
    this.idleTimer = null;
    this.init();
  }

  init() {
    window.appInstance = this;

    // Initialize visualizer with default mode and theme
    this.visualizer.setMode(this.presets.params.mode, this.presets.getTheme(), this.presets.getModeParams(this.presets.params.mode));

    // Audio callbacks
    this.audio.onBeat(() => {
      this.presets.onBeatDrop();
    });

    this.audio.onTrackChange((title, artist) => {
      document.getElementById("track-title").textContent = title;
      document.getElementById("track-artist").textContent = artist;
      this.showToast(`Now Playing: ${title}`);
    });

    this.setupHUD();
    this.setupRenderRecording();
    this.setupLiveAudio();
    this.setupTextStudio();
    this.setupFreeformColors();
    this.setupDragAndDrop();
    this.setupShortcuts();
    this.setupAutoHidingHUD();
    this.renderPresetsList();
    this.renderModeInspector(this.presets.params.mode);
    this.syncUIWithParams();
    this.syncColorPickers();

    // Start main render loop
    this.loop();
  }

  /* ==========================================================================
     Video Recording & MP4 Export Setup
     ========================================================================== */
  setupRenderRecording() {
    const renderModalBtn = document.getElementById("btn-render-modal");
    const renderModal = document.getElementById("render-modal");
    const closeRenderBtn = document.getElementById("close-render-btn");

    const optFull = document.getElementById("opt-render-full");
    const optClip = document.getElementById("opt-record-clip");
    const selectFps = document.getElementById("select-render-fps");

    const btnFinish = document.getElementById("btn-finish-recording");
    const btnCancel = document.getElementById("btn-cancel-recording");

    const timeElapsedEl = document.getElementById("rec-time-elapsed");
    const timeTotalEl = document.getElementById("rec-time-total");
    const progressFill = document.getElementById("rec-progress-fill");

    const formatTime = (sec) => {
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    renderModalBtn.addEventListener("click", () => {
      renderModal.classList.add("open");
    });
    closeRenderBtn.addEventListener("click", () => {
      renderModal.classList.remove("open");
    });

    const startRecordingSession = (mode) => {
      renderModal.classList.remove("open");
      document.body.classList.add("recording-active");
      const fps = parseInt(selectFps.value) || 60;

      // Lock visualizer to crisp 1080p 60fps render
      this.visualizer.setRecordingResolution(true);

      this.recorder.startRecording(mode, fps, {
        onProgress: ({ elapsed, total, percent, mode }) => {
          timeElapsedEl.textContent = formatTime(elapsed);
          timeTotalEl.textContent = total > 0 ? formatTime(total) : "REC";
          progressFill.style.width = `${percent}%`;
        },
        onComplete: ({ filename }) => {
          this.visualizer.setRecordingResolution(false);
          document.body.classList.remove("recording-active");
          progressFill.style.width = "0%";
          this.showToast(`🎬 Video Downloaded: ${filename}`);
        }
      });

      this.showToast(mode === "full" ? "🔴 Rendering Full Track..." : "🔴 Recording Clip...");
    };

    optFull.addEventListener("click", () => startRecordingSession("full"));
    optClip.addEventListener("click", () => startRecordingSession("clip"));

    btnFinish.addEventListener("click", () => {
      this.recorder.stop();
    });

    btnCancel.addEventListener("click", () => {
      this.recorder.cancel();
      this.visualizer.setRecordingResolution(false);
      document.body.classList.remove("recording-active");
      this.showToast("Recording cancelled");
    });
  }

  /* ==========================================================================
     Live Computer Audio & Spotify Sync Setup
     ========================================================================== */
  setupLiveAudio() {
    const liveModalBtn = document.getElementById("btn-live-audio");
    const liveModal = document.getElementById("live-audio-modal");
    const closeLiveBtn = document.getElementById("close-live-btn");

    const optSystem = document.getElementById("opt-live-system");
    const optMic = document.getElementById("opt-live-mic");
    const btnDisconnect = document.getElementById("btn-disconnect-live");

    liveModalBtn.addEventListener("click", () => {
      // If currently active, clicking the button disconnects directly
      if (this.audio.isLiveCapture) {
        this.audio.stopLiveAudio();
        this.showToast("Live Audio Sync Disconnected");
        return;
      }
      liveModal.classList.add("open");
    });

    closeLiveBtn.addEventListener("click", () => {
      liveModal.classList.remove("open");
    });

    // 1. System / Spotify Audio Loopback
    optSystem.addEventListener("click", async () => {
      liveModal.classList.remove("open");
      this.showToast("Opening audio prompt: Choose screen/window and check 'Share audio'!");

      try {
        await this.audio.startSystemAudio();
        this.showToast("🟢 Synced with System Audio / Spotify!");
      } catch (err) {
        this.showToast(err.message || "Could not capture system audio");
      }
    });

    // 2. Microphone Input
    optMic.addEventListener("click", async () => {
      liveModal.classList.remove("open");
      try {
        await this.audio.startMicAudio();
        this.showToast("🟢 Synced with Microphone!");
      } catch (err) {
        this.showToast("Microphone permission was denied");
      }
    });

    // 3. Disconnect Button
    btnDisconnect.addEventListener("click", () => {
      this.audio.stopLiveAudio();
      liveModal.classList.remove("open");
      this.showToast("Live Audio Sync Disconnected");
    });

    // 4. 1-Click Direct System / Tab Sound Sync (Bottom Bar & Spotify Card)
    const btnSyncSound = document.getElementById("btn-spotify-sync-sound");
    const btnCardSyncSound = document.getElementById("btn-spotify-card-sync-sound");

    const handle1ClickSync = async () => {
      if (this.audio.isLiveCapture) {
        this.audio.stopLiveAudio();
        this.showToast("Sound Sync Disconnected");
        return;
      }
      try {
        this.showToast("Select Spotify Tab or Screen (check 'Share Audio')...");
        await this.audio.startSystemAudio();
        this.showToast("🟢 100% Studio Sound Synced!");
      } catch (err) {
        if (err.message && err.message.includes("NO_AUDIO_TRACK")) {
          this.showToast("⚠️ Tip: Check 'Share audio' in the prompt");
        } else if (err.name !== "NotAllowedError") {
          this.showToast("Audio sync cancelled or unavailable");
        }
      }
    };

    if (btnSyncSound) {
      btnSyncSound.addEventListener("click", handle1ClickSync);
    }
    if (btnCardSyncSound) {
      btnCardSyncSound.addEventListener("click", handle1ClickSync);
    }

    // Status Listener
    this.audio.onLiveStatus((active, type) => {
      const liveBtn = document.getElementById("btn-live-audio");
      const disconnectBox = document.getElementById("live-disconnect-container");
      const playBtn = document.getElementById("play-pause-btn");

      // Update 1-Click Sync Sound buttons
      if (btnSyncSound) {
        if (active) {
          btnSyncSound.classList.add("synced");
          btnSyncSound.innerHTML = `<span class="sync-icon">🟢</span> <span class="sync-label">Sound Synced</span>`;
          btnSyncSound.title = "Audio Loopback Active. Click to disconnect.";
        } else {
          btnSyncSound.classList.remove("synced");
          btnSyncSound.innerHTML = `<span class="sync-icon">⚡</span> <span class="sync-label">Sync Sound</span>`;
          btnSyncSound.title = "1-Click Direct Audio Sync (Real-time Spotify & System Sound loopback)";
        }
      }

      if (btnCardSyncSound) {
        if (active) {
          btnCardSyncSound.classList.add("synced");
          btnCardSyncSound.innerHTML = `<span class="sync-icon">🟢</span> <span class="sync-label">Sound Synced (Click to stop)</span>`;
        } else {
          btnCardSyncSound.classList.remove("synced");
          btnCardSyncSound.innerHTML = `<span class="sync-icon">⚡</span> <span class="sync-label">Sync Spotify Audio (1-Click)</span>`;
        }
      }

      if (active) {
        liveBtn.classList.add("live-active");
        liveBtn.innerHTML = `<span>🔴</span> Stop Sync`;
        disconnectBox.style.display = "block";
        playBtn.innerHTML = "❚❚";
      } else {
        liveBtn.classList.remove("live-active");
        liveBtn.innerHTML = `<span>🔊</span> Live Audio`;
        disconnectBox.style.display = "none";
        playBtn.innerHTML = "▶";
      }
    });
  }


  /* ==========================================================================
     HUD & Navigation Controls
     ========================================================================== */
  setupHUD() {
    // 1. Play / Pause & Previous / Next
    const playBtn = document.getElementById("play-pause-btn");
    const prevBtn = document.getElementById("prev-track-btn");
    const nextBtn = document.getElementById("next-track-btn");

    const handlePlayPause = () => {
      const playing = this.audio.togglePlay();
      if (playBtn) {
        playBtn.innerHTML = playing ? "❚❚" : "▶";
        playBtn.setAttribute("title", playing ? "Pause (Space)" : "Play (Space)");
      }
    };

    if (playBtn) playBtn.addEventListener("click", handlePlayPause);

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        this.audio.rewind();
        this.showToast("⏮ Rewound to start");
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.showToast("Load an audio file to skip tracks");
      });
    }

    // 2. 7 Visual Mode Switchers
    const modeBtns = document.querySelectorAll(".mode-pill");
    modeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        this.switchMode(mode);
      });
    });

    // 3. Aspect Ratio Switcher
    const aspectBtns = document.querySelectorAll(".aspect-btn");
    aspectBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        aspectBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const ratio = btn.dataset.ratio;
        this.setAspectRatio(ratio);
      });
    });

    // 4. Surprise Me (Randomize) Button
    const randomizeBtn = document.getElementById("btn-randomize");
    randomizeBtn.addEventListener("click", () => {
      this.presets.randomize();
      this.visualizer.updateColors(this.presets.getTheme());
      this.syncUIWithParams();
      this.syncColorPickers();
      this.highlightActiveTheme();
      this.showToast("✨ Shuffled Visual Parameters!");
    });

    // 5. Auto-Pilot Toggle Button
    const autoPilotBtn = document.getElementById("btn-autopilot");
    autoPilotBtn.addEventListener("click", () => {
      this.presets.autoPilot = !this.presets.autoPilot;
      autoPilotBtn.classList.toggle("active", this.presets.autoPilot);
      this.showToast(this.presets.autoPilot ? "Auto-Pilot: ON" : "Auto-Pilot: OFF");
    });

    // 5b. Quick Lock HUD Pills
    const lockModeBtn = document.getElementById("btn-lock-mode");
    if (lockModeBtn) {
      lockModeBtn.addEventListener("click", () => {
        this.toggleLock("mode");
      });
    }

    const lockColorsBtn = document.getElementById("btn-lock-colors");
    if (lockColorsBtn) {
      lockColorsBtn.addEventListener("click", () => {
        this.toggleLock("colors");
      });
    }

    // 6. Drawers Toggle
    this.setupDrawers();

    // 7. Hide HUD Button
    const hideHudBtn = document.getElementById("btn-hide-hud");
    if (hideHudBtn) {
      hideHudBtn.addEventListener("click", () => {
        this.toggleHideHUD();
      });
    }

    // 8. Fullscreen Button
    const fullscreenBtn = document.getElementById("btn-fullscreen");
    fullscreenBtn.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // 8. Help Button
    const helpBtn = document.getElementById("btn-help");
    const helpModal = document.getElementById("help-modal");
    const closeHelpBtn = document.getElementById("close-help-btn");

    helpBtn.addEventListener("click", () => {
      helpModal.classList.toggle("open");
    });
    closeHelpBtn.addEventListener("click", () => {
      helpModal.classList.remove("open");
    });

    // 9. File Upload Button
    const fileInput = document.getElementById("audio-file-input");
    const uploadBtn = document.getElementById("btn-upload");
    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        this.audio.loadUserFile(e.target.files[0]);
        playBtn.innerHTML = "❚❚";
      }
    });

    // 10. Tuning Sliders
    this.bindSlider("slider-bass", "val-bass", (val) => {
      this.presets.params.bassBoost = val;
      this.presets.targetParams.bassBoost = val;
      this.audio.setBassBoost(val);
    });

    this.bindSlider("slider-treble", "val-treble", (val) => {
      this.presets.params.trebleBoost = val;
      this.presets.targetParams.trebleBoost = val;
      this.audio.setTrebleBoost(val);
    });

    this.bindSlider("slider-sens", "val-sens", (val) => {
      this.presets.params.sensitivity = val;
      this.presets.targetParams.sensitivity = val;
      this.audio.setSensitivity(val);
    });

    this.bindSlider("slider-smooth", "val-smooth", (val) => {
      this.presets.params.smoothing = val;
      this.presets.targetParams.smoothing = val;
      this.audio.setSmoothing(val);
    });

    this.bindSlider("slider-speed", "val-speed", (val) => {
      this.presets.params.cameraSpeed = val;
      this.presets.targetParams.cameraSpeed = val;
    });

    // Neon Bloom FX Controls
    this.bindSlider("slider-bloom-strength", "val-bloom-strength", (val) => {
      this.presets.params.bloomStrength = val;
    });

    this.bindSlider("slider-bloom-radius", "val-bloom-radius", (val) => {
      this.presets.params.bloomRadius = val;
    });

    this.bindSlider("slider-bloom-react", "val-bloom-react", (val) => {
      this.presets.params.bloomReactivity = val;
    });

    const toggleBloom = document.getElementById("toggle-bloom");
    const bloomBadge = document.getElementById("bloom-status-badge");
    if (toggleBloom) {
      toggleBloom.addEventListener("change", (e) => {
        this.presets.params.bloomEnabled = e.target.checked;
        if (bloomBadge) {
          bloomBadge.textContent = e.target.checked ? "ACTIVE" : "OFF";
          bloomBadge.style.color = e.target.checked ? "var(--accent-cyan)" : "var(--text-muted)";
        }
        this.showToast(e.target.checked ? "✨ Neon Bloom: ON" : "Neon Bloom: OFF");
      });
    }

    // 11. Presets Management
    const savePresetBtn = document.getElementById("btn-save-preset");
    const presetNameInput = document.getElementById("input-preset-name");
    savePresetBtn.addEventListener("click", () => {
      const name = presetNameInput.value.trim();
      if (!name) {
        this.showToast("Please enter a preset name");
        return;
      }
      this.presets.savePreset(name);
      presetNameInput.value = "";
      this.renderPresetsList();
      this.showToast(`Saved preset "${name}"`);
    });

    // 12. Visualizer Locks Checkboxes (Settings Drawer)
    const lockModeCheck = document.getElementById("toggle-lock-mode");
    if (lockModeCheck) {
      lockModeCheck.addEventListener("change", (e) => {
        this.presets.setLock("mode", e.target.checked);
        this.syncUIWithParams();
        this.showToast(e.target.checked ? "Visual Mode: LOCKED 🔒" : "Visual Mode: UNLOCKED 🔓");
      });
    }

    const lockColorsCheck = document.getElementById("toggle-lock-colors");
    if (lockColorsCheck) {
      lockColorsCheck.addEventListener("change", (e) => {
        this.presets.setLock("colors", e.target.checked);
        this.syncUIWithParams();
        this.showToast(e.target.checked ? "Color Palette: LOCKED 🔒" : "Color Palette: UNLOCKED 🔓");
      });
    }

    const lockSlidersCheck = document.getElementById("toggle-lock-sliders");
    if (lockSlidersCheck) {
      lockSlidersCheck.addEventListener("change", (e) => {
        this.presets.setLock("sliders", e.target.checked);
        this.syncUIWithParams();
        this.showToast(e.target.checked ? "Tuning Sliders: LOCKED 🔒" : "Tuning Sliders: UNLOCKED 🔓");
      });
    }

    const lockTextCheck = document.getElementById("toggle-lock-text");
    if (lockTextCheck) {
      lockTextCheck.addEventListener("change", (e) => {
        this.presets.setLock("text", e.target.checked);
        this.syncUIWithParams();
        this.showToast(e.target.checked ? "Text & Settings: LOCKED 🔒" : "Text & Settings: UNLOCKED 🔓");
      });
    }

    const lockTextDrawerCheck = document.getElementById("toggle-lock-text-drawer");
    if (lockTextDrawerCheck) {
      lockTextDrawerCheck.addEventListener("change", (e) => {
        this.presets.setLock("text", e.target.checked);
        this.syncUIWithParams();
        this.showToast(e.target.checked ? "Text & Settings: LOCKED 🔒" : "Text & Settings: UNLOCKED 🔓");
      });
    }

    this.setupThemePalettes();
  }

  toggleLock(type) {
    if (type === "mode") {
      const next = !this.presets.lockMode;
      this.presets.setLock("mode", next);
      this.syncUIWithParams();
      this.showToast(next ? "Visual Mode: LOCKED 🔒" : "Visual Mode: UNLOCKED 🔓");
    } else if (type === "colors") {
      const next = !this.presets.lockColors;
      this.presets.setLock("colors", next);
      this.syncUIWithParams();
      this.showToast(next ? "Color Palette: LOCKED 🔒" : "Color Palette: UNLOCKED 🔓");
    } else if (type === "sliders") {
      const next = !this.presets.lockSliders;
      this.presets.setLock("sliders", next);
      this.syncUIWithParams();
      this.showToast(next ? "Tuning Sliders: LOCKED 🔒" : "Tuning Sliders: UNLOCKED 🔓");
    } else if (type === "text") {
      const next = !this.presets.lockText;
      this.presets.setLock("text", next);
      this.syncUIWithParams();
      this.showToast(next ? "Text & Settings: LOCKED 🔒" : "Text & Settings: UNLOCKED 🔓");
    }
  }

  setupDrawers() {
    const textBtn = document.getElementById("btn-text");
    const textDrawer = document.getElementById("text-drawer");
    const closeTextBtn = document.getElementById("close-text-btn");

    const settingsBtn = document.getElementById("btn-settings");
    const settingsDrawer = document.getElementById("settings-drawer");
    const closeSettingsBtn = document.getElementById("close-settings-btn");

    const presetsBtn = document.getElementById("btn-presets");
    const presetsDrawer = document.getElementById("presets-drawer");
    const closePresetsBtn = document.getElementById("close-presets-btn");

    const closeAllDrawers = () => {
      textDrawer.classList.remove("open");
      settingsDrawer.classList.remove("open");
      presetsDrawer.classList.remove("open");
    };

    textBtn.addEventListener("click", () => {
      const isOpen = textDrawer.classList.contains("open");
      closeAllDrawers();
      if (!isOpen) textDrawer.classList.add("open");
    });
    closeTextBtn.addEventListener("click", () => textDrawer.classList.remove("open"));

    settingsBtn.addEventListener("click", () => {
      const isOpen = settingsDrawer.classList.contains("open");
      closeAllDrawers();
      if (!isOpen) {
        this.renderModeInspector(this.presets.params.mode);
        settingsDrawer.classList.add("open");
      }
    });
    closeSettingsBtn.addEventListener("click", () => settingsDrawer.classList.remove("open"));

    presetsBtn.addEventListener("click", () => {
      const isOpen = presetsDrawer.classList.contains("open");
      closeAllDrawers();
      if (!isOpen) presetsDrawer.classList.add("open");
    });
    closePresetsBtn.addEventListener("click", () => presetsDrawer.classList.remove("open"));
  }

  /* ==========================================================================
     Text Studio Setup
     ========================================================================== */
  setupTextStudio() {
    const phraseInput = document.getElementById("input-text-phrase");
    phraseInput.addEventListener("input", (e) => {
      this.presets.params.textPhrase = e.target.value;
    });

    const fontSelect = document.getElementById("select-text-font");
    fontSelect.addEventListener("change", (e) => {
      this.presets.params.textFont = e.target.value;
    });

    this.bindSlider("slider-text-chaos", "val-text-chaos", (val) => {
      this.presets.params.textChaos = val;
      this.presets.targetParams.textChaos = val;
    });

    this.bindSlider("slider-text-depth", "val-text-depth", (val) => {
      this.presets.params.textDepth = val;
      this.presets.targetParams.textDepth = val;
    });

    this.bindSlider("slider-text-scale", "val-text-scale", (val) => {
      this.presets.params.textScale = val;
    });

    this.bindSlider("slider-text-y", "val-text-y", (val) => {
      this.presets.params.textYOffset = val;
    });

    const toggleText = document.getElementById("toggle-show-text");
    toggleText.addEventListener("change", (e) => {
      this.presets.params.showText = e.target.checked;
      this.showToast(e.target.checked ? "Text Overlay: ON" : "Text Overlay: OFF");
    });

    const toggleSparks = document.getElementById("toggle-text-sparks");
    toggleSparks.addEventListener("change", (e) => {
      this.presets.params.textSparks = e.target.checked;
    });

    // Text Color Customization & Dynamic Beat Randomizer
    const toggleSyncTheme = document.getElementById("toggle-text-sync-theme");
    const customColorsContainer = document.getElementById("custom-text-colors-container");
    if (toggleSyncTheme) {
      toggleSyncTheme.addEventListener("change", (e) => {
        this.presets.params.textSyncTheme = e.target.checked;
        if (customColorsContainer) {
          customColorsContainer.style.display = e.target.checked ? "none" : "block";
        }
        this.showToast(e.target.checked ? "Text Colors: Synced with 3D Scene" : "Text Colors: Custom Palette");
      });
    }

    const toggleRandomColors = document.getElementById("toggle-text-random-colors");
    if (toggleRandomColors) {
      toggleRandomColors.addEventListener("change", (e) => {
        this.presets.params.textRandomColors = e.target.checked;
        this.showToast(e.target.checked ? "Text Beat Color Randomizer: ON" : "Text Beat Color Randomizer: OFF");
      });
    }

    const pickerCore = document.getElementById("picker-text-core");
    if (pickerCore) {
      pickerCore.addEventListener("input", (e) => {
        this.presets.params.textCoreColor = e.target.value;
      });
    }

    const pickerGlow = document.getElementById("picker-text-glow");
    if (pickerGlow) {
      pickerGlow.addEventListener("input", (e) => {
        this.presets.params.textGlowColor = e.target.value;
      });
    }
  }

  /* ==========================================================================
     Freeform Color Pickers
     ========================================================================== */
  setupFreeformColors() {
    const pPicker = document.getElementById("picker-primary");
    const sPicker = document.getElementById("picker-secondary");
    const aPicker = document.getElementById("picker-accent");

    const updateFromPickers = () => {
      this.presets.setCustomColor("primary", pPicker.value);
      this.presets.setCustomColor("secondary", sPicker.value);
      this.presets.setCustomColor("accent", aPicker.value);
      this.visualizer.updateColors(this.presets.getTheme());
      this.highlightActiveTheme();
    };

    pPicker.addEventListener("input", updateFromPickers);
    sPicker.addEventListener("input", updateFromPickers);
    aPicker.addEventListener("input", updateFromPickers);
  }

  syncColorPickers() {
    const theme = this.presets.getTheme();
    const toHex = (c) => {
      if (c.startsWith("#")) return c;
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = c;
      return ctx.fillStyle;
    };

    try {
      document.getElementById("picker-primary").value = toHex(theme.primary);
      document.getElementById("picker-secondary").value = toHex(theme.secondary);
      document.getElementById("picker-accent").value = toHex(theme.accent);
    } catch (e) {}
  }

  bindSlider(id, valId, cb) {
    const slider = document.getElementById(id);
    const valDisplay = document.getElementById(valId);
    if (!slider) return;
    slider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (valDisplay) valDisplay.textContent = val.toFixed(2);
      cb(val);
    });
  }

  syncUIWithParams() {
    const p = this.presets.params;

    document.getElementById("slider-bass").value = p.bassBoost;
    document.getElementById("val-bass").textContent = p.bassBoost.toFixed(2);

    document.getElementById("slider-treble").value = p.trebleBoost;
    document.getElementById("val-treble").textContent = p.trebleBoost.toFixed(2);

    document.getElementById("slider-sens").value = p.sensitivity;
    document.getElementById("val-sens").textContent = p.sensitivity.toFixed(2);

    document.getElementById("slider-smooth").value = p.smoothing;
    document.getElementById("val-smooth").textContent = p.smoothing.toFixed(2);

    document.getElementById("slider-speed").value = p.cameraSpeed;
    document.getElementById("val-speed").textContent = p.cameraSpeed.toFixed(2);

    if (p.textChaos !== undefined) {
      document.getElementById("slider-text-chaos").value = p.textChaos;
      document.getElementById("val-text-chaos").textContent = p.textChaos.toFixed(2);
    }

    if (p.textDepth !== undefined) {
      document.getElementById("slider-text-depth").value = p.textDepth;
      document.getElementById("val-text-depth").textContent = p.textDepth.toFixed(2);
    }

    if (p.textScale !== undefined) {
      document.getElementById("slider-text-scale").value = p.textScale;
      document.getElementById("val-text-scale").textContent = p.textScale.toFixed(2);
    }

    if (p.textYOffset !== undefined) {
      document.getElementById("slider-text-y").value = p.textYOffset;
      document.getElementById("val-text-y").textContent = p.textYOffset.toFixed(2);
    }

    if (p.textPhrase !== undefined) {
      document.getElementById("input-text-phrase").value = p.textPhrase;
    }

    if (p.showText !== undefined) {
      document.getElementById("toggle-show-text").checked = p.showText;
    }

    // Bloom FX Synchronization
    if (p.bloomEnabled !== undefined) {
      const toggleBloom = document.getElementById("toggle-bloom");
      const bloomBadge = document.getElementById("bloom-status-badge");
      if (toggleBloom) toggleBloom.checked = !!p.bloomEnabled;
      if (bloomBadge) {
        bloomBadge.textContent = p.bloomEnabled ? "ACTIVE" : "OFF";
        bloomBadge.style.color = p.bloomEnabled ? "var(--accent-cyan)" : "var(--text-muted)";
      }
    }

    if (p.bloomStrength !== undefined) {
      const slider = document.getElementById("slider-bloom-strength");
      const val = document.getElementById("val-bloom-strength");
      if (slider) slider.value = p.bloomStrength;
      if (val) val.textContent = p.bloomStrength.toFixed(2);
    }

    if (p.bloomRadius !== undefined) {
      const slider = document.getElementById("slider-bloom-radius");
      const val = document.getElementById("val-bloom-radius");
      if (slider) slider.value = p.bloomRadius;
      if (val) val.textContent = p.bloomRadius.toFixed(2);
    }

    if (p.bloomReactivity !== undefined) {
      const slider = document.getElementById("slider-bloom-react");
      const val = document.getElementById("val-bloom-react");
      if (slider) slider.value = p.bloomReactivity;
      if (val) val.textContent = p.bloomReactivity.toFixed(2);
    }

    // Locks Synchronization (Top HUD Pills & Settings Drawer)
    const btnLockMode = document.getElementById("btn-lock-mode");
    if (btnLockMode) {
      btnLockMode.classList.toggle("locked", !!this.presets.lockMode);
      const icon = btnLockMode.querySelector(".lock-icon");
      if (icon) icon.textContent = this.presets.lockMode ? "🔒" : "🔓";
    }

    const btnLockColors = document.getElementById("btn-lock-colors");
    if (btnLockColors) {
      btnLockColors.classList.toggle("locked", !!this.presets.lockColors);
      const icon = btnLockColors.querySelector(".lock-icon");
      if (icon) icon.textContent = this.presets.lockColors ? "🔒" : "🔓";
    }

    const chkLockMode = document.getElementById("toggle-lock-mode");
    if (chkLockMode) chkLockMode.checked = !!this.presets.lockMode;

    const chkLockColors = document.getElementById("toggle-lock-colors");
    if (chkLockColors) chkLockColors.checked = !!this.presets.lockColors;

    const chkLockSliders = document.getElementById("toggle-lock-sliders");
    if (chkLockSliders) chkLockSliders.checked = !!this.presets.lockSliders;

    const chkLockText = document.getElementById("toggle-lock-text");
    if (chkLockText) chkLockText.checked = !!this.presets.lockText;

    const chkLockTextDrawer = document.getElementById("toggle-lock-text-drawer");
    if (chkLockTextDrawer) chkLockTextDrawer.checked = !!this.presets.lockText;

    const textLockIndicator = document.getElementById("text-lock-indicator");
    if (textLockIndicator) {
      textLockIndicator.style.display = this.presets.lockText ? "inline-block" : "none";
    }

    // Text Colors Synchronization
    const chkSyncTheme = document.getElementById("toggle-text-sync-theme");
    if (chkSyncTheme && p.textSyncTheme !== undefined) {
      chkSyncTheme.checked = !!p.textSyncTheme;
    }
    const customColorsContainer = document.getElementById("custom-text-colors-container");
    if (customColorsContainer && p.textSyncTheme !== undefined) {
      customColorsContainer.style.display = p.textSyncTheme ? "none" : "block";
    }

    const chkRandomColors = document.getElementById("toggle-text-random-colors");
    if (chkRandomColors && p.textRandomColors !== undefined) {
      chkRandomColors.checked = !!p.textRandomColors;
    }

    const pickerCore = document.getElementById("picker-text-core");
    if (pickerCore && p.textCoreColor) {
      pickerCore.value = p.textCoreColor;
    }

    const pickerGlow = document.getElementById("picker-text-glow");
    if (pickerGlow && p.textGlowColor) {
      pickerGlow.value = p.textGlowColor;
    }

    this.audio.setBassBoost(p.bassBoost);
    this.audio.setTrebleBoost(p.trebleBoost);
    this.audio.setSensitivity(p.sensitivity);
    this.audio.setSmoothing(p.smoothing);
  }

  setupThemePalettes() {
    const grid = document.getElementById("palette-grid");
    grid.innerHTML = "";

    Object.values(COLOR_THEMES).forEach(theme => {
      const btn = document.createElement("button");
      btn.className = `palette-btn ${theme.id === this.presets.currentThemeId ? "active" : ""}`;
      btn.dataset.themeId = theme.id;
      btn.title = theme.name;
      btn.style.background = `linear-gradient(135deg, ${theme.primary}, ${theme.secondary}, ${theme.accent})`;

      btn.addEventListener("click", () => {
        this.presets.setTheme(theme.id);
        this.visualizer.updateColors(this.presets.getTheme());
        this.syncColorPickers();
        this.highlightActiveTheme();
        this.showToast(`Theme: ${theme.name}`);
      });

      grid.appendChild(btn);
    });
  }

  highlightActiveTheme() {
    const buttons = document.querySelectorAll(".palette-btn");
    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.themeId === this.presets.currentThemeId);
    });
  }

  renderPresetsList() {
    const container = document.getElementById("saved-presets-list");
    container.innerHTML = "";
    const list = this.presets.getSavedPresets();

    if (list.length === 0) {
      container.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px;">No saved presets yet</div>`;
      return;
    }

    list.forEach(p => {
      const card = document.createElement("div");
      card.className = "preset-card";
      card.innerHTML = `
        <span class="preset-name">${p.name}</span>
        <button class="preset-del-btn" title="Delete preset">✕</button>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("preset-del-btn")) return;
        this.presets.loadPreset(p.id);
        this.visualizer.setMode(this.presets.params.mode, this.presets.getTheme(), this.presets.getModeParams(this.presets.params.mode));
        this.syncUIWithParams();
        this.syncColorPickers();
        this.highlightActiveTheme();
        this.updateModePillUI(this.presets.params.mode);
        this.renderModeInspector(this.presets.params.mode);
        this.showToast(`Loaded preset: ${p.name}`);
      });

      card.querySelector(".preset-del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.presets.deletePreset(p.id);
        this.renderPresetsList();
        this.showToast("Preset deleted");
      });

      container.appendChild(card);
    });
  }

  toggleHideHUD() {
    this.isHudLocked = !this.isHudLocked;
    clearTimeout(this.idleTimer);

    if (this.isHudLocked) {
      document.body.classList.add("hud-hidden");
      document.querySelectorAll(".drawer-panel.open, .modal-overlay.open").forEach(el => el.classList.remove("open"));
      this.showToast("HUD Hidden (Press 'H' or move mouse to top edge)");
    } else {
      document.body.classList.remove("hud-hidden");
      this.showToast("HUD Visible");
    }

    const btn = document.getElementById("btn-hide-hud");
    if (btn) {
      btn.classList.toggle("active", this.isHudLocked);
    }
  }

  switchMode(mode, isSilent = false) {
    this.presets.params.mode = mode;
    this.visualizer.setMode(mode, this.presets.getTheme(), this.presets.getModeParams(mode));
    this.updateModePillUI(mode);
    this.renderModeInspector(mode);

    if (!isSilent) {
      const modeNames = {
        cosmic: "Cosmic Swarm",
        tunnel: "Cyber Tunnel",
        liquid: "Liquid Orb",
        textArena: "Kinetic Text Arena",
        spectrumCity: "Neon Spectrum City",
        blackHole: "Black Hole Singularity",
        warpDrive: "Warp Drive",
        lasers: "Warp Drive",
        polyhedra: "Sacred Polyhedra"
      };
      this.showToast(`Mode: ${modeNames[mode] || mode}`);
    }
  }

  renderModeInspector(modeName) {
    const inspectorContainer = document.getElementById("mode-inspector-container");
    const inspectorName = document.getElementById("mode-inspector-name");
    const inspectorControls = document.getElementById("mode-inspector-controls");
    if (!inspectorControls) return;

    const normalizedMode = (modeName === "lasers") ? "warpDrive" : modeName;
    const schema = (window.MODE_PARAMS_SCHEMA && window.MODE_PARAMS_SCHEMA[normalizedMode]) || [];

    const modeLabels = {
      cosmic: "Cosmic Swarm",
      tunnel: "Cyber Tunnel",
      liquid: "Liquid Orb",
      textArena: "Kinetic Text Arena",
      spectrumCity: "Spectrum City",
      blackHole: "Black Hole",
      warpDrive: "Warp Drive",
      polyhedra: "Sacred Polyhedra"
    };

    if (inspectorName) {
      inspectorName.textContent = modeLabels[normalizedMode] || normalizedMode;
    }

    inspectorControls.innerHTML = "";

    if (schema.length === 0) {
      inspectorControls.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); padding: 6px 0;">No customizable parameters for this mode.</div>`;
      return;
    }

    const currentParams = this.presets.getModeParams(normalizedMode);

    schema.forEach(item => {
      const val = currentParams[item.key] !== undefined ? currentParams[item.key] : item.min;
      const isDecimal = item.step < 1;
      const formattedVal = isDecimal ? Number(val).toFixed(2) : Math.round(val);

      const controlItem = document.createElement("div");
      controlItem.className = "control-item";
      controlItem.innerHTML = `
        <div class="control-label-row">
          <span>${item.label}</span>
          <span id="val-modeparam-${item.key}">${formattedVal}</span>
        </div>
        <input type="range" id="slider-modeparam-${item.key}" min="${item.min}" max="${item.max}" step="${item.step}" value="${val}">
      `;

      const slider = controlItem.querySelector(`#slider-modeparam-${item.key}`);
      const valDisplay = controlItem.querySelector(`#val-modeparam-${item.key}`);

      slider.addEventListener("input", (e) => {
        const numVal = parseFloat(e.target.value);
        valDisplay.textContent = isDecimal ? numVal.toFixed(2) : Math.round(numVal);
        this.presets.setModeParam(normalizedMode, item.key, numVal);
        this.visualizer.applyModeParam(normalizedMode, item.key, numVal);
      });

      inspectorControls.appendChild(controlItem);
    });
  }

  updateModePillUI(mode) {
    const pills = document.querySelectorAll(".mode-pill");
    pills.forEach(pill => {
      const isActive = pill.dataset.mode === mode;
      pill.classList.toggle("active", isActive);
      if (isActive) {
        pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
  }

  setAspectRatio(ratio) {
    this.presets.params.aspectRatio = ratio;
    this.canvasWrapper.className = `ratio-${ratio}`;
    this.showToast(`Aspect Ratio: ${ratio.toUpperCase()}`);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /* ==========================================================================
     Drag & Drop Audio Files
     ========================================================================== */
  setupDragAndDrop() {
    const overlay = document.getElementById("dropzone-overlay");

    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      overlay.classList.add("drag-active");
    });

    window.addEventListener("dragleave", (e) => {
      if (e.clientX <= 0 || e.clientY <= 0) {
        overlay.classList.remove("drag-active");
      }
    });

    window.addEventListener("drop", (e) => {
      e.preventDefault();
      overlay.classList.remove("drag-active");

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
          this.audio.loadUserFile(file);
          document.getElementById("play-pause-btn").innerHTML = "❚❚";
        } else {
          this.showToast("Please drop an audio file (MP3, WAV, etc.)");
        }
      }
    });
  }

  /* ==========================================================================
     Auto-Hiding HUD
     ========================================================================== */
  setupAutoHidingHUD() {
    const resetTimer = () => {
      if (document.body.classList.contains("recording-active")) return;
      if (this.isHudLocked) return;

      document.body.classList.remove("hud-hidden");
      clearTimeout(this.idleTimer);

      const hasOpenDrawer = document.querySelector(".drawer-panel.open, #help-modal.open, #render-modal.open");
      if (!hasOpenDrawer) {
        this.idleTimer = setTimeout(() => {
          if (!this.isHudLocked) {
            document.body.classList.add("hud-hidden");
          }
        }, 3200);
      }
    };

    window.addEventListener("mousemove", (e) => {
      if (this.isHudLocked) {
        // When HUD is locked hidden, reveal it temporarily if cursor hovers the top edge
        if (e.clientY < 48) {
          document.body.classList.remove("hud-hidden");
        } else if (e.clientY > 90) {
          document.body.classList.add("hud-hidden");
        }
        return;
      }
      resetTimer();
    });

    window.addEventListener("mousedown", () => {
      if (this.isHudLocked) return;
      resetTimer();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "h") return;
      if (this.isHudLocked) return;
      resetTimer();
    });

    resetTimer();
  }

  /* ==========================================================================
     Keyboard Shortcuts
     ========================================================================== */
  setupShortcuts() {
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      const key = e.key.toLowerCase();

      if (e.code === "Space") {
        e.preventDefault();
        const playBtn = document.getElementById("play-pause-btn");
        const playing = this.audio.togglePlay();
        if (playBtn) playBtn.innerHTML = playing ? "❚❚" : "▶";
      } else if (key === "f") {
        this.toggleFullscreen();
      } else if (key === "h") {
        this.toggleHideHUD();
      } else if (key === "r") {
        this.presets.randomize();
        this.visualizer.updateColors(this.presets.getTheme());
        this.syncUIWithParams();
        this.syncColorPickers();
        this.highlightActiveTheme();
        this.showToast("✨ Shuffled Parameters!");
      } else if (key === "t") {
        const toggle = document.getElementById("toggle-show-text");
        toggle.checked = !toggle.checked;
        this.presets.params.showText = toggle.checked;
        this.showToast(toggle.checked ? "Text Overlay: ON" : "Text Overlay: OFF");
      } else if (key === "a") {
        this.presets.autoPilot = !this.presets.autoPilot;
        document.getElementById("btn-autopilot").classList.toggle("active", this.presets.autoPilot);
        this.showToast(this.presets.autoPilot ? "Auto-Pilot: ON" : "Auto-Pilot: OFF");
      } else if (key === "m") {
        this.toggleLock("mode");
      } else if (key === "c") {
        this.toggleLock("colors");
      } else if (key === "x") {
        this.toggleLock("text");
      } else if (key === "1") {
        this.switchMode("cosmic");
      } else if (key === "2") {
        this.switchMode("tunnel");
      } else if (key === "3") {
        this.switchMode("liquid");
      } else if (key === "4") {
        this.switchMode("textArena");
      } else if (key === "5") {
        this.switchMode("spectrumCity");
      } else if (key === "6") {
        this.switchMode("blackHole");
      } else if (key === "7") {
        this.switchMode("warpDrive");
      } else if (key === "8") {
        this.switchMode("polyhedra");
      } else if (key === "?") {
        document.getElementById("help-modal").classList.toggle("open");
      } else if (key === "escape") {
        document.querySelectorAll(".drawer-panel.open, #help-modal.open, #render-modal.open").forEach(el => {
          el.classList.remove("open");
        });
      }
    });
  }

  showToast(msg) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  /* ==========================================================================
     Spectrum Monitor Drawing
     ========================================================================== */
  drawSpectrum() {
    if (!this.spectrumCtx || !this.audio.frequencyData) return;

    const ctx = this.spectrumCtx;
    const width = this.spectrumCanvas.width;
    const height = this.spectrumCanvas.height;
    const data = this.audio.frequencyData;
    const count = 36;
    const step = Math.floor(data.length / count / 2);
    const barWidth = width / count - 1;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < count; i++) {
      const val = data[i * step] / 255;
      const barHeight = val * height;
      const theme = this.presets.getTheme();

      ctx.fillStyle = (i < count * 0.3) ? theme.primary : (i < count * 0.7 ? theme.secondary : theme.accent);
      ctx.fillRect(i * (barWidth + 1), height - barHeight, barWidth, barHeight);
    }
  }

  /* ==========================================================================
     Main Render Loop
     ========================================================================== */
  loop() {
    requestAnimationFrame(() => this.loop());

    const delta = this.visualizer && this.visualizer.isRecording ? 1 / 60 : 0.016;
    this.audio.update();
    this.presets.update(delta);
    this.visualizer.render(this.audio, this.presets);

    if (document.getElementById("settings-drawer").classList.contains("open")) {
      this.drawSpectrum();
    }
  }
}

window.App = App;

// Start app
const bootstrapApp = () => {
  if (!window.appInstance) {
    new App();
  }
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
  bootstrapApp();
}
