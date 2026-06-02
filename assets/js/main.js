// ===== ANNÉE FOOTER =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


// ===== SCROLL FADE-IN =====
(function initFadeIn(){
  const els = document.querySelectorAll(
    '.section__head h2, .price, .helloasso, .contact-card'
  );
  els.forEach(el => el.classList.add('fade-in'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => io.observe(el));
})();


// ===== ACTUALITÉS (JSON -> cartes) =====
(async function renderActus(){
  const wrap = document.getElementById('actus-list');
  if (!wrap) return;

  const esc = (s='') => String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');

  const md = (s='') => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const cardActu = (it) => {
    const title   = esc(it.title || 'Actualité');
    const intro   = md(it.intro || '');
    const outro   = md(it.outro || '');
    const bullets = Array.isArray(it.bullets) ? it.bullets.map(esc) : [];
    const dateObj = it.date ? new Date(it.date) : null;
    const dateStr = dateObj && !isNaN(dateObj)
      ? dateObj.toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'})
      : '';

    const img = it.image
      ? `<div class="actu-img-wrap"><img src="${esc(it.image)}" alt="${title}" loading="lazy" decoding="async"></div>`
      : '';

    const href = it.link && it.link.url ? String(it.link.url) : '';
    const safeLink = href && /^https?:\/\//i.test(href)
      ? `<p><a class="link-helloasso" href="${esc(href)}" target="_blank" rel="noopener">${esc(it.link.label || 'En savoir plus')}</a></p>`
      : '';

    return `
      <article class="helloasso helloasso--media" id="${esc(it.id || '')}">
        ${img}
        <div class="actu-content">
          <h3>${title}${dateStr ? `<span class="actu-date">— ${dateStr}</span>` : ''}</h3>
          ${intro ? `<p>${intro}</p>` : ''}
          ${bullets.length ? `<ul class="helloasso__notes">${bullets.map(li => `<li>${li}</li>`).join('')}</ul>` : ''}
          ${outro ? `<p>${outro}</p>` : ''}
          ${safeLink}
        </div>
      </article>`;
  };

  try {
    const res = await fetch('assets/data/actus.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];

    if (!arr.length) {
      wrap.innerHTML = `<article class="helloasso"><h3>📰 Actualités</h3><p class="muted">Aucune actualité pour le moment.</p></article>`;
      return;
    }

    const items = arr.slice().sort((a,b) => {
      const va = isNaN(new Date(a.date)) ? -Infinity : new Date(a.date).getTime();
      const vb = isNaN(new Date(b.date)) ? -Infinity : new Date(b.date).getTime();
      return vb - va;
    }).slice(0,5);

    wrap.innerHTML = items.map(cardActu).join('');

  } catch (err) {
    console.error('[actus] Échec :', err);
    wrap.innerHTML = `<article class="helloasso"><h3>📰 Actualités</h3><p class="muted">Impossible de charger les actualités.</p></article>`;
  }
})();


// ===== CARROUSEL + LIGHTBOX (un seul fetch carousel.json) =====
(async function initMedia(){
  // — Carrousel —
  const root  = document.getElementById('galaCarousel');
  // — Lightbox —
  const lightbox   = document.getElementById('lightbox');
  const imgMain    = document.getElementById('lightbox-img');
  const thumbsWrap = document.getElementById('lightbox-thumbs');
  const btnClose   = lightbox?.querySelector('.lightbox-close');

  // Chargement unique
  let images = [];
  try {
    const res  = await fetch('assets/data/carousel.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    images = Array.isArray(data.images) ? data.images : [];
  } catch(e) {
    console.error('[carousel] JSON load failed:', e);
  }

  // ---- CARROUSEL ----
  if (root && images.length) {
    const track   = root.querySelector('.carousel-track');
    const btnNext = root.querySelector('.carousel-btn.next');
    const btnPrev = root.querySelector('.carousel-btn.prev');

    track.innerHTML = images.map((img, i) => {
      const alt = (img.alt || `Photo ${i+1}`).replace(/"/g,'&quot;');
      return `
        <div class="carousel-item" aria-hidden="${i===0?'false':'true'}">
          <img src="${img.src}" alt="${alt}" loading="${i===0?'eager':'lazy'}" decoding="${i===0?'sync':'async'}">
        </div>`;
    }).join('');

    const items = Array.from(track.children);
    const N = items.length;
    let index = 0;

    function goTo(i){
      index = (i + N) % N;
      track.style.transform = `translateX(-${index * 100}%)`;
      items.forEach((el,k) => el.setAttribute('aria-hidden', k===index ? 'false':'true'));
    }
    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    btnNext?.addEventListener('click', next);
    btnPrev?.addEventListener('click', prev);

    // Autoplay
    let timer = null;
    const start = () => { if (!timer) timer = setInterval(next, 7000); };
    const stop  = () => { clearInterval(timer); timer = null; };
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    // Clavier
    root.tabIndex = 0;
    root.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    });

    // Swipe
    let startX = 0, dx = 0, swiping = false;
    const onStart = e => { swiping=true; startX=(e.touches?e.touches[0].clientX:e.clientX); dx=0; };
    const onMove  = e => { if(!swiping) return; dx=(e.touches?e.touches[0].clientX:e.clientX)-startX; };
    const onEnd   = () => { if(!swiping) return; swiping=false; if(Math.abs(dx)>50)(dx<0?next():prev()); startX=dx=0; };
    track.addEventListener('touchstart', onStart, {passive:true});
    track.addEventListener('touchmove',  onMove,  {passive:true});
    track.addEventListener('touchend',   onEnd);
    track.addEventListener('mousedown',  onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onEnd);

    goTo(0);
    start();

    // ---- LIGHTBOX ----
    if (lightbox && imgMain && thumbsWrap && btnClose) {
      thumbsWrap.innerHTML = images.map((s,i)=>
        `<img src="${s.src}" alt="thumb ${i+1}" data-index="${i}" loading="lazy">`
      ).join('');

      const thumbs = Array.from(thumbsWrap.querySelectorAll('img'));
      let current = 0;

      function showLb(i){
        current = (i + images.length) % images.length;
        imgMain.src = images[current].src;
        thumbs.forEach(t => t.classList.remove('active'));
        thumbs[current]?.classList.add('active');
      }

      // Ouvrir au clic
      items.forEach((el, i) => {
        el.querySelector('img')?.addEventListener('click', () => {
          lightbox.setAttribute('aria-hidden','false');
          showLb(i);
        });
      });

      thumbs.forEach(t => t.addEventListener('click', () => showLb(+t.dataset.index)));

      btnClose.addEventListener('click', () => lightbox.setAttribute('aria-hidden','true'));

      window.addEventListener('keydown', e => {
        if (lightbox.getAttribute('aria-hidden') === 'true') return;
        if (e.key === 'Escape')     lightbox.setAttribute('aria-hidden','true');
        if (e.key === 'ArrowRight') showLb(current+1);
        if (e.key === 'ArrowLeft')  showLb(current-1);
      });
    }

  } else if (root) {
    const track   = root.querySelector('.carousel-track');
    const btnNext = root.querySelector('.carousel-btn.next');
    const btnPrev = root.querySelector('.carousel-btn.prev');
    track.innerHTML = `<div class="carousel-item" style="display:grid;place-items:center;color:#aaa">Aucune image pour le moment.</div>`;
    if(btnNext) btnNext.disabled = true;
    if(btnPrev) btnPrev.disabled = true;
  }

  // ---- Cursor light (histoire) ----
  const light = document.querySelector('.cursor-light');
  const section = light?.closest('section');
  if (light && section) {
    section.addEventListener('mousemove', e => {
      const r = section.getBoundingClientRect();
      light.style.transform = `translate3d(${e.clientX - r.left}px,${e.clientY - r.top}px,0)`;
    });
  }
})();
