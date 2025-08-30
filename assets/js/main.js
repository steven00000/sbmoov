// ===== ACTUALITÉS (JSON -> cartes "helloasso") =====
(async function renderActus(){
  const wrap = document.getElementById('actus-list');
  if (!wrap) return; // la section n'existe pas dans le DOM

  // helper sécurité
  const esc = (s='') => String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');

  const cardActu = (it) => {
    const title   = esc(it.title || 'Actualité');
    const intro   = esc(it.intro || '');
    const outro   = esc(it.outro || '');
    const bullets = Array.isArray(it.bullets) ? it.bullets.map(esc) : [];
    const dateObj = it.date ? new Date(it.date) : null;
    const dateStr = dateObj && !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'}) : '';
    const link    = it.link && it.link.url ? `
      <p><a class="link-helloasso" href="${esc(it.link.url)}" target="_blank" rel="noopener">
        ${esc(it.link.label || 'En savoir plus')}
      </a></p>` : '';

    return `
      <article class="helloasso" id="${esc(it.id || '')}">
        <h3>${title}${dateStr ? `<span class="actu-date">— ${dateStr}</span>` : ''}</h3>
        ${intro ? `<p>${intro}</p>` : ''}
        ${bullets.length ? `<ul class="helloasso__notes">${bullets.map(li => `<li>${li}</li>`).join('')}</ul>` : ''}
        ${outro ? `<p>${outro}</p>` : ''}
        ${link}
      </article>`;
  };

  try {
    const res = await fetch('assets/data/actus.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Le JSON peut être sous {items: [...] } ou directement [...]
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];

    if (!arr.length) {
      wrap.innerHTML = `
        <article class="helloasso">
          <h3>📰 Actualités</h3>
          <p class="muted">Aucune actualité pour le moment.</p>
        </article>`;
      console.warn('[actus] JSON chargé mais liste vide ou mauvais format.', raw);
      return;
    }

    // tri robuste (dates invalides envoyées en fin)
    const items = arr.slice().sort((a,b) => {
      const da = new Date(a.date || 0), db = new Date(b.date || 0);
      const va = isNaN(da) ? -Infinity : da.getTime();
      const vb = isNaN(db) ? -Infinity : db.getTime();
      return vb - va;
    }).slice(0,5);

    wrap.innerHTML = items.map(cardActu).join('');

  } catch (err) {
    console.error('[actus] Échec chargement JSON :', err);
    wrap.innerHTML = `
      <article class="helloasso">
        <h3>📰 Actualités</h3>
        <p class="muted">Impossible de charger les actualités pour le moment.</p>
      </article>`;
  }
})();


// ===== CARROUSEL — JSON unique + contrôles =====
(async function initCarousel(){
  const root  = document.getElementById('galaCarousel');
  if (!root) return;

  const track   = root.querySelector('.carousel-track');
  const btnNext = root.querySelector('.carousel-btn.next');
  const btnPrev = root.querySelector('.carousel-btn.prev');

  // 1) Charger le JSON (format: { images: [{src, alt}] })
  let images = [];
  try {
    const res = await fetch('assets/data/carousel.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    images = Array.isArray(data.images) ? data.images : [];
  } catch (e) {
    console.error('Carousel JSON load failed:', e);
  }

  if (!images.length) {
    track.innerHTML = `
      <div class="carousel-item" style="display:grid;place-items:center;color:#aaa">
        Aucune image pour le moment.
      </div>`;
    btnNext.disabled = btnPrev.disabled = true;
    return;
  }

  // 2) Construire les slides
  track.innerHTML = images.map((img, i) => {
    const alt = (img.alt || `Photo ${i+1}`).replace(/"/g,'&quot;');
    const loading  = i === 0 ? 'eager' : 'lazy';
    const decoding = i === 0 ? 'sync'  : 'async';
    return `
      <div class="carousel-item" aria-hidden="${i===0?'false':'true'}">
        <img src="${img.src}" alt="${alt}" loading="${loading}" decoding="${decoding}">
      </div>`;
  }).join('');

  // 3) Logique du slider
  const items = Array.from(track.children);
  const N = items.length;
  let index = 0;

  function goTo(i){
    index = (i + N) % N;
    track.style.transform = `translateX(-${index * 100}%)`;
    items.forEach((el, k) => el.setAttribute('aria-hidden', k === index ? 'false' : 'true'));
    track.setAttribute('aria-label', `Image ${index+1} sur ${N}`);
  }

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  btnNext?.addEventListener('click', next);
  btnPrev?.addEventListener('click', prev);

  // 4) Autoplay + pause sur survol/focus/onglet caché
  let timer = null;
  const SPEED = 7000;
  const start = () => { if (!timer) timer = setInterval(next, SPEED); };
  const stop  = () => { clearInterval(timer); timer = null; };

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  // 5) Clavier
  root.tabIndex = 0;
  root.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  // 6) Swipe (touch + souris)
  let startX = 0, dx = 0, swiping = false;
  const MIN = 50;

  const onStart = (e) => {
    swiping = true;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    dx = 0;
  };
  const onMove = (e) => {
    if (!swiping) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    dx = x - startX;
  };
  const onEnd = () => {
    if (!swiping) return;
    swiping = false;
    if (Math.abs(dx) > MIN) (dx < 0 ? next() : prev());
    startX = dx = 0;
  };

  track.addEventListener('touchstart', onStart, { passive:true });
  track.addEventListener('touchmove',  onMove,  { passive:true });
  track.addEventListener('touchend',   onEnd);
  track.addEventListener('mousedown',  onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onEnd);

  // Init
  goTo(0);
  start();
})();

// === Lightbox pour le carrousel ===
(async function initLightbox(){
  const lightbox = document.getElementById("lightbox");
  const imgMain = document.getElementById("lightbox-img");
  const thumbsWrap = document.getElementById("lightbox-thumbs");
  const btnClose = lightbox.querySelector(".lightbox-close");

  // Charge le JSON
  let slides = [];
  try {
    const res = await fetch("assets/data/carousel.json");
    const data = await res.json();
    slides = data.images || data.slides || [];
  } catch(e){ console.error("Lightbox JSON error", e); }

  if (!slides.length) return;

  // Génère les vignettes
  thumbsWrap.innerHTML = slides.map((s,i)=>`
    <img src="${s.src}" alt="thumb ${i+1}" data-index="${i}">
  `).join("");

  const thumbs = Array.from(thumbsWrap.querySelectorAll("img"));
  let current = 0;

  function show(i){
    current = (i + slides.length) % slides.length;
    imgMain.src = slides[current].src;
    thumbs.forEach(t => t.classList.remove("active"));
    thumbs[current].classList.add("active");
  }

  // Ouvrir la lightbox au clic sur le carrousel
  document.querySelectorAll(".carousel-item img").forEach((el,i)=>{
    el.addEventListener("click", ()=>{
      lightbox.setAttribute("aria-hidden","false");
      show(i);
    });
  });

  // Navigation via vignettes
  thumbs.forEach(t=>{
    t.addEventListener("click", ()=>{
      show(parseInt(t.dataset.index));
    });
  });

  // Fermer
  btnClose.addEventListener("click", ()=>{
    lightbox.setAttribute("aria-hidden","true");
  });

  // Flèches clavier
  window.addEventListener("keydown", e=>{
    if (lightbox.getAttribute("aria-hidden") === "true") return;
    if (e.key === "Escape") lightbox.setAttribute("aria-hidden","true");
    if (e.key === "ArrowRight") show(current+1);
    if (e.key === "ArrowLeft") show(current-1);
  });
})();
