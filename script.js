/* ============================================================
   松本地酒家 — script.js
   fetch('data.json') でデータを取得してレンダリングする
   ============================================================ */
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

document.addEventListener('DOMContentLoaded', async () => {

  /* ① ローダー・UI を即時初期化（data.json 待ちしない） */
  initLoader();
  initNavbar();
  initPageSystem();
  initParticles();
  initParallax();
  initRegionTabs();
  initAwardsFilter();
  initForm();

  /* ② data.json を fetch で取得 */
  let d = null;
  try {
    const res = await fetch('data.json?v=' + Date.now());
    if (res.ok) d = await res.json();
    else throw new Error('HTTP ' + res.status);
  } catch(e) {
    console.error('data.json の読み込みに失敗しました:', e);
  }

  /* ③ 取得できたらレンダリング */
  if (d) {
    renderHeroBg(d.images);
    renderNavCarousel(d.events, d.products, d.heroImages);
    renderEventBanners(d.events);
    renderBreweries(d.breweries);
    renderMarquee(d.breweries);
    renderCarousel(d.products);
    renderEventPage(d.events, d.sakes);
    renderAwardsPage(d.awards);
    renderProductsPage(d.products);
    renderPagePhotos(d.pagePhotos);
  }

  /* ④ 描画完了後に RevealObserver 起動 */
  initRevealObserver();
});

/* ── LOADER ────────────────────────────────────────────────── */
function initLoader() {
  // ── スクロールロック（全ブラウザ対応）──
  // position:fixed で現在のスクロール位置を保持したまま完全にロック
  let scrollY = 0;

  const lockScroll = () => {
    scrollY = window.scrollY;
    document.body.style.position   = 'fixed';
    document.body.style.top        = `-${scrollY}px`;
    document.body.style.left       = '0';
    document.body.style.right      = '0';
    document.body.style.overflowY  = 'scroll'; // スクロールバー幅を確保
  };

  const unlockScroll = () => {
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.left      = '';
    document.body.style.right     = '';
    document.body.style.overflowY = '';
    // ロック前の位置に戻す（常に最上部）
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  lockScroll();

  const hide = () => setTimeout(() => {
    const l = $('loader');
    if (l) l.classList.add('hide');
    unlockScroll();
  }, 2000);

  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide, { once: true });

  // 最大4.5秒で強制解除
  setTimeout(() => {
    const l = $('loader');
    if (l) l.classList.add('hide');
    unlockScroll();
  }, 4500);
}

/* ── ヒーロー背景 ───────────────────────────────────────────── */
function renderHeroBg(images) {
  if (!images?.hero) return;
  const bg = $('heroBg');
  if (bg) bg.style.backgroundImage = `url('images/${esc(images.hero)}')`;
}

/* ── ナビスライドショー ─────────────────────────────────────── */
function renderNavCarousel(events, products, heroImages) {
  const ss = $('nav-slideshow');

  // ── heroImages が登録されていれば複数スライドを生成 ──
  const imgs = (heroImages || []).filter(h => h.file);
  const slidesWrap = $('nsSlides');
  const controls   = $('heroControls');
  const dotsWrap   = $('nssDots');

  if (imgs.length > 0 && slidesWrap) {
    // スライドをDOMに生成（テキストは全スライド共通）
    slidesWrap.innerHTML = imgs.map((img, i) => `
      <div class="nss-slide${i === 0 ? ' active' : ''}">
        <div class="nss-slide-img" style="background-image:url('images/${esc(img.file)}');background-size:cover;background-position:center;">
        </div>
        <div class="nss-slide-sub">長野県松本市の地酒</div>
        <div class="nss-content">
          <div class="nss-quote-wrap">
            <p class="nss-quote-main">「一杯の酒に、<br><em>山と里の物語</em>が宿る」</p>
            <p class="nss-quote-attr">— 信州松本の地酒職人より —</p>
          </div>
        </div>
      </div>`).join('');

    // 複数枚ならコントロール表示＋スライドショー起動
    if (imgs.length > 1) {
      if (controls) controls.style.display = '';
      if (dotsWrap) {
        dotsWrap.innerHTML = imgs.map((_, i) =>
          `<div class="nss-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></div>`
        ).join('');
        dotsWrap.querySelectorAll('.nss-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            clearTimeout(window._heroTimer);
            heroGoTo(parseInt(dot.dataset.idx));
            heroSchedule(imgs.length);
          });
        });
      }
      heroSchedule(imgs.length);
    }
  }

  // プログレスバー追加
  if (ss && !$('nssProgress')) {
    const bar = document.createElement('div');
    bar.id = 'nssProgress'; bar.className = 'nss-progress';
    ss.appendChild(bar);
  }

  // ヒーローは1枚固定なのでスライドショー制御は不要
  // initSlideshow(1); ← 不要
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


/* ── イベントバナー（複数対応） ─────────────────────────────── */
function renderEventBanners(events) {
  const wrap = $('event-banners-wrap');
  if (!wrap) return;
  const upcoming = events?.filter(e => e.status === 'upcoming') || [];
  if (!upcoming.length) { wrap.style.display = 'none'; return; }

  wrap.innerHTML = upcoming.map(ev => {
    const dateLabel = ev.dateLabel || (ev.date ? formatDate(ev.date) : '');
    const posterHtml = ev.image
      ? `<img src="images/${esc(ev.image)}" alt="${esc(ev.title)}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div class="event-poster-inner">
           <div class="event-poster-year">${esc(dateLabel.slice(0,4))} — Event</div>
           <div class="event-poster-main">${esc(ev.title)}</div>
           <div class="event-poster-date">${esc(dateLabel)}</div>
         </div>
         <div class="event-poster-border"></div>`;
    return `<div class="event-banner-item">
      <div class="event-inner">
        <div>
          <div class="event-badge"><span class="event-badge-dot"></span>Upcoming Event</div>
          <h2 class="event-title">${esc(ev.title)}</h2>
          <div class="event-meta">
            <div class="event-meta-item"><span class="event-meta-icon">📅</span><span>${esc(dateLabel)}</span></div>
            ${ev.time1?`<div class="event-meta-item"><span class="event-meta-icon">🕐</span><span>1部 ${esc(ev.time1)} ／ 2部 ${esc(ev.time2)}</span></div>`:''}
            ${ev.venue?`<div class="event-meta-item"><span class="event-meta-icon">📍</span><span>${esc(ev.venue)}</span></div>`:''}
            ${ev.fee?`<div class="event-meta-item"><span class="event-meta-icon">💴</span><span>会費 ${esc(ev.fee)}（前売り ${esc(ev.feeAdvance||'')}）</span></div>`:''}
          </div>
          ${ev.desc?`<p class="event-desc">${esc(ev.desc)}</p>`:''}
          <a href="#" data-page="page-event" class="btn-primary">詳細・チケット情報</a>
        </div>
        <div class="event-poster">
          <div class="event-poster-img">${posterHtml}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── 蔵元グリッド ───────────────────────────────────────────── */
function renderBreweries(breweries) {
  if (!breweries) return;
  const regions = {
    matsumoto: { gridId:'grid-matsumoto', label:'Matsumoto' },
    shiojiri:  { gridId:'grid-shiojiri',  label:'Shiojiri'  },
    azumino:   { gridId:'grid-azumino',   label:'Azumino'   },
  };
  Object.entries(regions).forEach(([key, cfg]) => {
    const grid = $(cfg.gridId);
    if (!grid || !breweries[key]?.length) return;
    grid.innerHTML = breweries[key].map((b, i) => {
      const emailHtml = b.email ? `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : '';
      const faxHtml   = b.fax   ? ` ／ FAX：${esc(b.fax)}` : '';
      const bgHtml    = b.image ? `<img class="brewery-card-bg" src="images/${esc(b.image)}" alt="">` : '';
      return `<div class="brewery-card" data-num="${String(i+1).padStart(2,'0')}">
        ${bgHtml}
        <div class="bc-region">${esc(cfg.label)}</div>
        <div class="bc-name">${esc(b.name)}</div>
        <div class="bc-maker">${esc(b.maker)}</div>
        <div class="bc-info">〒${esc(b.zip)} ${esc(b.address)}<br>TEL：${esc(b.tel)}${faxHtml}<br>${emailHtml}</div>
        <span class="bc-arrow">詳しく見る →</span>
      </div>`;
    }).join('');
  });
}

/* ── マーキー ───────────────────────────────────────────────── */
function renderMarquee(breweries) {
  const track = document.querySelector('.marquee-track');
  if (!track || !breweries) return;
  const names = [...(breweries.matsumoto||[]),...(breweries.shiojiri||[]),...(breweries.azumino||[])].map(b=>b.name);
  if (!names.length) return;
  track.innerHTML = [...names,...names].map(n=>`<span>${esc(n)}</span><span>·</span>`).join('');
}

/* ── 商品カルーセル ─────────────────────────────────────────── */
function renderCarousel(products) {
  const track = $('carousel-track');
  if (!track || !products?.length) return;
  const items = [...products,...products];
  track.innerHTML = items.map(p => {
    const imgHtml = p.image ? `<img src="images/${esc(p.image)}" alt="${esc(p.name)}">` : `酒`;
    return `<a class="carousel-item" data-page="page-purchase">
      <div class="carousel-img">${imgHtml}</div>
      <div class="carousel-item-brewery">${esc(p.brewery)}</div>
      <div class="carousel-item-name">${esc(p.name)}</div>
      <div class="carousel-item-price">${esc(p.price)}円（税込）</div>
    </a>`;
  }).join('');
  track.style.animationDuration = Math.max(30, products.length * 5) + 's';
}

/* ── イベントページ ─────────────────────────────────────────── */
function renderEventPage(events, sakes) {
  if (!events?.length) return;
  const upcoming = events.filter(e => e.status === 'upcoming');
  const ended    = events.filter(e => e.status === 'ended');

  const upBlock = $('event-upcoming-block');
  if (upBlock) {
    upBlock.innerHTML = upcoming.map(ev => {
      const dateLabel = ev.dateLabel || (ev.date ? formatDate(ev.date) : '');
      // PC: 本文上部に画像表示
      const imgHtml = ev.image
        ? `<img src="images/${esc(ev.image)}" alt="${esc(ev.title)}" style="width:100%;max-height:360px;object-fit:cover;margin-bottom:2rem;">`
        : '';
      // スマホ: イベント情報の上にリンク付き画像バナーを表示
      const mobileImgHtml = ev.image
        ? `<a href="#" data-page="page-event" class="event-mobile-img-wrap">
            <img src="images/${esc(ev.image)}" alt="${esc(ev.title)}" class="event-mobile-img">
           </a>`
        : '';
      return `<div class="event-upcoming-item reveal">
        ${mobileImgHtml}
        <div style="background:var(--deep);border:1px solid var(--border);padding:3.5rem;margin-bottom:2rem;">
          <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1.5rem;">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--amber);animation:blink 1.4s ease infinite;display:inline-block;"></span>
            <span style="font-size:.68rem;letter-spacing:.5em;color:var(--amber);text-transform:uppercase;">Upcoming</span>
          </div>
          ${imgHtml}
          <h2 style="font-family:var(--serif);font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:1.5rem;line-height:1.3;">${esc(ev.title)}</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;">
            <table style="font-size:.88rem;width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid rgba(245,240,232,.07);"><td style="padding:.8rem 1rem .8rem 0;opacity:.4;width:80px;vertical-align:top;">日時</td>
                <td style="padding:.8rem 0;line-height:2;">${esc(dateLabel)}
                  ${ev.time1?`<br>1部 ${esc(ev.time1)}<br>2部 ${esc(ev.time2)}<br><span style="font-size:.75rem;opacity:.5;">※各部開始15分前から受付</span>`:''}
                </td></tr>
              <tr style="border-bottom:1px solid rgba(245,240,232,.07);"><td style="padding:.8rem 1rem .8rem 0;opacity:.4;">会場</td><td style="padding:.8rem 0;">${esc(ev.venue||'')}</td></tr>
              <tr style="border-bottom:1px solid rgba(245,240,232,.07);"><td style="padding:.8rem 1rem .8rem 0;opacity:.4;">会費</td>
                <td style="padding:.8rem 0;">${ev.fee?`当日 ${esc(ev.fee)}<br><span style="color:var(--amber-lt);">前売り ${esc(ev.feeAdvance||'')}</span>`:''}</td></tr>
              <tr><td style="padding:.8rem 1rem .8rem 0;opacity:.4;vertical-align:top;">前売り<br>販売店</td>
                <td style="padding:.8rem 0;font-size:.82rem;line-height:2;opacity:.6;">${esc(ev.ticketShops||'')}</td></tr>
            </table>
            <div>
              <p style="font-size:.85rem;line-height:2.1;opacity:.6;margin-bottom:1.5rem;">${esc(ev.desc||'')}</p>
              <a href="#" data-page="page-event" class="btn-primary" style="font-size:.78rem;">詳細・チケット情報</a>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // 出品酒グリッド
  const grid = $('sake-booth-grid');
  if (grid && sakes?.length) {
    const grouped = {};
    sakes.forEach(s => { if(!grouped[s.brewery]) grouped[s.brewery]=[]; grouped[s.brewery].push(s); });
    grid.innerHTML = Object.entries(grouped).map(([brewery, items]) => `
      <div style="background:var(--ink);padding:2rem;">
        <div style="font-size:.62rem;letter-spacing:.4em;color:var(--amber);margin-bottom:.6rem;">${esc(brewery)}</div>
        ${items.map(s=>`<div style="font-family:var(--serif);font-size:.95rem;margin-bottom:.25rem;">${esc(s.name)}</div>`).join('')}
        <p style="font-size:.78rem;opacity:.55;line-height:1.9;margin-top:.8rem;">${esc(items[0].desc)}</p>
      </div>`).join('');
  }

  // アーカイブ
  const archiveGrid = $('event-archive-grid');
  if (archiveGrid) {
    if (ended.length) {
      archiveGrid.innerHTML = ended.map(e => {
        const imgHtml = e.image
          ? `<div class="event-archive-img"><img src="images/${esc(e.image)}" alt="${esc(e.title)}"></div>`
          : `<div class="event-archive-img">${esc(e.title.slice(0,4))}</div>`;
        return `<div class="event-archive-card">
          ${imgHtml}
          <div class="event-archive-title">${esc(e.title)}</div>
          <div class="event-archive-date">${esc(e.dateLabel||'')}</div>
          ${e.desc?`<p style="font-size:.78rem;opacity:.5;margin-top:.5rem;line-height:1.8;">${esc(e.desc)}</p>`:''}
        </div>`;
      }).join('');
    } else {
      archiveGrid.innerHTML = '<p style="opacity:.4;font-size:.85rem;">過去のイベント記録はまだありません</p>';
    }
  }
}

/* ── 酒類鑑評会ページ ───────────────────────────────────────── */
function renderAwardsPage(awards) {
  const container = $('awards-dynamic-list');
  if (!container || !awards?.length) return;
  const badgeClass = {'金賞':'badge-gold','最優秀賞':'badge-best','優秀賞':'badge-excellent','入賞':'badge-entry'};
  container.innerHTML = awards.map(a => `
    <div class="award-year-block" data-type="${a.competition.includes('全国')?'national':'kanto'}">
      <div class="award-year-heading">${esc(a.year)}</div>
      <div class="award-year-sub">${esc(a.competition)}</div>
      <table class="award-table">
        <thead><tr><th>賞</th><th>銘柄</th><th>製造者</th><th>部門</th></tr></thead>
        <tbody>${a.entries.map(e=>`<tr>
          <td><span class="award-badge ${badgeClass[e.award]||'badge-entry'}">${esc(e.award)}</span></td>
          <td>${esc(e.brand)}</td><td>${esc(e.maker)}</td><td>${esc(e.division||'—')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`).join('');
}

/* ── 商品ページ ─────────────────────────────────────────────── */
function renderProductsPage(products) {
  const grid = $('products-dynamic-grid');
  if (!grid || !products?.length) return;
  grid.innerHTML = products.map(p => {
    const imgHtml = p.image
      ? `<div class="product-img-wrap"><img src="images/${esc(p.image)}" alt="${esc(p.name)}" style="max-width:85%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;"></div>`
      : `<div class="product-img-wrap"><div class="product-img-placeholder">酒</div></div>`;
    return `<div class="product-card">
      <div class="product-num">${esc(p.num)}</div>
      ${imgHtml}
      <div class="product-card-body">
        <div class="product-brewery">${esc(p.brewery)}</div>
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-type">${esc(p.type)}</div>
        <p class="product-desc">${esc(p.desc)}</p>
        <div class="product-meta">
          <div class="product-meta-item">AL <span>${esc(p.al)}%</span></div>
          <div class="product-meta-item">容量 <span>${esc(p.volume)}ml</span></div>
          <div class="product-meta-item">価格 <span>${esc(p.price)}円（税込）</span></div>
        </div>
      </div>
    </div>`;
  }).join('');
  const sel = $('fProduct');
  if (sel) {
    sel.innerHTML = '<option value="">指定なし／おすすめをお任せ</option>' +
      products.map(p=>`<option>No.${p.num} ${p.name} — ${p.price}円</option>`).join('');
  }
}

/* ── 研究会・神社 写真レンダリング ─────────────────────────── */
function renderPagePhotos(pagePhotos) {
  if (!pagePhotos) return;

  // 研究会（新酒研究会・初のみきり研究会 各2枚）
  ['0','1'].forEach(idx => {
    const el = $(`research-photos-${idx}`);
    if (!el) return;
    const photos = pagePhotos[`research_${idx}`] || [];
    const filled = photos.filter(p => p.file);
    if (!filled.length) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = filled.map(p =>
      `<div class="page-photo-item reveal">
        <img src="images/${esc(p.file)}" alt="${esc(p.alt||'研究会')}">
      </div>`
    ).join('');
  });

  // 松尾神社（ヒーロー画像 + 3枚グリッド）
  const shrineEl = $('shrine-photos');
  const shrineHero = $('shrineHeroImg');
  const shrineHeroPlaceholder = $('shrineHeroPlaceholder');
  const photos = (pagePhotos.shrine || []).filter(p => p.file);

  // 1枚目をヒーロー画像として表示
  if (shrineHero && photos.length > 0) {
    if (shrineHeroPlaceholder) shrineHeroPlaceholder.style.display = 'none';
    const heroImg = document.createElement('img');
    heroImg.src = `images/${esc(photos[0].file)}`;
    heroImg.alt = photos[0].alt || '松尾神社';
    shrineHero.appendChild(heroImg);
  }

  // 2枚目以降をグリッドに表示
  if (shrineEl) {
    const gridPhotos = photos.slice(1);
    if (!gridPhotos.length) { shrineEl.style.display = 'none'; }
    else {
      shrineEl.style.display = '';
      shrineEl.innerHTML = gridPhotos.map(p =>
        `<div class="page-photo-item reveal">
          <img src="images/${esc(p.file)}" alt="${esc(p.alt||'松尾神社')}">
        </div>`
      ).join('');
    }
  }
}

/* ── HELPERS ────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '';
  const [y,m,d]=iso.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日（${'日月火水木金土'[new Date(iso).getDay()]}）`;
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
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const target=$(id);
    if (!target) return;
    target.classList.add('active');
    // smoothだとスクロール中に干渉するため instant に変更
    window.scrollTo({top:0,behavior:'instant'});
    setTimeout(()=>{
      target.querySelectorAll('.reveal,.reveal-left,.reveal-right,.stat-item').forEach(el=>revealObs?.observe(el));
    },80);
  }
  document.addEventListener('click', e => {
    const link=e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    showPage(link.dataset.page);
    $('navHamburger')?.classList.remove('open');
    $('navMobile')?.classList.remove('open');
  });
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
      const counter=entry.target.querySelector('.stat-num[data-target]');
      if(counter&&!counter.dataset.counted){ counter.dataset.counted='1'; animateCounter(counter); }
    });
  },{threshold:0.12});
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.stat-item').forEach(el=>revealObs.observe(el));
  ['.brewery-card','.product-card','.award-year-block'].forEach(sel=>{
    document.querySelectorAll(sel).forEach((el,i)=>{ el.style.transitionDelay=`${i*0.07}s`; el.classList.add('reveal'); revealObs.observe(el); });
  });
  document.querySelectorAll('.step-item').forEach((el,i)=>{ el.style.transitionDelay=`${i*0.12}s`; el.classList.add('reveal-left'); revealObs.observe(el); });
}
function animateCounter(el){
  const target=parseInt(el.dataset.target,10),suffix=el.dataset.suffix||'+';
  let current=0; const step=target/(1600/16);
  const t=setInterval(()=>{ current=Math.min(current+step,target); el.textContent=Math.round(current)+(current>=target?suffix:''); if(current>=target) clearInterval(t); },16);
}

/* ── PARALLAX ───────────────────────────────────────────────── */
function initParallax(){
  // 旧 parallaxStrip は削除済みのためスキップ

  // 川動画（about）の再生速度を 1/3 に設定
  const riverVideo = document.querySelector('.about-video-bg');
  if (riverVideo) {
    riverVideo.playbackRate = 0.333;
    riverVideo.addEventListener('loadedmetadata', () => { riverVideo.playbackRate = 0.333; });
    riverVideo.addEventListener('play', () => { riverVideo.playbackRate = 0.333; });
  }

  // saketitle動画（washi）の再生速度も 1/3 に設定
  const washiVideo = document.querySelector('.washi-video-bg');
  if (washiVideo) {
    washiVideo.playbackRate = 0.333;
    washiVideo.addEventListener('loadedmetadata', () => { washiVideo.playbackRate = 0.333; });
    washiVideo.addEventListener('play', () => { washiVideo.playbackRate = 0.333; });
  }
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
      const f=btn.dataset.filter;
      document.querySelectorAll('.award-year-block').forEach(b=>{
        b.style.display=(f==='all'||b.dataset.type===f)?'':'none';
      });
    });
  });
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
