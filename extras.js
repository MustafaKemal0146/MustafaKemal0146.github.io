(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const USER = 'MustafaKemal0146';
  const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const LANG = { Go: '#00ADD8', Rust: '#DEA584', TypeScript: '#3178C6', JavaScript: '#E8C547', Python: '#3572A5', Java: '#B07219', HTML: '#E34C26', Dart: '#00B4AB' };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtDate = iso => { const d = new Date(iso); return `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}`; };
  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
  const ago = iso => {
    const s = (new Date(iso) - Date.now()) / 1000;
    for (const [u, v] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]])
      if (Math.abs(s) >= v) return rtf.format(Math.round(s / v), u);
    return 'az önce';
  };
  const fold = s => s.toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' }[c]));

  const toastEl = $('.toast');
  let toastT;
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 1800); };

  // GitHub, cached per tab so reloads don't burn the 60/h limit
  const gh = async (path, key, pick) => {
    try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 10 * 60 * 1000) return c.d; } catch {}
    const r = await fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const d = pick(await r.json());
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch {}
    return d;
  };

  const scrollToHash = hash => {
    const t = hash === '#top' ? document.body : $(hash);
    if (!t) return;
    if (window.__lenis) window.__lenis.scrollTo(hash === '#top' ? 0 : t, { offset: -60 });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ================= live: last push ================= */
  gh(`/users/${USER}/events/public?per_page=30`, 'gh-events', d => d.filter(e => ['PushEvent', 'ReleaseEvent', 'CreateEvent'].includes(e.type) && e.repo.name.startsWith(USER + '/')).slice(0, 1).map(e => ({ repo: e.repo.name.split('/')[1], at: e.created_at, type: e.type })))
    .then(([e]) => { if (e) $('#now').innerHTML = `Son ${e.type === 'ReleaseEvent' ? 'sürüm' : 'push'}: <strong>${esc(e.repo)}</strong> · ${ago(e.at)}`; })
    .catch(() => {});

  /* ================= live: repos (stats + peek) ================= */
  const repoInfo = new Map();
  gh(`/users/${USER}/repos?per_page=100`, 'gh-repos', d => d.map(r => ({ n: r.name, s: r.stargazers_count, l: r.language, p: r.pushed_at, f: r.fork })))
    .then(list => list.forEach(r => repoInfo.set(r.n.toLowerCase(), r)))
    .catch(() => {});

  /* ================= live: pull requests ================= */
  // Two columns (pending left, merged right). Only the newest MAX_PER_COLUMN of each are listed, so a
  // night of 60 merged PRs can't take over the page; the rest sits behind a "+N daha" link to GitHub.
  const MAX_PER_COLUMN = 10;
  const cols = {
    open: { list: $('#prs-open'), count: $('#up-open'), more: $('#more-open') },
    merged: { list: $('#prs-merged'), count: $('#up-merged'), more: $('#more-merged') }
  };
  let prTriggers = [];
  const animatePRs = () => {
    if (!window.gsap || !window.ScrollTrigger || reduce) return;
    prTriggers.forEach(t => t.kill());
    prTriggers = [];
    Object.values(cols).forEach(c => {
      const rows = $$('.pr', c.list);
      gsap.set(rows, { opacity: 0, x: -24 });
      prTriggers.push(...ScrollTrigger.batch(rows, {
        start: 'top 92%', once: true,
        onEnter: els => gsap.to(els, { opacity: 1, x: 0, duration: .8, stagger: .07, ease: 'expo.out' })
      }));
    });
    ScrollTrigger.refresh();
  };
  const prRow = i => `<li class="pr"><span class="pr__node" aria-hidden="true"></span><img src="https://github.com/${esc(i.org)}.png?size=64" alt="" width="28" height="28" loading="lazy"><div class="pr__main"><span class="pr__repo">${esc(i.repo)} <i>#${i.num}</i></span><a class="pr__title" href="${esc(i.url)}" title="${esc(i.title)}" target="_blank" rel="noopener">${esc(i.title)}</a></div><time datetime="${i.at.slice(0, 10)}">${fmtDate(i.at)}</time></li>`;
  const renderColumn = (key, items, total) => {
    const c = cols[key], shown = items.slice(0, MAX_PER_COLUMN), extra = total - shown.length;
    c.list.innerHTML = shown.length ? shown.map(prRow).join('') : `<li class="pr pr--empty">${key === 'open' ? 'Şu an bekleyen PR yok.' : 'Henüz merge edilen PR yok.'}</li>`;
    c.count.textContent = total;
    c.more.innerHTML = (extra > 0 ? `<em>+${extra} daha</em> GitHub'da gör` : 'GitHub\'da tümünü gör') + ' <span class="arr">↗</span>';
  };
  if (window.gsap && window.ScrollTrigger && !reduce) {
    $$('.upcol--merged .upcol__line u').forEach(u => gsap.fromTo(u, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: u.closest('.upcol__list'), start: 'top 75%', end: 'bottom 70%', scrub: true } }));
    animatePRs();
  } else {
    $$('.upcol__line u').forEach(u => (u.style.transform = 'scaleY(1)'));
  }
  const searchPRs = state => gh(`/search/issues?q=${encodeURIComponent(`author:${USER} type:pr is:${state} -user:${USER}`)}&per_page=100&sort=updated&order=desc`, 'gh-prs-' + state, d => ({
    total: d.total_count,
    items: d.items
      .map(i => { const repo = i.repository_url.split('/repos/')[1]; return { repo, org: repo.split('/')[0], num: i.number, url: i.html_url, title: i.title, at: state === 'merged' ? i.closed_at : i.created_at }; })
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  }));
  Promise.all([searchPRs('open'), searchPRs('merged')])
    .then(([o, m]) => {
      renderColumn('open', o.items, o.total);
      renderColumn('merged', m.items, m.total);
      $('#up-repos').textContent = new Set([...o.items, ...m.items].map(i => i.repo)).size;
      animatePRs();
      $('#up-status').textContent = 'Canlı · GitHub\'dan ' + new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) + ' itibarıyla';
    })
    .catch(() => { $('#up-status').textContent = 'Son bilinen durum · Ekim 2026'; });

  /* ================= hero dot field ================= */
  const cv = $('.field'), hero = $('.hero');
  if (cv && cv.getContext) {
    const ctx = cv.getContext('2d');
    let w, h, dpr, pts = [], mx = -9999, my = -9999, tx = -9999, ty = -9999, t = 0, running = false, visible = true;
    const ripples = [];
    const build = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = w < 700 ? 24 : 28;
      pts = [];
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) pts.push(x, y);
      if (reduce) draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      mx += (tx - mx) * .12; my += (ty - my) * .12;
      const R = w < 700 ? 110 : 160, R2 = R * R, now = performance.now();
      for (let k = ripples.length - 1; k >= 0; k--) if (now - ripples[k].t0 > 1500) ripples.splice(k, 1);
      ctx.fillStyle = '#D6D2C6';
      ctx.beginPath();
      const hot = [];
      for (let i = 0; i < pts.length; i += 2) {
        let x = pts[i], y = pts[i + 1], r = 1 + .35 * Math.sin(t * 1.2 + x * .012 + y * .018), heat = 0;
        const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = 1 - d / R, push = f * f * 26;
          x += dx / d * push; y += dy / d * push; r += f * 2.2; heat = f;
        }
        for (const rp of ripples) {
          const age = now - rp.t0, ring = age * .55, ex = pts[i] - rp.x, ey = pts[i + 1] - rp.y, d = Math.hypot(ex, ey) || 1, diff = Math.abs(d - ring);
          if (diff < 46) { const a = (1 - diff / 46) * 16 * (1 - age / 1500); x += ex / d * a; y += ey / d * a; r += a * .08; heat = Math.max(heat, a / 16); }
        }
        if (heat > .08) { hot.push(x, y, r, heat); continue; }
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
      for (let i = 0; i < hot.length; i += 4) {
        ctx.fillStyle = `rgba(217,119,87,${.25 + hot[i + 3] * .75})`;
        ctx.beginPath(); ctx.arc(hot[i], hot[i + 1], hot[i + 2], 0, 6.2832); ctx.fill();
      }
    };
    const loop = () => { if (!running) return; t += .016; draw(); requestAnimationFrame(loop); };
    const setRun = () => { const should = visible && !document.hidden && !reduce; if (should && !running) { running = true; requestAnimationFrame(loop); } else if (!should) running = false; };
    hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (mx < -999) { mx = tx; my = ty; } });
    hero.addEventListener('pointerleave', () => { tx = ty = -9999; });
    hero.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() }); if (ripples.length > 4) ripples.shift(); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; setRun(); }).observe(hero);
    document.addEventListener('visibilitychange', setRun);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 150); });
    build(); setRun();
  }

  /* ================= project peek ================= */
  const peek = $('.peek');
  if (finePointer && peek) {
    let px = 0, py = 0, cx = 0, cy = 0, on = false, raf = 0;
    const move = () => { cx += (px - cx) * .18; cy += (py - cy) * .18; peek.style.translate = `${cx}px ${cy}px`; raf = on || Math.abs(px - cx) > .5 ? requestAnimationFrame(move) : 0; };
    const show = li => {
      const a = li.querySelector('a'), m = /github\.com\/MustafaKemal0146\/([^/?#]+)/i.exec(a.href), info = m && repoInfo.get(m[1].toLowerCase());
      $('.peek__meta').textContent = li.querySelector('span').textContent + ' · ' + ({ ai: 'Yapay zeka', sys: 'Sistem', cv: 'CV & IoT', web: 'Web' }[li.dataset.c] || '');
      $('.peek__name').textContent = li.querySelector('b').textContent;
      $('.peek__desc').textContent = li.querySelector('em').textContent;
      const lang = $('.peek__lang');
      lang.textContent = info && info.l ? info.l : '';
      lang.style.setProperty('--lc', (info && LANG[info.l]) || '#D97757');
      $('.peek__stars').textContent = info && info.s ? '★ ' + info.s : '';
      $('.peek__time').textContent = info ? 'güncelleme ' + ago(info.p) : '';
      on = true;
      if (window.gsap) gsap.to(peek, { opacity: 1, scale: 1, duration: .35, ease: 'expo.out', overwrite: true });
      else peek.style.opacity = 1;
      if (!raf) raf = requestAnimationFrame(move);
    };
    const hide = () => { on = false; if (window.gsap) gsap.to(peek, { opacity: 0, scale: .9, duration: .25, ease: 'power2.out', overwrite: true }); else peek.style.opacity = 0; };
    $$('.rows li').forEach(li => {
      li.addEventListener('pointerenter', show.bind(null, li));
      li.addEventListener('pointerleave', hide);
    });
    addEventListener('pointermove', e => {
      const right = e.clientX + 320 > innerWidth;
      px = e.clientX + (right ? -306 : 22); py = e.clientY + 18;
      if (!on && !raf) { cx = px; cy = py; peek.style.translate = `${cx}px ${cy}px`; }
    }, { passive: true });
  }

  /* ================= command palette ================= */
  const box = $('#cmdk'), q = $('#cmdk-q'), list = $('#cmdk-list');
  list.setAttribute('data-lenis-prevent', '');
  const items = [];
  $$('#sheet a').forEach(a => items.push({ g: 'Bölümler', label: a.textContent.trim(), ic: '#', hint: 'git', run: () => scrollToHash(a.getAttribute('href')) }));
  $$('.rows li').forEach(li => { const a = li.querySelector('a'); items.push({ g: 'Projeler', label: li.querySelector('b').textContent, sub: li.querySelector('em').textContent, ic: '↗', hint: li.querySelector('span').textContent, run: () => window.open(a.href, '_blank', 'noopener') }); });
  [
    ['E-posta adresini kopyala', '@', 'kopyala', () => navigator.clipboard.writeText('ismustafakemal0146@gmail.com').then(() => toast('E-posta kopyalandı'), () => (location.href = 'mailto:ismustafakemal0146@gmail.com'))],
    ['E-posta gönder', '✉', 'mailto', () => (location.href = 'mailto:ismustafakemal0146@gmail.com')],
    ['CV\'yi aç', 'CV', 'pdf', () => window.open('assets/cv.pdf', '_blank', 'noopener')],
    ['GitHub profili', 'gh', 'github.com', () => window.open('https://github.com/MustafaKemal0146', '_blank', 'noopener')],
    ['LinkedIn', 'in', 'linkedin', () => window.open('https://linkedin.com/in/mustafakemalcingil/', '_blank', 'noopener')],
    ['Spotify\'da KemalChords', '♪', 'spotify', () => window.open('https://open.spotify.com/artist/5fhKxUqc2j2LAWDJLaiSyW', '_blank', 'noopener')],
    ['Başa dön', '↑', 'üst', () => scrollToHash('#top')]
  ].forEach(([label, ic, hint, run]) => items.push({ g: 'Komutlar', label, ic, hint, run }));

  let shown = [], sel = 0, lastFocus = null;
  const hl = (label, term) => {
    if (!term) return esc(label);
    const i = fold(label).indexOf(term);
    return i < 0 ? esc(label) : esc(label.slice(0, i)) + '<mark>' + esc(label.slice(i, i + term.length)) + '</mark>' + esc(label.slice(i + term.length));
  };
  const render = () => {
    const term = fold(q.value.trim());
    shown = items
      .map(it => { const l = fold(it.label), s = fold(it.sub || ''); const sc = !term ? 1 : l.startsWith(term) ? 3 : l.includes(term) ? 2 : s.includes(term) ? 1 : 0; return { it, sc }; })
      .filter(x => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .map(x => x.it);
    if (!term) shown = items.slice();
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    if (!shown.length) { list.innerHTML = `<li class="empty">“${esc(q.value)}” için sonuç yok</li>`; return; }
    let g = '', html = '';
    shown.forEach((it, i) => {
      if (it.g !== g) { g = it.g; html += `<li class="grp" role="presentation">${g}</li>`; }
      html += `<li role="option" id="ck-${i}" data-i="${i}" aria-selected="${i === sel}"><span class="ic">${esc(it.ic)}</span><span>${hl(it.label, term)}</span><small>${esc(it.hint || '')}</small></li>`;
    });
    list.innerHTML = html;
    q.setAttribute('aria-activedescendant', 'ck-' + sel);
  };
  const setSel = i => {
    sel = (i + shown.length) % shown.length;
    $$('[role="option"]', list).forEach(o => o.setAttribute('aria-selected', +o.dataset.i === sel));
    const el = $('#ck-' + sel); if (el) el.scrollIntoView({ block: 'nearest' });
    q.setAttribute('aria-activedescendant', 'ck-' + sel);
  };
  const open = () => {
    if (!box.hidden) return;
    lastFocus = document.activeElement;
    box.hidden = false; q.value = ''; sel = 0; render();
    document.body.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
    requestAnimationFrame(() => q.focus());
  };
  const close = () => {
    if (box.hidden) return;
    box.hidden = true;
    document.body.style.overflow = '';
    if (window.__lenis) window.__lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  const runSel = () => { const it = shown[sel]; if (!it) return; close(); setTimeout(it.run, 60); };

  q.addEventListener('input', () => { sel = 0; render(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); runSel(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') e.preventDefault();
  });
  list.addEventListener('pointermove', e => { const o = e.target.closest('[role="option"]'); if (o && +o.dataset.i !== sel) setSel(+o.dataset.i); });
  list.addEventListener('click', e => { const o = e.target.closest('[role="option"]'); if (o) { sel = +o.dataset.i; runSel(); } });
  box.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) close(); });
  $('.kbtn').addEventListener('click', open);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box.hidden ? open() : close(); }
    else if (e.key === '/' && box.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) $('.kbtn kbd').textContent = 'Ctrl K';
})();
