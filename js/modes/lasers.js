/**
 * Mode 7: Cyber Laser Matrix
 * Concert stage laser scanners with oscillating beam fans,
 * crisscrossing laser beams, and reactive volumetric haze floor.
 */

class CyberLaserMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    this.laserBeams = [];
    this.laserCount = 24;
    this.hazeFloor = null;
    this.strobeFlash = 0;
  }

  init(theme) {
    // 1. Volumetric Haze Floor Plane
    const hazeGeo = new THREE.PlaneGeometry(80, 80, 20, 20);
    hazeGeo.rotateX(-Math.PI / 2);
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x050814,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    this.hazeFloor = new THREE.Mesh(hazeGeo, hazeMat);
    this.hazeFloor.position.y = -10;
    this.group.add(this.hazeFloor);

    // 2. Concert Laser Beams (Cylinder beams with additive blending)
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.25, 70, 8);
    beamGeo.translate(0, 35, 0); // Pivot at scanner emitter

    for (let i = 0; i < this.laserCount; i++) {
      const isLeft = (i % 2 === 0);
      const color = isLeft ? theme.primary : theme.secondary;

      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });

      const beam = new THREE.Mesh(beamGeo, mat);

      // Position emitters along an overhead truss and floor pods
      const emitterX = (Math.floor(i / 2) - (this.laserCount / 4)) * 4.5;
      const emitterY = (i % 4 < 2) ? 18 : -8;
      const emitterZ = -15;

      beam.position.set(emitterX, emitterY, emitterZ);
      beam.baseRotX = (emitterY > 0) ? -Math.PI * 0.4 : Math.PI * 0.4;
      beam.baseRotZ = (emitterX / 30);

      this.laserBeams.push({
        mesh: beam,
        emitterX,
        emitterY,
        emitterZ,
        phase: i * 0.4,
        isLeft
      });
      this.group.add(beam);
    }

    this.scene.add(this.group);
  }

  update(audio, delta, theme) {
    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;
    const time = performance.now() * 0.001;

    // React to beat kicks with strobe flash
    if (audio.beatDetected) {
      this.strobeFlash = 1.0;
    }
    this.strobeFlash *= 0.86;

    // Laser Scanners Motion & Fan Sweeps
    this.laserBeams.forEach((l, idx) => {
      const sweepSpeed = 2.0 + mid * 3.0;
      const fanAngle = Math.sin(time * sweepSpeed + l.phase) * (0.4 + bass * 0.6);
      const crossAngle = Math.cos(time * (sweepSpeed * 0.7) + l.phase) * (0.3 + treble * 0.5);

      l.mesh.rotation.x = l.mesh.baseRotX + fanAngle;
      l.mesh.rotation.z = l.mesh.baseRotZ + crossAngle;

      // Laser intensity & thickness on kicks
      const flash = this.strobeFlash * 0.4;
      l.mesh.material.opacity = Math.min(1.0, 0.6 + bass * 0.4 + flash);
      const thick = 1.0 + bass * 1.5;
      l.mesh.scale.set(thick, 1.0, thick);
    });

    // Dynamic Camera Tracking (Fly down the laser corridor)
    this.camera.position.x = Math.sin(time * 0.4) * 8;
    this.camera.position.y = Math.sin(time * 0.3) * 4 + 2;
    this.camera.position.z = 24 + Math.sin(time * 0.5) * 6;
    this.camera.lookAt(0, 4, -15);
  }

  updateColors(theme) {
    this.laserBeams.forEach(l => {
      l.mesh.material.color.set(l.isLeft ? theme.primary : theme.secondary);
    });
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.hazeFloor) {
      this.hazeFloor.geometry.dispose();
      this.hazeFloor.material.dispose();
    }
    this.laserBeams.forEach(l => {
      l.mesh.geometry.dispose();
      l.mesh.material.dispose();
    });
    this.laserBeams = [];

    this.camera.position.set(0, 0, 36);
    this.camera.rotation.set(0, 0, 0);
  }
}

window.CyberLaserMode = CyberLaserMode;
