(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- things that work without GSAP ---------- */

  // mobile menu
  const burger = $('.nav__burger'), sheet = $('#sheet');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    sheet.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', sheet).forEach(a => a.addEventListener('click', () => setMenu(false)));

  // fetih locked button: tap toggles the bubble
  const locked = $('.locked');
  locked.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); locked.classList.toggle('is-open'); });
  locked.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); locked.classList.toggle('is-open'); } if (e.key === 'Escape') locked.classList.remove('is-open'); });
  document.addEventListener('click', () => locked.classList.remove('is-open'));

  // project filters
  $$('.filters button').forEach(btn => btn.addEventListener('click', () => {
    $$('.filters button').forEach(b => b.classList.toggle('is-on', b === btn));
    const f = btn.dataset.f;
    $$('.rows li').forEach((li, i) => {
      const show = f === 'all' || li.dataset.c === f;
      li.classList.toggle('is-out', !show);
      if (show && window.gsap && !reduce) gsap.fromTo(li, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, delay: i * .025, ease: 'power3.out', overwrite: true });
    });
  }));

  // joe hour bars (sample data shape: low morning, peak late evening)
  const bars = $('.bars');
  const hours = [6, 3, 2, 1, 1, 1, 2, 4, 6, 7, 8, 9, 10, 9, 8, 9, 11, 13, 15, 17, 20, 24, 22, 14];
  hours.forEach((h, i) => { const b = document.createElement('i'); b.style.height = (h / 24 * 100) + '%'; if (i >= 20 && i <= 22) b.className = 'hot'; bars.appendChild(b); });

  // statement: split into words
  const st = $('[data-words]');
  const clayWords = ['anlamakla', 'karakteri', 'derdi', 'anlayacaksın,'];
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w${clayWords.includes(w) ? ' is-clay' : ''}">${w}</span>`).join(' ');
  const words = $$('.w', st);

  // joe step switching
  const steps = $$('.jstep'), panes = $$('.pane'), tabs = $$('.app__side span');
  let cur = -1;
  const setStep = i => {
    if (i === cur) return; cur = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    panes.forEach((p, k) => p.classList.toggle('is-on', k === i));
    tabs.forEach((t, k) => t.classList.toggle('is-on', k === i));
    if (i === 0 && window.gsap && !reduce) gsap.fromTo('.bars i', { scaleY: 0 }, { scaleY: 1, duration: .9, stagger: .02, ease: 'power3.out' });
    if (i === 2) $$('.lenses span').forEach((s, k) => (s.style.transitionDelay = k * 40 + 'ms'));
  };
  setStep(0);

  // E.D.A typing
  const typing = $('.typing');
  let typed = false;
  const typeIt = () => {
    if (typed) return; typed = true;
    const txt = typing.dataset.text;
    if (reduce) { typing.textContent = txt; return; }
    setTimeout(() => { let n = 0; const t = setInterval(() => { typing.textContent = txt.slice(0, ++n); if (n >= txt.length) clearInterval(t); }, 28); }, 700);
  };

  // suffix ("+", " bin+") is set smaller so big numbers stay on one line
  const setNum = (el, n) => { const suf = el.dataset.suffix || ''; el.innerHTML = n + (suf ? `<small>${suf}</small>` : ''); };
  const countUp = el => {
    const end = +el.dataset.count;
    if (!window.gsap || reduce) { setNum(el, end); return; }
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => setNum(el, Math.round(o.v)) });
  };

  /* ---------- no GSAP: show everything statically ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    words.forEach(w => w.classList.add('is-lit'));
    $$('[data-count]').forEach(el => setNum(el, el.dataset.count));
    $$('.tl__item').forEach(t => t.classList.add('is-on'));
    typeIt();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setStep(+e.target.dataset.step); }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
    return;
  }

  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);

  // smooth scroll
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: t => 1 - Math.pow(1 - t, 4), smoothTouch: false });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: id === '#top' ? 0 : -60 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  // progress + nav
  const nav = $('#nav');
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 10);
      nav.classList.toggle('is-hidden', y > 600 && y > lastY && sheet.hidden);
      lastY = y;
    }
  });
  const links = $$('.nav__links a');
  links.forEach(l => {
    const sec = $(l.getAttribute('href')); if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && links.forEach(x => x.classList.toggle('is-active', x === l)) });
  });

  // counters
  $$('[data-count]').forEach(el => {
    if (el.closest('.codecard')) return;
    setNum(el, 0);
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => countUp(el) });
  });

  // generic reveal
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%', once: true,
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: .08, ease: 'expo.out' })
  });

  if (reduce) {
    gsap.set('.reveal', { opacity: 1, y: 0 });
    words.forEach(w => w.classList.add('is-lit'));
    $$('.tl__item').forEach(t => t.classList.add('is-on'));
    gsap.set('.tl__line span', { scaleY: 1 });
    steps.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: x => x.isActive && setStep(i) }));
    ScrollTrigger.create({ trigger: '.eda', start: 'top 70%', once: true, onEnter: typeIt });
    return;
  }

  /* ---------- hero ---------- */
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro.from('.hero__title .line > span', { yPercent: 115, rotate: 3, duration: 1.4, stagger: .1 })
    .from('.hero .eyebrow, .hero__lead, .hero__actions', { y: 24, opacity: 0, duration: 1.1, stagger: .08 }, '-=1.1')
    .from('.portrait', { y: 80, rotateX: 22, rotateY: -14, opacity: 0, duration: 1.6 }, '-=1.2')
    .from('.codecard', { y: 100, rotateX: 28, opacity: 0, duration: 1.6 }, '-=1.35');

  gsap.to('.hero__copy', { yPercent: -18, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.portrait', { y: -120, rotateY: 12, rotateX: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.codecard', { y: -40, rotateY: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- marquee reacts to scroll velocity ---------- */
  const mq = gsap.to('.marquee__track', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
  let dir = 1;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: s => {
      dir = s.direction;
      const v = gsap.utils.clamp(-8, 8, s.getVelocity() / 250);
      gsap.to(mq, { timeScale: dir * (1 + Math.abs(v)), duration: .3, overwrite: true });
      gsap.to(mq, { timeScale: dir, duration: 1.2, delay: .3 });
    }
  });

  /* ---------- statement words light up ---------- */
  ScrollTrigger.create({
    trigger: '.statement', start: 'top 70%', end: 'bottom 55%', scrub: true,
    onUpdate: s => { const n = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-lit', i < n)); }
  });

  /* ---------- engineering layers stack in ---------- */
  // one-shot (not scrubbed) so the cards always finish, even if scrolling stops halfway;
  // transforms are cleared afterwards so the pointer tilt starts from a clean state
  gsap.fromTo('.layer',
    { y: 90, rotateX: -22, opacity: 0, transformOrigin: '50% 100%' },
    { y: 0, rotateX: 0, opacity: 1, duration: 1.2, stagger: .1, ease: 'expo.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.layers', start: 'top 88%', once: true } });
  gsap.from('.specs__row', { x: -30, opacity: 0, stagger: .08, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.specs', start: 'top 85%' } });

  /* ---------- joe ---------- */
  steps.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: x => x.isActive && setStep(i) }));
  gsap.fromTo('.app', { rotateX: 20, rotateY: -8, scale: .92, y: 60 }, { rotateX: 0, rotateY: 0, scale: 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: '.joe__grid', start: 'top 95%', end: 'top 25%', scrub: 1 } });

  /* ---------- horizontal work ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    // the whole stage (heading + cards) is pinned, so the heading only leaves once the last card is reached
    const stage = $('.work__stage'), track = $('.hscroll__track');
    const cards = $$('.pcard'), total = cards.length;
    const bar = $('.work__prog u'), count = $('.work__count');
    const dist = () => track.scrollWidth - innerWidth;
    count.innerHTML = `<b>01</b> / ${String(total).padStart(2, '0')}`;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: stage,
        start: () => (stage.offsetHeight < innerHeight - 24 ? 'center center' : 'top top'),
        end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: self => {
          bar.style.transform = `scaleX(${Math.max(.05, self.progress)})`;
          count.firstChild.textContent = String(Math.round(self.progress * (total - 1)) + 1).padStart(2, '0');
        }
      }
    });
    cards.forEach((c, i) => gsap.from(c, { rotate: i % 2 ? 3 : -3, y: 40, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'center center', scrub: true } }));
  });
  gsap.from('.rows li', { y: 20, opacity: 0, stagger: .04, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '.rows', start: 'top 85%' } });

  /* ---------- timeline ---------- */
  gsap.to('.tl__line span', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 60%', end: 'bottom 60%', scrub: true } });
  $$('.tl__item').forEach(it => {
    ScrollTrigger.create({ trigger: it, start: 'top 60%', onEnter: () => it.classList.add('is-on'), onLeaveBack: () => it.classList.remove('is-on') });
    gsap.from(it.children, { x: 40, opacity: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 85%' } });
  });

  /* ---------- roles ---------- */
  gsap.from('.rlist img, .rlist__mono', { scale: .4, rotate: -20, duration: 1, ease: 'back.out(2)', stagger: .1, scrollTrigger: { trigger: '.rlist', start: 'top 80%' } });

  /* ---------- eda ---------- */
  ScrollTrigger.create({ trigger: '.chat', start: 'top 80%', once: true, onEnter: typeIt });
  gsap.from('.modules div', { y: 40, opacity: 0, rotateX: -30, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.modules', start: 'top 85%' } });
  gsap.from('.msg--u', { x: 40, opacity: 0, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: '.chat', start: 'top 85%' } });

  /* ---------- music ---------- */
  gsap.fromTo('.vinyl', { x: 160, opacity: 0 }, { x: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: '.music', start: 'top 85%', end: 'top 35%', scrub: 1 } });
  gsap.fromTo('.vinyl__disc', { rotate: -120 }, { rotate: 300, ease: 'none', scrollTrigger: { trigger: '.music', start: 'top 85%', end: 'bottom top', scrub: 1 } });
  mm.add('(min-width: 901px)', () => {
    gsap.fromTo('.albums__track', { x: 120 }, { x: () => -($('.albums__track').scrollWidth - innerWidth) - 40, ease: 'none', scrollTrigger: { trigger: '.albums', start: 'top bottom', end: 'bottom top', scrub: 1, invalidateOnRefresh: true } });
    gsap.fromTo('.singles__track', { x: () => -($('.singles__track').scrollWidth - innerWidth) }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.singles', start: 'top bottom', end: 'bottom top', scrub: 1, invalidateOnRefresh: true } });
  });
  gsap.from('.single', { y: 40, opacity: 0, stagger: .03, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.singles', start: 'top 92%' } });
  gsap.from('.album', { y: 60, rotate: (i) => (i % 2 ? 4 : -4), opacity: 0, stagger: .08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.albums', start: 'top 90%' } });

  /* ---------- quote + contact ---------- */
  gsap.fromTo('.quote p', { scale: .94, opacity: .2 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top 80%', end: 'center 55%', scrub: true } });
  gsap.from('.contact__grid a', { y: 30, opacity: 0, stagger: .07, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.contact__grid', start: 'top 92%' } });

  /* ---------- pointer tilt + magnetic buttons (desktop only) ---------- */
  if (finePointer) {
    $$('[data-tilt]').forEach(el => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - .5) * 10);
        rx(-((e.clientY - r.top) / r.height - .5) * 10);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
    $$('.btn').forEach(b => {
      const x = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), y = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .25); y((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
