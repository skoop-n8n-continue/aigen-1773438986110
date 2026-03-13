/* ============================================================
   QUALITY ROOTS — DEALS DROP — animation.js
   Creative concept: "THE VAULT DROP"
   Each product gets a cinematic solo spotlight:
     1. Wipe in → grid activates
     2. Product image drops from above with shockwave impact
     3. Info slides in from left
     4. Sale badge SPINS in
     5. Original price + strike-through
     6. Sale price EXPLODES in with particles
     7. Living moment — gentle float + pulsing badge
     8. Wipe out → next product
   ============================================================ */

gsap.registerPlugin(SplitText, CustomEase, DrawSVGPlugin, MorphSVGPlugin);

/* ─── CUSTOM EASES ──────────────────────────────────────── */
CustomEase.create('impactBounce',  'M0,0 C0.2,0 0.3,1.4 0.5,1.1 0.7,0.85 1,1 1,1');
CustomEase.create('slamIn',       'M0,0 C0.1,0 0.1,1 0.3,1 0.5,1 1,1 1,1');
CustomEase.create('popOut',       'M0,0 C0.4,0 0.6,1.3 0.75,1.1 0.9,0.9 1,1 1,1');
CustomEase.create('smoothExit',   'M0,0 C0.4,0 0.6,0 1,1 1,1 1,1 1,1');

/* ─── CONFIG ────────────────────────────────────────────── */
const PRODUCTS_PER_CYCLE = 1;   // Solo spotlight — each product owns the stage
const CYCLE_DURATION     = 9;   // seconds total per product

let PRODUCTS     = [];
let currentBatch = 0;
let tickerTween  = null;
let bgAnimFrame  = null;

/* ─── BACKGROUND CANVAS ─────────────────────────────────── */
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = 1920;
  canvas.height = 1080;

  // Animated diagonal stripes + noise
  let t = 0;

  function drawBg() {
    ctx.clearRect(0, 0, 1920, 1080);

    // Base gradient
    const grad = ctx.createRadialGradient(960, 540, 0, 960, 540, 900);
    grad.addColorStop(0,   '#1D3C2A');
    grad.addColorStop(0.5, '#142A1D');
    grad.addColorStop(1,   '#070F09');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Animated diagonal accent bands
    const bandAlpha = 0.04 + Math.sin(t * 0.3) * 0.015;
    ctx.save();
    ctx.strokeStyle = `rgba(123,194,64,${bandAlpha})`;
    ctx.lineWidth = 80;
    for (let x = -400; x < 2400; x += 220) {
      const offset = Math.sin(t * 0.15 + x * 0.003) * 12;
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + 350 + offset, 1080);
      ctx.stroke();
    }
    ctx.restore();

    // Central glow pulse
    const glowPulse = 0.08 + Math.sin(t * 0.5) * 0.04;
    const glow = ctx.createRadialGradient(960, 580, 0, 960, 580, 520);
    glow.addColorStop(0,   `rgba(29,60,42,${glowPulse * 3})`);
    glow.addColorStop(0.4, `rgba(18,40,26,${glowPulse})`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1920, 1080);

    // Subtle noise texture via tiny random dots
    ctx.fillStyle = 'rgba(255,255,255,0.012)';
    for (let i = 0; i < 300; i++) {
      const px = Math.random() * 1920;
      const py = Math.random() * 1080;
      ctx.fillRect(px, py, 1, 1);
    }

    t += 0.8;
    bgAnimFrame = requestAnimationFrame(drawBg);
  }

  drawBg();
}

/* ─── PARTICLE SYSTEM ───────────────────────────────────── */
const pCanvas    = document.getElementById('particle-canvas');
const pCtx       = pCanvas.getContext('2d');
pCanvas.width    = 1920;
pCanvas.height   = 1080;
const particles  = [];
let pAnimFrame   = null;

class Particle {
  constructor(x, y, burst) {
    this.x    = x;
    this.y    = y;
    this.vx   = (Math.random() - 0.5) * (burst ? 18 : 4);
    this.vy   = (Math.random() - 0.8) * (burst ? 16 : 8);
    this.size = Math.random() * (burst ? 10 : 4) + 2;
    this.life = 1;
    this.decay = 0.012 + Math.random() * 0.02;
    this.color = Math.random() > 0.5 ? '#7BC240' : '#B0DC80';
    this.shape = Math.random() > 0.6 ? 'rect' : 'circle';
    this.rot   = Math.random() * Math.PI * 2;
    this.rotV  = (Math.random() - 0.5) * 0.15;
  }
  update() {
    this.x   += this.vx;
    this.y   += this.vy;
    this.vy  += 0.25;   // gravity
    this.vx  *= 0.97;
    this.life -= this.decay;
    this.rot  += this.rotV;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle   = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size * 0.5);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function spawnBurst(x, y, count) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, true));
}

function spawnAmbient() {
  // Rising leaf particles along edges
  const side  = Math.random() > 0.5 ? 0.1 : 0.9;
  const px    = side * 1920 + (Math.random() - 0.5) * 200;
  const py    = 1000 + Math.random() * 100;
  const p     = new Particle(px, py, false);
  p.vy        = -(Math.random() * 2 + 1);
  p.vx        = (Math.random() - 0.5) * 1.5;
  p.decay     = 0.004;
  p.size      = Math.random() * 5 + 2;
  p.color     = `rgba(123,194,64,${0.4 + Math.random() * 0.4})`;
  particles.push(p);
}

function animateParticles() {
  pCtx.clearRect(0, 0, 1920, 1080);
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw(pCtx);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  pAnimFrame = requestAnimationFrame(animateParticles);
}

// Ambient particle spawner
setInterval(() => {
  if (PRODUCTS.length > 0) spawnAmbient();
}, 300);

/* ─── WIPE PANELS ───────────────────────────────────────── */
function buildWipePanels() {
  const scene = document.getElementById('scene');
  ['wipe-left', 'wipe-right'].forEach(id => {
    if (!document.getElementById(id)) {
      const d = document.createElement('div');
      d.id = id;
      d.className = 'wipe-panel';
      scene.appendChild(d);
    }
  });
}

/* ─── PRODUCT RENDERING ─────────────────────────────────── */
function renderBatch(products) {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  products.forEach((product, index) => {
    const tpl = document.getElementById('product-tpl');
    const clone = tpl.content.cloneNode(true);
    const el = clone.querySelector('.product');

    // Populate data
    const origPrice    = parseFloat(product.price.replace('$','')) || 0;
    const salePrice    = parseFloat(product.discounted_price)       || 0;
    const savings      = origPrice - salePrice;
    const pct          = Math.round((savings / origPrice) * 100);

    el.querySelector('.cat-label').textContent     = (product.category || 'CANNABIS').toUpperCase();
    el.querySelector('.cat-icon').textContent      = getCatIcon(product.category);
    el.querySelector('.prod-brand').textContent    = (product.brand || '').toUpperCase();
    el.querySelector('.prod-name').textContent     = product.name || product.online_title || '';
    el.querySelector('.prod-meta').textContent     = product.meta || '';
    el.querySelector('.strain-label').textContent  = (product.strain || 'Hybrid').toUpperCase();
    el.querySelector('.prod-image').src            = product.image_url || '';
    el.querySelector('.prod-image').alt            = product.name || '';
    el.querySelector('.sale-pct').textContent      = `${pct}%`;
    el.querySelector('.price-orig-val').textContent= `$${origPrice.toFixed(2)}`;
    el.querySelector('.price-sale').textContent    = `$${salePrice.toFixed(2)}`;
    el.querySelector('.savings-amt').textContent   = `$${savings.toFixed(2)}`;

    // Strain badge color
    const strainBadge = el.querySelector('.prod-strain-badge');
    const strain      = (product.strain || '').toLowerCase();
    if (strain.includes('indica')) {
      strainBadge.style.borderColor = '#9B59B6';
      strainBadge.querySelector('.strain-label').style.color = '#C39BD3';
    } else if (strain.includes('sativa')) {
      strainBadge.style.borderColor = '#E67E22';
      strainBadge.querySelector('.strain-label').style.color = '#F0A25A';
    }

    container.appendChild(clone);
  });
}

function getCatIcon(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('gumm'))   return '🍬';
  if (c.includes('flower')) return '🌿';
  if (c.includes('vape'))   return '💨';
  if (c.includes('cart'))   return '💨';
  if (c.includes('edible')) return '🍫';
  if (c.includes('tincture'))return '🧪';
  return '🌱';
}

/* ─── SHOCKWAVE ANIMATION ───────────────────────────────── */
function playShockwave() {
  const cx  = 960;
  const cy  = 560;   // approximate product center
  const tl  = gsap.timeline();

  ['#shockwave-1','#shockwave-2','#shockwave-3'].forEach((id, i) => {
    tl.fromTo(id,
      { attr: { cx, cy, r: 5 }, opacity: 0.9 },
      { attr: { r: 280 + i * 80 }, opacity: 0, duration: 0.8 + i * 0.15, ease: 'power2.out' },
      i * 0.12
    );
  });

  return tl;
}

/* ─── MAIN CYCLE ANIMATION ──────────────────────────────── */
function getBatch(batchIndex) {
  const start = (batchIndex * PRODUCTS_PER_CYCLE) % Math.max(PRODUCTS.length, 1);
  const batch = [];
  for (let i = 0; i < PRODUCTS_PER_CYCLE; i++) {
    if (PRODUCTS.length > 0) batch.push(PRODUCTS[(start + i) % PRODUCTS.length]);
  }
  return batch;
}

function animateCycle(batchIndex) {
  const batch   = getBatch(batchIndex);
  renderBatch(batch);

  const product = document.querySelector('.product');
  if (!product) { animateCycle(batchIndex + 1); return; }

  const imageWrap     = product.querySelector('.prod-image-wrap');
  const catBadge      = product.querySelector('.prod-category-badge');
  const brand         = product.querySelector('.prod-brand');
  const name          = product.querySelector('.prod-name');
  const meta          = product.querySelector('.prod-meta');
  const strainBadge   = product.querySelector('.prod-strain-badge');
  const saleTagWrap   = product.querySelector('.sale-tag-wrap');
  const priceBlock    = product.querySelector('.price-block');
  const strikeEl      = product.querySelector('.strike-line');
  const priceSale     = product.querySelector('.price-sale');
  const savingsBanner = product.querySelector('.savings-banner');
  const spotlight     = document.getElementById('bg-spotlight');

  // Pull origPrice/salePrice for spawn burst position
  const centerX = 960;
  const centerY = 540;

  /* ══════════════════════════════════════════════════════
     MASTER TIMELINE
     ══════════════════════════════════════════════════════ */
  const master = gsap.timeline({
    onComplete: () => {
      animateCycle(batchIndex + 1);
    }
  });

  /* ── Phase 0: WIPE IN (0–0.6s) ── */
  buildWipePanels();
  master.fromTo(['#wipe-left','#wipe-right'],
    { width: '50%' },
    { width: '0%', duration: 0.55, ease: 'power3.inOut', stagger: 0 },
    0
  );

  /* ── Phase 0b: SCENE ELEMENTS REVEAL ── */
  master.to('#brand-header',       { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.1);
  master.to('#ticker-strip',       { y: 0, duration: 0.5, ease: 'back.out(1.2)' }, 0.15);
  master.to('#bg-spotlight',       { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.2);
  master.to(['#corner-tl','#corner-tr','#corner-bl','#corner-br'],
    { opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, 0.3
  );
  master.to('#slash-deco',         { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.4);
  master.to(['#leaf-deco-l','#leaf-deco-r'],
    { opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, 0.3
  );
  master.fromTo('#h-line-top',
    { attr: { x1: 960, x2: 960 } },
    { attr: { x1: 0, x2: 1920 }, duration: 0.7, ease: 'power3.inOut' }, 0.4
  );
  master.fromTo('#h-line-bot',
    { attr: { x1: 960, x2: 960 } },
    { attr: { x1: 0, x2: 1920 }, duration: 0.7, ease: 'power3.inOut' }, 0.5
  );

  /* ── Phase 1: PRODUCT IMAGE DROP (0.5–1.2s) ── */
  master.to(imageWrap,
    { opacity: 1, y: 0, duration: 0.55, ease: 'impactBounce' }, 0.55
  );

  // Flash on impact
  master.to('#flash-overlay',
    { opacity: 0.18, duration: 0.06, yoyo: true, repeat: 1 }, 1.0
  );

  // Shockwave
  master.add(playShockwave(), 1.0);

  /* ── Phase 2: LEFT INFO SLIDES IN (1.1–2.0s) ── */
  master.to(catBadge,
    { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }, 1.15
  );
  master.to(brand,
    { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, 1.3
  );
  master.to(name,
    { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }, 1.45
  );
  master.to(meta,
    { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, 1.6
  );
  master.to(strainBadge,
    { opacity: 1, x: 0, duration: 0.4, ease: 'back.out(1.5)' }, 1.75
  );

  /* ── Phase 3: SALE BADGE SPIN IN (1.5–2.1s) ── */
  master.to(saleTagWrap,
    { opacity: 1, scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2)' }, 1.5
  );

  /* ── Phase 4: PRICE REVEAL (2.0–3.0s) ── */
  master.to(priceBlock,
    { opacity: 1, duration: 0.4, ease: 'power2.out' }, 2.0
  );
  master.to(strikeEl,
    { scaleX: 1, duration: 0.4, ease: 'power3.inOut' }, 2.3
  );

  /* Sale price EXPLODES in with particle burst */
  master.to(priceSale,
    { scale: 1, duration: 0.45, ease: 'popOut' }, 2.65
  );
  master.add(() => {
    const rect = priceSale.getBoundingClientRect();
    spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 60);
  }, 2.65);

  /* Flash on price reveal */
  master.to('#flash-overlay',
    { opacity: 0.1, duration: 0.05, yoyo: true, repeat: 1 }, 2.65
  );

  master.to(savingsBanner,
    { opacity: 1, x: 0, duration: 0.4, ease: 'back.out(1.7)' }, 3.0
  );

  /* ── Phase 5: LIVING MOMENT (3.2–6.5s) ── */
  // Gentle product float
  master.to(imageWrap,
    { y: -18, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 3.2
  );
  // Badge pulse
  master.to(saleTagWrap,
    { scale: 1.08, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 3.4
  );
  // Leaf decorations gentle rotation
  master.to(['#leaf-deco-l','#leaf-deco-r'],
    { rotation: 8, duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: 1, transformOrigin: '50% 100%' }, 3.5
  );
  // Price sale glow pulse
  master.to(priceSale,
    { textShadow: '0 0 60px rgba(123,194,64,0.9), 0 0 120px rgba(123,194,64,0.4)', duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 3.5
  );

  /* ── Phase 6: EXIT (7.5–9.0s) ── */
  master.to([imageWrap, name, brand, catBadge, meta, strainBadge],
    { x: -80, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.in' }, 7.5
  );
  master.to([saleTagWrap, priceBlock, savingsBanner],
    { x: 80, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power3.in' }, 7.55
  );
  master.to(['#h-line-top','#h-line-bot'],
    { opacity: 0, duration: 0.3 }, 7.8
  );
  master.to(['#leaf-deco-l','#leaf-deco-r','#slash-deco'],
    { opacity: 0, duration: 0.3 }, 7.8
  );
  master.to('#bg-spotlight',
    { opacity: 0, duration: 0.4 }, 7.8
  );
  master.to(['#corner-tl','#corner-tr','#corner-bl','#corner-br'],
    { opacity: 0, duration: 0.3 }, 7.9
  );

  // Wipe out
  master.fromTo(['#wipe-left','#wipe-right'],
    { width: '0%' },
    { width: '50%', duration: 0.45, ease: 'power3.inOut' }, 8.3
  );
  master.to('#ticker-strip',
    { y: '100%', duration: 0.35, ease: 'power2.in' }, 8.3
  );
  master.to('#brand-header',
    { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' }, 8.3
  );

  // Reset for next cycle
  master.add(() => {
    gsap.set('#bg-spotlight', { opacity: 0 });
    gsap.set('#brand-header', { opacity: 0, y: 0 });
    gsap.set('#ticker-strip', { y: '100%' });
    gsap.set(['#corner-tl','#corner-tr','#corner-bl','#corner-br'], { opacity: 0 });
    gsap.set(['#leaf-deco-l','#leaf-deco-r'], { opacity: 0, rotation: 0 });
    gsap.set('#slash-deco', { opacity: 0 });
    gsap.set('#h-line-top', { attr: { x1: 960, x2: 960 } });
    gsap.set('#h-line-bot', { attr: { x1: 960, x2: 960 } });
  }, 8.75);
}

/* ─── TICKER ANIMATION ──────────────────────────────────── */
function startTicker() {
  const content = document.getElementById('ticker-content');
  if (tickerTween) tickerTween.kill();
  // Simple infinite scroll: move full content width to the left, then reset
  const totalW = content.scrollWidth;
  gsap.set(content, { x: 0 });
  tickerTween = gsap.to(content, {
    x: -(totalW / 2),
    duration: 28,
    ease: 'none',
    repeat: -1
  });
}

/* ─── LOAD & START ──────────────────────────────────────── */
async function loadProducts() {
  try {
    const response = await fetch('./products.json', { cache: 'no-store' });
    const data     = await response.json();
    PRODUCTS = data.products || [];
  } catch (err) {
    console.error('Failed to load products.json:', err);
    PRODUCTS = [];
  }

  initBackgroundCanvas();
  animateParticles();
  startTicker();
  animateCycle(0);
}

window.addEventListener('DOMContentLoaded', loadProducts);
