/* ─────────────────────────────────────────────────────────────
   Hero 3D Scene — TinyWiseKids
   Floating objects: coins, bills, fruit-coins, savings jar,
   credit card, mini growth chart. Mouse parallax + idle drift.
   ───────────────────────────────────────────────────────────── */

import * as THREE from 'three';

const PALETTE = {
  paper:       new THREE.Color('#FBF7EE'),
  yellow:      new THREE.Color('#FFD166'),
  yellowDeep:  new THREE.Color('#F2B233'),
  yellowWarm:  new THREE.Color('#FFB703'),
  teal:        new THREE.Color('#06C9A0'),
  tealDeep:    new THREE.Color('#048A6E'),
  coral:       new THREE.Color('#FF6B6B'),
  clay:        new THREE.Color('#E07856'),
  claySoft:    new THREE.Color('#FBE4DA'),
  sand:        new THREE.Color('#D9B384'),
  ink:         new THREE.Color('#1A1F2E'),
  cream:       new THREE.Color('#FFF8E8'),
  appleRed:    new THREE.Color('#E55B4C'),
  lemonYellow: new THREE.Color('#F4C842'),
  orange:      new THREE.Color('#F08846'),
  paperBill:   new THREE.Color('#A8CFA0'),  // soft dollar green
  goldCoin:    new THREE.Color('#F2C04D'),
  copperCoin:  new THREE.Color('#D89A6A'),
  cardSurface: new THREE.Color('#2C3954'),
  jarGlass:    new THREE.Color('#9FE3D0')
};

const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class HeroScene {
  constructor(canvas, stageEl) {
    this.canvas = canvas;
    this.stageEl = stageEl;
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.time = 0;
    this.objects = [];
    this.disposed = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._buildObjects();
    this._initListeners();
    this._raf = this._animate.bind(this);
    requestAnimationFrame(this._raf);

    // Reveal: hide loading indicator once a frame has been rendered
    requestAnimationFrame(() => {
      this.stageEl.removeAttribute('data-loading');
      document.getElementById('hero')?.classList.add('is-loaded');
    });
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._resize();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    // No fog — keep colors crisp on cream background
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(0, 0.3, 9);
    this.camera.lookAt(0, 0, 0);

    // Soft ground reflector — invisible plane catching subtle shadows
    const groundGeom = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    this.ground = new THREE.Mesh(groundGeom, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -2.2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  _initLights() {
    // Hemisphere — warm sky / cool ground (sun coming through window)
    const hemi = new THREE.HemisphereLight(0xfff3d0, 0xa8b0b8, 0.55);
    this.scene.add(hemi);

    // Key light — warm directional, casts soft shadow
    const key = new THREE.DirectionalLight(0xffe8b0, 1.15);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 6;
    this.scene.add(key);

    // Fill — cool from the other side to add depth
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.35);
    fill.position.set(-4, 2, 3);
    this.scene.add(fill);

    // Rim — soft from behind
    const rim = new THREE.DirectionalLight(0xffd0a8, 0.25);
    rim.position.set(0, 3, -5);
    this.scene.add(rim);
  }

  _buildObjects() {
    // ── 1. Hero savings jar (center-ish, slightly back)
    const jar = this._buildJar();
    jar.position.set(0.1, -0.5, 0);
    jar.userData = { drift: { x: 0.05, y: 0.08, z: 0 }, spin: { y: 0.0008 }, baseRot: jar.rotation.clone() };
    this.scene.add(jar);
    this.objects.push(jar);
    this.jar = jar;

    // ── 2. Gold coin — top left, slightly tilted
    const coin1 = this._buildCoin(0.55, PALETTE.goldCoin, '$');
    coin1.position.set(-2.3, 1.2, 0.8);
    coin1.rotation.set(0.35, -0.4, -0.25);
    coin1.userData = {
      drift: { x: 0.12, y: 0.18, z: 0.05 },
      spin: { x: 0.0006, y: 0.012, z: 0.0004 },
      basePos: coin1.position.clone(),
      parallaxStrength: 0.6
    };
    this.scene.add(coin1);
    this.objects.push(coin1);

    // ── 3. Second coin — bottom right, smaller
    const coin2 = this._buildCoin(0.42, PALETTE.copperCoin, '¢');
    coin2.position.set(2.1, -0.9, 0.5);
    coin2.rotation.set(-0.2, 0.3, 0.15);
    coin2.userData = {
      drift: { x: 0.1, y: 0.15, z: 0.04 },
      spin: { x: 0.0004, y: 0.009, z: 0.0003 },
      basePos: coin2.position.clone(),
      parallaxStrength: 0.5
    };
    this.scene.add(coin2);
    this.objects.push(coin2);

    // ── 4. Tiny gold coin behind, distant
    const coin3 = this._buildCoin(0.32, PALETTE.yellow, '');
    coin3.position.set(1.5, 1.6, -1.2);
    coin3.rotation.set(0.1, 0.6, 0.2);
    coin3.userData = {
      drift: { x: 0.06, y: 0.11, z: 0.02 },
      spin: { x: 0.0002, y: 0.006, z: 0.0001 },
      basePos: coin3.position.clone(),
      parallaxStrength: 0.3
    };
    this.scene.add(coin3);
    this.objects.push(coin3);

    // ── 5. Dollar bill — floating, slight curl, mid-right
    const bill = this._buildBill();
    bill.position.set(2.4, 0.6, -0.4);
    bill.rotation.set(-0.4, -0.5, 0.2);
    bill.userData = {
      drift: { x: 0.08, y: 0.12, z: 0.03 },
      spin: { x: 0.0003, y: 0.002, z: 0.0005 },
      basePos: bill.position.clone(),
      parallaxStrength: 0.45
    };
    this.scene.add(bill);
    this.objects.push(bill);

    // ── 6. Apple-coin (red)
    const apple = this._buildFruitCoin(PALETTE.appleRed, 0.36, 'apple');
    apple.position.set(-1.9, -0.4, 1.1);
    apple.userData = {
      drift: { x: 0.13, y: 0.16, z: 0.04 },
      spin: { x: 0.0004, y: 0.005, z: 0.0003 },
      basePos: apple.position.clone(),
      parallaxStrength: 0.7
    };
    this.scene.add(apple);
    this.objects.push(apple);

    // ── 7. Lemon-coin (yellow, slightly oval)
    const lemon = this._buildFruitCoin(PALETTE.lemonYellow, 0.32, 'lemon');
    lemon.position.set(-0.6, 1.7, -0.5);
    lemon.userData = {
      drift: { x: 0.09, y: 0.13, z: 0.03 },
      spin: { x: 0.0003, y: 0.007, z: 0.0002 },
      basePos: lemon.position.clone(),
      parallaxStrength: 0.55
    };
    this.scene.add(lemon);
    this.objects.push(lemon);

    // ── 8. Orange-coin
    const orange = this._buildFruitCoin(PALETTE.orange, 0.34, 'orange');
    orange.position.set(2.0, 1.4, 1.0);
    orange.userData = {
      drift: { x: 0.11, y: 0.14, z: 0.04 },
      spin: { x: 0.0005, y: 0.006, z: 0.0003 },
      basePos: orange.position.clone(),
      parallaxStrength: 0.62
    };
    this.scene.add(orange);
    this.objects.push(orange);

    // ── 9. Credit card — bottom-left
    const card = this._buildCard();
    card.position.set(-1.7, -1.2, 0.6);
    card.rotation.set(-0.2, 0.5, -0.15);
    card.userData = {
      drift: { x: 0.07, y: 0.11, z: 0.02 },
      spin: { x: 0.0002, y: 0.001, z: 0.0003 },
      basePos: card.position.clone(),
      parallaxStrength: 0.4
    };
    this.scene.add(card);
    this.objects.push(card);

    // ── 10. Mini growth chart — back-center, depth marker
    const chart = this._buildGrowthChart();
    chart.position.set(-2.0, 0.4, -1.3);
    chart.userData = {
      drift: { x: 0.05, y: 0.08, z: 0.02 },
      spin: { x: 0, y: 0.001, z: 0 },
      basePos: chart.position.clone(),
      parallaxStrength: 0.2
    };
    this.scene.add(chart);
    this.objects.push(chart);

    // Soft shadow casters
    this.objects.forEach(obj => {
      obj.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = false;
        }
      });
    });
  }

  // ────────── BUILDERS ────────── //

  _buildCoin(radius, color, glyph) {
    const group = new THREE.Group();
    const height = radius * 0.16;

    // Main disc — slightly bevelled via lathe
    const points = [];
    const seg = 6;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const angle = (t - 0.5) * Math.PI * 0.4;
      points.push(new THREE.Vector2(
        radius * (1 - Math.abs(t - 0.5) * 0.1),
        (t - 0.5) * height
      ));
    }
    const lathe = new THREE.LatheGeometry(points, 48);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.32,
      metalness: 0.85,
      envMapIntensity: 0.8
    });
    const disc = new THREE.Mesh(lathe, mat);
    group.add(disc);

    // Inner ring (engraving)
    const ringGeom = new THREE.TorusGeometry(radius * 0.72, radius * 0.025, 8, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.7),
      roughness: 0.5,
      metalness: 0.9
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height * 0.5;
    group.add(ring);
    const ringBack = ring.clone();
    ringBack.position.y = -height * 0.5;
    group.add(ringBack);

    // Glyph (text via canvas texture, optional)
    if (glyph) {
      const tex = this._textTexture(glyph, '#5a3a00');
      const glyphGeom = new THREE.CircleGeometry(radius * 0.55, 32);
      const glyphMat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 0.6,
        metalness: 0.2
      });
      const front = new THREE.Mesh(glyphGeom, glyphMat);
      front.position.y = height * 0.51;
      front.rotation.x = -Math.PI / 2;
      group.add(front);
    }

    return group;
  }

  _buildBill() {
    const group = new THREE.Group();
    const w = 1.4, h = 0.7;
    const billShape = new THREE.Shape();
    const r = 0.06;
    billShape.moveTo(-w/2 + r, -h/2);
    billShape.lineTo(w/2 - r, -h/2);
    billShape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    billShape.lineTo(w/2, h/2 - r);
    billShape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    billShape.lineTo(-w/2 + r, h/2);
    billShape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    billShape.lineTo(-w/2, -h/2 + r);
    billShape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);

    const extrudeSettings = { depth: 0.015, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2, steps: 1 };
    const geom = new THREE.ExtrudeGeometry(billShape, extrudeSettings);
    geom.center();

    // Subtle curl — bend vertices along X
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setZ(i, z + Math.sin(x * 1.8) * 0.05);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: PALETTE.paperBill,
      roughness: 0.85,
      metalness: 0.0
    });
    const bill = new THREE.Mesh(geom, mat);
    group.add(bill);

    // Subtle border decoration
    const borderShape = new THREE.Shape();
    const bw = w * 0.9, bh = h * 0.78;
    borderShape.moveTo(-bw/2, -bh/2);
    borderShape.lineTo(bw/2, -bh/2);
    borderShape.lineTo(bw/2, bh/2);
    borderShape.lineTo(-bw/2, bh/2);
    borderShape.lineTo(-bw/2, -bh/2);
    const innerHole = new THREE.Path();
    innerHole.moveTo(-bw/2 + 0.02, -bh/2 + 0.02);
    innerHole.lineTo(bw/2 - 0.02, -bh/2 + 0.02);
    innerHole.lineTo(bw/2 - 0.02, bh/2 - 0.02);
    innerHole.lineTo(-bw/2 + 0.02, bh/2 - 0.02);
    innerHole.lineTo(-bw/2 + 0.02, -bh/2 + 0.02);
    borderShape.holes.push(innerHole);
    const borderGeom = new THREE.ShapeGeometry(borderShape);
    const borderMat = new THREE.MeshStandardMaterial({
      color: PALETTE.tealDeep,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const border = new THREE.Mesh(borderGeom, borderMat);
    border.position.z = 0.011;

    // Apply same curl
    const bpos = border.geometry.attributes.position;
    for (let i = 0; i < bpos.count; i++) {
      const x = bpos.getX(i);
      bpos.setZ(i, bpos.getZ(i) + Math.sin(x * 1.8) * 0.05);
    }
    border.geometry.computeVertexNormals();
    group.add(border);

    return group;
  }

  _buildFruitCoin(color, radius, kind) {
    const group = new THREE.Group();

    // Body — slightly oval sphere
    const geom = new THREE.SphereGeometry(radius, 32, 24);
    if (kind === 'lemon') {
      geom.scale(1, 0.8, 0.8);
    } else if (kind === 'apple') {
      geom.scale(1, 0.92, 1);
    }
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.05
    });
    const body = new THREE.Mesh(geom, mat);
    group.add(body);

    // Stem
    const stemGeom = new THREE.CylinderGeometry(radius * 0.05, radius * 0.06, radius * 0.3, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = radius * (kind === 'lemon' ? 0.78 : 0.95);
    group.add(stem);

    // Leaf
    const leafGeom = new THREE.SphereGeometry(radius * 0.18, 8, 6);
    leafGeom.scale(1.2, 0.5, 0.6);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x6abf5a,
      roughness: 0.6,
      metalness: 0
    });
    const leaf = new THREE.Mesh(leafGeom, leafMat);
    leaf.position.set(radius * 0.18, radius * (kind === 'lemon' ? 0.85 : 1.05), 0);
    leaf.rotation.z = -0.6;
    group.add(leaf);

    // $ glyph on side as small impressed symbol — using canvas texture
    const tex = this._textTexture('$', '#ffffff', 'rgba(0,0,0,0)', 0.7);
    const glyphMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const glyph = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.4, 24), glyphMat);
    glyph.position.z = radius * 0.96;
    group.add(glyph);

    return group;
  }

  _buildJar() {
    const group = new THREE.Group();

    // Glass body — LatheGeometry profile of a jar
    const points = [];
    points.push(new THREE.Vector2(0.42, -0.85));
    points.push(new THREE.Vector2(0.72, -0.78));
    points.push(new THREE.Vector2(0.78, -0.4));
    points.push(new THREE.Vector2(0.78, 0.2));
    points.push(new THREE.Vector2(0.7, 0.5));
    points.push(new THREE.Vector2(0.55, 0.62));
    points.push(new THREE.Vector2(0.55, 0.72));
    points.push(new THREE.Vector2(0.62, 0.85));
    points.push(new THREE.Vector2(0.62, 0.9));
    const jarGeom = new THREE.LatheGeometry(points, 48);
    const jarMat = new THREE.MeshPhysicalMaterial({
      color: PALETTE.jarGlass,
      roughness: 0.18,
      metalness: 0,
      transmission: 0.7,
      thickness: 0.6,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      envMapIntensity: 1.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2
    });
    const jar = new THREE.Mesh(jarGeom, jarMat);
    group.add(jar);

    // Lid — slot for coins
    const lidGeom = new THREE.CylinderGeometry(0.62, 0.6, 0.12, 32);
    const lidMat = new THREE.MeshStandardMaterial({
      color: PALETTE.clay,
      roughness: 0.5,
      metalness: 0.2
    });
    const lid = new THREE.Mesh(lidGeom, lidMat);
    lid.position.y = 0.92;
    group.add(lid);

    // Slot indent (dark plane)
    const slotGeom = new THREE.PlaneGeometry(0.55, 0.06);
    const slotMat = new THREE.MeshStandardMaterial({
      color: PALETTE.ink,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const slot = new THREE.Mesh(slotGeom, slotMat);
    slot.rotation.x = -Math.PI / 2;
    slot.position.y = 0.98;
    group.add(slot);

    // Coins visible inside (3 stacked)
    for (let i = 0; i < 3; i++) {
      const c = this._buildCoin(0.28, i === 0 ? PALETTE.goldCoin : (i === 1 ? PALETTE.copperCoin : PALETTE.yellow), '');
      c.position.set(
        (Math.random() - 0.5) * 0.5,
        -0.55 + i * 0.12,
        (Math.random() - 0.5) * 0.3
      );
      c.rotation.set(
        Math.random() * 0.3 - 0.15,
        Math.random() * Math.PI,
        Math.random() * 0.3 - 0.15
      );
      c.scale.setScalar(0.85);
      group.add(c);
    }

    // Brand label (small paper strip)
    const labelGeom = new THREE.PlaneGeometry(0.7, 0.22);
    const labelTex = this._textTexture('SAVINGS', '#1A1F2E', '#FFF3CC', 0.6);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.85,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeom, labelMat);
    label.position.set(0, 0, 0.79);
    group.add(label);

    return group;
  }

  _buildCard() {
    const group = new THREE.Group();
    const w = 1.1, h = 0.7;
    const cardShape = new THREE.Shape();
    const r = 0.08;
    cardShape.moveTo(-w/2 + r, -h/2);
    cardShape.lineTo(w/2 - r, -h/2);
    cardShape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    cardShape.lineTo(w/2, h/2 - r);
    cardShape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    cardShape.lineTo(-w/2 + r, h/2);
    cardShape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    cardShape.lineTo(-w/2, -h/2 + r);
    cardShape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);

    const geom = new THREE.ExtrudeGeometry(cardShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 3,
      steps: 1
    });
    geom.center();
    const mat = new THREE.MeshStandardMaterial({
      color: PALETTE.cardSurface,
      roughness: 0.35,
      metalness: 0.6
    });
    const card = new THREE.Mesh(geom, mat);
    group.add(card);

    // Yellow chip
    const chipGeom = new THREE.BoxGeometry(0.18, 0.13, 0.005);
    const chipMat = new THREE.MeshStandardMaterial({
      color: PALETTE.yellowDeep,
      roughness: 0.4,
      metalness: 0.8
    });
    const chip = new THREE.Mesh(chipGeom, chipMat);
    chip.position.set(-0.3, 0.08, 0.027);
    group.add(chip);

    // Stripe row (magnetic)
    const stripeGeom = new THREE.PlaneGeometry(w * 0.9, 0.08);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x121826,
      roughness: 0.9
    });
    const stripe = new THREE.Mesh(stripeGeom, stripeMat);
    stripe.position.set(0, h * 0.36, 0.022);
    group.add(stripe);

    // Small "kid card" label
    const tex = this._textTexture('TWK', '#FFD166', 'rgba(0,0,0,0)', 0.5);
    const labelGeom = new THREE.PlaneGeometry(0.28, 0.18);
    const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const label = new THREE.Mesh(labelGeom, labelMat);
    label.position.set(0.3, -0.12, 0.025);
    group.add(label);

    return group;
  }

  _buildGrowthChart() {
    const group = new THREE.Group();

    // Base platform
    const baseGeom = new THREE.CylinderGeometry(0.55, 0.6, 0.08, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: PALETTE.cream,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -0.6;
    group.add(base);

    // Curve points (rising)
    const curvePoints = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = -0.4 + t * 0.8;
      const y = -0.5 + Math.pow(t, 1.6) * 1.1;
      const z = 0;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.045, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: PALETTE.teal,
      roughness: 0.35,
      metalness: 0.2
    });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    group.add(tube);

    // Sphere markers along curve
    [0.2, 0.5, 0.8, 1.0].forEach((t, i) => {
      const pt = curve.getPointAt(t);
      const sphereGeom = new THREE.SphereGeometry(0.075 + i * 0.012, 16, 12);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: i === 3 ? PALETTE.yellow : PALETTE.teal,
        roughness: 0.3,
        metalness: 0.4
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.copy(pt);
      group.add(sphere);
    });

    return group;
  }

  _textTexture(text, color = '#1A1F2E', bg = 'rgba(0,0,0,0)', textSize = 0.8) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    if (bg !== 'rgba(0,0,0,0)') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.fillStyle = color;
    ctx.font = `800 ${Math.floor(size * textSize)}px "Baloo 2", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // ────────── LIFECYCLE ────────── //

  _initListeners() {
    this._onResize = this._resize.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onLeave = this._handleMouseLeave.bind(this);

    window.addEventListener('resize', this._onResize, { passive: true });
    this.stageEl.addEventListener('pointermove', this._onMouseMove, { passive: true });
    this.stageEl.addEventListener('pointerleave', this._onLeave, { passive: true });
  }

  _resize() {
    const rect = this.stageEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _handleMouseMove(e) {
    const rect = this.stageEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    this.mouse.tx = (x - 0.5) * 2;
    this.mouse.ty = (y - 0.5) * 2;
  }

  _handleMouseLeave() {
    this.mouse.tx = 0;
    this.mouse.ty = 0;
  }

  _animate(t) {
    if (this.disposed) return;
    requestAnimationFrame(this._raf);

    const dt = Math.min(0.05, (t - (this._last || t)) / 1000);
    this._last = t;
    this.time += dt;

    // Smooth mouse follow
    this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.06;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.06;

    // Camera subtle parallax — never aggressive
    this.camera.position.x = this.mouse.x * 0.25;
    this.camera.position.y = 0.3 - this.mouse.y * 0.18;
    this.camera.lookAt(0, 0, 0);

    if (!PREFERS_REDUCED_MOTION) {
      this.objects.forEach((obj, i) => {
        const ud = obj.userData;
        if (ud.basePos) {
          // Idle drift — each object has own phase + frequency
          const phase = i * 0.7;
          obj.position.x = ud.basePos.x + Math.sin(this.time * 0.4 + phase) * ud.drift.x;
          obj.position.y = ud.basePos.y + Math.cos(this.time * 0.5 + phase) * ud.drift.y;
          obj.position.z = ud.basePos.z + Math.sin(this.time * 0.3 + phase * 1.3) * ud.drift.z;

          // Mouse parallax — strength varies by depth
          obj.position.x += this.mouse.x * ud.parallaxStrength * 0.15;
          obj.position.y -= this.mouse.y * ud.parallaxStrength * 0.12;
        }
        if (ud.spin) {
          obj.rotation.x += ud.spin.x || 0;
          obj.rotation.y += ud.spin.y || 0;
          obj.rotation.z += ud.spin.z || 0;
        }
      });

      // Jar gentle sway
      if (this.jar) {
        this.jar.rotation.z = Math.sin(this.time * 0.6) * 0.04;
        this.jar.position.y = -0.5 + Math.sin(this.time * 0.7) * 0.06;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener('resize', this._onResize);
    this.stageEl.removeEventListener('pointermove', this._onMouseMove);
    this.stageEl.removeEventListener('pointerleave', this._onLeave);
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
