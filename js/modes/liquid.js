/**
 * Mode 3: Liquid Orb / Morph Mesh
 * 3D organic sphere with real-time Simplex 3D noise vertex displacement.
 * Reacts dynamically to bass impact, mid harmonics, and treble surface ripples.
 * Includes outer geometric wireframe lattice and orbiting frequency rings.
 */

// Embedded ultra-fast Simplex Noise implementation (zero external dependencies)
class FastSimplexNoise {
  constructor() {
    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    this.p = [];
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256);
    }
    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  dot(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  noise3D(xin, yin, zin) {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    let s = (xin + yin + zin) * F3;
    let i = Math.floor(xin + s);
    let j = Math.floor(yin + s);
    let k = Math.floor(zin + s);
    let t = (i + j + k) * G3;

    let X0 = i - t;
    let Y0 = j - t;
    let Z0 = k - t;
    let x0 = xin - X0;
    let y0 = yin - Y0;
    let z0 = zin - Z0;

    let i1, j1, k1;
    let i2, j2, k2;

    if (x0 >= y0) {
      if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }

    let x1 = x0 - i1 + G3;
    let y1 = y0 - j1 + G3;
    let z1 = z0 - k1 + G3;
    let x2 = x0 - i2 + 2.0 * G3;
    let y2 = y0 - j2 + 2.0 * G3;
    let z2 = z0 - k2 + 2.0 * G3;
    let x3 = x0 - 1.0 + 3.0 * G3;
    let y3 = y0 - 1.0 + 3.0 * G3;
    let z3 = z0 - 1.0 + 3.0 * G3;

    let ii = i & 255;
    let jj = j & 255;
    let kk = k & 255;

    let gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    let gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    let gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    let gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

    let n0, n1, n2, n3;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 < 0) n0 = 0.0;
    else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0); }

    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 < 0) n1 = 0.0;
    else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1); }

    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 < 0) n2 = 0.0;
    else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2); }

    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 < 0) n3 = 0.0;
    else { t3 *= t3; n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3); }

    return 32.0 * (n0 + n1 + n2 + n3);
  }
}

class LiquidOrbMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.noise = new FastSimplexNoise();

    this.innerMesh = null;
    this.wireMesh = null;
    this.orbitRings = [];
    this.originalVertices = [];
    this.baseRadius = 8.5;
    this.detail = 4; // Icosahedron detail

    // Custom Mode Parameters
    this.viscosity = 1.0;
    this.orbScale = 1.0;
    this.dropletCount = 32;
    this.maxDropletCount = 60;
    this.droplets = null;
    this.dropletData = [];
  }

  init(theme) {
    // 1. Inner Liquid Blob Mesh
    const geo = new THREE.IcosahedronGeometry(this.baseRadius, this.detail);
    const wireGeo = new THREE.IcosahedronGeometry(this.baseRadius * 1.04, 3);

    // Save unperturbed vertex vectors
    const pos = geo.attributes.position;
    this.originalVertices = [];
    for (let i = 0; i < pos.count; i++) {
      this.originalVertices.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }

    const mat = new THREE.MeshPhongMaterial({
      color: theme.primary,
      emissive: theme.accent,
      emissiveIntensity: 0.25,
      shininess: 90,
      flatShading: true,
      transparent: true,
      opacity: 0.88
    });

    this.innerMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.innerMesh);

    // 2. Outer Neon Geometric Cage
    const wireMat = new THREE.MeshBasicMaterial({
      color: theme.secondary,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });

    this.wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(this.wireMesh);

    // 3. Gyroscopic Orbiting Frequency Rings
    const ringRadii = [14, 16.5, 19];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.TorusGeometry(r, 0.12, 16, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: (idx === 0) ? theme.primary : (idx === 1 ? theme.secondary : theme.accent),
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / (2 + idx);
      ring.rotation.y = (idx * Math.PI) / 3;
      this.orbitRings.push(ring);
      this.group.add(ring);
    });

    // 4. Lights inside the group
    this.pointLight = new THREE.PointLight(theme.primary, 2, 80);
    this.pointLight.position.set(20, 20, 20);
    this.group.add(this.pointLight);

    this.pointLight2 = new THREE.PointLight(theme.secondary, 2, 80);
    this.pointLight2.position.set(-20, -20, -20);
    this.group.add(this.pointLight2);

    // 5. Floating Liquid Droplets Swarm
    const dropletGeo = new THREE.BufferGeometry();
    const dropPositions = new Float32Array(this.maxDropletCount * 3);
    this.dropletData = [];
    for (let i = 0; i < this.maxDropletCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 11 + Math.random() * 9;
      const y = (Math.random() - 0.5) * 14;
      dropPositions[i * 3] = Math.cos(angle) * radius;
      dropPositions[i * 3 + 1] = y;
      dropPositions[i * 3 + 2] = Math.sin(angle) * radius;
      this.dropletData.push({ angle, radius, y, speed: 0.5 + Math.random() * 0.8 });
    }
    dropletGeo.setAttribute("position", new THREE.BufferAttribute(dropPositions, 3));
    const dropletMat = new THREE.PointsMaterial({
      color: theme.accent,
      size: 1.6,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.droplets = new THREE.Points(dropletGeo, dropletMat);
    this.droplets.geometry.setDrawRange(0, this.dropletCount);
    this.group.add(this.droplets);

    this.scene.add(this.group);
  }

  update(audio, delta, theme) {
    if (!this.innerMesh) return;

    const bass = audio.bass;
    const mid = audio.mid;
    const treble = audio.treble;
    const time = performance.now() * 0.001;

    // Rotation
    this.innerMesh.rotation.y += delta * (0.3 + mid * 0.6);
    this.innerMesh.rotation.x += delta * (0.2 + bass * 0.4);

    this.wireMesh.rotation.y -= delta * (0.25 + mid * 0.4);
    this.wireMesh.rotation.z += delta * (0.2 + treble * 0.5);

    // Gyroscopic rings rotation
    this.orbitRings.forEach((ring, idx) => {
      ring.rotation.x += delta * (0.4 + idx * 0.3);
      ring.rotation.y += delta * (0.5 - idx * 0.2);
      const ringPulse = 1.0 + (idx === 0 ? bass : idx === 1 ? mid : treble) * 0.35;
      ring.scale.set(ringPulse, ringPulse, ringPulse);
    });

    // Simplex Noise Vertex Morphing
    const pos = this.innerMesh.geometry.attributes.position;
    const noiseScale = (0.25 + treble * 0.15) * this.viscosity;
    const displacementAmount = (2.5 + (bass * 6.5) + (mid * 3.5)) * Math.sqrt(this.viscosity);

    for (let i = 0; i < pos.count; i++) {
      const v = this.originalVertices[i];
      const n = this.noise.noise3D(
        v.x * noiseScale + time * 0.7 * this.viscosity,
        v.y * noiseScale + time * 0.7 * this.viscosity,
        v.z * noiseScale + time * 0.7 * this.viscosity
      );

      // Displace along normal
      const distance = this.baseRadius + (n * displacementAmount);
      const normal = v.clone().normalize();

      pos.setXYZ(
        i,
        normal.x * distance,
        normal.y * distance,
        normal.z * distance
      );
    }

    pos.needsUpdate = true;
    this.innerMesh.geometry.computeVertexNormals();

    // Scale central liquid meshes according to orbScale
    const wireScale = (1.0 + bass * 0.25) * this.orbScale;
    this.innerMesh.scale.set(this.orbScale, this.orbScale, this.orbScale);
    this.wireMesh.scale.set(wireScale, wireScale, wireScale);

    // Update Droplet Swarm
    if (this.droplets && this.dropletData) {
      const dpos = this.droplets.geometry.attributes.position;
      const activeDrops = Math.min(this.dropletCount, this.maxDropletCount);
      for (let i = 0; i < activeDrops; i++) {
        const d = this.dropletData[i];
        d.angle += d.speed * delta * (1.0 + mid * 0.8);
        const r = (d.radius * this.orbScale) + Math.sin(time * 2 + i) * (0.8 + bass * 1.5);
        dpos.setXYZ(
          i,
          Math.cos(d.angle) * r,
          d.y * this.orbScale + Math.sin(time * 3 + i) * 0.6,
          Math.sin(d.angle) * r
        );
      }
      dpos.needsUpdate = true;
    }
  }

  updateColors(theme) {
    if (this.innerMesh) {
      this.innerMesh.material.color.set(theme.primary);
      this.innerMesh.material.emissive.set(theme.accent);
    }
    if (this.wireMesh) {
      this.wireMesh.material.color.set(theme.secondary);
    }
    this.orbitRings.forEach((ring, idx) => {
      ring.material.color.set(idx === 0 ? theme.primary : idx === 1 ? theme.secondary : theme.accent);
    });
    if (this.droplets) {
      this.droplets.material.color.set(theme.accent);
    }
    if (this.pointLight) this.pointLight.color.set(theme.primary);
    if (this.pointLight2) this.pointLight2.color.set(theme.secondary);
  }

  setCustomParam(key, value) {
    if (key === "viscosity") {
      this.viscosity = Number(value) || 1.0;
    } else if (key === "orbScale") {
      this.orbScale = Number(value) || 1.0;
      if (this.innerMesh) {
        this.innerMesh.scale.set(this.orbScale, this.orbScale, this.orbScale);
      }
    } else if (key === "dropletCount") {
      this.dropletCount = Math.min(this.maxDropletCount, Math.max(0, Math.round(Number(value))));
      if (this.droplets && this.droplets.geometry) {
        this.droplets.geometry.setDrawRange(0, this.dropletCount);
      }
    }
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.innerMesh) {
      this.innerMesh.geometry.dispose();
      this.innerMesh.material.dispose();
    }
    if (this.wireMesh) {
      this.wireMesh.geometry.dispose();
      this.wireMesh.material.dispose();
    }
    if (this.droplets) {
      this.droplets.geometry.dispose();
      this.droplets.material.dispose();
    }
    this.orbitRings.forEach(ring => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
    this.orbitRings = [];
  }
}

window.LiquidOrbMode = LiquidOrbMode;
