/**
 * Presets, Themes, and Randomization Manager
 * Handles color palettes, freeform hex color pickers, parameter morphing ("Surprise Me"),
 * Auto-Pilot party mode, custom kinetic text settings, and localStorage persistence.
 */

const COLOR_THEMES = {
  cyber: {
    id: "cyber",
    name: "Cyber Neon",
    primary: "#00f2fe",
    secondary: "#fe019a",
    accent: "#7928ca"
  },
  sunset: {
    id: "sunset",
    name: "Sunset Horizon",
    primary: "#ffb703",
    secondary: "#fb5607",
    accent: "#8338ec"
  },
  matrix: {
    id: "matrix",
    name: "Matrix Toxic",
    primary: "#00ff87",
    secondary: "#60efff",
    accent: "#0061ff"
  },
  glacier: {
    id: "glacier",
    name: "Deep Glacier",
    primary: "#4facfe",
    secondary: "#00f2fe",
    accent: "#2e0854"
  },
  vapor: {
    id: "vapor",
    name: "Vaporwave Dream",
    primary: "#ff758c",
    secondary: "#ff7eb3",
    accent: "#6a11cb"
  },
  aurora: {
    id: "aurora",
    name: "Aurora Borealis",
    primary: "#43e97b",
    secondary: "#38f9d7",
    accent: "#e0c3fc"
  },
  darkCrimson: {
    id: "darkCrimson",
    name: "Dark Crimson",
    primary: "#ff1a1a",
    secondary: "#8b0000",
    accent: "#1a0000"
  }
};

const ALL_MODES = ["cosmic", "tunnel", "liquid", "textArena", "spectrumCity", "blackHole", "warpDrive", "polyhedra"];

const DEFAULT_MODE_PARAMS = {
  cosmic: {
    starDensity: 8000,
    swarmRadius: 40
  },
  tunnel: {
    mountainHeight: 1.4,
    sunScale: 1.2,
    highwaySpeed: 45
  },
  liquid: {
    viscosity: 1.0,
    orbScale: 1.0,
    dropletCount: 32
  },
  textArena: {
    spotlightSpeed: 1.0,
    pillarHeight: 45
  },
  spectrumCity: {
    skyscraperHeight: 24,
    cityGridSize: 8
  },
  blackHole: {
    singularityRadius: 2.8,
    accretionSpin: 1.4,
    gravDistortion: 1.2
  },
  warpDrive: {
    cruisingVelocity: 120,
    starStreakDensity: 1800,
    slipstreamRings: 18
  },
  polyhedra: {
    gimbalSpeed: 1.0,
    shardCount: 60,
    coreScale: 1.0
  }
};

const MODE_PARAMS_SCHEMA = {
  cosmic: [
    { key: "starDensity", label: "Star Density", min: 1000, max: 16000, step: 500 },
    { key: "swarmRadius", label: "Swarm Radius", min: 18, max: 70, step: 1 }
  ],
  tunnel: [
    { key: "mountainHeight", label: "Mountain Elevation", min: 0.5, max: 3.0, step: 0.1 },
    { key: "sunScale", label: "Retro Sun Scale", min: 0.5, max: 2.5, step: 0.1 },
    { key: "highwaySpeed", label: "Highway Cruising Speed", min: 20, max: 90, step: 1 }
  ],
  liquid: [
    { key: "viscosity", label: "Surface Viscosity / Waviness", min: 0.4, max: 2.5, step: 0.1 },
    { key: "orbScale", label: "Orb Core Scale", min: 0.5, max: 2.0, step: 0.1 },
    { key: "dropletCount", label: "Droplet Swarm Count", min: 10, max: 60, step: 2 }
  ],
  textArena: [
    { key: "spotlightSpeed", label: "Spotlight Sweep Speed", min: 0.2, max: 3.0, step: 0.1 },
    { key: "pillarHeight", label: "Light Pillar Height", min: 15, max: 65, step: 1 }
  ],
  spectrumCity: [
    { key: "skyscraperHeight", label: "Skyscraper Height", min: 10, max: 45, step: 1 },
    { key: "cityGridSize", label: "City Grid Density", min: 4, max: 10, step: 1 }
  ],
  blackHole: [
    { key: "singularityRadius", label: "Singularity Event Horizon", min: 1.0, max: 6.0, step: 0.1 },
    { key: "accretionSpin", label: "Accretion Disk Spin", min: 0.5, max: 3.5, step: 0.1 },
    { key: "gravDistortion", label: "Gravitational Lensing", min: 0.5, max: 3.0, step: 0.1 }
  ],
  warpDrive: [
    { key: "cruisingVelocity", label: "Cruising Velocity", min: 40, max: 240, step: 5 },
    { key: "starStreakDensity", label: "Star Streak Density", min: 600, max: 2400, step: 50 },
    { key: "slipstreamRings", label: "Slipstream Rings", min: 8, max: 28, step: 1 }
  ],
  polyhedra: [
    { key: "gimbalSpeed", label: "Gimbal Spin Speed", min: 0.2, max: 3.0, step: 0.1 },
    { key: "shardCount", label: "Orbital Shards Count", min: 20, max: 120, step: 5 },
    { key: "coreScale", label: "Core Crystal Scale", min: 0.5, max: 2.5, step: 0.1 }
  ]
};

class PresetManager {
  constructor() {
    this.currentThemeId = "cyber";
    this.currentTheme = { ...COLOR_THEMES.cyber };

    this.params = {
      bassBoost: 1.2,
      trebleBoost: 1.0,
      sensitivity: 1.0,
      smoothing: 0.82,
      cameraSpeed: 1.0,
      aspectRatio: "full",
      mode: "cosmic", // cosmic | tunnel | liquid | textArena | spectrumCity | blackHole | lasers

      // Kinetic User Text Settings
      textPhrase: "NIRZ\nAETHERWAVE",
      textFont: "Orbitron, -apple-system, sans-serif",
      textChaos: 1.4,
      textDepth: 1.6,
      textScale: 1.0,
      textYOffset: 0.0,
      showText: true,
      textSparks: true,

      // Text Color Customization
      textSyncTheme: true,
      textRandomColors: false,
      textCoreColor: "#ffffff",
      textGlowColor: "#00f2fe",

      // Neon Bloom Post-Processing
      bloomEnabled: true,
      bloomStrength: 1.2,
      bloomRadius: 0.65,
      bloomReactivity: 0.8
    };

    // Target params for smooth lerping
    this.targetParams = { ...this.params };
    this.isInterpolating = false;

    // Locks
    this.lockMode = false;
    this.lockColors = false;
    this.lockSliders = false;
    this.lockText = false;
    this.loadLocks();

    // Auto-Pilot
    this.autoPilot = false;
    this.autoPilotTimer = 0;
    this.autoPilotBeatCounter = 0;

    // Mode-Specific Custom Parameters
    this.modeParams = JSON.parse(JSON.stringify(DEFAULT_MODE_PARAMS));
    this.loadModeParams();

    // Storage Key
    this.storageKey = "nirz_visualizer_custom_presets_v2";
  }

  getTheme() {
    return this.currentTheme;
  }

  setTheme(themeId) {
    if (COLOR_THEMES[themeId]) {
      this.currentThemeId = themeId;
      this.currentTheme = { ...COLOR_THEMES[themeId] };
    }
  }

  setCustomColor(type, hex) {
    if (this.currentTheme[type] !== undefined) {
      this.currentTheme[type] = hex;
      this.currentThemeId = "custom";
    }
  }

  // Convert HSL to Hex
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // Surprise Me / Randomize with procedural harmonic neon color triads (respecting locks)
  randomize() {
    // 1. Truly random generative harmonic colors (if colors not locked)
    if (!this.lockColors) {
      const baseHue = Math.floor(Math.random() * 360);
      const secondaryHue = (baseHue + 110 + Math.floor(Math.random() * 60)) % 360;
      const accentHue = (baseHue + 210 + Math.floor(Math.random() * 70)) % 360;

      const primaryHex = this.hslToHex(baseHue, 95, 55);
      const secondaryHex = this.hslToHex(secondaryHue, 92, 52);
      const accentHex = this.hslToHex(accentHue, 95, 58);

      this.currentTheme = {
        id: "custom",
        name: "Generative Harmonics",
        primary: primaryHex,
        secondary: secondaryHex,
        accent: accentHex
      };
      this.currentThemeId = "custom";
    }

    // 2. Smoothly randomize parameters within sweet spots (if sliders not locked)
    if (!this.lockSliders) {
      this.targetParams.bassBoost = +(0.8 + Math.random() * 1.0).toFixed(2);
      this.targetParams.trebleBoost = +(0.6 + Math.random() * 1.1).toFixed(2);
      this.targetParams.sensitivity = +(0.8 + Math.random() * 0.7).toFixed(2);
      this.targetParams.smoothing = +(0.75 + Math.random() * 0.16).toFixed(2);
      this.targetParams.cameraSpeed = +(0.6 + Math.random() * 1.2).toFixed(2);
      if (!this.lockText) {
        this.targetParams.textChaos = +(0.8 + Math.random() * 1.4).toFixed(2);
        this.targetParams.textDepth = +(0.8 + Math.random() * 2.2).toFixed(2);
      }
      this.isInterpolating = true;
    }

    if (window.appInstance) {
      if (!this.lockColors) {
        window.appInstance.visualizer.updateColors(this.getTheme());
        window.appInstance.syncColorPickers();
      }
      if (!this.lockSliders) {
        window.appInstance.syncUIWithParams();
      }
    }
  }

  // Smooth parameter LERP frame update
  update(delta) {
    if (this.isInterpolating) {
      let allSettled = true;
      const lerpSpeed = 0.08;

      for (const key of ["bassBoost", "trebleBoost", "sensitivity", "smoothing", "cameraSpeed", "textChaos", "textDepth"]) {
        const diff = this.targetParams[key] - this.params[key];
        if (Math.abs(diff) > 0.005) {
          this.params[key] += diff * lerpSpeed;
          allSettled = false;
        } else {
          this.params[key] = this.targetParams[key];
        }
      }

      if (allSettled) {
        this.isInterpolating = false;
      }
    }

    // Auto-Pilot Progression
    if (this.autoPilot) {
      this.autoPilotTimer += delta;
      // Auto-morph colors & cycle visual modes every 8 seconds (even when silent or paused)
      if (this.autoPilotTimer >= 8.0) {
        this.autoPilotTimer = 0;
        this.randomize();

        // Advance to next visual mode if mode is not locked
        if (!this.lockMode) {
          const nextMode = ALL_MODES[(ALL_MODES.indexOf(this.params.mode) + 1) % ALL_MODES.length];
          this.params.mode = nextMode;
          if (window.appInstance) {
            window.appInstance.switchMode(nextMode, true); // true = silent switch without popup
          }
        }
      }
    }
  }

  onBeatDrop() {
    if (this.autoPilot) {
      this.autoPilotBeatCounter++;
      // Switch visual mode every 16 heavy beats silently without toast text (if mode not locked)
      if (this.autoPilotBeatCounter >= 16) {
        this.autoPilotBeatCounter = 0;
        this.autoPilotTimer = 0; // Reset silent timer on real musical drop
        this.randomize();

        if (!this.lockMode) {
          const nextMode = ALL_MODES[(ALL_MODES.indexOf(this.params.mode) + 1) % ALL_MODES.length];
          this.params.mode = nextMode;
          if (window.appInstance) {
            window.appInstance.switchMode(nextMode, true); // true = silent switch
          }
        }
      }
    }
  }

  // Lock Management
  setLock(type, value) {
    if (type === "mode") this.lockMode = value;
    if (type === "colors") this.lockColors = value;
    if (type === "sliders") this.lockSliders = value;
    if (type === "text") this.lockText = value;
    this.saveLocks();
  }

  saveLocks() {
    try {
      localStorage.setItem("nirz_visualizer_locks", JSON.stringify({
        mode: this.lockMode,
        colors: this.lockColors,
        sliders: this.lockSliders,
        text: this.lockText
      }));
    } catch (e) {}
  }

  loadLocks() {
    try {
      const data = localStorage.getItem("nirz_visualizer_locks");
      if (data) {
        const parsed = JSON.parse(data);
        this.lockMode = !!parsed.mode;
        this.lockColors = !!parsed.colors;
        this.lockSliders = !!parsed.sliders;
        this.lockText = !!parsed.text;
      }
    } catch (e) {}
  }

  // Mode Customization Parameters Management
  getModeParams(mode) {
    return this.modeParams[mode] || (DEFAULT_MODE_PARAMS[mode] ? { ...DEFAULT_MODE_PARAMS[mode] } : {});
  }

  setModeParam(mode, key, value) {
    if (!this.modeParams[mode]) {
      this.modeParams[mode] = DEFAULT_MODE_PARAMS[mode] ? { ...DEFAULT_MODE_PARAMS[mode] } : {};
    }
    this.modeParams[mode][key] = parseFloat(value);
    this.saveModeParams();

    if (window.appInstance && window.appInstance.visualizer) {
      window.appInstance.visualizer.applyModeParam(mode, key, parseFloat(value));
    }
  }

  saveModeParams() {
    try {
      localStorage.setItem("nirz_visualizer_mode_params", JSON.stringify(this.modeParams));
    } catch (e) {}
  }

  loadModeParams() {
    try {
      const data = localStorage.getItem("nirz_visualizer_mode_params");
      if (data) {
        const parsed = JSON.parse(data);
        Object.keys(parsed).forEach(m => {
          if (this.modeParams[m]) {
            Object.assign(this.modeParams[m], parsed[m]);
          }
        });
      }
    } catch (e) {}
  }

  // LocalStorage Custom Presets
  getSavedPresets() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  savePreset(name) {
    const presets = this.getSavedPresets();
    const newPreset = {
      id: "preset_" + Date.now(),
      name: name || "Custom " + (presets.length + 1),
      params: { ...this.params },
      modeParams: JSON.parse(JSON.stringify(this.modeParams)),
      theme: { ...this.currentTheme },
      themeId: this.currentThemeId,
      timestamp: Date.now()
    };
    presets.push(newPreset);
    localStorage.setItem(this.storageKey, JSON.stringify(presets));
    return newPreset;
  }

  deletePreset(id) {
    let presets = this.getSavedPresets();
    presets = presets.filter(p => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(presets));
  }

  loadPreset(id) {
    const presets = this.getSavedPresets();
    const found = presets.find(p => p.id === id);
    if (found) {
      Object.assign(this.params, found.params);
      Object.assign(this.targetParams, found.params);
      if (found.modeParams) {
        Object.keys(found.modeParams).forEach(m => {
          if (this.modeParams[m]) {
            Object.assign(this.modeParams[m], found.modeParams[m]);
          }
        });
        this.saveModeParams();
      }
      if (found.theme) {
        this.currentTheme = { ...found.theme };
        this.currentThemeId = found.themeId || "custom";
      } else if (found.themeId) {
        this.setTheme(found.themeId);
      }
      return true;
    }
    return false;
  }
}

window.COLOR_THEMES = COLOR_THEMES;
window.ALL_MODES = ALL_MODES;
window.DEFAULT_MODE_PARAMS = DEFAULT_MODE_PARAMS;
window.MODE_PARAMS_SCHEMA = MODE_PARAMS_SCHEMA;
window.PresetManager = PresetManager;
