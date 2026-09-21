/**
 * Audio-Reactive Kinetic Text Engine
 * Supports single-line and multiline typography (Line 1, Line 2, Line 3...)
 * Auto-balances vertical centering and dynamic font scaling.
 * Stays crisp and calm on silence; goes crazy with bass slams, RGB split/glitch,
 * wave ripples, and spark explosions when music plays.
 */

class KineticTextEngine {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Configurable Parameters
    this.text = "NIRZ\nAETHERWAVE";
    this.fontFamily = "'Orbitron', sans-serif";
    this.chaosLevel = 1.4;
    this.depth = 1.6;
    this.baseScale = 1.0;
    this.yOffset = 0.0;
    this.visible = true;
    this.sparksEnabled = true;

    // Canvas & Texture
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    // Volumetric 3D Group & Solid Extrusion Slices
    this.group = new THREE.Group();
    this.sliceCount = 28;
    this.slices = [];
    this.geometry = new THREE.PlaneGeometry(36, 18);

    for (let i = 0; i < this.sliceCount; i++) {
      const isFront = (i === 0);
      const mat = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: true,
        depthTest: true,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        opacity: 1.0
      });
      const sliceMesh = new THREE.Mesh(this.geometry, mat);
      sliceMesh.renderOrder = isFront ? 10 : 9;
      this.slices.push(sliceMesh);
      this.group.add(sliceMesh);
    }

    this.mesh = this.slices[0]; // For backwards compatibility
    this.group.position.set(0, 0, 8);
    this.scene.add(this.group);

    // Dynamic Physics & Reaction State
    this.beatPunch = 0;
    this.glitchTimer = 0;

    // Mode-aware 3D Depth Positioning
    this.currentModeName = "cosmic";
    this.baseZ = 8;
    this.baseY = 0;

    // Spark Particles System
    this.maxSparks = 250;
    this.sparks = [];
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.maxSparks * 3);
    this.sparkColors = new Float32Array(this.maxSparks * 3);
    this.sparkGeo.setAttribute("position", new THREE.BufferAttribute(this.sparkPositions, 3));
    this.sparkGeo.setAttribute("color", new THREE.BufferAttribute(this.sparkColors, 3));

    this.sparkMat = new THREE.PointsMaterial({
      size: 0.85,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
    this.scene.add(this.sparkPoints);

    // Text Color Customization & Beat Randomization
    this.syncTheme = true;
    this.randomizeColors = false;
    this.customCoreColor = "#ffffff";
    this.customGlowColor = "#00f2fe";

    this.neonPalettes = [
      { core: "#ffffff", glow: "#00f2fe", secondary: "#fe019a", accent: "#7928ca" },
      { core: "#ffffff", glow: "#39ff14", secondary: "#00f2fe", accent: "#ff007f" },
      { core: "#ffffbb", glow: "#ff007f", secondary: "#7928ca", accent: "#00f2fe" },
      { core: "#ffffff", glow: "#ff9900", secondary: "#ff0033", accent: "#ffee00" },
      { core: "#e0e7ff", glow: "#00ffcc", secondary: "#ff00bb", accent: "#0066ff" },
      { core: "#ffffff", glow: "#ff0055", secondary: "#ffff00", accent: "#00e5ff" },
      { core: "#ffffff", glow: "#a855f7", secondary: "#ec4899", accent: "#3b82f6" },
      { core: "#ffffff", glow: "#06b6d4", secondary: "#10b981", accent: "#f59e0b" },
      { core: "#ff9999", glow: "#ff1a1a", secondary: "#8b0000", accent: "#cc0000" }
    ];
    this.currentNeonIdx = 0;
    this.randomTheme = { ...this.neonPalettes[0] };

    // Initial draw
    this.drawText(0, 0, 0, false, { primary: "#00f2fe", secondary: "#fe019a", accent: "#7928ca" });
  }

  setSyncTheme(val) {
    this.syncTheme = !!val;
  }

  setRandomizeColors(val) {
    this.randomizeColors = !!val;
  }

  setCustomColors(core, glow) {
    if (core) this.customCoreColor = core;
    if (glow) this.customGlowColor = glow;
  }

  morphRandomColors() {
    this.currentNeonIdx = (this.currentNeonIdx + 1 + Math.floor(Math.random() * (this.neonPalettes.length - 1))) % this.neonPalettes.length;
    this.randomTheme = { ...this.neonPalettes[this.currentNeonIdx] };
  }

  getResolvedColors(sceneTheme) {
    if (this.randomizeColors) {
      return {
        primary: this.randomTheme.glow,
        secondary: this.randomTheme.secondary,
        accent: this.randomTheme.accent,
        core: this.randomTheme.core,
        glow: this.randomTheme.glow
      };
    }
    if (!this.syncTheme) {
      return {
        primary: this.customGlowColor,
        secondary: this.customGlowColor,
        accent: this.customGlowColor,
        core: this.customCoreColor,
        glow: this.customGlowColor
      };
    }
    return {
      primary: sceneTheme.primary,
      secondary: sceneTheme.secondary,
      accent: sceneTheme.accent,
      core: "#ffffff",
      glow: sceneTheme.primary
    };
  }

  setMode(modeName) {
    this.currentModeName = modeName;
    if (modeName === "warpDrive" || modeName === "lasers") {
      this.baseZ = -24;
      this.baseY = 0;
    } else if (modeName === "tunnel") {
      this.baseZ = -6;
      this.baseY = 2.5;
    } else if (modeName === "spectrumCity") {
      this.baseZ = 8;
      this.baseY = 4;
    } else if (modeName === "blackHole") {
      this.baseZ = 8;
      this.baseY = 2;
    } else {
      this.baseZ = 8;
      this.baseY = 0;
    }
  }

  setText(newText) {
    this.text = newText;
  }

  setFont(newFont) {
    this.fontFamily = newFont;
  }

  setChaosLevel(val) {
    this.chaosLevel = val;
  }

  setDepth(val) {
    this.depth = parseFloat(val) || 0;
  }

  setScale(val) {
    this.baseScale = val;
  }

  setYOffset(val) {
    this.yOffset = val;
  }

  setVisible(visible) {
    this.visible = visible;
    this.group.visible = visible;
    this.sparkPoints.visible = visible;
  }

  triggerBeatSparks(theme, bass) {
    if (!this.sparksEnabled || !this.visible) return;

    const colors = this.getResolvedColors(theme);
    const count = Math.floor(20 + bass * 40 * this.chaosLevel);
    const color = new THREE.Color((Math.random() > 0.5) ? colors.primary : colors.secondary);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.9 * (1 + bass);
      this.sparks.push({
        x: (Math.random() - 0.5) * 18,
        y: this.baseY + this.yOffset + (Math.random() - 0.5) * 6,
        z: this.baseZ + (Math.random() - 0.5) * 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed * 1.5,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        r: color.r,
        g: color.g,
        b: color.b
      });

      if (this.sparks.length > this.maxSparks) {
        this.sparks.shift();
      }
    }
  }

  updateSparks(delta) {
    const pos = this.sparkPositions;
    const col = this.sparkColors;

    for (let i = 0; i < this.maxSparks; i++) {
      const i3 = i * 3;
      if (i < this.sparks.length) {
        const s = this.sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;
        s.life -= s.decay;

        pos[i3] = s.x;
        pos[i3 + 1] = s.y;
        pos[i3 + 2] = s.z;

        col[i3] = s.r * s.life;
        col[i3 + 1] = s.g * s.life;
        col[i3 + 2] = s.b * s.life;
      } else {
        pos[i3] = 9999;
        pos[i3 + 1] = 9999;
        pos[i3 + 2] = 9999;
      }
    }

    this.sparks = this.sparks.filter(s => s.life > 0);
    this.sparkGeo.attributes.position.needsUpdate = true;
    this.sparkGeo.attributes.color.needsUpdate = true;
  }

  drawText(bass, mid, treble, isGlitch, theme) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Multiline parsing
    const rawLines = (this.text || "").split("\n");
    const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) {
      this.texture.needsUpdate = true;
      return;
    }

    const colors = this.getResolvedColors(theme);
    const isSilent = (bass < 0.04 && mid < 0.04);
    const time = performance.now() * 0.003;

    // 1. Auto-Calculate Font Size based on line count and character length
    let baseFontSize = 74;
    if (lines.length === 2) baseFontSize = 54;
    else if (lines.length === 3) baseFontSize = 42;
    else if (lines.length >= 4) baseFontSize = 32;

    // Scale down if any line is particularly long
    const maxLineLen = Math.max(...lines.map(l => l.length));
    if (maxLineLen > 14) {
      const scaleFactor = 14 / maxLineLen;
      baseFontSize = Math.max(22, Math.floor(baseFontSize * scaleFactor));
    }

    const lineHeight = baseFontSize * 1.32;
    const totalBlockHeight = (lines.length - 1) * lineHeight;
    const startY = (h / 2) - (totalBlockHeight / 2);
    const centerX = w / 2;

    ctx.font = `900 ${baseFontSize}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isSilent) {
      // CALM ON SILENCE: Razor-sharp solid text with clean border stroke
      const breath = 1 + Math.sin(time * 0.8) * 0.02;
      ctx.save();
      ctx.translate(centerX, h / 2);
      ctx.scale(breath, breath);
      ctx.translate(-centerX, -h / 2);

      lines.forEach((line, i) => {
        const lineY = startY + i * lineHeight;

        // Solid crisp core
        ctx.fillStyle = colors.core;
        ctx.fillText(line, centerX, lineY);

        // Clean crisp border outline
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors.primary;
        ctx.strokeText(line, centerX, lineY);
      });

      ctx.restore();

    } else {
      // ACTIVE MUSIC: Solid razor-sharp chiseled text with clean, elegant dynamics
      const chaos = this.chaosLevel;
      const pulseGlow = isGlitch ? 1.2 : 1.0;

      lines.forEach((line, lineIdx) => {
        const lineY = startY + lineIdx * lineHeight;
        const waveOffset = Math.sin(time * 2.0 + lineIdx * 1.0) * (mid * 4 * chaos);

        ctx.save();

        if (isGlitch) {
          // Subtle neon echo on beat
          ctx.fillStyle = colors.secondary;
          ctx.globalAlpha = 0.6;
          ctx.fillText(line, centerX + waveOffset + 2, lineY + 1);
          ctx.globalAlpha = 1.0;
        }

        // Solid crisp primary core
        ctx.fillStyle = colors.core;
        ctx.fillText(line, centerX + waveOffset, lineY);

        // Solid crisp outline
        ctx.lineWidth = 3 * pulseGlow;
        ctx.strokeStyle = isGlitch ? colors.primary : colors.accent;
        ctx.strokeText(line, centerX + waveOffset, lineY);

        ctx.restore();
      });
    }

    this.texture.needsUpdate = true;
  }

  update(audio, delta, theme) {
    if (!this.visible) return;

    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;

    if (audio.beatDetected) {
      this.beatPunch = 1.0;
      this.glitchTimer = 0.08;
      if (this.randomizeColors) {
        this.morphRandomColors();
      }
      this.triggerBeatSparks(theme, bass);
    }

    this.beatPunch *= 0.72;
    this.glitchTimer = Math.max(0, this.glitchTimer - delta);

    const isGlitch = this.glitchTimer > 0;

    // Redraw multiline text
    this.drawText(bass, mid, treble, isGlitch, theme);

    // 3D Scale Punch & Bass Slam
    const audioScale = (1.0 + (bass * 0.38 + this.beatPunch * 0.45) * this.chaosLevel) * this.baseScale;
    this.group.scale.set(audioScale, audioScale, 1.0);

    // 3D Position & Elevation
    this.group.position.y = this.baseY + this.yOffset + Math.sin(performance.now() * 0.0015) * (0.3 + bass * 1.5 * this.chaosLevel);
    this.group.position.z = this.baseZ + (this.beatPunch * 3.5 * this.chaosLevel);

    // 3D Wobble & Rotation
    this.group.rotation.z = Math.sin(performance.now() * 0.002) * (0.02 + bass * 0.12 * this.chaosLevel);
    this.group.rotation.y = Math.sin(performance.now() * 0.0016) * (0.04 + mid * 0.18 * this.chaosLevel);
    this.group.rotation.x = Math.cos(performance.now() * 0.0018) * (0.03 + treble * 0.15 * this.chaosLevel);

    // Dynamic 3D Volumetric Extrusion Spacing & Chiseled Side-Wall Shading
    const dynamicDepth = (this.depth + (bass * 1.8 + this.beatPunch * 2.2) * this.chaosLevel);
    const resolvedColors = this.getResolvedColors(theme);
    const sideBaseColor = new THREE.Color(resolvedColors.accent || resolvedColors.primary);

    this.slices.forEach((mesh, i) => {
      if (i === 0) {
        // Front face: 100% pristine solid core
        mesh.position.z = 0;
        mesh.material.color.set("#ffffff");
        mesh.material.opacity = 1.0;
      } else {
        const ratio = i / (this.sliceCount - 1);
        mesh.position.z = -ratio * dynamicDepth;

        // Chiseled side-wall shading: smoothly darkens from front to rear (1.0 -> 0.22)
        const depthShade = 1.0 - (ratio * 0.78);
        const wallColor = sideBaseColor.clone().multiplyScalar(depthShade);
        mesh.material.color.copy(wallColor);
        mesh.material.opacity = 1.0;
      }
    });

    // Update Spark Particles
    this.updateSparks(delta);
  }

  destroy() {
    this.scene.remove(this.group);
    this.scene.remove(this.sparkPoints);
    if (this.geometry) this.geometry.dispose();
    this.slices.forEach(mesh => {
      if (mesh.material) mesh.material.dispose();
    });
    this.slices = [];
    if (this.texture) this.texture.dispose();
    if (this.sparkGeo) this.sparkGeo.dispose();
    if (this.sparkMat) this.sparkMat.dispose();
  }
}

window.KineticTextEngine = KineticTextEngine;
