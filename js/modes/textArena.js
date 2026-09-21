/**
 * Mode 4: Kinetic Text Arena
 * Dedicated monumental typography concert stage.
 * Soundwave mirror floor, vertical reactive neon light pillars,
 * sweeping concert spotlights, and dynamic camera fly-bys.
 */

class TextArenaMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    this.floorMesh = null;
    this.lightPillars = [];
    this.spotlights = [];
    this.ringBeams = [];
    this.pillarCount = 12;

    // Custom Mode Parameters
    this.spotlightSpeed = 1.0;
    this.pillarHeight = 45;
  }

  init(theme) {
    // 1. Reflective Mirror Soundwave Floor
    const floorGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x101525,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = -8;
    this.group.add(this.floorMesh);

    // Floor Glowing Concentric Circles
    for (let r = 0; r < 4; r++) {
      const ringGeo = new THREE.RingGeometry(10 + r * 10, 10.3 + r * 10, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: (r % 2 === 0) ? theme.primary : theme.secondary,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -7.9;
      this.ringBeams.push(ring);
      this.group.add(ring);
    }

    // 2. Vertical Reactive Neon Light Pillars (arranged in a circular arena)
    const arenaRadius = 38;
    for (let i = 0; i < this.pillarCount; i++) {
      const angle = (i / this.pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * arenaRadius;
      const z = Math.sin(angle) * arenaRadius;

      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 45, 16);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? theme.primary : theme.secondary,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 14, z);
      this.lightPillars.push(pillar);
      this.group.add(pillar);
    }

    // 3. Sweeping Concert Spotlights
    for (let s = 0; s < 4; s++) {
      const spot = new THREE.SpotLight(
        (s % 2 === 0) ? theme.primary : theme.accent,
        3,
        90,
        Math.PI / 6,
        0.5
      );
      spot.position.set((s - 1.5) * 20, 25, -20);
      spot.target.position.set(0, 0, 0);
      this.spotlights.push(spot);
      this.group.add(spot);
      this.group.add(spot.target);
    }

    this.scene.add(this.group);
  }

  update(audio, delta, theme) {
    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;
    const time = performance.now() * 0.001;

    // Floor ripple pulse
    if (this.floorMesh) {
      this.floorMesh.rotation.y += delta * 0.05;
      const pos = this.floorMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(x * x + z * z);
        const wave = Math.sin(dist * 0.25 - time * 4) * (bass * 2.5);
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
    }

    // Concentric ring beams rotation and pulse
    this.ringBeams.forEach((ring, i) => {
      ring.rotation.z += delta * (0.1 + i * 0.05);
      const s = 1.0 + (i === 0 ? bass : mid) * 0.2;
      ring.scale.set(s, s, s);
      ring.material.opacity = 0.3 + (i === 0 ? bass : mid) * 0.5;
    });

    // Vertical Light Pillars: Height and Glow reacts to audio frequencies
    const basePillarScale = this.pillarHeight / 45;
    this.lightPillars.forEach((pillar, i) => {
      const freqReact = (i % 3 === 0) ? bass : ((i % 3 === 1) ? mid : treble);
      const heightScale = (1.0 + freqReact * 1.8) * basePillarScale;
      pillar.scale.set(1.0 + freqReact * 0.8, heightScale, 1.0 + freqReact * 0.8);
      pillar.material.opacity = 0.3 + freqReact * 0.7;
    });

    // Sweeping concert moving head lights
    this.spotlights.forEach((spot, i) => {
      const angle = time * 1.2 * this.spotlightSpeed + (i * Math.PI) / 2;
      spot.position.x = Math.sin(angle) * 30;
      spot.position.z = Math.cos(angle) * 20 - 15;
      spot.intensity = 2 + bass * 4;
    });

    // Smooth camera orbit around the text arena
    this.camera.position.x = Math.sin(time * 0.3) * 12;
    this.camera.position.y = 2 + Math.cos(time * 0.2) * 4 + bass * 2;
    this.camera.position.z = 32 + Math.sin(time * 0.25) * 6;
    this.camera.lookAt(0, 0, 0);
  }

  updateColors(theme) {
    this.ringBeams.forEach((ring, i) => {
      ring.material.color.set((i % 2 === 0) ? theme.primary : theme.secondary);
    });

    this.lightPillars.forEach((pillar, i) => {
      pillar.material.color.set((i % 2 === 0) ? theme.primary : theme.secondary);
    });

    this.spotlights.forEach((spot, i) => {
      spot.color.set((i % 2 === 0) ? theme.primary : theme.accent);
    });
  }

  setCustomParam(key, value) {
    if (key === "spotlightSpeed") {
      this.spotlightSpeed = Number(value) || 1.0;
    } else if (key === "pillarHeight") {
      this.pillarHeight = Number(value) || 45;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.floorMesh) {
      this.floorMesh.geometry.dispose();
      this.floorMesh.material.dispose();
    }
    this.ringBeams.forEach(r => {
      r.geometry.dispose();
      r.material.dispose();
    });
    this.lightPillars.forEach(p => {
      p.geometry.dispose();
      p.material.dispose();
    });
    this.spotlights.forEach(s => {
      if (typeof s.dispose === 'function') s.dispose();
      if (s.target && s.target.parent) s.target.parent.remove(s.target);
    });
    this.ringBeams = [];
    this.lightPillars = [];
    this.spotlights = [];
  }
}

window.TextArenaMode = TextArenaMode;
