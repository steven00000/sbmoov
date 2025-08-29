function renderHome(items){
  const homeList = document.getElementById('newsListHome');
  if (!homeList) return;
  const five = items.slice(0,5); // 5 actus max
  homeList.innerHTML = five.map(n => {
    const date = new Date(n.d).toLocaleDateString('fr-FR',
      { day:'2-digit', month:'long', year:'numeric' });
    const desc  = n.desc ? `<p>${n.desc}</p>` : '';
    return `
      <article class="news-card">
        <h3>📰 ${n.t}</h3>
        ${desc}
        <div class="news-meta">
          <span>${n.tag || 'Actu'}</span>
          <time datetime="${n.d}">${date}</time>
        </div>
      </article>`;
  }).join('');
}

// ===== ACTUALITÉS (JSON -> cartes "helloasso") =====
(async function renderActus(){
  const wrap = document.getElementById('actus-list');
  if (!wrap) return;

  try {
    const res = await fetch('assets/data/actus.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // tri décroissant par date
    const items = (data.items || [])
  .slice()
  .sort((a,b)=> new Date(b.date||0)-new Date(a.date||0))
  .slice(0,5);


    // rendu
    wrap.innerHTML = items.map(it => cardActu(it)).join('');

  } catch (err) {
    console.error('Actus: impossible de charger le JSON', err);
    wrap.innerHTML = `
      <article class="helloasso">
        <h3>📰 Actualités</h3>
        <p class="muted">Aucune actualité pour le moment.</p>
      </article>`;
  }

  function esc(s=''){ return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  }

  function cardActu(it){
    const title  = esc(it.title || 'Actualité');
    const intro  = esc(it.intro || '');
    const outro  = esc(it.outro || '');
    const date   = it.date ? new Date(it.date) : null;
    const dateStr= date ? date.toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'}) : '';
    const bullets = Array.isArray(it.bullets) ? it.bullets.map(esc) : [];

    const link = it.link && it.link.url ? `
      <p><a class="link-helloasso" href="${esc(it.link.url)}" target="_blank" rel="noopener">
        ${esc(it.link.label || 'En savoir plus')}
      </a></p>` : '';

    return `
    <article class="helloasso" id="${esc(it.id || '')}">
      <h3>${title}${dateStr ? `<span class="actu-date">— ${dateStr}</span>` : ''}</h3>
      ${intro ? `<p>${intro}</p>` : ''}

      ${bullets.length ? `
        <ul class="helloasso__notes">
          ${bullets.map(li => `<li>${li}</li>`).join('')}
        </ul>` : ''}

      ${outro ? `<p>${outro}</p>` : ''}

      ${link}
    </article>`;
  }
})();
