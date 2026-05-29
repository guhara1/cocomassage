// build-site.mjs
// 코코마사지(YH LAB) 출장마사지 정적 사이트 생성기
// - index.html, 회사소개, 이용약관/개인정보, 서비스 상세, 지역 페이지, sitemap/rss/robots 생성
// - 설계 원칙: 지역명만 바꾼 복제 페이지 금지, 각 페이지 고유 콘텐츠, 의료·과장 표현 배제
// 다음 사이트 재사용 시 아래 SITE 설정과 데이터 배열만 교체하면 됩니다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

// ───────────────────────────────────────────────────────────────────────────
// 1. 사이트 기본 설정 (다음 사이트에서 가장 먼저 바꿀 값)
// ───────────────────────────────────────────────────────────────────────────
const SITE = {
  url: "https://cocomassage.pages.dev", // 커스텀 도메인 연결 후 이 값만 바꾸면 전체 반영
  brand: "코코마사지",
  brandEn: "COCO",
  company: "YH LAB",
  ceo: "김유환",
  bizNo: "815-26-00585",
  address: "경기도 파주시 청석로 268",
  phone: "0508-202-4717",
  phoneTel: "050882024717",
  responsibleTeam: "코코마사지 운영팀",
  // 검색엔진 인증 태그 (실제 발급값으로 교체)
  googleVerification: "tLvzDmZ30YWnEXQJb7t1JHxf1OROGMjRlc_Yk5PiBkw",
  naverVerification: "8ba96b15f7b4994e156520352104144c060fa657",
  buildDate: "2026-05-29",
};

const NOW_ISO = `${SITE.buildDate}T09:00:00+09:00`;

// 색인 대상 URL 수집기 (sitemap/rss 생성용)
const indexUrls = []; // {loc, lastmod, changefreq, priority, title, desc} → sitemap
function track(loc, { changefreq = "weekly", priority = "0.6", title = "", desc = "" } = {}) {
  indexUrls.push({ loc, lastmod: SITE.buildDate, changefreq, priority, title, desc });
}
// RSS(블로그) 전용 피드: 날짜형 콘텐츠(매거진 글·후기)만 담음
const feedItems = []; // {loc, title, desc, date}
function feed(loc, title, desc, date) { feedItems.push({ loc, title, desc, date }); }

// ───────────────────────────────────────────────────────────────────────────
// 2. 공통 유틸
// ───────────────────────────────────────────────────────────────────────────
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function writeFile(relPath, content) {
  const full = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

// 페이지 경로 → canonical 절대 URL
const abs = (p) => SITE.url + (p.startsWith("/") ? p : "/" + p);

// depth(루트로부터 깊이)에 따른 상대 경로 prefix → 정적 자산 참조
const rel = (depth) => (depth === 0 ? "./" : "../".repeat(depth));

// FAQ 블록 HTML
function faqHtml(faqs) {
  return faqs
    .map(
      (f) => `
      <div class="faq-item">
        <button class="faq-q" type="button" aria-expanded="false">
          <span>${esc(f.q)}</span><span class="faq-icon" aria-hidden="true">+</span>
        </button>
        <div class="faq-a"><p>${esc(f.a)}</p></div>
      </div>`
    )
    .join("\n");
}

// FAQPage JSON-LD
function faqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 3. 공통 레이아웃 (head / header / footer)
// ───────────────────────────────────────────────────────────────────────────
function head({ title, description, canonicalPath, depth, jsonLd = [], noindex = false, ogImagePath, verification = false }) {
  const r = rel(depth);
  const canonical = abs(canonicalPath);
  const ogImage = abs(ogImagePath || "/assets/og-image.png");
  const ldBlocks = jsonLd
    .filter(Boolean)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join("\n  ");
  // 검색엔진 인증 태그는 메인(루트) 페이지에만, 실제 토큰이 설정된 경우에만 출력
  const verifyTags = [];
  if (verification) {
    if (SITE.googleVerification && !SITE.googleVerification.startsWith("GOOGLE_"))
      verifyTags.push(`<meta name="google-site-verification" content="${esc(SITE.googleVerification)}">`);
    if (SITE.naverVerification && !SITE.naverVerification.startsWith("NAVER_"))
      verifyTags.push(`<meta name="naver-site-verification" content="${esc(SITE.naverVerification)}">`);
  }
  const verifyBlock = verifyTags.length ? "\n  " + verifyTags.join("\n  ") : "";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">${verifyBlock}
  <link rel="canonical" href="${canonical}">
  ${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(SITE.brand)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(SITE.brand)} 전국 출장마사지 안내">
  <meta property="og:locale" content="ko_KR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" type="image/svg+xml" href="${r}assets/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="${esc(SITE.brand)} RSS" href="${SITE.url}/rss.xml">
  <link rel="stylesheet" href="${r}styles.css">
  ${ldBlocks}
</head>`;
}

function header(depth, { active = "" } = {}) {
  const r = rel(depth);
  const is = (k) => (active === k ? ' aria-current="page"' : "");
  return `<body>
<a class="skip-link" href="#main">본문 바로가기</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${r}index.html" aria-label="${esc(SITE.brand)} 홈">
      <span class="brand-en">${esc(SITE.brandEn)}</span>
      <span class="brand-ko">${esc(SITE.brand)}</span>
    </a>
    <button class="nav-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="primary-nav">
      <span></span><span></span><span></span>
    </button>
    <nav id="primary-nav" class="primary-nav" aria-label="주요 메뉴">
      <ul>
        <li class="has-sub">
          <a href="${r}services/index.html"${is("services")}>서비스 안내</a>
          <ul class="submenu">
            <li><a href="${r}services/swedish/index.html">스웨디시</a></li>
            <li><a href="${r}services/aroma/index.html">아로마테라피</a></li>
            <li><a href="${r}services/deep-tissue/index.html">딥티슈</a></li>
            <li><a href="${r}services/thai/index.html">타이마사지</a></li>
            <li><a href="${r}services/sports/index.html">스포츠마사지</a></li>
            <li><a href="${r}services/lymphatic/index.html">림프마사지</a></li>
          </ul>
        </li>
        <li class="has-sub">
          <a href="${r}areas/index.html"${is("areas")}>출장 가능 지역</a>
          <ul class="submenu submenu-wide">
            ${REGIONS.map((g) => `<li><a href="${r}areas/${g.slug}/index.html">${esc(g.name)}</a></li>`).join("\n            ")}
          </ul>
        </li>
        <li><a href="${r}how/index.html"${is("how")}>이용 방법</a></li>
        <li><a href="${r}pricing/index.html"${is("pricing")}>요금 안내</a></li>
        <li><a href="${r}faq/index.html"${is("faq")}>FAQ</a></li>
        <li><a href="${r}reviews/index.html"${is("reviews")}>이용후기</a></li>
        <li><a href="${r}magazine/index.html"${is("magazine")}>매거진</a></li>
        <li><a href="${r}about/index.html"${is("about")}>회사 소개</a></li>
        <li><a href="tel:${SITE.phoneTel}" class="nav-cta">예약 문의</a></li>
      </ul>
    </nav>
  </div>
</header>`;
}

function footer(depth) {
  const r = rel(depth);
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <div class="footer-brand">${esc(SITE.brand)}</div>
        <p class="footer-desc">전국 출장 웰니스·릴랙스 관리 안내 서비스입니다. 의료 행위가 아닌 건전한 휴식 관리 범위로 안내합니다.</p>
      </div>
      <div class="footer-col">
        <h3>바로가기</h3>
        <ul>
          <li><a href="${r}services/index.html">서비스 안내</a></li>
          <li><a href="${r}areas/index.html">출장 가능 지역</a></li>
          <li><a href="${r}how/index.html">이용 방법</a></li>
          <li><a href="${r}pricing/index.html">요금 안내</a></li>
          <li><a href="${r}faq/index.html">FAQ</a></li>
          <li><a href="${r}reviews/index.html">이용후기</a></li>
          <li><a href="${r}magazine/index.html">매거진</a></li>
          <li><a href="${r}about/index.html">회사 소개</a></li>
          <li><a href="${r}policy/index.html">이용약관·개인정보</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>예약 문의</h3>
        <ul>
          <li><a href="tel:${SITE.phoneTel}" class="footer-phone">전화 ${esc(SITE.phone)}</a></li>
          <li><a href="sms:${SITE.phoneTel}">문자 문의</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-biz">
      <p>상호: ${esc(SITE.brand)} (${esc(SITE.company)}) · 대표: ${esc(SITE.ceo)} · 사업자등록번호: ${esc(SITE.bizNo)}</p>
      <p>주소: ${esc(SITE.address)} · 대표번호: ${esc(SITE.phone)}</p>
      <p class="footer-note">본 사이트의 콘텐츠는 ${esc(SITE.responsibleTeam)}이 작성하고 검수합니다. 표시된 정보(상호·연락처·주소)는 사업자등록 정보와 일치합니다.</p>
      <p class="footer-copy">© ${new Date(SITE.buildDate).getFullYear()} ${esc(SITE.brand)}. All rights reserved.</p>
    </div>
  </div>
</footer>
<div class="sticky-cta" role="region" aria-label="빠른 예약">
  <a href="tel:${SITE.phoneTel}" class="sticky-call">전화예약</a>
  <a href="sms:${SITE.phoneTel}" class="sticky-sms">문자문의</a>
</div>
<script src="${r}script.js" defer></script>
</body>
</html>`;
}

// breadcrumb HTML + JSON-LD
function breadcrumb(items, depth) {
  // items: [{name, path}] path 마지막은 현재(링크 없음 가능)
  const r = rel(depth);
  const html = `<nav class="breadcrumb" aria-label="현재 위치">
  <ol>
    ${items
      .map((it, i) => {
        const last = i === items.length - 1;
        if (last || !it.path) return `<li aria-current="page">${esc(it.name)}</li>`;
        const href = it.path === "/" ? `${r}index.html` : `${r}${it.path}`;
        return `<li><a href="${href}">${esc(it.name)}</a></li>`;
      })
      .join("\n    ")}
  </ol>
</nav>`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.path ? abs(it.path === "/" ? "/" : "/" + it.path.replace(/index\.html$/, "")) : undefined,
    })),
  };
  return { html, ld };
}

// Organization / WebSite JSON-LD (메인용)
function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.brand,
    legalName: SITE.company,
    url: SITE.url,
    telephone: SITE.phone,
    image: abs("/assets/og-image.png"),
    logo: abs("/assets/favicon.svg"),
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address,
      addressCountry: "KR",
    },
    founder: { "@type": "Person", name: SITE.ceo },
    areaServed: REGIONS.map((r) => r.name),
  };
}

function serviceJsonLd({ name, description, areaName, url }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: name,
    name,
    description,
    image: abs("/assets/og-image.png"),
    url: abs(url),
    areaServed: areaName || "대한민국",
    provider: {
      "@type": "Organization",
      name: SITE.brand,
      telephone: SITE.phone,
      url: SITE.url,
    },
    availableChannel: {
      "@type": "ServiceChannel",
      servicePhone: { "@type": "ContactPoint", telephone: SITE.phone, contactType: "reservations" },
    },
  };
}

// 공통 CTA 블록
function reserveBlock(depth, title = "예약 문의") {
  return `<section class="reserve" aria-labelledby="reserve-h">
  <div class="container reserve-inner">
    <h2 id="reserve-h">${esc(title)}</h2>
    <p>예약과 문의는 전화 또는 문자로 도와드립니다. 방문 지역, 희망 시간, 관리 종류를 알려주시면 안내가 빠릅니다.</p>
    <div class="reserve-btns">
      <a class="btn btn-primary" href="tel:${SITE.phoneTel}">전화예약 ${esc(SITE.phone)}</a>
      <a class="btn btn-ghost" href="sms:${SITE.phoneTel}">문자문의</a>
    </div>
  </div>
</section>`;
}

// 작성/검수 기준 신뢰 블록 (E-E-A-T)
function authorBlock(extra = "") {
  return `<aside class="author-box" aria-label="작성 및 검수 기준">
  <h2>작성·검수 기준</h2>
  <p>이 페이지는 <strong>${esc(SITE.responsibleTeam)}</strong>이 실제 예약·출장 상담에서 반복적으로 확인하는 내용을 바탕으로 작성하고 검수했습니다. ${extra}</p>
  <p class="author-meta">운영: ${esc(SITE.company)} · 대표 ${esc(SITE.ceo)} · 사업자등록번호 ${esc(SITE.bizNo)} · 최종 점검 ${esc(SITE.buildDate)}</p>
  <p class="author-disclaimer">본 서비스는 휴식과 컨디션 관리를 위한 웰니스 관리이며, 질병의 진단·치료·예방을 목적으로 하는 의료 행위가 아닙니다.</p>
</aside>`;
}

// ───────────────────────────────────────────────────────────────────────────
// 4. 데이터: 서비스
// ───────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────
// 공통 렌더 헬퍼 (확장 콘텐츠용)
// ───────────────────────────────────────────────────────────────────────────
function listItems(arr) { return arr.map((x) => `<li>${esc(x)}</li>`).join(""); }
function zoneItems(zones) { return zones.map((z) => `<li><strong>${esc(z.n)}</strong> — ${esc(z.d)}</li>`).join(""); }
function recItems(rec, prefix) {
  return rec.map((r) => {
    const s = SERVICES.find((x) => x.name === r.n);
    return `<li><a href="${prefix}services/${s.slug}/index.html">${esc(r.n)}</a> — ${esc(r.why)}</li>`;
  }).join("");
}
// ── 프리미엄 지역 페이지 UI 컴포넌트 ──
function areaHero({ eyebrow, name, lead, dong, rec, bcHtml }) {
  const dongChips = String(dong).split("·").slice(0, 4).map((t) => t.trim()).filter(Boolean).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
  const recChips = rec.map((r) => `<span class="chip chip-accent">${esc(r.n)}</span>`).join("");
  return `<section class="area-hero">
    <div class="container">
      ${bcHtml}
      <p class="area-hero-eyebrow">${esc(eyebrow)}</p>
      <h1 class="area-hero-title">${esc(name)} 출장마사지</h1>
      <p class="area-hero-lead">${esc(lead)}</p>
      <div class="area-chips">${dongChips}${recChips}</div>
      <div class="area-hero-cta">
        <a class="btn btn-primary" href="tel:${SITE.phoneTel}">전화예약 ${esc(SITE.phone)}</a>
        <a class="btn btn-ghost" href="sms:${SITE.phoneTel}">문자문의</a>
      </div>
    </div>
  </section>`;
}
function zoneCards(zones) {
  return `<div class="zone-cards">${zones.map((z) => `<div class="zone-card"><h3>${esc(z.n)}</h3><p>${esc(z.d)}</p></div>`).join("")}</div>`;
}
function recCards(rec, prefix) {
  return `<div class="rec-cards">${rec.map((r) => {
    const s = SERVICES.find((x) => x.name === r.n);
    return `<a class="rec-card" href="${prefix}services/${s.slug}/index.html"><h3>${esc(r.n)}</h3><p>${esc(r.why)}</p><span class="rec-more">자세히 보기 →</span></a>`;
  }).join("")}</div>`;
}
function infoPanel(items) {
  return `<div class="info-panel">${items.map((it) => `<div class="info-card"><span class="info-label">${esc(it.label)}</span><p>${esc(it.text)}</p></div>`).join("")}</div>`;
}
// 지역의 고유 데이터(timing/fee/rec)로부터 지역별 고유 답변을 가진 추가 FAQ를 구성
function areaExtraFaqs(a, leaf) {
  const recNames = a.rec.map((r) => r.n).join(", ");
  const label = a.profile || (a.lead ? a.lead.replace(/\.$/, "") : a.name);
  const list = [
    { q: `${a.name}에서는 보통 어떤 시간대에 예약 문의가 많나요?`, a: a.timing },
    { q: `${a.name} 출장비는 어떻게 책정되나요?`, a: a.fee },
    { q: `${a.name}에서는 어떤 관리를 많이 찾나요?`, a: `${label} 특성상 ${recNames} 관리를 많이 찾습니다. 예를 들어 ${a.rec[0].n}는 ${a.rec[0].why} 컨디션을 알려주시면 그에 맞춰 추천해 드립니다.` },
  ];
  if (leaf)
    list.push({ q: `${a.name}에서 관리사는 어떻게 배정되나요?`, a: `${a.name}의 지역과 시간, 요청하신 관리 종류를 고려해 배정하며 위생과 응대 기준을 준수합니다. 특정 관리나 시간대를 원하시면 예약 시 알려주시면 최대한 맞춰 안내해 드립니다.` });
  return list;
}
function mergedFaqs(a, leaf) { return a.faqs.concat(areaExtraFaqs(a, leaf)); }
// 서비스 상세용 예약·이용 안내 섹션
function serviceBookingSection(s) {
  return `<h2>${esc(s.name)} 예약과 이용 안내</h2>
      <p>${esc(s.name)} 출장 관리는 60분·90분·120분 중 선택할 수 있으며, 처음이라면 60분으로 경험한 뒤 시간을 늘리는 방식을 권합니다. 전국 시도 단위로 방문이 가능하고, 같은 관리라도 방문지의 건물 유형(아파트·오피스텔·숙소 등)에 따라 출입·주차 확인 사항이 달라 예약 시 함께 안내해 드립니다.</p>
      <p>예약은 전화 ${esc(SITE.phone)} 또는 문자로 받습니다. 방문 지역과 건물 유형, 희망 날짜·시간, 원하는 관리 시간을 알려주시면 가능 시간과 출장비를 사전에 안내해 드립니다. 지역과 거리, 시간대에 따라 추가 출장비가 있을 수 있으며, 발생 시 미리 안내하므로 예상치 못한 비용은 청구되지 않습니다.</p>
      <p>관리 중 압이나 자극이 세거나 약하다고 느끼면 언제든 말씀해 주세요. ${esc(SITE.brand)}는 통증을 참게 하지 않고 컨디션에 맞춰 조절하며, 건전한 휴식·컨디션 관리 범위로만 진행합니다. 알레르기·임신·질환 등 사전에 알아야 할 사항이 있으면 예약 시 함께 알려주시면 안전하게 진행할 수 있습니다.</p>`;
}
// 지역 고유 데이터(customer/timing/rec)로 구성한 '이용 상황과 예약 안내' 섹션
function situationSection(a, prefix, hasDong) {
  const who = a.customer ? `${esc(a.name)}는 주로 ${esc(a.customer)}의 문의가 많아, 컨디션과 일정에 맞춘 안내를 우선합니다. ` : "";
  const startTip = hasDong ? "" : ` ${esc(a.name)}에서 처음 이용하신다면 60분으로 시작해 다음 방문에서 시간을 늘리며 맞는 구성을 찾는 방식을 권합니다.`;
  return `<h2>${esc(a.name)} 가격 안내</h2>
      ${priceTableCompact(prefix)}
      <p>${who}${esc(a.timing)}${startTip}</p>
      <p>${esc(a.name)} 방문 예약은 전화 ${esc(SITE.phone)} 또는 문자로 받습니다. 방문할 동·건물 유형과 희망 시간, 원하는 관리·시간을 알려주시면 ${esc(a.name)} 기준 가능 시간과 출장비를 안내해 드립니다. 일정 변경·취소는 미리 연락 주시면 원활하게 조정됩니다.</p>`;
}
// 지역 페이지용 압축 요금표 (코스 × 시간)
function priceTableCompact(prefix) {
  const cols = ["60분", "90분", "120분", "150분"];
  const rows = PRICING.map((c) => {
    const m = Object.fromEntries(c.rows);
    return `<tr><th scope="row">${esc(c.name)}</th>` + cols.map((col) => `<td>${m[col] ? esc(m[col]) : "—"}</td>`).join("") + `</tr>`;
  }).join("");
  return `<div class="price-mini-wrap"><table class="price-mini"><thead><tr><th scope="col">코스</th>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="price-note">표시 금액(원)은 코스·시간 기준이며, 지역·거리·시간대에 따라 추가 출장비가 안내될 수 있습니다. 자세한 내용은 <a href="${prefix}pricing/index.html">요금 안내</a>에서 확인하세요.</p>`;
}

// ───────────────────────────────────────────────────────────────────────────
// 4. 데이터: 서비스 (상세 콘텐츠)
// ───────────────────────────────────────────────────────────────────────────
const SERVICES = [
  {
    slug: "swedish",
    name: "스웨디시",
    short: "오일을 사용해 길고 부드러운 손동작으로 전신의 긴장을 고르게 풀어주는 대표 릴랙스 관리",
    intro:
      "스웨디시는 식물성 오일을 사용해 길고 일정한 손동작으로 전신을 부드럽게 풀어주는 가장 대표적인 릴랙스 관리입니다. 강한 자극보다 편안함을 우선하기 때문에, 마사지를 처음 받아 보거나 전반적인 피로감으로 컨디션이 처질 때 부담 없이 선택하기 좋습니다. 코코마사지는 방문 전 컨디션과 선호하는 압을 먼저 확인한 뒤, 무리한 강도 없이 몸 전체를 고르게 풀어가는 방식으로 진행합니다.",
    intro2:
      "오랜 시간 같은 자세로 일하거나 휴식이 부족해 몸이 무겁게 느껴질 때, 스웨디시는 표면 근육의 긴장을 천천히 가라앉히고 호흡을 고르게 하는 데 도움을 줍니다. 자극이 세지 않아 받는 동안 편안함을 유지할 수 있고, 관리 후에는 몸이 가벼워진 느낌과 함께 이완된 기분을 느끼는 분이 많습니다. 다만 통증을 치료하거나 질환을 개선하는 의료 행위가 아니라, 휴식과 컨디션 관리를 돕는 웰니스 관리라는 점을 분명히 안내드립니다.",
    forWhom: [
      "오래 앉아 일해 어깨와 등이 묵직하게 느껴지는 경우",
      "수면이 얕고 전반적으로 컨디션이 처질 때",
      "강한 압보다 부드럽고 편안한 관리를 선호하는 경우",
      "마사지를 처음 받아 보아 어떤 종류를 골라야 할지 고민되는 경우",
      "특정 부위보다 전신을 고르게 풀고 싶은 경우",
    ],
    features: [
      "흡수가 잘 되는 오일을 사용한 길고 연속적인 손동작",
      "전신을 균형 있게 풀어주는 일정한 압",
      "컨디션에 따라 약하게도 조절 가능한 강도",
      "목·어깨·등·다리로 이어지는 자연스러운 흐름",
      "마무리에 호흡을 고르는 이완 시간 포함",
    ],
    flow:
      "먼저 간단한 상담으로 평소 불편한 부위와 선호하는 압을 확인합니다. 이어서 목과 어깨처럼 긴장이 쌓이기 쉬운 부위부터 시작해 등, 허리, 다리 순으로 전신을 부드럽게 풀어갑니다.",
    flow2:
      "손동작은 끊기지 않고 길게 이어지도록 진행해 몸이 점차 이완되도록 돕고, 마무리 단계에서는 압을 줄이며 호흡을 정리하는 시간을 둡니다. 진행 중 압이 약하거나 세다고 느끼면 언제든 말씀해 주시면 바로 조절합니다.",
    strength:
      "스웨디시는 통증을 참아야 하는 관리가 아닙니다. 기본은 편안하게 느껴지는 중간 정도의 압이며, 더 부드럽게 또는 조금 더 단단하게 원하시면 부위별로 다르게 맞춰 드립니다.",
    times:
      "전신 흐름을 처음 경험한다면 60분이 적당하고, 충분한 이완과 마무리까지 여유 있게 받고 싶다면 90분 이상을 권합니다. 시간이 길수록 한 부위에 머무는 시간이 늘어 이완감이 깊어집니다.",
    diff:
      "딥티슈가 단단하게 뭉친 특정 부위를 깊게 다루는 관리라면, 스웨디시는 전신을 부드럽고 고르게 풀어 편안함 자체를 우선합니다. 강한 시원함보다 잔잔한 이완을 원할 때 더 잘 맞습니다.",
    prepare: [
      "가벼운 식사 후 1시간 이상 지난 상태가 편안합니다.",
      "샤워가 가능한 환경이면 관리 전후 모두 정리하기 좋습니다.",
      "편안한 복장과 조용히 쉴 수 있는 공간을 준비해 주세요.",
      "관리 후 수분을 충분히 섭취하면 개운함이 오래갑니다.",
    ],
    check: [
      "오일 성분에 알레르기가 있으면 예약 시 미리 알려주세요.",
      "임신 중이거나 특정 질환이 있으면 사전에 알려주셔야 합니다.",
      "피부에 상처나 염증이 있는 부위는 피해서 진행합니다.",
      "음주 직후에는 컨디션을 위해 관리를 권하지 않습니다.",
    ],
    faqs: [
      { q: "스웨디시는 처음인데 아프지 않나요?", a: "스웨디시는 부드럽고 일정한 압을 기본으로 하므로 통증을 거의 느끼지 않습니다. 받는 동안 압이 약하거나 강하다고 느끼면 언제든 말씀해 주시면 바로 조절해 드립니다." },
      { q: "오일이 피부나 옷에 남지 않을까요?", a: "흡수가 잘 되는 오일을 사용하며, 관리 후 가볍게 닦아 드리거나 샤워로 정리하시면 됩니다. 남는 느낌이 부담스러우면 양을 줄여 진행할 수 있습니다." },
      { q: "어느 정도 시간을 받는 게 좋을까요?", a: "전신을 고르게 받으려면 60분 이상을 권하고, 깊은 이완과 충분한 마무리를 원하면 90분을 추천합니다. 처음이라면 60분으로 시작해 보셔도 좋습니다." },
      { q: "관리 후 바로 외출해도 되나요?", a: "가능합니다. 다만 이완된 직후에는 잠시 휴식하며 수분을 섭취한 뒤 움직이면 개운함이 더 오래 유지됩니다." },
      { q: "다른 관리와 함께 받을 수 있나요?", a: "시간 배분에 따라 스웨디시를 기본으로 하고 특정 부위만 조금 더 풀어 드리는 식의 조합도 가능합니다. 예약 시 원하시는 구성을 알려주세요." },
    ],
  },
  {
    slug: "aroma",
    name: "아로마테라피",
    short: "향과 부드러운 터치로 신체적 피로와 함께 심리적 이완까지 돕는 향기 기반 릴랙스 관리",
    intro:
      "아로마테라피는 식물성 에센셜 오일의 향을 활용해 부드러운 터치와 함께 심신의 이완을 돕는 관리입니다. 신체적 피로뿐 아니라 긴장으로 머리가 무겁고 마음이 복잡할 때, 향과 분위기를 통해 전반적인 컨디션을 가라앉히는 데 초점을 둡니다. 코코마사지는 시작 전 선호하는 향을 함께 고르고, 향의 농도와 손동작의 세기를 취향에 맞춰 조절합니다.",
    intro2:
      "향은 사람마다 느끼는 편안함이 다르기 때문에, 차분한 라벤더 계열부터 산뜻한 시트러스 계열까지 컨디션과 기분에 맞춰 선택할 수 있습니다. 부드럽고 느린 손동작은 호흡을 천천히 가라앉히고, 잠들기 전처럼 몸과 마음을 정리하고 싶은 분께 잘 맞습니다. 향을 이용한 이완 관리이지 특정 효능을 보장하는 의료 행위가 아니므로, 편안한 휴식을 위한 관리로 이해해 주시면 좋습니다.",
    forWhom: [
      "스트레스로 긴장이 쉽게 풀리지 않을 때",
      "향과 함께 편안한 분위기에서 이완하고 싶을 때",
      "잠들기 전 몸과 마음을 가라앉히고 싶은 경우",
      "강한 자극보다 잔잔하고 부드러운 관리를 원하는 경우",
      "여행이나 출장 중 낯선 환경에서 컨디션을 정리하고 싶을 때",
    ],
    features: [
      "취향과 컨디션에 맞춘 향 선택",
      "호흡 리듬에 맞춘 느리고 부드러운 손동작",
      "심리적 이완에 초점을 둔 차분한 분위기 조성",
      "향의 농도를 약하게도 조절 가능",
      "두피·목 주변까지 가볍게 정리하는 마무리",
    ],
    flow:
      "먼저 선호하는 향을 함께 고르고 향에 민감한지 확인합니다. 이어서 호흡 리듬에 맞춰 느리고 부드러운 동작으로 전신을 풀어가며, 어깨와 등처럼 긴장이 쌓인 부위에 조금 더 시간을 둡니다.",
    flow2:
      "마무리에는 두피와 목 주변을 가볍게 정리해 머리가 무거운 느낌을 덜어 드립니다. 전체적으로 자극을 낮추고 분위기를 차분하게 유지하는 것이 핵심이라, 받는 동안 편안하게 눈을 감고 쉬셔도 됩니다.",
    strength:
      "아로마테라피는 강한 압보다 부드러운 터치가 기본입니다. 향이 강하다고 느끼면 농도를 낮추고, 더 차분한 향으로 바꾸는 것도 가능하니 진행 중에도 편하게 말씀해 주세요.",
    times:
      "향을 충분히 느끼며 이완하려면 60분 이상이 적당하고, 분위기까지 여유 있게 즐기려면 90분을 권합니다. 짧은 시간보다 어느 정도 길게 받을 때 이완감이 더 잘 살아납니다.",
    diff:
      "스포츠마사지나 딥티슈가 근육을 직접적으로 다룬다면, 아로마테라피는 향과 부드러운 손길로 분위기와 심리적 이완에 무게를 둡니다. 시원함보다 편안함과 안정감을 원할 때 더 잘 맞습니다.",
    prepare: [
      "선호하거나 피하고 싶은 향이 있으면 미리 알려주세요.",
      "향에 민감하면 농도를 약하게 조절해 드립니다.",
      "조용히 쉴 수 있는 공간이면 분위기를 살리기 좋습니다.",
      "관리 후에는 잠시 휴식하며 향의 여운을 즐기시길 권합니다.",
    ],
    check: [
      "특정 향이나 식물에 알레르기가 있으면 반드시 사전에 알려주세요.",
      "임신 중에는 사용 가능한 향이 제한될 수 있어 상담이 필요합니다.",
      "호흡기에 민감함이 있으면 향을 약하게 진행합니다.",
      "두통이 심한 날에는 강한 향을 피하는 것이 좋습니다.",
    ],
    faqs: [
      { q: "향을 직접 고를 수 있나요?", a: "네, 차분한 라벤더 계열부터 산뜻한 시트러스 계열까지 컨디션과 취향에 맞춰 선택하실 수 있습니다. 잘 모르시면 운영팀이 무난한 향을 추천해 드립니다." },
      { q: "향이 너무 강하면 어떡하죠?", a: "향의 농도는 약하게 조절할 수 있고, 진행 중에도 부담스러우면 바로 줄이거나 다른 향으로 바꿔 드립니다. 편하게 말씀해 주세요." },
      { q: "임신 중에도 받을 수 있나요?", a: "임신 시기에 따라 권장되지 않는 향과 자세가 있어 사전 상담이 필요합니다. 예약 시 임신 사실과 주수를 꼭 알려주세요." },
      { q: "향이 옷이나 머리카락에 배지 않나요?", a: "사용량을 조절하면 향이 과하게 남지 않습니다. 외출 일정이 있으면 미리 알려주시면 잔향이 적게 마무리해 드립니다." },
      { q: "아로마와 스웨디시 중 무엇이 더 좋나요?", a: "전신을 고르게 풀고 싶으면 스웨디시, 향과 분위기로 마음까지 가라앉히고 싶으면 아로마테라피가 잘 맞습니다. 컨디션을 알려주시면 추천해 드립니다." },
    ],
  },
  {
    slug: "deep-tissue",
    name: "딥티슈",
    short: "표층보다 깊은 근육층을 겨냥해 단단하게 뭉친 특정 부위를 집중적으로 풀어주는 강도 높은 관리",
    intro:
      "딥티슈는 표면보다 깊은 근육층을 겨냥해 특정 부위의 뭉침을 집중적으로 풀어주는 관리입니다. 같은 자세를 오래 유지하거나 반복적인 작업으로 어깨·목·허리가 단단하게 느껴지는 분께 적합합니다. 코코마사지는 통증을 참게 하는 방식이 아니라, 시원하다고 느끼는 범위 안에서 압을 단계적으로 높여 가며 진행합니다.",
    intro2:
      "딥티슈의 핵심은 무작정 강하게 누르는 것이 아니라, 풀어야 할 부위 주변을 충분히 이완한 뒤 깊은 압으로 집중하는 데 있습니다. 그래서 같은 강도라도 훨씬 시원하게 느껴지고, 뻐근함이 남는 부담은 줄어듭니다. 다만 깊게 다룬 부위는 다음 날 가벼운 뻐근함이 있을 수 있어, 충분한 수분 섭취와 휴식을 함께 안내드립니다.",
    forWhom: [
      "어깨·목·허리 특정 부위가 단단하게 뭉친 경우",
      "강한 압을 선호하고 시원한 느낌을 원하는 경우",
      "장시간 같은 자세로 일하는 사무·운전 직군",
      "운동 후 특정 부위가 무겁게 느껴지는 경우",
      "부드러운 관리로는 시원함이 부족하다고 느끼는 경우",
    ],
    features: [
      "깊은 근육층을 겨냥한 단계적인 강한 압",
      "불편한 부위를 중심으로 한 집중 관리",
      "주변부를 먼저 이완한 뒤 압을 높이는 진행",
      "부위별로 강도를 다르게 조절",
      "관리 후 관리 부위 안내와 수분 섭취 권장",
    ],
    flow:
      "먼저 가장 불편한 부위를 확인하고, 그 주변 근육을 충분히 풀어 긴장을 낮춥니다. 이후 점진적으로 압을 높여 집중 부위의 깊은 층을 다루며, 호흡에 맞춰 강도를 조절합니다.",
    flow2:
      "한 부위에 머무는 시간이 길어 시원함이 깊게 느껴지며, 통증이 느껴지는 강도까지 무리하게 진행하지 않습니다. 마무리에는 다룬 부위를 가볍게 정리해 자극을 가라앉힙니다.",
    strength:
      "딥티슈는 강한 압을 사용하지만 통증을 참아야 하는 관리가 아닙니다. 시원한 정도를 기준으로 압을 맞추며, 너무 세다고 느끼면 바로 줄입니다. 부위마다 다른 강도로 조절할 수 있습니다.",
    times:
      "특정 부위 집중은 60분이면 충분하고, 전신을 깊게 다루거나 여러 부위를 풀고 싶다면 90분 이상을 권합니다. 집중 부위가 많을수록 시간을 넉넉히 잡는 것이 좋습니다.",
    diff:
      "스웨디시가 전신을 부드럽게 풀어준다면, 딥티슈는 단단하게 뭉친 특정 부위를 깊게 다루는 데 집중합니다. 잔잔한 이완보다 확실한 시원함을 원할 때 더 잘 맞습니다.",
    prepare: [
      "집중적으로 풀고 싶은 부위를 미리 정리해 두면 좋습니다.",
      "관리 후 가벼운 뻐근함이 있을 수 있어 수분 섭취를 권합니다.",
      "가벼운 식사 후 시간을 두고 받는 것이 편안합니다.",
      "다음 날 큰 일정이 있으면 강도를 조절해 드립니다.",
    ],
    check: [
      "급성 통증이나 부상 부위는 강한 압을 피해야 하므로 알려주세요.",
      "디스크 등 척추 질환이 있으면 압 조절을 위해 상담이 필요합니다.",
      "최근 수술·시술 이력이 있으면 사전에 알려주셔야 합니다.",
      "멍이 잘 드는 체질이면 강도를 낮춰 진행합니다.",
    ],
    faqs: [
      { q: "딥티슈는 많이 아픈가요?", a: "깊은 압을 사용하지만 통증을 참아야 하는 관리가 아닙니다. 시원한 정도를 유지하도록 압을 조절하니, 너무 세다고 느끼면 편하게 말씀해 주세요." },
      { q: "관리 후 뻐근한 건 정상인가요?", a: "깊게 풀어준 부위는 다음 날 가벼운 뻐근함이 있을 수 있습니다. 충분한 수분 섭취와 휴식이 도움이 되며, 보통 하루 이틀이면 가라앉습니다." },
      { q: "특정 부위만 집중해서 받을 수 있나요?", a: "네, 어깨와 목처럼 불편한 부위를 중심으로 시간을 배분해 진행할 수 있습니다. 예약 시 가장 불편한 부위를 알려주시면 됩니다." },
      { q: "멍이 들 수도 있나요?", a: "강한 압으로 진행하면 드물게 가벼운 자국이 남을 수 있어, 멍이 잘 드는 체질이면 미리 알려주시면 강도를 낮춰 진행합니다." },
      { q: "딥티슈와 스포츠마사지는 어떻게 다른가요?", a: "딥티슈는 뭉친 부위를 깊게 푸는 데 집중하고, 스포츠마사지는 활동 근육의 피로 관리와 컨디션 조절에 무게를 둡니다. 목적에 따라 추천해 드립니다." },
    ],
  },
  {
    slug: "thai",
    name: "타이마사지",
    short: "오일 없이 편한 복장으로 진행하며 스트레칭과 지압을 결합해 몸의 가동 범위를 넓혀주는 관리",
    intro:
      "타이마사지는 오일 없이 편안한 복장으로 진행하며, 스트레칭과 지압을 결합해 몸 전체의 유연성과 가동 범위를 살리는 데 중점을 둡니다. 뻣뻣하게 굳은 느낌을 풀고 시원하게 늘려 주는 관리를 원하는 분께 잘 맞습니다. 코코마사지는 가동 범위 안에서 호흡에 맞춰 천천히 진행하므로 무리 없이 받을 수 있습니다.",
    intro2:
      "오래 앉아 있거나 운동이 부족해 몸이 굳어 있는 경우, 단순히 근육을 문지르는 것만으로는 시원함이 부족할 수 있습니다. 타이마사지는 눌러 주고 늘려 주는 동작을 번갈아 진행해 관절 주변과 근육을 함께 풀어, 움직임이 한결 가벼워진 느낌을 줍니다. 무리한 스트레칭이 아니라 각자의 유연성 범위 안에서 진행하는 웰니스 관리입니다.",
    forWhom: [
      "몸이 뻣뻣하고 가동 범위가 좁게 느껴질 때",
      "스트레칭처럼 시원하게 늘려 주는 관리를 원할 때",
      "오일 사용을 선호하지 않는 경우",
      "오래 앉아 있어 다리와 골반 주변이 굳은 경우",
      "운동 전후 몸을 풀고 싶은 경우",
    ],
    features: [
      "오일 없이 편한 복장으로 진행",
      "스트레칭과 지압을 결합한 동작",
      "관절 가동 범위를 살리는 데 초점",
      "호흡에 맞춘 느린 진행으로 무리 최소화",
      "발·다리부터 상체로 이어지는 흐름",
    ],
    flow:
      "발과 다리부터 시작해 점차 상체로 올라가며, 호흡에 맞춰 지압과 스트레칭을 번갈아 진행합니다. 굳어 있는 부위는 주변을 먼저 풀고 천천히 늘려 가동 범위를 넓힙니다.",
    flow2:
      "스트레칭은 각자의 유연성 범위 안에서만 진행하며, 당기는 느낌이 불편하면 바로 강도를 줄입니다. 마무리에는 전신을 가볍게 정리해 늘어난 부위가 편안하게 안정되도록 돕습니다.",
    strength:
      "타이마사지는 통증을 참는 관리가 아닙니다. 스트레칭은 시원하게 당기는 정도까지만 진행하며, 관절이나 근육에 무리가 느껴지면 즉시 조절합니다. 평소 유연성을 알려주시면 강도를 맞추기 쉽습니다.",
    times:
      "스트레칭 흐름을 충분히 경험하려면 60분 이상이 적당하고, 전신을 여유 있게 늘려 주려면 90분을 권합니다. 굳은 부위가 많을수록 시간을 넉넉히 잡는 것이 좋습니다.",
    diff:
      "오일 마사지가 근육을 문질러 풀어준다면, 타이마사지는 늘려 주고 눌러 주는 동작으로 가동 범위를 살리는 데 집중합니다. 시원하게 늘어나는 느낌을 원할 때 더 잘 맞습니다.",
    prepare: [
      "움직임이 편한 복장을 준비해 주세요. 필요하면 복장을 안내해 드립니다.",
      "식사 직후보다는 어느 정도 소화된 상태가 편합니다.",
      "평소 유연성이나 불편한 관절이 있으면 알려주세요.",
      "관리 후 가벼운 스트레칭을 이어가면 효과가 오래갑니다.",
    ],
    check: [
      "관절·인대 부상이 있으면 스트레칭 강도 조절을 위해 알려주세요.",
      "최근 수술 이력이 있으면 사전 상담이 필요합니다.",
      "디스크나 척추 질환이 있으면 자세를 조절해 진행합니다.",
      "임신 중에는 가능한 자세가 제한되어 사전 안내가 필요합니다.",
    ],
    faqs: [
      { q: "타이마사지도 옷을 벗어야 하나요?", a: "아니요. 움직임이 편한 복장을 입은 채로 진행합니다. 마땅한 복장이 없으면 편한 복장을 안내해 드립니다." },
      { q: "스트레칭이 무리되지 않을까요?", a: "각자의 가동 범위 안에서 호흡에 맞춰 천천히 진행하며, 당기는 느낌이 불편하면 바로 강도를 줄입니다. 무리하게 늘리지 않습니다." },
      { q: "운동을 안 해도 받을 수 있나요?", a: "네, 오히려 평소 몸이 굳어 있는 분께 가동 범위를 넓혀 주는 데 도움이 됩니다. 유연성이 부족해도 그에 맞춰 진행합니다." },
      { q: "오일 마사지보다 시원한가요?", a: "느낌이 다릅니다. 문질러 푸는 시원함보다 늘어나고 뚫리는 듯한 시원함을 선호하면 타이마사지가 잘 맞습니다." },
      { q: "관리 시간 동안 계속 움직여야 하나요?", a: "관리사가 자세를 잡아 드리므로 힘을 빼고 맡기시면 됩니다. 호흡만 편하게 따라오시면 무리 없이 진행됩니다." },
    ],
  },
  {
    slug: "sports",
    name: "스포츠마사지",
    short: "운동이나 활동량이 많은 분의 근육 피로 관리와 컨디션 조절에 초점을 둔 관리",
    intro:
      "스포츠마사지는 운동이나 활동량이 많은 분의 근육 피로를 관리하는 데 초점을 둔 관리입니다. 운동 전후 컨디션 관리나, 반복 사용으로 무거워진 부위를 풀어 주는 데 적합합니다. 코코마사지는 주로 사용하는 부위와 운동 패턴을 먼저 확인한 뒤, 해당 근육군을 중심으로 강도를 맞춰 진행합니다.",
    intro2:
      "꾸준히 운동하는 분은 특정 근육에 피로가 반복적으로 쌓이기 쉽고, 이를 방치하면 컨디션이 떨어지기 쉽습니다. 스포츠마사지는 활동 근육을 중심으로 풀어 주고 가벼운 스트레칭을 더해 몸이 회복되는 느낌을 돕습니다. 부상 치료나 재활을 대신하는 의료 행위가 아니라, 활동 피로를 관리하는 웰니스 관리라는 점을 안내드립니다.",
    forWhom: [
      "규칙적으로 운동하며 근육 피로가 쌓이는 경우",
      "운동 후 회복 차원의 관리를 원할 때",
      "특정 부위를 반복적으로 사용하는 활동을 하는 경우",
      "장시간 서서 일해 다리와 허리가 무거운 경우",
      "활동 전 몸을 가볍게 풀어 두고 싶은 경우",
    ],
    features: [
      "활동 근육 중심의 부위별 관리",
      "운동 전후 컨디션을 고려한 강도 조절",
      "가벼운 스트레칭 동작 병행",
      "반복 사용 부위에 대한 집중 관리",
      "관리 후 수분 섭취·휴식 안내",
    ],
    flow:
      "주로 사용하는 부위와 최근 운동 강도를 확인한 뒤, 해당 근육군을 중심으로 풀어 줍니다. 무거운 부위는 충분히 이완하고, 필요에 따라 가벼운 스트레칭을 더합니다.",
    flow2:
      "운동 직전에는 가볍게 풀어 활동을 돕고, 운동 후에는 피로가 쌓인 부위를 차분히 정리하는 식으로 목적에 맞게 진행합니다. 강도는 컨디션과 다음 일정에 맞춰 조절합니다.",
    strength:
      "스포츠마사지의 강도는 목적에 따라 달라집니다. 운동 전에는 가볍게, 회복 목적에는 조금 더 단단하게 진행하며, 통증을 참는 수준까지 무리하게 누르지 않습니다.",
    times:
      "특정 부위 회복은 60분, 전신 컨디션 관리나 여러 부위를 함께 풀려면 90분을 권합니다. 대회나 활동 일정이 가깝다면 시간과 강도를 함께 조절합니다.",
    diff:
      "릴랙스 위주의 스웨디시와 달리, 스포츠마사지는 활동 근육의 피로 관리와 컨디션 조절에 무게를 둡니다. 딥티슈와 비슷한 강도를 쓰되 활동 패턴을 더 고려하는 점이 다릅니다.",
    prepare: [
      "최근 운동 강도와 주로 쓰는 부위를 알려주시면 도움이 됩니다.",
      "관리 후 충분한 수분 섭취를 권합니다.",
      "다음 활동 일정이 있으면 미리 알려주세요.",
      "통증이 있는 부위가 있으면 사전에 구분해 주세요.",
    ],
    check: [
      "부상 직후나 급성 염증 부위는 피해야 하므로 알려주세요.",
      "대회·시합 직전이라면 강도 조절을 위해 미리 상담해 주세요.",
      "관절 통증이 있으면 해당 부위는 조심해서 진행합니다.",
      "최근 무리한 운동으로 통증이 심하면 휴식을 먼저 권합니다.",
    ],
    faqs: [
      { q: "운동선수만 받는 관리인가요?", a: "아닙니다. 규칙적으로 운동하거나 활동량이 많아 근육이 무거운 분이라면 누구나 적합합니다. 서서 일하는 분께도 도움이 됩니다." },
      { q: "운동 직후 바로 받아도 되나요?", a: "가능하지만 격렬한 운동 직후에는 잠시 회복한 뒤 받는 것이 더 편안합니다. 상황을 알려주시면 그에 맞게 강도를 맞춥니다." },
      { q: "특정 부위만 집중할 수 있나요?", a: "네, 주로 사용하는 부위를 중심으로 시간을 배분해 진행할 수 있습니다. 예약 시 가장 피로한 부위를 알려주세요." },
      { q: "대회 전에 받아도 괜찮나요?", a: "대회 직전에는 강한 자극보다 가볍게 푸는 편이 좋습니다. 일정을 알려주시면 컨디션에 맞춰 부드럽게 진행합니다." },
      { q: "스포츠마사지도 스트레칭을 하나요?", a: "네, 필요에 따라 가벼운 스트레칭을 더해 가동 범위를 정리합니다. 다만 타이마사지처럼 스트레칭 중심은 아닙니다." },
    ],
  },
  {
    slug: "lymphatic",
    name: "림프마사지",
    short: "매우 약하고 느린 손길로 몸의 순환을 돕고 가벼운 느낌을 주는 데 초점을 둔 부드러운 관리",
    intro:
      "림프마사지는 매우 부드럽고 느린 손길로 몸의 순환을 돕고 가벼운 느낌을 주는 데 초점을 둔 관리입니다. 자극보다 편안함을 우선하며, 오래 앉거나 서 있어 다리가 붓고 무거운 느낌으로 컨디션이 처질 때 선택하기 좋습니다. 코코마사지는 순환 방향을 고려한 부드러운 흐름으로 무리 없이 진행합니다.",
    intro2:
      "강한 압을 사용하는 관리가 부담스럽거나, 자극이 적고 잔잔한 관리를 원하는 분께 림프마사지가 잘 맞습니다. 다리와 팔처럼 무겁게 느껴지는 부위를 중심으로 느린 동작을 반복해 가벼움을 더하고, 받는 동안에도 편안하게 쉴 수 있습니다. 질환을 치료하거나 체중을 줄이는 의료·미용 시술이 아니라, 컨디션을 가볍게 정리하는 웰니스 관리입니다.",
    forWhom: [
      "오래 앉거나 서 있어 다리가 무겁게 느껴질 때",
      "전반적으로 몸이 붓고 무거운 느낌이 들 때",
      "자극이 적고 부드러운 관리를 선호하는 경우",
      "강한 압이 부담스러운 경우",
      "장시간 이동이나 비행 후 컨디션을 정리하고 싶을 때",
    ],
    features: [
      "매우 약하고 느린 손동작",
      "순환 방향을 고려한 부드러운 흐름",
      "편안함을 최우선으로 한 진행",
      "다리·팔 등 무거운 부위 중심 관리",
      "자극이 적어 누구나 부담 없는 강도",
    ],
    flow:
      "다리와 팔 등 무겁게 느껴지는 부위를 중심으로 느리고 부드러운 동작을 반복합니다. 순환 방향을 고려해 일정한 리듬으로 진행하며, 전신을 가볍게 정리합니다.",
    flow2:
      "압이 거의 느껴지지 않을 만큼 부드럽게 진행하므로 자극에 예민한 분도 편안하게 받을 수 있습니다. 마무리에는 호흡을 고르며 몸이 가벼워진 느낌이 자리 잡도록 돕습니다.",
    strength:
      "림프마사지는 강한 압을 쓰지 않습니다. 약하고 느린 손길이 기본이며, 더 부드럽게 원하시면 그에 맞춰 진행합니다. 시원함보다 편안함과 가벼움을 목적으로 하는 관리입니다.",
    times:
      "부드러운 관리 특성상 충분한 효과를 위해 60분 이상을 권하고, 전신을 여유 있게 정리하려면 90분이 적당합니다. 짧은 시간보다 길게 받을 때 가벼운 느낌이 잘 살아납니다.",
    diff:
      "딥티슈·스포츠마사지가 강한 압을 사용한다면, 림프마사지는 매우 약한 압으로 순환과 가벼움에 집중합니다. 시원한 자극보다 잔잔한 편안함을 원할 때 더 잘 맞습니다.",
    prepare: [
      "관리 전후로 수분을 충분히 섭취하면 좋습니다.",
      "조이지 않는 편한 복장이 편안합니다.",
      "무거운 식사 직후는 피하는 것이 좋습니다.",
      "무겁게 느껴지는 부위를 미리 알려주세요.",
    ],
    check: [
      "급성 염증·발열이 있을 때는 권하지 않으므로 알려주세요.",
      "순환계 관련 질환이 있으면 미리 상담이 필요합니다.",
      "임신 중에는 가능한 자세와 강도가 제한될 수 있습니다.",
      "최근 수술 부위가 있으면 해당 부위는 피해서 진행합니다.",
    ],
    faqs: [
      { q: "림프마사지는 왜 이렇게 부드럽나요?", a: "강한 압보다 약하고 느린 손길이 순환을 돕는 데 적합하기 때문입니다. 자극이 적어 예민한 분도 편안하게 받을 수 있습니다." },
      { q: "다리만 집중해서 받을 수 있나요?", a: "네, 다리처럼 무겁게 느껴지는 부위를 중심으로 진행할 수 있습니다. 예약 시 가장 무거운 부위를 알려주세요." },
      { q: "효과를 위해 얼마나 자주 받아야 하나요?", a: "컨디션에 따라 다르며, 무거운 느낌이 반복될 때 주기적으로 받으면 도움이 됩니다. 다만 무리한 빈도를 권하지는 않습니다." },
      { q: "체중 감량에 도움이 되나요?", a: "림프마사지는 체중을 줄이는 시술이 아니라 컨디션을 가볍게 정리하는 웰니스 관리입니다. 과장된 효과를 약속드리지 않습니다." },
      { q: "비행이나 장거리 이동 후에 받아도 되나요?", a: "오래 앉아 있어 다리가 무거운 경우 부담 없이 받기 좋은 관리입니다. 이동으로 피곤한 날에도 자극이 적어 편안합니다." },
    ],
  },
];


// ───────────────────────────────────────────────────────────────────────────
// 5. 데이터: 시도 단위 지역
// ───────────────────────────────────────────────────────────────────────────
const REGIONS = [
  { slug: "seoul", name: "서울",
    lead: "퇴근 이후 오피스텔·호텔 문의가 많아 공동현관·주차·프런트 규정 확인이 특히 중요한 지역입니다.",
    intro2: "서울은 업무권과 주거권이 촘촘히 섞여 있어 같은 구 안에서도 권역마다 이용 상황이 크게 다릅니다. 업무 밀집 권역은 퇴근 이후·심야 문의가, 대단지 주거권은 낮 시간 문의가 많습니다.",
    traits: "25개 구가 각각 다른 생활권을 가져, 구별 안내 페이지에서 권역별 확인 사항을 구분합니다.",
    move: "지하철 접근성은 좋지만 퇴근 시간대 도심 정체가 변수라, 정확한 위치와 희망 시간을 알려주시면 좋습니다.",
    zones: [
      { n: "동남권(강남·서초·송파)", d: "업무 오피스텔과 대단지 주거가 함께 있어 퇴근 후·주거권 문의가 모두 많은 권역" },
      { n: "도심권(중구·종로·용산)", d: "호텔과 오피스권이 밀집해 프런트 방문객 규정 확인이 중요한 권역" },
      { n: "서남권(영등포·구로·강서)", d: "여의도·디지털단지 업무권과 주거권이 인접해 야근 후 문의가 잦은 권역" },
      { n: "북부권(노원·은평·성북)", d: "대단지 아파트와 구릉지 주거가 섞여 단지 동선 확인이 필요한 권역" },
    ],
    building: "오피스텔·호텔은 공동현관 비밀번호, 주차 가능 여부, 프런트 방문객 규정을 미리 확인해야 방문이 원활합니다.",
    parking: "도심 권역은 방문자 주차가 제한적인 경우가 많아, 인근 주차 가능 여부를 함께 확인하면 도착이 수월합니다.",
    timing: "퇴근 시간대(오후 6~8시)와 심야에는 도심 정체와 예약 집중으로 가능 시간이 빠르게 마감될 수 있어 여유 있게 문의하시길 권합니다.",
    fee: "서울 시내는 권역 간 이동이 비교적 가깝지만, 심야 시간대나 외곽 접경 지역은 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "장시간 앉아 일하는 직장인이 많아 어깨·목 집중 관리를 많이 찾습니다." },
      { n: "스웨디시", why: "야근 후 전신을 부드럽게 풀고 싶을 때 부담 없이 선택하는 관리입니다." },
      { n: "아로마테라피", why: "호텔·숙소에서 분위기까지 가라앉히고 싶을 때 잘 맞습니다." },
    ],
    tips: ["방문지가 오피스텔·호텔이면 공동현관 출입 방법을 알려주세요.", "퇴근·심야 시간대는 예약이 몰리니 미리 연락 주세요.", "정확한 구·동과 건물 유형을 알려주시면 가능 시간 안내가 빠릅니다."],
    faqs: [
      { q: "서울 어느 지역까지 출장이 되나요?", a: "서울 25개 구 전역으로 안내가 가능하며, 구별 안내 페이지에서 권역별 확인 사항을 보실 수 있습니다. 정확한 위치를 알려주시면 가능 시간을 안내해 드립니다." },
      { q: "오피스텔도 방문이 가능한가요?", a: "가능합니다. 다만 공동현관 출입 방법과 주차 가능 여부를 예약 시 알려주시면 방문이 원활합니다." },
      { q: "심야에도 예약할 수 있나요?", a: "심야 예약은 가능 여부와 안내가 달라질 수 있어 사전에 확인해 드립니다. 시간대가 몰리는 편이라 여유 있게 연락 주세요." },
      { q: "호텔에서 받을 때 주의할 점이 있나요?", a: "호텔은 외부인 방문 규정이 있을 수 있어, 객실 방문 가능 여부를 프런트에 미리 확인해 주시면 좋습니다." },
    ] },
  { slug: "gyeonggi", name: "경기",
    lead: "도시별 생활권 차이가 커서 같은 경기권이라도 이동 시간과 예약 조건이 크게 달라지는 지역입니다.",
    intro2: "경기도는 신도시 아파트 단지, 산업단지, 구도심이 도시마다 다른 비율로 섞여 있습니다. 분당·일산 같은 신도시는 대단지 아파트 동선 확인이 핵심이고, 외곽 도시는 이동 거리가 변수로 작용합니다.",
    traits: "도시 간 거리가 멀어 출발지와 목적지에 따라 가능 시간이 달라지므로, 코코마사지는 주요 도시별로 안내 페이지를 구분합니다.",
    move: "도시 간 거리가 멀어 출발지와 목적지에 따라 이동 시간을 함께 확인해야 정확한 가능 시간을 안내할 수 있습니다.",
    zones: [
      { n: "성남·용인(분당·수지)", d: "판교·분당 업무권과 대단지 주거권이 함께 있어 출퇴근 정체가 변수인 권역" },
      { n: "수원·화성", d: "영통 업무권과 구도심 상권, 신도시 단지가 섞인 권역" },
      { n: "고양·파주", d: "일산 신도시 대단지와 구도심이 섞여 단지 동선 확인이 중요한 권역" },
      { n: "안양·부천", d: "주거 밀집권으로 빌라·아파트 진입로와 주차 확인이 필요한 권역" },
    ],
    building: "대단지 아파트는 단지 입구, 동 호수, 지상·지하 주차 동선을 미리 확인하는 것이 좋습니다.",
    parking: "신도시 단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 도착이 수월합니다.",
    timing: "도시별 출퇴근 시간대 정체가 다르고 도시 간 이동이 길어, 희망 시간보다 여유를 두고 예약하면 조율이 쉽습니다.",
    fee: "경기도는 도시 간 거리가 커서 외곽이나 장거리 지역은 이동 조건에 따라 출장비가 달라질 수 있어, 위치 확인 후 사전에 안내합니다.",
    rec: [
      { n: "스웨디시", why: "신도시 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "판교·광교 등 업무권 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리로 선호됩니다." },
    ],
    tips: ["대단지 아파트는 동 호수와 방문자 주차 방법을 알려주세요.", "도시 간 이동이 길 수 있어 여유 있게 예약해 주세요.", "정확한 시·구·동을 알려주시면 가능 여부 확인이 빠릅니다."],
    faqs: [
      { q: "경기도는 도시가 많은데 모두 가능한가요?", a: "주요 도시 위주로 안내가 가능하며, 도시별 이동 시간이 달라 예약 시 정확한 위치를 알려주시면 가능 여부를 빠르게 확인해 드립니다." },
      { q: "외곽 지역은 출장비가 다른가요?", a: "이동 거리에 따라 출장비가 달라질 수 있어, 위치 확인 후 사전에 안내해 드립니다." },
      { q: "신도시 아파트도 방문되나요?", a: "가능합니다. 단지가 넓어 동 호수와 방문자 주차 방법을 알려주시면 방문이 원활합니다." },
      { q: "당일 예약도 가능한가요?", a: "가능 시간이 있으면 당일도 안내해 드리지만, 도시 간 이동이 길 수 있어 여유 있게 연락 주시면 좋습니다." },
    ] },
  { slug: "incheon", name: "인천",
    lead: "공항·항만·국제도시 일정이 변수라 항공편 전후 여유 시간을 함께 확인하는 지역입니다.",
    intro2: "인천은 송도 국제도시, 구도심, 영종·공항 권역이 성격이 뚜렷하게 나뉩니다. 송도는 고층 주상복합 동선이, 공항 권역은 항공편 일정이 예약 가능 여부에 직접 영향을 줍니다.",
    traits: "권역별로 건물 유형과 이동 조건이 달라, 코코마사지는 연수·남동·서구 등 주요 권역을 구분해 안내합니다.",
    move: "교량·공항철도 이동 시간이 예약 가능 여부에 영향을 주므로, 항공편이나 일정 전후의 여유 시간을 함께 확인합니다.",
    zones: [
      { n: "연수구(송도)", d: "고층 주상복합·오피스텔이 밀집해 공동현관과 주차 확인이 중요한 국제도시 권역" },
      { n: "남동구(구월·논현)", d: "행정 중심권과 주거권이 함께 있어 도심 시간대 정체를 고려하는 권역" },
      { n: "서구(청라·검단)", d: "신도시 대단지가 빠르게 성장한 권역으로 동 호수·주차 확인이 핵심" },
      { n: "중구(영종·공항)", d: "공항·호텔 권역으로 항공편 일정과 체크인 시간을 함께 보는 권역" },
    ],
    building: "공항 인근·호텔 숙소는 항공편 일정과 체크인·아웃 시간을 함께 확인해야 방문 시간을 맞출 수 있습니다.",
    parking: "송도·청라 고층 단지는 방문자 주차 등록이 필요한 경우가 많아 미리 확인하면 좋습니다.",
    timing: "공항철도와 교량 이동 시간대에 따라 도착이 달라지므로, 항공편 전후로는 여유 시간을 넉넉히 잡는 것이 안전합니다.",
    fee: "공항·영종 권역이나 교량 이동이 필요한 지역은 이동 조건에 따라 추가 안내가 있을 수 있어, 위치 확인 후 사전에 안내합니다.",
    rec: [
      { n: "아로마테라피", why: "공항 인근 호텔에서 이동 피로와 분위기를 함께 가라앉히기 좋습니다." },
      { n: "스웨디시", why: "송도 주거권에서 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "림프마사지", why: "장거리 이동이나 비행 후 다리가 무거운 분께 적합합니다." },
    ],
    tips: ["공항 인근 호텔은 항공편과 체크인 시간을 알려주세요.", "송도·청라 고층 단지는 주차 등록 방법을 확인해 주세요.", "권역별 이동 시간이 달라 정확한 위치를 알려주시면 좋습니다."],
    faqs: [
      { q: "공항 근처 호텔도 방문되나요?", a: "가능합니다. 항공편 일정과 체크인 시간을 알려주시면 여유 시간을 고려해 안내해 드립니다." },
      { q: "송도와 구도심 모두 가능한가요?", a: "네, 권역별로 이동 시간이 달라 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "영종도까지도 출장이 되나요?", a: "이동 조건에 따라 가능 시간과 안내가 달라질 수 있어, 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "고층 주상복합도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 방문자 주차 등록 방법을 미리 알려주시면 방문이 원활합니다." },
    ] },
  { slug: "busan", name: "부산",
    lead: "관광 숙소와 성수기 이동 지연이 변수라 객실 방문 가능 여부와 해안도로 정체를 함께 확인합니다.",
    intro2: "부산은 해운대·광안리 관광권, 서면 업무권, 주거권이 명확히 구분됩니다. 관광권은 숙소 방문 규정이, 서면은 오피스텔 출입과 주차가 주요 확인 사항입니다.",
    traits: "권역마다 숙소 유형과 이동 조건이 달라, 코코마사지는 해운대·부산진·수영 등 권역을 구분해 안내합니다.",
    move: "성수기와 주말에는 해안도로 정체로 이동 시간이 길어질 수 있어, 시간을 여유 있게 잡는 것이 좋습니다.",
    zones: [
      { n: "해운대구", d: "해안 리조트·호텔과 센텀 업무권, 좌동 주거권이 함께 있는 권역" },
      { n: "부산진구(서면)", d: "서면 중심 상권·업무권과 주거권이 밀집해 출입·주차 확인이 중요한 권역" },
      { n: "수영구(광안리)", d: "광안리 관광권과 해안 주거권이 어우러진 권역" },
      { n: "동래·연제", d: "도심 주거권으로 아파트 동선과 주차 확인이 필요한 권역" },
    ],
    building: "관광 숙소·리조트는 객실 외부인 방문 규정을 미리 확인해야 방문이 가능합니다.",
    parking: "해안 관광권은 성수기 주차가 혼잡해, 숙소 주차 가능 여부를 미리 확인하면 도착이 수월합니다.",
    timing: "주말·성수기 해안도로 정체와 관광객 집중으로 이동이 길어질 수 있어, 희망 시간보다 여유를 두고 예약하시길 권합니다.",
    fee: "해안 관광권이나 외곽 지역은 성수기 이동 조건에 따라 추가 안내가 있을 수 있어, 위치 확인 후 사전에 안내합니다.",
    rec: [
      { n: "스웨디시", why: "여행 중 숙소에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "관광 일정의 피로와 긴장을 분위기까지 가라앉히기 좋습니다." },
      { n: "딥티슈", why: "장시간 이동·관광으로 무거워진 어깨와 다리 집중 관리에 적합합니다." },
    ],
    tips: ["관광 숙소는 외부인 방문 규정을 미리 확인해 주세요.", "성수기·주말은 이동 지연이 있으니 여유 있게 예약해 주세요.", "정확한 구·동과 숙소 유형을 알려주시면 좋습니다."],
    faqs: [
      { q: "관광 와서 숙소에서 받을 수 있나요?", a: "가능합니다. 다만 숙소의 외부인 방문 규정을 미리 확인해 주시면 방문이 원활합니다." },
      { q: "성수기에도 예약이 되나요?", a: "성수기에는 이동 지연이 있을 수 있어 여유 있게 예약해 주시면 안내가 수월합니다." },
      { q: "해운대·서면 모두 가능한가요?", a: "네, 권역별로 이동 조건이 달라 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "리조트도 방문되나요?", a: "리조트는 객실 방문 규정이 있을 수 있어, 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
    ] },
  { slug: "daegu", name: "대구",
    lead: "도심 업무권과 주거권이 분리되어 있어 권역에 따라 이동 동선이 달라지는 지역입니다.",
    intro2: "대구는 동성로 중심 도심권과 외곽 주거권의 성격이 뚜렷하게 다릅니다. 도심권은 오피스텔 출입과 주차가, 주거권은 아파트 단지 동선이 주요 확인 사항입니다.",
    traits: "도심 집중 구조라 시간대에 따라 이동 동선이 달라지므로, 위치와 희망 시간을 함께 확인합니다.",
    move: "도심 집중 시간대에는 정체가 있어, 가능 시간을 맞추기 위해 위치와 시간을 함께 조율합니다.",
    zones: [
      { n: "중구(동성로)", d: "도심 상권·오피스텔이 밀집해 출입·주차 확인이 중요한 권역" },
      { n: "수성구", d: "주거 선호권으로 대단지 아파트 동선과 주차 확인이 필요한 권역" },
      { n: "달서구", d: "대규모 주거권과 상권이 함께 있어 권역 폭이 넓은 권역" },
      { n: "북구·동구", d: "역세권과 주거권이 섞여 진입로 확인이 필요한 권역" },
    ],
    building: "도심 오피스텔은 공동현관 출입 방법과 주차 가능 여부를 미리 확인하면 방문이 원활합니다.",
    parking: "도심 권역은 방문자 주차가 제한적일 수 있어, 인근 주차 가능 여부를 함께 확인하면 좋습니다.",
    timing: "도심 집중 시간대 정체를 고려해, 원하는 시간이 있으면 하루 전 또는 당일 여유 있게 연락 주시면 조율이 수월합니다.",
    fee: "시내 권역은 이동이 비교적 가깝지만, 외곽 주거권이나 심야 시간대는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "도심·주거권 모두에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "사무 직군의 어깨·목 집중 관리에 적합합니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리로 선호됩니다." },
    ],
    tips: ["도심 오피스텔은 출입 방법과 주차를 알려주세요.", "원하는 시간대는 여유 있게 연락 주세요.", "정확한 구·동을 알려주시면 가능 여부 확인이 빠릅니다."],
    faqs: [
      { q: "대구 도심도 방문 가능한가요?", a: "가능합니다. 도심 오피스텔은 주차와 출입 방법을 알려주시면 방문이 원활합니다." },
      { q: "예약은 얼마나 미리 해야 하나요?", a: "원하는 시간대가 있다면 하루 전 또는 당일 여유 있게 연락 주시면 조율이 수월합니다." },
      { q: "수성구·달서구 모두 가능한가요?", a: "네, 권역별 이동 동선이 달라 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "심야 시간도 되나요?", a: "심야 예약은 가능 여부가 달라질 수 있어 사전에 확인해 드립니다." },
    ] },
  { slug: "daejeon", name: "대전",
    lead: "연구단지와 주거권, 역세권이 섞여 있어 방문 위치에 따라 이용 상황이 다른 지역입니다.",
    intro2: "대전은 둔산 업무권, 유성 연구·주거권, 역세권으로 권역이 나뉩니다. 둔산은 오피스권과 주거가 함께 있고, 유성은 연구단지와 관사 인근 출입 규정 확인이 필요합니다.",
    traits: "도시 규모가 적당해 권역 간 이동이 비교적 수월한 편이라, 위치만 명확하면 가능 시간을 안내하기 쉽습니다.",
    move: "권역 간 이동이 비교적 수월하지만, 출퇴근 시간대 둔산 일대 정체는 함께 고려합니다.",
    zones: [
      { n: "서구(둔산)", d: "업무권과 주거권이 함께 있어 퇴근 후 문의가 많은 권역" },
      { n: "유성구", d: "연구단지와 주거권, 관사 인근으로 출입 규정 확인이 필요한 권역" },
      { n: "중구·동구(역세권)", d: "대전역 일대 역세권과 구도심이 섞인 권역" },
      { n: "대덕구", d: "산업·주거권이 함께 있어 진입로 확인이 필요한 권역" },
    ],
    building: "연구단지·관사 인근은 출입 규정을 미리 확인하는 것이 좋고, 둔산 오피스텔은 주차와 출입 방법을 함께 확인합니다.",
    parking: "둔산 도심권은 방문자 주차가 제한적일 수 있어 인근 주차 여부를 함께 확인하면 좋습니다.",
    timing: "둔산 출퇴근 시간대 정체를 제외하면 권역 간 이동이 수월해, 비교적 폭넓은 시간대 안내가 가능합니다.",
    fee: "시내 권역은 이동이 가까운 편이며, 외곽이나 심야 시간대는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권·연구단지 거주자가 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "긴장을 분위기까지 가라앉히고 싶을 때 잘 맞습니다." },
      { n: "딥티슈", why: "사무·연구 직군의 어깨·목 집중 관리에 적합합니다." },
    ],
    tips: ["연구단지·관사 인근은 출입 규정을 미리 확인해 주세요.", "둔산 오피스텔은 주차와 출입 방법을 알려주세요.", "정확한 구·동을 알려주시면 가능 여부 확인이 빠릅니다."],
    faqs: [
      { q: "유성과 둔산 모두 가능한가요?", a: "네, 두 권역 모두 안내가 가능하며 위치를 알려주시면 이동 시간을 고려해 안내합니다." },
      { q: "출장비는 어떻게 되나요?", a: "권역과 거리에 따라 달라질 수 있어 위치 확인 후 사전에 안내해 드립니다." },
      { q: "연구단지 관사도 방문되나요?", a: "출입 규정이 있을 수 있어, 출입 방법과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "당일 예약도 가능한가요?", a: "가능 시간이 있으면 당일도 안내해 드리며, 권역 간 이동이 수월한 편이라 조율이 비교적 쉽습니다." },
    ] },
  { slug: "gwangju", name: "광주",
    lead: "도심 상권과 주거권이 비교적 가까워 권역 간 이동이 수월한 편의 지역입니다.",
    intro2: "광주는 상무지구 업무권과 구도심 상권, 주거권이 어우러져 있습니다. 상무지구는 오피스텔·호텔 출입과 주차가, 주거권은 아파트 단지 동선이 주요 확인 사항입니다.",
    traits: "도시 규모상 권역 간 이동 부담이 적은 편이라, 위치만 명확하면 폭넓은 시간대 안내가 가능합니다.",
    move: "권역 간 이동이 수월한 편이지만, 상무지구 출퇴근 시간대 정체는 함께 고려합니다.",
    zones: [
      { n: "서구(상무지구)", d: "업무권과 오피스텔·호텔이 밀집해 출입·주차 확인이 중요한 권역" },
      { n: "동구(구도심)", d: "충장로 일대 상권과 구도심 주거권이 섞인 권역" },
      { n: "북구", d: "대학가와 주거권이 함께 있어 진입로 확인이 필요한 권역" },
      { n: "광산구", d: "신도시 주거권과 산업권이 함께 있어 단지 동선 확인이 필요한 권역" },
    ],
    building: "상무지구 오피스텔·호텔은 주차와 출입 규정을 확인하고, 주거권은 동 호수와 진입로를 미리 알려주시면 좋습니다.",
    parking: "상무지구 도심권은 방문자 주차가 혼잡할 수 있어 인근 주차 여부를 함께 확인하면 좋습니다.",
    timing: "권역 간 이동이 수월해 비교적 폭넓은 시간대 안내가 가능하며, 상무지구 출퇴근 정체만 고려하면 조율이 쉽습니다.",
    fee: "시내 권역은 이동이 가까운 편이며, 외곽 주거권이나 심야 시간대는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권 거주자가 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "상무지구 업무권 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "호텔·숙소에서 긴장을 분위기까지 가라앉히기 좋습니다." },
    ],
    tips: ["상무지구 오피스텔·호텔은 출입 방법을 알려주세요.", "주거권은 동 호수와 진입로를 확인해 주세요.", "정확한 구·동을 알려주시면 가능 여부 확인이 빠릅니다."],
    faqs: [
      { q: "상무지구도 방문되나요?", a: "가능합니다. 오피스텔·호텔은 출입 방법을 알려주시면 방문이 원활합니다." },
      { q: "심야 시간도 예약 가능한가요?", a: "심야 예약은 가능 여부와 추가 안내가 달라질 수 있어 사전에 확인해 드립니다." },
      { q: "구도심도 가능한가요?", a: "네, 권역별 이동이 수월한 편이라 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "당일 예약도 되나요?", a: "가능 시간이 있으면 당일도 안내해 드리며, 권역 간 이동이 가까운 편이라 조율이 비교적 쉽습니다." },
    ] },
  { slug: "ulsan", name: "울산",
    lead: "산업단지 근무 패턴과 주거권이 뚜렷해 교대 근무 시간대 문의가 많은 지역입니다.",
    intro2: "울산은 산업단지 인근 주거권과 도심 상권의 생활 리듬이 다릅니다. 교대 근무로 시간대가 불규칙한 문의가 많아, 가능한 시간대를 알려주시면 그에 맞춰 안내합니다.",
    traits: "산업단지 근무 패턴이 뚜렷해 시간대 조율이 중요하며, 권역별 출입 규정도 함께 확인합니다.",
    move: "산업단지 출퇴근 시간대 정체를 고려해, 가능한 방문 시간대를 미리 확인합니다.",
    zones: [
      { n: "남구(삼산·달동)", d: "도심 상권과 오피스텔이 밀집해 출입·주차 확인이 필요한 권역" },
      { n: "중구", d: "구도심 주거권으로 아파트 동선과 진입로 확인이 필요한 권역" },
      { n: "동구", d: "조선·산업권 인근 주거권으로 교대 근무 문의가 많은 권역" },
      { n: "울주군", d: "외곽 주거·산업권으로 이동 거리를 함께 고려하는 권역" },
    ],
    building: "산업단지 인근 숙소·관사는 출입 규정 확인이 필요하고, 도심 오피스텔은 주차와 출입 방법을 함께 확인합니다.",
    parking: "도심권은 방문자 주차가 제한적일 수 있어 인근 주차 여부를 함께 확인하면 좋습니다.",
    timing: "교대 근무로 시간대가 불규칙한 경우가 많아, 가능한 시간대를 알려주시면 그에 맞춰 가능 여부를 안내합니다.",
    fee: "울주군 등 외곽이나 산업단지 접경 지역은 이동 조건에 따라 추가 안내가 있을 수 있어, 위치 확인 후 사전에 안내합니다.",
    rec: [
      { n: "스포츠마사지", why: "활동량이 많은 산업권 근무자의 근육 피로 관리에 적합합니다." },
      { n: "딥티슈", why: "반복 작업으로 무거워진 어깨·허리 집중 관리로 선호됩니다." },
      { n: "스웨디시", why: "교대 근무 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
    ],
    tips: ["교대 근무로 시간이 불규칙하면 가능한 시간대를 알려주세요.", "산업단지 인근 숙소는 출입 방법을 확인해 주세요.", "외곽 지역은 이동 거리가 있어 여유 있게 예약해 주세요."],
    faqs: [
      { q: "교대 근무라 시간이 불규칙한데 가능한가요?", a: "가능합니다. 가능한 시간대를 알려주시면 그에 맞춰 안내해 드립니다." },
      { q: "산업단지 인근도 방문되나요?", a: "네, 인근 주거권·숙소 모두 안내가 가능하며 출입 방법을 알려주시면 좋습니다." },
      { q: "울주군까지도 가능한가요?", a: "이동 거리가 있어 시간 조율이 필요하며, 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "새벽 시간대도 예약되나요?", a: "교대 근무 특성상 이른 시간 문의가 있는데, 가능 여부는 사전에 확인해 안내해 드립니다." },
    ] },
  { slug: "sejong", name: "세종",
    lead: "신도시 대단지 아파트와 관청 권역 중심이라 단지 동선 확인이 중요한 지역입니다.",
    intro2: "세종은 계획도시 특성상 대단지 아파트와 관청 권역이 정돈되어 있습니다. 단지 규모가 커서 동 호수와 방문자 주차 동선 확인이 방문의 핵심입니다.",
    traits: "계획도시라 권역 구분이 명확하지만 단지가 넓어, 정확한 동 호수를 알려주시면 도착이 수월합니다.",
    move: "단지 규모가 커서 동 사이 이동에도 시간이 걸리므로, 정확한 동 위치와 주차 동선을 함께 확인합니다.",
    zones: [
      { n: "한솔·도담동", d: "초기 입주 대단지로 동 호수와 방문자 주차 확인이 중요한 권역" },
      { n: "새롬·다정동", d: "신규 대단지 아파트가 밀집해 단지 동선 확인이 필요한 권역" },
      { n: "보람·소담동", d: "주거 단지와 상권이 함께 있어 진입로 확인이 필요한 권역" },
      { n: "정부청사 권역", d: "관청 인근으로 출입·주차 규정 확인이 필요한 권역" },
    ],
    building: "대단지는 방문자 주차 등록과 동 위치를 미리 확인하는 것이 좋고, 관청 권역은 출입 규정을 함께 확인합니다.",
    parking: "대단지 아파트는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 도착이 수월합니다.",
    timing: "도시 규모가 크지 않아 권역 간 이동은 수월하지만, 단지 내부 이동 시간을 감안해 여유를 두면 좋습니다.",
    fee: "시내 권역은 이동이 가까운 편이며, 인근 도시 접경이나 심야 시간대는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "대단지 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "긴장을 분위기까지 가라앉히고 싶을 때 잘 맞습니다." },
      { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
    ],
    tips: ["대단지는 동 호수와 방문자 주차 방법을 알려주세요.", "관청 권역은 출입 규정을 확인해 주세요.", "정확한 동을 알려주시면 가능 여부 확인이 빠릅니다."],
    faqs: [
      { q: "세종 신도시 아파트도 방문되나요?", a: "가능합니다. 단지가 넓어 동 호수와 방문자 주차 방법을 알려주시면 방문이 원활합니다." },
      { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
      { q: "관청 권역도 가능한가요?", a: "출입 규정이 있을 수 있어, 출입 방법과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "당일 예약도 되나요?", a: "가능 시간이 있으면 당일도 안내해 드리며, 단지 내부 이동을 감안해 여유 있게 연락 주시면 좋습니다." },
    ] },
  { slug: "gangwon", name: "강원",
    lead: "리조트·펜션 등 관광 숙소가 많아 객실 방문 규정과 이동 거리를 함께 확인하는 지역입니다.",
    intro2: "강원은 춘천·원주 도심권과 강릉·속초 관광권의 성격이 다릅니다. 관광권은 숙소 방문 규정과 성수기 이동 지연이, 도심권은 아파트 동선이 주요 확인 사항입니다. 같은 강원이라도 도시 간 거리가 멀어 출발지에 따라 가능 시간과 출장비가 달라집니다.",
    traits: "도시 간 거리가 멀고 관광 성수기 변수가 커서, 위치와 숙소 유형을 함께 확인합니다.",
    move: "도시 간 거리가 멀고 관광 성수기에는 이동 지연이 커서, 시간을 여유 있게 잡는 것이 좋습니다.",
    zones: [
      { n: "춘천", d: "도심 주거권으로 아파트 동선과 진입로 확인이 필요한 권역" },
      { n: "원주", d: "혁신도시와 주거권이 함께 있어 단지 동선 확인이 필요한 권역" },
      { n: "강릉·속초", d: "리조트·펜션 관광권으로 객실 방문 규정 확인이 중요한 권역" },
      { n: "평창·홍천", d: "리조트·산악 관광권으로 이동 거리를 크게 고려하는 권역" },
    ],
    building: "리조트·펜션은 객실 외부인 방문 규정을 미리 확인해야 하며, 도심 아파트는 동 호수와 진입로를 함께 확인합니다.",
    parking: "관광 숙소는 성수기 주차가 혼잡할 수 있어, 숙소 주차 가능 여부를 미리 확인하면 좋습니다.",
    timing: "관광 성수기와 주말에는 이동 지연이 커서, 희망 시간보다 여유를 두고 예약하시길 권합니다.",
    fee: "도시 간 거리가 크고 관광권은 이동이 길어, 위치에 따라 출장비가 달라질 수 있어 사전에 안내합니다.",
    rec: [
      { n: "아로마테라피", why: "여행 중 숙소에서 분위기까지 가라앉히기 좋습니다." },
      { n: "스웨디시", why: "관광 피로로 무거운 몸을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "림프마사지", why: "장거리 이동으로 다리가 무거운 분께 적합합니다." },
    ],
    tips: ["펜션·리조트는 객실 방문 규정을 미리 확인해 주세요.", "성수기는 이동 지연이 커서 여유 있게 예약해 주세요.", "정확한 위치와 숙소 유형을 알려주시면 좋습니다."],
    faqs: [
      { q: "여행 중 펜션에서 받을 수 있나요?", a: "가능 여부는 숙소 규정에 따라 다르므로, 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "관광지라 출장비가 더 드나요?", a: "이동 거리에 따라 달라질 수 있어 위치 확인 후 사전에 안내해 드립니다." },
      { q: "강릉·속초도 가능한가요?", a: "네, 다만 도시 간 거리가 있어 시간 조율이 필요하며 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "성수기 주말도 예약되나요?", a: "성수기에는 이동 지연이 커서, 여유 있게 미리 연락 주시면 조율이 수월합니다." },
    ] },
  { slug: "chungcheong", name: "충청",
    lead: "혁신도시·산업단지·구도심이 도시마다 다르게 섞여 있어 위치별 확인이 필요한 지역입니다.",
    intro2: "충청은 천안·아산 산업·주거권, 청주 도심권, 혁신도시 권역이 나뉩니다. 산업권은 숙소·관사 출입이, 도심권은 오피스텔과 아파트 동선이 주요 확인 사항입니다. 도시 간 거리가 있어 출발지에 따라 가능 시간이 달라지므로 정확한 위치를 함께 확인합니다.",
    traits: "도시 간 거리가 있어 출발지에 따라 가능 시간이 달라지므로, 정확한 위치를 함께 확인합니다.",
    move: "도시 간 거리가 있어 출발지와 목적지에 따라 이동 시간을 함께 봅니다.",
    zones: [
      { n: "천안·아산", d: "산업·주거권과 역세권이 함께 있어 출입·주차 확인이 필요한 권역" },
      { n: "청주", d: "도심 상권과 주거권, 오송 일대가 섞인 권역" },
      { n: "혁신도시(진천·음성)", d: "신규 주거권으로 단지 동선과 출입 확인이 필요한 권역" },
      { n: "충주·제천", d: "구도심·외곽 주거권으로 이동 거리를 함께 고려하는 권역" },
    ],
    building: "혁신도시·산업단지 인근 숙소는 출입 규정을 확인하고, 도심 오피스텔은 주차와 출입 방법을 함께 확인합니다.",
    parking: "신규 단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 좋습니다.",
    timing: "도시별 출퇴근 시간대와 도시 간 이동을 고려해, 희망 시간보다 여유를 두면 조율이 쉽습니다.",
    fee: "도시 간 거리가 있어 외곽이나 장거리 지역은 이동 조건에 따라 출장비가 달라질 수 있어 사전에 안내합니다.",
    rec: [
      { n: "스웨디시", why: "주거권 거주자가 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "산업·사무 직군의 어깨·허리 집중 관리에 적합합니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리로 선호됩니다." },
    ],
    tips: ["산업단지 인근 숙소는 출입 방법을 확인해 주세요.", "도시 간 이동이 있어 여유 있게 예약해 주세요.", "정확한 시·구·동을 알려주시면 가능 여부 확인이 빠릅니다."],
    faqs: [
      { q: "천안·청주 모두 가능한가요?", a: "주요 도시 위주로 안내가 가능하며 위치를 알려주시면 이동 시간을 고려해 확인합니다." },
      { q: "산업단지 인근 숙소도 되나요?", a: "네, 출입 방법과 위치를 알려주시면 방문 가능 여부를 안내해 드립니다." },
      { q: "혁신도시도 방문되나요?", a: "가능합니다. 신규 단지는 동 호수와 방문자 주차 방법을 알려주시면 방문이 원활합니다." },
      { q: "출장비는 어떻게 되나요?", a: "도시 간 거리에 따라 달라질 수 있어 위치 확인 후 사전에 안내해 드립니다." },
    ] },
  { slug: "jeolla", name: "전라",
    lead: "도심권과 관광권이 도시별로 나뉘어 이동 거리와 숙소 유형을 함께 확인하는 지역입니다.",
    intro2: "전라는 전주 도심권, 여수·순천 관광권, 주거권으로 성격이 구분됩니다. 관광권은 숙소 방문 규정과 성수기 이동이, 도심권은 주차와 출입이 주요 확인 사항입니다.",
    traits: "도시별 성격이 뚜렷해, 코코마사지는 위치와 숙소 유형을 함께 확인해 가능 여부를 안내합니다.",
    move: "관광 성수기 이동 지연과 도시 간 거리가 변수라, 시간을 여유 있게 잡는 것이 좋습니다.",
    zones: [
      { n: "전주", d: "도심 주거권과 한옥·구도심이 섞여 진입로 확인이 필요한 권역" },
      { n: "여수", d: "해안 관광권으로 숙소 방문 규정과 성수기 이동을 고려하는 권역" },
      { n: "순천", d: "도심권과 관광권이 함께 있어 위치 확인이 필요한 권역" },
      { n: "익산·군산", d: "구도심·주거권으로 아파트 동선과 진입로 확인이 필요한 권역" },
      { n: "광양·목포 인근", d: "산업·항만권과 주거권이 섞여 이동 거리와 출입 규정을 함께 확인하는 권역" },
    ],
    building: "관광 숙소는 객실 방문 규정을, 도심 아파트·오피스텔은 주차와 출입 방법을 미리 확인합니다.",
    parking: "관광권 숙소는 성수기 주차가 혼잡할 수 있어, 숙소 주차 가능 여부를 미리 확인하면 좋습니다.",
    timing: "관광 성수기와 주말에는 이동 지연이 있어, 희망 시간보다 여유를 두고 예약하시길 권합니다.",
    fee: "도시 간 거리와 관광권 이동에 따라 출장비가 달라질 수 있어, 위치 확인 후 사전에 안내합니다.",
    rec: [
      { n: "아로마테라피", why: "여행 중 숙소에서 분위기까지 가라앉히기 좋습니다." },
      { n: "스웨디시", why: "관광·이동 피로로 무거운 몸을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "딥티슈", why: "장시간 이동으로 무거워진 어깨·다리 집중 관리에 적합합니다." },
    ],
    tips: ["관광 숙소는 객실 방문 규정을 미리 확인해 주세요.", "성수기·주말은 여유 있게 예약해 주세요.", "정확한 위치와 숙소 유형을 알려주시면 좋습니다."],
    faqs: [
      { q: "여수 여행 중에도 가능한가요?", a: "숙소 규정에 따라 다르므로 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "전주 도심도 방문되나요?", a: "가능합니다. 주차와 출입 방법을 알려주시면 방문이 원활합니다." },
      { q: "순천·익산도 가능한가요?", a: "네, 위치를 알려주시면 이동 시간을 고려해 가능 시간을 안내합니다." },
      { q: "성수기에도 예약되나요?", a: "성수기에는 이동 지연이 있을 수 있어, 여유 있게 미리 연락 주시면 조율이 수월합니다." },
    ] },
  { slug: "gyeongsang", name: "경상",
    lead: "산업도시와 항만·관광권이 도시마다 달라 위치별 이용 상황을 확인하는 지역입니다.",
    intro2: "경상은 창원·포항 산업권, 경주 관광권, 도심 주거권이 섞여 있습니다. 산업권은 숙소·관사 출입과 교대 근무 시간대가, 관광권은 숙소 방문 규정이 주요 확인 사항입니다.",
    traits: "도시별 성격이 뚜렷하고 거리가 있어, 위치와 숙소 유형, 시간대를 함께 확인합니다.",
    move: "산업도시 출퇴근 시간대와 도시 간 거리를 고려해 가능 시간을 안내합니다.",
    zones: [
      { n: "창원", d: "산업권·주거권·항만권이 통합되어 권역별 성격이 뚜렷한 권역" },
      { n: "포항", d: "산업권과 해안 주거권이 함께 있어 출입·이동 확인이 필요한 권역" },
      { n: "경주", d: "보문 관광권으로 리조트·숙소 방문 규정 확인이 중요한 권역" },
      { n: "진주·김해", d: "도심 주거권으로 아파트 동선과 진입로 확인이 필요한 권역" },
    ],
    building: "산업단지·관광 숙소는 각각 출입·방문 규정을 확인하고, 도심 아파트는 동 호수와 진입로를 함께 확인합니다.",
    parking: "산업권 숙소와 관광권 리조트는 주차 규정이 달라, 숙소 주차 가능 여부를 미리 확인하면 좋습니다.",
    timing: "산업도시 교대 근무 시간대와 관광권 성수기 이동을 고려해, 가능한 시간대를 함께 확인합니다.",
    fee: "도시 간 거리와 관광권 이동에 따라 출장비가 달라질 수 있어, 위치 확인 후 사전에 안내합니다.",
    rec: [
      { n: "스포츠마사지", why: "산업권 근무자의 활동 근육 피로 관리에 적합합니다." },
      { n: "딥티슈", why: "반복 작업·장시간 이동으로 무거워진 부위 집중 관리로 선호됩니다." },
      { n: "스웨디시", why: "교대 근무·여행 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
    ],
    tips: ["산업단지·관광 숙소는 각각 출입·방문 규정을 확인해 주세요.", "도시 간 이동이 있어 여유 있게 예약해 주세요.", "정확한 위치와 숙소 유형을 알려주시면 좋습니다."],
    faqs: [
      { q: "창원·포항 모두 가능한가요?", a: "주요 도시 위주로 안내가 가능하며 위치를 알려주시면 이동 시간을 고려해 확인합니다." },
      { q: "경주 관광 숙소도 되나요?", a: "숙소 규정에 따라 다르므로 위치와 숙소 유형을 알려주시면 안내해 드립니다." },
      { q: "교대 근무라 시간이 불규칙한데 가능한가요?", a: "가능한 시간대를 알려주시면 그에 맞춰 가능 여부를 안내해 드립니다." },
      { q: "출장비는 어떻게 되나요?", a: "도시 간 거리에 따라 달라질 수 있어 위치 확인 후 사전에 안내해 드립니다." },
    ] },
  { slug: "jeju", name: "제주",
    lead: "리조트·호텔·펜션 등 숙소 유형이 다양해 객실 방문 규정 확인이 가장 중요한 지역입니다.",
    intro2: "제주는 제주시 도심권과 서귀포 관광권, 해안 리조트권으로 나뉩니다. 숙소마다 외부인 방문 규정이 달라 사전 확인이 필수이며, 지역이 넓어 이동 시간도 함께 고려합니다.",
    traits: "숙소 유형이 다양하고 지역이 넓어, 코코마사지는 위치와 숙소 규정을 가장 먼저 확인합니다.",
    move: "지역이 넓고 관광 성수기 이동 지연이 큰 변수라, 시간을 여유 있게 잡는 것이 좋습니다.",
    zones: [
      { n: "제주시 도심", d: "주거권과 상권, 도심 호텔이 함께 있어 출입·주차 확인이 필요한 권역" },
      { n: "서귀포", d: "관광권으로 리조트·호텔 방문 규정과 이동 거리를 고려하는 권역" },
      { n: "애월·한림", d: "해안 펜션·숙소가 많아 객실 방문 규정 확인이 중요한 권역" },
      { n: "성산·표선", d: "동부 관광권으로 이동 거리를 크게 고려하는 권역" },
    ],
    building: "리조트·호텔·펜션마다 외부인 방문 규정이 달라 사전 확인이 필수이며, 도심 호텔은 프런트 규정을 함께 확인합니다.",
    parking: "관광 숙소는 성수기 주차가 혼잡할 수 있어, 숙소 주차 가능 여부를 미리 확인하면 좋습니다.",
    timing: "지역이 넓고 성수기 이동 지연이 커서, 희망 시간보다 여유를 두고 예약하시길 권합니다.",
    fee: "지역이 넓어 서귀포·동부 등 이동이 긴 지역은 이동 조건에 따라 출장비가 달라질 수 있어 사전에 안내합니다.",
    rec: [
      { n: "아로마테라피", why: "여행 중 숙소에서 분위기까지 가라앉히기 좋습니다." },
      { n: "스웨디시", why: "관광 피로로 무거운 몸을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "림프마사지", why: "비행·장거리 이동으로 다리가 무거운 분께 적합합니다." },
    ],
    tips: ["호텔·리조트·펜션은 객실 방문 규정을 미리 확인해 주세요.", "지역이 넓어 이동 시간을 감안해 여유 있게 예약해 주세요.", "정확한 위치와 숙소 유형을 알려주시면 좋습니다."],
    faqs: [
      { q: "제주 여행 중 호텔에서 받을 수 있나요?", a: "숙소 규정에 따라 다르므로 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "서귀포까지도 가능한가요?", a: "이동 거리가 있어 시간 조율이 필요하며, 위치를 알려주시면 가능 시간을 안내합니다." },
      { q: "펜션도 방문되나요?", a: "펜션은 객실 방문 규정이 있을 수 있어, 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "성수기에도 예약되나요?", a: "성수기에는 이동 지연이 커서, 여유 있게 미리 연락 주시면 조율이 수월합니다." },
    ] },
];


// ───────────────────────────────────────────────────────────────────────────
// 6. 데이터: 서울 25개 구
// ───────────────────────────────────────────────────────────────────────────
const SEOUL_DISTRICTS = [
  { slug: "gangnam-gu", name: "강남구", dong: "역삼·삼성·청담·압구정·대치",
    profile: "오피스텔과 업무권이 밀집해 퇴근 이후·심야 문의가 많은 권역",
    customer: "야근이 잦은 직장인과 출장·미팅 방문객",
    intro2: "강남구는 업무 밀집도가 높아 같은 동 안에서도 오피스텔, 호텔, 주거가 빠르게 섞입니다. 그래서 방문 전 건물 유형과 출입 방법을 먼저 확인하는 것이 무엇보다 중요합니다.",
    zones: [
      { n: "역삼·삼성", d: "오피스텔과 업무 빌딩이 밀집해 퇴근 후 문의가 많은 권역" },
      { n: "청담·압구정", d: "고급 주거권과 상권이 함께 있어 프런트·출입 규정 확인이 필요" },
      { n: "대치", d: "학원가와 주거권이 섞여 낮·저녁 문의 패턴이 다른 권역" },
      { n: "논현·신사", d: "상권과 오피스텔이 혼합되어 주차 확인이 중요한 권역" },
    ],
    building: "고층 오피스텔과 호텔이 많아 공동현관 비밀번호와 프런트 방문객 규정을 미리 확인해야 방문이 원활합니다.",
    parking: "업무권 특성상 방문자 주차가 제한적인 경우가 많아, 인근 주차 가능 여부를 함께 확인하면 도착이 수월합니다.",
    timing: "퇴근 시간대와 심야에 예약이 집중되는 권역이라, 원하는 시간이 있으면 여유 있게 미리 연락 주시길 권합니다.",
    fee: "강남구 내부는 이동이 가깝지만, 심야 시간대는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "장시간 앉아 일하는 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스웨디시", why: "야근 후 전신을 부드럽게 풀고 싶을 때 부담 없이 선택합니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
    ],
    faqs: [
      { q: "강남구 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "심야에도 예약 가능한가요?", a: "심야는 예약이 몰리는 편이라 가능 여부를 사전에 확인해 드립니다. 여유 있게 연락 주세요." },
      { q: "호텔에서 받을 때 주의할 점은요?", a: "호텔은 외부인 방문 규정이 있을 수 있어, 객실 방문 가능 여부를 프런트에 미리 확인해 주시면 좋습니다." },
    ] },
  { slug: "gangdong-gu", name: "강동구", dong: "천호·길동·둔촌·고덕·암사",
    profile: "재건축 대단지 아파트와 주거권 중심으로 가족 단위 주거 문의가 많은 권역",
    customer: "주거권 거주자와 재택 근무자",
    intro2: "강동구는 고덕·둔촌 일대 재건축 대단지가 늘면서 주거 문의가 많은 지역입니다. 단지가 넓어 동 호수와 방문자 주차 동선 확인이 방문의 핵심입니다.",
    zones: [
      { n: "고덕·둔촌", d: "신축 재건축 대단지가 이어져 동 위치와 방문자 주차 등록이 핵심입니다" },
      { n: "천호·성내", d: "현대백화점 상권과 주상복합이 맞붙어 출입 방식이 다양합니다" },
      { n: "길동·암사", d: "단독과 아파트가 섞인 생활권으로 골목 진입을 함께 살핍니다" },
      { n: "강일·상일", d: "한강 동쪽 신규 택지로 단지 게이트와 주차 등록을 미리 확인합니다" },
    ],
    building: "대단지 아파트가 많아 동 호수와 방문자 주차 등록 방법을 미리 확인하는 것이 좋습니다.",
    parking: "신규·재건축 단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
    timing: "주거권 특성상 낮 시간과 이른 저녁 문의가 많아, 비교적 폭넓은 시간대 안내가 가능합니다.",
    fee: "강동구 내부는 이동이 가까운 편이며, 인접 경기권 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "가족 단위 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
      { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
    ],
    faqs: [
      { q: "강동구 대단지 아파트도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
      { q: "낮 시간에도 예약되나요?", a: "주거권 특성상 낮 시간 문의가 많아 비교적 폭넓게 안내가 가능합니다. 희망 시간을 알려주세요." },
      { q: "재건축 신규 단지도 가능한가요?", a: "네, 방문자 주차 등록이 필요한 경우가 많아 등록 방법을 미리 확인해 주시면 좋습니다." },
    ] },
  { slug: "gangbuk-gu", name: "강북구", dong: "수유·미아·번동",
    profile: "구릉지 주거권이 넓어 좁은 골목과 주차 동선 확인이 필요한 권역",
    customer: "주거권 거주자",
    intro2: "강북구는 구릉지를 따라 빌라와 아파트가 섞여 있어, 좁은 골목과 경사로 진입 동선을 미리 확인하는 것이 방문에 도움이 됩니다.",
    zones: [
      { n: "수유", d: "상권과 주거권이 함께 있어 진입로·주차 확인이 필요한 권역" },
      { n: "미아", d: "역세권 주상복합과 아파트가 섞인 권역" },
      { n: "번동", d: "주거 아파트 단지 중심으로 동 호수 확인이 필요한 권역" },
      { n: "우이·인수", d: "구릉지 빌라권으로 골목·경사로 진입 확인이 필요한 권역" },
    ],
    building: "빌라와 아파트가 섞여 있어 진입로와 주차 가능 여부를 미리 알려주시면 방문이 원활합니다.",
    parking: "구릉지 빌라권은 주차가 제한적일 수 있어, 인근 주차 가능 여부를 함께 확인하면 좋습니다.",
    timing: "주거권 특성상 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
    fee: "강북구 내부는 이동이 가까운 편이며, 외곽 경사 지역은 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "집안일·서서 일하는 분의 어깨·허리 집중 관리에 적합합니다." },
      { n: "림프마사지", why: "다리가 무겁고 붓는 느낌이 들 때 부드럽게 정리하기 좋습니다." },
    ],
    faqs: [
      { q: "강북구 빌라도 방문되나요?", a: "가능합니다. 좁은 골목과 진입로, 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "주차가 어려운데 괜찮나요?", a: "인근 주차 가능 여부를 미리 확인하면 도움이 됩니다. 위치를 알려주시면 함께 확인해 드립니다." },
      { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
    ] },
  { slug: "gangseo-gu", name: "강서구", dong: "마곡·발산·화곡·가양·김포공항",
    profile: "마곡 업무권과 공항, 주거권이 섞여 시간대별 이용 상황이 다른 권역",
    customer: "마곡 직장인과 공항 인근 방문객",
    intro2: "강서구는 마곡 업무권이 빠르게 성장하면서 오피스텔 문의가 늘었고, 화곡 빌라권과 가양 대단지가 함께 있어 권역마다 출입 방식이 다릅니다.",
    zones: [
      { n: "마곡", d: "업무 오피스텔이 밀집해 공동현관·주차 확인이 중요한 권역" },
      { n: "발산·우장산", d: "역세권 주거권으로 아파트 동선 확인이 필요한 권역" },
      { n: "화곡", d: "빌라 밀집권으로 좁은 골목과 진입로 확인이 필요한 권역" },
      { n: "가양·등촌", d: "강변 대단지 아파트로 동 호수·주차 확인이 필요한 권역" },
    ],
    building: "마곡 오피스텔과 화곡 빌라권의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인하면 좋습니다.",
    parking: "마곡 업무권은 방문자 주차가 제한적일 수 있고, 빌라권은 골목 주차가 어려워 인근 주차 여부를 확인하면 수월합니다.",
    timing: "마곡 업무권은 퇴근 후 문의가, 주거권은 낮·저녁 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
    fee: "강서구 내부는 이동이 가까운 편이며, 공항 인근이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "마곡 업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스웨디시", why: "주거권에서 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
    ],
    faqs: [
      { q: "마곡 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "화곡 빌라도 가능한가요?", a: "네, 좁은 골목과 진입로, 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "공항 근처도 방문되나요?", a: "가능합니다. 위치와 일정을 알려주시면 이동 시간을 고려해 안내해 드립니다." },
    ] },
  { slug: "gwanak-gu", name: "관악구", dong: "신림·봉천·서울대입구",
    profile: "1인 가구와 원룸·오피스텔이 밀집해 출입 방식 확인이 잦은 권역",
    customer: "1인 가구와 학생·직장인",
    intro2: "관악구는 원룸과 오피스텔이 밀집한 1인 가구 중심 지역입니다. 건물마다 공동현관과 호수 구조가 달라 출입 방법을 미리 확인하는 것이 중요합니다.",
    zones: [
      { n: "신림", d: "원룸·오피스텔이 밀집해 공동현관·호수 확인이 필요한 권역" },
      { n: "봉천", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
      { n: "서울대입구", d: "대학가 인근으로 저녁 문의가 많은 권역" },
      { n: "남현·낙성대", d: "언덕 주거권으로 골목·경사 진입 확인이 필요한 권역" },
    ],
    building: "원룸·오피스텔이 많아 공동현관 출입 방법과 정확한 호수를 미리 알려주시면 방문이 원활합니다.",
    parking: "1인 가구 밀집권은 주차가 제한적이라, 인근 주차 가능 여부를 함께 확인하면 좋습니다.",
    timing: "저녁·심야 문의가 많은 권역이라, 원하는 시간이 있으면 여유 있게 연락 주시길 권합니다.",
    fee: "관악구 내부는 이동이 가까운 편이며, 언덕·외곽 지역은 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "혼자 사는 공간에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "앉아서 공부·일하는 분의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "혼자만의 공간에서 분위기까지 가라앉히기 좋습니다." },
    ],
    faqs: [
      { q: "원룸·오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 정확한 호수를 알려주시면 방문이 원활합니다." },
      { q: "주차가 어려운데 괜찮나요?", a: "인근 주차 가능 여부를 미리 확인하면 도움이 됩니다. 위치를 알려주시면 함께 확인해 드립니다." },
      { q: "저녁 늦게도 예약되나요?", a: "저녁·심야 문의가 많은 편이라 가능 여부를 사전에 확인해 드립니다. 여유 있게 연락 주세요." },
    ] },
  { slug: "gwangjin-gu", name: "광진구", dong: "건대·구의·자양·화양",
    profile: "대학·상권과 주거권이 어우러져 저녁 시간 문의가 많은 권역",
    customer: "직장인과 주거권 거주자",
    intro2: "광진구는 건대입구 상권과 강변 주거권이 함께 있어, 상권 인근 오피스텔과 주거 아파트의 출입 방식이 다양합니다.",
    zones: [
      { n: "건대·화양", d: "건대입구 상권과 원룸·오피스텔이 밀집해 늦은 시간 문의가 많습니다" },
      { n: "구의·자양", d: "강변 아파트와 주상복합이 이어져 동 위치와 주차를 함께 봅니다" },
      { n: "광장동", d: "한강 조망 선호 주거지로 대단지 게이트와 동선을 안내받습니다" },
      { n: "능동·중곡", d: "어린이대공원 인근 주택가로 골목 진입을 미리 확인합니다" },
    ],
    building: "상권 인근 오피스텔과 강변 아파트의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인하면 좋습니다.",
    parking: "상권 권역은 방문자 주차가 혼잡할 수 있어, 인근 주차 가능 여부를 함께 확인하면 수월합니다.",
    timing: "상권과 대학가 영향으로 저녁 문의가 많고, 주거권은 낮 시간도 가능해 권역에 따라 시간대가 다릅니다.",
    fee: "광진구 내부는 이동이 가까운 편이며, 심야 시간대는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "앉아 일하는 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "건대 인근 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "강변 아파트도 가능한가요?", a: "네, 대단지는 동 호수와 방문자 주차 방법을 알려주시면 방문이 수월합니다." },
      { q: "저녁 시간 예약이 몰리나요?", a: "상권·대학가 영향으로 저녁 문의가 많은 편이라, 여유 있게 미리 연락 주시면 좋습니다." },
    ] },
  { slug: "guro-gu", name: "구로구", dong: "구로디지털단지·신도림·개봉·고척",
    profile: "디지털단지 업무권과 주거권이 인접해 퇴근 시간 문의가 많은 권역",
    customer: "IT·업무권 직장인과 주거권 거주자",
    intro2: "구로구는 구로디지털단지 업무권과 신도림 역세권, 개봉·고척 주거권이 인접해 있어 퇴근 시간대 문의가 많습니다.",
    zones: [
      { n: "구로디지털단지", d: "업무 오피스텔이 밀집해 퇴근 후 문의가 많은 권역" },
      { n: "신도림", d: "역세권 주상복합이 밀집해 출입·주차 확인이 필요한 권역" },
      { n: "개봉·오류", d: "주거 아파트와 빌라가 섞인 권역" },
      { n: "고척", d: "주거권으로 단지 동선 확인이 필요한 권역" },
    ],
    building: "단지 오피스텔과 역세권 주상복합의 출입 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "디지털단지·역세권은 방문자 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "업무권 퇴근 시간대에 문의가 집중되고 주거권은 낮·저녁도 가능해, 권역에 따라 시간대가 다릅니다.",
    fee: "구로구 내부는 이동이 가까운 편이며, 인접 권역 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "IT·사무 직군의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
      { n: "스웨디시", why: "야근 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "구로디지털단지 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "퇴근 시간에 예약이 몰리나요?", a: "업무권 특성상 퇴근 시간대 문의가 많아, 여유 있게 미리 연락 주시면 조율이 수월합니다." },
      { q: "신도림 주상복합도 가능한가요?", a: "네, 출입 규정과 주차 방법을 알려주시면 방문이 원활합니다." },
    ] },
  { slug: "geumcheon-gu", name: "금천구", dong: "가산디지털단지·독산·시흥",
    profile: "가산 업무권과 주거권이 섞여 야근 후 문의가 많은 권역",
    customer: "가산 디지털단지 직장인과 주거권 거주자",
    intro2: "금천구는 가산디지털단지 업무권과 독산·시흥 주거권이 함께 있어, 야근 후 문의와 주거권 문의가 모두 나타납니다.",
    zones: [
      { n: "가산디지털단지", d: "업무 오피스텔·지식산업센터가 밀집해 출입 확인이 필요한 권역" },
      { n: "독산", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
      { n: "시흥", d: "주거 아파트와 빌라가 섞인 권역" },
      { n: "금천 외곽", d: "주거·산업권 접경으로 이동 동선 확인이 필요한 권역" },
    ],
    building: "가산 오피스텔·지식산업센터와 주거권 빌라의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "가산 업무권은 방문자 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "가산 업무권은 야근 후 문의가, 주거권은 낮·저녁 문의가 많아 권역에 따라 시간대가 다릅니다.",
    fee: "금천구 내부는 이동이 가까운 편이며, 인접 권역 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스웨디시", why: "야근 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
    ],
    faqs: [
      { q: "가산 지식산업센터도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "야근 후 늦은 시간도 되나요?", a: "가능 여부를 사전에 확인해 안내해 드립니다. 시간대가 몰리는 편이라 여유 있게 연락 주세요." },
      { q: "독산·시흥 주거권도 가능한가요?", a: "네, 진입로와 주차 여부를 알려주시면 방문이 수월합니다." },
    ] },
  { slug: "nowon-gu", name: "노원구", dong: "상계·중계·하계·공릉",
    profile: "대단지 아파트 주거권이 넓어 단지 동선 확인이 중요한 권역",
    customer: "가족 단위 주거권 거주자",
    intro2: "노원구는 상계·중계 일대 대규모 아파트 단지가 넓게 형성된 주거 중심 지역입니다. 단지가 커서 동 호수와 주차 동선 확인이 방문의 핵심입니다.",
    zones: [
      { n: "상계", d: "상계주공 등 대규모 단지가 이어져, 동 위치와 방문자 주차 등록을 미리 확인하면 도착이 빠릅니다" },
      { n: "중계", d: "은행사거리 학원가가 가까워 낮과 저녁의 이용 흐름이 뚜렷이 갈립니다" },
      { n: "하계", d: "역세권 아파트와 근린 상가가 어우러져 단지 내부 동선 안내가 도움이 됩니다" },
      { n: "공릉", d: "서울과기대 인근으로 원룸과 주거 단지가 섞여 출입 방식이 다양합니다" },
    ],
    building: "대규모 아파트 단지가 많아 동 호수와 방문자 주차 등록 방법을 미리 확인하는 것이 핵심입니다.",
    parking: "대단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
    timing: "주거권 특성상 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
    fee: "노원구 내부는 이동이 가까운 편이며, 외곽 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "가족 단위 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
      { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
    ],
    faqs: [
      { q: "노원구 대단지 아파트도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
      { q: "낮 시간에도 예약되나요?", a: "주거권 특성상 낮 시간 문의가 많아 비교적 폭넓게 안내가 가능합니다. 희망 시간을 알려주세요." },
      { q: "단지가 넓은데 찾아오실 수 있나요?", a: "정확한 동 호수와 주차 동선을 알려주시면 도착이 수월합니다." },
    ] },
  { slug: "dobong-gu", name: "도봉구", dong: "창동·쌍문·방학",
    profile: "주거권 중심으로 차분한 생활권이 형성된 권역",
    customer: "주거권 거주자",
    intro2: "도봉구는 창동·쌍문 일대 주거권이 넓게 형성된 차분한 생활권입니다. 아파트와 빌라가 섞여 있어 진입로와 주차 동선 확인이 도움이 됩니다. 창동 역세권과 쌍문·방학 주거권은 분위기가 달라 동별로 방문 조건을 확인합니다.",
    zones: [
      { n: "창동", d: "창동역 복합환승과 대단지가 맞물려 차량 진입과 동 위치를 함께 봅니다" },
      { n: "쌍문", d: "오래된 주택가와 아파트가 어우러져 골목 진입로를 미리 살피면 좋습니다" },
      { n: "방학", d: "도봉산 자락 주거 단지로 단지 내부 길과 주차 자리를 함께 안내받습니다" },
      { n: "도봉동", d: "북단 외곽 주거지로 이동 시간을 넉넉히 잡는 편이 편안합니다" },
    ],
    building: "아파트와 빌라가 섞여 있어 진입로와 주차 가능 여부를 미리 알려주시면 방문이 원활합니다.",
    parking: "빌라권은 주차가 제한적일 수 있어, 인근 주차 가능 여부를 함께 확인하면 좋습니다.",
    timing: "주거권 중심이라 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
    fee: "도봉구 내부는 이동이 가까운 편이며, 외곽 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "림프마사지", why: "다리가 무겁고 붓는 느낌이 들 때 부드럽게 정리하기 좋습니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "도봉구 주거권도 방문되나요?", a: "가능합니다. 진입로와 주차 가능 여부, 동 호수를 알려주시면 방문이 원활합니다." },
      { q: "빌라도 가능한가요?", a: "네, 좁은 골목과 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
    ] },
  { slug: "dongdaemun-gu", name: "동대문구", dong: "청량리·회기·전농·답십리",
    profile: "역세권 상권과 주거권, 대학가가 어우러진 권역",
    customer: "직장인과 주거권 거주자, 학생",
    intro2: "동대문구는 청량리 역세권 상권과 회기 대학가, 전농·답십리 주거권이 어우러져 있어 권역마다 이용 상황이 다릅니다.",
    zones: [
      { n: "청량리", d: "환승 역세권과 신축 주상복합이 솟아 출입·주차 확인이 중요합니다" },
      { n: "회기·이문", d: "경희대·외대 인근으로 저녁과 주말 문의가 몰립니다" },
      { n: "전농·답십리", d: "재개발 신축과 기존 아파트가 섞여 방문 동을 먼저 확인합니다" },
      { n: "장안·휘경", d: "오래된 주택가 골목이 많아 진입로를 미리 살핍니다" },
    ],
    building: "역세권 주상복합과 주거 아파트의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "청량리 역세권은 방문자 주차가 혼잡할 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "상권과 대학가 영향으로 저녁 문의가 많고, 주거권은 낮 시간도 가능해 권역에 따라 시간대가 다릅니다.",
    fee: "동대문구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "앉아 일하는 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "청량리 주상복합도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "주거권 아파트도 가능한가요?", a: "네, 동 호수와 진입로를 알려주시면 방문이 수월합니다." },
      { q: "저녁 시간에도 예약되나요?", a: "상권·대학가 영향으로 저녁 문의가 많은 편이라, 여유 있게 미리 연락 주시면 좋습니다." },
    ] },
  { slug: "dongjak-gu", name: "동작구", dong: "노량진·사당·상도·흑석",
    profile: "역세권과 언덕 주거권이 섞여 이동 동선 확인이 필요한 권역",
    customer: "직장인과 주거권 거주자, 수험생",
    intro2: "동작구는 노량진 학원가와 사당 역세권, 상도·흑석 언덕 주거권이 섞여 있어 진입 동선과 주차 확인이 중요합니다.",
    zones: [
      { n: "노량진", d: "학원가와 원룸·고시원이 밀집해 출입 확인이 필요한 권역" },
      { n: "사당", d: "역세권 오피스텔과 주거권이 섞인 권역" },
      { n: "상도", d: "언덕 주거권으로 골목·경사 진입 확인이 필요한 권역" },
      { n: "흑석", d: "강변 재개발 단지와 대학 인근이 섞인 권역" },
    ],
    building: "역세권 오피스텔과 언덕 주거권의 출입·주차 방식이 달라, 건물 유형과 진입 동선을 미리 확인합니다.",
    parking: "언덕 주거권은 골목 주차가 어려워, 인근 주차 가능 여부를 함께 확인하면 수월합니다.",
    timing: "학원가·역세권 영향으로 저녁 문의가 많고, 주거권은 낮 시간도 가능해 권역에 따라 시간대가 다릅니다.",
    fee: "동작구 내부는 이동이 가까운 편이며, 언덕·심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "공부·업무 후 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "오래 앉아 있는 분의 어깨·목 집중 관리에 적합합니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리로 선호됩니다." },
    ],
    faqs: [
      { q: "노량진 원룸·고시원도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 정확한 호수를 알려주시면 방문이 원활합니다." },
      { q: "언덕 주거권도 가능한가요?", a: "네, 골목과 경사 진입, 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "주차가 어려운데 괜찮나요?", a: "인근 주차 가능 여부를 미리 확인하면 도움이 됩니다. 위치를 알려주시면 함께 확인해 드립니다." },
    ] },
  { slug: "mapo-gu", name: "마포구", dong: "공덕·홍대·합정·상암·망원",
    profile: "숙소·상권·업무권이 혼합되어 시간대별 이용 상황이 다양한 권역",
    customer: "직장인·방문객·주거권 거주자",
    intro2: "마포구는 상암 오피스권, 홍대·합정 상권과 숙소, 공덕 주상복합이 함께 있어 권역마다 출입 방식과 이용 시간대가 제각각입니다.",
    zones: [
      { n: "상암(DMC)", d: "미디어·업무 오피스권으로 퇴근 후 문의가 많은 권역" },
      { n: "홍대·합정", d: "상권과 숙소가 밀집해 방문 규정 확인이 필요한 권역" },
      { n: "공덕·아현", d: "역세권 주상복합이 밀집한 권역" },
      { n: "망원·연남", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
    ],
    building: "상암 오피스권, 홍대 숙소권, 공덕 주상복합의 출입 방식이 제각각이라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "상권·역세권은 방문자 주차가 혼잡할 수 있어, 인근 주차 가능 여부를 함께 확인하면 수월합니다.",
    timing: "업무권은 퇴근 후, 상권·숙소권은 저녁·심야 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
    fee: "마포구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "업무·외출 후 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "숙소에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
      { n: "딥티슈", why: "앉아 일하는 직장인의 어깨·목 집중 관리에 적합합니다." },
    ],
    faqs: [
      { q: "홍대 숙소에서도 받을 수 있나요?", a: "가능합니다. 다만 숙소의 외부인 방문 규정을 미리 확인해 주시면 방문이 원활합니다." },
      { q: "상암 오피스권도 방문되나요?", a: "네, 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "권역마다 가능 시간이 다른가요?", a: "업무권과 상권·숙소권의 문의 시간대가 달라, 위치를 알려주시면 가능 시간을 안내합니다." },
    ] },
  { slug: "seodaemun-gu", name: "서대문구", dong: "신촌·연희·홍제·남가좌",
    profile: "대학가와 주거권이 어우러져 저녁 문의가 많은 권역",
    customer: "직장인과 주거권 거주자, 학생",
    intro2: "서대문구는 신촌 대학가와 연희·홍제 주거권이 어우러져 있어, 대학가 인근 오피스텔과 주거 아파트의 출입 방식이 다양합니다.",
    zones: [
      { n: "신촌·대현", d: "대학가 인근 오피스텔이 밀집해 저녁 문의가 많은 권역" },
      { n: "연희·연남", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
      { n: "홍제·홍은", d: "언덕 주거권으로 골목·경사 진입 확인이 필요한 권역" },
      { n: "남가좌·북가좌", d: "주거 아파트 단지로 동선 확인이 필요한 권역" },
    ],
    building: "대학가 오피스텔과 주거 아파트의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "언덕 주거권과 상권은 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "대학가 영향으로 저녁 문의가 많고, 주거권은 낮 시간도 가능해 권역에 따라 시간대가 다릅니다.",
    fee: "서대문구 내부는 이동이 가까운 편이며, 언덕·심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "공부·업무 후 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "오래 앉아 있는 분의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "신촌 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 정확한 호수를 알려주시면 방문이 원활합니다." },
      { q: "홍제 언덕 주거권도 가능한가요?", a: "네, 골목과 경사 진입, 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "저녁 시간에도 예약되나요?", a: "대학가 영향으로 저녁 문의가 많은 편이라, 여유 있게 미리 연락 주시면 좋습니다." },
    ] },
  { slug: "seocho-gu", name: "서초구", dong: "강남역·서초·반포·방배·잠원",
    profile: "업무권과 고급 주거권이 함께 있어 퇴근 후·주거권 문의가 모두 많은 권역",
    customer: "직장인과 주거권 거주자",
    intro2: "서초구는 강남역 업무권과 반포·방배 고급 주거권이 함께 있어, 오피스텔과 대단지 아파트의 출입·주차 규정 확인이 모두 중요합니다.",
    zones: [
      { n: "강남역·서초", d: "업무 오피스텔이 밀집해 퇴근 후 문의가 많은 권역" },
      { n: "반포·잠원", d: "한강변 대단지 아파트로 동 호수·주차 확인이 중요한 권역" },
      { n: "방배", d: "주거 선호권으로 진입로·주차 확인이 필요한 권역" },
      { n: "양재·우면", d: "업무·연구권과 주거권이 섞인 권역" },
    ],
    building: "업무권 오피스텔과 대단지 아파트의 출입·주차 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "반포 등 대단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
    timing: "업무권은 퇴근 후, 주거권은 낮·저녁 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
    fee: "서초구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 잘 맞습니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 선호됩니다." },
    ],
    faqs: [
      { q: "강남역 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "반포 대단지도 가능한가요?", a: "네, 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 수월합니다." },
      { q: "퇴근 후 시간에 예약이 몰리나요?", a: "업무권 특성상 퇴근 시간대 문의가 많아, 여유 있게 미리 연락 주시면 조율이 수월합니다." },
    ] },
  { slug: "seongdong-gu", name: "성동구", dong: "성수·왕십리·금호·옥수",
    profile: "성수 업무권과 강변 주거권이 빠르게 섞여 저녁 문의가 많은 권역",
    customer: "직장인과 주거권 거주자",
    intro2: "성동구는 성수동 업무·상권이 빠르게 성장하면서 오피스권 문의가 늘었고, 금호·옥수 강변 주거권이 함께 있어 권역별 출입 방식이 다릅니다.",
    zones: [
      { n: "성수", d: "오피스·상권이 빠르게 성장해 퇴근 후 문의가 많은 권역" },
      { n: "왕십리", d: "역세권 주상복합이 밀집해 출입·주차 확인이 필요한 권역" },
      { n: "금호·옥수", d: "강변 언덕 주거권으로 진입 동선 확인이 필요한 권역" },
      { n: "행당·응봉", d: "주거 아파트 단지로 동선 확인이 필요한 권역" },
    ],
    building: "성수 오피스권과 강변 아파트의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "성수·왕십리는 방문자 주차가 혼잡할 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "업무권은 퇴근 후 문의가, 주거권은 낮·저녁 문의가 많아 권역에 따라 시간대가 다릅니다.",
    fee: "성동구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스웨디시", why: "야근 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
    ],
    faqs: [
      { q: "성수 오피스권도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "강변 아파트도 가능한가요?", a: "네, 동 호수와 진입 동선을 알려주시면 방문이 수월합니다." },
      { q: "저녁 시간에 예약이 몰리나요?", a: "성수 업무권 영향으로 저녁 문의가 많은 편이라, 여유 있게 미리 연락 주시면 좋습니다." },
    ] },
  { slug: "seongbuk-gu", name: "성북구", dong: "길음·정릉·돈암·안암",
    profile: "대학가와 주거권, 구릉지가 섞인 권역",
    customer: "주거권 거주자와 직장인, 학생",
    intro2: "성북구는 길음 역세권 대단지와 정릉 구릉지 주거권, 안암 대학가가 섞여 있어 진입 동선과 주차 확인이 중요합니다.",
    zones: [
      { n: "길음·종암", d: "역세권 대단지로 동 호수·주차 확인이 필요한 권역" },
      { n: "정릉", d: "구릉지 주거권으로 골목·경사 진입 확인이 필요한 권역" },
      { n: "돈암·동선", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
      { n: "안암·보문", d: "대학가 인근으로 저녁 문의가 많은 권역" },
    ],
    building: "언덕 주거권과 역세권 아파트의 진입로·주차 방식이 달라, 건물 유형과 진입 동선을 미리 확인합니다.",
    parking: "구릉지 주거권은 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "대학가 영향으로 저녁 문의가 많고, 주거권은 낮 시간도 가능해 권역에 따라 시간대가 다릅니다.",
    fee: "성북구 내부는 이동이 가까운 편이며, 언덕·심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "오래 앉아 있는 분의 어깨·목 집중 관리에 적합합니다." },
      { n: "림프마사지", why: "다리가 무겁고 붓는 느낌이 들 때 부드럽게 정리하기 좋습니다." },
    ],
    faqs: [
      { q: "정릉 언덕 주거권도 방문되나요?", a: "가능합니다. 골목과 경사 진입, 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "길음 대단지도 가능한가요?", a: "네, 동 호수와 방문자 주차 방법을 알려주시면 방문이 원활합니다." },
      { q: "주차가 어려운데 괜찮나요?", a: "인근 주차 가능 여부를 미리 확인하면 도움이 됩니다. 위치를 알려주시면 함께 확인해 드립니다." },
    ] },
  { slug: "songpa-gu", name: "송파구", dong: "잠실·문정·가락·방이·거여",
    profile: "대단지 아파트와 문정 업무권이 함께 있어 주거·업무 문의가 모두 많은 권역",
    customer: "가족 단위 거주자와 직장인",
    intro2: "송파구는 잠실 대단지 주거권과 문정 업무권이 함께 있어, 대단지 동선 확인과 오피스권 출입 확인이 모두 필요합니다.",
    zones: [
      { n: "잠실", d: "초대형 대단지 아파트로 동 호수·주차 확인이 중요한 권역" },
      { n: "문정", d: "업무 오피스·지식산업센터가 밀집한 권역" },
      { n: "가락·송파", d: "주거 아파트와 상권이 섞인 권역" },
      { n: "방이·오금·거여", d: "주거권으로 단지 동선 확인이 필요한 권역" },
    ],
    building: "잠실 대단지와 문정 오피스권의 동선·출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "대단지는 방문자 주차 등록이 필요한 경우가 많고 업무권은 주차가 제한적이라, 미리 확인하면 수월합니다.",
    timing: "주거권은 낮·저녁, 문정 업무권은 퇴근 후 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
    fee: "송파구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "가족 단위 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "문정 업무권 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "잠실 대단지도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
      { q: "문정 지식산업센터도 가능한가요?", a: "네, 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 수월합니다." },
      { q: "주거·업무 권역 가능 시간이 다른가요?", a: "권역별 문의 시간대가 달라, 위치를 알려주시면 가능 시간을 안내합니다." },
    ] },
  { slug: "yangcheon-gu", name: "양천구", dong: "목동·신정·신월",
    profile: "목동 대단지 주거권 중심으로 가족 단위 문의가 많은 권역",
    customer: "가족 단위 주거권 거주자",
    intro2: "양천구는 목동 대단지 아파트가 넓게 형성된 주거 중심 지역입니다. 단지가 커서 동 호수와 방문자 주차 동선 확인이 방문의 핵심입니다.",
    zones: [
      { n: "목동", d: "학군 대단지가 모여 방문 시 단지 게이트와 동 위치를 먼저 안내받는 곳입니다" },
      { n: "신정", d: "목동 생활권과 이어지는 아파트 밀집지로 방문자 주차 등록이 필요합니다" },
      { n: "신월", d: "단독·다세대가 많아 좁은 도로와 골목 진입을 함께 살핍니다" },
      { n: "목동 상권", d: "오피스텔과 상가가 섞여 공동현관 출입 방법을 알려주시면 방문이 수월합니다" },
    ],
    building: "대단지 아파트가 많아 동 호수와 방문자 주차 등록 방법을 미리 확인하는 것이 핵심입니다.",
    parking: "대단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
    timing: "주거권 특성상 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
    fee: "양천구 내부는 이동이 가까운 편이며, 인접 권역 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "가족 단위 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
      { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
    ],
    faqs: [
      { q: "목동 대단지도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
      { q: "낮 시간에도 예약되나요?", a: "주거권 특성상 낮 시간 문의가 많아 비교적 폭넓게 안내가 가능합니다. 희망 시간을 알려주세요." },
      { q: "신월 빌라권도 가능한가요?", a: "네, 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
    ] },
  { slug: "yeongdeungpo-gu", name: "영등포구", dong: "여의도·영등포·당산·문래",
    profile: "여의도 업무권과 주거권이 함께 있어 퇴근 후 문의가 많은 권역",
    customer: "여의도 직장인과 주거권 거주자",
    intro2: "영등포구는 여의도 금융·업무권과 당산·문래 주거·상권이 함께 있어, 오피스권 출입과 주상복합 동선 확인이 모두 필요합니다.",
    zones: [
      { n: "여의도", d: "금융·업무 오피스권으로 퇴근 후 문의가 많은 권역" },
      { n: "영등포", d: "역세권 상권과 주상복합이 밀집한 권역" },
      { n: "당산", d: "역세권 주거권과 오피스텔이 섞인 권역" },
      { n: "문래·양평", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
    ],
    building: "여의도 오피스권과 주거 주상복합의 출입 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "여의도·역세권은 방문자 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "여의도 업무권은 퇴근 후 문의가 집중되고, 주거권은 낮·저녁도 가능해 권역에 따라 시간대가 다릅니다.",
    fee: "영등포구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "딥티슈", why: "여의도 업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
      { n: "스웨디시", why: "야근 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
    ],
    faqs: [
      { q: "여의도 오피스권도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "퇴근 후 시간에 예약이 몰리나요?", a: "여의도 업무권 영향으로 퇴근 시간대 문의가 많아, 여유 있게 미리 연락 주시면 좋습니다." },
      { q: "당산·문래 주거권도 가능한가요?", a: "네, 동 호수와 진입로를 알려주시면 방문이 수월합니다." },
    ] },
  { slug: "yongsan-gu", name: "용산구", dong: "이태원·한남·이촌·용산",
    profile: "호텔·외국인 거주권과 고급 주거권이 섞인 권역",
    customer: "방문객과 주거권 거주자",
    intro2: "용산구는 이태원·한남 외국인 거주권과 이촌 한강변 주거권, 도심 호텔이 섞여 있어, 프런트 규정과 출입 방식 확인이 중요합니다.",
    zones: [
      { n: "이태원·한남", d: "외국인 거주권과 고급 주거권으로 출입 규정 확인이 필요한 권역" },
      { n: "이촌", d: "한강변 대단지 아파트로 동 호수·주차 확인이 중요한 권역" },
      { n: "용산·한강로", d: "도심 호텔과 주상복합이 밀집한 권역" },
      { n: "효창·청파", d: "주거권으로 진입로 확인이 필요한 권역" },
    ],
    building: "호텔과 고급 주거권의 프런트·출입 규정 확인이 중요하며, 외부인 방문 가능 여부를 미리 확인합니다.",
    parking: "도심 호텔·주상복합은 방문자 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "호텔·방문객 문의는 시간대가 다양하고, 주거권은 낮·저녁도 가능해 위치에 따라 가능 시간이 다릅니다.",
    fee: "용산구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "아로마테라피", why: "호텔·숙소에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
      { n: "스웨디시", why: "외출·이동 후 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "앉아 일하는 분의 어깨·목 집중 관리에 적합합니다." },
    ],
    faqs: [
      { q: "용산 호텔에서도 받을 수 있나요?", a: "가능합니다. 다만 호텔의 외부인 방문 규정을 프런트에 미리 확인해 주시면 방문이 원활합니다." },
      { q: "이촌 한강변 아파트도 가능한가요?", a: "네, 동 호수와 방문자 주차 방법을 알려주시면 방문이 수월합니다." },
      { q: "한남·이태원도 방문되나요?", a: "가능합니다. 출입 규정과 위치를 알려주시면 가능 여부를 안내해 드립니다." },
    ] },
  { slug: "eunpyeong-gu", name: "은평구", dong: "연신내·불광·응암·은평뉴타운",
    profile: "뉴타운 대단지와 구도심 주거권이 섞인 권역",
    customer: "주거권 거주자",
    intro2: "은평구는 은평뉴타운 대단지와 연신내·불광 구도심 주거권이 섞여 있어, 신규 단지 주차 등록과 구도심 진입로 확인이 모두 도움이 됩니다.",
    zones: [
      { n: "은평뉴타운", d: "북한산 자락 신규 대단지로 방문자 주차 등록과 동 위치를 미리 봅니다" },
      { n: "연신내·불광", d: "환승 역세권 상권과 주거가 맞물려 시간대별 흐름이 다릅니다" },
      { n: "응암·신사", d: "다세대 밀집지로 좁은 골목과 진입로를 함께 확인합니다" },
      { n: "녹번·역촌", d: "재정비로 새 아파트가 들어선 역세권 주거 생활권입니다" },
    ],
    building: "뉴타운 아파트와 구도심 빌라의 진입로·주차 방식이 달라, 건물 유형과 진입 동선을 미리 확인합니다.",
    parking: "뉴타운 단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
    timing: "주거권 중심이라 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
    fee: "은평구 내부는 이동이 가까운 편이며, 외곽 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "림프마사지", why: "다리가 무겁고 붓는 느낌이 들 때 부드럽게 정리하기 좋습니다." },
      { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
    ],
    faqs: [
      { q: "은평뉴타운 대단지도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
      { q: "구도심 빌라도 가능한가요?", a: "네, 좁은 골목과 진입로, 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
    ] },
  { slug: "jongno-gu", name: "종로구", dong: "광화문·종로·혜화·평창",
    profile: "도심 업무권과 호텔, 구도심 주거권이 어우러진 권역",
    customer: "직장인과 방문객, 주거권 거주자",
    intro2: "종로구는 광화문 업무권과 도심 호텔, 혜화 대학가, 평창·부암 구도심 주거권이 어우러져 있어 권역마다 출입 방식이 제각각입니다.",
    zones: [
      { n: "광화문·종로", d: "도심 오피스권과 호텔이 밀집해 출입 규정 확인이 필요한 권역" },
      { n: "혜화·명륜", d: "대학가 인근으로 저녁 문의가 많은 권역" },
      { n: "평창·부암", d: "구릉지 주거권으로 진입 동선 확인이 필요한 권역" },
      { n: "사직·교남", d: "도심 인근 주거권으로 진입로 확인이 필요한 권역" },
    ],
    building: "도심 호텔·오피스권과 한옥·빌라권의 출입 방식이 제각각이라, 건물 유형과 출입 방법을 미리 확인합니다.",
    parking: "도심권은 방문자 주차가 제한적일 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "업무권은 퇴근 후, 대학가는 저녁, 주거권은 낮 시간도 가능해 권역에 따라 가능 시간이 다릅니다.",
    fee: "종로구 내부는 이동이 가까운 편이며, 구릉지·심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "업무·외출 후 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "앉아 일하는 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "호텔·숙소에서 분위기까지 가라앉히기 좋습니다." },
    ],
    faqs: [
      { q: "광화문 도심 호텔도 방문되나요?", a: "가능합니다. 다만 호텔의 외부인 방문 규정을 프런트에 미리 확인해 주시면 방문이 원활합니다." },
      { q: "평창·부암 주거권도 가능한가요?", a: "네, 구릉지 진입 동선과 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "도심 오피스권도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 좋습니다." },
    ] },
  { slug: "jung-gu", name: "중구", dong: "을지로·명동·동대문·신당",
    profile: "도심 업무권과 호텔·상권이 밀집한 권역",
    customer: "직장인과 방문객",
    intro2: "중구는 을지로 업무권과 명동·동대문 상권·호텔이 밀집해 있어, 도심 호텔과 오피스텔의 프런트·출입 규정 확인이 핵심입니다.",
    zones: [
      { n: "을지로·충무로", d: "도심 오피스권으로 퇴근 후 문의가 많은 권역" },
      { n: "명동·회현", d: "상권과 호텔이 밀집해 프런트 규정 확인이 필요한 권역" },
      { n: "동대문·광희", d: "상권과 의류 권역으로 출입·주차 확인이 필요한 권역" },
      { n: "신당·약수", d: "주거권과 상권이 섞여 진입로 확인이 필요한 권역" },
    ],
    building: "도심 호텔과 오피스텔의 프런트·출입 규정 확인이 핵심이며, 외부인 방문 가능 여부를 미리 확인합니다.",
    parking: "도심 상권권은 방문자 주차가 혼잡할 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
    timing: "업무권은 퇴근 후, 상권·호텔권은 다양한 시간대 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
    fee: "중구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "업무·외출 후 전신을 부드럽게 풀고 싶을 때 많이 찾습니다." },
      { n: "딥티슈", why: "앉아 일하는 직장인의 어깨·목 집중 관리에 적합합니다." },
      { n: "아로마테라피", why: "호텔·숙소에서 분위기까지 가라앉히기 좋습니다." },
    ],
    faqs: [
      { q: "명동 호텔에서도 받을 수 있나요?", a: "가능합니다. 다만 호텔의 외부인 방문 규정을 프런트에 미리 확인해 주시면 방문이 원활합니다." },
      { q: "을지로 오피스권도 방문되나요?", a: "네, 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
      { q: "신당 주거권도 가능한가요?", a: "가능합니다. 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
    ] },
  { slug: "jungnang-gu", name: "중랑구", dong: "면목·상봉·묵동·중화",
    profile: "주거권 중심으로 생활권이 형성된 권역",
    customer: "주거권 거주자",
    intro2: "중랑구는 면목·상봉 일대 주거권이 넓게 형성된 생활 중심 지역입니다. 아파트와 빌라가 섞여 있어 진입로와 주차 동선 확인이 도움이 됩니다. 상봉 역세권과 면목 주거권은 이용 상황이 달라 동별로 위치를 확인합니다.",
    zones: [
      { n: "상봉·망우", d: "상봉터미널과 역세권 상가가 모여 저녁 시간 문의가 잦습니다" },
      { n: "면목", d: "다세대와 아파트가 빼곡해 좁은 골목 진입을 함께 확인합니다" },
      { n: "묵동·중화", d: "조용한 주거 단지로 방문 동과 출입 방법을 미리 알려주시면 좋습니다" },
      { n: "신내", d: "택지지구 단지가 정돈돼 동 호수와 방문자 주차 자리를 함께 봅니다" },
    ],
    building: "아파트와 빌라가 섞여 있어 진입로와 주차 가능 여부를 미리 알려주시면 방문이 원활합니다.",
    parking: "빌라권은 주차가 제한적일 수 있어, 인근 주차 가능 여부를 함께 확인하면 좋습니다.",
    timing: "주거권 중심이라 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
    fee: "중랑구 내부는 이동이 가까운 편이며, 외곽 접경이나 심야는 이동 조건에 따라 안내가 달라질 수 있습니다.",
    rec: [
      { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
      { n: "림프마사지", why: "다리가 무겁고 붓는 느낌이 들 때 부드럽게 정리하기 좋습니다." },
      { n: "딥티슈", why: "집안일·서서 일하는 분의 어깨·허리 집중 관리에 적합합니다." },
    ],
    faqs: [
      { q: "중랑구 주거권도 방문되나요?", a: "가능합니다. 진입로와 주차 가능 여부, 동 호수를 알려주시면 방문이 원활합니다." },
      { q: "빌라도 가능한가요?", a: "네, 좁은 골목과 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
    ] },
];


// ───────────────────────────────────────────────────────────────────────────
// 7. 데이터: 시도 하위 행정구역
// ───────────────────────────────────────────────────────────────────────────
const SUB_AREAS = {
  gyeonggi: [
    { slug: "suwon", name: "수원시", dong: "장안구·권선구·팔달구·영통구",
      profile: "행정구별 생활권이 뚜렷하고 영통 업무권과 구도심 상권이 함께 있는 도시",
      intro2: "수원시는 광교·영통 신도시 업무·주거권과 팔달 구도심 상권이 함께 있어, 행정구마다 건물 유형과 이동 조건이 다릅니다.",
      zones: [
        { n: "영통구(광교)", d: "신도시 업무·주거권으로 오피스텔·대단지 동선 확인이 필요한 권역" },
        { n: "팔달구", d: "구도심 상권과 주거권이 섞여 진입로 확인이 필요한 권역" },
        { n: "권선구", d: "주거 단지권으로 동 호수·주차 확인이 필요한 권역" },
        { n: "장안구", d: "대학가와 주거권이 함께 있어 저녁 문의가 많은 권역" },
      ],
      building: "영통 오피스텔과 대단지 아파트의 출입·주차 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
      parking: "신도시 대단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
      move: "광교·영통 출퇴근 시간대 정체와 행정구 간 이동을 고려해 가능 시간을 안내합니다",
      timing: "업무권은 퇴근 후, 주거권은 낮·저녁 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
      fee: "수원시 내부는 이동이 가까운 편이며, 외곽이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "스웨디시", why: "신도시 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
        { n: "딥티슈", why: "영통 업무권 직장인의 어깨·목 집중 관리에 적합합니다." },
        { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리로 선호됩니다." },
      ],
      faqs: [
        { q: "영통·광교도 방문되나요?", a: "가능합니다. 오피스텔·대단지는 공동현관 출입 방법과 주차 방법을 알려주시면 방문이 원활합니다." },
        { q: "팔달 구도심도 가능한가요?", a: "네, 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
        { q: "행정구마다 가능 시간이 다른가요?", a: "권역별 문의 시간대가 달라, 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
      ] },
    { slug: "seongnam", name: "성남시", dong: "분당구·수정구·중원구",
      profile: "분당 업무·주거권과 구도심이 성격이 뚜렷하게 나뉘는 도시",
      intro2: "성남시는 판교·분당 업무·주거권과 수정·중원 구도심이 성격이 뚜렷하게 나뉘어, 권역마다 출입 방식과 이동 조건이 다릅니다.",
      zones: [
        { n: "분당(정자·서현)", d: "대단지 주거권과 오피스권이 함께 있어 동선 확인이 필요한 권역" },
        { n: "판교", d: "IT 업무권으로 퇴근 후 문의가 많은 권역" },
        { n: "수정구", d: "구도심 주거권으로 진입로·경사 확인이 필요한 권역" },
        { n: "중원구", d: "주거권과 산업권이 섞여 동선 확인이 필요한 권역" },
      ],
      building: "분당 대단지·오피스권과 구도심 주거권의 출입 방식이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
      parking: "분당 대단지는 방문자 주차 등록이, 구도심은 골목 주차 확인이 필요해 미리 확인하면 수월합니다.",
      move: "판교·분당 출퇴근 정체가 변수라 시간을 여유 있게 잡는 것이 좋습니다",
      timing: "판교 업무권은 퇴근 후, 주거권은 낮·저녁 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
      fee: "성남시 내부는 권역 간 이동이 있어, 외곽이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "딥티슈", why: "판교 IT 업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
        { n: "스웨디시", why: "분당 주거권에서 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
        { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
      ],
      faqs: [
        { q: "판교 오피스권도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
        { q: "분당 대단지도 가능한가요?", a: "네, 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 수월합니다." },
        { q: "구도심도 방문되나요?", a: "가능합니다. 진입로와 경사, 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      ] },
    { slug: "goyang", name: "고양시", dong: "일산동구·일산서구·덕양구",
      profile: "일산 신도시 대단지와 덕양 구도심이 섞인 도시",
      intro2: "고양시는 일산 신도시 대단지 주거권과 덕양 구도심이 섞여 있어, 신도시 단지 동선과 구도심 진입로 확인이 모두 필요합니다.",
      zones: [
        { n: "일산동구(정발산)", d: "대단지 주거권과 상권이 함께 있어 동선 확인이 필요한 권역" },
        { n: "일산서구(주엽)", d: "대단지 아파트로 동 호수·주차 확인이 중요한 권역" },
        { n: "덕양구(화정·행신)", d: "구도심·역세권 주거권으로 진입로 확인이 필요한 권역" },
        { n: "삼송·원흥", d: "신규 택지권으로 방문자 주차 등록 확인이 필요한 권역" },
      ],
      building: "일산 대단지 아파트의 동 호수와 방문자 주차 확인이 핵심이며, 구도심은 진입로를 함께 확인합니다.",
      parking: "신도시·신규 택지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
      move: "자유로·일산 권역 이동 시간과 덕양 구간 정체를 함께 고려합니다",
      timing: "주거권 중심이라 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
      fee: "고양시 내부는 권역 간 이동이 있어, 외곽이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "스웨디시", why: "신도시 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
        { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
        { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
      ],
      faqs: [
        { q: "일산 대단지도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
        { q: "덕양 구도심도 가능한가요?", a: "네, 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
        { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
      ] },
    { slug: "yongin", name: "용인시", dong: "기흥구·수지구·처인구",
      profile: "수지·기흥 주거권과 처인 외곽권의 거리가 큰 도시",
      intro2: "용인시는 수지·기흥 대단지 주거권과 처인 외곽권의 거리가 커서, 권역에 따라 이동 시간과 가능 시간이 크게 달라집니다.",
      zones: [
        { n: "수지구", d: "대단지 주거권으로 동 호수·주차 확인이 중요한 권역" },
        { n: "기흥구", d: "주거권과 업무·산업권이 섞여 동선 확인이 필요한 권역" },
        { n: "처인구", d: "외곽 주거·전원권으로 이동 거리를 크게 고려하는 권역" },
        { n: "동백·보정", d: "택지 주거권으로 방문자 주차 등록 확인이 필요한 권역" },
      ],
      building: "대단지 아파트와 단독·전원주택의 진입로 확인이 달라, 건물 유형과 진입 동선을 미리 확인합니다.",
      parking: "대단지는 방문자 주차 등록이, 전원권은 진입로 확인이 필요해 미리 확인하면 수월합니다.",
      move: "수지·기흥과 처인 간 이동 거리가 큰 변수라 시간을 여유 있게 잡는 것이 좋습니다",
      timing: "주거권 중심이라 낮과 저녁 문의가 고른 편이지만, 처인 외곽은 이동 시간을 함께 고려합니다.",
      fee: "처인 외곽이나 전원권은 이동 거리에 따라 출장비가 달라질 수 있어, 위치 확인 후 사전에 안내합니다.",
      rec: [
        { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
        { n: "딥티슈", why: "앉아 일하는 분의 어깨·목 집중 관리에 적합합니다." },
        { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
      ],
      faqs: [
        { q: "수지·기흥도 방문되나요?", a: "가능합니다. 대단지는 동 호수와 방문자 주차 방법을 알려주시면 방문이 원활합니다." },
        { q: "처인구 외곽도 가능한가요?", a: "이동 거리가 있어 시간 조율이 필요하며, 위치를 알려주시면 가능 시간을 안내합니다." },
        { q: "전원주택도 방문되나요?", a: "네, 진입로를 미리 알려주시면 방문이 수월합니다." },
      ] },
  ],
  incheon: [
    { slug: "yeonsu-gu", name: "연수구", dong: "송도·연수·동춘",
      profile: "송도 국제도시 고층 주거·업무권과 구연수 주거권이 나뉘는 권역",
      intro2: "연수구는 송도 국제도시의 고층 주상복합·오피스텔과 구연수 주거권이 나뉘어, 권역마다 출입 방식과 주차 확인 사항이 다릅니다.",
      zones: [
        { n: "송도(국제업무)", d: "고층 오피스텔·업무권으로 공동현관·주차 확인이 중요한 권역" },
        { n: "송도(주거)", d: "고층 주상복합 대단지로 방문자 주차 등록이 필요한 권역" },
        { n: "연수·청학", d: "구연수 주거권으로 진입로 확인이 필요한 권역" },
        { n: "동춘·옥련", d: "주거권과 상권이 섞여 동선 확인이 필요한 권역" },
      ],
      building: "송도 고층 주상복합·오피스텔의 공동현관·주차 확인이 중요하며, 구연수 주거권은 진입로를 함께 확인합니다.",
      parking: "송도 고층 단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
      move: "송도 내부 이동과 인천대교·외곽 접근 시간을 함께 고려합니다",
      timing: "업무권은 퇴근 후, 주거권은 낮·저녁 문의가 많아 권역에 따라 가능 시간이 다릅니다.",
      fee: "연수구 내부는 이동이 가까운 편이며, 외곽이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "아로마테라피", why: "고층 주거권에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
        { n: "스웨디시", why: "송도 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
        { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
      ],
      faqs: [
        { q: "송도 고층 주상복합도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
        { q: "구연수 주거권도 가능한가요?", a: "네, 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
        { q: "송도 오피스권도 방문되나요?", a: "가능합니다. 출입 규정과 주차 방법을 알려주시면 좋습니다." },
      ] },
    { slug: "namdong-gu", name: "남동구", dong: "구월·논현·만수",
      profile: "행정 중심권과 주거권, 산업단지가 함께 있는 권역",
      intro2: "남동구는 구월 행정·상권과 논현·만수 주거권, 남동공단이 함께 있어, 권역마다 건물 유형과 출입 확인 사항이 다릅니다.",
      zones: [
        { n: "구월", d: "행정 중심권과 주상복합이 밀집해 출입·주차 확인이 필요한 권역" },
        { n: "논현·소래", d: "신도시 주거권으로 동 호수·주차 확인이 필요한 권역" },
        { n: "만수·장수", d: "구도심 주거권으로 진입로 확인이 필요한 권역" },
        { n: "남동공단 인근", d: "산업권 인근 주거·숙소로 출입 규정 확인이 필요한 권역" },
      ],
      building: "구월 주상복합과 논현 아파트의 출입·주차 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
      parking: "주상복합·신도시 단지는 방문자 주차 등록이 필요한 경우가 많아, 미리 확인하면 수월합니다.",
      move: "구월 도심 시간대 정체와 산업단지 출퇴근을 함께 고려합니다",
      timing: "행정·상권은 다양한 시간대, 주거권은 낮·저녁 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
      fee: "남동구 내부는 이동이 가까운 편이며, 산업단지 접경이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "스웨디시", why: "주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
        { n: "딥티슈", why: "사무·산업 직군의 어깨·허리 집중 관리에 적합합니다." },
        { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리로 선호됩니다." },
      ],
      faqs: [
        { q: "구월 주상복합도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
        { q: "논현 신도시도 가능한가요?", a: "네, 동 호수와 방문자 주차 방법을 알려주시면 방문이 수월합니다." },
        { q: "산업단지 인근도 방문되나요?", a: "출입 규정이 있을 수 있어, 출입 방법과 위치를 알려주시면 확인 후 안내해 드립니다." },
      ] },
    { slug: "seo-gu", name: "서구", dong: "청라·검단·가정",
      profile: "청라 국제도시와 검단 신도시 대단지가 빠르게 성장한 권역",
      intro2: "서구는 청라 국제도시와 검단 신도시 대단지가 빠르게 성장한 지역으로, 신규 단지의 동 호수와 방문자 주차 확인이 방문의 핵심입니다. 청라와 검단은 권역 간 거리가 있어 정확한 위치를 알려주시면 가능 시간을 안내합니다.",
      zones: [
        { n: "청라", d: "국제도시 대단지·주상복합으로 방문자 주차 등록이 필요한 권역" },
        { n: "검단", d: "신도시 대단지가 빠르게 늘어 동 호수 확인이 중요한 권역" },
        { n: "가정·석남", d: "구도심 주거권으로 진입로 확인이 필요한 권역" },
        { n: "당하·원당", d: "택지 주거권으로 단지 동선 확인이 필요한 권역" },
      ],
      building: "청라·검단 대단지 아파트의 동 호수와 방문자 주차 확인이 핵심이며, 구도심은 진입로를 함께 확인합니다.",
      parking: "신도시 대단지는 방문자 주차 등록이 필요한 경우가 많아, 등록 방법을 미리 확인하면 수월합니다.",
      move: "청라·검단 권역 간 이동 시간과 외곽 접근을 함께 고려합니다",
      timing: "주거권 중심이라 낮과 저녁 문의가 고른 편이라, 폭넓은 시간대 안내가 가능합니다.",
      fee: "서구 내부는 권역 간 이동이 있어, 외곽이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "스웨디시", why: "신도시 주거권에서 전신을 편안하게 풀고 싶을 때 많이 찾습니다." },
        { n: "아로마테라피", why: "집에서 분위기까지 가라앉히며 쉬고 싶을 때 잘 맞습니다." },
        { n: "딥티슈", why: "앉아 일하는 분의 어깨·목 집중 관리에 적합합니다." },
      ],
      faqs: [
        { q: "청라·검단 대단지도 방문되나요?", a: "가능합니다. 동 호수와 방문자 주차 등록 방법을 알려주시면 방문이 원활합니다." },
        { q: "신규 단지도 가능한가요?", a: "네, 방문자 주차 등록이 필요한 경우가 많아 등록 방법을 미리 확인해 주시면 좋습니다." },
        { q: "구도심도 방문되나요?", a: "가능합니다. 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
      ] },
  ],
  busan: [
    { slug: "haeundae-gu", name: "해운대구", dong: "해운대·센텀·우동·좌동",
      profile: "관광·숙소권과 센텀 업무권, 좌동 주거권이 함께 있는 권역",
      intro2: "해운대구는 해안 리조트·호텔 관광권과 센텀 업무권, 좌동 주거권이 함께 있어, 권역마다 방문 규정과 출입 방식이 크게 다릅니다.",
      zones: [
        { n: "해운대 해안", d: "리조트·호텔 관광권으로 객실 방문 규정 확인이 중요한 권역" },
        { n: "센텀시티", d: "업무·상업권으로 오피스텔 출입·주차 확인이 필요한 권역" },
        { n: "우동·중동", d: "주거권과 상권이 섞여 동선 확인이 필요한 권역" },
        { n: "좌동", d: "대단지 주거권으로 동 호수·주차 확인이 필요한 권역" },
      ],
      building: "해안 리조트·호텔은 객실 방문 규정을, 센텀 오피스권은 출입·주차를 미리 확인해야 합니다.",
      parking: "관광권은 성수기 주차가 혼잡하고 센텀은 방문자 주차가 제한적이라, 미리 확인하면 수월합니다.",
      move: "성수기 해안도로 정체가 큰 변수라 시간을 여유 있게 잡는 것이 좋습니다",
      timing: "관광권은 다양한 시간대, 업무권은 퇴근 후, 주거권은 낮·저녁 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
      fee: "해안 관광권이나 성수기 이동은 조건에 따라 추가 안내가 있을 수 있어, 위치 확인 후 사전에 안내합니다.",
      rec: [
        { n: "아로마테라피", why: "여행 중 숙소에서 분위기까지 가라앉히기 좋습니다." },
        { n: "스웨디시", why: "관광·이동 피로로 무거운 몸을 부드럽게 풀고 싶을 때 잘 맞습니다." },
        { n: "딥티슈", why: "센텀 업무권 직장인의 어깨·목 집중 관리에 적합합니다." },
      ],
      faqs: [
        { q: "해운대 호텔에서도 받을 수 있나요?", a: "가능합니다. 다만 숙소의 외부인 방문 규정을 미리 확인해 주시면 방문이 원활합니다." },
        { q: "센텀 오피스권도 방문되나요?", a: "네, 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
        { q: "성수기에도 예약되나요?", a: "성수기에는 해안도로 정체로 이동 지연이 있어, 여유 있게 미리 연락 주시면 좋습니다." },
      ] },
    { slug: "busanjin-gu", name: "부산진구", dong: "서면·전포·부전",
      profile: "서면 중심 상권·업무권과 주거권이 밀집한 권역",
      intro2: "부산진구는 서면 중심 상권·업무권과 전포·부전 주거권이 밀집해 있어, 오피스텔과 주상복합의 공동현관·주차 확인이 중요합니다.",
      zones: [
        { n: "서면", d: "중심 상권·업무권으로 오피스텔 출입·주차 확인이 필요한 권역" },
        { n: "전포", d: "상권과 주거권이 섞여 진입로 확인이 필요한 권역" },
        { n: "부전·범전", d: "역세권 주상복합이 밀집한 권역" },
        { n: "양정·가야", d: "주거 단지권으로 동선 확인이 필요한 권역" },
      ],
      building: "서면 오피스텔과 주상복합의 공동현관·주차 확인이 중요하며, 주거권은 진입로를 함께 확인합니다.",
      parking: "서면 상권권은 방문자 주차가 혼잡할 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
      move: "서면 도심 집중 시간대 정체를 고려해 가능 시간을 안내합니다",
      timing: "상권·업무권 영향으로 저녁·퇴근 후 문의가 많고, 주거권은 낮 시간도 가능해 위치에 따라 시간대가 다릅니다.",
      fee: "부산진구 내부는 이동이 가까운 편이며, 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "딥티슈", why: "업무권 직장인의 어깨·목 집중 관리로 많이 찾습니다." },
        { n: "스웨디시", why: "외출·업무 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
        { n: "스포츠마사지", why: "활동량이 많은 분의 근육 피로 관리에 적합합니다." },
      ],
      faqs: [
        { q: "서면 오피스텔도 방문되나요?", a: "가능합니다. 공동현관 출입 방법과 주차 가능 여부를 알려주시면 방문이 원활합니다." },
        { q: "전포·부전 주거권도 가능한가요?", a: "네, 진입로와 주차 여부를 미리 알려주시면 방문이 수월합니다." },
        { q: "저녁 시간에 예약이 몰리나요?", a: "서면 상권 영향으로 저녁 문의가 많은 편이라, 여유 있게 미리 연락 주시면 좋습니다." },
      ] },
    { slug: "suyeong-gu", name: "수영구", dong: "광안·민락·남천",
      profile: "광안리 관광권과 해안 주거권이 어우러진 권역",
      intro2: "수영구는 광안리 관광권과 민락·남천 해안 주거권이 어우러져 있어, 숙소 방문 규정과 주상복합 출입 확인이 모두 필요합니다.",
      zones: [
        { n: "광안", d: "관광권과 해안 상권으로 숙소·출입 규정 확인이 필요한 권역" },
        { n: "민락", d: "해안 주상복합과 상권이 섞인 권역" },
        { n: "남천", d: "해안 대단지 주거권으로 동 호수·주차 확인이 필요한 권역" },
        { n: "망미·수영", d: "구도심 주거권으로 진입로 확인이 필요한 권역" },
      ],
      building: "해안 주상복합·숙소의 출입·방문 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
      parking: "관광권은 성수기·주말 주차가 혼잡할 수 있어, 인근 주차 여부를 함께 확인하면 수월합니다.",
      move: "광안리 성수기·주말 정체를 고려해 시간을 여유 있게 잡는 것이 좋습니다",
      timing: "관광권은 다양한 시간대, 주거권은 낮·저녁 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
      fee: "수영구 내부는 이동이 가까운 편이며, 성수기·심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "아로마테라피", why: "여행 중 숙소에서 분위기까지 가라앉히기 좋습니다." },
        { n: "스웨디시", why: "관광·이동 피로로 무거운 몸을 부드럽게 풀고 싶을 때 잘 맞습니다." },
        { n: "림프마사지", why: "오래 앉아 일해 다리가 무거운 분께 적합합니다." },
      ],
      faqs: [
        { q: "광안리 숙소에서도 받을 수 있나요?", a: "가능합니다. 다만 숙소의 외부인 방문 규정을 미리 확인해 주시면 방문이 원활합니다." },
        { q: "남천 대단지도 가능한가요?", a: "네, 동 호수와 방문자 주차 방법을 알려주시면 방문이 수월합니다." },
        { q: "주말에도 예약되나요?", a: "주말에는 관광객 집중으로 이동 지연이 있을 수 있어, 여유 있게 미리 연락 주시면 좋습니다." },
      ] },
  ],
  gyeongsang: [
    { slug: "changwon", name: "창원시", dong: "성산구·의창구·마산·진해",
      profile: "산업권과 주거권, 항만권이 통합되어 권역별 성격이 뚜렷한 도시",
      intro2: "창원시는 성산 산업·업무권, 의창 행정·주거권, 마산·진해 항만권이 통합되어 있어, 권역마다 건물 유형과 이동 조건이 크게 다릅니다.",
      zones: [
        { n: "성산구", d: "산업·업무권과 주거권이 함께 있어 출입 확인이 필요한 권역" },
        { n: "의창구", d: "행정 중심권과 주거권으로 동선 확인이 필요한 권역" },
        { n: "마산(합포·회원)", d: "구도심 주거권으로 진입로 확인이 필요한 권역" },
        { n: "진해", d: "항만권과 주거권이 섞여 이동 거리를 고려하는 권역" },
      ],
      building: "산업단지 인근 숙소·관사와 주거 아파트의 출입 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
      parking: "주거 단지는 방문자 주차 등록이, 산업권 숙소는 출입 규정 확인이 필요해 미리 확인하면 수월합니다.",
      move: "산업단지 출퇴근 시간대와 통합시 권역 간 거리를 함께 고려합니다",
      timing: "산업권은 교대 근무 시간대, 주거권은 낮·저녁 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
      fee: "통합시라 권역 간 거리가 커서, 마산·진해 등 외곽은 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "스포츠마사지", why: "산업권 근무자의 활동 근육 피로 관리에 적합합니다." },
        { n: "딥티슈", why: "반복 작업으로 무거워진 어깨·허리 집중 관리로 선호됩니다." },
        { n: "스웨디시", why: "교대 근무 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      ],
      faqs: [
        { q: "성산·의창 모두 방문되나요?", a: "가능합니다. 권역별 이동이 달라 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
        { q: "마산·진해도 가능한가요?", a: "이동 거리가 있어 시간 조율이 필요하며, 위치를 알려주시면 가능 시간을 안내합니다." },
        { q: "교대 근무라 시간이 불규칙한데 가능한가요?", a: "가능한 시간대를 알려주시면 그에 맞춰 안내해 드립니다." },
      ] },
    { slug: "pohang", name: "포항시", dong: "남구·북구",
      profile: "산업권과 해안 주거권이 함께 있는 도시",
      intro2: "포항시는 남구 산업권과 북구 해안 주거권이 함께 있어, 산업단지 인근 숙소 출입과 주거 아파트 동선 확인이 모두 필요합니다.",
      zones: [
        { n: "남구(제철·효자)", d: "산업권 인근 주거·숙소로 출입 규정 확인이 필요한 권역" },
        { n: "남구(상도·대잠)", d: "주거권과 상권이 섞여 동선 확인이 필요한 권역" },
        { n: "북구(양덕·장성)", d: "주거 대단지로 동 호수·주차 확인이 필요한 권역" },
        { n: "북구(해안)", d: "해안 주거권으로 이동 동선 확인이 필요한 권역" },
      ],
      building: "산업단지 인근 숙소와 주거 아파트의 출입 규정이 달라, 건물 유형과 출입 방법을 미리 확인합니다.",
      parking: "주거 대단지는 방문자 주차 등록이, 산업권 숙소는 출입 규정 확인이 필요해 미리 확인하면 수월합니다.",
      move: "산업단지 출퇴근 정체와 남·북구 간 이동을 함께 고려합니다",
      timing: "산업권은 교대 근무 시간대, 주거권은 낮·저녁 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
      fee: "포항시 내부는 권역 간 이동이 있어, 해안 외곽이나 심야는 이동 조건에 따라 추가 안내가 있을 수 있습니다.",
      rec: [
        { n: "스포츠마사지", why: "산업권 근무자의 활동 근육 피로 관리에 적합합니다." },
        { n: "딥티슈", why: "반복 작업으로 무거워진 어깨·허리 집중 관리로 선호됩니다." },
        { n: "스웨디시", why: "교대 근무 후 전신을 부드럽게 풀고 싶을 때 잘 맞습니다." },
      ],
      faqs: [
        { q: "남구 산업권 인근도 방문되나요?", a: "출입 규정이 있을 수 있어, 출입 방법과 위치를 알려주시면 확인 후 안내해 드립니다." },
        { q: "북구 대단지도 가능한가요?", a: "네, 동 호수와 방문자 주차 방법을 알려주시면 방문이 수월합니다." },
        { q: "교대 근무라 시간이 불규칙한데 가능한가요?", a: "가능한 시간대를 알려주시면 그에 맞춰 안내해 드립니다." },
      ] },
    { slug: "gyeongju", name: "경주시", dong: "보문·황성·동천",
      profile: "관광권과 주거권이 나뉘어 숙소 유형이 다양한 도시",
      intro2: "경주시는 보문 관광권과 황성·동천 주거권이 나뉘어 숙소 유형이 다양해, 리조트·호텔의 객실 방문 규정 확인이 특히 중요합니다.",
      zones: [
        { n: "보문관광단지", d: "리조트·호텔 관광권으로 객실 방문 규정 확인이 중요한 권역" },
        { n: "황성", d: "주거 대단지권으로 동 호수·주차 확인이 필요한 권역" },
        { n: "동천·용강", d: "주거권과 상권이 섞여 동선 확인이 필요한 권역" },
        { n: "외동·시내", d: "구도심·외곽권으로 이동 거리를 고려하는 권역" },
      ],
      building: "보문 관광 숙소·리조트의 객실 방문 규정을, 주거권은 동 호수와 진입로를 미리 확인합니다.",
      parking: "관광 숙소는 성수기 주차가 혼잡할 수 있어, 숙소 주차 가능 여부를 미리 확인하면 수월합니다.",
      move: "관광 성수기 이동 지연과 시내·외곽 간 거리를 함께 고려합니다",
      timing: "관광권은 다양한 시간대, 주거권은 낮·저녁 문의가 많아 위치에 따라 가능 시간이 다릅니다.",
      fee: "관광권이나 외곽 지역은 성수기 이동 조건에 따라 추가 안내가 있을 수 있어, 위치 확인 후 사전에 안내합니다.",
      rec: [
        { n: "아로마테라피", why: "여행 중 숙소에서 분위기까지 가라앉히기 좋습니다." },
        { n: "스웨디시", why: "관광·이동 피로로 무거운 몸을 부드럽게 풀고 싶을 때 잘 맞습니다." },
        { n: "림프마사지", why: "장거리 이동으로 다리가 무거운 분께 적합합니다." },
      ],
      faqs: [
        { q: "보문 리조트에서도 받을 수 있나요?", a: "리조트는 객실 방문 규정이 있을 수 있어, 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
        { q: "황성 주거권도 가능한가요?", a: "네, 동 호수와 진입로를 알려주시면 방문이 수월합니다." },
        { q: "성수기에도 예약되나요?", a: "성수기에는 이동 지연이 있을 수 있어, 여유 있게 미리 연락 주시면 좋습니다." },
      ] },
  ],
};

// 시도 → 하위지역 매핑 보유 여부
const REGION_NAME = Object.fromEntries(REGIONS.map((r) => [r.slug, r.name]));


// ───────────────────────────────────────────────────────────────────────────
// 7-3. 데이터: 지역별 현장 이용 팁 (1차 경험형 고유 콘텐츠 · 정보 이득)
// 키 = 지역명(데이터의 name과 일치). 각 지역의 실제 건물·주차·교통·시간대 특성.
// ───────────────────────────────────────────────────────────────────────────
const VISIT_TIPS = {
  // 시도
  "서울": ["같은 구 안에서도 업무권·주거권 사이 이동에 지하철보다 도보가 빠른 경우가 많아, 정확한 건물 위치를 알려주시면 안내가 정확합니다.", "도심 호텔·오피스텔은 주말과 평일의 방문객 출입 규정이 다를 때가 있어, 주말 예약 시 프런트 규정을 한 번 더 확인합니다."],
  "경기": ["같은 시라도 분당↔판교, 일산↔덕양처럼 권역이 나뉘면 차로 20~40분이 걸려, 동까지의 정확한 위치를 기준으로 시간을 잡습니다.", "신도시 대단지는 방문차량 등록 앱·전화 방식이 단지마다 달라, 예약 시 등록 방법을 미리 확인하면 게이트에서 지체가 없습니다."],
  "인천": ["송도·청라 고층 단지는 지상 차량 진입이 제한돼 지하 주차 후 동별 엘리베이터를 타야 하는 곳이 많습니다.", "공항·영종 권역은 공항철도·교량 통행 시간이 더해져, 항공편 시각을 알려주시면 전후 여유를 계산해 안내합니다."],
  "부산": ["해운대·광안리는 주말·여름 성수기 해안도로 정체로 평소보다 이동이 길어져, 이 시기엔 시간을 넉넉히 잡습니다.", "산복도로·언덕 주거지가 많아 좁은 골목과 경사 진입로가 변수라, 차량 진입 가능 여부를 함께 확인합니다."],
  "대구": ["동성로 도심권은 차 없는 거리·일방통행 구간이 있어, 인근 하차 지점과 도보 동선을 함께 안내받으면 좋습니다.", "여름철 무더위로 한낮 이동이 부담될 때가 있어, 이른 저녁 시간대 예약이 비교적 쾌적합니다."],
  "대전": ["둔산 업무권은 점심·퇴근 시간 갓길 정차가 어려워, 인근 공영주차장이나 건물 주차 가능 여부를 미리 확인합니다.", "유성 연구단지·관사는 정문 출입 절차가 있어, 방문 동과 출입 방법을 함께 알려주시면 통과가 빠릅니다."],
  "광주": ["상무지구 오피스텔·호텔은 방문객 주차가 분리 운영되는 곳이 있어, 주차 위치와 출입 방법을 함께 확인합니다.", "도심과 외곽 주거권 간 거리가 가까운 편이라, 평일 낮 시간대는 비교적 폭넓게 시간을 맞출 수 있습니다."],
  "울산": ["산업단지 교대 근무에 맞춰 이른 아침·심야 문의가 많아, 가능한 시간대를 알려주시면 그에 맞춰 안내합니다.", "공단 인근 사택·기숙사는 정문 출입 통제가 있어, 출입 방법과 동을 사전에 확인하면 지체가 없습니다."],
  "세종": ["계획도시 대단지는 단지 사이 거리가 멀어, 정확한 생활권(한솔·새롬·보람 등)과 동을 알려주시면 도착이 빠릅니다.", "정부청사 권역은 보안 출입 절차가 있어, 청사 인근 방문 시 출입 가능 여부를 미리 확인합니다."],
  "강원": ["강릉·속초·평창은 도심에서 거리가 멀어 당일 이동에 시간이 걸리니, 위치를 먼저 알려주시면 가능 시간을 계산합니다.", "펜션·풀빌라는 외부인 객실 방문 가능 여부가 숙소마다 달라, 예약 전 숙소 규정을 함께 확인합니다."],
  "충청": ["천안·아산·청주는 서로 30분 이상 떨어져, 같은 충청권이라도 출발지에 따라 가능 시간이 달라집니다.", "혁신도시·산업단지 사택은 출입 절차가 있어, 동과 출입 방법을 미리 알려주시면 방문이 원활합니다."],
  "전라": ["여수·순천 관광권은 성수기 도심 진입 정체가 있어, 숙소 위치와 함께 여유 시간을 두고 예약합니다.", "전주 한옥마을 인근은 차량 진입·주차 제한 구역이 있어, 가까운 하차 지점을 함께 확인합니다."],
  "경상": ["창원·포항 산업권은 교대 시간대 공단 주변 정체가 있어, 근무 패턴에 맞춰 가능한 시간을 조율합니다.", "경주 보문 관광단지는 리조트별 외부인 방문 규정이 달라, 숙소 유형을 알려주시면 가능 여부를 확인합니다."],
  "제주": ["제주시↔서귀포는 차로 한 시간 안팎이 걸려, 숙소 위치에 따라 이동 시간을 미리 계산해 안내합니다.", "해안 펜션·풀빌라는 외부인 방문 규정이 제각각이라, 예약 전 숙소에 객실 방문 가능 여부를 확인합니다."],
  // 서울 25개 구
  "강남구": ["역삼·삼성 오피스텔은 지하 주차 후 카드키 엘리베이터가 많아, 프런트 호출 방법을 함께 확인합니다.", "퇴근 직후 테헤란로·강남대로 정체가 심해, 오후 7~9시 방문은 출발 여유를 두면 정시 도착이 수월합니다."],
  "강동구": ["고덕·둔촌 신축 대단지는 방문차량 사전 등록제가 많아, 동·호수와 차량번호를 미리 알려주시면 게이트가 빠릅니다.", "천호 상권 주상복합은 상가·주거 출입구가 분리돼, 주거동 전용 입구를 확인하면 헤매지 않습니다."],
  "강북구": ["수유·미아 언덕 주택가는 좁은 골목이 많아 큰길 하차 후 도보가 빠른 경우가 있어, 진입 가능 여부를 함께 봅니다.", "구릉지 특성상 같은 동이라도 윗길·아랫길이 갈려, 가까운 큰 건물을 기준점으로 알려주시면 좋습니다."],
  "강서구": ["마곡 업무권은 지식산업센터 방문객 주차가 유료·사전등록제인 곳이 많아 출입 방법을 확인합니다.", "화곡 빌라 밀집지는 일방통행·이면도로가 많아, 차량 진입보다 큰길 하차가 편한 경우가 있습니다."],
  "관악구": ["신림·봉천 원룸가는 공동현관 호출 방식이 건물마다 달라, 정확한 호수와 출입 방법을 함께 알려주시면 좋습니다.", "언덕이 많아 같은 번지라도 계단 골목이 갈려, 가까운 정류장·편의점을 기준으로 알려주시면 도착이 빠릅니다."],
  "광진구": ["건대입구 상권은 밤 시간 차량·인파가 많아, 늦은 예약은 가까운 하차 지점과 도보 동선을 함께 봅니다.", "구의·자양 강변 단지는 한강 조망 동의 진입로가 따로 있어, 동을 알려주시면 게이트 안내가 정확합니다."],
  "구로구": ["구로디지털단지는 단지 내 동 번호 체계가 복잡해, 정확한 동·층과 출입 방법을 함께 확인합니다.", "신도림 역세권 주상복합은 환승 인파로 주변이 혼잡해, 차량 진입 지점을 미리 정하면 편합니다."],
  "금천구": ["가산디지털단지는 야간·주말 정문 통제가 있어, 늦은 시간 방문 시 열려 있는 게이트를 확인합니다.", "독산 주거권은 이면도로 주차가 어려워, 인근 공영주차장이나 잠시 정차 가능 위치를 함께 봅니다."],
  "노원구": ["상계주공 등 노후 대단지는 동 간격이 좁고 번호가 이어져, 가까운 출입구를 알려주시면 도보가 줄어듭니다.", "은행사거리 학원가 인근은 학원 시간대 차량이 몰려, 그 시간을 피하면 진입이 수월합니다."],
  "도봉구": ["창동역 일대는 환승·개발 공사로 진입로가 수시로 바뀌어, 도착 직전 가까운 출입구를 다시 확인하면 좋습니다.", "도봉산 자락 단지는 경사가 있어, 윗단지·아랫단지 중 어디인지 알려주시면 정확히 안내합니다."],
  "동대문구": ["청량리 환승역 주변은 신축 주상복합이 늘어 동 입구가 분산돼 있어, 정확한 동과 출입구를 확인합니다.", "회기·이문 대학가는 저녁·주말 문의가 몰려, 원하는 시간이 있으면 여유 있게 미리 연락하면 좋습니다."],
  "동작구": ["노량진 고시촌은 원룸·고시원 공동현관 출입 방식이 제각각이라, 호수와 출입 방법을 함께 알려주세요.", "상도·흑석 언덕은 계단 골목이 많아 차량 진입이 제한될 때가 있어, 큰길 하차 지점을 함께 봅니다."],
  "마포구": ["상암 DMC는 방송·업무 빌딩 보안 출입이 있어, 방문 동과 출입 방법을 사전에 확인합니다.", "홍대·합정 숙소는 외부인 방문 규정이 있는 곳이 있어, 예약 전 숙소에 객실 방문 가능 여부를 확인합니다."],
  "서대문구": ["신촌 대학가는 저녁 시간 차량·인파가 많아, 가까운 큰길 하차 후 도보 동선을 함께 안내받으면 좋습니다.", "홍제·홍은 언덕 주거지는 경사 골목이 많아, 윗길·아랫길과 가까운 기준점을 알려주시면 정확합니다."],
  "서초구": ["반포·잠원 한강변 단지는 방문차량 등록제가 많아, 동·호수와 차량번호를 미리 알려주시면 게이트가 빠릅니다.", "강남역·서초 업무권은 점심·퇴근 갓길 정차가 어려워, 건물 주차나 인근 공영주차장을 함께 확인합니다."],
  "성동구": ["성수 카페·오피스권은 일방통행·이면도로가 많아 차량 진입보다 큰길 하차가 편한 경우가 있습니다.", "금호·옥수 언덕 단지는 동까지 경사가 있어, 가까운 출입구와 엘리베이터 동을 알려주시면 좋습니다."],
  "성북구": ["정릉·성북동 구릉지는 좁고 가파른 길이 많아, 차량 진입 가능 여부와 큰길 하차 지점을 함께 봅니다.", "안암 대학가는 시험·개강 시기 인파가 몰려, 그 시기엔 도착 여유를 두면 정시 방문이 수월합니다."],
  "송파구": ["잠실 대단지는 정문·후문에 따라 동까지 거리가 커, 가까운 출입구를 알려주시면 도보가 줄어듭니다.", "문정 지식산업센터는 야간·주말 정문 통제가 있어, 늦은 시간 방문 시 열린 게이트를 확인합니다."],
  "양천구": ["목동 학군 대단지는 학원 차량이 몰리는 시간대가 있어, 그 시간을 피하면 단지 진입이 한결 수월합니다.", "신월 주택가는 좁은 이면도로가 많아, 큰길 하차 후 도보가 빠른 경우가 있어 진입 여부를 함께 봅니다."],
  "영등포구": ["여의도 업무권은 주말·평일 주차 운영이 달라, 주말 방문 시 개방 주차장 여부를 미리 확인합니다.", "당산·문래는 공장형 건물과 신축 주상복합이 섞여 동 입구가 헷갈리기 쉬워, 정확한 동을 확인합니다."],
  "용산구": ["이태원·한남 고급 주거지는 방문객 출입 절차가 까다로운 곳이 있어, 출입 방법을 사전에 확인합니다.", "용산·한강로 호텔은 외부인 객실 방문 규정이 있어, 예약 전 프런트에 방문 가능 여부를 확인합니다."],
  "은평구": ["은평뉴타운은 북한산 자락이라 단지가 길게 늘어서, 가까운 출입구와 동을 알려주시면 도보가 줄어듭니다.", "연신내·불광 환승권은 상권 차량이 많아, 가까운 큰길 하차 지점을 함께 정하면 진입이 편합니다."],
  "종로구": ["광화문·종로 도심은 차 없는 거리·통제 구간이 있어, 인근 하차 지점과 도보 동선을 함께 봅니다.", "평창·부암 구릉지는 좁은 길과 경사가 많아, 차량 진입 가능 여부와 큰 건물 기준점을 함께 확인합니다."],
  "중구": ["명동·을지로 도심 호텔은 외부인 객실 방문 규정이 있어, 예약 전 프런트에 가능 여부를 확인합니다.", "동대문 의류상권은 새벽 영업으로 시간대별 차량 흐름이 크게 달라, 방문 시간에 맞춰 동선을 잡습니다."],
  "중랑구": ["상봉터미널 일대는 차량·버스가 몰려, 가까운 큰길 하차 후 도보 동선을 함께 안내받으면 좋습니다.", "면목 다세대 밀집지는 좁은 골목이 많아, 차량 진입보다 큰길 하차가 편한 경우가 있습니다."],
  // 하위 지역
  "수원시": ["광교·영통 신도시 대단지는 방문차량 등록제가 많아, 동·차량번호를 미리 알려주시면 게이트가 빠릅니다.", "팔달 구도심은 일방통행·좁은 길이 많아, 큰길 하차 지점과 도보 동선을 함께 확인합니다."],
  "성남시": ["판교 IT단지는 보안 출입과 사전등록 주차가 많아, 방문 동과 출입 방법을 미리 확인합니다.", "수정·중원 구도심은 경사 골목이 많아, 차량 진입 가능 여부와 큰 건물 기준점을 함께 봅니다."],
  "고양시": ["일산 신도시 대단지는 단지가 넓어, 정확한 동과 가까운 출입구를 알려주시면 도보가 줄어듭니다.", "자유로·강변 권역은 시간대 정체가 커, 출퇴근 시간을 피하면 이동이 한결 수월합니다."],
  "용인시": ["수지·기흥 대단지는 방문차량 등록이 필요한 곳이 많아, 동과 차량번호를 미리 알려주시면 좋습니다.", "처인 외곽·전원주택은 내비 도착점과 실제 진입로가 다를 때가 있어, 진입로를 함께 확인합니다."],
  "연수구": ["송도 고층 단지는 지상 진입이 제한돼 지하 주차 후 동별 엘리베이터를 타야 하는 곳이 많습니다.", "구연수 주거권은 골목 주차가 어려워, 인근 공영주차장이나 잠시 정차 가능 위치를 함께 봅니다."],
  "남동구": ["구월 행정·상권은 평일 낮 차량이 몰려, 인근 공영주차장이나 건물 주차 가능 여부를 미리 확인합니다.", "남동공단 인근 사택은 정문 출입 통제가 있어, 출입 방법과 동을 사전에 확인하면 지체가 없습니다."],
  "서구": ["청라·검단 신도시 대단지는 방문차량 사전 등록제가 많아, 동·차량번호를 미리 알려주시면 게이트가 빠릅니다.", "청라↔검단은 권역 간 거리가 있어, 정확한 단지명을 기준으로 이동 시간을 계산합니다."],
  "해운대구": ["해안 리조트·호텔은 외부인 객실 방문 규정이 있어, 예약 전 숙소에 가능 여부를 확인합니다.", "센텀시티 오피스권은 방문객 주차가 유료·사전등록제라, 주차 위치와 출입 방법을 함께 확인합니다."],
  "부산진구": ["서면 중심 상권은 일방통행·차 없는 구간이 있어, 가까운 큰길 하차 지점과 도보 동선을 함께 봅니다.", "전포·부전 주상복합은 상가·주거 출입구가 분리돼, 주거동 전용 입구를 확인하면 헤매지 않습니다."],
  "수영구": ["광안리 해안권은 주말·성수기 정체가 커, 이 시기엔 이동 시간을 넉넉히 두고 예약합니다.", "남천 해안 대단지는 동별 진입로가 따로 있어, 정확한 동을 알려주시면 게이트 안내가 정확합니다."],
  "창원시": ["성산 산업권은 교대 시간대 공단 주변 정체가 있어, 근무 패턴에 맞춰 가능한 시간을 조율합니다.", "통합시라 마산·진해는 거리가 있어, 권역을 먼저 알려주시면 이동 시간을 계산해 안내합니다."],
  "포항시": ["남구 제철·산업권 사택은 정문 출입 절차가 있어, 출입 방법과 동을 사전에 확인합니다.", "남구↔북구는 형산강을 사이에 두고 거리가 있어, 권역을 기준으로 이동 시간을 잡습니다."],
  "경주시": ["보문 관광단지는 리조트별 외부인 방문 규정이 달라, 숙소 유형을 알려주시면 가능 여부를 확인합니다.", "시내↔외곽 유적지 권역은 거리가 있어, 정확한 숙소 위치를 기준으로 시간을 계산합니다."],
};
function tipsHtml(name) {
  const t = VISIT_TIPS[name];
  if (!t || !t.length) return "";
  return `<h2>${esc(name)} 현장 이용 팁</h2>
      <ul class="tips-list">${t.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

// ───────────────────────────────────────────────────────────────────────────
// 7-4. 데이터: 행정동 (구/시군구 페이지 내 섹션용) — ㄱㄴㄷ 정렬은 렌더 시 처리,
//      1·2·3동 등 분동은 대표 동으로 통합. 서울·경기·인천·부산·경상만.
// ───────────────────────────────────────────────────────────────────────────
const DONG_BY_AREA = {
  // 서울 25개 구
  "강남구": ["역삼동", "삼성동", "청담동", "압구정동", "논현동", "신사동", "대치동", "도곡동", "개포동", "일원동", "수서동", "세곡동"],
  "강동구": ["천호동", "성내동", "길동", "둔촌동", "암사동", "명일동", "고덕동", "상일동", "강일동"],
  "강북구": ["미아동", "번동", "수유동", "우이동", "인수동", "삼각산동", "송중동", "송천동"],
  "강서구": ["화곡동", "등촌동", "가양동", "발산동", "염창동", "방화동", "공항동", "우장산동", "마곡동"],
  "관악구": ["봉천동", "신림동", "남현동"],
  "광진구": ["구의동", "자양동", "화양동", "군자동", "능동", "광장동", "중곡동"],
  "구로구": ["구로동", "신도림동", "개봉동", "오류동", "고척동", "가리봉동", "항동"],
  "금천구": ["가산동", "독산동", "시흥동"],
  "노원구": ["상계동", "중계동", "하계동", "공릉동", "월계동"],
  "도봉구": ["창동", "쌍문동", "방학동", "도봉동"],
  "동대문구": ["청량리동", "회기동", "전농동", "답십리동", "장안동", "휘경동", "이문동", "제기동", "용두동", "신설동"],
  "동작구": ["노량진동", "상도동", "사당동", "흑석동", "대방동", "신대방동", "동작동"],
  "마포구": ["공덕동", "아현동", "도화동", "용강동", "대흥동", "염리동", "신수동", "서교동", "합정동", "망원동", "연남동", "성산동", "상암동", "상수동"],
  "서대문구": ["신촌동", "연희동", "홍제동", "홍은동", "남가좌동", "북가좌동", "충정로", "천연동", "북아현동", "대현동"],
  "서초구": ["서초동", "반포동", "잠원동", "방배동", "양재동", "우면동", "내곡동", "신원동"],
  "성동구": ["성수동", "왕십리동", "행당동", "금호동", "옥수동", "응봉동", "마장동", "사근동", "용답동", "송정동"],
  "성북구": ["성북동", "돈암동", "동선동", "삼선동", "안암동", "보문동", "정릉동", "길음동", "종암동", "월곡동", "장위동", "석관동"],
  "송파구": ["잠실동", "신천동", "풍납동", "송파동", "석촌동", "삼전동", "가락동", "문정동", "장지동", "거여동", "마천동", "방이동", "오금동"],
  "양천구": ["목동", "신정동", "신월동"],
  "영등포구": ["여의도동", "영등포동", "당산동", "문래동", "양평동", "신길동", "대림동", "도림동", "양화동"],
  "용산구": ["한남동", "이태원동", "이촌동", "용산동", "한강로동", "청파동", "효창동", "원효로동", "후암동", "보광동", "남영동", "갈월동", "서계동", "도원동"],
  "은평구": ["응암동", "불광동", "갈현동", "구산동", "대조동", "역촌동", "신사동", "증산동", "수색동", "녹번동", "진관동"],
  "종로구": ["청운동", "효자동", "사직동", "삼청동", "가회동", "혜화동", "명륜동", "창신동", "숭인동", "평창동", "부암동", "무악동", "교남동", "이화동"],
  "중구": ["명동", "을지로동", "충무로", "신당동", "황학동", "광희동", "회현동", "소공동", "필동", "장충동", "다산동", "약수동", "청구동"],
  "중랑구": ["면목동", "상봉동", "중화동", "묵동", "망우동", "신내동"],
  // 경기
  "수원시": ["광교동", "권선동", "매탄동", "영통동", "인계동", "정자동", "행궁동", "망포동", "우만동", "율천동", "세류동", "곡선동"],
  "성남시": ["정자동", "서현동", "수내동", "이매동", "야탑동", "판교동", "백현동", "구미동", "금곡동", "신흥동", "태평동", "상대원동", "성남동"],
  "고양시": ["화정동", "행신동", "주엽동", "마두동", "백석동", "대화동", "일산동", "정발산동", "탄현동", "풍동", "식사동", "원당동", "삼송동"],
  "용인시": ["풍덕천동", "죽전동", "동천동", "상현동", "성복동", "신갈동", "구갈동", "보정동", "동백동", "마북동", "김량장동", "역북동"],
  // 인천
  "연수구": ["송도동", "연수동", "청학동", "동춘동", "옥련동", "선학동"],
  "남동구": ["구월동", "간석동", "만수동", "장수동", "서창동", "논현동", "남촌동", "도림동", "고잔동"],
  "서구": ["청라동", "가정동", "석남동", "신현동", "가좌동", "연희동", "심곡동", "검암동", "경서동", "마전동", "당하동", "원당동", "불로동"],
  // 부산
  "해운대구": ["우동", "중동", "좌동", "송정동", "재송동", "반여동", "반송동", "석대동"],
  "부산진구": ["부전동", "전포동", "양정동", "부암동", "당감동", "가야동", "개금동", "범천동", "범전동", "연지동", "초읍동"],
  "수영구": ["남천동", "수영동", "망미동", "광안동", "민락동"],
  // 경상
  "창원시": ["상남동", "사파동", "가음동", "도계동", "명서동", "봉곡동", "팔용동", "석전동", "양덕동", "충무동", "여좌동", "자은동"],
  "포항시": ["죽도동", "상도동", "대도동", "송도동", "효자동", "지곡동", "양덕동", "장성동", "우창동", "환여동"],
  "경주시": ["황성동", "용강동", "동천동", "성건동", "중부동", "황남동", "선도동", "보덕동", "현곡동"],
};
// 행정동별 고유 소개(1차 정보) — 각 동의 실제 성격. 누락 시 dongBlurb가 부모 구 기반으로 보완.
const DONG_INFO = {
  "강남구": { "역삼동": "테헤란로 오피스와 역삼역 직장인 수요가 많은 강남 대표 업무 중심 동입니다.", "삼성동": "코엑스·무역센터 인근으로 비즈니스 미팅과 호텔 방문이 잦은 동입니다.", "청담동": "명품거리와 한강변 고급 주거가 어우러진 정숙한 주거 동입니다.", "압구정동": "로데오거리와 한강변 노후 고급 아파트가 자리한 동입니다.", "논현동": "가구거리와 오피스텔·먹자골목이 섞인 활기 있는 동입니다.", "신사동": "가로수길 상권과 오피스가 공존해 낮·저녁 모두 붐비는 동입니다.", "대치동": "은마아파트와 학원가 중심의 교육·주거 동입니다.", "도곡동": "타워팰리스 등 고층 주거가 모인 동입니다.", "개포동": "재건축 신축 대단지가 들어선 주거 동입니다.", "일원동": "삼성서울병원과 주거가 인접한 조용한 동입니다.", "수서동": "SRT 수서역과 업무·물류 기능이 있는 동입니다.", "세곡동": "보금자리 신규 단지가 들어선 강남 동쪽 외곽 주거 동입니다." },
  "강동구": { "천호동": "현대백화점·로데오 상권 중심의 번화한 동입니다.", "성내동": "강동구청 행정타운과 주거가 섞인 동입니다.", "길동": "먹자골목과 다세대 주거가 모인 생활 동입니다.", "둔촌동": "올림픽파크포레온 등 대규모 재건축이 진행된 동입니다.", "암사동": "선사유적과 한강변 주거가 있는 동입니다.", "명일동": "학군이 좋은 정주형 아파트 주거 동입니다.", "고덕동": "신축 대단지가 들어선 주거 중심 동입니다.", "상일동": "고덕비즈밸리와 인접한 신흥 주거 동입니다.", "강일동": "강동 동쪽 끝 신규 택지 주거 동입니다." },
  "강북구": { "미아동": "미아사거리 상권과 대단지가 모인 중심 동입니다.", "번동": "오패산 자락에 주거가 형성된 동입니다.", "수유동": "수유역 상권과 북한산 자락 주거가 어우러진 동입니다.", "우이동": "북한산 등산로 입구의 한적한 동입니다.", "인수동": "4·19 묘지 인근 구릉지 주거 동입니다.", "삼각산동": "미아 일대 주거가 모인 행정동입니다.", "송중동": "송천·미아 사이 주거 행정동입니다.", "송천동": "오현 일대 주거 행정동입니다." },
  "강서구": { "화곡동": "다세대 주택이 밀집한 서울 최대 인구 동 중 하나입니다.", "등촌동": "역세권 아파트와 주거가 모인 동입니다.", "가양동": "한강변 대단지와 첨단 업무지구가 있는 동입니다.", "발산동": "마곡 인접 역세권 주거 동입니다.", "염창동": "한강변 아파트가 늘어선 주거 동입니다.", "방화동": "김포공항 인근 주거 동입니다.", "공항동": "김포공항이 자리한 동입니다.", "우장산동": "우장산 자락 주거 동입니다.", "마곡동": "마곡 첨단업무단지와 신축 단지가 들어선 동입니다." },
  "관악구": { "봉천동": "서울대입구·낙성대 일대 1인 가구가 많은 동입니다.", "신림동": "신림역 상권과 원룸촌이 밀집한 동입니다.", "남현동": "사당 인접 구릉지 주거 동입니다." },
  "광진구": { "구의동": "구의역 상권과 강변 주거가 섞인 동입니다.", "자양동": "건대·뚝섬 사이 강변 주거 동입니다.", "화양동": "건대입구 대학가 상권 중심 동입니다.", "군자동": "능동로 주거·상권이 모인 동입니다.", "능동": "어린이대공원이 자리한 동입니다.", "광장동": "워커힐·한강 조망 고급 주거 동입니다.", "중곡동": "용마산 자락 주거가 형성된 동입니다." },
  "구로구": { "구로동": "구로디지털단지 업무권과 주거가 인접한 동입니다.", "신도림동": "환승 역세권 주상복합이 밀집한 동입니다.", "개봉동": "다세대·아파트가 섞인 주거 동입니다.", "오류동": "경인로변 주거 동입니다.", "고척동": "고척돔과 주거가 있는 동입니다.", "가리봉동": "옛 공단 배후의 주거·상권 동입니다.", "항동": "항동지구 신규 택지 주거 동입니다." },
  "금천구": { "가산동": "가산디지털단지 지식산업센터가 밀집한 동입니다.", "독산동": "주거와 상권이 어우러진 생활 동입니다.", "시흥동": "관악산 자락 주거 동입니다." },
  "노원구": { "상계동": "상계주공 등 대규모 노후 단지가 모인 동입니다.", "중계동": "은행사거리 학원가가 있는 교육 중심 동입니다.", "하계동": "역세권 아파트와 상가가 어우러진 동입니다.", "공릉동": "서울과기대 인근 주거·원룸 동입니다.", "월계동": "광운대역 인근 주거 동입니다." },
  "도봉구": { "창동": "창동역 복합환승과 대단지가 맞물린 동입니다.", "쌍문동": "오래된 주택가와 아파트가 어우러진 동입니다.", "방학동": "도봉산 자락 주거 단지가 있는 동입니다.", "도봉동": "북단 외곽 주거 동입니다." },
  "동대문구": { "청량리동": "환승 역세권과 신축 주상복합이 솟은 동입니다.", "회기동": "경희대·시립대 인근 대학가 동입니다.", "전농동": "재개발 신축과 기존 아파트가 섞인 동입니다.", "답십리동": "촬영소거리와 주거가 어우러진 동입니다.", "장안동": "자동차거리와 주택가가 있는 동입니다.", "휘경동": "외대 인근 주거·원룸 동입니다.", "이문동": "외대·한예종 대학가 동입니다.", "제기동": "약령시 한약상권이 있는 동입니다.", "용두동": "청계천변 주거·상권 동입니다.", "신설동": "신설동역 일대 상권·주거 동입니다." },
  "동작구": { "노량진동": "고시촌과 학원가가 밀집한 동입니다.", "상도동": "숭실대 인근 언덕 주거 동입니다.", "사당동": "사당역 환승 상권과 주거가 섞인 동입니다.", "흑석동": "중앙대와 한강변 재개발 주거 동입니다.", "대방동": "여의도 인접 주거 동입니다.", "신대방동": "보라매공원 인근 주거 동입니다.", "동작동": "국립현충원이 자리한 동입니다." },
  "마포구": { "공덕동": "공덕역 환승 주상복합이 밀집한 동입니다.", "아현동": "재개발 신축 단지가 들어선 동입니다.", "도화동": "마포역 인근 주거 동입니다.", "용강동": "한강변 주거 동입니다.", "대흥동": "서강대 인근 주거 동입니다.", "염리동": "소금길과 주택가가 있는 동입니다.", "신수동": "서강대 일대 주거 동입니다.", "서교동": "홍대 상권 중심 동입니다.", "합정동": "카페·출판 상권과 한강변 주거가 섞인 동입니다.", "망원동": "망리단길 골목 상권과 주거 동입니다.", "연남동": "연트럴파크 인근 인기 상권 동입니다.", "성산동": "월드컵경기장 인근 주거 동입니다.", "상암동": "DMC 미디어·방송 업무단지가 있는 동입니다.", "상수동": "홍대 인근 카페·주거 동입니다." },
  "서대문구": { "신촌동": "연세대·신촌 상권 중심 동입니다.", "연희동": "조용한 주택가와 맛집 골목이 있는 동입니다.", "홍제동": "구릉지 주거와 역세권이 섞인 동입니다.", "홍은동": "북한산 자락 주거 동입니다.", "남가좌동": "가재울뉴타운 신축 단지 동입니다.", "북가좌동": "주거 단지가 모인 동입니다.", "충정로": "도심 인접 오피스·주거 동입니다.", "천연동": "독립문 인근 주거 동입니다.", "북아현동": "재개발 신축 단지 동입니다.", "대현동": "이대 상권 인근 동입니다." },
  "서초구": { "서초동": "법조타운과 강남역 업무권이 있는 동입니다.", "반포동": "한강변 고급 재건축 대단지가 모인 동입니다.", "잠원동": "한강변 아파트 주거 동입니다.", "방배동": "카페골목과 정주형 주거가 있는 동입니다.", "양재동": "양재시민의숲·업무지구가 있는 동입니다.", "우면동": "연구단지와 보금자리 주거 동입니다.", "내곡동": "헌인마을·신규 단지의 외곽 동입니다.", "신원동": "청계산 자락 신규 주거 동입니다." },
  "성동구": { "성수동": "수제화거리에서 카페·IT오피스로 변모한 동입니다.", "왕십리동": "환승 역세권 주상복합이 밀집한 동입니다.", "행당동": "왕십리뉴타운 단지 동입니다.", "금호동": "구릉지 신축 단지가 들어선 동입니다.", "옥수동": "한강·남산 사이 고지대 주거 동입니다.", "응봉동": "응봉산 팔각정으로 알려진 주거 동입니다.", "마장동": "축산물시장이 있는 동입니다.", "사근동": "한양대 인근 주거 동입니다.", "용답동": "장안평 인접 주거·상권 동입니다.", "송정동": "중랑천변 주거 동입니다." },
  "성북구": { "성북동": "대사관과 고급 주택이 있는 정숙한 동입니다.", "돈암동": "성신여대 인근 주거·상권 동입니다.", "동선동": "성신여대 상권 인근 동입니다.", "삼선동": "한성대 인근 주거 동입니다.", "안암동": "고려대 대학가 동입니다.", "보문동": "구릉지 주거 동입니다.", "정릉동": "북한산 자락 구릉지 주거 동입니다.", "길음동": "역세권 뉴타운 대단지 동입니다.", "종암동": "고려대 인접 주거 동입니다.", "월곡동": "월곡역 인근 주거 동입니다.", "장위동": "재개발이 진행된 주거 동입니다.", "석관동": "돌곶이 일대 주거 동입니다." },
  "송파구": { "잠실동": "롯데월드타워와 초대형 대단지가 있는 동입니다.", "신천동": "잠실역 상권과 아파트가 모인 동입니다.", "풍납동": "풍납토성과 병원 인근 주거 동입니다.", "송파동": "석촌호수 인근 주거 동입니다.", "석촌동": "석촌호수와 주거가 어우러진 동입니다.", "삼전동": "원룸과 주거가 섞인 동입니다.", "가락동": "가락시장이 있는 동입니다.", "문정동": "법조타운과 지식산업센터가 모인 동입니다.", "장지동": "위례·가든파이브 인접 동입니다.", "거여동": "위례신도시 인접 주거 동입니다.", "마천동": "남한산성 자락 주거 동입니다.", "방이동": "올림픽공원과 먹자골목이 있는 동입니다.", "오금동": "주거 단지가 모인 동입니다." },
  "양천구": { "목동": "신시가지 학군 대단지가 있는 교육 중심 동입니다.", "신정동": "목동 생활권과 이어지는 아파트 밀집 동입니다.", "신월동": "단독·다세대가 많은 주거 동입니다." },
  "영등포구": { "여의도동": "증권·방송이 모인 금융 업무 중심 동입니다.", "영등포동": "타임스퀘어 상권과 역세권 동입니다.", "당산동": "역세권 주거·오피스 동입니다.", "문래동": "옛 공장과 예술촌이 어우러진 동입니다.", "양평동": "준공업·물류와 주거가 섞인 동입니다.", "신길동": "재개발 신축 단지가 들어선 동입니다.", "대림동": "다문화 상권이 형성된 동입니다.", "도림동": "주거·소상공 동입니다.", "양화동": "선유도 인근 동입니다." },
  "용산구": { "한남동": "대사관과 고급 주거가 모인 정숙한 동입니다.", "이태원동": "외국인 상권과 다양한 식문화가 있는 동입니다.", "이촌동": "한강변 대단지 주거 동입니다.", "용산동": "남산 자락과 미군기지 인접 동입니다.", "한강로동": "용산역·아이파크몰 일대 업무·주상복합 동입니다.", "청파동": "숙대 인근 주거 동입니다.", "효창동": "효창공원 인근 주거 동입니다.", "원효로동": "전자상가와 주거가 섞인 동입니다.", "후암동": "남산 자락 구릉지 주거 동입니다.", "보광동": "한남 인접 언덕 주거 동입니다.", "남영동": "숙대입구 인근 동입니다.", "갈월동": "서울역 인근 동입니다.", "서계동": "서울역 서편 주거 동입니다.", "도원동": "공덕 인접 주거 동입니다." },
  "은평구": { "응암동": "다세대 주거가 밀집한 동입니다.", "불광동": "연신내 상권 인근 주거 동입니다.", "갈현동": "구산·연신내 사이 주거 동입니다.", "구산동": "주택가 주거 동입니다.", "대조동": "연신내역 인근 상권·주거 동입니다.", "역촌동": "역촌역 주거 동입니다.", "신사동": "증산·새절 인근 주거 동입니다.", "증산동": "DMC 인접 주거 동입니다.", "수색동": "수색역·DMC 인근 동입니다.", "녹번동": "재정비로 신축이 들어선 동입니다.", "진관동": "은평뉴타운과 북한산 자락 동입니다." },
  "종로구": { "청운동": "인왕산·청와대 인근 정숙한 동입니다.", "효자동": "경복궁 서편 주거 동입니다.", "사직동": "사직단과 도심 인접 주거 동입니다.", "삼청동": "갤러리와 한옥 골목이 있는 동입니다.", "가회동": "북촌한옥마을이 자리한 동입니다.", "혜화동": "대학로 공연 문화가 있는 동입니다.", "명륜동": "성균관대 인근 동입니다.", "창신동": "봉제거리와 구릉지 주거 동입니다.", "숭인동": "동묘 인근 주거 동입니다.", "평창동": "북악 자락 고급 주택 동입니다.", "부암동": "산자락 카페·주택이 있는 동입니다.", "무악동": "독립문 인근 단지 동입니다.", "교남동": "경희궁 인근 주상복합 동입니다.", "이화동": "낙산·벽화마을이 있는 동입니다." },
  "중구": { "명동": "관광·쇼핑과 호텔이 밀집한 도심 동입니다.", "을지로동": "도심 오피스와 노포 골목이 있는 동입니다.", "충무로": "인쇄골목과 도심 상권 동입니다.", "신당동": "떡볶이타운과 주거가 섞인 동입니다.", "황학동": "주방·만물시장이 있는 동입니다.", "광희동": "동대문 의류상권 인근 동입니다.", "회현동": "남대문시장 인근 도심 동입니다.", "소공동": "롯데·조선호텔이 있는 도심 동입니다.", "필동": "남산 자락 주거·대학 동입니다.", "장충동": "장충체육관·족발골목이 있는 동입니다.", "다산동": "신당 인접 구릉지 주거 동입니다.", "약수동": "약수역 환승 주거 동입니다.", "청구동": "주거가 모인 동입니다." },
  "중랑구": { "면목동": "다세대와 아파트가 빼곡한 주거 동입니다.", "상봉동": "상봉터미널과 역세권 상권이 있는 동입니다.", "중화동": "중랑천변 주거 동입니다.", "묵동": "조용한 주거 단지 동입니다.", "망우동": "망우로변 주거 동입니다.", "신내동": "택지지구 단지가 정돈된 동입니다." },
  // 경기
  "수원시": { "광교동": "광교호수공원과 신도시 업무·주거가 어우러진 동입니다.", "권선동": "구권선 생활권의 주거 동입니다.", "매탄동": "삼성 사업장 인근 주거 동입니다.", "영통동": "영통 신도시 대단지 주거 동입니다.", "인계동": "수원 최대 번화가가 있는 동입니다.", "정자동": "북수원 대단지 주거 동입니다.", "행궁동": "화성행궁과 구도심 관광 동입니다.", "망포동": "영통 동쪽 신축 단지 동입니다.", "우만동": "아주대 인근 주거 동입니다.", "율천동": "성균관대역 인근 주거 동입니다.", "세류동": "수원역 남측 주거 동입니다.", "곡선동": "권선 생활권 주거 동입니다." },
  "성남시": { "정자동": "분당 카페거리와 대단지가 있는 동입니다.", "서현동": "분당 최대 상권이 있는 동입니다.", "수내동": "분당 중심 주거 동입니다.", "이매동": "야탑·서현 사이 주거 동입니다.", "야탑동": "분당 북부 상권·터미널 동입니다.", "판교동": "판교테크노밸리 IT업무 중심 동입니다.", "백현동": "판교 신축 주거 동입니다.", "구미동": "분당 남측 주거 동입니다.", "금곡동": "분당 주거 동입니다.", "신흥동": "수정구 구도심 주거 동입니다.", "태평동": "구도심 주거 동입니다.", "상대원동": "중원 산업단지 인근 주거 동입니다.", "성남동": "중원 구도심 상권 동입니다." },
  "고양시": { "화정동": "덕양 최대 상권·대단지 동입니다.", "행신동": "행신역 주거 동입니다.", "주엽동": "일산 호수공원 인근 대단지 동입니다.", "마두동": "일산 중심 주거 동입니다.", "백석동": "일산 동측 업무·주거 동입니다.", "대화동": "킨텍스 인근 동입니다.", "일산동": "일산 구도심 동입니다.", "정발산동": "일산 문화시설이 모인 동입니다.", "탄현동": "일산 북측 주거 동입니다.", "풍동": "식사·풍동 신규 주거 동입니다.", "식사동": "위시티 단지 동입니다.", "원당동": "덕양 구도심 동입니다.", "삼송동": "삼송지구 신규 단지 동입니다." },
  "용인시": { "풍덕천동": "수지 중심 상권·주거 동입니다.", "죽전동": "죽전역과 대단지가 있는 동입니다.", "동천동": "분당 인접 신축 주거 동입니다.", "상현동": "광교 인접 수지 주거 동입니다.", "성복동": "롯데몰 인근 신축 주거 동입니다.", "신갈동": "기흥 교통 요지 동입니다.", "구갈동": "기흥역 주거 동입니다.", "보정동": "카페거리와 주거가 있는 동입니다.", "동백동": "동백지구 대단지 동입니다.", "마북동": "기흥 연구·주거 동입니다.", "김량장동": "처인 구도심 중심 동입니다.", "역북동": "용인 시청 인근 주거 동입니다." },
  // 인천
  "연수구": { "송도동": "송도국제도시 고층 주거·업무 동입니다.", "연수동": "구연수 주거 동입니다.", "청학동": "문학산 자락 주거 동입니다.", "동춘동": "연수 남측 주거 동입니다.", "옥련동": "송도해변 인근 주거 동입니다.", "선학동": "선학역 주거 동입니다." },
  "남동구": { "구월동": "인천시청과 최대 번화가가 있는 동입니다.", "간석동": "간석오거리 주거·상권 동입니다.", "만수동": "주거 단지가 모인 동입니다.", "장수동": "장수·서창 인근 주거 동입니다.", "서창동": "서창지구 신축 단지 동입니다.", "논현동": "소래포구 인근 신도시 주거 동입니다.", "남촌동": "남동공단 인접 동입니다.", "도림동": "주거·농경이 섞인 동입니다.", "고잔동": "남동공단이 있는 동입니다." },
  "서구": { "청라동": "청라국제도시 고층 주거 동입니다.", "가정동": "루원시티 재개발 동입니다.", "석남동": "구도심 주거·상권 동입니다.", "신현동": "주거 단지 동입니다.", "가좌동": "준공업·주거가 섞인 동입니다.", "연희동": "서구청 인근 주거 동입니다.", "심곡동": "주거 동입니다.", "검암동": "공항철도 검암역 주거 동입니다.", "경서동": "청라 인접 동입니다.", "마전동": "검단신도시 주거 동입니다.", "당하동": "검단 중심 주거 동입니다.", "원당동": "검단 신축 단지 동입니다.", "불로동": "검단 동측 주거 동입니다." },
  // 부산
  "해운대구": { "우동": "센텀시티 업무·상업과 마린시티 고층 주거가 있는 동입니다.", "중동": "해운대해수욕장과 관광 상권이 있는 동입니다.", "좌동": "신시가지 대단지 주거 동입니다.", "송정동": "송정해변과 한적한 주거가 있는 동입니다.", "재송동": "센텀 인접 주거 동입니다.", "반여동": "주거 단지가 모인 동입니다.", "반송동": "해운대 북측 주거 동입니다.", "석대동": "외곽 주거 동입니다." },
  "부산진구": { "부전동": "서면 중심 최대 번화가 동입니다.", "전포동": "전포 카페거리가 있는 동입니다.", "양정동": "행정·주거가 어우러진 동입니다.", "부암동": "서면 배후 주거 동입니다.", "당감동": "백양산 자락 주거 동입니다.", "가야동": "동의대 인근 주거 동입니다.", "개금동": "인제대백병원 인근 주거 동입니다.", "범천동": "범내골 상권·주거 동입니다.", "범전동": "서면 인접 신축 주거 동입니다.", "연지동": "어린이대공원 인근 주거 동입니다.", "초읍동": "부산시민공원 인근 주거 동입니다." },
  "수영구": { "남천동": "삼익비치 등 해안 대단지 주거 동입니다.", "수영동": "수영사적공원 인근 주거 동입니다.", "망미동": "주거 단지가 모인 동입니다.", "광안동": "광안리해변 관광 상권 동입니다.", "민락동": "회센터와 해안 주상복합이 있는 동입니다." },
  // 경상
  "창원시": { "상남동": "창원 최대 상권이 있는 동입니다.", "사파동": "성산 주거 단지 동입니다.", "가음동": "주거·상권이 어우러진 동입니다.", "도계동": "의창 주거 동입니다.", "명서동": "의창 주거 단지 동입니다.", "봉곡동": "의창 북측 주거 동입니다.", "팔용동": "산업단지 인접 주거 동입니다.", "석전동": "마산회원 상권·주거 동입니다.", "양덕동": "마산 신축 주거 동입니다.", "충무동": "진해 중심 주거 동입니다.", "여좌동": "진해 벚꽃 명소 주거 동입니다.", "자은동": "진해 신축 단지 동입니다." },
  "포항시": { "죽도동": "죽도시장과 구도심 상권이 있는 동입니다.", "상도동": "남구 주거·상권 동입니다.", "대도동": "남구 주거 동입니다.", "송도동": "송도해변 인근 동입니다.", "효자동": "포스코 인근 주거 동입니다.", "지곡동": "포스텍·연구단지 주거 동입니다.", "양덕동": "북구 신시가지 대단지 동입니다.", "장성동": "북구 주거 동입니다.", "우창동": "북구 주거·상권 동입니다.", "환여동": "영일대해변 인근 동입니다." },
  "경주시": { "황성동": "경주 최대 주거 단지 동입니다.", "용강동": "북부 주거 동입니다.", "동천동": "시외터미널 인근 주거 동입니다.", "성건동": "구도심 주거 동입니다.", "중부동": "경주역·중앙시장 일대 동입니다.", "황남동": "대릉원·한옥 관광 동입니다.", "선도동": "서악 인근 주거 동입니다.", "보덕동": "보문관광단지가 있는 동입니다.", "현곡동": "북서부 신축 주거 동입니다." },
};
// 한글 → 로마자 슬러그 (개정 로마자 근사)
function romanize(str) {
  const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "l", "l", "l", "l", "l", "l", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
  let out = "";
  for (const ch of str) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) { if (/[a-zA-Z0-9]/.test(ch)) out += ch.toLowerCase(); continue; }
    out += CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + JONG[c % 28];
  }
  return out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dong";
}
function dongBlurb(parent, dong) {
  const b = (DONG_INFO[parent.name] || {})[dong];
  if (b) return b;
  return `${parent.name} ${dong}은 ${parent.profile} 안에 자리한 생활권으로, 방문 시 정확한 위치와 공동현관 출입 방법을 함께 확인합니다.`;
}
function dongSection(name) {
  const list = DONG_BY_AREA[name];
  if (!list || !list.length) return "";
  const sorted = [...list].sort((a, b) => a.localeCompare(b, "ko"));
  return `<h2>${esc(name)} 행정동 안내</h2>
      <p>${esc(name)} 전 행정동으로 방문이 가능합니다. ㄱㄴㄷ 순이며 1·2·3동 등 분동은 대표 동으로 묶었습니다. 동 이름을 누르면 동별 안내 페이지로 이동합니다.</p>
      <div class="dong-grid">${sorted.map((d) => `<a class="dong-link" href="${romanize(d)}/index.html"><span>${esc(d)}</span></a>`).join("")}</div>`;
}
// 동별 페이지 생성 (구/시군구 하위, depth 4)
function buildDongPages(regionSlug, regionName, parent) {
  const list = DONG_BY_AREA[parent.name];
  if (!list || !list.length) return;
  const sorted = [...list].sort((a, b) => a.localeCompare(b, "ko"));
  const depth = 4, prefix = "../../../../";
  sorted.forEach((dong) => {
    const slug = romanize(dong);
    const p = `areas/${regionSlug}/${parent.slug}/${slug}/`;
    const blurb = dongBlurb(parent, dong);
    const siblings = sorted.filter((x) => x !== dong);
    const recNames = parent.rec.map((r) => r.n).join(", ");
    const title = `${dong} 출장마사지 | ${regionName} ${parent.name} 방문 - ${SITE.brand}`;
    const description = `${regionName} ${parent.name} ${dong} 출장마사지 방문 안내. ${blurb} 코스별 요금과 인근 동, 예약 방법을 확인하세요.`;
    const bc = breadcrumb([
      { name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" },
      { name: regionName, path: `areas/${regionSlug}/` }, { name: parent.name, path: `areas/${regionSlug}/${parent.slug}/` }, { name: dong },
    ], depth);
    const faqs = [
      { q: `${dong}도 방문 가능한가요?`, a: `네, ${parent.name} ${dong} 전역으로 방문이 가능합니다. 정확한 위치(동·건물 유형)와 희망 시간을 알려주시면 가능 시간과 출장비를 안내해 드립니다.` },
      { q: `${dong} 예약은 어떻게 하나요?`, a: `전화 ${SITE.phone} 또는 문자로 ${dong} 방문 주소와 희망 시간, 원하는 관리 종류를 알려주시면 ${parent.name} 기준으로 안내해 드립니다.` },
      { q: `${dong}에서는 어떤 관리를 받을 수 있나요?`, a: `${recNames} 등 ${parent.name}에서 안내하는 모든 관리를 ${dong}에서도 받으실 수 있습니다. 컨디션을 알려주시면 추천해 드립니다.` },
    ];
    const jsonLd = [bc.ld, serviceJsonLd({ name: `${dong} 출장마사지`, description: blurb, areaName: `${regionName} ${parent.name} ${dong}`, url: "/" + p }), faqJsonLd(faqs)];
    const sibHtml = siblings.length
      ? `<h2>${esc(parent.name)} 인근 동 안내</h2>
      <p>${esc(dong)} 외에 ${esc(parent.name)}의 다른 행정동도 방문이 가능합니다. 인근 동 안내 페이지에서 각 동의 이용 정보를 확인하실 수 있습니다.</p>
      <div class="dong-grid">${siblings.map((s) => `<a class="dong-link" href="../${romanize(s)}/index.html"><span>${esc(s)}</span></a>`).join("")}</div>`
      : "";
    const body = `${header(depth, { active: "areas" })}
<main id="main">
  ${areaHero({ eyebrow: `${regionName} ${parent.name}`, name: dong, lead: blurb, dong: parent.dong, rec: parent.rec, bcHtml: bc.html })}
  <div class="container area-body">
    <article class="doc">
      <h2>${esc(parent.name)} ${esc(dong)} 출장마사지 이용 안내</h2>
      <p>${esc(blurb)}</p>
      <p>${esc(dong)}은 ${esc(parent.name)} 생활권에 속해, 방문 시 공동현관 출입 방법과 주차 가능 여부, 정확한 동·호수를 미리 확인하면 도착이 빠릅니다. ${esc(parent.name)} 전체 안내는 <a href="../index.html">${esc(parent.name)} 출장마사지</a> 페이지에서 함께 보실 수 있습니다.</p>

      <h2>이용 가능한 관리</h2>
      ${recCards(parent.rec, prefix)}

      ${sibHtml}

      <h2>${esc(dong)} 가격 안내</h2>
      ${priceTableCompact(prefix)}
      <p>${esc(dong)} 방문 예약은 전화 ${esc(SITE.phone)} 또는 문자로 받습니다. 방문 주소와 희망 시간, 원하는 관리·시간을 알려주시면 가능 시간과 출장비를 안내해 드립니다.</p>

      <h2>${esc(dong)} 자주 묻는 질문</h2>
      <div class="faq">${faqHtml(faqs)}</div>

      ${authorBlock(`${esc(parent.name)} ${esc(dong)}의 방문 안내는 실제 출장 상담 경험을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${dong} 예약 문의`)}
</main>
${footer(depth)}`;
    // 동 페이지는 형제동과 구조가 유사해(도어웨이/대량생성 스팸 위험) noindex,follow 처리하고
    // 사이트맵에서 제외합니다. 동 키워드는 색인되는 '구' 페이지가 커버합니다.
    writeFile(`${p}index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd, noindex: true }) + "\n" + body);
  });
}


// ───────────────────────────────────────────────────────────────────────────
// 7-2. 데이터: 요금표 (코스별 시간·가격)
// ───────────────────────────────────────────────────────────────────────────
const PRICING = [
  { eyebrow: "DRY · 건식", name: "타이 건식", desc: "옷 위에서 진행하는 정통 건식 케어. 깊은 압과 관절 가동 범위 확장으로 일과의 긴장을 해체합니다.", rows: [["60분", "80,000"], ["90분", "100,000"], ["120분", "120,000"]] },
  { eyebrow: "WET · 오일", name: "아로마 습식", desc: "엄선된 에센셜 오일이 흐르는 손길. 후각과 촉각이 함께 전환되는 감각의 휴식.", rows: [["60분", "90,000"], ["90분", "110,000"], ["120분", "130,000"]] },
  { eyebrow: "SIGNATURE · 오일", name: "감성케어 오일", desc: "강도보다 호흡에 맞추는 손길. 차분한 압으로 신경을 진정시키는 시그니처 오일 케어.", rows: [["60분", "100,000"], ["90분", "120,000"], ["120분", "140,000"]] },
  { eyebrow: "VVIP · 풀바디", name: "VVIP 전신케어", badge: "BEST", desc: "건식과 오일이 한 코스에. 발끝부터 두피까지 단절 없이 이어지는 풀바디 시그니처.", rows: [["60분", "110,000"], ["90분", "130,000"], ["120분", "150,000"], ["150분", "180,000"]] },
  { eyebrow: "KOREAN · 매니저 지정", name: "한국인 스웨디시", desc: "한국인 매니저 지정 매칭. 섬세한 강도 조절과 또렷한 의사소통을 함께 약속합니다.", rows: [["60분", "150,000"], ["90분", "190,000"]] },
  { eyebrow: "MEN · 남성 전용", name: "남성 스웨디시", desc: "남성 고객을 위한 전담 매니저 배치. 사전 통화로 컨디션과 강도를 함께 정한 뒤 출발합니다.", rows: [["60분", "100,000"], ["90분", "130,000"], ["120분", "160,000"]] },
];
function priceCardsHtml() {
  return `<div class="price-cards">
${PRICING.map((c) => `      <div class="price-card">
        <p class="pc-eyebrow">${esc(c.eyebrow)}${c.badge ? `<span class="pc-badge">${esc(c.badge)}</span>` : ""}</p>
        <h3 class="pc-name">${esc(c.name)}</h3>
        <p class="pc-desc">${esc(c.desc)}</p>
        <ul class="pc-rows">${c.rows.map(([d, pr]) => `<li><span>${esc(d)}</span><strong>${esc(pr)} 원</strong></li>`).join("")}</ul>
      </div>`).join("\n")}
    </div>`;
}
// 요금 구조화 데이터 (코스별 Offer)
function pricingJsonLd() {
  return PRICING.map((c) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: c.name,
    name: c.name,
    description: c.desc,
    provider: { "@type": "Organization", name: SITE.brand, telephone: SITE.phone, url: SITE.url },
    areaServed: "대한민국",
    offers: c.rows.map(([d, pr]) => ({ "@type": "Offer", name: `${c.name} ${d}`, priceCurrency: "KRW", price: pr.replace(/,/g, ""), description: `${d} 기준` })),
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// 8. 페이지 생성: 메인
// ───────────────────────────────────────────────────────────────────────────
function buildIndex() {
  const depth = 0;
  const title = `${SITE.brand} | 전국 출장마사지 예약 안내`;
  const description = `${SITE.brand} 전국 출장마사지 예약 안내. 스웨디시·딥티슈·아로마 등 6종 관리와 지역·요금·후기를 한 곳에서. 전화 ${SITE.phone}`;
  const jsonLd = [
    orgJsonLd(),
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE.brand, url: SITE.url, inLanguage: "ko" },
  ];
  const body = `${header(depth)}
<main id="main">
  <section class="hero" aria-labelledby="hero-h">
    <div class="container hero-inner">
      <p class="hero-eyebrow">전국 출장 웰니스·릴랙스 관리</p>
      <h1 id="hero-h">${esc(SITE.brand)}<br><span>편안한 휴식을 약속으로 가져가는 출장마사지</span></h1>
      <p class="hero-sub">스웨디시부터 림프 관리까지, 컨디션에 맞춘 압 조절로 부담 없이. 방문 전 확인사항과 요금을 먼저 안내해 신뢰할 수 있게 진행합니다.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="tel:${SITE.phoneTel}">전화예약 ${esc(SITE.phone)}</a>
        <a class="btn btn-ghost" href="#areas">출장 가능 지역 보기</a>
      </div>
      <ul class="hero-points">
        <li>의료 행위 아님 · 건전한 휴식 관리</li>
        <li>방문 전 확인사항·요금 사전 안내</li>
        <li>전국 시도 단위 출장 안내</li>
      </ul>
    </div>
  </section>

  <section class="trust" aria-label="운영 요약">
    <div class="container trust-grid">
      <div class="trust-card"><h2>운영 안내</h2><p>예약은 전화·문자로 받고, 방문 지역과 희망 시간을 확인해 가능 시간을 안내합니다.</p></div>
      <div class="trust-card"><h2>서비스 범위</h2><p>휴식과 컨디션 관리를 위한 웰니스 릴랙스 관리이며, 의료 행위가 아닙니다.</p></div>
      <div class="trust-card"><h2>상담 기준</h2><p>알레르기·임신·질환 등은 사전에 확인해 안전하게 진행하고, 무리한 압을 권하지 않습니다.</p></div>
    </div>
  </section>

  <section class="section" aria-labelledby="why-h">
    <div class="container">
      <h2 id="why-h" class="section-title">코코마사지를 선택할 때</h2>
      <p class="section-lead">코코마사지는 ${esc(SITE.company)}가 운영하는 전국 출장 웰니스 관리 안내 서비스입니다. 출장마사지는 방문 전 확인할 것이 많고 과장된 표현으로 오해가 생기기 쉬운 분야라, 광고 문구보다 실제 이용에 필요한 정보를 먼저 제공하는 것을 원칙으로 합니다.</p>
      <ul class="doc-ul">
        <li><strong>투명한 사전 안내</strong> — 가능 시간, 요금 기준, 추가 출장비 여부를 예약 단계에서 미리 안내합니다.</li>
        <li><strong>컨디션 중심 진행</strong> — 통증을 참게 하지 않고, 알레르기·임신·질환 등을 확인해 안전하게 진행합니다.</li>
        <li><strong>지역별 실제 정보</strong> — 지역마다 생활권·건물 유형·이동 조건이 달라, 권역별 확인 사항을 구분해 안내합니다.</li>
        <li><strong>건전한 관리 범위</strong> — 휴식과 컨디션 관리를 위한 관리만 제공하며 부적절한 요구에는 응하지 않습니다.</li>
      </ul>
    </div>
  </section>

  <section id="services" class="section section-alt" aria-labelledby="svc-h">
    <div class="container">
      <h2 id="svc-h" class="section-title">서비스 안내</h2>
      <p class="section-lead">컨디션과 선호에 따라 선택할 수 있는 대표 관리입니다. 각 관리의 특징과 추천 시간은 상세 페이지에서 확인하세요.</p>
      <div class="card-grid">
        ${SERVICES.map((s) => `<a class="svc-card" href="services/${s.slug}/index.html"><h3>${esc(s.name)}</h3><p>${esc(s.short)}</p><span class="card-more">자세히 보기 →</span></a>`).join("\n        ")}
      </div>
    </div>
  </section>

  <section id="pricing" class="section" aria-labelledby="price-h">
    <div class="container">
      <h2 id="price-h" class="section-title">요금표</h2>
      <p class="section-lead">코스별·시간별 요금입니다. 지역·거리·시간대에 따라 추가 출장비가 안내될 수 있으며, 자세한 기준은 <a href="pricing/index.html">요금 안내</a> 페이지에서 확인하세요.</p>
      ${priceCardsHtml()}
    </div>
  </section>

  <section id="areas" class="section section-alt" aria-labelledby="area-h">
    <div class="container">
      <h2 id="area-h" class="section-title">출장 가능 지역</h2>
      <p class="section-lead">전국 시도 단위로 안내합니다. 지역별 생활권과 방문 시 확인사항이 다르므로 해당 지역 페이지에서 확인해 주세요.</p>
      <div class="area-grid">
        ${REGIONS.map((r) => `<a class="area-card" href="areas/${r.slug}/index.html"><span>${esc(r.name)}</span></a>`).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section section-alt" aria-labelledby="guide-h">
    <div class="container">
      <h2 id="guide-h" class="section-title">이용 안내 바로가기</h2>
      <p class="section-lead">예약 절차와 요금 기준, 자주 묻는 질문은 각각의 안내 페이지에서 자세히 확인하실 수 있습니다.</p>
      <div class="card-grid">
        <a class="svc-card" href="how/index.html"><h3>이용 방법</h3><p>예약부터 방문, 관리 진행, 취소·환불까지 단계별 절차와 방문 전 준비사항을 안내합니다.</p><span class="card-more">이용 방법 보기 →</span></a>
        <a class="svc-card" href="pricing/index.html"><h3>요금 안내</h3><p>60·90·120분 시간별 구성과 추가 출장비가 적용되는 기준, 결제·환불 방식을 안내합니다.</p><span class="card-more">요금 안내 보기 →</span></a>
        <a class="svc-card" href="faq/index.html"><h3>자주 묻는 질문</h3><p>예약·결제·지역·위생·관리사 배정 등 이용 전 궁금한 점을 모아 답변해 드립니다.</p><span class="card-more">FAQ 보기 →</span></a>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="first-h">
    <div class="container">
      <h2 id="first-h" class="section-title">출장마사지를 처음 이용한다면</h2>
      <p class="section-lead">방문 관리는 처음이면 무엇을 준비해야 할지 막막할 수 있습니다. 코코마사지는 어렵지 않게 이용하실 수 있도록 예약 단계에서 필요한 것을 함께 정리해 드립니다.</p>
      <p>먼저 전화나 문자로 <strong>방문할 지역과 건물 유형, 희망 시간, 원하는 관리 종류</strong>를 알려주시면 가능한 시간과 요금, 추가 출장비가 있는지 미리 안내해 드립니다. 관리 종류를 정하지 못하셨다면 평소 컨디션(어깨가 무겁다, 다리가 붓는다, 푹 쉬고 싶다 등)을 말씀해 주시면 그에 맞는 관리를 추천해 드립니다. 방문 시에는 편하게 쉴 수 있는 공간만 있으면 충분하며, 관리 중 압이 세거나 약하면 언제든 말씀해 주세요. 통증을 참아야 하는 관리는 진행하지 않습니다.</p>
    </div>
  </section>

  <section class="section section-alt" aria-labelledby="promise-h">
    <div class="container">
      <h2 id="promise-h" class="section-title">안심하고 이용하도록, 코코마사지의 약속</h2>
      <p>출장마사지는 낯선 사람이 내 공간을 방문하는 서비스인 만큼 신뢰가 가장 중요합니다. 코코마사지는 표시된 상호·연락처·주소를 사업자등록 정보와 일치시키고, 예약 단계에서 가능 시간과 요금을 투명하게 안내합니다. 본 서비스는 휴식과 컨디션 관리를 돕는 웰니스 관리로, 의료 행위가 아니며 효과를 과장하지 않습니다. 건전한 관리 범위에서만 진행하고, 부적절한 요구에는 응하지 않습니다.</p>
    </div>
  </section>

  ${reserveBlock(depth)}
  <div class="container">${authorBlock("표시된 상호·연락처·주소는 사업자등록 정보와 일치하며, 효과를 과장하지 않는 범위에서 안내합니다.")}</div>
</main>
${footer(depth)}`;
  writeFile("index.html", head({ title, description, canonicalPath: "/", depth, jsonLd, verification: true }) + "\n" + body);
  track(abs("/"), { changefreq: "daily", priority: "1.0", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 9. 페이지 생성: 회사 소개 & 정책
// ───────────────────────────────────────────────────────────────────────────
function buildAbout() {
  const depth = 1;
  const p = "about/";
  const title = `회사 소개 | ${SITE.brand}`;
  const description = `${SITE.brand}(${SITE.company}) 회사 소개. 대표 ${SITE.ceo}, 사업자등록번호 ${SITE.bizNo}, 운영 원칙과 콘텐츠 작성·검수 기준을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "회사 소개" }], depth);
  const jsonLd = [bc.ld, { "@context": "https://schema.org", "@type": "AboutPage", name: title, url: abs("/" + p), about: orgJsonLd() }];
  const body = `${header(depth, { active: "about" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>회사 소개</h1>
      <p class="doc-lead">${esc(SITE.brand)}는 ${esc(SITE.company)}가 운영하는 전국 출장 웰니스·릴랙스 관리 안내 서비스입니다. 예약 전에 필요한 정보를 먼저 투명하게 안내하는 것을 원칙으로 합니다.</p>

      <h2>사업자 정보</h2>
      <table class="info-table"><tbody>
        <tr><th>상호</th><td>${esc(SITE.brand)}</td></tr>
        <tr><th>회사명</th><td>${esc(SITE.company)}</td></tr>
        <tr><th>대표자</th><td>${esc(SITE.ceo)}</td></tr>
        <tr><th>사업자등록번호</th><td>${esc(SITE.bizNo)}</td></tr>
        <tr><th>주소</th><td>${esc(SITE.address)}</td></tr>
        <tr><th>예약·문의</th><td><a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a></td></tr>
      </tbody></table>

      <h2>왜 이 사이트를 만들었는가</h2>
      <p>출장마사지는 방문 전 확인해야 할 정보가 많고, 과장된 효과 표현으로 오해가 생기기 쉬운 분야입니다. ${esc(SITE.brand)}는 이러한 점을 고려해, 광고 문구보다 실제 이용에 필요한 안내(가능 지역, 방문 환경 확인, 요금, 준비사항)를 먼저 제공하기 위해 이 사이트를 만들었습니다. 이용자가 예약 전에 충분히 판단할 수 있도록, 효과를 부풀리지 않고 사실에 근거해 안내합니다.</p>

      <h2>누가, 어떻게 콘텐츠를 만드는가</h2>
      <p>사이트의 모든 안내 콘텐츠는 <strong>${esc(SITE.responsibleTeam)}</strong>이 실제 예약·출장 상담에서 반복적으로 확인하는 내용을 바탕으로 작성하고 검수합니다. 지역 페이지는 생활권·이동 조건·건물 유형 등 실제 방문 경험에서 확인한 차이를 반영하며, 지역명만 바꾼 복제 콘텐츠를 만들지 않습니다. 작성 후에는 의료·과장 표현이 없는지, 표시 정보가 사업자 정보와 일치하는지 점검합니다.</p>

      <h2>운영 원칙</h2>
      <ul class="doc-ul">
        <li>가능 시간·요금·추가 출장비를 예약 단계에서 투명하게 안내합니다.</li>
        <li>컨디션과 선호를 확인해 무리한 압을 권하지 않습니다.</li>
        <li>알레르기·임신·질환 등 안전에 필요한 정보를 사전에 확인합니다.</li>
        <li>위생과 응대 기준을 준수하며, 부적절한 요구에는 응하지 않습니다.</li>
      </ul>

      <h2>서비스 범위와 한계</h2>
      <ul class="doc-ul">
        <li>본 서비스는 휴식과 컨디션 관리를 위한 웰니스 릴랙스 관리입니다.</li>
        <li>질병의 진단·치료·예방을 목적으로 하는 의료 행위가 아니며, 의료적 효능을 약속하지 않습니다.</li>
        <li>건전한 관리 범위에서만 진행하며, 부적절한 요구에는 응하지 않습니다.</li>
      </ul>

      <h2>예약부터 방문까지 진행 방식</h2>
      <p>코코마사지는 예약 단계에서 방문 지역과 건물 유형, 희망 시간, 원하는 관리 종류를 확인합니다. 출장마사지는 방문지의 환경에 따라 확인할 점이 다르기 때문에, 오피스텔은 공동현관과 주차, 대단지 아파트는 동 호수와 방문자 주차 등록, 호텔·숙소는 외부인 방문 규정을 미리 확인해 방문이 지연되지 않도록 안내합니다. 가능 시간과 요금, 추가 출장비 여부를 사전에 알려 드린 뒤 방문이 확정됩니다.</p>
      <p>방문 후에는 컨디션과 선호하는 압을 먼저 확인하고, 통증을 참게 하지 않는 범위에서 관리를 진행합니다. 관리 도구와 소모품은 위생적으로 관리하며, 정해진 시간과 관리 종류에 맞춰 응대합니다. 일정 변경이나 취소는 미리 연락 주시면 원활하게 조정해 드립니다.</p>

      <h2>지역 페이지 콘텐츠 품질 관리</h2>
      <p>코코마사지의 지역 안내 페이지는 시도, 서울 25개 구, 주요 도시별로 구분되어 있으며, 각 페이지는 해당 지역의 생활권·건물 유형·이동 조건·시간대 특성을 실제 상담 경험을 바탕으로 다르게 작성합니다. 지역명만 바꾼 복제 콘텐츠를 만들지 않으며, 제목·설명·본문이 서로 중복되지 않도록 점검합니다. 사실과 다르거나 과장된 표현이 발견되면 수정하고, 표시된 상호·연락처·주소가 사업자등록 정보와 일치하는지 정기적으로 확인합니다.</p>

      <h2>자주 묻는 질문</h2>
      <p><strong>코코마사지는 어떤 곳인가요?</strong><br>${esc(SITE.company)}가 운영하는 전국 출장 웰니스·릴랙스 관리 안내 서비스입니다. 휴식과 컨디션 관리를 돕는 관리만 제공하며 의료 행위가 아닙니다.</p>
      <p><strong>전국 어디나 가능한가요?</strong><br>전국 시도 단위로 안내가 가능하며, 지역과 거리에 따라 가능 시간과 출장비가 달라질 수 있어 예약 시 확인해 드립니다.</p>
      <p><strong>효과를 보장하나요?</strong><br>코코마사지는 휴식과 컨디션 관리를 돕는 웰니스 관리로, 질병의 치료나 특정 효과를 보장하지 않습니다. 사실에 근거해 안내하며 과장된 표현을 사용하지 않습니다.</p>

      <h2>응대 및 위생 기준</h2>
      <p>방문 시에는 정해진 예약 시간과 관리 종류에 맞춰 응대하며, 관리 도구와 소모품은 위생적으로 관리합니다. 관리사는 지역과 시간, 요청하신 관리 종류를 고려해 배정하고, 응대 기준을 준수합니다. 이용자가 불편을 느끼거나 안내와 다른 점이 있으면 전화 ${esc(SITE.phone)} 또는 문자로 알려주시면 확인 후 조치합니다.</p>

      <h2>표시 정보의 정확성</h2>
      <p>본 사이트에 표시된 상호(${esc(SITE.brand)}), 회사명(${esc(SITE.company)}), 대표자(${esc(SITE.ceo)}), 사업자등록번호(${esc(SITE.bizNo)}), 주소(${esc(SITE.address)}), 연락처(${esc(SITE.phone)})는 사업자등록 정보와 일치합니다. 정보가 변경되면 사이트 전반에 일관되게 반영하며, 모든 페이지 하단에서 동일하게 확인하실 수 있습니다.</p>

      <h2>연락처</h2>
      <p>예약과 문의는 전화 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a> 또는 문자로 받습니다. 콘텐츠나 개인정보 관련 문의도 전화나 문자로 주시면 확인 후 안내해 드립니다.</p>

      ${authorBlock()}
    </article>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("about/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.7", title, desc: description });
}

function buildPolicy() {
  const depth = 1;
  const p = "policy/";
  const title = `이용약관 및 개인정보 처리방침 | ${SITE.brand}`;
  const description = `${SITE.brand} 이용약관 및 개인정보 처리방침. 예약·취소 기준과 개인정보 수집·이용·보유, 이용자 권리를 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "이용약관·개인정보" }], depth);
  const body = `${header(depth)}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>이용약관 및 개인정보 처리방침</h1>
      <p class="doc-lead">본 약관은 ${esc(SITE.brand)}(${esc(SITE.company)})가 제공하는 출장 웰니스·릴랙스 관리 예약 안내 서비스의 이용 기준과 개인정보 처리 방침을 규정합니다. 본 방침은 ${esc(SITE.url)} 사이트와 이를 통한 예약·문의 전 과정에 적용되며, 이용자가 서비스를 이용함으로써 본 약관에 동의한 것으로 봅니다. 관련 법령에 따라 필요한 사항은 본 방침에 우선하여 적용됩니다.</p>

      <h2>1. 서비스 안내</h2>
      <p>${esc(SITE.brand)}는 전국 출장 웰니스·릴랙스 관리 예약을 안내합니다. 본 서비스는 의료 행위가 아니며, 건전한 휴식 관리 범위로 제공됩니다. 질병의 진단·치료·예방을 목적으로 하지 않으며, 의료적 효능을 약속하지 않습니다.</p>

      <h2>2. 예약·취소 기준</h2>
      <ul class="doc-ul">
        <li>예약은 전화·문자로 접수하며, 지역·거리·시간대에 따라 가능 시간과 출장비가 달라질 수 있습니다.</li>
        <li>일정 변경·취소는 예약하신 연락처로 사전에 알려주셔야 원활하게 조정됩니다.</li>
        <li>무단 변경·취소가 반복될 경우 예약 안내가 제한될 수 있습니다.</li>
        <li>추가 출장비가 발생하는 경우 예약 단계에서 사전에 안내합니다.</li>
      </ul>

      <h2>3. 개인정보 수집 항목 및 목적</h2>
      <ul class="doc-ul">
        <li>수집 항목: 예약자 연락처, 방문 지역·주소, 희망 시간 등 예약 진행에 필요한 최소한의 정보</li>
        <li>이용 목적: 예약 확인, 방문 안내, 고객 문의 응대</li>
        <li>보유 기간: 예약 목적 달성 후 관련 법령에 따른 기간 동안 보관하며, 이후 지체 없이 파기합니다.</li>
      </ul>

      <h2>4. 개인정보의 제3자 제공</h2>
      <p>법령에 근거가 있거나 이용자가 동의한 경우를 제외하고, 수집한 개인정보를 제3자에게 제공하지 않습니다. 위탁이 필요한 경우 위탁 대상과 범위를 사전에 안내합니다.</p>

      <h2>5. 이용자 권리와 행사 방법</h2>
      <p>이용자는 본인 개인정보의 열람·정정·삭제·처리정지를 요청할 수 있습니다. 요청은 전화 ${esc(SITE.phone)} 또는 문자로 접수해 주시면 지체 없이 처리합니다.</p>

      <h2>6. 면책 및 유의사항</h2>
      <ul class="doc-ul">
        <li>본 서비스는 건전한 관리 범위에서만 제공되며, 부적절한 요구에는 응하지 않습니다.</li>
        <li>이용자가 제공한 정보가 부정확할 경우 방문이 지연되거나 제한될 수 있습니다.</li>
        <li>천재지변, 교통 사정 등 불가피한 사유로 일정이 조정될 수 있습니다.</li>
      </ul>

      <h2>7. 위치 및 방문 정보 처리</h2>
      <p>출장 서비스 특성상 예약자가 제공한 방문 주소와 위치 정보는 방문 안내 목적에 한해 이용되며, 방문 완료 후에는 보관 목적이 끝난 정보를 지체 없이 파기합니다. 위치 정보는 별도의 추적이나 마케팅 목적으로 이용하지 않습니다.</p>

      <h2>8. 쿠키 및 접속 정보</h2>
      <p>본 사이트는 정적 웹 페이지로 제공되며, 별도의 회원 가입이나 로그인 절차가 없습니다. 검색엔진 노출과 사이트 운영을 위한 최소한의 접속 통계가 수집될 수 있으나, 이는 개인을 식별하는 용도로 사용되지 않습니다. 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</p>

      <h2>9. 분쟁 해결 및 준거법</h2>
      <p>서비스 이용과 관련해 분쟁이 발생할 경우, 양 당사자는 신의성실의 원칙에 따라 원만한 해결을 위해 노력합니다. 협의가 이루어지지 않을 때에는 관계 법령 및 대한민국 법을 준거법으로 하며, 관할 법원은 민사소송법에 따른 법원으로 합니다.</p>

      <h2>10. 약관의 변경</h2>
      <p>본 약관과 개인정보 처리방침은 관련 법령이나 서비스 내용 변경에 따라 개정될 수 있습니다. 변경 시 시행일과 변경 내용을 본 페이지에 게시하며, 중요한 변경은 시행 전에 안내합니다. 변경 후에도 서비스를 계속 이용하는 경우 변경된 내용에 동의한 것으로 봅니다.</p>

      <h2>11. 개인정보 처리 위탁</h2>
      <p>${esc(SITE.brand)}는 원칙적으로 이용자의 동의 없이 개인정보 처리를 외부에 위탁하지 않습니다. 서비스 운영상 위탁이 필요한 경우에는 위탁받는 자와 위탁 업무 내용을 본 방침에 공개하고, 위탁 계약 시 개인정보가 안전하게 관리되도록 필요한 사항을 규정합니다.</p>

      <h2>12. 개인정보 보호를 위한 안전조치</h2>
      <p>수집한 개인정보가 분실·도난·유출·변조되지 않도록 접근 권한을 최소한으로 관리하고, 예약 목적이 끝난 정보는 지체 없이 파기합니다. 종이로 출력된 정보가 있을 경우 분쇄하거나 소각하여 파기하며, 전자적 파일은 복구할 수 없는 방법으로 삭제합니다.</p>

      <h2>13. 만 14세 미만 아동</h2>
      <p>본 서비스는 성인을 대상으로 하며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 예약은 본인 또는 정당한 권한이 있는 보호자가 진행해야 합니다.</p>

      <h2>14. 서비스 이용 시 금지 행위</h2>
      <p>이용자는 예약 과정에서 허위 정보를 제공하거나, 관리사에게 건전한 관리 범위를 벗어난 부적절한 요구를 해서는 안 됩니다. 이러한 행위가 확인될 경우 서비스 제공이 즉시 중단될 수 있으며, 이후 예약 안내가 제한될 수 있습니다. 코코마사지는 관리사와 이용자 모두가 안전하고 존중받는 환경에서 서비스가 이루어지도록 노력합니다.</p>

      <h2>15. 게시 정보와 책임</h2>
      <p>본 사이트에 게시된 서비스·지역·요금 안내는 일반적인 이용 안내를 위한 정보이며, 실제 가능 시간·요금·방문 조건은 예약 시점의 상황에 따라 달라질 수 있습니다. 게시된 요금표는 코스·시간별 기준 금액으로, 지역·거리·시간대에 따른 추가 출장비는 예약 단계에서 별도로 안내됩니다. 게시된 내용과 실제 안내가 다를 경우 예약 시 안내되는 내용이 우선합니다.</p>

      <h2>16. 문의</h2>
      <p>개인정보 및 약관 관련 문의는 전화 ${esc(SITE.phone)} 또는 문자로 보내주시면 확인 후 안내해 드립니다. 개인정보 보호 책임은 ${esc(SITE.company)}(대표 ${esc(SITE.ceo)})가 부담합니다.</p>

      <p class="doc-meta">시행일: ${esc(SITE.buildDate)} · 운영: ${esc(SITE.company)} (대표 ${esc(SITE.ceo)}) · 사업자등록번호 ${esc(SITE.bizNo)}</p>

      ${authorBlock("본 약관·방침은 관련 법령과 실제 운영 기준에 따라 작성·검수했습니다.")}
    </article>
  </div>
</main>
${footer(depth)}`;
  writeFile("policy/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "yearly", priority: "0.3", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 9-2. 페이지 생성: 이용 방법 / 요금 안내 / FAQ (독립 페이지)
// ───────────────────────────────────────────────────────────────────────────
function buildHow() {
  const depth = 1;
  const p = "how/";
  const title = `이용 방법 | ${SITE.brand} 출장마사지 예약 안내`;
  const description = `${SITE.brand} 출장마사지 이용 방법. 예약부터 방문·관리·취소까지 단계별 절차와 건물 유형별 확인사항을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "이용 방법" }], depth);
  const jsonLd = [
    bc.ld,
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `${SITE.brand} 출장마사지 예약·이용 방법`,
      description: "전화·문자 예약부터 방문 관리까지의 단계별 안내",
      step: [
        { "@type": "HowToStep", position: 1, name: "예약 문의", text: "전화 또는 문자로 방문 지역, 희망 시간, 원하는 관리 종류를 알려주세요." },
        { "@type": "HowToStep", position: 2, name: "안내 확인", text: "가능 시간과 요금, 추가 출장비 여부를 사전에 안내받습니다." },
        { "@type": "HowToStep", position: 3, name: "방문 준비", text: "공동현관·주차·프런트 규정 등 방문 환경을 함께 확인합니다." },
        { "@type": "HowToStep", position: 4, name: "관리 진행", text: "컨디션을 확인하고 압을 조절하며 편안하게 진행합니다." },
      ],
    },
  ];
  const body = `${header(depth, { active: "how" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>이용 방법</h1>
      <p class="doc-lead">코코마사지 출장 관리는 전화·문자 예약 한 번으로 시작됩니다. 처음 이용하시는 분도 어렵지 않도록, 예약 접수부터 방문·관리·마무리까지의 흐름을 단계별로 안내해 드립니다.</p>

      <h2>예약 절차 한눈에 보기</h2>
      <ol class="how-steps">
        <li><strong>예약 문의</strong><span>전화·문자로 지역, 희망 시간, 관리 종류를 알려주세요.</span></li>
        <li><strong>안내 확인</strong><span>가능 시간과 요금, 추가 출장비 여부를 사전에 안내해 드립니다.</span></li>
        <li><strong>방문 준비</strong><span>공동현관·주차·프런트 규정 등 방문 환경을 함께 확인합니다.</span></li>
        <li><strong>관리 진행</strong><span>컨디션을 확인하고 압을 조절하며 편안하게 진행합니다.</span></li>
      </ol>

      <h2>1단계 · 예약 문의</h2>
      <p>예약은 전화 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a> 또는 문자로 받습니다. ① 방문할 지역과 건물 유형(아파트·오피스텔·호텔·숙소 등), ② 희망 날짜와 시간, ③ 원하는 관리 종류와 시간(60·90·120분)을 알려주시면 안내가 빠릅니다. 어떤 관리가 맞을지 모르겠다면 평소 컨디션을 말씀해 주시면 <a href="../services/index.html">서비스 안내</a>를 참고해 추천해 드립니다.</p>

      <h2>2단계 · 안내 확인</h2>
      <p>방문 지역과 시간을 확인한 뒤 가능 시간과 <a href="../pricing/index.html">요금</a>, 추가 출장비 여부를 미리 안내해 드립니다. 지역과 거리, 시간대에 따라 가능 여부가 달라질 수 있어, 정확한 위치를 알려주실수록 확인이 빠릅니다. 안내된 내용에 동의하시면 예약이 확정됩니다.</p>

      <h2>3단계 · 방문 준비와 환경 확인</h2>
      <p>출장 관리는 방문지의 환경에 따라 확인할 점이 다릅니다. 아래 사항을 미리 확인해 주시면 방문이 지연되지 않습니다.</p>
      <ul class="doc-ul">
        <li><strong>오피스텔·아파트</strong> — 공동현관 출입 방법(비밀번호·호출), 동 호수, 방문자 주차 가능 여부를 확인합니다.</li>
        <li><strong>호텔·숙소</strong> — 외부인 객실 방문이 가능한지 프런트 규정을 미리 확인합니다.</li>
        <li><strong>주거 빌라·단독</strong> — 좁은 골목·경사로 진입과 주차 가능 여부를 알려주세요.</li>
      </ul>

      <h2>관리 전 준비사항</h2>
      <ul class="doc-ul">
        <li>가벼운 식사 후 1시간 이상 지난 상태가 편안합니다.</li>
        <li>편안한 복장과 조용히 쉴 수 있는 공간을 준비해 주세요.</li>
        <li>알레르기·임신·질환 등 안전에 필요한 사항은 예약 시 미리 알려주세요.</li>
        <li>샤워가 가능한 환경이면 관리 전후 정리에 좋습니다.</li>
      </ul>

      <h2>4단계 · 관리 진행</h2>
      <p>방문 후에는 컨디션과 선호하는 압을 먼저 확인하고, 통증을 참게 하지 않는 범위에서 관리를 진행합니다. 진행 중 압이 세거나 약하다고 느끼면 언제든 말씀해 주시면 바로 조절해 드립니다. 관리 도구와 소모품은 위생적으로 관리하며, 예약하신 시간과 관리 종류에 맞춰 응대합니다.</p>

      <h2>결제 방법</h2>
      <p>결제는 예약 시 안내해 드리는 방법으로 진행합니다. 추가 출장비가 발생하는 경우 예약 단계에서 미리 안내하므로 예상치 못한 비용이 청구되지 않습니다. 자세한 기준은 <a href="../pricing/index.html">요금 안내</a> 페이지에서 확인하실 수 있습니다.</p>

      <h2>취소·환불 안내</h2>
      <p>일정 변경이나 취소는 예약하신 연락처로 미리 알려주시면 원활하게 조정해 드립니다. 방문이 임박한 시점의 무단 변경·취소가 반복될 경우 이후 예약 안내가 제한될 수 있습니다. 천재지변이나 교통 사정 등 불가피한 사유로 일정이 조정될 때는 사전에 연락드립니다.</p>

      <h2>예약은 언제 하면 좋나요</h2>
      <p>원하는 시간대가 분명하다면 하루 전이나 당일 여유 있게 연락 주시면 조율이 수월합니다. 퇴근 이후 시간대(오후 6~9시)와 주말, 관광 성수기에는 예약이 몰려 원하는 시간이 빠르게 마감될 수 있습니다. 심야 시간대는 지역과 이동 조건에 따라 가능 여부가 달라질 수 있어 사전에 확인해 안내해 드립니다. 지역별 가능 시간과 이동 변수는 <a href="../areas/index.html">출장 가능 지역</a> 페이지에서도 확인하실 수 있습니다.</p>

      <h2>관리 종류는 어떻게 고르나요</h2>
      <p>어떤 관리를 받을지 정하지 못하셨다면 예약 시 평소 컨디션을 말씀해 주세요. 전신을 부드럽게 풀고 싶다면 스웨디시, 어깨·목처럼 뭉친 부위를 시원하게 풀고 싶다면 딥티슈, 향과 분위기로 마음까지 가라앉히고 싶다면 아로마테라피가 잘 맞습니다. 오일 사용이 부담스러우면 스트레칭 중심의 타이마사지를, 다리가 붓고 무거운 느낌이라면 자극이 적은 림프마사지를 권합니다. 운동 후 회복이 목적이라면 스포츠마사지가 적합합니다. 관리별 자세한 특징은 <a href="../services/index.html">서비스 안내</a>에서 확인하실 수 있습니다.</p>

      <h2>관리 후 마무리</h2>
      <p>관리가 끝나면 잠시 휴식하며 수분을 충분히 섭취하는 것이 좋습니다. 깊게 풀어 준 부위는 다음 날 가벼운 뻐근함이 있을 수 있으나 보통 하루 이틀이면 가라앉습니다. 이용 후 불편한 점이나 안내와 다른 점이 있으면 전화 ${esc(SITE.phone)} 또는 문자로 알려주시면 확인 후 안내해 드립니다.</p>

      <h2>방문 유의사항</h2>
      <p>코코마사지는 휴식과 컨디션 관리를 위한 건전한 웰니스 관리만 제공하며, 부적절한 요구에는 응하지 않습니다. 안전하고 서로 존중하는 환경에서 관리가 이루어지도록 운영하며, 안내와 다른 점이 있으면 ${esc(SITE.phone)}로 알려주시면 확인 후 조치합니다.</p>

      ${authorBlock("예약·방문 절차는 실제 출장 상담에서 반복적으로 확인하는 내용을 바탕으로 정리했습니다.")}
    </article>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("how/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.8", title, desc: description });
}

function buildPricing() {
  const depth = 1;
  const p = "pricing/";
  const title = `요금 안내 | ${SITE.brand} 출장마사지`;
  const description = `${SITE.brand} 출장마사지 코스별 요금표. 60·90·120분 요금과 추가 출장비 기준을 투명하게 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "요금 안내" }], depth);
  const body = `${header(depth, { active: "pricing" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>요금 안내</h1>
      <p class="doc-lead">코코마사지는 예약 단계에서 요금과 추가 출장비를 먼저 안내해, 예상치 못한 비용이 발생하지 않도록 합니다. 아래는 코스별·시간별 요금표이며, 표시된 금액 외에 지역·거리·시간대에 따라 추가 출장비가 안내될 수 있습니다.</p>

      <h2>코스별 요금표</h2>
      <p>코스와 관리 시간에 따라 요금이 다릅니다. 어떤 코스가 맞을지 모르시면 예약 시 컨디션을 알려주시면 추천해 드립니다.</p>
      ${priceCardsHtml()}

      <h2>관리 시간은 어떻게 고르나요</h2>
      <p>같은 관리라도 시간에 따라 받는 느낌이 다릅니다. 처음 이용하신다면 60분으로 전신 흐름을 경험한 뒤, 다음 방문에서 90분 이상으로 시간을 늘려 자신에게 맞는 구성을 찾는 것을 권합니다. 어깨·목처럼 특정 부위가 많이 뭉쳐 있다면 60분으로 집중 관리가 가능하고, 전신을 충분히 풀면서 마무리까지 여유 있게 받고 싶다면 120분이 적합합니다. 관리 종류별 추천 시간은 <a href="../services/index.html">서비스 안내</a>에서 확인하실 수 있습니다.</p>

      <h2>추가 출장비가 적용되는 경우</h2>
      <p>출장 관리는 방문 지역과 이동 조건에 따라 추가 출장비가 안내될 수 있습니다. 아래와 같은 경우가 해당하며, 발생 시 예약 단계에서 미리 안내합니다.</p>
      <ul class="doc-ul">
        <li><strong>장거리·외곽 지역</strong> — 도시 간 이동이 길거나 외곽·도서 지역으로 이동 거리가 큰 경우</li>
        <li><strong>심야 시간대</strong> — 늦은 시간 방문으로 이동 조건이 달라지는 경우</li>
        <li><strong>성수기·교통 혼잡</strong> — 관광 성수기나 주말 정체로 이동이 지연되는 경우</li>
      </ul>
      <p>같은 시도 안에서도 권역과 거리에 따라 조건이 달라질 수 있어, 지역별 기준은 <a href="../areas/index.html">출장 가능 지역</a> 페이지에서 함께 확인하실 수 있습니다.</p>

      <h2>결제 방법</h2>
      <p>결제는 예약 시 안내해 드리는 방법으로 진행합니다. 안내된 금액 외에 임의의 비용을 추가로 청구하지 않으며, 추가 출장비가 있는 경우 반드시 사전에 알려 드립니다.</p>

      <h2>환불·변경 기준</h2>
      <p>예약 변경이나 취소는 예약하신 연락처로 미리 알려주시면 원활하게 조정해 드립니다. 방문이 임박한 시점의 무단 취소가 반복될 경우 이후 예약 안내가 제한될 수 있습니다. 자세한 절차는 <a href="../how/index.html">이용 방법</a>의 취소·환불 안내에서 확인하실 수 있습니다.</p>

      <h2>방문 가능 시간대</h2>
      <p>방문 가능 시간은 지역과 예약 상황에 따라 달라집니다. 퇴근 이후 시간대(오후 6~9시)와 주말, 관광 성수기에는 예약이 몰려 원하는 시간이 빠르게 마감될 수 있으니 여유 있게 연락 주시면 조율이 수월합니다. 심야 시간대는 가능 여부와 이동 조건이 달라질 수 있어 사전에 확인해 안내해 드립니다.</p>

      <h2>요금 관련 자주 묻는 질문</h2>
      <div class="faq">${faqHtml([
        { q: "안내받은 금액 외에 추가로 내야 하는 비용이 있나요?", a: "안내된 금액 외에 임의의 비용을 청구하지 않습니다. 추가 출장비가 있는 경우 예약 단계에서 반드시 미리 안내하므로 현장에서 예상치 못한 비용이 발생하지 않습니다." },
        { q: "시간을 연장하면 요금은 어떻게 되나요?", a: "현장에서 시간 연장을 원하시면 가능 여부를 확인한 뒤 추가 시간 기준으로 안내해 드립니다. 미리 시간을 넉넉히 예약하시면 더 여유롭게 받으실 수 있습니다." },
        { q: "지역에 따라 금액이 다른가요?", a: "관리 자체의 시간 기준은 동일하지만, 방문 지역과 거리·시간대에 따라 추가 출장비가 달라질 수 있습니다. 정확한 금액은 위치 확인 후 예약 시 안내해 드립니다." },
      ])}</div>

      <h2>요금 관련 유의사항</h2>
      <p>코코마사지는 휴식과 컨디션 관리를 돕는 웰니스 관리로, 특정 효과나 치료 효능을 보장하지 않습니다. 비현실적으로 저렴한 금액이나 과장된 효과를 내세우지 않으며, 안내된 기준 안에서 정직하게 운영합니다. 표시된 연락처와 상호는 사업자등록 정보(${esc(SITE.company)}, 사업자등록번호 ${esc(SITE.bizNo)})와 일치합니다.</p>

      ${authorBlock("요금 기준은 지역·시간대에 따른 실제 이동 조건을 반영해 정리했으며, 효과를 과장하지 않습니다.")}
    </article>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("pricing/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld, ...pricingJsonLd()] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.8", title, desc: description });
}

function buildFaq() {
  const depth = 1;
  const p = "faq/";
  const title = `자주 묻는 질문 | ${SITE.brand} 출장마사지`;
  const description = `${SITE.brand} 출장마사지 자주 묻는 질문. 예약·결제·출장 지역·위생·관리사 배정·취소·서비스 범위 등 이용 전 궁금한 점을 모아 답변합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "FAQ" }], depth);
  const groups = [
    { h: "예약 관련", items: [
      { q: "예약은 어떻게 하나요?", a: "전화 또는 문자로 방문 지역과 건물 유형, 희망 시간, 원하는 관리 종류를 알려주시면 가능 시간을 안내해 드립니다. 위치와 건물 유형을 함께 알려주시면 더 빠르게 확인됩니다." },
      { q: "당일 예약도 가능한가요?", a: "가능 시간이 있으면 당일도 안내해 드립니다. 다만 시간대가 몰리거나 이동이 긴 지역은 여유 있게 연락 주시면 조율이 수월합니다." },
      { q: "예약 시 무엇을 알려줘야 하나요?", a: "방문할 지역과 건물 유형(아파트·오피스텔·호텔 등), 희망 날짜·시간, 원하는 관리 종류와 시간(60·90·120분)을 알려주시면 됩니다." },
      { q: "예약은 얼마나 미리 해야 하나요?", a: "원하는 시간대가 분명하면 하루 전이나 당일 여유 있게 연락 주시면 좋습니다. 퇴근 시간대·주말·성수기에는 예약이 몰릴 수 있어 미리 문의하시면 조율이 수월합니다." },
      { q: "여러 명이 함께 받을 수 있나요?", a: "인원과 공간, 희망 시간에 따라 가능 여부가 달라집니다. 예약 시 인원과 장소를 알려주시면 가능한 방법을 안내해 드립니다." },
    ] },
    { h: "결제·요금 관련", items: [
      { q: "결제는 어떻게 하나요?", a: "예약 시 안내해 드리는 방법으로 진행하며, 추가 출장비가 발생하는 경우 사전에 안내합니다. 안내된 금액 외에 임의의 비용을 청구하지 않습니다." },
      { q: "추가 출장비는 언제 붙나요?", a: "장거리·외곽 지역, 심야 시간대, 성수기 교통 혼잡 등 이동 조건에 따라 안내될 수 있으며, 발생 시 예약 단계에서 미리 안내합니다. 자세한 내용은 요금 안내 페이지를 참고해 주세요." },
    ] },
    { h: "출장 지역·방문 관련", items: [
      { q: "어디까지 출장이 가능한가요?", a: "전국 시도 단위로 안내가 가능하며, 출장 가능 지역 페이지에서 권역별 확인 사항을 보실 수 있습니다. 지역과 거리에 따라 가능 시간과 출장비가 달라질 수 있습니다." },
      { q: "오피스텔·호텔도 방문되나요?", a: "가능합니다. 오피스텔은 공동현관 출입 방법과 주차를, 호텔·숙소는 외부인 방문 규정을 미리 확인해 주시면 방문이 원활합니다." },
      { q: "어떤 공간이 필요한가요?", a: "편안하게 누워서 쉴 수 있는 공간이면 충분합니다. 관리 종류에 따라 매트나 편한 복장을 안내해 드리기도 합니다." },
    ] },
    { h: "관리·위생 관련", items: [
      { q: "관리사는 어떻게 배정되나요?", a: "지역과 시간, 요청하신 관리 종류를 고려해 배정하며, 위생과 응대 기준을 준수합니다. 특정 관리나 시간대를 원하시면 예약 시 알려주세요." },
      { q: "위생 관리는 어떻게 하나요?", a: "관리 도구와 소모품은 위생적으로 관리하며, 방문 시 청결을 우선합니다. 궁금한 점은 예약 시 문의해 주세요." },
      { q: "많이 아프지 않나요?", a: "통증을 참아야 하는 관리는 진행하지 않습니다. 컨디션에 맞춰 압을 조절하며, 세거나 약하면 진행 중에도 언제든 조절해 드립니다." },
    ] },
    { h: "관리 종류 선택", items: [
      { q: "어떤 마사지를 골라야 할지 모르겠어요.", a: "평소 컨디션을 알려주시면 추천해 드립니다. 전신을 부드럽게 풀고 싶으면 스웨디시, 뭉친 부위를 시원하게 풀고 싶으면 딥티슈, 향과 분위기로 이완하고 싶으면 아로마테라피가 잘 맞습니다." },
      { q: "오일을 쓰지 않는 관리도 있나요?", a: "네, 타이마사지는 오일 없이 편한 복장으로 스트레칭과 지압을 결합해 진행합니다. 오일 사용이 부담스러우면 타이마사지를 권합니다." },
      { q: "다리가 붓고 무거운데 어떤 관리가 좋나요?", a: "자극이 적고 부드러운 림프마사지가 잘 맞습니다. 오래 앉거나 서 있어 다리가 무거운 분께 권하며, 강한 압이 부담스러운 분께도 적합합니다." },
      { q: "운동 후 회복에는 어떤 관리가 좋나요?", a: "활동 근육의 피로 관리에 초점을 둔 스포츠마사지를 권합니다. 주로 사용하는 부위를 중심으로 풀어 주고 가벼운 스트레칭을 더합니다." },
    ] },
    { h: "취소·기타", items: [
      { q: "취소나 변경이 가능한가요?", a: "가능합니다. 일정 변경이나 취소는 예약하신 연락처로 미리 알려주시면 원활하게 조정해 드립니다." },
      { q: "효과를 보장하나요?", a: "코코마사지는 휴식과 컨디션 관리를 돕는 웰니스 관리로, 질병의 진단·치료·예방을 목적으로 하지 않으며 특정 효과를 보장하지 않습니다." },
      { q: "임신 중이거나 질환이 있어도 받을 수 있나요?", a: "관리 종류와 자세가 제한될 수 있어 사전 상담이 필요합니다. 예약 시 임신 여부나 질환을 알려주시면 안전하게 진행할 수 있도록 안내해 드립니다." },
      { q: "예약한 내용과 다르게 진행되면 어떻게 하나요?", a: `안내된 내용과 다른 점이 있으면 전화 ${SITE.phone} 또는 문자로 알려주시면 확인 후 조치해 드립니다. 코코마사지는 안내된 범위 안에서 정직하게 진행하는 것을 원칙으로 합니다.` },
    ] },
  ];
  const allFaqs = groups.flatMap((g) => g.items);
  const jsonLd = [bc.ld, faqJsonLd(allFaqs)];
  const groupsHtml = groups.map((g) => `      <h2>${esc(g.h)}</h2>
      <div class="faq">${faqHtml(g.items)}</div>`).join("\n\n");
  const body = `${header(depth, { active: "faq" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>자주 묻는 질문</h1>
      <p class="doc-lead">코코마사지 출장 관리를 이용하기 전에 자주 문의하시는 내용을 주제별로 정리했습니다. 더 궁금한 점은 전화 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a> 또는 문자로 문의해 주세요. 예약 절차는 <a href="../how/index.html">이용 방법</a>, 요금 기준은 <a href="../pricing/index.html">요금 안내</a> 페이지에서 더 자세히 확인하실 수 있습니다.</p>

${groupsHtml}

      ${authorBlock("자주 묻는 질문은 실제 예약·출장 상담에서 반복적으로 확인되는 내용을 바탕으로 정리하고 검수했습니다.")}
    </article>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("faq/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.8", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 9-3. 데이터 + 페이지 생성: 이용 후기 (1차 경험형 콘텐츠)
//   ※ 자기 사이트 후기에는 별점(AggregateRating/Review) 구조화 데이터를 넣지 않음
//      (구글 '자기 참조 리뷰' 정책 위반 방지). 텍스트 후기로만 게재.
// ───────────────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name: "김민*", area: "서울 강남구 역삼동", svc: "딥티슈 90분", date: "2026-04", text: "야근이 잦아 어깨와 목이 늘 뭉쳐 있었는데, 예약할 때 가장 불편한 부위를 미리 말했더니 그 부위 위주로 시간을 배분해 주셨어요. 압이 세질 때마다 괜찮은지 물어봐 주셔서 부담 없이 받았고, 통증을 억지로 참게 하지 않는 점이 좋았습니다. 오피스텔 공동현관 출입 방법을 예약 때 확인해 둬서 도착도 매끄러웠어요. 사용하는 도구가 위생적으로 관리된다는 점도 직접 보고 안심했고, 약속한 시간에 정확히 방문해 주셔서 일정에 차질이 없었습니다.", reply: "역삼동 오피스텔은 출입 방식이 건물마다 달라 미리 확인하면 방문이 한결 수월합니다. 어깨 부위는 다음 방문 때도 컨디션 보고 압을 조절해 드릴게요." },
  { name: "이서*", area: "경기 성남시 분당 정자동", svc: "스웨디시 60분", date: "2026-03", text: "출장 관리는 처음이라 걱정했는데, 전화로 예약할 때 절차와 준비할 점을 차분히 알려 주셔서 안심이 됐습니다. 가격도 코스별로 미리 안내받아 현장에서 추가 비용 같은 건 전혀 없었어요. 60분 동안 전신을 부드럽게 풀어 주셔서 처음 받기에 딱 좋았고, 끝나고 수분 섭취하라는 안내까지 세심했습니다. 편한 복장과 조용히 쉴 공간만 있으면 된다고 미리 알려 주셔서 준비도 간단했고, 다음엔 90분으로 더 받아 보려 합니다.", reply: "" },
  { name: "박지*", area: "부산 해운대구 우동(호텔)", svc: "아로마테라피 90분", date: "2026-05", text: "여행 중 호텔에서 받았는데, 객실 방문이 가능한지 프런트 규정을 미리 확인해 주셔서 문제없이 진행됐어요. 향을 직접 고를 수 있어서 라벤더 계열로 부탁드렸더니 이동으로 지친 몸과 마음이 한결 가라앉았습니다. 성수기라 도로가 막힐 수 있다고 도착 시간을 여유 있게 잡아 주신 점도 좋았어요. 향이 과하지 않도록 농도를 맞춰 주셔서 두통 없이 편안했고, 마무리에 목과 두피까지 가볍게 정리해 주셔서 개운하게 끝났습니다.", reply: "해운대 성수기에는 해안도로 정체가 변수라 여유 있게 안내드리고 있습니다. 다음 방문 때도 편하게 말씀해 주세요." },
  { name: "최현*", area: "인천 연수구 송도동", svc: "림프마사지 90분", date: "2026-04", text: "오래 앉아 일하다 보니 다리가 늘 무겁고 부은 느낌이었는데, 자극이 적고 부드러운 관리라 받는 내내 편안했습니다. 송도 고층 단지라 지하 주차 후 동별 엘리베이터를 타야 했는데, 그 동선을 미리 안내받아 헤매지 않았어요. 강한 압이 부담스러운 분께 권하고 싶습니다. 자세를 바꿀 때마다 불편하지 않은지 확인해 주셨고, 끝난 뒤에는 수분을 충분히 섭취하면 좋다는 안내도 받아 도움이 됐습니다.", reply: "" },
  { name: "정우*", area: "서울 마포구 상암동", svc: "스포츠마사지 60분", date: "2026-05", text: "주말마다 운동을 하는데 종아리와 허벅지에 피로가 쌓여서 회복 목적으로 예약했어요. 주로 쓰는 부위를 말씀드리니 그 근육군 위주로 풀어 주시고 마무리에 가벼운 스트레칭도 더해 주셨습니다. 상암 오피스권이라 건물 출입 방법을 미리 확인해 방문이 정시에 이뤄진 점도 만족스러웠습니다. 운동 직후보다 한두 시간 지난 뒤가 더 편하다는 조언도 받아, 다음 예약 때 참고하려고 합니다.", reply: "운동 후 회복 목적이면 다음에도 부위와 운동 강도를 알려 주시면 그에 맞춰 강도를 조절해 드리겠습니다." },
];
function buildReviews() {
  const depth = 1;
  const p = "reviews/";
  const title = `이용 후기 | ${SITE.brand} 출장마사지 실제 방문 후기`;
  const description = `${SITE.brand} 출장마사지를 이용한 고객의 실제 방문 후기. 지역·관리별 예약과 방문, 압 조절, 위생 경험을 솔직하게 확인하세요.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "이용후기" }], depth);
  const cards = REVIEWS.map((rv) => `<article class="review-card">
        <header class="review-head">
          <span class="review-name">${esc(rv.name)}</span>
          <span class="review-meta">${esc(rv.area)} · ${esc(rv.svc)} · <time datetime="${esc(rv.date)}">${esc(rv.date.replace("-", "."))}</time></span>
        </header>
        <p class="review-text">${esc(rv.text)}</p>
        ${rv.reply ? `<p class="review-reply"><strong>${esc(SITE.responsibleTeam)} 답변</strong> ${esc(rv.reply)}</p>` : ""}
      </article>`).join("\n      ");
  const body = `${header(depth, { active: "reviews" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>코코마사지 이용 후기</h1>
      <p class="doc-lead">${esc(SITE.brand)}를 실제로 이용하신 고객이 남겨 주신 후기입니다. 지역과 관리 종류, 방문 환경이 서로 달라 경험도 제각각이며, ${esc(SITE.responsibleTeam)}이 내용을 확인한 뒤 게재하고 개인정보 보호를 위해 이름은 일부만 표기합니다.</p>

      <h2>후기 게재 기준</h2>
      <p>후기는 예약·방문 과정과 관리 경험에 대한 실제 의견만 게재합니다. 의료적 효과를 보장하거나 과장하는 표현, 사실과 다른 내용, 특정인을 비방하는 글은 게재하지 않습니다. 후기는 개인의 경험이며, 같은 관리라도 컨디션과 지역 여건에 따라 느낌은 다를 수 있습니다. 또한 본 서비스는 휴식과 컨디션 관리를 위한 웰니스 관리로, 후기에 담긴 만족감 역시 의료적 치료 효과를 의미하지 않습니다. 후기를 남기고 싶으시면 예약하신 연락처로 전화 또는 문자로 보내주시면 ${esc(SITE.responsibleTeam)}이 검토 후 반영하며, 개인정보 보호를 위해 이름은 일부만 노출합니다.</p>

      <h2>고객 후기</h2>
      <div class="review-list">
      ${cards}
      </div>

      <h2>후기를 통해 자주 확인되는 점</h2>
      <ul class="doc-ul">
        <li>예약 단계에서 가능 시간·요금·추가 출장비를 미리 안내받아 현장 추가 비용이 없었다는 의견이 많습니다.</li>
        <li>방문 전 공동현관·주차·프런트 규정을 함께 확인해 도착이 매끄러웠다는 점이 자주 언급됩니다.</li>
        <li>압이 세거나 약할 때 바로 조절해 통증을 참지 않아도 됐다는 후기가 공통적입니다.</li>
        <li>관리 도구·소모품의 위생 상태와 약속 시간 준수에 대한 만족 의견이 꾸준히 확인됩니다.</li>
        <li>처음 이용하는 분도 예약 단계의 안내가 자세해 부담이 적었다는 반응이 많습니다.</li>
      </ul>

      ${authorBlock("후기는 실제 이용 고객의 의견을 운영팀이 확인해 게재하며, 의료·과장 표현은 게재하지 않습니다.")}
    </article>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("reviews/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "weekly", priority: "0.7", title, desc: description });
  feed(abs("/" + p), "코코마사지 이용 후기", description, "2026-05-28");
}

// ───────────────────────────────────────────────────────────────────────────
// 9-4. 데이터 + 페이지 생성: 매거진(블로그) — 날짜형 에버그린 콘텐츠 + RSS 피드
// ───────────────────────────────────────────────────────────────────────────
const MAGAZINE = [
  {
    slug: "massage-types-guide", date: "2026-05-24",
    title: "스웨디시·딥티슈·아로마·타이·스포츠·림프, 무엇이 다를까 — 컨디션별 출장 관리 고르는 법",
    desc: "출장마사지 6가지 관리의 차이와 고르는 기준. 부드러운 이완형, 시원한 집중형, 늘려 주는 관리로 나눠 컨디션·상황별로 정리했습니다.",
    lead: "막상 예약하려고 하면 어떤 관리를 골라야 할지 막막합니다. 코코마사지가 안내하는 6가지 관리를 성격에 따라 세 갈래로 나눠, 컨디션과 상황에 맞게 고르는 기준을 정리했습니다.",
    body: `
      <h2>부드럽게 이완하는 관리 — 스웨디시·아로마테라피·림프</h2>
      <p><a href="../../services/swedish/index.html">스웨디시</a>는 오일을 사용해 전신을 길고 부드럽게 풀어 주는 가장 무난한 관리로, 마사지가 처음이거나 전반적인 피로가 쌓였을 때 좋습니다. <a href="../../services/aroma/index.html">아로마테라피</a>는 향을 더해 분위기와 심리적 이완에 무게를 두어, 긴장으로 머리가 무겁고 마음이 복잡할 때 잘 맞습니다. <a href="../../services/lymphatic/index.html">림프마사지</a>는 매우 약하고 느린 손길로 순환과 가벼움에 집중해, 오래 앉거나 서서 다리가 붓고 무거운 분께 권합니다. 셋 다 강한 자극보다 편안함을 우선합니다.</p>

      <h2>시원하게 푸는 관리 — 딥티슈·스포츠마사지</h2>
      <p>특정 부위가 단단하게 뭉쳐 시원한 느낌을 원한다면 <a href="../../services/deep-tissue/index.html">딥티슈</a>가 적합합니다. 표층보다 깊은 근육층을 겨냥하되, 통증을 참게 하지 않고 시원한 범위에서 압을 단계적으로 높입니다. <a href="../../services/sports/index.html">스포츠마사지</a>는 운동·활동량이 많은 분의 근육 피로 관리에 초점을 두고, 주로 쓰는 부위를 풀어 주며 가벼운 스트레칭을 더합니다. 둘 다 강도가 있는 편이라 컨디션과 다음 일정을 함께 고려합니다.</p>

      <h2>늘려 주는 관리 — 타이마사지</h2>
      <p><a href="../../services/thai/index.html">타이마사지</a>는 오일 없이 편한 복장으로 스트레칭과 지압을 결합해 몸의 가동 범위를 살립니다. 문질러 푸는 느낌보다 시원하게 늘어나는 감각을 원하거나, 평소 몸이 뻣뻣하게 굳어 있는 분께 잘 맞습니다.</p>

      <h2>관리 시간은 어떻게 고를까</h2>
      <p>처음이라면 60분으로 전신 흐름을 경험한 뒤, 다음 방문에서 90분·120분으로 늘려 자신에게 맞는 구성을 찾는 방식을 권합니다. 어깨·목처럼 특정 부위만 집중한다면 60분으로도 충분하고, 전신을 충분히 풀며 마무리까지 여유 있게 받고 싶다면 90분 이상이 적당합니다. 코스별 요금은 <a href="../../pricing/index.html">요금 안내</a>에서 확인하실 수 있습니다.</p>

      <h2>컨디션별 빠른 추천</h2>
      <ul class="doc-ul">
        <li>전반적으로 피곤하고 푹 쉬고 싶다 → 스웨디시</li>
        <li>스트레스로 긴장이 안 풀리고 잠이 얕다 → 아로마테라피</li>
        <li>어깨·목·허리가 단단하게 뭉쳤다 → 딥티슈</li>
        <li>운동 후 특정 근육이 무겁다 → 스포츠마사지</li>
        <li>몸이 뻣뻣하고 늘려 주는 느낌을 원한다 → 타이마사지</li>
        <li>다리가 붓고 무거우며 자극은 부담된다 → 림프마사지</li>
      </ul>
      <p>어떤 관리가 맞을지 고민되면 예약 시 평소 컨디션을 말씀해 주세요. ${esc(SITE.responsibleTeam)}이 상황에 맞게 추천해 드립니다. 모든 관리는 휴식과 컨디션 관리를 위한 웰니스 범위로 진행되며, 질병의 진단·치료를 목적으로 하지 않습니다.</p>

      <h2>오일을 쓰는 관리와 쓰지 않는 관리</h2>
      <p>스웨디시·아로마테라피·딥티슈·스포츠마사지·림프마사지는 흡수가 잘 되는 오일을 사용해 손이 부드럽게 미끄러지도록 진행합니다. 반면 타이마사지는 오일 없이 편한 복장을 입은 채로 스트레칭과 지압을 결합합니다. 오일이 피부에 남는 느낌이 부담스럽거나 바로 외출 일정이 있다면 예약 시 미리 말씀해 주세요. 오일 양을 줄이거나, 관리 후 가볍게 닦아 드리거나, 오일을 쓰지 않는 타이마사지를 권해 드릴 수 있습니다.</p>

      <h2>관리 후에는 이렇게</h2>
      <p>관리가 끝나면 잠시 누워 호흡을 고르고, 미지근한 물을 충분히 마시면 개운함이 더 오래 유지됩니다. 딥티슈처럼 깊게 풀어 준 부위는 다음 날 가벼운 뻐근함이 느껴질 수 있는데, 대개 하루 이틀이면 가라앉습니다. 격렬한 운동이나 음주는 관리 직후 피하는 편이 좋고, 따뜻하게 쉬어 주면 이완된 상태가 더 잘 유지됩니다.</p>

      <h2>사전에 알려주시면 좋은 경우</h2>
      <p>임신 중이거나 디스크·관절 질환, 급성 염증·발열, 최근 수술 이력이 있는 경우에는 가능한 자세와 압이 달라질 수 있어 예약 시 미리 알려주셔야 합니다. 특정 오일이나 향에 알레르기가 있는 분, 멍이 잘 드는 체질인 분도 사전에 말씀해 주시면 그에 맞춰 안전하게 진행합니다. 코코마사지는 무리한 압을 권하지 않으며, 받는 동안 불편하면 언제든 조절해 드립니다.</p>

      <h2>처음 받는 분이 자주 궁금해하는 점</h2>
      <p>마사지를 처음 받으면 옷차림이나 진행 방식이 낯설 수 있습니다. 오일을 쓰는 관리는 관리에 편한 상태로 진행하되 수건으로 노출을 최소화하며, 타이마사지는 편한 복장을 그대로 입은 채 받습니다. 중간에 자세를 바꿀 때도 불편하지 않은지 확인하니 긴장하지 말고 호흡만 편하게 따라오시면 됩니다. 향의 종류, 압의 세기, 실내 온도처럼 사소해 보이는 것도 말씀하시면 맞춰 드리니 편하게 요청하세요. 같은 관리라도 그날의 컨디션에 따라 느낌이 다를 수 있어, 방문마다 그날 상태를 먼저 확인하고 시작합니다.</p>`,
  },
  {
    slug: "visit-checklist", date: "2026-05-18",
    title: "출장 관리 전 꼭 확인할 5가지 — 공동현관·주차·호텔 방문 규정 체크리스트",
    desc: "출장마사지 방문이 매끄럽게 진행되도록 예약 전 확인하면 좋은 5가지. 건물 유형별 출입·주차, 숙소 방문 규정, 준비물까지 정리했습니다.",
    lead: "출장 관리는 방문하는 공간의 환경에 따라 확인할 점이 달라집니다. 도착이 지연되거나 헛걸음하지 않도록, 예약 전에 점검하면 좋은 다섯 가지를 정리했습니다.",
    body: `
      <h2>1. 정확한 위치와 건물 유형</h2>
      <p>같은 동네라도 아파트·오피스텔·호텔·단독주택은 출입 방식이 전혀 다릅니다. 예약 시 시·구·동과 건물 유형을 함께 알려주시면 그에 맞춰 안내가 빠릅니다. 지역별 권역 특성은 <a href="../../areas/index.html">출장 가능 지역</a> 페이지에서 확인하실 수 있습니다.</p>

      <h2>2. 공동현관 출입 방법</h2>
      <p>오피스텔·아파트는 공동현관 비밀번호나 세대 호출, 카드키 방식이 건물마다 다릅니다. 특히 고층 단지는 지하 주차 후 동별 엘리베이터를 따로 타야 하는 곳도 많습니다. 출입 방법과 정확한 동·호수를 미리 알려주시면 도착이 매끄럽습니다.</p>

      <h2>3. 주차 가능 여부</h2>
      <p>업무권 오피스텔은 방문자 주차가 유료·사전등록제인 경우가 많고, 빌라 밀집지는 골목 주차가 어렵습니다. 방문자 주차가 가능한지, 어렵다면 인근에 잠시 정차할 곳이 있는지 함께 확인하면 좋습니다.</p>

      <h2>4. 호텔·숙소 외부인 방문 규정</h2>
      <p>여행 중 호텔·리조트·펜션에서 받으실 때는 외부인의 객실 방문이 가능한지 숙소 규정을 미리 확인해야 합니다. 규정은 숙소마다 달라, 예약 전 프런트에 한 번 문의해 두시면 방문이 원활합니다.</p>

      <h2>5. 준비물과 컨디션 안내</h2>
      <p>편하게 누워 쉴 수 있는 공간이면 충분하며, 가벼운 식사 후 한 시간 정도 지난 상태가 편안합니다. 오일 사용이 부담스러우면 미리 말씀해 주시고, 알레르기·임신·질환 등 안전에 필요한 사항은 예약 시 꼭 알려주세요. 압이 세거나 약하면 진행 중에도 언제든 조절해 드리므로 통증을 참으실 필요가 없습니다.</p>

      <h2>방문 당일 진행 흐름</h2>
      <p>예약이 확정되면 방문 시간에 맞춰 관리사가 이동합니다. 도착하면 먼저 그날의 컨디션과 불편한 부위, 선호하는 압을 간단히 확인한 뒤 관리를 시작합니다. 진행 중에는 압이 세거나 약하면 바로 말씀해 주시면 조절해 드리고, 마무리에는 호흡을 고르는 시간을 둡니다. 끝난 뒤에는 수분 섭취와 휴식을 안내해 드립니다. 전체적으로 정해진 시간과 관리 종류에 맞춰 진행되므로, 예약 때 원하는 시간을 명확히 정해 두면 좋습니다.</p>

      <h2>결제와 취소·변경</h2>
      <p>결제는 예약 시 안내해 드리는 방법으로 진행하며, 안내된 금액 외에 임의 비용을 청구하지 않습니다. 일정 변경이나 취소는 예약하신 연락처로 미리 알려주시면 원활하게 조정됩니다. 방문이 임박한 시점의 무단 변경이 반복되면 이후 예약 안내가 제한될 수 있으니, 사정이 생기면 가능한 한 일찍 연락 주시길 권합니다.</p>

      <h2>아파트·오피스텔 방문 팁</h2>
      <p>대단지 아파트는 정문·후문에 따라 동까지 거리가 크게 차이 납니다. 가까운 출입구와 정확한 동·호수를 알려주시면 도보 이동이 줄어듭니다. 방문자 주차는 사전 등록이 필요한 단지가 많아 등록 방법을 미리 확인하면 좋고, 고층 주상복합은 지하 주차 후 동별 엘리베이터를 따로 타야 하는 경우가 있어 동선을 함께 챙기면 매끄럽습니다.</p>

      <h2>호텔·숙소 방문 팁</h2>
      <p>호텔·리조트·펜션은 외부인 객실 방문 규정이 숙소마다 다릅니다. 예약 전 프런트에 방문 가능 여부를 확인해 두면 헛걸음을 막을 수 있습니다. 객실 호수와 함께, 프런트를 거쳐야 하는지·로비에서 안내가 필요한지도 알려주시면 좋습니다. 관광 성수기에는 주변 도로와 주차가 혼잡하니 이동 시간을 여유 있게 잡는 편이 안전합니다.</p>

      <h2>이런 점도 챙기면 좋아요</h2>
      <ul class="doc-ul">
        <li>퇴근 시간대·주말·관광 성수기는 예약과 이동이 몰려, 원하는 시간이 있으면 여유 있게 연락하면 좋습니다.</li>
        <li>심야 시간대나 장거리·외곽 지역은 이동 조건에 따라 추가 출장비가 안내될 수 있습니다.</li>
        <li>반려동물이 있거나 함께 있는 가족이 있는 경우 미리 알려주시면 진행이 매끄럽습니다.</li>
      </ul>

      <h2>방문 관련 자주 묻는 점</h2>
      <p>“집이 좁아도 받을 수 있나요?”라는 질문이 많은데, 편하게 누워 쉴 수 있는 공간이면 충분합니다. “미리 무엇을 준비하나요?”는 가벼운 식사 후 한 시간, 편한 복장, 조용한 공간 정도면 됩니다. “시간이 늦어도 되나요?”는 지역과 예약 상황에 따라 다르므로 가능 시간을 먼저 확인해 드립니다. 사소해 보이는 점도 예약 시 함께 말씀하시면 그에 맞춰 안내합니다.</p>

      <h2>정리</h2>
      <p>위치·출입·주차·숙소 규정·준비물 다섯 가지만 미리 확인하면 대부분의 방문이 매끄럽게 진행됩니다. 예약은 전화 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a> 또는 문자로 받으며, 가능 시간과 요금, 추가 출장비 여부를 사전에 안내해 드립니다. 자세한 절차는 <a href="../../how/index.html">이용 방법</a> 페이지를, 지역별 확인 사항은 <a href="../../areas/index.html">출장 가능 지역</a> 페이지를 참고하세요.</p>`,
  },
  {
    slug: "common-myths", date: "2026-05-12",
    title: "출장마사지에 대한 흔한 오해 6가지 — 사실은 이렇습니다",
    desc: "출장마사지에 대해 자주 오해하는 6가지를 사실에 근거해 바로잡습니다. 의료 효과, 요금, 위생, 관리사 배정 등 이용 전 알아두면 좋은 내용.",
    lead: "출장 관리를 처음 알아보면 잘못 알려진 정보로 망설이게 됩니다. 코코마사지가 실제 운영하며 자주 받는 오해를, 광고가 아니라 사실에 근거해 하나씩 바로잡았습니다. 예약 전에 한 번 읽어 두면 불필요한 걱정을 덜 수 있습니다.",
    body: `
      <h2>오해 1 — “마사지를 받으면 질병이 치료된다”</h2>
      <p>아닙니다. 본 서비스는 휴식과 컨디션 관리를 돕는 웰니스 릴랙스 관리이며, 질병의 진단·치료·예방을 목적으로 하는 의료 행위가 아닙니다. 통증이나 질환이 있다면 먼저 전문 의료기관의 진료를 받으시길 권하며, 효과를 보장하거나 과장하는 안내는 하지 않습니다.</p>

      <h2>오해 2 — “예약하면 현장에서 비용이 더 붙는다”</h2>
      <p>코코마사지는 예약 단계에서 코스별 요금과 추가 출장비 여부를 미리 안내합니다. 안내된 금액 외에 임의 비용을 청구하지 않으며, 장거리·심야 등으로 출장비가 있는 경우 반드시 사전에 알려 드립니다. 기준은 <a href="../../pricing/index.html">요금 안내</a>에서 확인할 수 있습니다.</p>

      <h2>오해 3 — “강하게 받아야 효과가 좋다”</h2>
      <p>강도가 셀수록 좋은 것은 아닙니다. 통증을 참는 관리는 오히려 부담이 될 수 있어, 시원하다고 느끼는 범위에서 컨디션에 맞춰 압을 조절합니다. 부드러운 관리가 맞는 분도 많습니다.</p>

      <h2>오해 4 — “위생 관리가 부실하다”</h2>
      <p>관리 도구와 소모품은 위생적으로 관리하며 방문 시 청결을 우선합니다. 일회성으로 사용하는 소모품은 새것을 쓰고, 반복 사용하는 도구는 위생 기준에 맞게 관리합니다. 사용하는 오일이나 위생 관리 방식이 궁금하면 예약 시 문의하시면 안내해 드리며, 방문 시 직접 확인하셔도 됩니다. 위생은 방문형 서비스에서 가장 기본이 되는 부분이라 가장 신경 쓰는 영역입니다.</p>

      <h2>오해 5 — “원하는 관리·시간대를 못 고른다”</h2>
      <p>지역과 시간, 요청하신 관리 종류를 고려해 배정하며, 특정 관리나 시간대를 원하시면 예약 시 알려주시면 최대한 맞춰 드립니다. 다만 퇴근 시간대·주말·성수기는 예약이 몰려 여유 있게 연락 주시는 편이 좋습니다. 원하는 시간이 분명할수록, 또 미리 연락 주실수록 조율이 수월합니다.</p>

      <h2>오해 6 — “지방·관광지는 출장이 안 된다”</h2>
      <p>전국 시도 단위로 안내가 가능합니다. 다만 지역과 거리, 시간대에 따라 가능 시간과 출장비가 달라질 수 있어, 위치를 알려주시면 확인 후 안내해 드립니다. 여행 중 숙소 방문은 외부인 방문 규정만 미리 확인하면 됩니다. 지역별 권역 특성과 확인 사항은 <a href="../../areas/index.html">출장 가능 지역</a> 페이지에 정리되어 있습니다.</p>

      <h2>오해 7 — “예약하면 곧바로 방문한다”</h2>
      <p>방문 시간은 지역과 예약 상황에 따라 달라집니다. 가까운 거리라도 이동과 준비 시간이 필요하고, 시간대가 몰리면 원하는 시각이 어려울 수 있습니다. 그래서 원하는 시간이 분명하면 미리 연락 주시는 편이 좋습니다. 당일 예약도 가능 시간이 있으면 안내해 드리지만, 여유 있게 연락하실수록 조율이 수월합니다.</p>

      <h2>오해 8 — “남성은 받기 어렵다”</h2>
      <p>그렇지 않습니다. 남성 고객을 위한 전담 매니저 배정 코스가 별도로 마련되어 있어, 사전 통화로 컨디션과 강도를 함께 정한 뒤 진행합니다. 코스별 구성은 <a href="../../pricing/index.html">요금 안내</a>에서 확인하실 수 있습니다.</p>

      <h2>오해 9 — “한 번 정한 시간은 못 바꾼다”</h2>
      <p>현장에서 시간을 연장하고 싶으시면 가능 여부를 확인한 뒤 추가 시간 기준으로 안내해 드립니다. 반대로 예약 시간을 미리 변경·취소하실 때도 연락 주시면 조정됩니다. 다만 원하는 시간대가 분명하다면 처음부터 넉넉히 예약하시는 편이 여유롭습니다.</p>

      <h2>오해 10 — “후기가 다 광고다”</h2>
      <p>코코마사지 <a href="../../reviews/index.html">이용 후기</a>는 실제 이용 고객의 의견을 운영팀이 확인한 뒤 게재하며, 의료적 효과를 보장·과장하는 글이나 사실과 다른 내용은 싣지 않습니다. 후기는 개인의 경험이라 같은 관리라도 느낌은 다를 수 있습니다.</p>

      <h2>왜 이런 오해가 생길까</h2>
      <p>출장마사지는 방문형 서비스라 정보가 입에서 입으로 전해지는 경우가 많고, 일부 과장된 광고나 부정확한 후기 때문에 실제와 다른 인상이 굳어지기도 합니다. 그래서 코코마사지는 광고 문구보다 예약·방문에 실제로 필요한 정보를 사실대로 안내하는 것을 원칙으로 합니다. 표시된 상호·연락처·주소는 사업자등록 정보와 일치하며, 회사 소개와 이용약관을 통해 운영 주체와 기준을 투명하게 공개합니다.</p>

      <h2>정리하며</h2>
      <p>이 글은 ${esc(SITE.responsibleTeam)}이 실제 예약·출장 상담에서 자주 받는 질문을 바탕으로 정리했습니다. 출장마사지는 정확한 정보만 알면 어렵지 않게 이용할 수 있는 서비스입니다. 운영 주체가 궁금하다면 <a href="../../about/index.html">회사 소개</a>를, 더 궁금한 점은 <a href="../../faq/index.html">자주 묻는 질문</a>을 참고하시거나 전화·문자로 편하게 문의해 주세요.</p>`,
  },
];
function buildMagazine() {
  const depth = 1;
  const p = "magazine/";
  const title = `매거진 | ${SITE.brand} 출장마사지 가이드·이용 팁`;
  const description = `${SITE.brand} 매거진. 관리 종류 비교, 출장 전 체크리스트, 흔한 오해 바로잡기 등 출장마사지 이용에 도움이 되는 글을 정리했습니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "매거진" }], depth);
  const sorted = [...MAGAZINE].sort((a, b) => b.date.localeCompare(a.date));
  const cards = sorted.map((m) => `<a class="mag-card" href="${m.slug}/index.html">
        <time class="mag-date" datetime="${esc(m.date)}">${esc(m.date.replace(/-/g, "."))}</time>
        <h2>${esc(m.title)}</h2>
        <p>${esc(m.desc)}</p>
        <span class="card-more">글 읽기 →</span>
      </a>`).join("\n      ");
  const body = `${header(depth, { active: "magazine" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <h1 class="page-title">코코마사지 매거진</h1>
    <p class="section-lead">출장마사지를 처음 이용하거나 어떤 관리를 고를지 고민될 때 도움이 되는 가이드와 이용 팁을 정리합니다. 모든 글은 ${esc(SITE.responsibleTeam)}이 실제 운영 경험을 바탕으로 작성·검수하며, 광고 문구가 아니라 실제 이용에 필요한 정보를 사실대로 전하는 것을 목표로 합니다.</p>

    <article class="doc" style="max-width:880px;margin-bottom:8px">
      <h2>매거진을 운영하는 이유</h2>
      <p>출장마사지는 방문 전에 확인해야 할 것이 많고, 과장된 정보로 오해가 생기기 쉬운 분야입니다. 코코마사지 매거진은 광고성 문구 대신, 실제 예약과 방문에서 도움이 되는 정보를 사실에 근거해 전하기 위해 만들었습니다. 관리 종류를 고르는 기준, 방문 전 점검할 점, 자주 하는 오해처럼 이용자가 정말 궁금해하는 내용을 다룹니다.</p>

      <h2>어떤 주제를 다루나요</h2>
      <p>스웨디시·딥티슈·아로마테라피 등 관리별 차이와 컨디션에 맞게 고르는 법, 공동현관·주차·호텔 방문 규정 같은 출장 전 체크리스트, 그리고 요금·위생·관리사 배정에 대한 흔한 오해를 바로잡는 글을 우선 정리했습니다. 앞으로도 이용에 실질적으로 도움이 되는 주제를 중심으로, 짧고 가벼운 양산형 글이 아니라 한 편씩 충분히 다룬 글을 더해 갈 예정입니다.</p>

      <h2>글을 쓰고 검수하는 기준</h2>
      <p>모든 글은 ${esc(SITE.responsibleTeam)}이 실제 상담·운영 경험을 바탕으로 작성하고, 게재 전 사실 여부와 표현을 점검합니다. 질병의 진단·치료·예방을 암시하거나 효과를 보장·과장하는 표현은 사용하지 않으며, 본 서비스가 휴식과 컨디션 관리를 위한 웰니스 관리임을 분명히 합니다. 글에 담긴 내용은 일반적인 안내이며, 실제 가능 시간·요금·방문 조건은 예약 시점에 안내되는 내용이 우선합니다.</p>

      <h2>이런 분께 도움이 됩니다</h2>
      <p>출장 관리를 한 번도 이용해 본 적이 없어 절차가 막막한 분, 어떤 관리가 자신에게 맞는지 고르기 어려운 분, 오피스텔·아파트·호텔 등 방문 환경에 따라 무엇을 준비해야 할지 모르는 분께 특히 도움이 됩니다. 또한 요금이나 위생, 관리사 배정처럼 예약 전에 확인하고 싶은 점이 있는 분이라면, 광고가 아닌 사실에 근거해 정리한 글에서 궁금증을 먼저 해소하고 안심하고 예약하실 수 있습니다.</p>

      <h2>함께 보면 좋은 페이지</h2>
      <p>관리별 특징과 추천 시간은 <a href="../services/index.html">서비스 안내</a>, 예약부터 방문까지의 단계는 <a href="../how/index.html">이용 방법</a>, 코스별 요금은 <a href="../pricing/index.html">요금 안내</a>, 지역별 권역 특성은 <a href="../areas/index.html">출장 가능 지역</a>에서 확인하실 수 있습니다. 실제 이용 경험이 궁금하다면 <a href="../reviews/index.html">이용 후기</a>도 함께 살펴보세요. 매거진의 글은 이 페이지들의 정보를 이용자 관점에서 한 번 더 풀어 설명한 것입니다.</p>

      <h2>콘텐츠 운영 안내</h2>
      <p>매거진의 글은 한 번 올리고 방치하지 않고, 요금·운영 방식·지역 안내가 바뀌면 본문을 검토해 갱신합니다. 순위만 노린 짧은 양산형 글을 쏟아내기보다, 이용자가 한 번 읽고 실제 도움을 받을 수 있도록 한 편씩 충분히 다룬 글을 천천히 더해 가는 것을 원칙으로 합니다. 같은 내용을 여러 글로 쪼개 반복하지 않으며, 중복되거나 도움이 되지 않는 글은 만들지 않습니다.</p>

      <h2>면책 및 문의</h2>
      <p>본 매거진의 글은 일반적인 정보 제공을 목적으로 하며, 개인의 건강 상태에 대한 의료적 조언을 대신하지 않습니다. 건강에 관한 우려가 있다면 전문 의료기관의 상담을 먼저 받으시길 권합니다. 글 내용에 대한 문의나 사실과 다른 점에 대한 정정 요청은 전화 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a> 또는 문자로 보내주시면 ${esc(SITE.responsibleTeam)}이 확인 후 반영합니다.</p>

      <h2>지금 읽어볼 만한 글</h2>
      <p>처음 이용하신다면 관리 종류를 비교한 글로 자신에게 맞는 관리를 먼저 정하고, 방문 전 체크리스트로 출입·주차·숙소 규정을 준비한 뒤, 흔한 오해를 정리한 글로 요금·위생 같은 궁금증을 해소하는 순서를 권합니다. 아래 목록에서 관심 있는 글을 선택해 읽어 보세요. 각 글은 한 주제를 충분히 다루도록 작성되어, 한 편만 읽어도 그 주제에 대한 궁금증은 대부분 풀리도록 했으며, 필요하면 관련 안내 페이지로 바로 이동할 수 있게 링크를 함께 두었습니다.</p>
    </article>

    <h2 class="section-title" style="font-size:1.4rem;margin:24px 0 16px">최신 글</h2>
    <div class="mag-list">
      ${cards}
    </div>
    ${authorBlock("매거진 글은 실제 예약·출장 상담 경험을 바탕으로 작성하며, 의료·과장 표현은 사용하지 않습니다.")}
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("magazine/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "weekly", priority: "0.7", title, desc: description });
  sorted.forEach(buildMagazineArticle);
}
function buildMagazineArticle(m) {
  const depth = 2;
  const p = `magazine/${m.slug}/`;
  const title = `${m.title} | ${SITE.brand} 매거진`;
  const description = m.desc;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "매거진", path: "magazine/" }, { name: m.title.split(" — ")[0] }], depth);
  const jsonLd = [
    bc.ld,
    {
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: m.title, description: m.desc, image: abs("/assets/og-image.png"),
      datePublished: m.date, dateModified: SITE.buildDate,
      author: { "@type": "Organization", name: SITE.responsibleTeam, url: abs("/about/") },
      publisher: { "@type": "Organization", name: SITE.brand, logo: { "@type": "ImageObject", url: abs("/assets/favicon.svg") } },
      mainEntityOfPage: abs("/" + p),
    },
  ];
  const body = `${header(depth, { active: "magazine" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>${esc(m.title)}</h1>
      <p class="mag-byline"><time datetime="${esc(m.date)}">${esc(m.date.replace(/-/g, "."))}</time> · ${esc(SITE.responsibleTeam)} 작성·검수</p>
      <p class="doc-lead">${esc(m.lead)}</p>
${m.body}

      ${authorBlock(`이 글은 ${esc(SITE.responsibleTeam)}이 실제 운영 경험을 바탕으로 작성·검수했으며, 의료·과장 표현은 사용하지 않습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile(`${p}index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.7", title, desc: description });
  feed(abs("/" + p), m.title, m.desc, m.date);
}

// ───────────────────────────────────────────────────────────────────────────
// 10. 페이지 생성: 서비스 인덱스 + 상세
// ───────────────────────────────────────────────────────────────────────────
function buildServicesIndex() {
  const depth = 1;
  const p = "services/";
  const title = `서비스 안내 | ${SITE.brand} 출장마사지`;
  const description = `${SITE.brand} 출장 관리 종류 안내. 스웨디시·아로마·딥티슈·타이·스포츠·림프의 특징과 추천 상황을 비교해 보세요.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "서비스 안내" }], depth);
  const body = `${header(depth, { active: "services" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <h1 class="page-title">서비스 안내</h1>
    <p class="section-lead">코코마사지의 출장 관리는 모두 휴식과 컨디션 관리를 위한 웰니스 범위로 진행됩니다. 자극의 세기와 목적에 따라 아래처럼 나눌 수 있으니, 컨디션과 선호에 맞게 선택하세요.</p>

    <article class="doc" style="max-width:840px;margin-bottom:8px">
      <h2>어떤 관리를 골라야 할까요</h2>
      <ul class="doc-ul">
        <li><strong>부드러운 이완을 원한다면</strong> — 전신을 고르게 푸는 <a href="swedish/index.html">스웨디시</a>, 향으로 마음까지 가라앉히는 <a href="aroma/index.html">아로마테라피</a>, 자극이 적은 <a href="lymphatic/index.html">림프마사지</a>가 잘 맞습니다.</li>
        <li><strong>확실한 시원함을 원한다면</strong> — 뭉친 부위를 깊게 다루는 <a href="deep-tissue/index.html">딥티슈</a>, 활동 근육을 관리하는 <a href="sports/index.html">스포츠마사지</a>를 권합니다.</li>
        <li><strong>늘려 주는 느낌을 원한다면</strong> — 스트레칭과 지압을 결합한 <a href="thai/index.html">타이마사지</a>가 적합합니다.</li>
      </ul>
      <p>관리 시간은 60분, 90분, 120분 중 선택할 수 있으며, 처음이라면 60분으로 경험한 뒤 시간을 늘리는 방식을 권합니다. 어떤 관리가 맞을지 고민되면 예약 시 컨디션을 알려주시면 ${esc(SITE.responsibleTeam)}이 추천해 드립니다.</p>

      <h2>관리별 강도와 특징 한눈에 보기</h2>
      <ul class="doc-ul">
        ${SERVICES.map((s) => `<li><strong><a href="${s.slug}/index.html">${esc(s.name)}</a></strong> — ${esc(s.short)}</li>`).join("\n        ")}
      </ul>

      <h2>관리 시간은 어떻게 고르나요</h2>
      <p>같은 관리라도 시간에 따라 받는 느낌이 다릅니다. <strong>60분</strong>은 전신 흐름을 가볍게 경험하거나 특정 부위를 집중해서 풀기에 적당하고, <strong>90분</strong>은 전신을 충분히 이완하면서 불편한 부위까지 다루기 좋습니다. <strong>120분</strong>은 전신과 집중 부위를 여유 있게 다루고 마무리까지 충분히 받고 싶을 때 권합니다. 처음 받아 보신다면 60분으로 시작해 본 뒤, 다음 방문에서 시간을 늘려가며 자신에게 맞는 구성을 찾는 것을 추천합니다.</p>

      <h2>이용 전 알아두면 좋은 점</h2>
      <ul class="doc-ul">
        <li>모든 관리는 휴식과 컨디션 관리를 위한 웰니스 범위로 진행되며, 질병의 진단·치료를 목적으로 하지 않습니다.</li>
        <li>통증을 참아야 하는 관리는 없습니다. 압이 세거나 약하면 진행 중에도 언제든 조절할 수 있습니다.</li>
        <li>오일을 사용하는 관리(스웨디시·아로마)와 사용하지 않는 관리(타이)가 있으니 취향에 맞게 선택하세요.</li>
        <li>알레르기·임신·질환 등 안전에 필요한 정보는 예약 시 미리 알려주시면 그에 맞춰 진행합니다.</li>
        <li>관리 후에는 수분을 충분히 섭취하고 잠시 휴식하면 개운함이 더 오래 유지됩니다.</li>
      </ul>

      <h2>관리별 자세한 소개</h2>
      ${SERVICES.map((s) => `<p><strong><a href="${s.slug}/index.html">${esc(s.name)}</a></strong> — ${esc(s.intro)}</p>`).join("\n      ")}
    </article>

    <div class="card-grid">
      ${SERVICES.map((s) => `<a class="svc-card" href="${s.slug}/index.html"><h2>${esc(s.name)}</h2><p>${esc(s.short)}</p><span class="card-more">자세히 보기 →</span></a>`).join("\n      ")}
    </div>
    ${authorBlock("서비스 분류와 추천 기준은 실제 예약·출장 상담 경험을 바탕으로 작성·검수했습니다.")}
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("services/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.8", title, desc: description });
}

function buildServiceDetail(s) {
  const depth = 2;
  const p = `services/${s.slug}/`;
  const prefix = "../../";
  const title = `${s.name} 출장마사지 안내 | ${SITE.brand}`;
  const description = `${s.name} 출장 관리 안내 - ${s.short}. 추천 상황, 진행 방식, 강도 조절, 추천 시간, 준비사항과 자주 묻는 질문을 확인하세요.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "서비스 안내", path: "services/" }, { name: s.name }], depth);
  const jsonLd = [bc.ld, serviceJsonLd({ name: `${s.name} 출장마사지`, description: s.short, url: "/" + p }), faqJsonLd(s.faqs)];
  const body = `${header(depth, { active: "services" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>${esc(s.name)} 출장마사지 서비스 안내</h1>
      <p class="doc-lead">${esc(s.intro)}</p>

      <h2>${esc(s.name)}란?</h2>
      <p>${esc(s.intro2)}</p>

      <h2>이런 분께 권합니다</h2>
      <ul class="doc-ul">${listItems(s.forWhom)}</ul>

      <h2>주요 특징</h2>
      <ul class="doc-ul">${listItems(s.features)}</ul>

      <h2>관리 진행 방식</h2>
      <p>${esc(s.flow)}</p>
      <p>${esc(s.flow2)}</p>

      <h2>압·강도 조절 안내</h2>
      <p>${esc(s.strength)}</p>

      <h2>추천 관리 시간</h2>
      <p>${esc(s.times)}</p>

      <h2>다른 관리와의 차이</h2>
      <p>${esc(s.diff)}</p>

      <h2>이용 전 준비사항</h2>
      <ul class="doc-ul">${listItems(s.prepare)}</ul>

      <h2>예약 전 확인사항</h2>
      <ul class="doc-ul">${listItems(s.check)}</ul>

      ${serviceBookingSection(s)}

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(s.faqs)}</div>

      ${authorBlock(`${esc(s.name)} 관리는 통증을 참게 하지 않으며, 컨디션에 맞춰 압을 조절합니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${s.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`services/${s.slug}/index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.7", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 11. 페이지 생성: 지역 인덱스
// ───────────────────────────────────────────────────────────────────────────
function buildAreasIndex() {
  const depth = 1;
  const p = "areas/";
  const title = `출장 가능 지역 | ${SITE.brand} 전국 출장마사지`;
  const description = `${SITE.brand} 전국 출장 가능 지역 안내. 서울·경기·인천·부산 등 시도별 생활권과 방문 시 확인사항을 지역 페이지에서 확인하세요.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "출장 가능 지역" }], depth);
  const body = `${header(depth, { active: "areas" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <h1 class="page-title">출장 가능 지역</h1>
    <p class="section-lead">전국 시도 단위로 안내합니다. 같은 지역이라도 권역마다 생활권과 방문 환경이 다르므로, 각 지역 페이지에서 확인사항을 살펴봐 주세요.</p>

    <article class="doc" style="max-width:840px;margin-bottom:8px">
      <h2>지역마다 무엇이 다른가요</h2>
      <p>출장마사지는 같은 관리라도 방문하는 곳의 환경에 따라 확인할 점이 달라집니다. 업무 밀집 권역은 오피스텔 공동현관과 주차가, 대단지 주거권은 동 호수와 방문자 주차 등록이, 관광권은 숙소의 외부인 방문 규정이 중요합니다. 그래서 코코마사지는 시도 페이지 아래에 서울 25개 구와 주요 도시별 안내를 따로 두어, 권역별 생활권·이동 조건·건물 유형을 구분해 안내합니다.</p>
      <p>방문 위치와 건물 유형, 희망 시간을 알려주시면 가능 시간과 출장비를 사전에 안내해 드립니다. 거리나 시간대에 따라 가능 여부가 달라질 수 있어, 정확한 위치를 알려주시면 확인이 빠릅니다.</p>

      <h2>예약 전 준비하면 좋은 정보</h2>
      <ul class="doc-ul">
        <li><strong>정확한 위치</strong> — 시·구·동과 건물 유형(아파트·오피스텔·호텔·숙소 등)을 알려주시면 출입·주차 확인이 빠릅니다.</li>
        <li><strong>건물 출입 방법</strong> — 공동현관 비밀번호, 방문자 주차 등록, 호텔 프런트 규정 등 방문지의 출입 조건을 미리 확인해 주세요.</li>
        <li><strong>희망 시간대</strong> — 퇴근 시간이나 주말, 관광 성수기에는 예약과 이동이 몰려, 여유 있게 연락 주시면 조율이 수월합니다.</li>
        <li><strong>원하는 관리</strong> — 관리 종류와 시간(60·90·120분)을 알려주시면 그에 맞춰 안내해 드립니다.</li>
      </ul>

      <h2>지역 안내 페이지 구성</h2>
      <p>출장 가능 지역은 전국 14개 시도로 나뉩니다. 서울은 25개 구별로 권역 특성이 뚜렷해 구마다 안내 페이지를 따로 두었고, 경기·인천·부산·경상권은 생활권 차이가 큰 주요 도시·자치구를 개별 페이지로 구분했습니다. 각 페이지에는 권역별 생활권, 건물 유형, 이동·시간대 변수, 출장비 판단 기준, 추천 관리, 자주 묻는 질문이 지역 상황에 맞게 정리되어 있습니다. 아래에서 원하는 시도를 선택하면 세부 지역으로 이동할 수 있습니다.</p>

      <h2>전국 공통 요금표</h2>
      ${priceTableCompact("../")}

      <h2>시도별 안내 요약</h2>
      <ul class="doc-ul">
        ${REGIONS.map((r) => `<li><strong><a href="${r.slug}/index.html">${esc(r.name)}</a></strong> — ${esc(r.traits)}</li>`).join("\n        ")}
      </ul>
      <p>찾으시는 지역이 목록에 없더라도 전화 ${esc(SITE.phone)} 또는 문자로 위치를 알려주시면 방문 가능 여부를 확인해 드리며, 거리·시간대에 따른 출장비는 사전에 안내합니다.</p>
    </article>

    <div class="area-grid area-grid-lg">
      ${REGIONS.map((r) => `<a class="area-card" href="${r.slug}/index.html"><span>${esc(r.name)}</span><small>${esc(r.lead.split(".")[0])}</small></a>`).join("\n      ")}
    </div>
    ${authorBlock("지역 구분과 권역별 확인 사항은 실제 출장 상담 경험을 바탕으로 작성·검수했습니다.")}
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("areas/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.8", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 12. 페이지 생성: 시도 / 서울 구 / 하위 지역
// ───────────────────────────────────────────────────────────────────────────
function buildRegionPage(r) {
  const depth = 2;
  const p = `areas/${r.slug}/`;
  const prefix = "../../";
  const subs = r.slug === "seoul" ? SEOUL_DISTRICTS : SUB_AREAS[r.slug] || [];
  const isSeoul = r.slug === "seoul";
  const recR = r.rec.map((x) => x.n);
  const zoneR = r.zones.map((z) => z.n.replace(/\(.*$/, "").trim());
  const title = `${r.name} 출장마사지 | ${zoneR.slice(0, 2).join("·")} 방문 예약 - ${SITE.brand}`;
  const description = `${r.name} ${zoneR.slice(0, 3).join("·")} 출장마사지 방문 안내. ${r.lead} ${recR[0]}·${recR[1]}·${recR[2]} 코스별 요금과 권역별 확인사항을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" }, { name: r.name }], depth);
  const jsonLd = [bc.ld, serviceJsonLd({ name: `${r.name} 출장마사지`, description: r.lead, areaName: r.name, url: "/" + p }), faqJsonLd(mergedFaqs(r))];
  const subListTitle = isSeoul ? "서울 25개 구 안내" : `${r.name} 주요 지역 안내`;
  const subList = subs.length
    ? `<h2>${subListTitle}</h2>
      <p>아래 지역은 생활권과 방문 환경이 달라 개별 안내 페이지로 구분했습니다.</p>
      <div class="sub-grid">${subs.map((d) => `<a class="sub-card" href="${d.slug}/index.html"><span>${esc(d.name)}</span>${subs.length <= 8 ? `<small>${esc(d.dong)}</small>` : ""}</a>`).join("")}</div>`
    : "";
  const body = `${header(depth, { active: "areas" })}
<main id="main">
  ${areaHero({ eyebrow: "전국 출장 웰니스 관리", name: r.name, lead: r.lead, dong: zoneR.join("·"), rec: r.rec, bcHtml: bc.html })}
  <div class="container area-body">
    <article class="doc">
      <h2>${esc(r.name)} 출장마사지 이용 안내</h2>
      <p>${esc(r.intro2)}</p>
      <p>${esc(r.traits)} ${esc(r.move)}.</p>

      <h2>권역·도시별 안내</h2>
      ${zoneCards(r.zones)}

      <h2>방문·이동·요금 기준</h2>
      ${infoPanel([
        { label: "방문 확인", text: `${r.building} ${r.parking}` },
        { label: "이동·시간대", text: r.timing },
        { label: "출장비 기준", text: r.fee },
      ])}

      <h2>추천 관리</h2>
      ${recCards(r.rec, prefix)}

      <h2>예약 전 확인사항</h2>
      <ul class="doc-ul">${listItems(r.tips)}<li>알레르기·임신·질환 등 사전에 알아야 할 사항을 미리 알려주세요.</li></ul>

      ${subList}

      ${tipsHtml(r.name)}

      ${situationSection(r, "../../")}

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(mergedFaqs(r))}</div>

      ${authorBlock(`${esc(r.name)} 권역의 이동 조건과 건물 유형 차이는 실제 출장 상담에서 확인한 내용을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${r.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`areas/${r.slug}/index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.7", title, desc: description });
  if (isSeoul) subs.forEach((d) => buildSeoulDistrict(d));
  else subs.forEach((d) => buildSubArea(r, d));
}

function buildSeoulDistrict(d) {
  const depth = 3;
  const p = `areas/seoul/${d.slug}/`;
  const prefix = "../../../";
  const recD = d.rec.map((x) => x.n);
  const dongHead = d.dong.split("·").slice(0, 2).join("·");
  const title = `${d.name} 출장마사지 | ${dongHead} ${recD[0]}·${recD[1]} 방문 - ${SITE.brand}`;
  const description = `${d.name} 출장마사지 방문 안내 - ${d.dong} 등 ${d.profile}. ${recD[0]}·${recD[1]}·${recD[2]} 등 컨디션별 관리와 코스별 요금, 예약 전 확인사항을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" }, { name: "서울", path: "areas/seoul/" }, { name: d.name }], depth);
  const jsonLd = [bc.ld, serviceJsonLd({ name: `${d.name} 출장마사지`, description: d.profile, areaName: `서울 ${d.name}`, url: "/" + p }), faqJsonLd(mergedFaqs(d, true))];
  const body = `${header(depth, { active: "areas" })}
<main id="main">
  ${areaHero({ eyebrow: "서울특별시 출장 관리", name: d.name, lead: `${d.name}는 ${d.profile}입니다.`, dong: d.dong, rec: d.rec, bcHtml: bc.html })}
  <div class="container area-body">
    <article class="doc">
      <h2>${esc(d.name)} 출장마사지 이용 안내</h2>
      <p>${esc(d.intro2)}</p>
      <p>주로 ${esc(d.customer)}의 문의가 많으며, 같은 ${esc(d.name)} 안에서도 권역마다 방문 환경이 달라 위치를 먼저 확인합니다.</p>

      <h2>주요 권역별 안내</h2>
      ${zoneCards(d.zones)}

      ${dongSection(d.name)}

      <h2>방문·이동·요금 기준</h2>
      ${infoPanel([
        { label: "방문 확인", text: `${d.building} ${d.parking}` },
        { label: "이동·시간대", text: d.timing },
        { label: "출장비 기준", text: d.fee },
      ])}

      <h2>이용 가능한 관리</h2>
      ${recCards(d.rec, prefix)}

      <h2>예약 전 확인사항</h2>
      <ul class="doc-ul">
        <li>공동현관 출입 방법, 주차 가능 여부, 프런트 방문객 규정을 미리 확인합니다.</li>
        <li>희망 시간대와 정확한 위치(동·건물 유형)를 알려주시면 가능 시간을 안내합니다.</li>
        <li>알레르기·임신·질환 등은 예약 시 미리 알려주세요.</li>
        <li>건전한 휴식 관리 범위로 진행하며, 부적절한 요구에는 응하지 않습니다.</li>
      </ul>

      ${tipsHtml(d.name)}

      ${situationSection(d, "../../../", true)}

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(mergedFaqs(d, true))}</div>

      ${authorBlock(`${esc(d.name)}의 권역별 생활권과 건물 유형 차이는 실제 출장 상담 경험을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${d.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`${p}index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.6", title, desc: description });
  buildDongPages("seoul", "서울", d);
}

function buildSubArea(region, d) {
  const depth = 3;
  const p = `areas/${region.slug}/${d.slug}/`;
  const prefix = "../../../";
  const recS = d.rec.map((x) => x.n);
  const dongHeadS = d.dong.split("·").slice(0, 2).join("·");
  const title = `${region.name} ${d.name} 출장마사지 | ${dongHeadS} ${recS[0]} 방문 - ${SITE.brand}`;
  const description = `${region.name} ${d.name} 출장마사지 - ${d.dong} 등 ${d.profile}. ${d.move}. ${recS[0]}·${recS[1]} 추천과 코스별 요금을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" }, { name: region.name, path: `areas/${region.slug}/` }, { name: d.name }], depth);
  const jsonLd = [bc.ld, serviceJsonLd({ name: `${d.name} 출장마사지`, description: d.profile, areaName: `${region.name} ${d.name}`, url: "/" + p }), faqJsonLd(mergedFaqs(d, true))];
  const body = `${header(depth, { active: "areas" })}
<main id="main">
  ${areaHero({ eyebrow: `${region.name} 출장 관리`, name: d.name, lead: `${d.name}는 ${d.profile}입니다.`, dong: d.dong, rec: d.rec, bcHtml: bc.html })}
  <div class="container area-body">
    <article class="doc">
      <h2>${esc(region.name)} ${esc(d.name)} 이용 안내</h2>
      <p>${esc(d.intro2)}</p>
      <p>${esc(d.dong)} 등 권역에 따라 방문 환경과 이동 시간이 달라, ${esc(region.name)} ${esc(d.name)} 방문은 정확한 위치와 건물 유형, 공동현관·주차 출입 방법을 먼저 확인한 뒤 가능 시간과 코스별 요금을 안내해 드립니다.</p>

      <h2>주요 권역별 안내</h2>
      ${zoneCards(d.zones)}

      ${dongSection(d.name)}

      <h2>방문·이동·요금 기준</h2>
      ${infoPanel([
        { label: "방문 확인", text: `${d.building} ${d.parking}` },
        { label: "이동·시간대", text: `${d.move}. ${d.timing}` },
        { label: "출장비 기준", text: d.fee },
      ])}

      <h2>이용 가능한 관리</h2>
      ${recCards(d.rec, prefix)}

      <h2>예약 전 확인사항</h2>
      <ul class="doc-ul">
        <li>방문지의 정확한 위치와 건물 유형(아파트·오피스텔·숙소 등)을 알려주세요.</li>
        <li>지역과 거리, 시간대에 따라 가능 시간과 출장비가 달라질 수 있습니다.</li>
        <li>알레르기·임신·질환 등은 예약 시 미리 알려주세요.</li>
      </ul>

      ${tipsHtml(d.name)}

      ${situationSection(d, "../../../", true)}

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(mergedFaqs(d, true))}</div>

      ${authorBlock(`${esc(d.name)}의 생활권·이동 조건 차이는 실제 출장 상담 경험을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${d.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`${p}index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.6", title, desc: description });
  buildDongPages(region.slug, region.name, d);
}

// ───────────────────────────────────────────────────────────────────────────
// 13. 정적 자산: CSS / JS / favicon / og-image
// ───────────────────────────────────────────────────────────────────────────

function buildAssets() {
  // styles.css
  writeFile("styles.css", CSS);
  // script.js
  writeFile("script.js", JS);
  // favicon
  writeFile("assets/favicon.svg", FAVICON);
  // og image
  writeFile("assets/og-image.svg", OG_IMAGE);
}

const CSS = `:root{
  --bg:#100d0c; --bg-alt:#15110f; --panel:#1c1714; --line:#2c2521;
  --text:#f3ece6; --muted:#b6a99d; --gold:#e0a878; --gold-bright:#f2c79a; --apricot:#e8b48b;
  --radius:14px; --maxw:1120px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);
  font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,-apple-system,sans-serif;
  line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.container{width:100%;max-width:var(--maxw);margin:0 auto;padding:0 20px}
.skip-link{position:absolute;left:-9999px;top:0;background:var(--gold);color:#1a1410;padding:10px 16px;z-index:200}
.skip-link:focus{left:8px;top:8px}

/* header */
.site-header{position:sticky;top:0;z-index:100;background:rgba(16,13,12,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{display:flex;align-items:baseline;gap:8px;font-weight:700}
.brand-en{font-size:1.35rem;letter-spacing:.16em;color:var(--gold-bright)}
.brand-ko{font-size:1rem;color:var(--text)}
.primary-nav>ul{list-style:none;display:flex;align-items:center;gap:4px;margin:0;padding:0}
.primary-nav a{display:block;padding:10px 14px;color:var(--muted);font-size:.95rem;border-radius:8px}
.primary-nav a:hover,.primary-nav a[aria-current=page]{color:var(--text)}
.nav-cta{background:var(--gold);color:#1a1410!important;font-weight:700}
.nav-cta:hover{background:var(--gold-bright)}
.has-sub{position:relative}
.submenu{display:none;position:absolute;top:100%;left:0;min-width:180px;background:var(--panel);
  border:1px solid var(--line);border-radius:10px;padding:6px;margin:0;list-style:none;box-shadow:0 12px 30px rgba(0,0,0,.4)}
.submenu-wide{min-width:330px}
.submenu li{width:100%}
.submenu a{display:block;padding:8px 12px;font-size:.9rem;white-space:nowrap;border-radius:6px}
.submenu a:hover{background:var(--bg-alt);color:var(--gold-bright)}
@media(min-width:681px){
  .has-sub:hover>.submenu,.has-sub:focus-within>.submenu{display:block}
  .has-sub:hover>.submenu-wide,.has-sub:focus-within>.submenu-wide{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
}
.nav-toggle{display:none;flex-direction:column;gap:5px;background:none;border:0;cursor:pointer;padding:8px}
.nav-toggle span{width:24px;height:2px;background:var(--text);transition:.2s}

/* hero */
.hero{background:radial-gradient(120% 100% at 80% -10%,rgba(224,168,120,.18),transparent 60%),var(--bg);
  padding:84px 0 64px;border-bottom:1px solid var(--line)}
.hero-eyebrow{color:var(--gold);letter-spacing:.18em;font-size:.82rem;text-transform:uppercase;margin:0 0 14px}
.hero h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.2;margin:0 0 18px;font-weight:800}
.hero h1 span{display:inline-block;font-size:clamp(1rem,2.4vw,1.4rem);color:var(--gold-bright);font-weight:600;margin-top:10px}
.hero-sub{color:var(--muted);max-width:620px;font-size:1.05rem;margin:0 0 26px}
.hero-cta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}
.hero-points{list-style:none;display:flex;gap:10px;flex-wrap:wrap;padding:0;margin:0}
.hero-points li{font-size:.85rem;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:6px 14px}

.btn{display:inline-block;padding:14px 24px;border-radius:999px;font-weight:700;font-size:1rem;border:1px solid transparent;cursor:pointer;transition:.15s}
.btn-primary{background:var(--gold);color:#1a1410}
.btn-primary:hover{background:var(--gold-bright)}
.btn-ghost{border-color:var(--line);color:var(--text)}
.btn-ghost:hover{border-color:var(--gold)}

/* sections */
.section{padding:64px 0}
.section-alt{background:var(--bg-alt)}
.section-title{font-size:clamp(1.5rem,3vw,2rem);margin:0 0 12px;font-weight:800}
.section-lead{color:var(--muted);max-width:720px;margin:0 0 32px}
.page-title{font-size:clamp(1.7rem,3.5vw,2.4rem);margin:24px 0 12px;font-weight:800}

/* trust */
.trust{padding:40px 0;border-bottom:1px solid var(--line)}
.trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.trust-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:22px}
.trust-card h2{font-size:1.05rem;margin:0 0 8px;color:var(--gold-bright)}
.trust-card p{margin:0;color:var(--muted);font-size:.95rem}

/* cards */
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.svc-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:24px;transition:.15s;display:block}
.svc-card:hover{border-color:var(--gold);transform:translateY(-2px)}
.svc-card h2,.svc-card h3{margin:0 0 10px;font-size:1.2rem;color:var(--gold-bright)}
.svc-card p{margin:0 0 14px;color:var(--muted);font-size:.95rem}
.card-more{color:var(--gold);font-size:.9rem;font-weight:600}

/* area grid */
.area-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:12px}
.area-grid-lg{grid-template-columns:repeat(3,1fr)}
.area-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px;text-align:center;transition:.15s;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center}
.area-card:hover{border-color:var(--gold);color:var(--gold-bright)}
.area-card span{font-weight:700}
.area-card small{color:var(--muted);font-size:.78rem;font-weight:400;line-height:1.4}

/* sub grid */
.sub-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0 8px}
.sub-card{background:var(--bg-alt);border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:4px;transition:.15s}
.sub-card:hover{border-color:var(--gold)}
.sub-card span{font-weight:700;font-size:.98rem}
.sub-card small{color:var(--muted);font-size:.76rem}

/* how steps */
.how-steps{list-style:none;counter-reset:step;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:0;margin:0 0 36px}
.how-steps li{counter-increment:step;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;position:relative}
.how-steps li::before{content:counter(step);display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--gold);color:#1a1410;font-weight:800;margin-bottom:12px}
.how-steps strong{display:block;margin-bottom:6px}
.how-steps span{color:var(--muted);font-size:.9rem}
.how-notes{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.how-notes h3{font-size:1rem;color:var(--gold-bright);margin:0 0 6px}
.how-notes p{margin:0;color:var(--muted);font-size:.9rem}

/* pricing */
.price-table{border:1px solid var(--line);border-radius:12px;overflow:hidden;max-width:760px}
.price-row{display:grid;grid-template-columns:160px 1fr;gap:0}
.price-row span{padding:16px 20px;border-bottom:1px solid var(--line)}
.price-row span:first-child{background:var(--bg-alt);font-weight:700}
.price-head span{background:var(--panel)!important;color:var(--gold-bright);font-weight:700}
.price-row:last-child span{border-bottom:0}
.price-note{color:var(--muted);font-size:.88rem;margin-top:14px;max-width:760px}
/* price cards */
.price-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:10px 0 8px}
.price-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:22px;display:flex;flex-direction:column}
.pc-eyebrow{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--gold);font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px}
.pc-badge{background:var(--gold);color:#1a1410;font-size:.66rem;font-weight:800;letter-spacing:.08em;padding:3px 9px;border-radius:999px}
.pc-name{font-size:1.25rem;color:var(--text);margin:0 0 10px;font-weight:800}
.pc-desc{color:var(--muted);font-size:.9rem;margin:0 0 16px;flex:1}
.pc-rows{list-style:none;padding:0;margin:0;border-top:1px solid var(--line)}
.pc-rows li{display:flex;justify-content:space-between;align-items:center;padding:11px 2px;border-bottom:1px solid var(--line);font-size:.95rem;color:var(--muted)}
.pc-rows li:last-child{border-bottom:0}
.pc-rows strong{color:var(--gold-bright);font-weight:800}
@media(max-width:920px){.price-cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:680px){.price-cards{grid-template-columns:1fr}}
/* compact price table (지역 페이지) */
.price-mini-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;margin:6px 0 12px}
.price-mini{width:100%;border-collapse:collapse;font-size:.92rem;min-width:460px}
.price-mini th,.price-mini td{padding:11px 12px;text-align:right;border-bottom:1px solid var(--line)}
.price-mini thead th{background:var(--panel);color:var(--gold-bright);font-weight:700;text-align:right}
.price-mini thead th:first-child,.price-mini tbody th{text-align:left}
.price-mini tbody th{color:var(--text);font-weight:700}
.price-mini tbody td{color:var(--muted)}
.price-mini tbody tr:last-child th,.price-mini tbody tr:last-child td{border-bottom:0}

/* ── premium 지역 페이지 ── */
.area-hero{position:relative;background:radial-gradient(130% 120% at 85% -20%,rgba(224,168,120,.22),transparent 55%),linear-gradient(180deg,#15110f,var(--bg));border-bottom:1px solid var(--line);padding:22px 0 46px}
.area-hero .breadcrumb{margin:0}
.area-hero-eyebrow{color:var(--gold);letter-spacing:.16em;font-size:.78rem;text-transform:uppercase;margin:16px 0 10px}
.area-hero-title{font-size:clamp(1.9rem,4.5vw,3rem);font-weight:800;margin:0 0 14px;line-height:1.2}
.area-hero-lead{color:var(--muted);max-width:680px;font-size:1.05rem;margin:0 0 20px}
.area-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:26px}
.chip{font-size:.82rem;color:var(--muted);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:999px;padding:6px 14px}
.chip-accent{color:#1a1410;background:linear-gradient(135deg,var(--gold-bright),var(--gold));border-color:transparent;font-weight:700}
.area-hero-cta{display:flex;gap:12px;flex-wrap:wrap}
.area-body{padding-top:46px;padding-bottom:8px}
.area-body .doc{max-width:880px;margin:0 auto}
.area-body .doc h2:first-of-type{border-top:0;padding-top:0}
.zone-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:6px 0 8px}
.zone-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;border-left:3px solid var(--gold)}
.zone-card h3{margin:0 0 6px;font-size:1.02rem;color:var(--gold-bright)}
.zone-card p{margin:0;color:var(--muted);font-size:.92rem}
.info-panel{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:6px 0 8px}
.info-card{background:var(--bg-alt);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
.info-label{display:inline-block;font-size:.74rem;letter-spacing:.08em;color:var(--gold);text-transform:uppercase;margin-bottom:8px;font-weight:700}
.info-card p{margin:0;color:var(--muted);font-size:.9rem;line-height:1.6}
.rec-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:6px 0 8px}
.rec-card{display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;transition:.15s}
.rec-card:hover{border-color:var(--gold);transform:translateY(-2px)}
.rec-card h3{margin:0 0 8px;font-size:1.1rem;color:var(--gold-bright)}
.rec-card p{margin:0 0 14px;color:var(--muted);font-size:.9rem;flex:1}
.rec-more{color:var(--gold);font-size:.86rem;font-weight:700}
.tips-list{list-style:none;padding:0;margin:6px 0 8px;display:grid;gap:10px}
.tips-list li{position:relative;background:var(--bg-alt);border:1px solid var(--line);border-radius:12px;padding:14px 16px 14px 42px;color:var(--text);font-size:.93rem;line-height:1.6}
.tips-list li::before{content:"✓";position:absolute;left:16px;top:14px;color:var(--gold);font-weight:800}
.dong-tags{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 8px}
.dong-tag{font-size:.85rem;color:var(--muted);background:var(--bg-alt);border:1px solid var(--line);border-radius:8px;padding:6px 12px}
.dong-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:6px 0 8px}
.dong-link{display:flex;align-items:center;justify-content:center;text-align:center;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:15px 14px;transition:transform .15s ease,border-color .15s ease,background .15s ease,box-shadow .15s ease}
.dong-link span{font-weight:700;color:var(--text);font-size:.95rem;transition:color .15s ease}
.dong-link:hover{border-color:var(--gold);background:linear-gradient(180deg,rgba(224,168,120,.12),var(--panel));transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.35)}
.dong-link:hover span{color:var(--gold-bright)}
.dong-link:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
@media(max-width:920px){.dong-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:680px){.dong-grid{grid-template-columns:repeat(2,1fr)}}
.review-list{display:grid;gap:14px;margin:6px 0 8px}
.review-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px 22px;border-left:3px solid var(--gold)}
.review-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin-bottom:10px}
.review-name{font-weight:800;color:var(--gold-bright);font-size:1.02rem}
.review-meta{color:var(--muted);font-size:.84rem}
.review-text{margin:0;color:var(--text);font-size:.96rem;line-height:1.75}
.review-reply{margin:14px 0 0;padding:12px 14px;background:var(--bg-alt);border-radius:10px;color:var(--muted);font-size:.9rem;line-height:1.65}
.review-reply strong{color:var(--gold);margin-right:6px}
.mag-list{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:8px 0 4px}
.mag-card{display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;transition:transform .15s ease,border-color .15s ease}
.mag-card:hover{border-color:var(--gold);transform:translateY(-3px)}
.mag-date{color:var(--gold);font-size:.8rem;font-weight:700;letter-spacing:.04em}
.mag-card h2{margin:8px 0 10px;font-size:1.12rem;color:var(--gold-bright);line-height:1.4;border:0;padding:0}
.mag-card p{margin:0 0 14px;color:var(--muted);font-size:.92rem;flex:1;line-height:1.6}
.mag-byline{color:var(--muted);font-size:.86rem;margin:0 0 22px}
@media(max-width:680px){.mag-list{grid-template-columns:1fr}}
@media(max-width:920px){.info-panel,.rec-cards,.zone-cards{grid-template-columns:1fr}}
@media(max-width:680px){.area-body{padding-top:32px}.area-hero{padding:18px 0 36px}}

/* faq */
.faq{max-width:820px}
.faq-item{border:1px solid var(--line);border-radius:12px;margin-bottom:10px;overflow:hidden;background:var(--panel)}
.faq-q{width:100%;text-align:left;background:none;border:0;color:var(--text);padding:18px 20px;font-size:1rem;font-weight:600;display:flex;justify-content:space-between;align-items:center;cursor:pointer;gap:12px}
.faq-icon{color:var(--gold);font-size:1.4rem;line-height:1;flex-shrink:0;transition:.2s}
.faq-q[aria-expanded=true] .faq-icon{transform:rotate(45deg)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .25s ease;padding:0 20px}
.faq-a p{margin:0;padding:0 0 18px;color:var(--muted)}

/* doc / article */
.doc{max-width:840px;margin:8px 0 0}
.doc h1{font-size:clamp(1.6rem,3.4vw,2.3rem);margin:18px 0 14px;font-weight:800}
.doc-lead{font-size:1.1rem;color:var(--text);margin:0 0 28px}
.doc h2{font-size:1.3rem;margin:34px 0 12px;color:var(--gold-bright);border-top:1px solid var(--line);padding-top:24px}
.doc ul{padding-left:20px;color:var(--text)}
.doc li{margin:6px 0}
.doc a{color:var(--gold);text-decoration:underline;text-underline-offset:3px}
.doc-ul{padding-left:20px;color:var(--text);margin:0 0 8px}
.doc-ul li{margin:6px 0}
.doc-ul a{color:var(--gold);text-decoration:underline;text-underline-offset:3px}
.doc-ul strong{color:var(--gold-bright)}
.doc-meta{color:var(--muted);font-size:.85rem;margin-top:24px}

/* info table */
.info-table{width:100%;border-collapse:collapse;margin:8px 0}
.info-table th,.info-table td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
.info-table th{width:160px;color:var(--gold-bright);font-weight:600}

/* author box */
.author-box{background:var(--bg-alt);border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;padding:22px;margin:40px 0 12px}
.author-box h2{border:0;padding:0;margin:0 0 10px;font-size:1.05rem;color:var(--gold-bright)}
.author-box p{margin:0 0 8px;color:var(--muted);font-size:.92rem}
.author-meta{font-size:.82rem!important}
.author-disclaimer{font-size:.82rem!important;color:var(--muted)!important}

/* breadcrumb */
.breadcrumb{margin:18px 0 6px}
.breadcrumb ol{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0;font-size:.85rem;color:var(--muted)}
.breadcrumb li:not(:last-child)::after{content:"›";margin-left:8px;color:var(--line)}
.breadcrumb a{color:var(--muted)}
.breadcrumb a:hover{color:var(--gold)}
.breadcrumb [aria-current=page]{color:var(--text)}

/* reserve */
.reserve{background:linear-gradient(180deg,var(--bg-alt),var(--bg));border-top:1px solid var(--line);padding:56px 0}
.reserve-inner{text-align:center;max-width:640px;margin:0 auto}
.reserve h2{font-size:1.6rem;margin:0 0 12px}
.reserve p{color:var(--muted);margin:0 0 24px}
.reserve-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

/* footer */
.site-footer{background:#0c0a09;border-top:1px solid var(--line);padding:48px 0 120px}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:28px;margin-bottom:32px}
.footer-brand{font-size:1.2rem;font-weight:800;color:var(--gold-bright);margin-bottom:10px}
.footer-desc{color:var(--muted);font-size:.9rem;margin:0}
.footer-col h3{font-size:.95rem;margin:0 0 12px;color:var(--text)}
.footer-col ul{list-style:none;padding:0;margin:0}
.footer-col li{margin:6px 0}
.footer-col a{color:var(--muted);font-size:.9rem}
.footer-col a:hover{color:var(--gold)}
.footer-phone{font-weight:700;color:var(--gold-bright)!important}
.footer-biz{border-top:1px solid var(--line);padding-top:22px;color:var(--muted);font-size:.82rem}
.footer-biz p{margin:4px 0}
.footer-note{font-size:.78rem}
.footer-copy{margin-top:12px!important}

/* sticky cta */
.sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:90;display:none;gap:0;background:var(--panel);border-top:1px solid var(--line)}
.sticky-cta a{flex:1;text-align:center;padding:16px;font-weight:700}
.sticky-call{background:var(--gold);color:#1a1410}
.sticky-sms{color:var(--text)}

/* responsive */
@media(max-width:920px){
  .trust-grid,.card-grid,.how-steps,.how-notes{grid-template-columns:repeat(2,1fr)}
  .area-grid{grid-template-columns:repeat(4,1fr)}
  .area-grid-lg,.sub-grid{grid-template-columns:repeat(2,1fr)}
  .footer-grid{grid-template-columns:1fr}
}
@media(max-width:680px){
  .nav-toggle{display:flex}
  .primary-nav{position:fixed;inset:64px 0 auto 0;background:var(--bg);border-bottom:1px solid var(--line);
    transform:translateY(-130%);transition:transform .25s;max-height:calc(100vh - 64px);overflow:auto}
  .primary-nav.open{transform:translateY(0)}
  .primary-nav ul{flex-direction:column;align-items:stretch;padding:10px}
  .submenu,.submenu-wide{position:static;display:none;box-shadow:none;width:auto;min-width:0;background:var(--bg-alt)}
  .submenu-wide li{width:100%}
  .has-sub.open>.submenu,.has-sub.open>.submenu-wide{display:block;grid-template-columns:none}
  .nav-cta{text-align:center;margin-top:8px}
  .trust-grid,.card-grid,.how-steps,.how-notes,.area-grid,.area-grid-lg,.sub-grid{grid-template-columns:1fr}
  .price-row{grid-template-columns:100px 1fr}
  .sticky-cta{display:flex}
  .hero{padding:56px 0 48px}
}
`;

const JS = `// 코코마사지 인터랙션: 모바일 메뉴 토글, FAQ 아코디언
(function () {
  "use strict";
  // 모바일 메뉴
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // 모바일: 드롭다운 펼치기
  document.querySelectorAll(".has-sub > a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width:680px)").matches) {
        var li = a.parentElement;
        // 서브메뉴가 있으면 첫 탭에서 펼치기
        if (li.querySelector(".submenu, .submenu-wide") && !li.classList.contains("open")) {
          e.preventDefault();
          li.classList.add("open");
        }
      }
    });
  });
  // FAQ 아코디언
  document.querySelectorAll(".faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var answer = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      answer.style.maxHeight = expanded ? null : answer.scrollHeight + "px";
    });
  });
})();
`;

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#15110f"/>
  <text x="32" y="42" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="700" fill="#e8b48b" text-anchor="middle">C</text>
</svg>
`;

const OG_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="78%" cy="0%" r="90%">
      <stop offset="0%" stop-color="#3a2a1d"/>
      <stop offset="55%" stop-color="#15110f"/>
      <stop offset="100%" stop-color="#100d0c"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="250" font-family="Arial,Helvetica,sans-serif" font-size="42" letter-spacing="8" fill="#e0a878">COCO · 코코마사지</text>
  <text x="80" y="350" font-family="Arial,Helvetica,sans-serif" font-size="78" font-weight="800" fill="#f3ece6">전국 출장마사지 안내</text>
  <text x="80" y="430" font-family="Arial,Helvetica,sans-serif" font-size="40" fill="#b6a99d">스웨디시 · 아로마 · 딥티슈 · 타이 · 스포츠 · 림프</text>
  <text x="80" y="540" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700" fill="#f2c79a">전화예약 0508-202-4717</text>
</svg>
`;

// ───────────────────────────────────────────────────────────────────────────
// 14. 검색엔진 파일: sitemap / sitemap1 / rss / robots
// ───────────────────────────────────────────────────────────────────────────
function buildSearchFiles() {
  const urlset = indexUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>
`;
  writeFile("sitemap.xml", sitemap);
  writeFile("sitemap1.xml", sitemap); // 서치콘솔 보조 제출용 (내용 동일)

  // RSS = 블로그 피드(매거진 글·후기), 최신순. 전체 페이지는 sitemap이 담당.
  const sortedFeed = [...feedItems].sort((a, b) => b.date.localeCompare(a.date));
  const items = sortedFeed
    .map(
      (u) => `    <item>
      <title>${esc(u.title)}</title>
      <link>${u.loc}</link>
      <guid isPermaLink="true">${u.loc}</guid>
      <description>${esc(u.desc)}</description>
      <pubDate>${new Date(u.date + "T09:00:00+09:00").toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");
  const latest = sortedFeed.length ? new Date(sortedFeed[0].date + "T09:00:00+09:00").toUTCString() : new Date(NOW_ISO).toUTCString();
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.brand)} 매거진</title>
    <link>${SITE.url}/magazine/</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE.brand)} 매거진 — 출장마사지 가이드·이용 팁·이용 후기 피드</description>
    <language>ko</language>
    <lastBuildDate>${latest}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  writeFile("rss.xml", rss);

  // robots.txt
  const robots = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Yeti
Allow: /

User-agent: NaverBot
Allow: /

User-agent: Daumoa
Allow: /

Sitemap: ${SITE.url}/sitemap.xml
Sitemap: ${SITE.url}/sitemap1.xml
Sitemap: ${SITE.url}/rss.xml
`;
  writeFile("robots.txt", robots);
}

// ───────────────────────────────────────────────────────────────────────────
// 15. 검증: title/description/canonical 중복 검사
// ───────────────────────────────────────────────────────────────────────────
function validate() {
  const titles = new Map();
  const descs = new Map();
  const locs = new Map();
  let dup = 0;
  for (const u of indexUrls) {
    if (titles.has(u.title)) { console.warn("⚠ 중복 title:", u.title); dup++; } else titles.set(u.title, 1);
    if (descs.has(u.desc)) { console.warn("⚠ 중복 description:", u.loc); dup++; } else descs.set(u.desc, 1);
    if (locs.has(u.loc)) { console.warn("⚠ 중복 URL:", u.loc); dup++; } else locs.set(u.loc, 1);
  }
  return dup;
}

// ───────────────────────────────────────────────────────────────────────────
// 16. 실행
// ───────────────────────────────────────────────────────────────────────────
function run() {
  buildAssets();
  buildIndex();
  buildHow();
  buildPricing();
  buildFaq();
  buildReviews();
  buildMagazine();
  buildAbout();
  buildPolicy();
  buildServicesIndex();
  SERVICES.forEach(buildServiceDetail);
  buildAreasIndex();
  REGIONS.forEach(buildRegionPage);
  buildSearchFiles();
  const dup = validate();
  console.log(`✅ 생성 완료: 색인 대상 ${indexUrls.length}개 페이지`);
  console.log(`   - 서비스 ${SERVICES.length}개, 시도 ${REGIONS.length}개, 서울 구 ${SEOUL_DISTRICTS.length}개`);
  console.log(`   - 하위 지역 ${Object.values(SUB_AREAS).reduce((a, b) => a + b.length, 0)}개`);
  console.log(dup === 0 ? "   - 중복 title/description/URL 없음" : `   - ⚠ 중복 ${dup}건 확인 필요`);
}

run();
