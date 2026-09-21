/**
 * Mode 1: Cosmic Swarm
 * 16,000+ particle galactic swarm swirling in harmonic orbits,
 * reacting to bass shockwaves, mid-range turbulence, and treble shimmer.
 */

class CosmicSwarmMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.particleCount = 16000;
    this.group = new THREE.Group();

    this.particles = null;
    this.geometry = null;
    this.material = null;
    this.positions = null;
    this.velocities = null;
    this.initialCoords = null;
    this.colors = null;

    // Core Star/Orb
    this.coreMesh = null;
    this.shockwaveRings = [];

    this.rotationSpeed = 0.4;
    this.shockwaveStrength = 0;

    // Custom Mode Parameters
    this.starDensity = 8000;
    this.swarmRadius = 40;
  }

  init(theme) {
    // 1. Swarm Geometry
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.initialCoords = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);

    const color1 = new THREE.Color(theme.primary);
    const color2 = new THREE.Color(theme.secondary);
    const color3 = new THREE.Color(theme.accent);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Logarithmic spiral / galactic disk distribution
      const radius = 2 + Math.pow(Math.random(), 2.2) * 45;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (18 / (1 + radius * 0.15));

      const x = Math.cos(angle) * radius;
      const y = height;
      const z = Math.sin(angle) * radius;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.initialCoords[i3] = x;
      this.initialCoords[i3 + 1] = y;
      this.initialCoords[i3 + 2] = z;

      // Orbital angular speed inversely proportional to distance
      this.velocities[i3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      // Color gradient from core to rim
      const t = Math.min(1, radius / 40);
      const c = new THREE.Color();
      if (t < 0.4) {
        c.lerpColors(color1, color2, t / 0.4);
      } else {
        c.lerpColors(color2, color3, (t - 0.4) / 0.6);
      }

      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    // Particle sprite using procedural soft circle canvas texture
    const texture = this.createParticleTexture();

    this.material = new THREE.PointsMaterial({
      size: 1.2,
      map: texture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.85
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.geometry.setDrawRange(0, this.starDensity);
    const initialScale = this.swarmRadius / 40;
    this.particles.scale.set(initialScale, initialScale, initialScale);
    this.group.add(this.particles);

    // 2. Central Pulsing Star
    const coreGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: theme.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.coreMesh);

    // 3. Shockwave rings
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.RingGeometry(2.2 + r * 1.5, 2.4 + r * 1.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: theme.accent,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.shockwaveRings.push(ring);
      this.group.add(ring);
    }

    this.scene.add(this.group);
  }

  createParticleTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.7)");
    grad.addColorStop(0.7, "rgba(255, 255, 255, 0.15)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  update(audio, delta, theme) {
    if (!this.particles) return;

    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;
    const overall = audio.overall;

    // React to beat drops
    if (audio.beatDetected) {
      this.shockwaveStrength = 1.0;
    }
    this.shockwaveStrength *= 0.92;

    // Group Rotation
    const speed = (0.2 + mid * 0.8) * this.rotationSpeed;
    this.group.rotation.y += delta * speed;
    this.group.rotation.x = Math.sin(performance.now() * 0.0008) * 0.15;

    // Update Central Star
    const coreScale = 1.0 + bass * 1.8 + this.shockwaveStrength * 0.6;
    this.coreMesh.scale.set(coreScale, coreScale, coreScale);
    this.coreMesh.rotation.y -= delta * 1.2;
    this.coreMesh.rotation.z += delta * 0.8;

    // Shockwave Rings Expand
    this.shockwaveRings.forEach((ring, idx) => {
      const ringScale = 1.0 + (this.shockwaveStrength * (1.5 + idx * 0.8)) + bass * 0.5;
      ring.scale.set(ringScale, ringScale, ringScale);
      ring.material.opacity = Math.max(0.1, 0.3 + this.shockwaveStrength * 0.7);
      ring.rotation.z += delta * (0.5 + idx * 0.3);
    });

    // Particle Swarm Dynamics
    const pos = this.positions;
    const init = this.initialCoords;
    const time = performance.now() * 0.001;
    const activeCount = Math.min(this.starDensity || this.particleCount, this.particleCount);

    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      const ox = init[i3];
      const oy = init[i3 + 1];
      const oz = init[i3 + 2];

      const dist = Math.sqrt(ox * ox + oz * oz);

      // Bass shockwave push
      const push = (this.shockwaveStrength * 12 + bass * 8) * (1 / (1 + dist * 0.12));

      // Treble jitter & sparkle
      const jitter = (Math.random() - 0.5) * treble * 0.8;

      // Harmonic wave oscillation
      const wave = Math.sin(time * 2 + dist * 0.4) * (mid * 3.5);

      const angle = Math.atan2(oz, ox) + (0.01 * (40 / Math.max(5, dist))) * (1 + mid);
      const currentRadius = dist + push;

      pos[i3] = Math.cos(angle) * currentRadius + jitter;
      pos[i3 + 1] = oy + wave + jitter;
      pos[i3 + 2] = Math.sin(angle) * currentRadius + jitter;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // Particle size reacts to treble
    this.material.size = 1.0 + treble * 2.2 + this.shockwaveStrength * 0.8;
  }

  updateColors(theme) {
    if (!this.geometry || !this.colors) return;

    const color1 = new THREE.Color(theme.primary);
    const color2 = new THREE.Color(theme.secondary);
    const color3 = new THREE.Color(theme.accent);

    this.coreMesh.material.color.set(theme.primary);
    this.shockwaveRings.forEach(ring => ring.material.color.set(theme.accent));

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const ox = this.initialCoords[i3];
      const oz = this.initialCoords[i3 + 2];
      const dist = Math.sqrt(ox * ox + oz * oz);

      const t = Math.min(1, dist / 40);
      const c = new THREE.Color();
      if (t < 0.4) {
        c.lerpColors(color1, color2, t / 0.4);
      } else {
        c.lerpColors(color2, color3, (t - 0.4) / 0.6);
      }

      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;
    }

    this.geometry.attributes.color.needsUpdate = true;
  }

  setCustomParam(key, value) {
    if (key === "starDensity") {
      this.starDensity = Math.min(this.particleCount, Math.max(100, Math.round(Number(value))));
      if (this.geometry) {
        this.geometry.setDrawRange(0, this.starDensity);
      }
    } else if (key === "swarmRadius") {
      this.swarmRadius = Number(value) || 40;
      if (this.particles) {
        const s = this.swarmRadius / 40;
        this.particles.scale.set(s, s, s);
      }
    }
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.coreMesh) {
      this.coreMesh.geometry.dispose();
      this.coreMesh.material.dispose();
    }
    this.shockwaveRings.forEach(ring => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
    this.shockwaveRings = [];
  }
}

window.CosmicSwarmMode = CosmicSwarmMode;
