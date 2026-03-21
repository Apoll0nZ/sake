/* ============================================================
   松本地酒家 — script.js
   静的書き出し済みページ用の最小初期化
   ============================================================ */
const $ = id => document.getElementById(id);
const awardsViewState = { filter: 'all' };
const staticPriorityAssetsByPage = {
  main: ['header.webp']
};

document.addEventListener('DOMContentLoaded', () => {
  const criticalAssetPromise = warmCriticalAssets();

  /* ① ローダー・UI を即時初期化 */
  initLoader({ criticalAssetPromise });
  initNavbar();
  initPageSystem();
  initParticles();
  initParallax();
  initRegionTabs();
  initAwardsFilter();
  initForm();
  initStaticHeroCarousel();
  initRevealObserver();
  initVideoLazyLoad();
});

function getCurrentPageKey() {
  const path = location.pathname.toLowerCase();
  if (path.endsWith('/purchase.html') || path.endsWith('purchase.html')) return 'purchase';
  const requestedPage = new URLSearchParams(location.search).get('page');
  if (!requestedPage || requestedPage === 'page-main') return 'main';
  return '';
}

function warmCriticalAssets() {
  const pageKey = getCurrentPageKey();
  const assets = staticPriorityAssetsByPage[pageKey] || [];
  if (!assets.length) return Promise.resolve();

  return Promise.all(
    assets.map((file, index) => preloadImage(`images/${file}`, index === 0))
  );
}

function preloadImage(href, highPriority = false) {
  if (!href) return Promise.resolve();
  if (!document.head.querySelector(`link[rel="preload"][href="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    if (highPriority) link.fetchPriority = 'high';
    document.head.appendChild(link);
  }

  const img = new Image();
  if (highPriority) img.fetchPriority = 'high';
  img.decoding = 'async';
  const loadPromise = new Promise(resolve => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  img.src = href;
  return loadPromise;
}

/* ── LOADER ────────────────────────────────────────────────── */
function initLoader({ criticalAssetPromise } = {}) {
  const loader = $('loader');
  if (!loader) return;
  const minLoaderMs = 2500;
  const startedAt = performance.now();
  const loaderSeenKey = 'sake_loader_seen';
  try {
    if (sessionStorage.getItem(loaderSeenKey) === '1') {
      loader.classList.add('hide');
      return;
    }
    sessionStorage.setItem(loaderSeenKey, '1');
  } catch (_) {
    // sessionStorage が使えない環境では従来どおり毎回表示
  }
  let _done = false;
  const lockScroll = () => {
    document.body.dataset.lockedY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.left = document.body.style.right = '0';
    document.body.style.overflowY = 'scroll';
  };
  const unlockScroll = () => {
    if (_done) return; _done = true;
    const y = parseInt(document.body.dataset.lockedY || '0', 10);
    document.body.style.position = document.body.style.top =
    document.body.style.left = document.body.style.right =
    document.body.style.overflowY = '';
    window.scrollTo({ top: y, behavior: 'instant' });
  };
  lockScroll();
  const hideLoader = () => { loader.classList.add('hide'); unlockScroll(); };
  Promise.allSettled([criticalAssetPromise || Promise.resolve()]).then(() => {
    const remaining = Math.max(0, minLoaderMs - (performance.now() - startedAt));
    setTimeout(hideLoader, remaining);
  });
  setTimeout(hideLoader, 6000);
}

function initStaticHeroCarousel() {
  const slides = Array.from(document.querySelectorAll('.nss-slide'));
  const dotsWrap = $('nssDots');
  const controls = $('heroControls');
  if (!slides.length) return;

  _heroCurrent = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
  if (_heroCurrent < 0) _heroCurrent = 0;

  const dots = Array.from(dotsWrap?.querySelectorAll('.nss-dot') || []);
  if (controls) controls.style.display = slides.length > 1 ? '' : 'none';

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      clearTimeout(window._heroTimer);
      heroGoTo(index);
      heroSchedule(slides.length);
    });
  });

  const bar = $('nssProgress');
  if (slides.length > 1 && bar) {
    bar.style.transition = 'none';
    bar.style.width = '0%';
    bar.offsetHeight;
    bar.style.transition = 'width 6000ms linear';
    bar.style.width = '100%';
    heroSchedule(slides.length);
  }
}

let _heroCurrent = 0;

function heroGoTo(next) {
  const slides = document.querySelectorAll('.nss-slide');
  const dots   = document.querySelectorAll('.nss-dot');
  if (!slides.length) return;
  slides[_heroCurrent].classList.remove('active');
  slides[_heroCurrent].classList.add('exit-left');
  const exiting = slides[_heroCurrent];
  setTimeout(() => exiting.classList.remove('exit-left'), 950);
  slides[next].classList.add('active');
  dots[_heroCurrent]?.classList.remove('active');
  dots[next]?.classList.add('active');
  _heroCurrent = next;
  // プログレスバーリセット
  const bar = $('nssProgress');
  if (bar) {
    bar.style.transition = 'none'; bar.style.width = '0%';
    bar.offsetHeight;
    bar.style.transition = 'width 6000ms linear'; bar.style.width = '100%';
  }
}

function heroSchedule(total) {
  clearTimeout(window._heroTimer);
  window._heroTimer = setTimeout(() => {
    heroGoTo((_heroCurrent + 1) % total);
    heroSchedule(total);
  }, 6000);
}

// ── prev/next ボタンを heroGoTo に接続 ─────────────────────────
document.addEventListener('click', e => {
  const total = document.querySelectorAll('.nss-slide').length;
  if (total < 2) return;
  if (e.target.closest('#nssPrev')) {
    clearTimeout(window._heroTimer);
    heroGoTo((_heroCurrent - 1 + total) % total);
    heroSchedule(total);
  }
  if (e.target.closest('#nssNext')) {
    clearTimeout(window._heroTimer);
    heroGoTo((_heroCurrent + 1) % total);
    heroSchedule(total);
  }
});

/* ── 酒類鑑評会ページ ───────────────────────────────────────── */
function updateAwardsFilter() {
  const container = $('awards-dynamic-list');
  if (!container) return;
  container.querySelectorAll('.award-year-block').forEach(block => {
    const type = block.dataset.type || 'all';
    block.style.display = awardsViewState.filter === 'all' || type === awardsViewState.filter ? '' : 'none';
  });
}

/* ── NAVBAR ─────────────────────────────────────────────────── */
function initNavbar() {
  const navbar=$('navbar');
  window.addEventListener('scroll',()=>navbar?.classList.toggle('scrolled',window.scrollY>60),{passive:true});
  const h=$('navHamburger'),m=$('navMobile');
  h?.addEventListener('click',()=>{ h.classList.toggle('open'); m?.classList.toggle('open'); });
}

/* ── PAGE SYSTEM ────────────────────────────────────────────── */
function initPageSystem() {
  let _currentPage = document.querySelector('.page.active')?.id || document.querySelector('.page')?.id || 'page-main';
  function showPage(id) {
    const isSame = (id === _currentPage);
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const target=$(id);
    if (!target) return;
    target.classList.add('active');
    _currentPage = id;
    if (!isSame) window.scrollTo({top:0,behavior:'instant'});
    setTimeout(()=>{
      target.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>revealObs?.observe(el));
    },80);
  }
  document.addEventListener('click', e => {
    const link=e.target.closest('[data-page]');
    if (!link) return;
    const target = $(link.dataset.page);
    if (!target) return;
    e.preventDefault();
    showPage(link.dataset.page);
    $('navHamburger')?.classList.remove('open');
    $('navMobile')?.classList.remove('open');
  });
  const requestedPage = new URLSearchParams(window.location.search).get('page');
  if (requestedPage && $(requestedPage)) showPage(requestedPage);
}

/* ── PARTICLES ──────────────────────────────────────────────── */
function initParticles() {
  const c=$('heroParticles'); if(!c) return;
  for(let i=0;i<20;i++){
    const p=document.createElement('div');
    const s=Math.random()*180+50,x=Math.random()*100,d=Math.random()*22+14,dl=Math.random()*-22,op=Math.random()*0.25+0.04;
    p.style.cssText=`position:absolute;width:${s}px;height:${s}px;border-radius:50%;left:${x}%;bottom:-${s}px;background:radial-gradient(circle,rgba(200,146,42,.35) 0%,transparent 70%);animation:float ${d}s linear ${dl}s infinite;opacity:${op};`;
    c.appendChild(p);
  }
}

/* ── REVEAL OBSERVER ────────────────────────────────────────── */
let revealObs;
function initRevealObserver() {
  revealObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObs?.unobserve(entry.target);
    });
  },{threshold:0.04, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>revealObs.observe(el));
  ['.brewery-card','.product-card','.award-year-block'].forEach(sel=>{
    document.querySelectorAll(sel).forEach((el,i)=>{ el.style.transitionDelay=`${i*0.03}s`; el.classList.add('reveal'); revealObs.observe(el); });
  });
  document.querySelectorAll('.step-item').forEach((el,i)=>{ el.style.transitionDelay=`${i*0.06}s`; el.classList.add('reveal-left'); revealObs.observe(el); });
}

/* ── PARALLAX ───────────────────────────────────────────────── */
function initParallax(){
  // river 動画: IntersectionObserver で画面内に入ったら遅延読み込み
  const video = document.querySelector('.about-video-bg[data-lazy-video]');
  if (!video) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(video);
      video.querySelectorAll('source[data-src]').forEach(s => {
        s.src = s.dataset.src;
        s.removeAttribute('data-src');
      });
      video.load();
      video.play().catch(() => {});
    });
  }, { rootMargin: '200px' });
  observer.observe(video);
}

/* ── REGION TABS ────────────────────────────────────────────── */
function initRegionTabs(){
  document.querySelectorAll('.region-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.region-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.region-panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      $(tab.dataset.panel)?.classList.add('active');
    });
  });
}

/* ── AWARDS FILTER ──────────────────────────────────────────── */
function initAwardsFilter(){
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      awardsViewState.filter = btn.dataset.filter;
      updateAwardsFilter();
    });
  });
  updateAwardsFilter();
}

/* ── FORM ───────────────────────────────────────────────────── */
function initForm(){
  $('formSubmit')?.addEventListener('click',function(){
    const name=$('fName'),email=$('fEmail');
    if(!name?.value.trim()||!email?.value.trim()){
      if(email){email.style.borderColor='rgba(200,80,80,.6)';setTimeout(()=>email.style.borderColor='',2000);}
      return;
    }
    this.textContent='送信しました ✓'; this.classList.add('sent');
    setTimeout(()=>{this.textContent='送信する';this.classList.remove('sent');},4000);
  });
}

/* ── VIDEO LAZY LOAD ─────────────────────────────────────────── */
function initVideoLazyLoad() {
  const container = document.getElementById('about-video-container');
  if (!container) return;

  // 即座にダウンロード開始、再生可能になったら静止画と差し替え
  const video = document.createElement('video');
  video.className = 'about-video-bg';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';

  const source = document.createElement('source');
  source.src = 'images/river.mp4';
  source.type = 'video/mp4';
  video.appendChild(source);

  // 再生可能になったら静止画を置き換え
  video.addEventListener('canplay', () => {
    container.innerHTML = '';
    container.appendChild(video);
  }, { once: true });
}

