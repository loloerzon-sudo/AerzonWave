/**
 * Mode 6: Black Hole Singularity
 * Pitch black event horizon with glowing photon sphere lensing ring,
 * relativistic accretion disk vortex with Doppler beaming, and bipolar plasma jet beams.
 */

class BlackHoleMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    this.eventHorizon = null;
    this.photonRing = null;
    this.accretionParticles = null;
    this.particleCount = 9000;
    this.positions = null;
    this.colors = null;
    this.particleData = [];

    this.jetBeamTop = null;
    this.jetBeamBottom = null;
    this.gravitationalRings = [];

    // Custom Mode Parameters
    this.singularityRadius = 2.8;
    this.accretionSpin = 1.4;
    this.gravDistortion = 1.2;
  }

  init(theme) {
    // 1. Pitch Black Event Horizon
    const horizonGeo = new THREE.SphereGeometry(6, 48, 48);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.eventHorizon = new THREE.Mesh(horizonGeo, horizonMat);
    const initialHScale = this.singularityRadius / 2.8;
    this.eventHorizon.scale.set(initialHScale, initialHScale, initialHScale);
    this.group.add(this.eventHorizon);

    // 2. Glowing Photon Ring (Gravitational Lensing Ring)
    const ringGeo = new THREE.RingGeometry(6.1, 6.7, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: theme.accent,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.photonRing = new THREE.Mesh(ringGeo, ringMat);
    this.photonRing.scale.set(initialHScale, initialHScale, 1);
    this.photonRing.rotation.x = Math.PI / 3;
    this.group.add(this.photonRing);

    // 3. Relativistic Accretion Disk Particles
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.particleData = [];

    const colApproaching = new THREE.Color(theme.primary);
    const colReceding = new THREE.Color(theme.secondary);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      // Spiral accretion radius from 7 to 32
      const radius = 6.8 + Math.pow(Math.random(), 1.8) * 26;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (3 / (1 + radius * 0.1));

      const x = Math.cos(angle) * radius;
      const y = height;
      const z = Math.sin(angle) * radius;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      // Keplerian velocity: inner particles orbit much faster than outer particles
      const speed = (0.8 / Math.sqrt(radius)) * 2.5;

      this.particleData.push({ radius, angle, height, speed });

      // Doppler beaming color: one side blue/cyan shifted, opposite side red/magenta shifted
      const doppler = (Math.cos(angle) + 1) / 2;
      const c = new THREE.Color().lerpColors(colReceding, colApproaching, doppler);

      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85
    });
    this.accretionParticles = new THREE.Points(this.geometry, pMat);
    this.group.add(this.accretionParticles);

    // 4. Bipolar Relativistic Plasma Jet Beams
    const jetGeo = new THREE.CylinderGeometry(0.2, 3.5, 48, 16);
    const jetMat = new THREE.MeshBasicMaterial({
      color: theme.primary,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.jetBeamTop = new THREE.Mesh(jetGeo, jetMat);
    this.jetBeamTop.position.y = 24;
    this.group.add(this.jetBeamTop);

    this.jetBeamBottom = new THREE.Mesh(jetGeo, jetMat);
    this.jetBeamBottom.position.y = -24;
    this.jetBeamBottom.rotation.x = Math.PI;
    this.group.add(this.jetBeamBottom);

    this.scene.add(this.group);
  }

  update(audio, delta, theme) {
    if (!this.accretionParticles) return;

    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;
    const time = performance.now() * 0.001;

    // Event Horizon and Photon ring pulse
    const baseHScale = this.singularityRadius / 2.8;
    if (this.eventHorizon) {
      const hScale = baseHScale * (1.0 + bass * 0.08);
      this.eventHorizon.scale.set(hScale, hScale, hScale);
    }

    const ringScale = baseHScale * (1.0 + bass * 0.25 * this.gravDistortion);
    this.photonRing.scale.set(ringScale, ringScale, 1);
    this.photonRing.rotation.z += delta * 0.4 * this.accretionSpin;

    // Plasma Jets Pulse with bass kick
    const jetScaleX = (1.0 + bass * 1.6) * Math.sqrt(baseHScale);
    const jetScaleY = (1.0 + bass * 0.8) * Math.sqrt(baseHScale);
    this.jetBeamTop.scale.set(jetScaleX, jetScaleY, jetScaleX);
    this.jetBeamBottom.scale.set(jetScaleX, jetScaleY, jetScaleX);
    this.jetBeamTop.material.opacity = 0.4 + bass * 0.6;
    this.jetBeamBottom.material.opacity = 0.4 + bass * 0.6;

    // Relativistic Particle Orbit & Infall
    const pos = this.positions;
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particleData[i];
      const i3 = i * 3;

      // Keplerian orbit acceleration with mid frequency turbulence
      p.angle += p.speed * delta * (1 + mid * 1.5) * (this.accretionSpin / 1.4);

      // Bass gravitational pulse
      const r = p.radius + Math.sin(time * 3 + p.radius * 0.5) * (bass * 1.5 * this.gravDistortion);

      pos[i3] = Math.cos(p.angle) * r;
      pos[i3 + 1] = p.height + (Math.sin(p.angle * 3 + time * 4) * (treble * 1.2 * this.gravDistortion));
      pos[i3 + 2] = Math.sin(p.angle) * r;
    }
    this.geometry.attributes.position.needsUpdate = true;

    // Camera dynamic orbital tilt
    this.camera.position.x = Math.sin(time * 0.25) * 38;
    this.camera.position.y = 12 + Math.cos(time * 0.3) * 10;
    this.camera.position.z = Math.cos(time * 0.25) * 38;
    this.camera.lookAt(0, 0, 0);
  }

  setCustomParam(key, value) {
    if (key === "singularityRadius") {
      this.singularityRadius = Number(value) || 2.8;
      const s = this.singularityRadius / 2.8;
      if (this.eventHorizon) this.eventHorizon.scale.set(s, s, s);
      if (this.photonRing) this.photonRing.scale.set(s, s, 1);
    } else if (key === "accretionSpin") {
      this.accretionSpin = Number(value) || 1.4;
    } else if (key === "gravDistortion") {
      this.gravDistortion = Number(value) || 1.2;
    }
  }

  updateColors(theme) {
    if (this.photonRing) this.photonRing.material.color.set(theme.accent);
    if (this.jetBeamTop) this.jetBeamTop.material.color.set(theme.primary);
    if (this.jetBeamBottom) this.jetBeamBottom.material.color.set(theme.primary);

    if (this.geometry && this.colors) {
      const colApproaching = new THREE.Color(theme.primary);
      const colReceding = new THREE.Color(theme.secondary);

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const p = this.particleData[i];
        const doppler = (Math.cos(p.angle) + 1) / 2;
        const c = new THREE.Color().lerpColors(colReceding, colApproaching, doppler);
        this.colors[i3] = c.r;
        this.colors[i3 + 1] = c.g;
        this.colors[i3 + 2] = c.b;
      }
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.eventHorizon) {
      this.eventHorizon.geometry.dispose();
      this.eventHorizon.material.dispose();
    }
    if (this.photonRing) {
      this.photonRing.geometry.dispose();
      this.photonRing.material.dispose();
    }
    if (this.geometry) this.geometry.dispose();
    if (this.accretionParticles) this.accretionParticles.material.dispose();
    if (this.jetBeamTop) {
      this.jetBeamTop.geometry.dispose();
      this.jetBeamTop.material.dispose();
    }
    if (this.jetBeamBottom) {
      this.jetBeamBottom.geometry.dispose();
      this.jetBeamBottom.material.dispose();
    }
    this.particleData = [];
  }
}

window.BlackHoleMode = BlackHoleMode;
