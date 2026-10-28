(function () {
'use strict';

/* =====================================================================
   JUICE GATE  -  meyve temalı kapı atıp-ateş etme koşu oyunu
   Tek dosya, build yok. index.html'e çift tıkla, oynar.
   ===================================================================== */

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- config
const HALF = 4.5;              // yolun yarı genişliği
const GATE_SPACING = 40;       // bölümler arası mesafe
const ACT_DIST = 62;           // düşmanlar bu mesafede koşmaya başlar
const BULLET_SPEED = 46;
const HITS_PER_POINT = 5;      // kapıya kaç mermi = +1
const MAX_VISIBLE = 36;        // ekranda çizilen max meyve (sayı yine büyür)

// ---------------------------------------------------------------- renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe8ff, 70, 230);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9fc4, 0.62));
const sun = new THREE.DirectionalLight(0xffffff, 0.5);
sun.position.set(6, 14, 8);
scene.add(sun);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // dar ekranlarda (telefon) daha geniş görüş
  camera.fov = w / h < 0.8 ? 68 : 58;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- geometry kit
const G = {
  sph: new THREE.SphereGeometry(1, 14, 10),
  hemi: new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
      _v = new THREE.Vector3(), _s = new THREE.Vector3();

function P(geo, color, pos, scale, rot) { return { geo, color, pos: pos || [0, 0, 0], scale: scale || [1, 1, 1], rot: rot || [0, 0, 0] }; }

// Parçaları tek geometride birleştir (1 draw call / karakter)
function merge(parts) {
  const pos = [], nor = [], col = [];
  const c = new THREE.Color();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    _e.set(p.rot[0], p.rot[1], p.rot[2]);
    _q.setFromEuler(_e);
    _m.compose(_v.set(p.pos[0], p.pos[1], p.pos[2]), _q, _s.set(p.scale[0], p.scale[1], p.scale[2]));
    g.applyMatrix4(_m);
    const pa = g.attributes.position.array, na = g.attributes.normal.array;
    c.set(p.color);
    for (let i = 0; i < pa.length; i += 3) {
      pos.push(pa[i], pa[i + 1], pa[i + 2]);
      nor.push(na[i], na[i + 1], na[i + 2]);
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
const VMAT = new THREE.MeshLambertMaterial({ vertexColors: true });

// ---- Kahraman: çilek asker (-z yönüne bakar)
function heroGeo() {
  const parts = [
    P(G.sph, 0xff3d57, [0, 0.55, 0], [0.38, 0.42, 0.38]),
    P(G.sph, 0xffffff, [-0.14, 0.62, -0.31], [0.1, 0.1, 0.1]),
    P(G.sph, 0xffffff, [0.14, 0.62, -0.31], [0.1, 0.1, 0.1]),
    P(G.sph, 0x1d1d28, [-0.14, 0.62, -0.39], [0.05, 0.05, 0.05]),
    P(G.sph, 0x1d1d28, [0.14, 0.62, -0.39], [0.05, 0.05, 0.05]),
    P(G.hemi, 0x39d052, [0, 0.82, 0], [0.34, 0.24, 0.34]),          // yeşil miğfer/yaprak
    P(G.cone, 0x23a03a, [0, 1.12, 0], [0.07, 0.2, 0.07]),
    P(G.box, 0x343440, [0.3, 0.45, -0.38], [0.1, 0.1, 0.6]),         // silah
    P(G.sph, 0xffa53a, [0.3, 0.45, -0.7], [0.07, 0.07, 0.07]),
    P(G.sph, 0xffe08a, [0.33, 0.42, -0.12], [0.09, 0.09, 0.09]),    // el
    P(G.sph, 0xffe08a, [-0.34, 0.42, -0.05], [0.09, 0.09, 0.09]),
    P(G.sph, 0xb81c34, [-0.15, 0.1, 0], [0.12, 0.1, 0.15]),
    P(G.sph, 0xb81c34, [0.15, 0.1, 0], [0.12, 0.1, 0.15]),
  ];
  const seeds = [[-0.2, 0.42, -0.3], [0.2, 0.4, -0.29], [0, 0.34, -0.37], [-0.12, 0.28, -0.35], [0.12, 0.26, -0.35]];
  for (const s of seeds) parts.push(P(G.sph, 0xffe66d, s, [0.03, 0.04, 0.03]));
  return merge(parts);
}

// ---- Düşman: çürük meyve (+z yönüne bakar)
function enemyGeo(body, horn, sx, sy, sz, eyeCol) {
  const parts = [
    P(G.sph, body, [0, 0.62 * sy, 0], [0.5 * sx, 0.55 * sy, 0.5 * sz]),
    P(G.sph, 0xffffff, [-0.18, 0.74 * sy, 0.4 * sz], [0.13, 0.13, 0.1]),
    P(G.sph, 0xffffff, [0.18, 0.74 * sy, 0.4 * sz], [0.13, 0.13, 0.1]),
    P(G.sph, eyeCol, [-0.18, 0.72 * sy, 0.49 * sz], [0.065, 0.075, 0.05]),
    P(G.sph, eyeCol, [0.18, 0.72 * sy, 0.49 * sz], [0.065, 0.075, 0.05]),
    P(G.box, 0x22102e, [-0.18, 0.9 * sy, 0.45 * sz], [0.26, 0.06, 0.06], [0, 0, -0.45]),
    P(G.box, 0x22102e, [0.18, 0.9 * sy, 0.45 * sz], [0.26, 0.06, 0.06], [0, 0, 0.45]),
    P(G.cone, horn, [-0.27 * sx, 1.1 * sy, 0], [0.09, 0.28, 0.09], [0, 0, 0.35]),
    P(G.cone, horn, [0.27 * sx, 1.1 * sy, 0], [0.09, 0.28, 0.09], [0, 0, -0.35]),
    P(G.box, 0x1a0a22, [0, 0.5 * sy, 0.46 * sz], [0.22, 0.07, 0.05]),
    P(G.sph, 0x4a2260, [-0.2, 0.1, 0.05], [0.13, 0.1, 0.16]),
    P(G.sph, 0x4a2260, [0.2, 0.1, 0.05], [0.13, 0.1, 0.16]),
  ];
  return merge(parts);
}

// ---- Patron: Çürük Patlıcan Kral
function bossGeo() {
  const parts = [
    P(G.sph, 0x5b2a86, [0, 1.25, 0], [1.0, 1.2, 1.0]),
    P(G.sph, 0x7a3fb0, [-0.25, 1.55, 0.55], [0.45, 0.5, 0.4]),
    P(G.sph, 0xffffff, [-0.4, 1.65, 0.8], [0.27, 0.27, 0.2]),
    P(G.sph, 0xffffff, [0.4, 1.65, 0.8], [0.27, 0.27, 0.2]),
    P(G.sph, 0xd10000, [-0.4, 1.62, 0.97], [0.12, 0.14, 0.08]),
    P(G.sph, 0xd10000, [0.4, 1.62, 0.97], [0.12, 0.14, 0.08]),
    P(G.box, 0x1a0a22, [-0.42, 2.0, 0.85], [0.6, 0.13, 0.12], [0, 0, -0.4]),
    P(G.box, 0x1a0a22, [0.42, 2.0, 0.85], [0.6, 0.13, 0.12], [0, 0, 0.4]),
    P(G.box, 0x14061c, [0, 1.0, 0.92], [0.9, 0.3, 0.12]),
    P(G.box, 0xffffff, [-0.3, 1.1, 0.99], [0.14, 0.14, 0.05]),
    P(G.box, 0xffffff, [0.0, 1.1, 0.99], [0.14, 0.14, 0.05]),
    P(G.box, 0xffffff, [0.3, 1.1, 0.99], [0.14, 0.14, 0.05]),
    P(G.hemi, 0x2fa84a, [0, 2.3, 0], [0.55, 0.35, 0.55]),            // sap kapağı
    P(G.cone, 0x23802f, [0, 2.8, 0], [0.12, 0.6, 0.12]),
    P(G.sph, 0x5b2a86, [-1.15, 1.0, 0.2], [0.34, 0.34, 0.34]),       // kollar
    P(G.sph, 0x5b2a86, [1.15, 1.0, 0.2], [0.34, 0.34, 0.34]),
    P(G.sph, 0x3d1a5e, [-0.5, 0.2, 0.1], [0.38, 0.22, 0.42]),
    P(G.sph, 0x3d1a5e, [0.5, 0.2, 0.1], [0.38, 0.22, 0.42]),
  ];
  // altın taç
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(P(G.cone, 0xffd23f, [Math.cos(a) * 0.5, 2.65, Math.sin(a) * 0.5], [0.1, 0.3, 0.1]));
  }
  return merge(parts);
}

// ---- Varil yığını + silah
function crateGeo() {
  const parts = [];
  const barrel = (x, y, z) => {
    parts.push(P(G.cyl, 0xff8a1f, [x, y, z], [0.5, 0.9, 0.5]));
    parts.push(P(G.cyl, 0xffd23f, [x, y - 0.25, z], [0.53, 0.1, 0.53]));
    parts.push(P(G.cyl, 0xffd23f, [x, y + 0.25, z], [0.53, 0.1, 0.53]));
  };
  barrel(-0.55, 0.45, 0); barrel(0.55, 0.45, 0); barrel(0, 1.33, 0);
  parts.push(P(G.box, 0x343440, [0, 2.1, 0], [0.22, 0.22, 1.2]));
  parts.push(P(G.box, 0x22222c, [0, 1.9, 0.25], [0.18, 0.4, 0.2]));
  parts.push(P(G.box, 0x4aa8ff, [0, 2.22, -0.1], [0.14, 0.1, 0.6]));
  return merge(parts);
}

// ---- Bulut
function cloudGeo() {
  return merge([
    P(G.sph, 0xffffff, [0, 0, 0], [3, 1.6, 2]), P(G.sph, 0xffffff, [-3, -0.3, 0], [2.2, 1.2, 1.6]),
    P(G.sph, 0xffffff, [3, -0.2, 0.2], [2.4, 1.3, 1.7]), P(G.sph, 0xffffff, [0.5, 0.9, 0], [2, 1.2, 1.5]),
  ]);
}

// ---------------------------------------------------------------- text sprites
function makeLabel(w, h, cw, ch) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(w, h, 1);
  spr.userData.cv = cv; spr.userData.tex = tex;
  return spr;
}
function drawLabel(spr, text, fill, stroke) {
  const cv = spr.userData.cv, c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  let size = cv.height * 0.78;
  c.font = '900 ' + size + 'px Impact, "Arial Black", sans-serif';
  while (c.measureText(text).width > cv.width * 0.92 && size > 12) { size -= 4; c.font = '900 ' + size + 'px Impact, "Arial Black", sans-serif'; }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = size * 0.2; c.strokeStyle = stroke || '#1a1a2a';
  c.strokeText(text, cv.width / 2, cv.height / 2 + size * 0.04);
  c.fillStyle = fill || '#fff';
  c.fillText(text, cv.width / 2, cv.height / 2 + size * 0.04);
  spr.userData.tex.needsUpdate = true;
}
function disposeLabel(spr) { spr.material.map.dispose(); spr.material.dispose(); }

// ---------------------------------------------------------------- instanced pools
// Mermiler
const BN = 240;
const bMesh = new THREE.InstancedMesh(G.sph, new THREE.MeshBasicMaterial({ color: 0xfff35c }), BN);
bMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bMesh.frustumCulled = false; scene.add(bMesh);
const bul = []; for (let i = 0; i < BN; i++) bul.push({ on: false, x: 0, z: 0, vx: 0, vz: 0, d: 0 });
let bulCursor = 0;

// Parçacıklar (meyve suyu)
const PN = 320;
const pMesh = new THREE.InstancedMesh(G.sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), PN);
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pMesh.frustumCulled = false; scene.add(pMesh);
const _col = new THREE.Color();
for (let i = 0; i < PN; i++) pMesh.setColorAt(i, _col.set(0xffffff));
const par = []; for (let i = 0; i < PN; i++) par.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1 });
let parCursor = 0;
function burst(x, y, z, color, n, speed, size) {
  _col.set(color);
  for (let k = 0; k < n; k++) {
    const i = parCursor; parCursor = (parCursor + 1) % PN;
    const p = par[i];
    const a = Math.random() * Math.PI * 2, u = Math.random();
    p.x = x; p.y = y; p.z = z;
    p.vx = Math.cos(a) * speed * u; p.vz = Math.sin(a) * speed * u; p.vy = (0.4 + Math.random()) * speed * 0.9;
    p.max = p.life = 0.45 + Math.random() * 0.4; p.s = size * (0.6 + Math.random() * 0.8);
    pMesh.setColorAt(i, _col);
  }
  pMesh.instanceColor.needsUpdate = true;
}

// Gölgeler
const SN = 520;
const shGeo = new THREE.CircleGeometry(1, 14); shGeo.rotateX(-Math.PI / 2);
const sMesh = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }), SN);
sMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sMesh.frustumCulled = false; sMesh.renderOrder = -1; scene.add(sMesh);
let shN = 0;
function addShadow(x, z, s) {
  if (shN >= SN) return;
  _m.makeScale(s, 1, s); _m.setPosition(x, 0.04, z);
  sMesh.setMatrixAt(shN++, _m);
}

// ---------------------------------------------------------------- audio
let AC = null, muted = false;
try { muted = localStorage.getItem('jg_mute') === '1'; } catch (e) {}
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function tone(f, d, type, v, slide, delay) {
  const a = AC; if (!a || muted) return;
  const t0 = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
  g.gain.setValueAtTime(v || 0.1, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.03);
}
let lastShootSfx = 0, lastPopSfx = 0;
const sfx = {
  shoot() { const n = performance.now(); if (n - lastShootSfx < 110) return; lastShootSfx = n; tone(620, 0.05, 'square', 0.025, -300); },
  pop() { const n = performance.now(); if (n - lastPopSfx < 55) return; lastPopSfx = n; tone(340 + Math.random() * 120, 0.09, 'triangle', 0.07, -180); },
  good() { tone(523, 0.12, 'triangle', 0.12); tone(659, 0.12, 'triangle', 0.12, 0, 0.09); tone(784, 0.2, 'triangle', 0.12, 0, 0.18); },
  bad() { tone(200, 0.3, 'sawtooth', 0.09, -120); },
  weapon() { tone(500, 0.1, 'square', 0.07); tone(750, 0.1, 'square', 0.07, 0, 0.08); tone(1100, 0.2, 'square', 0.07, 0, 0.16); },
  hurt() { tone(140, 0.16, 'square', 0.1, -70); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, 0, i * 0.12)); },
  lose() { [400, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.09, -30, i * 0.16)); },
  bossHit() { const n = performance.now(); if (n - lastPopSfx < 55) return; lastPopSfx = n; tone(110, 0.08, 'square', 0.05, -30); },
};

// ---------------------------------------------------------------- input
let targetX = 0, keyL = 0, keyR = 0, dragging = false, dragX0 = 0, dragT0 = 0;
window.addEventListener('keydown', (e) => {
  ac(); if (AC && AC.state === 'suspended') AC.resume();
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyL = 1;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keyR = 1;
  if ((k === 'Enter' || k === ' ') && state === 'title') startGame();
  if (k === 'r' || k === 'R') { if (state === 'playing' || state === 'boss') loadLevel(level); }
});
window.addEventListener('keyup', (e) => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyL = 0;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keyR = 0;
});
canvas.addEventListener('pointerdown', (e) => { ac(); if (AC && AC.state === 'suspended') AC.resume(); dragging = true; dragX0 = e.clientX; dragT0 = targetX; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
canvas.addEventListener('pointermove', (e) => { if (!dragging) return; targetX = dragT0 + ((e.clientX - dragX0) / window.innerWidth) * 13; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointercancel', () => { dragging = false; });
$('mute').textContent = muted ? '🔇' : '🔊';
$('mute').addEventListener('click', (e) => {
  e.stopPropagation(); muted = !muted; ac();
  try { localStorage.setItem('jg_mute', muted ? '1' : '0'); } catch (x) {}
  $('mute').textContent = muted ? '🔇' : '🔊';
});

// ---------------------------------------------------------------- shared world resources
const deckTex = (function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#9fa2b0'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#9498a7';
  for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? 0 : 8; x < 128; x += 16) c.fillRect(x, y, 8, 8);
  c.fillStyle = '#e9ebf2'; c.fillRect(0, 0, 6, 128); c.fillRect(122, 0, 6, 128);
  c.fillStyle = '#8a8e9e'; c.fillRect(0, 0, 128, 3);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
})();

const G_hero = heroGeo();
const G_grunt = enemyGeo(0x9b59b6, 0xffd23f, 1, 1, 1, 0x200010);
const G_runner = enemyGeo(0xffd93d, 0xff7a1a, 0.85, 1.05, 1.1, 0xc00000);
const G_tank = enemyGeo(0x2e9b57, 0xe8e8e8, 1.15, 1.1, 1.1, 0xff2020);
const G_boss = bossGeo();
const G_crate = crateGeo();
const G_cloud = cloudGeo();
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
const seaMat = new THREE.MeshBasicMaterial({ color: 0x2b9cf2 });

const ETYPES = {
  grunt: { geo: G_grunt, speed: 4.8, steer: 2.6, r: 0.78, dmg: 1, scale: 1.3 },
  runner: { geo: G_runner, speed: 7.8, steer: 3.4, r: 0.68, dmg: 1, scale: 1.15 },
  tank: { geo: G_tank, speed: 3.1, steer: 1.5, r: 1.35, dmg: 3, scale: 2.1 },
};

// ---------------------------------------------------------------- state
let state = 'title';           // title | playing | boss | win | lose
let level = 1;
try { level = Math.max(1, parseInt(localStorage.getItem('jg_level') || '1', 10) || 1); } catch (e) {}
const qs = new URLSearchParams(location.search);
if (qs.get('level')) level = Math.max(1, parseInt(qs.get('level'), 10) || 1);

let LEN = 200, pz = 0, px = 0, count = 6, weapon = 1, speed = 9, tGame = 0;
let levelGroup = null;
let gates = [], enemies = [], crates = [], boss = null, popups = [];
let shake = 0, fireT = 0, endTimer = 0, bossSpawnT = 0;
let rngRun = Math.random;

// ---------------------------------------------------------------- squad
const squad = [];
const squadOff = [];
const countSpr = makeLabel(2.4, 1.2, 256, 128);
countSpr.renderOrder = 10; countSpr.material.depthTest = false;
scene.add(countSpr);
let shownCount = -1;

for (let i = 0; i < MAX_VISIBLE; i++) {
  const m = new THREE.Mesh(G_hero, VMAT);
  m.userData = { x: 0, s: 0, ph: Math.random() * 6.28 };
  m.visible = false; scene.add(m); squad.push(m);
  const k = i, a = k * 2.39996, r = 0.56 * Math.sqrt(k);
  squadOff.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.85 + r * 0.35 });
}
function limitX() { return Math.max(1.3, HALF - 0.8 - 0.46 * Math.sqrt(Math.min(count, MAX_VISIBLE))); }
function setCount(n) {
  const old = count;
  count = Math.max(0, Math.floor(n));
  if (count !== old) { countPulse = 0.25; }
}
let countPulse = 0;

// ---------------------------------------------------------------- UI helpers
function setBar(frac, txt, isBoss) {
  $('bar').style.width = (clamp(frac, 0, 1) * 100).toFixed(1) + '%';
  $('bartxt').textContent = txt || '';
  $('bar').classList.toggle('boss', !!isBoss);
}
function showScreen(id, on) { $(id).classList.toggle('show', !!on); }
let lastFlash = 0;
function flashRed() { const n = performance.now(); if (n - lastFlash < 180) return; lastFlash = n; const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 0.9; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); }

function popup(text, x, z, fill, big) {
  const s = makeLabel(big ? 3.4 : 2.4, big ? 1.7 : 1.2, 256, 128);
  drawLabel(s, text, fill, '#1a1a2a');
  s.position.set(x, 3.0, z); s.renderOrder = 11; s.material.depthTest = false;
  scene.add(s);
  popups.push({ s, t: 0 });
}

// ---------------------------------------------------------------- level build
function clearLevel() {
  if (levelGroup) {
    levelGroup.traverse((o) => {
      if (o.isSprite) disposeLabel(o);
      else if (o.isMesh) { if (o.geometry && o.userData.own) o.geometry.dispose(); if (o.material && o.userData.ownMat) o.material.dispose(); }
    });
    scene.remove(levelGroup);
  }
  if (boss) scene.remove(boss.mesh);
  for (const e of enemies) { scene.remove(e.mesh); if (e.lab) disposeLabel(e.lab); }
  for (const p of popups) { scene.remove(p.s); disposeLabel(p.s); }
  levelGroup = new THREE.Group(); scene.add(levelGroup);
  gates = []; enemies = []; crates = []; boss = null; popups = [];
  for (const b of bul) b.on = false;
  for (const p of par) p.life = 0;
}

function mkMesh(geo, mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sx !== undefined) m.scale.set(sx, sy, sz); return m;
}

function buildGate(z, vl, vr) {
  const g = { z, v: [vl, vr], hits: [0, 0], done: false, parts: [], pulse: 0 };
  const grp = new THREE.Group(); grp.position.z = z; levelGroup.add(grp); g.grp = grp;
  for (let s = 0; s < 2; s++) {
    const cx = s === 0 ? -HALF / 2 : HALF / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF - 0.35, 4.2), new THREE.MeshBasicMaterial({ color: 0x35e04f, transparent: true, opacity: 0.55, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.05, 0); floor.userData.own = floor.userData.ownMat = true; grp.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(HALF - 0.35, 1.6), new THREE.MeshBasicMaterial({ color: 0x35e04f, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    wall.position.set(cx, 0.85, -2.1); wall.userData.own = wall.userData.ownMat = true; grp.add(wall);
    const lab = makeLabel(3.3, 1.65, 256, 128); lab.position.set(cx, 1.7, -1.4); lab.renderOrder = 5; lab.material.depthTest = false;
    grp.add(lab);
    g.parts.push({ floor, wall, lab, cx });
  }
  // direkler
  const postMat = new THREE.MeshLambertMaterial({ color: 0x2ecc40 }), capMat = new THREE.MeshLambertMaterial({ color: 0x2f9bff });
  for (const x of [-HALF + 0.12, 0, HALF - 0.12]) {
    const p = mkMesh(G.cyl, postMat, x, 1.2, -2.1, 0.13, 2.4, 0.13); grp.add(p);
    const r1 = mkMesh(G.cyl, postMat, x, 0.45, -2.1, 0.19, 0.14, 0.19); grp.add(r1);
    const r2 = mkMesh(G.cyl, postMat, x, 1.5, -2.1, 0.19, 0.14, 0.19); grp.add(r2);
    const cap = mkMesh(G.cyl, capMat, x, 2.45, -2.1, 0.16, 0.12, 0.16); grp.add(cap);
  }
  gates.push(g);
  refreshGate(g);
  return g;
}
function refreshGate(g) {
  for (let s = 0; s < 2; s++) {
    const v = g.v[s], pt = g.parts[s], pos = v >= 0;
    pt.floor.material.color.set(pos ? 0x35e04f : 0xff3b3b);
    pt.wall.material.color.set(pos ? 0x35e04f : 0xff3b3b);
    drawLabel(pt.lab, (pos ? '+' : '-') + Math.abs(v), '#ffffff', pos ? '#0b5a16' : '#7a0b0b');
  }
}

function buildCrate(x, z, hp) {
  const mesh = new THREE.Mesh(G_crate, VMAT); mesh.position.set(x, 0, z); levelGroup.add(mesh);
  const lab = makeLabel(2.6, 1.3, 256, 128); lab.position.set(x, 3.7, z); lab.renderOrder = 6; lab.material.depthTest = false; levelGroup.add(lab);
  const c = { x, z, hp, max: hp, mesh, lab, dead: false, pop: 0 };
  drawLabel(lab, String(hp), '#ffe14a', '#5a2b00');
  crates.push(c);
}

function spawnEnemy(type, x, z, hp, active) {
  const T = ETYPES[type];
  const mesh = new THREE.Mesh(T.geo, VMAT);
  mesh.scale.setScalar(T.scale); mesh.position.set(x, 0, z); mesh.visible = false;
  scene.add(mesh);
  const e = { type, T, mesh, x, z, hp, max: hp, alive: true, active: !!active, off: (rngRun() - 0.5) * 3.2, ph: rngRun() * 6.28, pop: 0, lab: null };
  if (type === 'tank') {
    e.lab = makeLabel(1.6, 0.8, 128, 64); e.lab.renderOrder = 6; e.lab.material.depthTest = false; scene.add(e.lab);
    drawLabel(e.lab, String(hp), '#ffffff', '#222');
  }
  enemies.push(e);
  return e;
}

function loadLevel(n) {
  level = n;
  clearLevel();
  const rng = mulberry32(n * 7919 + 17);
  rngRun = rng;
  const R = (a, b) => a + rng() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1));

  const S = Math.min(5 + n, 11);                 // bölüm sayısı
  LEN = 40 + S * GATE_SPACING;
  speed = 9 + Math.min(n, 8) * 0.25;

  // --- yol
  const deckLen = LEN + 160;
  const dTex = deckTex; dTex.repeat.set(1, deckLen / 8);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.7, deckLen), new THREE.MeshLambertMaterial({ map: dTex }));
  deck.position.set(0, -0.35, -(LEN + 40) / 2 + 12); deck.userData.own = deck.userData.ownMat = true; levelGroup.add(deck);
  const railMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f6 });
  for (const sx of [-1, 1]) {
    const rail = mkMesh(G.box, railMat, sx * (HALF + 0.15), 0.35, deck.position.z, 0.3, 0.7, deckLen); levelGroup.add(rail);
  }
  // asma köprü kuleleri
  const towerMat = new THREE.MeshLambertMaterial({ color: 0x8e919c });
  for (let z = -60; z > -(LEN + 120); z -= 90) {
    for (const sx of [-1, 1]) levelGroup.add(mkMesh(G.box, towerMat, sx * (HALF + 0.9), 9, z, 1.1, 18.5, 1.1));
    levelGroup.add(mkMesh(G.box, towerMat, 0, 15.5, z, HALF * 2 + 3, 0.9, 1.0));
    levelGroup.add(mkMesh(G.box, towerMat, 0, 10.5, z, HALF * 2 + 3, 0.6, 0.8));
  }
  // deniz
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -6, -LEN / 2); levelGroup.add(sea);
  // bulutlar
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Mesh(G_cloud, cloudMat);
    const sx = rng() < 0.5 ? -1 : 1;
    c.position.set(sx * R(30, 110), R(22, 48), -R(0, LEN + 120)); c.scale.setScalar(R(1.5, 3.2)); levelGroup.add(c);
  }

  // --- bölümler
  for (let i = 0; i < S; i++) {
    const z = -(34 + i * GATE_SPACING);
    if (i % 2 === 0) {
      // kapı çifti
      const kind = rng();
      let a, b;
      if (i === 0) { a = RI(3 + Math.floor(n / 2), 6 + n); b = -RI(1, 3); }
      else if (kind < 0.18) { a = RI(2, 5 + n); b = RI(1, 4 + n); }                 // ikisi de pozitif (ödül)
      else if (kind < 0.30) { a = -RI(2, 4 + n); b = -RI(1, 3 + n); }                // ikisi de negatif (ateşle düzelt)
      else { a = RI(3, 7 + n); b = -RI(2, 6 + n); }
      if (rng() < 0.5) { const t = a; a = b; b = t; }
      buildGate(z, a, b);
    } else {
      // düşman dalgası
      const cnt = 6 + n + i;
      const hpG = 1 + Math.floor((n - 1) / 4);
      for (let k = 0; k < cnt; k++) {
        let type = 'grunt';
        const r = rng();
        if (n >= 3 && r < 0.2) type = 'runner';
        else if (n >= 4 && r > 0.95) type = 'tank';
        const hp = type === 'grunt' ? hpG : type === 'runner' ? 1 : 6 + n * 2;
        spawnEnemy(type, R(-3.8, 3.8), z - R(0, 14), hp, false);
      }
      if (i % 4 === 1) buildCrate(rng() < 0.5 ? -2 : 2, z + 16, 14 + n * 8 + RI(0, 6));
    }
  }
  // patron
  const bz = -LEN - 46;
  const bMeshO = new THREE.Mesh(G_boss, VMAT); bMeshO.scale.setScalar(3.3); bMeshO.position.set(0, 0, bz); scene.add(bMeshO);
  boss = { mesh: bMeshO, x: 0, z: bz, hp: 180 + n * 110, max: 180 + n * 110, pop: 0, awake: false, alive: true };

  // --- oyuncu sıfırla
  pz = 0; px = 0; targetX = 0; count = 6 + Math.min(n - 1, 8); weapon = 1; fireT = 0; tGame = 0; shake = 0; bossSpawnT = 2.5;
  shownCount = -1; countPulse = 0;
  $('lvn').textContent = n; $('wl').textContent = weapon; $('icon').textContent = '🍆';
  setBar(0, '0%', false);
  showScreen('end', false);
  state = 'playing';
  for (let i = 0; i < MAX_VISIBLE; i++) { squad[i].visible = i < count; squad[i].userData.x = px + squadOff[i].x; squad[i].userData.s = i < count ? 1 : 0; }
}

// ---------------------------------------------------------------- game flow
function startGame() {
  ac(); if (AC && AC.state === 'suspended') AC.resume();
  showScreen('title', false);
  $('hud').style.display = 'flex'; $('weapon').style.display = 'block';
  loadLevel(level);
  const h = $('hint'); h.style.display = 'block'; setTimeout(() => { h.style.display = 'none'; }, 2600);
}
function enterBoss() {
  state = 'boss'; boss.awake = true;
  $('icon').textContent = '👑';
}
function win() {
  if (state === 'win') return;
  state = 'win'; sfx.win();
  for (let i = 0; i < 6; i++) burst(px + (Math.random() - 0.5) * 6, 2 + Math.random() * 3, pz - 4 - Math.random() * 6, [0xff3d57, 0xffd23f, 0x35e04f, 0x4aa8ff, 0xff8a1f][i % 5], 24, 7, 0.16);
  endTimer = 1.2;
  try { localStorage.setItem('jg_level', String(level + 1)); } catch (e) {}
}
function lose() {
  if (state === 'lose' || state === 'win') return;
  state = 'lose'; sfx.lose(); flashRed();
  endTimer = 0.9;
}
function showEnd() {
  if (state === 'win') {
    $('etitle').textContent = 'LEVEL ' + level + ' TAMAM!';
    $('estat').textContent = '🍓 ' + count + ' meyve ayakta kaldı';
    $('enext').textContent = 'SONRAKİ LEVEL';
    $('enext').className = 'big';
  } else {
    $('etitle').textContent = 'EZİLDİN!';
    $('estat').textContent = 'Kapıları ateşle, silahı yükselt!';
    $('enext').textContent = 'TEKRAR DENE';
    $('enext').className = 'big red';
  }
  showScreen('end', true);
}
$('play').addEventListener('click', startGame);
$('enext').addEventListener('click', () => {
  if (state === 'win') loadLevel(level + 1); else loadLevel(level);
});
$('tlv').textContent = 'LEVEL ' + level;

// ---------------------------------------------------------------- shooting
function fireVolley() {
  const streams = [1, 2, 3, 4, 5, 7][clamp(weapon, 1, 6) - 1];
  const z0 = pz - 0.8;
  for (let k = 0; k < streams; k++) {
    let ox, vx;
    if (weapon === 2) { ox = (k - 0.5) * 0.5; vx = 0; }
    else if (weapon === 3) { ox = (k - 1) * 0.3; vx = (k - 1) * 2.2; }
    else if (weapon === 4) { ox = (k - 1.5) * 0.45; vx = 0; }
    else { ox = (k - (streams - 1) / 2) * 0.28; vx = (k - (streams - 1) / 2) * 2.4; }
    const b = bul[bulCursor]; bulCursor = (bulCursor + 1) % BN;
    b.on = true; b.x = px + ox; b.z = z0; b.vx = vx; b.vz = -BULLET_SPEED; b.d = 0;
  }
  sfx.shoot();
}

// ---------------------------------------------------------------- update
function enemyDie(e, silent) {
  e.alive = false; e.mesh.visible = false;
  if (e.lab) e.lab.visible = false;
  const col = e.type === 'runner' ? 0xffd93d : e.type === 'tank' ? 0x2e9b57 : 0xb36bd6;
  burst(e.x, 0.7, e.z, col, e.type === 'tank' ? 22 : 9, e.type === 'tank' ? 6 : 4, e.type === 'tank' ? 0.22 : 0.14);
  if (!silent) sfx.pop();
}

function pruneEnemies() {
  enemies = enemies.filter((e) => { if (e.alive) return true; scene.remove(e.mesh); if (e.lab) { scene.remove(e.lab); disposeLabel(e.lab); } return false; });
}

function hurtSquad(n) {
  setCount(count - n);
  shake = Math.min(0.5, shake + 0.2); flashRed(); sfx.hurt();
  if (count <= 0) lose();
}

function update(dt) {
  tGame += dt;
  const playing = state === 'playing' || state === 'boss';

  // --- yanal hareket
  if (playing) {
    targetX += (keyR - keyL) * 9 * dt;
    const lim = limitX(); targetX = clamp(targetX, -lim, lim);
    px += (targetX - px) * (1 - Math.exp(-dt * 14));
    if (state === 'playing') {
      pz -= speed * dt;
      if (pz <= -LEN) { pz = -LEN; enterBoss(); }
    }
    // --- ateş
    fireT -= dt;
    const interval = clamp(0.22 / (1 + count * 0.07), 0.045, 0.22);
    let guard = 0;
    while (fireT <= 0 && guard++ < 4) { fireVolley(); fireT += interval; }
  }

  // --- mermiler
  let bi = 0;
  for (let i = 0; i < BN; i++) {
    const b = bul[i];
    if (!b.on) { _m.makeScale(0, 0, 0); bMesh.setMatrixAt(i, _m); continue; }
    const pzPrev = b.z;
    b.x += b.vx * dt; b.z += b.vz * dt; b.d += BULLET_SPEED * dt;
    if (b.d > 80) { b.on = false; continue; }
    // kapılar
    for (const g of gates) {
      if (g.done) continue;
      if (pzPrev >= g.z - 0.9 && b.z < g.z - 0.9) {
        const s = b.x < 0 ? 0 : 1;
        if (b.x > -HALF && b.x < HALF) {
          g.hits[s]++;
          if (g.hits[s] % HITS_PER_POINT === 0) { g.v[s]++; refreshGate(g); g.pulse = 0.2; }
          burst(b.x, 0.9, g.z - 1, g.v[s] >= 0 ? 0x7dff6a : 0xff6a6a, 2, 2, 0.08);
        }
      }
    }
    // düşmanlar
    let hit = false;
    for (let j = 0; j < enemies.length && !hit; j++) {
      const e = enemies[j];
      if (!e.alive || !e.mesh.visible) continue;
      const r = e.T.r;
      if (Math.abs(b.x - e.x) < r && Math.abs(b.z - e.z) < r + 0.35) {
        hit = true; e.hp--; e.pop = 0.18;
        if (e.lab) drawLabel(e.lab, String(Math.max(e.hp, 0)), '#ffffff', '#222');
        if (e.hp <= 0) enemyDie(e);
        else burst(b.x, 0.8, b.z, 0xffffff, 2, 2.5, 0.08);
      }
    }
    // varil
    if (!hit) for (const c of crates) {
      if (c.dead) continue;
      if (Math.abs(b.x - c.x) < 1.25 && Math.abs(b.z - c.z) < 1.0) {
        hit = true; c.hp--; c.pop = 0.12;
        drawLabel(c.lab, String(Math.max(c.hp, 0)), '#ffe14a', '#5a2b00');
        burst(b.x, 1.2, b.z, 0xffa53a, 2, 2.5, 0.09);
        if (c.hp <= 0) {
          c.dead = true; c.mesh.visible = false; c.lab.visible = false;
          burst(c.x, 1.3, c.z, 0xff8a1f, 26, 6, 0.2);
          if (weapon < 6) { weapon++; $('wl').textContent = weapon; popup('SİLAH YÜKSELDİ!', px, pz - 1.5, '#7dffb0', true); sfx.weapon(); }
          else popup('MAX SİLAH!', px, pz - 1.5, '#ffe14a', true);
        }
        break;
      }
    }
    // patron
    if (!hit && boss && boss.alive && (state === 'boss' || boss.z > pz - 80)) {
      if (Math.abs(b.x - boss.x) < 3.2 && Math.abs(b.z - boss.z) < 2.6) {
        hit = true; boss.hp--; boss.pop = 0.05; sfx.bossHit();
        burst(b.x, 2.5 + Math.random() * 2, b.z, 0xb36bd6, 2, 3, 0.12);
        if (boss.hp <= 0) {
          boss.alive = false; boss.mesh.visible = false;
          burst(boss.x, 3, boss.z, 0x9b59b6, 60, 10, 0.3);
          burst(boss.x, 3, boss.z, 0xffd23f, 40, 9, 0.25);
          for (const e of enemies) if (e.alive) enemyDie(e, true);
          win();
        }
      }
    }
    if (hit) { b.on = false; _m.makeScale(0, 0, 0); bMesh.setMatrixAt(i, _m); continue; }
    _m.makeScale(0.13, 0.13, 0.42); _m.setPosition(b.x, 0.85, b.z);
    bMesh.setMatrixAt(i, _m);
  }
  bMesh.instanceMatrix.needsUpdate = true;

  // --- kapılar (geçiş)
  for (const g of gates) {
    if (g.pulse > 0) g.pulse -= dt;
    const sc = 1 + Math.max(0, g.pulse) * 1.2;
    for (const pt of g.parts) pt.lab.scale.set(3.3 * sc, 1.65 * sc, 1);
    if (g.done || !playing) continue;
    if (pz < g.z - 0.9) {
      g.done = true;
      const s = px < 0 ? 0 : 1, v = g.v[s];
      const nc = Math.max(0, count + v);
      if (v >= 0) { setCount(nc); popup('+' + v, px, pz - 1, '#7dff6a', true); sfx.good(); burst(px, 1, pz - 1, 0x7dff6a, 16, 5, 0.14); }
      else { popup('' + v, px, pz - 1, '#ff5a5a', true); setCount(nc); shake = 0.3; flashRed(); sfx.bad(); burst(px, 1, pz - 1, 0xff4a4a, 16, 5, 0.14); if (count <= 0) lose(); }
      for (let k = 0; k < 2; k++) { g.parts[k].floor.material.opacity = k === s ? 0.2 : 0.35; }
    }
  }

  // --- varil çarpışması
  if (playing) for (const c of crates) {
    if (c.dead) continue;
    if (pz < c.z + 1.0 && pz > c.z - 1.4 && Math.abs(px - c.x) < 1.6) {
      c.dead = true; c.mesh.visible = false; c.lab.visible = false;
      burst(c.x, 1.2, c.z, 0xff8a1f, 22, 6, 0.2);
      popup('-4', px, pz - 1, '#ff5a5a', true); hurtSquad(4);
    }
    if (c.pop > 0) c.pop -= dt;
  }

  // --- düşmanlar
  for (const e of enemies) {
    if (!e.alive) continue;
    const ahead = pz - e.z;                       // + ise önümüzde
    if (!e.active && playing && ahead < ACT_DIST) e.active = true;
    e.mesh.visible = ahead < ACT_DIST + 25 && ahead > -12;
    if (e.active && playing) {
      e.z += e.T.speed * dt;
      const spread = clamp(ahead / 24, 0, 1);
      const tx = px + e.off * spread;
      e.x += clamp(tx - e.x, -1, 1) * e.T.steer * dt;
      e.x = clamp(e.x, -HALF + 0.5, HALF - 0.5);
      // temas
      const rad = 1.3 + 0.3 * Math.sqrt(Math.min(count, MAX_VISIBLE));
      if (e.z >= pz - 0.9 && e.z < pz + 2.2 && Math.abs(e.x - px) < rad) {
        enemyDie(e, false);
        hurtSquad(e.T.dmg);
        popup('-' + e.T.dmg, e.x, e.z, '#ff5a5a', false);
        continue;
      }
      if (e.z > pz + 8) { e.alive = false; e.mesh.visible = false; if (e.lab) e.lab.visible = false; continue; }
    }
    // görsel
    if (e.mesh.visible) {
      const run = e.active ? 1 : 0;
      const sw = Math.sin(tGame * (e.type === 'runner' ? 20 : 12) + e.ph);
      e.pop = Math.max(0, e.pop - dt);
      const sc = e.T.scale * (1 + e.pop * 1.4);
      e.mesh.scale.set(sc, sc * (1 - e.pop * 0.8), sc);
      e.mesh.position.set(e.x, Math.abs(sw) * 0.14 * run, e.z);
      e.mesh.rotation.z = sw * 0.12 * run;
      addShadow(e.x, e.z, 0.55 * e.T.scale);
      if (e.lab) e.lab.position.set(e.x, 2.9, e.z);
    }
  }

  // --- patron
  if (boss && boss.alive) {
    if (state === 'boss') {
      boss.z += (1.2 + level * 0.08) * dt;
      boss.x += clamp(px - boss.x, -1, 1) * 0.8 * dt;
      bossSpawnT -= dt;
      if (bossSpawnT <= 0) {
        bossSpawnT = Math.max(2.2, 4.2 - level * 0.2);
        pruneEnemies();
        const n = 3 + Math.min(level, 6);
        for (let k = 0; k < n; k++) { const e = spawnEnemy(k % 4 === 3 ? 'runner' : 'grunt', clamp(boss.x + (k - n / 2) * 0.9, -4, 4), boss.z + 3 + k * 0.4, k % 4 === 3 ? 1 : 1 + Math.floor((level - 1) / 3), true); e.mesh.visible = true; }
        burst(boss.x, 2, boss.z + 3, 0xff4a4a, 14, 5, 0.16);
      }
      if (boss.z >= pz - 3.2) { count = 0; lose(); }
      setBar(boss.hp / boss.max, '👑 ' + Math.max(0, Math.ceil(boss.hp)), true);
    }
    boss.pop = Math.max(0, boss.pop - dt);
    const bob = Math.sin(tGame * 3) * 0.08;
    const bs = 3.3 * (1 + boss.pop * 0.6);
    boss.mesh.scale.set(bs, bs * (1 + bob * 0.3), bs);
    boss.mesh.position.set(boss.x, 0, boss.z);
    addShadow(boss.x, boss.z, 3.3);
  }

  // --- takım (kahraman meyveler)
  const vis = Math.min(count, MAX_VISIBLE);
  for (let i = 0; i < MAX_VISIBLE; i++) {
    const m = squad[i], u = m.userData;
    if (i < vis) {
      if (!m.visible) { m.visible = true; u.s = 0; u.x = px + squadOff[i].x; }
      u.s = Math.min(1, u.s + dt * 6);
      const lag = Math.max(5, 16 - i * 0.35);
      u.x += (px + squadOff[i].x - u.x) * (1 - Math.exp(-dt * lag));
      const bob = Math.abs(Math.sin(tGame * 12 + u.ph)) * (playing && state === 'playing' ? 0.12 : 0.03);
      m.position.set(u.x, bob, pz + squadOff[i].z);
      m.rotation.z = Math.sin(tGame * 12 + u.ph) * 0.06;
      const s = u.s * (1 + (i === 0 ? countPulse : 0));
      m.scale.setScalar(Math.max(0.001, s * 1.3));
      addShadow(u.x, pz + squadOff[i].z, 0.55 * u.s);
    } else if (m.visible) {
      m.visible = false;
      burst(m.position.x, 0.6, m.position.z, 0xff3d57, 5, 3, 0.1);
    }
  }
  if (countPulse > 0) countPulse = Math.max(0, countPulse - dt);
  if (shownCount !== count) { shownCount = count; drawLabel(countSpr, String(count), '#ffffff', '#c4163a'); }
  const csc = 1 + countPulse * 2.2;
  countSpr.scale.set(2.4 * csc, 1.2 * csc, 1);
  countSpr.position.set(px, 2.0 + Math.sqrt(vis) * 0.16, pz + 0.6);

  // --- parçacıklar
  for (let i = 0; i < PN; i++) {
    const p = par[i];
    if (p.life > 0) {
      p.life -= dt;
      p.vy -= 16 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      const k = Math.max(0, p.life / p.max) * p.s;
      _m.makeScale(k, k, k); _m.setPosition(p.x, p.y, p.z);
    } else _m.makeScale(0, 0, 0);
    pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;

  // --- popup yazılar
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i]; p.t += dt;
    p.s.position.y = 3.0 + p.t * 2.2;
    p.s.material.opacity = clamp(1.6 - p.t * 1.5, 0, 1);
    if (p.t > 1.1) { scene.remove(p.s); disposeLabel(p.s); popups.splice(i, 1); }
  }

  // --- gölge flush
  sMesh.count = shN; sMesh.instanceMatrix.needsUpdate = true; shN = 0;

  // --- HUD
  if (state === 'playing') {
    const f = clamp(-pz / LEN, 0, 1);
    setBar(f, Math.floor(f * 100) + '%', false);
  }

  // --- bitiş
  if (state === 'win' || state === 'lose') {
    endTimer -= dt;
    if (endTimer <= 0 && !$('end').classList.contains('show')) showEnd();
  }
}

// ---------------------------------------------------------------- camera
const camPos = new THREE.Vector3(0, 6.5, 12), camLook = new THREE.Vector3(0, 1, -8);
let camInit = false;
function updateCamera(dt) {
  const extra = clamp(count / 60, 0, 1);
  const wide = camera.aspect < 0.8 ? 1.5 : 0;
  const tx = px * 0.5, ty = 5.4 + extra * 2.0 + wide * 0.8, tz = pz + 8.2 + extra * 2.4 + wide * 1.2;
  const k = camInit ? 1 - Math.exp(-dt * 7) : 1; camInit = true;
  camPos.x = lerp(camPos.x, tx, k); camPos.y = lerp(camPos.y, ty, k); camPos.z = lerp(camPos.z, tz, k);
  camLook.x = lerp(camLook.x, px * 0.4, k); camLook.y = 0.6; camLook.z = lerp(camLook.z, pz - 7, k);
  camera.position.copy(camPos);
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake * 0.7;
    shake = Math.max(0, shake - dt * 1.6);
  }
  camera.lookAt(camLook);
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden) return;
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; }
  if (state === 'title') { tGame += dt; }
  updateCamera(dt);
  renderer.render(scene, camera);
}

// başlangıçta (title) sahneyi göster
loadLevel(level);
state = 'title';
requestAnimationFrame(frame);

// ---------------------------------------------------------------- debug / test API
window.__game = {
  get s() { return { state, level, pz, px, count, weapon, LEN, bossHp: boss ? boss.hp : 0, bossMax: boss ? boss.max : 0, bossZ: boss ? boss.z : 0 }; },
  view() {
    return {
      state, pz, px, count, weapon, LEN,
      gates: gates.filter((g) => !g.done).map((g) => ({ z: g.z, l: g.v[0], r: g.v[1] })),
      enemies: enemies.filter((e) => e.alive && e.active).map((e) => ({ x: e.x, z: e.z })),
      crates: crates.filter((c) => !c.dead).map((c) => ({ x: c.x, z: c.z, hp: c.hp })),
      boss: boss && boss.alive ? { x: boss.x, z: boss.z, hp: boss.hp } : null,
    };
  },
  setTarget(x) { targetX = x; },
  snapCam() { camInit = false; updateCamera(1 / 60); renderer.render(scene, camera); },
  step(n) { for (let i = 0; i < (n || 1); i++) update(STEP); },
  start(n) { $('title').classList.remove('show'); $('hud').style.display = 'flex'; $('weapon').style.display = 'block'; loadLevel(n || level); },
  render() { updateCamera(1 / 60); renderer.render(scene, camera); },
  info: () => renderer.info.render,
};
})();
