/**
 * Three.js Visualizer Coordinator
 * Manages WebGL scene, camera, aspect ratio resizing, render loop,
 * Kinetic Text engine, and seamless visual mode switching across all 7 modes.
 */

class VisualizerEngine {
  constructor(canvasElement, wrapperElement) {
    this.canvas = canvasElement;
    this.wrapper = wrapperElement;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    this.currentModeName = "cosmic";
    this.currentMode = null;
    this.textEngine = null;
    this.isRecording = false; // locked delta + 1080p resolution during capture

    // Mouse Interaction & 3D Orbit Controls
    this.isDragging = false;
    this.userRotX = 0;
    this.userRotY = 0;
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.previousMousePosition = { x: 0, y: 0 };
    this.currentFocusPoint = new THREE.Vector3(0, 0, 0);

    // Zoom Controls (Mouse Wheel & Pinch)
    this.targetZoom = 1.0;
    this.userZoom = 1.0;
    this.minZoom = 0.35;
    this.maxZoom = 2.5;

    this.initScene();
    this.initTextEngine();
    this.initEvents();
    this.initMouseInteraction();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x06070c, 0.012);

    const rect = this.wrapper.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 36);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Global Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(20, 40, 20);
    this.scene.add(this.dirLight);

    // Post-Processing: EffectComposer & UnrealBloomPass
    this.initPostProcessing(rect.width, rect.height);
  }

  initPostProcessing(width, height) {
    if (typeof THREE.EffectComposer === "undefined" || typeof THREE.UnrealBloomPass === "undefined") {
      console.warn("Three.js Post-Processing modules not loaded, falling back to direct WebGL render.");
      return;
    }

    try {
      this.renderPass = new THREE.RenderPass(this.scene, this.camera);

      // UnrealBloomPass parameters: resolution, strength, radius, threshold
      const bloomRes = new THREE.Vector2(width, height);
      this.bloomPass = new THREE.UnrealBloomPass(bloomRes, 1.2, 0.65, 0.15);

      this.composer = new THREE.EffectComposer(this.renderer);
      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.bloomPass);
    } catch (e) {
      console.error("Failed to initialize EffectComposer:", e);
      this.composer = null;
    }
  }

  initTextEngine() {
    this.textEngine = new KineticTextEngine(this.scene, this.camera);
  }

  setMode(modeName, theme, modeParams = null) {
    // Clean up existing mode
    if (this.currentMode) {
      this.currentMode.destroy();
      this.currentMode = null;
    }

    this.currentModeName = modeName;

    switch (modeName) {
      case "cosmic":
        this.camera.position.set(0, 0, 36);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new CosmicSwarmMode(this.scene, this.camera);
        break;
      case "tunnel":
        this.camera.position.set(0, 5, 20);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new CyberTunnelMode(this.scene, this.camera);
        break;
      case "liquid":
        this.camera.position.set(0, 0, 32);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new LiquidOrbMode(this.scene, this.camera);
        break;
      case "textArena":
        this.camera.position.set(0, 4, 34);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new TextArenaMode(this.scene, this.camera);
        break;
      case "spectrumCity":
        this.camera.position.set(0, 18, 36);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new SpectrumCityMode(this.scene, this.camera);
        break;
      case "blackHole":
        this.camera.position.set(0, 10, 38);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new BlackHoleMode(this.scene, this.camera);
        break;
      case "warpDrive":
      case "lasers":
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new WarpDriveMode(this.scene, this.camera);
        break;
      case "polyhedra":
        this.camera.position.set(0, 0, 36);
        this.camera.rotation.set(0, 0, 0);
        this.currentMode = new SacredPolyhedraMode(this.scene, this.camera);
        break;
      default:
        this.currentMode = new CosmicSwarmMode(this.scene, this.camera);
    }

    if (this.currentMode) {
      this.currentMode.init(theme);

      // Apply mode-specific procedural parameters
      const params = modeParams || (window.app?.presets ? window.app.presets.getModeParams(modeName) : null);
      if (params && this.currentMode.setCustomParam) {
        for (const [key, value] of Object.entries(params)) {
          this.currentMode.setCustomParam(key, value);
        }
      }
    }

    // Reset user rotation and set focus center for this mode
    this.resetUserRotation();
    switch (modeName) {
      case "tunnel":
        this.currentFocusPoint.set(0, 5, -25);
        break;
      case "warpDrive":
      case "lasers":
        this.currentFocusPoint.set(0, 0, -100);
        break;
      default:
        this.currentFocusPoint.set(0, 0, 0);
        break;
    }

    // Update text overlay position according to mode
    if (this.textEngine) {
      this.textEngine.setMode(modeName);
      if (modeName === "textArena") {
        this.textEngine.setVisible(true);
      }
    }
  }

  applyModeParam(modeName, key, value) {
    if (this.currentModeName === modeName && this.currentMode && this.currentMode.setCustomParam) {
      this.currentMode.setCustomParam(key, value);
    }
  }

  updateColors(theme) {
    if (this.currentMode && this.currentMode.updateColors) {
      this.currentMode.updateColors(theme);
    }
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.wrapper) return;
    if (this.isRecording) return; // don't let window resize disrupt the recording resolution

    const rect = this.wrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  setRecordingResolution(active) {
    this.isRecording = active;
    if (active) {
      // Lock to 1920x1080 @ pixel ratio 1 — clean consistent 1080p frames
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(1920, 1080);
      this.camera.aspect = 1920 / 1080;
      this.camera.updateProjectionMatrix();
      if (this.composer) {
        this.composer.setSize(1920, 1080);
      }
    } else {
      // Restore screen resolution
      const rect = this.wrapper.getBoundingClientRect();
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (this.composer) {
        this.composer.setSize(rect.width, rect.height);
      }
    }
  }

  initEvents() {
    window.addEventListener("resize", () => {
      this.onResize();
    });

    const resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    resizeObserver.observe(this.wrapper);
  }

  initMouseInteraction() {
    const onStart = (clientX, clientY) => {
      this.isDragging = true;
      this.previousMousePosition = { x: clientX, y: clientY };
      document.body.classList.add("canvas-dragging");
    };

    const onMove = (clientX, clientY) => {
      if (!this.isDragging) return;

      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      this.previousMousePosition = { x: clientX, y: clientY };

      // Inverted deltaX so dragging left orbits left, dragging right orbits right
      const sensitivity = 0.006;
      this.targetRotY += deltaX * sensitivity;
      this.targetRotX += deltaY * sensitivity;

      // Clamp vertical pitch to prevent flipping upside down (-75 deg to +75 deg)
      const maxPitch = 1.3;
      this.targetRotX = Math.max(-maxPitch, Math.min(maxPitch, this.targetRotX));
    };

    const onEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        document.body.classList.remove("canvas-dragging");
      }
    };

    // Canvas & Wrapper mousedown
    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Left mouse click only
      // Ignore clicks on UI elements
      if (e.target.closest("button, input, select, textarea, .glass-btn, .drawer-panel, #help-modal, #render-modal, #live-audio-modal, #hud-reveal-trigger, #top-hud, #bottom-hud, #recording-banner")) {
        return;
      }
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    };

    this.canvas.addEventListener("mousedown", handleMouseDown);
    this.wrapper.addEventListener("mousedown", handleMouseDown);

    window.addEventListener("mousemove", (e) => {
      onMove(e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", onEnd);

    // Mouse Wheel Zoom
    const handleWheel = (e) => {
      // Don't intercept scroll on UI drawers or modals
      if (e.target.closest("button, input, select, textarea, .glass-btn, .drawer-panel, #help-modal, #render-modal, #live-audio-modal, #top-hud, #bottom-hud")) {
        return;
      }
      e.preventDefault();

      // Normalize delta across browsers and mice
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
      const zoomSpeed = 0.0018;
      this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom + delta * zoomSpeed));
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    // Touch support (1-finger orbit, 2-finger pinch zoom)
    let initialPinchDist = null;
    let initialZoom = 1.0;

    const handleTouchStart = (e) => {
      if (e.target.closest("button, input, select, textarea, .glass-btn, .drawer-panel, #top-hud, #bottom-hud")) return;

      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoom = this.targetZoom;
      }
    };

    this.canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    this.wrapper.addEventListener("touchstart", handleTouchStart, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && !initialPinchDist) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && initialPinchDist) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (currentDist > 0) {
          const factor = initialPinchDist / currentDist;
          this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, initialZoom * factor));
        }
      }
    }, { passive: true });

    const handleTouchEnd = () => {
      onEnd();
      initialPinchDist = null;
    };

    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    // Double-click on canvas or wrapper to smoothly reset camera angle and zoom
    const handleDblClick = (e) => {
      if (e.target.closest("button, input, select, textarea, .glass-btn, .drawer-panel, #top-hud, #bottom-hud")) return;
      this.resetUserRotation();
      if (window.appInstance && window.appInstance.showToast) {
        window.appInstance.showToast("Camera View & Zoom Reset");
      }
    };

    this.canvas.addEventListener("dblclick", handleDblClick);
    this.wrapper.addEventListener("dblclick", handleDblClick);
  }

  resetUserRotation() {
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.targetZoom = 1.0;
  }

  getModeCameraConfig(modeName) {
    switch (modeName) {
      case "cosmic":
        return { radius: 36, focusY: 0, baseY: 0, autoOrbit: 0 };
      case "liquid":
        return { radius: 32, focusY: 0, baseY: 0, autoOrbit: 0 };
      case "textArena":
        return { radius: 34, focusY: 0, baseY: 4, autoOrbit: 0 };
      case "spectrumCity":
        return { radius: 38, focusY: 0, baseY: 14, autoOrbit: 0.18 };
      case "blackHole":
        return { radius: 40, focusY: 0, baseY: 8, autoOrbit: 0.22 };
      case "warpDrive":
      case "lasers":
        return { isCockpit: true };
      case "polyhedra":
        return { radius: 36, focusY: 0, baseY: 0, autoOrbit: 0.14 };
      case "tunnel":
        return { isTunnel: true };
      default:
        return { radius: 36, focusY: 0, baseY: 0, autoOrbit: 0 };
    }
  }

  render(audio, presetManager) {
    // During recording: fixed 1/60s timestep so physics never jumps on frame spikes
    const rawDelta = this.clock.getDelta();
    const delta = this.isRecording
      ? Math.min(rawDelta, 1 / 60)
      : Math.min(rawDelta, 0.1);
    const theme = presetManager.getTheme();

    // 1. Update active 3D visual mode
    if (this.currentMode) {
      this.currentMode.update(audio, delta, theme);
    }

    // 2. Update Kinetic 3D Text Engine
    if (this.textEngine) {
      const p = presetManager.params;
      this.textEngine.setMode(this.currentModeName);
      this.textEngine.setText(p.textPhrase);
      this.textEngine.setFont(p.textFont);
      this.textEngine.setChaosLevel(p.textChaos);
      this.textEngine.setDepth(p.textDepth !== undefined ? p.textDepth : 1.6);
      this.textEngine.setScale(p.textScale);
      this.textEngine.setYOffset(p.textYOffset);
      this.textEngine.setVisible(p.showText);
      this.textEngine.sparksEnabled = p.textSparks;
      this.textEngine.setSyncTheme(p.textSyncTheme !== undefined ? p.textSyncTheme : true);
      this.textEngine.setRandomizeColors(p.textRandomColors !== undefined ? p.textRandomColors : false);
      if (p.textCoreColor && p.textGlowColor) {
        this.textEngine.setCustomColors(p.textCoreColor, p.textGlowColor);
      }

      this.textEngine.update(audio, delta, theme);
    }

    // 3. Smooth momentum interpolation for mouse rotation & zoom
    this.userRotX += (this.targetRotX - this.userRotX) * 0.1;
    this.userRotY += (this.targetRotY - this.userRotY) * 0.1;
    this.userZoom += (this.targetZoom - this.userZoom) * 0.12;

    const cfg = this.getModeCameraConfig(this.currentModeName);

    if (cfg.isTunnel || cfg.isCockpit) {
      // First-person cockpit look-around (Cyber Tunnel & Warp Drive)
      const bass = audio ? (audio.bass || 0) : 0;
      let camX = 0;
      let camY = 0;
      let camZ = 0;

      if (cfg.isTunnel) {
        camX = Math.sin(performance.now() * 0.001) * 2.0;
        camY = 5 + (bass * 1.2);
        const zoomOffset = (this.userZoom - 1.0) * 16;
        camZ = 20 + zoomOffset;
      } else {
        // Warp Drive: Cockpit look-around with flight drift & zoom
        const t = performance.now() * 0.001;
        camX = Math.sin(t * 0.5) * 1.2;
        camY = Math.cos(t * 0.7) * 0.8;
        camZ = (this.userZoom - 1.0) * 25;
      }

      this.camera.position.set(camX, camY, camZ);

      const lookDist = 50;
      const lookYaw = this.userRotY;
      const lookPitch = this.userRotX;

      const targetX = camX - Math.sin(lookYaw) * lookDist;
      const targetY = camY - Math.sin(lookPitch) * lookDist;
      const targetZ = camZ - Math.cos(lookYaw) * lookDist;

      this.camera.lookAt(targetX, targetY, targetZ);
      this.camera.rotation.z = Math.sin(performance.now() * 0.0008) * (cfg.isTunnel ? 0.04 : 0.06);
    } else {
      // Free Orbit Modes: Spherical Orbit around (0, cfg.focusY, 0)
      const time = performance.now() * 0.001;
      const autoAngle = (cfg.autoOrbit > 0) ? (time * cfg.autoOrbit * presetManager.params.cameraSpeed) : 0;

      // Subtle organic breathing drift for cosmic / liquid
      let driftX = 0;
      let driftY = 0;
      if (["cosmic", "liquid"].includes(this.currentModeName)) {
        const driftTime = performance.now() * 0.0004 * presetManager.params.cameraSpeed;
        driftX = Math.sin(driftTime) * 3;
        driftY = Math.cos(driftTime * 0.8) * 2;
      }

      const totalYaw = this.userRotY + autoAngle;
      const totalPitch = Math.max(-1.3, Math.min(1.3, this.userRotX));

      // Radius dynamically scaled by userZoom
      const r = cfg.radius * this.userZoom;
      const cosPitch = Math.cos(totalPitch);
      const sinPitch = Math.sin(totalPitch);

      const posX = Math.sin(totalYaw) * (r * cosPitch) + driftX;
      const posY = cfg.focusY + cfg.baseY + (sinPitch * r) + driftY;
      const posZ = Math.cos(totalYaw) * (r * cosPitch);

      this.camera.position.set(posX, posY, posZ);
      this.camera.lookAt(0, cfg.focusY, 0);
    }

    // 4. Dynamic Audio-Reactive Neon Bloom Modulation
    const p = presetManager.params;
    const isBloomActive = p.bloomEnabled !== false && this.composer && this.bloomPass;

    if (isBloomActive) {
      const bass = audio ? (audio.bass || 0) : 0;
      const treble = audio ? (audio.treble || 0) : 0;
      const beatPunch = (this.textEngine && this.textEngine.beatPunch) ? this.textEngine.beatPunch : 0;

      const baseStrength = p.bloomStrength !== undefined ? p.bloomStrength : 1.2;
      const baseRadius = p.bloomRadius !== undefined ? p.bloomRadius : 0.65;
      const reactivity = p.bloomReactivity !== undefined ? p.bloomReactivity : 0.8;

      // Dynamic swell on bass punch & spark drops
      const dynamicStrength = baseStrength + (bass * 0.75 + beatPunch * 0.95 + treble * 0.3) * reactivity;
      const dynamicRadius = baseRadius + (bass * 0.25 + beatPunch * 0.35) * reactivity;

      this.bloomPass.strength = Math.max(0, dynamicStrength);
      this.bloomPass.radius = Math.max(0.05, dynamicRadius);

      // Render through post-processing pipeline
      this.composer.render();
    } else {
      // Direct WebGL render fallback
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.VisualizerEngine = VisualizerEngine;
