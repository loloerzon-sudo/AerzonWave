/**
 * Mode 8: Sacred Polyhedra
 * An audio-reactive cosmic geometric sanctuary featuring nested Platonic solids:
 * - Crystalline Inner Octahedron (pulses with heavy bass)
 * - Counter-rotating Wireframe Icosahedron (twists on gimbal axes with mid frequencies)
 * - Outer Dodecahedron Cage (breathes and ripples with overall energy)
 * - Orbital Shards (60 floating tetrahedrons that explode outward on beat drops)
 */

class SacredPolyhedraMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    // Meshes & Materials
    this.coreMesh = null;
    this.coreWireMesh = null;
    this.middleIcosaMesh = null;
    this.outerDodecaMesh = null;
    this.starField = null;

    // Shards
    this.shardGroup = new THREE.Group();
    this.shards = [];
    this.maxShardCount = 120;
    this.shardCount = 60;
    this.blastPunch = 0;

    // Custom Mode Parameters
    this.gimbalSpeed = 1.0;
    this.coreScale = 1.0;
  }

  init(theme) {
    // 1. Inner Crystalline Core (Octahedron)
    const coreGeo = new THREE.OctahedronGeometry(5.8, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: theme.primary,
      transparent: true,
      opacity: 0.55,
      wireframe: false
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.coreMesh);

    // Core Wireframe Facet Lines
    const coreWireGeo = new THREE.OctahedronGeometry(5.82, 0);
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    this.coreWireMesh = new THREE.Mesh(coreWireGeo, coreWireMat);
    this.group.add(this.coreWireMesh);

    // 2. Middle Shell (Icosahedron Wireframe)
    const icosaGeo = new THREE.IcosahedronGeometry(11.5, 0);
    const icosaMat = new THREE.MeshBasicMaterial({
      color: theme.secondary,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });
    this.middleIcosaMesh = new THREE.Mesh(icosaGeo, icosaMat);
    this.group.add(this.middleIcosaMesh);

    // 3. Outer Cage (Dodecahedron Wireframe)
    const dodecaGeo = new THREE.DodecahedronGeometry(17.5, 0);
    const dodecaMat = new THREE.MeshBasicMaterial({
      color: theme.accent,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    this.outerDodecaMesh = new THREE.Mesh(dodecaGeo, dodecaMat);
    this.group.add(this.outerDodecaMesh);

    // 4. Orbital Shards (Floating Mini-Tetrahedrons)
    const tetraGeo = new THREE.TetrahedronGeometry(0.75, 0);
    for (let i = 0; i < this.maxShardCount; i++) {
      const isAlt = (i % 2 === 0);
      const shardMat = new THREE.MeshBasicMaterial({
        color: isAlt ? theme.secondary : theme.accent,
        wireframe: true,
        transparent: true,
        opacity: 0.8
      });

      const mesh = new THREE.Mesh(tetraGeo, shardMat);
      mesh.visible = (i < this.shardCount);
      const baseRadius = 20 + (i % 4) * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      this.shards.push({
        mesh: mesh,
        baseRadius: baseRadius,
        currentRadius: baseRadius,
        theta: theta,
        phi: phi,
        speedTheta: (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1),
        speedPhi: (0.1 + Math.random() * 0.25) * (Math.random() > 0.5 ? 1 : -1),
        rotX: (Math.random() - 0.5) * 2,
        rotY: (Math.random() - 0.5) * 2,
        rotZ: (Math.random() - 0.5) * 2
      });

      this.shardGroup.add(mesh);
    }
    this.group.add(this.shardGroup);

    // 5. Constellation Ambient Starfield (240 Particles)
    const starCount = 240;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const rad = 30 + Math.random() * 50;
      const u = Math.random();
      const v = Math.random();
      const th = u * 2.0 * Math.PI;
      const ph = Math.acos(2.0 * v - 1.0);

      starPositions[i * 3] = rad * Math.sin(ph) * Math.cos(th);
      starPositions[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th);
      starPositions[i * 3 + 2] = rad * Math.cos(ph);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: theme.accent,
      size: 1.0,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.starField = new THREE.Points(starGeo, starMat);
    this.group.add(this.starField);

    this.scene.add(this.group);
  }

  update(audio, delta, theme) {
    const bass = audio ? (audio.bass || 0) : 0;
    const mid = audio ? (audio.mid || 0) : 0;
    const treble = audio ? (audio.treble || 0) : 0;
    const overall = audio ? (audio.overall || 0) : 0;

    // Detect Beat Drop Kick
    if (audio && audio.beatDetected) {
      this.blastPunch = 1.0;
    }
    this.blastPunch = Math.max(0, this.blastPunch - delta * 2.2);

    const time = performance.now() * 0.001;

    // 1. Inner Core: Bass Pulsing & Crystal Spin
    const coreScale = (1.0 + (bass * 0.65 + this.blastPunch * 0.45)) * this.coreScale;
    if (this.coreMesh && this.coreWireMesh) {
      this.coreMesh.scale.set(coreScale, coreScale, coreScale);
      this.coreWireMesh.scale.set(coreScale * 1.005, coreScale * 1.005, coreScale * 1.005);

      this.coreMesh.rotation.x += delta * (0.8 + treble * 1.6) * this.gimbalSpeed;
      this.coreMesh.rotation.y += delta * (1.1 + bass * 1.8) * this.gimbalSpeed;
      this.coreWireMesh.rotation.copy(this.coreMesh.rotation);
    }

    // 2. Middle Icosahedron: Counter-Rotation on Gimbal Axes
    if (this.middleIcosaMesh) {
      const icosaScale = 1.0 + (mid * 0.35 + bass * 0.2);
      this.middleIcosaMesh.scale.set(icosaScale, icosaScale, icosaScale);

      this.middleIcosaMesh.rotation.x -= delta * (0.45 + mid * 1.2) * this.gimbalSpeed;
      this.middleIcosaMesh.rotation.y += delta * (0.65 + bass * 1.0) * this.gimbalSpeed;
      this.middleIcosaMesh.rotation.z -= delta * (0.35 + treble * 1.4) * this.gimbalSpeed;
    }

    // 3. Outer Dodecahedron Cage: Slow Celestial Expansion
    if (this.outerDodecaMesh) {
      const dodecaScale = 1.0 + Math.sin(time * 1.5) * 0.04 + (overall * 0.28);
      this.outerDodecaMesh.scale.set(dodecaScale, dodecaScale, dodecaScale);

      this.outerDodecaMesh.rotation.x += delta * 0.25 * this.gimbalSpeed;
      this.outerDodecaMesh.rotation.y -= delta * 0.32 * this.gimbalSpeed;
      this.outerDodecaMesh.rotation.z += delta * 0.18 * this.gimbalSpeed;
    }

    // 4. Orbital Shards: Spherical Orbits with Beat Drop Blast
    const blastExpansion = this.blastPunch * 14.0 * (1.0 + bass);
    const activeShardCount = Math.min(this.shardCount, this.shards.length);

    for (let i = 0; i < activeShardCount; i++) {
      const s = this.shards[i];
      s.theta += s.speedTheta * delta * (1.0 + mid * 1.5);
      s.phi += s.speedPhi * delta * (1.0 + treble * 1.2);

      // Smoothly expand on beat and retract
      const targetRad = s.baseRadius + blastExpansion;
      s.currentRadius += (targetRad - s.currentRadius) * 0.12;

      const r = s.currentRadius;
      s.mesh.position.x = r * Math.sin(s.phi) * Math.cos(s.theta);
      s.mesh.position.y = r * Math.sin(s.phi) * Math.sin(s.theta);
      s.mesh.position.z = r * Math.cos(s.phi);

      s.mesh.rotation.x += s.rotX * delta * 2.5;
      s.mesh.rotation.y += s.rotY * delta * 2.5;
      s.mesh.rotation.z += s.rotZ * delta * 2.5;

      const shardScale = 1.0 + (this.blastPunch * 0.6) + (bass * 0.4);
      s.mesh.scale.set(shardScale, shardScale, shardScale);
    }

    // 5. Starfield Rotation
    if (this.starField) {
      this.starField.rotation.y += delta * 0.04;
    }
  }

  updateColors(theme) {
    if (this.coreMesh) this.coreMesh.material.color.set(theme.primary);
    if (this.middleIcosaMesh) this.middleIcosaMesh.material.color.set(theme.secondary);
    if (this.outerDodecaMesh) this.outerDodecaMesh.material.color.set(theme.accent);

    this.shards.forEach((s, i) => {
      s.mesh.material.color.set(i % 2 === 0 ? theme.secondary : theme.accent);
    });

    if (this.starField) {
      this.starField.material.color.set(theme.accent);
    }
  }

  setCustomParam(key, value) {
    if (key === "gimbalSpeed") {
      this.gimbalSpeed = Number(value) || 1.0;
    } else if (key === "shardCount") {
      this.shardCount = Math.min(this.maxShardCount, Math.max(10, Math.round(Number(value))));
      this.shards.forEach((s, i) => {
        s.mesh.visible = (i < this.shardCount);
      });
    } else if (key === "coreScale") {
      this.coreScale = Number(value) || 1.0;
    }
  }

  destroy() {
    this.scene.remove(this.group);

    if (this.coreMesh) {
      this.coreMesh.geometry.dispose();
      this.coreMesh.material.dispose();
    }
    if (this.coreWireMesh) {
      this.coreWireMesh.geometry.dispose();
      this.coreWireMesh.material.dispose();
    }
    if (this.middleIcosaMesh) {
      this.middleIcosaMesh.geometry.dispose();
      this.middleIcosaMesh.material.dispose();
    }
    if (this.outerDodecaMesh) {
      this.outerDodecaMesh.geometry.dispose();
      this.outerDodecaMesh.material.dispose();
    }
    this.shards.forEach(s => {
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    });
    this.shards = [];

    if (this.starField) {
      this.starField.geometry.dispose();
      this.starField.material.dispose();
    }
  }
}

window.SacredPolyhedraMode = SacredPolyhedraMode;
