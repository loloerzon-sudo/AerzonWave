/**
 * Mode 7: Hyperspace Warp Drive
 * First-person light-speed space flight with relativistic star streaks,
 * glowing hyperspace slipstream rings, and explosive hyperdrive surges on beat drops.
 */

class WarpDriveMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    // Star Streaks System (LineSegments for stretched relativistic rays)
    this.starCount = 2400;
    this.stars = [];
    this.starGeo = null;
    this.starMat = null;
    this.starLines = null;
    this.starPositions = null;
    this.starColors = null;

    // Slipstream Rings
    this.ringCount = 28;
    this.rings = [];
    this.ringGroup = new THREE.Group();

    // Cosmic Dust Particles
    this.dustCount = 600;
    this.dustGeo = null;
    this.dustMat = null;
    this.dustPoints = null;
    this.dustPositions = null;

    // Physics & Hyperdrive Acceleration
    this.speed = 120;
    this.hyperBoost = 0;
    this.tunnelZ = -380;
    this.frontZ = 40;

    // Custom Mode Parameters
    this.cruisingVelocity = 120;
    this.starStreakDensity = 1800;
    this.slipstreamRings = 18;
  }

  init(theme) {
    this.createStarStreaks(theme);
    this.createSlipstreamRings(theme);
    this.createCosmicDust(theme);

    this.scene.add(this.group);
  }

  createStarStreaks(theme) {
    this.starPositions = new Float32Array(this.starCount * 6); // 2 vertices per star (head & tail)
    this.starColors = new Float32Array(this.starCount * 6);

    const primCol = new THREE.Color(theme.primary);
    const secCol = new THREE.Color(theme.secondary);
    const accCol = new THREE.Color(theme.accent || theme.primary);

    this.stars = [];

    for (let i = 0; i < this.starCount; i++) {
      const i6 = i * 6;
      // Cylinder distribution around camera path
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.5 + Math.pow(Math.random(), 1.5) * 85;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = this.tunnelZ + Math.random() * (this.frontZ - this.tunnelZ);
      const speedMult = 0.7 + Math.random() * 0.6;

      this.stars.push({
        x: x,
        y: y,
        z: z,
        radius: radius,
        angle: angle,
        speedMult: speedMult,
        length: 1.5 + Math.random() * 3.5
      });

      // Tail vertex (further back)
      this.starPositions[i6] = x;
      this.starPositions[i6 + 1] = y;
      this.starPositions[i6 + 2] = z - 2;

      // Head vertex (leading forward)
      this.starPositions[i6 + 3] = x;
      this.starPositions[i6 + 4] = y;
      this.starPositions[i6 + 5] = z;

      // Color variation
      const col = (Math.random() < 0.5) ? primCol : (Math.random() < 0.8 ? secCol : accCol);
      // Tail is dimmer, head is brighter
      this.starColors[i6] = col.r * 0.4;
      this.starColors[i6 + 1] = col.g * 0.4;
      this.starColors[i6 + 2] = col.b * 0.4;

      this.starColors[i6 + 3] = col.r * 1.4;
      this.starColors[i6 + 4] = col.g * 1.4;
      this.starColors[i6 + 5] = col.b * 1.4;
    }

    this.starGeo = new THREE.BufferGeometry();
    this.starGeo.setAttribute("position", new THREE.BufferAttribute(this.starPositions, 3));
    this.starGeo.setAttribute("color", new THREE.BufferAttribute(this.starColors, 3));
    this.starGeo.setDrawRange(0, this.starStreakDensity * 2);

    this.starMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
      depthWrite: false
    });

    this.starLines = new THREE.LineSegments(this.starGeo, this.starMat);
    this.group.add(this.starLines);
  }

  createSlipstreamRings(theme) {
    this.rings = [];
    this.ringGroup.clear();

    const ringGeo = new THREE.RingGeometry(18, 19.2, 48);
    const ringSpacing = (Math.abs(this.tunnelZ) + this.frontZ) / this.ringCount;

    for (let i = 0; i < this.ringCount; i++) {
      const ratio = i / this.ringCount;
      const color = new THREE.Color(theme.secondary).lerp(new THREE.Color(theme.primary), ratio);

      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25 + ratio * 0.45,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.position.z = this.tunnelZ + i * ringSpacing;
      mesh.visible = (i < this.slipstreamRings);
      this.rings.push({
        mesh: mesh,
        baseZ: mesh.position.z,
        baseScale: 1.0,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.004 + Math.random() * 0.008)
      });

      this.ringGroup.add(mesh);
    }

    this.group.add(this.ringGroup);
  }

  createCosmicDust(theme) {
    this.dustPositions = new Float32Array(this.dustCount * 3);
    const dustColors = new Float32Array(this.dustCount * 3);
    const col = new THREE.Color(theme.accent || theme.primary);

    for (let i = 0; i < this.dustCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 45;

      this.dustPositions[i3] = Math.cos(angle) * radius;
      this.dustPositions[i3 + 1] = Math.sin(angle) * radius;
      this.dustPositions[i3 + 2] = this.tunnelZ + Math.random() * (this.frontZ - this.tunnelZ);

      dustColors[i3] = col.r;
      dustColors[i3 + 1] = col.g;
      dustColors[i3 + 2] = col.b;
    }

    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute("position", new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustGeo.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));

    this.dustMat = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
      depthWrite: false
    });

    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.group.add(this.dustPoints);
  }

  update(audio, delta, theme) {
    const bass = audio ? (audio.bass || 0) : 0;
    const mid = audio ? (audio.mid || 0) : 0;
    const treble = audio ? (audio.treble || 0) : 0;

    // Hyperdrive beat explosion
    if (audio && audio.beatDetected) {
      this.hyperBoost = 1.0;
    }
    this.hyperBoost *= 0.91;

    // Relativistic velocity
    const baseSpeed = this.cruisingVelocity || this.speed;
    const currentSpeed = (baseSpeed + (bass * 140) + (this.hyperBoost * 280)) * delta;
    const streakLengthFactor = 1.0 + (bass * 4.5) + (this.hyperBoost * 9.0);

    // 1. Update Star Streaks
    if (this.starPositions) {
      const pos = this.starPositions;
      const activeStars = Math.min(this.starStreakDensity, this.starCount);
      for (let i = 0; i < activeStars; i++) {
        const s = this.stars[i];
        const i6 = i * 6;

        s.z += currentSpeed * s.speedMult;

        // Respawn star far ahead if it flies behind camera
        if (s.z > this.frontZ) {
          s.z = this.tunnelZ + (Math.random() * 20);
          const angle = Math.random() * Math.PI * 2;
          const radius = 3.5 + Math.pow(Math.random(), 1.5) * 85;
          s.x = Math.cos(angle) * radius;
          s.y = Math.sin(angle) * radius;
        }

        const streakLen = s.length * streakLengthFactor;

        // Tail vertex
        pos[i6] = s.x;
        pos[i6 + 1] = s.y;
        pos[i6 + 2] = s.z - streakLen;

        // Head vertex
        pos[i6 + 3] = s.x;
        pos[i6 + 4] = s.y;
        pos[i6 + 5] = s.z;
      }
      this.starGeo.attributes.position.needsUpdate = true;
    }

    // 2. Update Slipstream Rings
    const ringSpeed = currentSpeed * 0.85;
    const totalDist = Math.abs(this.tunnelZ) + this.frontZ;

    this.rings.forEach(r => {
      r.mesh.position.z += ringSpeed;
      if (r.mesh.position.z > this.frontZ) {
        r.mesh.position.z -= totalDist;
      }

      // Audio-reactive ring scale and rotation
      const scale = 1.0 + mid * 0.45 + this.hyperBoost * 0.35;
      r.mesh.scale.set(scale, scale, 1.0);
      r.mesh.rotation.z += r.rotSpeed * (1.0 + treble * 2.0);
    });

    // 3. Update Cosmic Dust
    if (this.dustPositions) {
      const pos = this.dustPositions;
      for (let i = 0; i < this.dustCount; i++) {
        const i3 = i * 3;
        pos[i3 + 2] += currentSpeed * 0.65;
        if (pos[i3 + 2] > this.frontZ) {
          pos[i3 + 2] = this.tunnelZ + (Math.random() * 20);
        }
      }
      this.dustGeo.attributes.position.needsUpdate = true;
    }

    // Subtle cockpit turbulence on heavy beat
    this.group.rotation.z = Math.sin(performance.now() * 0.001) * 0.02 + (this.hyperBoost * (Math.random() - 0.5) * 0.04);
  }

  updateColors(theme) {
    if (!this.starColors) return;

    const primCol = new THREE.Color(theme.primary);
    const secCol = new THREE.Color(theme.secondary);
    const accCol = new THREE.Color(theme.accent || theme.primary);

    for (let i = 0; i < this.starCount; i++) {
      const i6 = i * 6;
      const col = (i % 2 === 0) ? primCol : ((i % 3 === 0) ? secCol : accCol);

      this.starColors[i6] = col.r * 0.4;
      this.starColors[i6 + 1] = col.g * 0.4;
      this.starColors[i6 + 2] = col.b * 0.4;

      this.starColors[i6 + 3] = col.r * 1.4;
      this.starColors[i6 + 4] = col.g * 1.4;
      this.starColors[i6 + 5] = col.b * 1.4;
    }
    this.starGeo.attributes.color.needsUpdate = true;

    this.rings.forEach((r, i) => {
      const ratio = i / this.rings.length;
      r.mesh.material.color.copy(secCol.clone().lerp(primCol, ratio));
    });

    if (this.dustMat) {
      this.dustMat.color.copy(accCol);
    }
  }

  setCustomParam(key, value) {
    if (key === "cruisingVelocity") {
      this.cruisingVelocity = Number(value) || 120;
      this.speed = this.cruisingVelocity;
    } else if (key === "starStreakDensity") {
      this.starStreakDensity = Math.min(this.starCount, Math.max(100, Math.round(Number(value))));
      if (this.starGeo) {
        this.starGeo.setDrawRange(0, this.starStreakDensity * 2);
      }
    } else if (key === "slipstreamRings") {
      this.slipstreamRings = Math.min(this.ringCount, Math.max(1, Math.round(Number(value))));
      this.rings.forEach((r, i) => {
        r.mesh.visible = (i < this.slipstreamRings);
      });
    }
  }

  destroy() {
    this.scene.remove(this.group);

    if (this.starGeo) this.starGeo.dispose();
    if (this.starMat) this.starMat.dispose();

    this.rings.forEach(r => {
      if (r.mesh.geometry) r.mesh.geometry.dispose();
      if (r.mesh.material) r.mesh.material.dispose();
    });
    this.rings = [];

    if (this.dustGeo) this.dustGeo.dispose();
    if (this.dustMat) this.dustMat.dispose();

    this.group.clear();
  }
}

window.WarpDriveMode = WarpDriveMode;
