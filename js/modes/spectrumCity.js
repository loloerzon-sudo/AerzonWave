/**
 * Mode 5: Neon Spectrum City
 * 3D audio equalizer skyline of towers arranged in radial cyber-city blocks.
 * Each skyscraper column pumps in real-time to discrete FFT frequency bins.
 */

class SpectrumCityMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    this.towers = [];
    this.towerCount = 64;
    this.towerHeights = new Float32Array(this.towerCount);
    this.peakCaps = [];

    this.centerNexus = null;
    this.gridFloor = null;

    // Custom Mode Parameters
    this.skyscraperHeight = 24;
    this.cityGridSize = 8;
  }

  init(theme) {
    // 1. Cyber Grid Floor
    const gridHelper = new THREE.GridHelper(100, 40, theme.primary, 0x151b2e);
    gridHelper.position.y = -6;
    this.gridFloor = gridHelper;
    this.group.add(this.gridFloor);

    // 2. Center Nexus Core
    const nexusGeo = new THREE.CylinderGeometry(4, 4.5, 2, 32);
    const nexusMat = new THREE.MeshBasicMaterial({
      color: theme.accent,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    this.centerNexus = new THREE.Mesh(nexusGeo, nexusMat);
    this.centerNexus.position.y = -5;
    this.group.add(this.centerNexus);

    // 3. Radial Equalizer Skyscraper Columns (2 concentric rings of 32 towers)
    const boxGeo = new THREE.BoxGeometry(1.6, 1, 1.6);
    boxGeo.translate(0, 0.5, 0); // Origin at base so scaling scales upwards

    const capGeo = new THREE.BoxGeometry(1.7, 0.2, 1.7);

    const rings = [
      { radius: 12, count: 24, startBin: 2 },
      { radius: 22, count: 40, startBin: 26 }
    ];

    let towerIndex = 0;
    rings.forEach((ring, ringIdx) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2;
        const x = Math.cos(angle) * ring.radius;
        const z = Math.sin(angle) * ring.radius;

        const mat = new THREE.MeshBasicMaterial({
          color: (ringIdx === 0) ? theme.primary : theme.secondary,
          wireframe: true,
          transparent: true,
          opacity: 0.8
        });

        const tower = new THREE.Mesh(boxGeo, mat);
        tower.position.set(x, -6, z);
        tower.rotation.y = -angle;
        this.towers.push({ mesh: tower, bin: ring.startBin + i, currentH: 1, initialX: x, initialZ: z });
        this.group.add(tower);

        // Glowing top peak cap
        const capMat = new THREE.MeshBasicMaterial({
          color: theme.accent,
          transparent: true,
          opacity: 0.95
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(x, -5.8, z);
        this.peakCaps.push({ mesh: cap, y: -5.8, vy: 0, initialX: x, initialZ: z });
        this.group.add(cap);

        towerIndex++;
      }
    });

    // Apply initial cityGridSize scale
    this.applyGridScale();

    this.scene.add(this.group);
  }

  applyGridScale() {
    const s = this.cityGridSize / 8;
    if (this.gridFloor) {
      this.gridFloor.scale.set(s, 1, s);
    }
    this.towers.forEach(t => {
      t.mesh.position.x = t.initialX * s;
      t.mesh.position.z = t.initialZ * s;
    });
    this.peakCaps.forEach(c => {
      c.mesh.position.x = c.initialX * s;
      c.mesh.position.z = c.initialZ * s;
    });
  }

  update(audio, delta, theme) {
    if (!this.towers.length) return;

    const bass = audio.bass;
    const freqData = audio.frequencyData || [];
    const time = performance.now() * 0.001;

    // Rotate entire city slowly
    this.group.rotation.y += delta * 0.15;

    // Center Nexus pulse
    if (this.centerNexus) {
      const s = 1.0 + bass * 0.4;
      this.centerNexus.scale.set(s, 1.0 + bass * 1.2, s);
      this.centerNexus.rotation.y -= delta * 0.5;
    }

    // Update Towers to discrete FFT frequency bins
    this.towers.forEach((t, i) => {
      const binVal = (freqData[t.bin] || 0) / 255;
      const targetHeight = Math.max(0.6, binVal * this.skyscraperHeight * (1 + bass * 0.3));

      // Smooth rise and fall
      t.currentH += (targetHeight - t.currentH) * 0.28;
      t.mesh.scale.y = t.currentH;

      // Update peak cap (gravity fall physics)
      const cap = this.peakCaps[i];
      const targetCapY = -6 + t.currentH + 0.1;

      if (targetCapY > cap.y) {
        cap.y = targetCapY;
        cap.vy = 0;
      } else {
        cap.vy -= 9.8 * delta * 0.1;
        cap.y += cap.vy;
        if (cap.y < targetCapY) cap.y = targetCapY;
      }
      cap.mesh.position.y = cap.y;
    });

    // Cinematic aerial camera orbit
    this.camera.position.x = Math.sin(time * 0.2) * 36;
    this.camera.position.y = 18 + Math.sin(time * 0.15) * 6 + (bass * 2);
    this.camera.position.z = Math.cos(time * 0.2) * 36;
    this.camera.lookAt(0, 0, 0);
  }

  updateColors(theme) {
    if (this.gridFloor) {
      this.gridFloor.material.color.set(theme.primary);
    }
    if (this.centerNexus) {
      this.centerNexus.material.color.set(theme.accent);
    }
    this.towers.forEach((t, i) => {
      t.mesh.material.color.set((i < 24) ? theme.primary : theme.secondary);
    });
    this.peakCaps.forEach(c => {
      c.mesh.material.color.set(theme.accent);
    });
  }

  setCustomParam(key, value) {
    if (key === "skyscraperHeight") {
      this.skyscraperHeight = Number(value) || 24;
    } else if (key === "cityGridSize") {
      this.cityGridSize = Number(value) || 8;
      this.applyGridScale();
    }
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.gridFloor) {
      this.gridFloor.geometry.dispose();
      this.gridFloor.material.dispose();
    }
    if (this.centerNexus) {
      this.centerNexus.geometry.dispose();
      this.centerNexus.material.dispose();
    }
    this.towers.forEach(t => {
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    });
    this.peakCaps.forEach(c => {
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    });
    this.towers = [];
    this.peakCaps = [];
  }
}

window.SpectrumCityMode = SpectrumCityMode;
