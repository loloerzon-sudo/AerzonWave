/**
 * Mode 2: Cyber Tunnel / Grid
 * Infinite synthwave highway & wireframe tunnel moving forward at high velocity.
 * Mountainous audio ridges on the sides displace to frequency spectrum bands.
 */

class CyberTunnelMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    this.gridSegmentsX = 48;
    this.gridSegmentsZ = 72;
    this.gridWidth = 80;
    this.gridDepth = 180;

    this.terrainMesh = null;
    this.ceilingMesh = null;
    this.sunMesh = null;
    this.speed = 45;
    this.offsetZ = 0;

    // Custom Mode Parameters
    this.mountainHeight = 1.4;
    this.sunScale = 1.2;
    this.highwaySpeed = 45;

    // Tunnel Rings
    this.tunnelRings = [];
    this.ringCount = 18;
  }

  init(theme) {
    // 1. Synthwave Terrain (Floor)
    const geo = new THREE.PlaneGeometry(
      this.gridWidth,
      this.gridDepth,
      this.gridSegmentsX,
      this.gridSegmentsZ
    );
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: theme.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.position.set(0, -6, -this.gridDepth / 4);
    this.group.add(this.terrainMesh);

    // 2. Ceiling Grid (Inverted)
    const ceilingGeo = new THREE.PlaneGeometry(
      this.gridWidth,
      this.gridDepth,
      this.gridSegmentsX,
      this.gridSegmentsZ
    );
    ceilingGeo.rotateX(Math.PI / 2);

    const ceilingMat = new THREE.MeshBasicMaterial({
      color: theme.secondary,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    this.ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    this.ceilingMesh.position.set(0, 18, -this.gridDepth / 4);
    this.group.add(this.ceilingMesh);

    // 3. Cyber Neon Horizon Sun / Portal
    const sunGeo = new THREE.CircleGeometry(16, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      color: theme.accent,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 4, -this.gridDepth / 2 - 10);
    this.group.add(this.sunMesh);

    // Sun horizontal scanlines / rings
    const sunRingGeo = new THREE.RingGeometry(17, 18.5, 48);
    const sunRingMat = new THREE.MeshBasicMaterial({
      color: theme.primary,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.sunGlowRing = new THREE.Mesh(sunRingGeo, sunRingMat);
    this.sunGlowRing.position.copy(this.sunMesh.position);
    this.group.add(this.sunGlowRing);

    // 4. Hexagonal Tunnel Speed Rings
    for (let i = 0; i < this.ringCount; i++) {
      const ringGeo = new THREE.RingGeometry(8, 8.4, 6);
      const ringMat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? theme.primary : theme.secondary,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35 + (i / this.ringCount) * 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 4, - (i * 10));
      this.tunnelRings.push(ring);
      this.group.add(ring);
    }

    this.scene.add(this.group);
  }

  update(audio, delta, theme) {
    if (!this.terrainMesh) return;

    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;

    // Advance forward through space
    const currentSpeed = (this.speed + bass * 35) * delta;
    this.offsetZ += currentSpeed;

    // Update Tunnel Rings (fly towards camera)
    this.tunnelRings.forEach(ring => {
      ring.position.z += currentSpeed * 1.4;
      ring.rotation.z += delta * 0.5;

      // Expand ring slightly on kick
      const ringScale = 1.0 + (ring.position.z > 5 ? 0.3 * bass : 0);
      ring.scale.set(ringScale, ringScale, ringScale);

      // Reset ring to horizon when it passes behind camera
      if (ring.position.z > 20) {
        ring.position.z = - (this.ringCount * 10) + 15;
      }
    });

    // Animate Horizon Sun
    const currentSunScale = this.sunScale * (1.0 + bass * 0.4);
    this.sunMesh.scale.set(currentSunScale, currentSunScale, 1);
    this.sunGlowRing.scale.set(currentSunScale * 1.1, currentSunScale * 1.1, 1);
    this.sunGlowRing.rotation.z -= delta * 0.3;

    // Terrain Audio Wave Mountains
    const pos = this.terrainMesh.geometry.attributes.position;
    const segX = this.gridSegmentsX + 1;
    const segZ = this.gridSegmentsZ + 1;

    for (let z = 0; z < segZ; z++) {
      const rowNorm = z / segZ;
      for (let x = 0; x < segX; x++) {
        const colNorm = (x / segX) * 2 - 1; // -1 (left) to 1 (right)
        const idx = (z * segX + x);

        // Center highway remains flat, edges form huge mountains
        const edgeDist = Math.abs(colNorm);
        const highwayMask = Math.max(0, (edgeDist - 0.22) * 2.2);

        // Frequency elevation
        const freqReact = (colNorm < 0) ? (bass * 0.6 + mid * 0.4) : (treble * 0.6 + mid * 0.4);
        const wave = Math.sin((z * 0.3) - (this.offsetZ * 0.25) + x * 0.4);

        const height = (wave * 4.5 + freqReact * 14) * highwayMask * this.mountainHeight;

        pos.setY(idx, height);
      }
    }
    pos.needsUpdate = true;

    // Camera slight audio rumble and bank
    this.camera.position.x = Math.sin(performance.now() * 0.001) * 2.0;
    this.camera.position.y = 5 + (bass * 1.2);
    this.camera.rotation.z = Math.sin(performance.now() * 0.0008) * 0.04;
  }

  updateColors(theme) {
    if (this.terrainMesh) this.terrainMesh.material.color.set(theme.primary);
    if (this.ceilingMesh) this.ceilingMesh.material.color.set(theme.secondary);
    if (this.sunMesh) this.sunMesh.material.color.set(theme.accent);
    if (this.sunGlowRing) this.sunGlowRing.material.color.set(theme.primary);

    this.tunnelRings.forEach((ring, i) => {
      ring.material.color.set((i % 2 === 0) ? theme.primary : theme.secondary);
    });
  }

  setCustomParam(key, value) {
    if (key === "mountainHeight") {
      this.mountainHeight = Number(value) || 1.4;
    } else if (key === "sunScale") {
      this.sunScale = Number(value) || 1.2;
    } else if (key === "highwaySpeed") {
      this.highwaySpeed = Number(value) || 45;
      this.speed = this.highwaySpeed;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      this.terrainMesh.material.dispose();
    }
    if (this.ceilingMesh) {
      this.ceilingMesh.geometry.dispose();
      this.ceilingMesh.material.dispose();
    }
    if (this.sunMesh) {
      this.sunMesh.geometry.dispose();
      this.sunMesh.material.dispose();
    }
    if (this.sunGlowRing) {
      this.sunGlowRing.geometry.dispose();
      this.sunGlowRing.material.dispose();
    }
    this.tunnelRings.forEach(ring => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
    this.tunnelRings = [];

    // Reset camera orientation
    this.camera.position.set(0, 0, 35);
    this.camera.rotation.set(0, 0, 0);
  }
}

window.CyberTunnelMode = CyberTunnelMode;
