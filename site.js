/* WaveShift marketing site. No trackers, no external requests. */

// ---- Set these before launch ----
const DOWNLOAD_URL = "";   // e.g. a GitHub Release link to the trial installer
const BUY_URL = "";        // e.g. the Lemon Squeezy checkout link
const BUY_HW_URL = "";     // Recorder box order link
const PRICE = 79;          // USD, one time
const HW_PRICE = 249;      // USD + shipping (placeholder)
// ---------------------------------

document.querySelectorAll("[data-price]").forEach(e => e.textContent = PRICE);
document.querySelectorAll("[data-hw-price]").forEach(e => e.textContent = HW_PRICE);

// A button with no link yet says "Coming soon" and does nothing.
function wire(selector, url, soonText) {
  document.querySelectorAll(selector).forEach(a => {
    if (url) { a.href = url; return; }
    a.textContent = soonText;
    a.classList.add("soon");
    a.setAttribute("aria-disabled", "true");
    a.removeAttribute("href");
  });
}
wire("[data-download]", DOWNLOAD_URL, "Trial coming soon");
wire("[data-buy]", BUY_URL, "Coming soon");
wire("[data-buy-hw]", BUY_HW_URL, "Coming soon");

// nav background after scrolling
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("solid", scrollY > 30);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

// highlight the tab for the section in view, like the app's tab bar
const links=[...document.querySelectorAll("#tabs a")];
const secs=links.map(a=>document.querySelector(a.getAttribute("href")));
const spy=()=>{let cur=-1;secs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<innerHeight*0.4)cur=i});links.forEach((a,i)=>a.classList.toggle("on",i===cur))};
addEventListener("scroll",spy,{passive:true});spy();

// reveal on scroll, with a small stagger inside grids
document.querySelectorAll(".steps,.bento,.gear-grid,.plans").forEach(g =>
  [...g.children].forEach((c, i) => c.style.setProperty("--d", (i * 0.08) + "s")));
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(e => io.observe(e));

// 3D tilt on the product shot
const tilt = document.getElementById("tilt");
if (tilt && matchMedia("(hover:hover)").matches) {
  const reset = () => tilt.style.transform = "perspective(1400px) rotateX(0) rotateY(0)";
  tilt.addEventListener("mousemove", e => {
    const r = tilt.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `perspective(1400px) rotateY(${x * 7}deg) rotateX(${-y * 5}deg)`;
  });
  tilt.addEventListener("mouseleave", reset);
}

// ---- hero: a scrolling set timeline, drawn live ----
(function () {
  const cv = document.getElementById("hero-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const cols = ["#19d3ff", "#ff2fa8", "#9a5cff", "#ff3d8b"];
  let W, H, dpr, t0 = performance.now();

  // deterministic pseudo-random so the waveforms don't change on resize
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // clips per deck: [start, length] in "beats" units, overlapping like real transitions
  const decks = [
    [[0, 15], [14, 12], [29, 16], [44, 14], [57, 18]],
    [[10, 14], [24, 17], [40, 13], [52, 16], [67, 14]],
    [[5, 12], [19, 14], [33, 12], [46, 15], [60, 16]],
    [[0, 10], [16, 15], [31, 15], [47, 12], [58, 17]],
  ];
  const total = 80;

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clip(x, y, w, h, col, seed) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
    ctx.fillStyle = col + "22"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8;
    const step = 3;
    for (let i = 0; i < w; i += step) {
      const k = (x + i) / step;
      const a = (0.25 + 0.75 * rnd(k * 0.37 + seed)) * (0.55 + 0.45 * Math.sin(k * 0.05 + seed));
      const bh = a * h * 0.82;
      ctx.fillRect(x + i, y + h / 2 - bh / 2, 2, bh);
    }
    ctx.restore();
    ctx.strokeStyle = col; ctx.globalAlpha = .6; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + .5, y + .5, w - 1, h - 1, 6); ctx.stroke(); ctx.globalAlpha = 1;
  }

  function frame(now) {
    const t = reduce ? 5 : (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    const pxPerBeat = Math.max(26, W / 38);
    const scroll = (t * 1.5) % total;          // beats scrolled
    const rows = 4, rowH = Math.min(78, H / 6), gap = rowH * 0.32;
    const top = H * 0.5 - (rows * (rowH + gap)) / 2 + 20;

    // grid lines
    ctx.strokeStyle = "rgba(120,140,220,.08)"; ctx.lineWidth = 1;
    for (let b = 0; b < W / pxPerBeat + 2; b++) {
      const x = b * pxPerBeat - ((scroll * pxPerBeat) % pxPerBeat);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    decks.forEach((cl, di) => {
      const y = top + di * (rowH + gap);
      cl.forEach(([s, l], ci) => {
        // loop the pattern so it never ends
        for (let rep = -1; rep <= 1; rep++) {
          const x = (s + rep * total - scroll) * pxPerBeat + W * 0.15;
          const w = l * pxPerBeat;
          if (x > W || x + w < 0) continue;
          clip(x, y, w, rowH, cols[di], di * 17 + ci * 5 + rep);
          // crossfade ramp into the next clip on the same deck
          ctx.strokeStyle = cols[di]; ctx.lineWidth = 1.5; ctx.globalAlpha = .8;
          ctx.beginPath(); ctx.moveTo(x, y + rowH - 4); ctx.lineTo(x + Math.min(w, 3 * pxPerBeat), y + 6); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });
    });

    // playhead
    const px = W * 0.15 + 8 * pxPerBeat;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,47,168,0)"); g.addColorStop(.5, "rgba(255,47,168,.95)"); g.addColorStop(1, "rgba(255,47,168,0)");
    ctx.fillStyle = g; ctx.shadowColor = "#ff2fa8"; ctx.shadowBlur = 18;
    ctx.fillRect(px - 1, 0, 2, H); ctx.shadowBlur = 0;

    if (!reduce) requestAnimationFrame(frame);
  }

  size(); addEventListener("resize", () => { size(); if (reduce) frame(0); });
  requestAnimationFrame(frame);
})();
