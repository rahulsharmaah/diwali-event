import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSmall = window.innerWidth < 700;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const skyColor = new THREE.Color("#1a0d10");
scene.background = skyColor;
scene.fog = new THREE.FogExp2(skyColor, 0.028);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 3.2, 11);

// Light
scene.add(new THREE.HemisphereLight("#6b4a6e", "#1a0f08", 0.55));
const moon = new THREE.DirectionalLight("#9fb4ff", 0.35);
moon.position.set(-8, 14, -6);
scene.add(moon);
const fireLight = new THREE.PointLight("#ff8a2a", 40, 26, 1.6);
fireLight.position.set(0, 1.4, 0);
scene.add(fireLight);

// Helpers
const rand = (a, b) => a + Math.random() * (b - a);
function jitter(geo, amt) {
  const p = geo.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let off = seen.get(key);
    if (!off) { off = [rand(-amt, amt), rand(-amt, amt), rand(-amt, amt)]; seen.set(key, off); }
    p.setXYZ(i, p.getX(i) + off[0], p.getY(i) + off[1], p.getZ(i) + off[2]);
  }
  geo.computeVertexNormals();
  return geo;
}
const stoneMat = new THREE.MeshStandardMaterial({ color: "#6b5444", roughness: 0.95, flatShading: true });
const darkStone = new THREE.MeshStandardMaterial({ color: "#3d2e25", roughness: 1, flatShading: true });

// Ground: low-poly rolling earth
const groundGeo = new THREE.PlaneGeometry(120, 120, 60, 60);
groundGeo.rotateX(-Math.PI / 2);
{
  const p = groundGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.hypot(x, z);
    const h = Math.sin(x * 0.18) * Math.cos(z * 0.15) * 0.6 + (d > 14 ? (d - 14) * 0.08 : 0) + rand(-0.12, 0.12);
    p.setY(i, d < 4 ? 0 : h);
  }
  groundGeo.computeVertexNormals();
}
scene.add(new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: "#3b2717", roughness: 1, flatShading: true })));

// Distant mountains + a smoking volcano
const mtnMat = new THREE.MeshStandardMaterial({ color: "#2a1a1e", roughness: 1, flatShading: true });
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2 + rand(-0.1, 0.1);
  const r = rand(48, 62);
  const h = rand(8, 18);
  const m = new THREE.Mesh(jitter(new THREE.ConeGeometry(rand(8, 14), h, 6, 2), 0.8), mtnMat);
  m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
  scene.add(m);
}
const volcano = new THREE.Mesh(jitter(new THREE.CylinderGeometry(2.5, 13, 20, 8, 3), 0.7), mtnMat);
volcano.position.set(-18, 9, -48);
scene.add(volcano);
const lava = new THREE.Mesh(new THREE.CircleGeometry(2.4, 8), new THREE.MeshBasicMaterial({ color: "#ff5a1a" }));
lava.rotation.x = -Math.PI / 2;
lava.position.set(-18, 19.05, -48);
scene.add(lava);
const lavaGlow = new THREE.PointLight("#ff4a10", 60, 30, 1.5);
lavaGlow.position.set(-18, 21, -48);
scene.add(lavaGlow);

// Stone circle (monoliths with lintels)
const ring = new THREE.Group();
const ringR = 15;
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2;
  const h = rand(3.6, 4.6);
  const pillar = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.4, h, 0.9, 2, 3, 1), 0.08), stoneMat);
  pillar.position.set(Math.sin(a) * ringR, h / 2, -Math.cos(a) * ringR);
  pillar.rotation.y = -a + rand(-0.1, 0.1);
  pillar.rotation.z = rand(-0.05, 0.05);
  ring.add(pillar);
  if (i % 2 === 0) {
    const a2 = a + Math.PI / 10;
    const lintel = new THREE.Mesh(jitter(new THREE.BoxGeometry(2 * ringR * Math.sin(Math.PI / 10) + 1.2, 0.6, 0.9, 4, 1, 1), 0.06), darkStone);
    lintel.position.set(Math.sin(a2) * ringR * Math.cos(Math.PI / 10), 4.5, -Math.cos(a2) * ringR * Math.cos(Math.PI / 10));
    lintel.rotation.y = -a2;
    ring.add(lintel);
  }
}
scene.add(ring);

// Scattered boulders
for (let i = 0; i < 26; i++) {
  const a = rand(0, Math.PI * 2);
  const r = i % 2 ? rand(4.5, 7) : rand(17, 32); // keep the camera path (r≈9–13) clear
  const s = rand(0.3, 1.4);
  const rock = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(s, 0), s * 0.25), i % 3 ? stoneMat : darkStone);
  rock.position.set(Math.cos(a) * r, s * 0.4, Math.sin(a) * r);
  rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
  scene.add(rock);
}

// Campfire: logs + stacked flame cones
const fire = new THREE.Group();
const logMat = new THREE.MeshStandardMaterial({ color: "#4a2a16", roughness: 1, flatShading: true });
for (let i = 0; i < 5; i++) {
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 6), logMat);
  log.rotation.z = Math.PI / 2.6;
  log.rotation.y = (i / 5) * Math.PI * 2;
  log.position.y = 0.3;
  fire.add(log);
}
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  const st = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(0.22, 0), 0.04), darkStone);
  st.position.set(Math.cos(a) * 0.95, 0.1, Math.sin(a) * 0.95);
  fire.add(st);
}
const flames = [];
const flameCols = ["#ff3d0d", "#ff7a1a", "#ffc35a"];
flameCols.forEach((c, i) => {
  const f = new THREE.Mesh(
    new THREE.ConeGeometry(0.55 - i * 0.14, 1.6 - i * 0.3, 7, 1, true),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 - i * 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  f.position.y = 0.95 - i * 0.1;
  fire.add(f);
  flames.push(f);
});
scene.add(fire);

// Clay diyas around the fire
const diyaMat = new THREE.MeshStandardMaterial({ color: "#a0512a", roughness: 0.8, flatShading: true });
const diyaFlameGeo = new THREE.SphereGeometry(0.07, 8, 6);
diyaFlameGeo.scale(1, 1.9, 1);
const diyaFlames = [];
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2;
  const r = 3.1 + (i % 2) * 0.5;
  const d = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), diyaMat);
  bowl.scale.y = 0.6;
  bowl.position.y = 0.12;
  d.add(bowl);
  const fl = new THREE.Mesh(diyaFlameGeo, new THREE.MeshBasicMaterial({ color: "#ffb347", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  fl.position.y = 0.28;
  fl.userData.phase = rand(0, 10);
  d.add(fl);
  diyaFlames.push(fl);
  d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  scene.add(d);
}

// Soft glow sprite texture (shared by embers, stars, halos)
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,220,160,0.8)");
  grd.addColorStop(1, "rgba(255,120,40,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glow = glowTexture();

const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: "#ff8a2a", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
halo.scale.set(5, 5, 1);
halo.position.y = 1.1;
scene.add(halo);

// Rising embers
const EMBERS = isSmall ? 160 : 320;
const emberPos = new Float32Array(EMBERS * 3);
const emberVel = new Float32Array(EMBERS * 3);
function resetEmber(i, initial) {
  emberPos[i * 3] = rand(-0.5, 0.5);
  emberPos[i * 3 + 1] = initial ? rand(0.5, 9) : rand(0.5, 1.2);
  emberPos[i * 3 + 2] = rand(-0.5, 0.5);
  emberVel[i * 3] = rand(-0.25, 0.25);
  emberVel[i * 3 + 1] = rand(0.8, 2.0);
  emberVel[i * 3 + 2] = rand(-0.25, 0.25);
}
for (let i = 0; i < EMBERS; i++) resetEmber(i, true);
const emberGeo = new THREE.BufferGeometry();
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ map: glow, color: "#ffab4a", size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(embers);

// Stars
const STARS = 900;
const starPos = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) {
  const th = rand(0, Math.PI * 2);
  const ph = rand(0.05, Math.PI / 2.2);
  const r = 90;
  starPos[i * 3] = Math.cos(th) * Math.cos(ph) * r;
  starPos[i * 3 + 1] = Math.sin(ph) * r;
  starPos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ map: glow, color: "#ffe9c9", size: 0.9, transparent: true, depthWrite: false, fog: false }));
scene.add(stars);

// Interaction: smooth parallax from pointer + scroll
const target = { x: 0, y: 0 };
const cur = { x: 0, y: 0, s: 0 };
window.addEventListener("pointermove", (e) => {
  target.x = (e.clientX / window.innerWidth - 0.5) * 2;
  target.y = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

const clock = new THREE.Clock();
const speed = reduceMotion ? 0.25 : 1;
let running = true;
document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
  if (running) { clock.getDelta(); requestAnimationFrame(tick); }
});

function tick() {
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 0.05) * speed;
  const t = clock.elapsedTime * speed;

  // Ease camera toward pointer + scroll offsets
  const scrollT = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.5);
  cur.x += (target.x - cur.x) * 0.04;
  cur.y += (target.y - cur.y) * 0.04;
  cur.s += (scrollT - cur.s) * 0.06;
  const orbit = t * 0.05;
  const radius = 11 - cur.s * 2.2;
  camera.position.x = Math.sin(orbit + cur.x * 0.25) * radius;
  camera.position.z = Math.cos(orbit + cur.x * 0.25) * radius;
  camera.position.y = 3.2 - cur.y * 0.6 + cur.s * 1.6;
  camera.lookAt(0, 1.4 + cur.s * 0.8, 0);

  // Fire flicker
  const flick = Math.sin(t * 11) * 0.5 + Math.sin(t * 17.3) * 0.3 + Math.sin(t * 5.1) * 0.2;
  fireLight.intensity = 40 + flick * 9;
  halo.material.opacity = 0.5 + flick * 0.08;
  flames.forEach((f, i) => {
    f.scale.set(1 + Math.sin(t * (9 + i * 3)) * 0.07, 1 + Math.sin(t * (7 + i * 4) + i) * 0.14, 1 + Math.cos(t * (8 + i * 2)) * 0.07);
    f.rotation.y = t * (0.8 + i * 0.5);
  });
  diyaFlames.forEach((f) => {
    const p = f.userData.phase;
    f.scale.y = 1 + Math.sin(t * 9 + p) * 0.18;
    f.position.x = Math.sin(t * 6 + p) * 0.012;
  });
  lavaGlow.intensity = 55 + Math.sin(t * 1.3) * 10;

  // Embers drift upward with a little wind
  for (let i = 0; i < EMBERS; i++) {
    const k = i * 3;
    emberPos[k] += (emberVel[k] + Math.sin(t + i) * 0.15) * dt;
    emberPos[k + 1] += emberVel[k + 1] * dt;
    emberPos[k + 2] += emberVel[k + 2] * dt;
    if (emberPos[k + 1] > 10) resetEmber(i, false);
  }
  emberGeo.attributes.position.needsUpdate = true;
  stars.rotation.y = t * 0.004;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
