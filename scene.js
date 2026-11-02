// Light background effects: rising embers on a 2D canvas, a gentle hero
// parallax, and fade-up reveals. Kept cheap so scrolling stays smooth on phones.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Reveal on scroll ------------------------------------------------------
const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" })
  : null;
document.querySelectorAll(".reveal").forEach((el) => (io && !reduceMotion ? io.observe(el) : el.classList.add("in")));

// --- Hero parallax (transform only, one rAF per scroll) ----------------------
const heroImg = document.getElementById("heroImg");
const heroCopy = document.querySelector(".hero-copy");
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = Math.min(window.scrollY, window.innerHeight * 1.2);
    heroImg.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(${1.04 + y * 0.00008})`;
    heroCopy.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.7)));
    ticking = false;
  });
}
if (!reduceMotion) window.addEventListener("scroll", onScroll, { passive: true });

// --- Embers ----------------------------------------------------------------
const canvas = document.getElementById("sparks");
const ctx = canvas.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0, lastW = 0;
const count = reduceMotion ? 0 : window.innerWidth < 700 ? 34 : 60;
const sparks = [];

function size() {
  if (window.innerWidth === lastW && H) return; // ignore phone address-bar height changes
  lastW = window.innerWidth;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
size();
window.addEventListener("resize", size);

const rand = (a, b) => a + Math.random() * (b - a);
function spawn(s, initial) {
  s.x = rand(0, W);
  s.y = initial ? rand(0, H) : H + rand(10, 60);
  s.r = rand(0.8, 2.4);
  s.vy = rand(14, 38);
  s.sway = rand(10, 28);
  s.phase = rand(0, Math.PI * 2);
  s.hue = rand(28, 48);
  s.life = rand(0.55, 1);
  return s;
}
for (let i = 0; i < count; i++) sparks.push(spawn({}, true));

// Pre-rendered glow sprite: drawing an image is far cheaper than shadowBlur.
const sprite = document.createElement("canvas");
sprite.width = sprite.height = 32;
{
  const g = sprite.getContext("2d");
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, "rgba(255,240,200,1)");
  grd.addColorStop(0.3, "rgba(255,180,80,0.7)");
  grd.addColorStop(1, "rgba(255,120,30,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
}

let last = performance.now();
let running = count > 0;
function tick(now) {
  if (!running) return;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  for (const s of sparks) {
    s.y -= s.vy * dt;
    s.phase += dt;
    const x = s.x + Math.sin(s.phase) * s.sway;
    if (s.y < -20) spawn(s, false);
    const fade = Math.min(1, (H - s.y) / (H * 0.25)) * Math.min(1, s.y / (H * 0.3));
    ctx.globalAlpha = Math.max(0, fade) * s.life;
    const d = s.r * 7;
    ctx.drawImage(sprite, x - d / 2, s.y - d / 2, d, d);
  }
  requestAnimationFrame(tick);
}
if (running) requestAnimationFrame(tick);

document.addEventListener("visibilitychange", () => {
  running = !document.hidden && count > 0;
  if (running) {
    last = performance.now();
    requestAnimationFrame(tick);
  }
});
