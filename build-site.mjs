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
  url: "https://cocomassage.club", // 커스텀 도메인 연결 후 이 값만 바꾸면 전체 반영
  brand: "코코마사지",
  brandEn: "COCO",
  company: "YH LAB",
  ceo: "김유환",
  bizNo: "815-26-00585",
  address: "경기도 파주시 청석로 268",
  phone: "0508-202-4717",
  phoneTel: "050882024717",
  email: "88smartbro88@gmail.com",
  responsibleTeam: "코코마사지 운영팀",
  // 검색엔진 인증 태그 (실제 발급값으로 교체)
  googleVerification: "GOOGLE_SITE_VERIFICATION_TOKEN",
  naverVerification: "NAVER_SITE_VERIFICATION_TOKEN",
  buildDate: "2026-05-29",
};

const NOW_ISO = `${SITE.buildDate}T09:00:00+09:00`;

// 색인 대상 URL 수집기 (sitemap/rss 생성용)
const indexUrls = []; // {loc, lastmod, changefreq, priority, title, desc}
function track(loc, { changefreq = "weekly", priority = "0.6", title = "", desc = "" } = {}) {
  indexUrls.push({ loc, lastmod: SITE.buildDate, changefreq, priority, title, desc });
}

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
  const ogImage = abs(ogImagePath || "/assets/og-image.svg");
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
        <li><a href="${r}index.html#how"${is("how")}>이용 방법</a></li>
        <li><a href="${r}index.html#pricing"${is("pricing")}>요금 안내</a></li>
        <li><a href="${r}index.html#faq"${is("faq")}>FAQ</a></li>
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
    email: SITE.email,
    image: abs("/assets/og-image.svg"),
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
const SERVICES = [
  {
    slug: "swedish",
    name: "스웨디시",
    short: "부드럽고 일정한 압으로 전신의 긴장을 풀어주는 대표적인 릴랙스 관리",
    intro:
      "스웨디시는 오일을 사용해 길고 일정한 손동작으로 전신을 부드럽게 풀어주는 대표적인 릴랙스 관리입니다. 강한 자극보다 편안함을 우선하기 때문에 마사지가 익숙하지 않은 분이나 전반적인 피로감을 느끼는 분이 처음 선택하기 좋습니다.",
    forWhom: [
      "오래 앉아 일하면서 어깨와 등이 무겁게 느껴지는 경우",
      "수면이 얕고 전반적으로 컨디션이 처질 때",
      "강한 압보다 편안하고 부드러운 관리를 선호하는 경우",
    ],
    features: [
      "오일을 사용한 길고 연속적인 손동작",
      "전신을 고르게 풀어주는 균형 잡힌 압",
      "컨디션에 따라 압을 약하게 조절 가능",
    ],
    flow: "상담으로 컨디션과 선호 압을 확인한 뒤, 목·어깨·등·다리 순으로 전신을 부드럽게 풀어가며 마무리에는 호흡을 고르는 시간을 둡니다.",
    times: "처음이라면 60분으로 전신 흐름을 경험하고, 충분히 이완을 원하면 90분 이상을 권합니다.",
    diff: "딥티슈가 특정 부위를 깊게 다룬다면, 스웨디시는 전신을 부드럽게 고르게 풀어 편안함을 우선합니다.",
    prepare: ["가벼운 식사 후 1시간 이상 지난 상태가 편합니다.", "샤워가 가능한 환경이면 관리 전후 모두 좋습니다."],
    check: ["오일 사용에 알레르기가 있는지 미리 알려주세요.", "임신 중이거나 특정 질환이 있으면 사전에 알려주세요."],
    faqs: [
      { q: "스웨디시는 처음인데 아프지 않나요?", a: "스웨디시는 부드럽고 일정한 압을 기본으로 하므로 통증을 거의 느끼지 않습니다. 압이 약하거나 강하다고 느끼면 언제든 말씀해 주세요." },
      { q: "오일이 피부에 남지 않을까요?", a: "흡수가 잘 되는 오일을 사용하며, 관리 후 가볍게 닦아드리거나 샤워로 정리하시면 됩니다." },
      { q: "어느 정도 시간을 받는 게 좋을까요?", a: "전신을 고르게 받으려면 60분 이상을 권하며, 깊은 이완을 원하면 90분을 추천합니다." },
    ],
  },
  {
    slug: "aroma",
    name: "아로마테라피",
    short: "향과 부드러운 터치로 심리적 이완까지 돕는 향기 기반 릴랙스 관리",
    intro:
      "아로마테라피는 식물성 에센셜 오일의 향을 활용해 부드러운 터치와 함께 심신의 이완을 돕는 관리입니다. 신체적 피로뿐 아니라 긴장으로 머리가 무겁고 마음이 복잡할 때 분위기 자체를 가라앉히는 데 도움이 됩니다.",
    forWhom: [
      "스트레스로 긴장이 쉽게 풀리지 않을 때",
      "향과 함께 편안한 분위기에서 이완하고 싶을 때",
      "잠들기 전 몸과 마음을 가라앉히고 싶은 경우",
    ],
    features: ["취향에 맞춘 향 선택", "부드럽고 느린 호흡 중심의 손동작", "심리적 이완에 초점을 둔 분위기 조성"],
    flow: "선호하는 향을 함께 고른 뒤, 호흡 리듬에 맞춰 느리고 부드러운 동작으로 전신을 풀고 두피와 목 주변까지 가볍게 마무리합니다.",
    times: "향을 충분히 느끼며 이완하려면 60~90분이 적당합니다.",
    diff: "스포츠·딥티슈가 근육을 직접 다룬다면, 아로마테라피는 향과 부드러운 터치로 분위기와 심리적 이완에 무게를 둡니다.",
    prepare: ["선호하거나 피하고 싶은 향이 있으면 미리 알려주세요.", "향에 민감하면 약하게 조절해 드립니다."],
    check: ["특정 향·식물 알레르기가 있으면 반드시 사전에 알려주세요.", "임신 중에는 사용 가능한 향이 제한될 수 있습니다."],
    faqs: [
      { q: "향을 직접 고를 수 있나요?", a: "네, 라벤더 계열처럼 차분한 향부터 시트러스 계열까지 컨디션과 취향에 맞춰 선택하실 수 있습니다." },
      { q: "향이 너무 강하면 어떡하죠?", a: "향의 농도는 약하게 조절할 수 있으며, 진행 중에도 부담스러우면 바로 조정해 드립니다." },
      { q: "임신 중에도 받을 수 있나요?", a: "임신 시기에 따라 권장되지 않는 향과 자세가 있어 사전 상담이 필요합니다. 예약 시 꼭 알려주세요." },
    ],
  },
  {
    slug: "deep-tissue",
    name: "딥티슈",
    short: "뭉친 부위를 집중적으로 깊게 풀어주는 강도 높은 관리",
    intro:
      "딥티슈는 표층보다 깊은 근육층을 겨냥해 특정 부위의 뭉침을 집중적으로 풀어주는 관리입니다. 같은 자세를 오래 유지하거나 운동 후 특정 부위가 단단하게 느껴지는 분께 적합합니다.",
    forWhom: [
      "어깨·목·허리 특정 부위가 단단하게 뭉친 경우",
      "강한 압을 선호하고 시원한 느낌을 원하는 경우",
      "장시간 같은 자세로 일하는 직군",
    ],
    features: ["깊은 근육층을 겨냥한 강한 압", "부위별 집중 관리", "압의 강도를 단계적으로 조절"],
    flow: "불편한 부위를 먼저 확인한 뒤, 주변을 충분히 이완하고 점진적으로 압을 높여 집중 부위를 풀어갑니다.",
    times: "특정 부위 집중은 60분, 전신을 깊게 다루려면 90분 이상을 권합니다.",
    diff: "스웨디시가 전신을 부드럽게 풀어준다면, 딥티슈는 단단한 특정 부위를 깊게 다루는 데 집중합니다.",
    prepare: ["집중적으로 풀고 싶은 부위를 미리 정리해 두면 좋습니다.", "관리 후 가벼운 뻐근함이 있을 수 있어 수분 섭취를 권합니다."],
    check: ["급성 통증이나 부상 부위는 강한 압을 피해야 하므로 사전에 알려주세요.", "디스크 등 척추 질환이 있으면 압 조절을 위해 미리 상담이 필요합니다."],
    faqs: [
      { q: "딥티슈는 많이 아픈가요?", a: "깊은 압을 사용하지만 통증을 참아야 하는 관리가 아닙니다. 시원한 정도를 유지하도록 압을 조절하니 편하게 말씀해 주세요." },
      { q: "관리 후 뻐근한 건 정상인가요?", a: "깊게 풀어준 부위는 다음 날 가벼운 뻐근함이 있을 수 있습니다. 충분한 수분과 휴식이 도움이 됩니다." },
      { q: "특정 부위만 집중해서 받을 수 있나요?", a: "네, 어깨와 목처럼 불편한 부위를 중심으로 시간을 배분해 진행할 수 있습니다." },
    ],
  },
  {
    slug: "thai",
    name: "타이마사지",
    short: "스트레칭과 지압을 결합해 몸의 가동 범위를 넓혀주는 관리",
    intro:
      "타이마사지는 오일 없이 편안한 복장으로 진행하며, 스트레칭과 지압을 결합해 몸 전체의 유연성과 가동 범위를 살리는 데 중점을 둡니다. 뻣뻣하게 굳은 느낌을 풀고 시원하게 늘려주는 관리를 원하는 분께 적합합니다.",
    forWhom: ["몸이 뻣뻣하고 가동 범위가 좁게 느껴질 때", "스트레칭처럼 시원하게 늘려주는 관리를 원할 때", "오일 사용을 선호하지 않는 경우"],
    features: ["오일 없이 편한 복장으로 진행", "스트레칭과 지압의 결합", "관절 가동 범위 중심의 동작"],
    flow: "발과 다리부터 시작해 점차 상체로 올라가며, 호흡에 맞춰 스트레칭과 지압을 번갈아 진행합니다.",
    times: "스트레칭 흐름을 충분히 경험하려면 60~90분이 적당합니다.",
    diff: "오일 마사지가 근육을 문질러 풀어준다면, 타이마사지는 늘려주고 눌러주는 동작으로 가동 범위를 살리는 데 집중합니다.",
    prepare: ["움직임이 편한 복장을 준비해 주세요. 필요 시 복장을 안내해 드립니다.", "식사 직후보다는 어느 정도 소화된 상태가 편합니다."],
    check: ["관절·인대 부상이 있으면 스트레칭 강도 조절을 위해 미리 알려주세요.", "최근 수술 이력이 있으면 사전 상담이 필요합니다."],
    faqs: [
      { q: "타이마사지도 옷을 벗어야 하나요?", a: "아니요. 움직임이 편한 복장을 입은 채로 진행합니다. 필요하면 편한 복장을 안내해 드립니다." },
      { q: "스트레칭이 무리되지 않을까요?", a: "가동 범위 안에서 호흡에 맞춰 천천히 진행하며, 불편하면 바로 강도를 줄입니다." },
      { q: "운동을 안 해도 받을 수 있나요?", a: "네, 오히려 평소 몸이 굳어 있는 분께 가동 범위를 넓혀주는 효과가 있어 적합합니다." },
    ],
  },
  {
    slug: "sports",
    name: "스포츠마사지",
    short: "활동량이 많은 분의 근육 피로 관리에 초점을 둔 관리",
    intro:
      "스포츠마사지는 운동이나 활동량이 많은 분의 근육 피로를 관리하는 데 초점을 둡니다. 운동 전후 컨디션 관리나 반복 사용으로 무거워진 부위를 풀어주는 데 적합합니다.",
    forWhom: ["규칙적으로 운동하며 근육 피로가 쌓이는 경우", "운동 후 회복 차원의 관리를 원할 때", "특정 부위를 반복적으로 사용하는 활동을 하는 경우"],
    features: ["활동 근육 중심의 부위별 관리", "운동 전후 컨디션을 고려한 강도 조절", "가벼운 스트레칭 동작 병행"],
    flow: "주로 사용하는 부위와 운동 패턴을 확인한 뒤, 해당 근육군을 중심으로 풀어주고 마무리에 가벼운 스트레칭을 더합니다.",
    times: "특정 부위 회복은 60분, 전신 컨디션 관리는 90분을 권합니다.",
    diff: "릴랙스 위주의 스웨디시와 달리, 스포츠마사지는 활동 근육의 피로 관리와 컨디션 조절에 무게를 둡니다.",
    prepare: ["최근 운동 강도와 주로 쓰는 부위를 알려주시면 도움이 됩니다.", "관리 후 충분한 수분 섭취를 권합니다."],
    check: ["부상 직후나 급성 염증 부위는 피해야 하므로 사전에 알려주세요.", "대회·시합 직전이라면 강도 조절을 위해 미리 상담해 주세요."],
    faqs: [
      { q: "운동선수만 받는 관리인가요?", a: "아닙니다. 규칙적으로 운동하거나 활동량이 많아 근육이 무거운 분이라면 누구나 적합합니다." },
      { q: "운동 직후 바로 받아도 되나요?", a: "가능하지만 격렬한 운동 직후에는 잠시 회복한 뒤 받는 것이 더 편안합니다. 상황을 알려주시면 강도를 맞춥니다." },
      { q: "특정 부위만 집중할 수 있나요?", a: "네, 주로 사용하는 부위를 중심으로 시간을 배분해 진행할 수 있습니다." },
    ],
  },
  {
    slug: "lymphatic",
    name: "림프마사지",
    short: "느리고 부드러운 손길로 순환과 가벼움을 돕는 관리",
    intro:
      "림프마사지는 매우 부드럽고 느린 손길로 몸의 순환을 돕고 가벼운 느낌을 주는 데 초점을 둔 관리입니다. 자극보다 편안함을 우선하며, 붓고 무거운 느낌으로 컨디션이 처질 때 선택하기 좋습니다.",
    forWhom: ["오래 앉거나 서 있어 다리가 무겁게 느껴질 때", "전반적으로 몸이 붓고 무거운 느낌이 들 때", "자극이 적고 부드러운 관리를 선호하는 경우"],
    features: ["매우 약하고 느린 손동작", "순환 방향을 고려한 부드러운 흐름", "편안함을 최우선으로 한 진행"],
    flow: "다리와 팔 등 무거운 부위를 중심으로 느리고 부드러운 동작을 반복하며 전신을 가볍게 정리합니다.",
    times: "부드러운 관리 특성상 충분한 효과를 위해 60~90분을 권합니다.",
    diff: "딥티슈·스포츠마사지가 강한 압을 사용한다면, 림프마사지는 매우 약한 압으로 순환과 가벼움에 집중합니다.",
    prepare: ["관리 전후로 수분을 충분히 섭취하면 좋습니다.", "조이지 않는 편한 복장이 편안합니다."],
    check: ["급성 염증·발열이 있을 때는 권하지 않으므로 사전에 알려주세요.", "순환계 관련 질환이 있으면 미리 상담이 필요합니다."],
    faqs: [
      { q: "림프마사지는 왜 이렇게 부드럽나요?", a: "강한 압보다 약하고 느린 손길이 순환을 돕는 데 적합하기 때문입니다. 자극이 적어 편안하게 받으실 수 있습니다." },
      { q: "다리만 집중해서 받을 수 있나요?", a: "네, 다리처럼 무겁게 느껴지는 부위를 중심으로 진행할 수 있습니다." },
      { q: "효과를 위해 얼마나 자주 받아야 하나요?", a: "컨디션에 따라 다르며, 무거운 느낌이 반복될 때 주기적으로 받으면 도움이 됩니다. 무리한 빈도를 권하지는 않습니다." },
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 5. 데이터: 시도 단위 지역 (각 지역 고유 설명)
// ───────────────────────────────────────────────────────────────────────────
const REGIONS = [
  { slug: "seoul", name: "서울", lead: "퇴근 이후 오피스텔·호텔 문의가 많아 공동현관·주차·프런트 규정 확인이 중요한 지역입니다.",
    traits: "업무권과 주거권이 촘촘히 섞여 있어 같은 구 안에서도 권역마다 이용 상황이 다릅니다.",
    move: "지하철 접근성이 좋지만 퇴근 시간대 도심 정체가 변수입니다.",
    note: "오피스텔·호텔은 공동현관 비밀번호, 주차 가능 여부, 프런트 방문객 규정을 미리 확인해야 합니다.",
    rec: ["스웨디시", "딥티슈", "아로마테라피"],
    faqs: [
      { q: "서울 어느 지역까지 출장이 되나요?", a: "서울 25개 구 전역으로 안내가 가능하며, 구별 안내 페이지에서 권역별 확인 사항을 확인하실 수 있습니다." },
      { q: "오피스텔도 방문이 가능한가요?", a: "가능합니다. 다만 공동현관 출입 방법과 주차 가능 여부를 예약 시 알려주시면 방문이 원활합니다." },
    ] },
  { slug: "gyeonggi", name: "경기", lead: "도시별 생활권 차이가 커서 같은 경기권이라도 이동 시간과 예약 조건이 크게 달라집니다.",
    traits: "신도시 아파트 단지, 산업단지, 구도심이 도시마다 다른 비율로 섞여 있습니다.",
    move: "도시 간 거리가 멀어 출발지와 목적지에 따라 이동 시간을 함께 확인합니다.",
    note: "대단지 아파트는 단지 입구·동 호수·지상/지하 주차 동선을 미리 확인하는 것이 좋습니다.",
    rec: ["스웨디시", "딥티슈", "스포츠마사지"],
    faqs: [
      { q: "경기도는 도시가 많은데 모두 가능한가요?", a: "주요 도시 위주로 안내가 가능하며, 도시별로 이동 시간이 달라 예약 시 정확한 위치를 알려주시면 가능 여부를 빠르게 확인해 드립니다." },
      { q: "외곽 지역은 출장비가 다른가요?", a: "이동 거리에 따라 출장비가 달라질 수 있어, 위치 확인 후 사전에 안내해 드립니다." },
    ] },
  { slug: "incheon", name: "인천", lead: "공항·항만·국제도시 일정이 변수라 항공편 전후 여유 시간을 함께 확인하는 지역입니다.",
    traits: "송도 국제도시, 구도심, 영종·공항 권역이 성격이 뚜렷하게 나뉩니다.",
    move: "교량·공항철도 이동 시간이 예약 가능 여부에 영향을 줍니다.",
    note: "공항 인근·호텔 숙소는 항공편 일정과 체크인/아웃 시간을 함께 확인해야 합니다.",
    rec: ["아로마테라피", "스웨디시", "림프마사지"],
    faqs: [
      { q: "공항 근처 호텔도 방문되나요?", a: "가능합니다. 항공편 일정과 체크인 시간을 알려주시면 여유 시간을 고려해 안내해 드립니다." },
      { q: "송도와 구도심 모두 가능한가요?", a: "네, 권역별로 이동 시간이 달라 정확한 위치를 알려주시면 가능 시간을 안내합니다." },
    ] },
  { slug: "busan", name: "부산", lead: "관광 숙소와 성수기 이동 지연이 변수라 객실 방문 가능 여부와 해안도로 정체를 함께 확인합니다.",
    traits: "해운대·광안리 관광권, 서면 업무권, 주거권이 명확히 구분됩니다.",
    move: "성수기와 주말에는 해안도로 정체로 이동 시간이 길어질 수 있습니다.",
    note: "관광 숙소·리조트는 객실 외부인 방문 규정을 미리 확인해야 합니다.",
    rec: ["스웨디시", "아로마테라피", "딥티슈"],
    faqs: [
      { q: "관광 와서 숙소에서 받을 수 있나요?", a: "가능합니다. 다만 숙소의 외부인 방문 규정을 미리 확인해 주시면 방문이 원활합니다." },
      { q: "성수기에도 예약이 되나요?", a: "성수기에는 이동 지연이 있을 수 있어 여유 있게 예약해 주시면 안내가 수월합니다." },
    ] },
  { slug: "daegu", name: "대구", lead: "도심 업무권과 주거권이 분리되어 있어 권역에 따라 이동 동선이 달라지는 지역입니다.",
    traits: "동성로 중심 도심권과 외곽 주거권의 성격이 다릅니다.",
    move: "도심 집중 시간대 정체를 고려해 시간을 조율합니다.",
    note: "도심 오피스텔은 주차와 공동현관 출입 방법을 확인합니다.",
    rec: ["스웨디시", "딥티슈", "스포츠마사지"],
    faqs: [
      { q: "대구 도심도 방문 가능한가요?", a: "가능합니다. 도심 오피스텔은 주차와 출입 방법을 알려주시면 방문이 원활합니다." },
      { q: "예약은 얼마나 미리 해야 하나요?", a: "원하는 시간대가 있다면 하루 전 또는 당일 여유 있게 연락 주시면 조율이 수월합니다." },
    ] },
  { slug: "daejeon", name: "대전", lead: "연구단지와 주거권, 역세권이 섞여 있어 방문 위치에 따라 이용 상황이 다른 지역입니다.",
    traits: "둔산 업무권, 유성 연구·주거권, 역세권으로 권역이 나뉩니다.",
    move: "도시 규모가 적당해 권역 간 이동이 비교적 수월한 편입니다.",
    note: "연구단지·관사 인근은 출입 규정을 미리 확인하는 것이 좋습니다.",
    rec: ["스웨디시", "아로마테라피", "딥티슈"],
    faqs: [
      { q: "유성과 둔산 모두 가능한가요?", a: "네, 두 권역 모두 안내가 가능하며 위치를 알려주시면 이동 시간을 고려해 안내합니다." },
      { q: "출장비는 어떻게 되나요?", a: "권역과 거리에 따라 달라질 수 있어 위치 확인 후 사전에 안내해 드립니다." },
    ] },
  { slug: "gwangju", name: "광주", lead: "도심 상권과 주거권이 비교적 가까워 권역 간 이동이 수월한 편의 지역입니다.",
    traits: "상무지구 업무권과 구도심 상권, 주거권이 어우러져 있습니다.",
    move: "도시 규모상 권역 간 이동 부담이 적은 편입니다.",
    note: "상무지구 오피스텔·호텔은 주차와 출입 규정을 확인합니다.",
    rec: ["스웨디시", "딥티슈", "아로마테라피"],
    faqs: [
      { q: "상무지구도 방문되나요?", a: "가능합니다. 오피스텔·호텔은 출입 방법을 알려주시면 방문이 원활합니다." },
      { q: "심야 시간도 예약 가능한가요?", a: "심야 예약은 가능 여부와 추가 안내가 달라질 수 있어 사전에 확인해 드립니다." },
    ] },
  { slug: "ulsan", name: "울산", lead: "산업단지 근무 패턴과 주거권이 뚜렷해 교대 근무 시간대 문의가 많은 지역입니다.",
    traits: "산업단지 인근 주거권과 도심 상권의 생활 리듬이 다릅니다.",
    move: "산업단지 출퇴근 시간대 정체를 고려해 시간을 조율합니다.",
    note: "산업단지 인근 숙소·관사는 출입 규정 확인이 필요합니다.",
    rec: ["스포츠마사지", "딥티슈", "스웨디시"],
    faqs: [
      { q: "교대 근무라 시간이 불규칙한데 가능한가요?", a: "가능합니다. 가능한 시간대를 알려주시면 그에 맞춰 안내해 드립니다." },
      { q: "산업단지 인근도 방문되나요?", a: "네, 인근 주거권·숙소 모두 안내가 가능하며 출입 방법을 알려주시면 좋습니다." },
    ] },
  { slug: "sejong", name: "세종", lead: "신도시 대단지 아파트와 관청 권역 중심이라 단지 동선 확인이 중요한 지역입니다.",
    traits: "계획도시 특성상 대단지 아파트와 관청 권역이 정돈되어 있습니다.",
    move: "단지 규모가 커서 동 호수와 주차 동선 확인이 중요합니다.",
    note: "대단지는 방문자 주차 등록과 동 위치를 미리 확인하는 것이 좋습니다.",
    rec: ["스웨디시", "아로마테라피", "림프마사지"],
    faqs: [
      { q: "세종 신도시 아파트도 방문되나요?", a: "가능합니다. 단지가 넓어 동 호수와 방문자 주차 방법을 알려주시면 방문이 원활합니다." },
      { q: "예약은 어떻게 하나요?", a: "전화나 문자로 위치와 희망 시간을 알려주시면 가능 시간을 안내해 드립니다." },
    ] },
  { slug: "gangwon", name: "강원", lead: "리조트·펜션 등 관광 숙소가 많아 객실 방문 규정과 이동 거리를 함께 확인하는 지역입니다.",
    traits: "춘천·원주 도심권과 강릉·속초 관광권의 성격이 다릅니다.",
    move: "도시 간 거리가 멀고 관광 성수기 이동 지연이 변수입니다.",
    note: "리조트·펜션은 객실 외부인 방문 규정을 미리 확인해야 합니다.",
    rec: ["아로마테라피", "스웨디시", "림프마사지"],
    faqs: [
      { q: "여행 중 펜션에서 받을 수 있나요?", a: "가능 여부는 숙소 규정에 따라 다르므로, 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "관광지라 출장비가 더 드나요?", a: "이동 거리에 따라 달라질 수 있어 위치 확인 후 사전에 안내해 드립니다." },
    ] },
  { slug: "chungcheong", name: "충청", lead: "혁신도시·산업단지·구도심이 도시마다 다르게 섞여 있어 위치별 확인이 필요한 지역입니다.",
    traits: "천안·아산 산업·주거권, 청주 도심권, 혁신도시 권역이 나뉩니다.",
    move: "도시 간 거리가 있어 출발지에 따라 이동 시간을 함께 봅니다.",
    note: "혁신도시·산업단지 인근 숙소는 출입 규정을 확인합니다.",
    rec: ["스웨디시", "딥티슈", "스포츠마사지"],
    faqs: [
      { q: "천안·청주 모두 가능한가요?", a: "주요 도시 위주로 안내가 가능하며 위치를 알려주시면 이동 시간을 고려해 확인합니다." },
      { q: "산업단지 인근 숙소도 되나요?", a: "네, 출입 방법과 위치를 알려주시면 방문 가능 여부를 안내해 드립니다." },
    ] },
  { slug: "jeolla", name: "전라", lead: "도심권과 관광권이 도시별로 나뉘어 이동 거리와 숙소 유형을 함께 확인하는 지역입니다.",
    traits: "전주 도심권, 여수·순천 관광권, 주거권으로 성격이 구분됩니다.",
    move: "관광 성수기 이동 지연과 도시 간 거리가 변수입니다.",
    note: "관광 숙소는 객실 방문 규정을, 도심은 주차·출입을 확인합니다.",
    rec: ["아로마테라피", "스웨디시", "딥티슈"],
    faqs: [
      { q: "여수 여행 중에도 가능한가요?", a: "숙소 규정에 따라 다르므로 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "전주 도심도 방문되나요?", a: "가능합니다. 주차와 출입 방법을 알려주시면 방문이 원활합니다." },
    ] },
  { slug: "gyeongsang", name: "경상", lead: "산업도시와 항만·관광권이 도시마다 달라 위치별 이용 상황을 확인하는 지역입니다.",
    traits: "창원·포항 산업권, 경주 관광권, 도심 주거권이 섞여 있습니다.",
    move: "산업도시 출퇴근 시간대와 도시 간 거리를 고려합니다.",
    note: "산업단지·관광 숙소는 각각 출입·방문 규정을 확인합니다.",
    rec: ["스포츠마사지", "딥티슈", "스웨디시"],
    faqs: [
      { q: "창원·포항 모두 가능한가요?", a: "주요 도시 위주로 안내가 가능하며 위치를 알려주시면 이동 시간을 고려해 확인합니다." },
      { q: "경주 관광 숙소도 되나요?", a: "숙소 규정에 따라 다르므로 위치와 숙소 유형을 알려주시면 안내해 드립니다." },
    ] },
  { slug: "jeju", name: "제주", lead: "리조트·호텔·펜션 등 숙소 유형이 다양해 객실 방문 규정 확인이 가장 중요한 지역입니다.",
    traits: "제주시 도심권과 서귀포 관광권, 해안 리조트권으로 나뉩니다.",
    move: "지역이 넓고 관광 성수기 이동 지연이 큰 변수입니다.",
    note: "리조트·호텔·펜션마다 외부인 방문 규정이 달라 사전 확인이 필수입니다.",
    rec: ["아로마테라피", "스웨디시", "림프마사지"],
    faqs: [
      { q: "제주 여행 중 호텔에서 받을 수 있나요?", a: "숙소 규정에 따라 다르므로 숙소 유형과 위치를 알려주시면 확인 후 안내해 드립니다." },
      { q: "서귀포까지도 가능한가요?", a: "이동 거리가 있어 시간 조율이 필요하며, 위치를 알려주시면 가능 시간을 안내합니다." },
    ] },
];

// ───────────────────────────────────────────────────────────────────────────
// 6. 데이터: 서울 25개 구 (각 구 고유 특성)
// ───────────────────────────────────────────────────────────────────────────
const SEOUL_DISTRICTS = [
  { slug: "gangnam-gu", name: "강남구", dong: "역삼·삼성·청담·압구정·대치", profile: "오피스텔과 업무권이 밀집해 퇴근 이후·심야 문의가 많은 권역", building: "고층 오피스텔과 호텔이 많아 공동현관 비밀번호와 프런트 규정 확인이 핵심", customer: "야근이 잦은 직장인과 출장 방문객", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
  { slug: "gangdong-gu", name: "강동구", dong: "천호·길동·둔촌·고덕", profile: "재건축 대단지 아파트와 주거권 중심으로 가족 단위 주거 문의가 많은 권역", building: "대단지 아파트가 많아 동 호수와 방문자 주차 확인이 중요", customer: "주거권 거주자와 재택 근무자", rec: ["스웨디시", "아로마테라피", "림프마사지"] },
  { slug: "gangbuk-gu", name: "강북구", dong: "수유·미아·번동", profile: "구릉지 주거권이 넓어 좁은 골목과 주차 동선 확인이 필요한 권역", building: "빌라·아파트가 섞여 있어 진입로와 주차 가능 여부 확인이 중요", customer: "주거권 거주자", rec: ["스웨디시", "딥티슈", "림프마사지"] },
  { slug: "gangseo-gu", name: "강서구", dong: "마곡·발산·화곡·김포공항", profile: "마곡 업무권과 공항, 주거권이 섞여 시간대별 이용 상황이 다른 권역", building: "마곡 오피스텔과 화곡 빌라권의 출입 방식이 달라 사전 확인 필요", customer: "마곡 직장인과 공항 인근 방문객", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
  { slug: "gwanak-gu", name: "관악구", dong: "신림·봉천·서울대입구", profile: "1인 가구와 원룸·오피스텔이 밀집해 출입 방식 확인이 잦은 권역", building: "원룸·오피스텔이 많아 공동현관과 호수 확인이 중요", customer: "1인 가구와 학생·직장인", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "gwangjin-gu", name: "광진구", dong: "건대·구의·자양·화양", profile: "대학·상권과 주거권이 어우러져 저녁 시간 문의가 많은 권역", building: "상권 인근 오피스텔과 주거 아파트가 섞여 출입 방식이 다양", customer: "직장인과 주거권 거주자", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "guro-gu", name: "구로구", dong: "구로디지털단지·신도림·개봉", profile: "디지털단지 업무권과 주거권이 인접해 퇴근 시간 문의가 많은 권역", building: "단지 오피스텔과 역세권 주상복합의 출입 규정 확인이 필요", customer: "IT·업무권 직장인", rec: ["딥티슈", "스포츠마사지", "스웨디시"] },
  { slug: "geumcheon-gu", name: "금천구", dong: "가산디지털단지·독산·시흥", profile: "가산 업무권과 주거권이 섞여 야근 후 문의가 많은 권역", building: "가산 오피스텔과 주거권 빌라의 출입 방식이 달라 확인 필요", customer: "가산 디지털단지 직장인", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
  { slug: "nowon-gu", name: "노원구", dong: "상계·중계·하계·공릉", profile: "대단지 아파트 주거권이 넓어 단지 동선 확인이 중요한 권역", building: "대규모 아파트 단지가 많아 동 호수와 주차 확인이 핵심", customer: "가족 단위 주거권 거주자", rec: ["스웨디시", "아로마테라피", "림프마사지"] },
  { slug: "dobong-gu", name: "도봉구", dong: "창동·쌍문·방학", profile: "주거권 중심으로 차분한 생활권이 형성된 권역", building: "아파트와 빌라가 섞여 진입로·주차 확인이 필요", customer: "주거권 거주자", rec: ["스웨디시", "림프마사지", "아로마테라피"] },
  { slug: "dongdaemun-gu", name: "동대문구", dong: "청량리·회기·전농·답십리", profile: "역세권 상권과 주거권, 대학가가 어우러진 권역", building: "역세권 주상복합과 주거 아파트의 출입 방식이 다양", customer: "직장인과 주거권 거주자", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "dongjak-gu", name: "동작구", dong: "노량진·사당·상도·흑석", profile: "역세권과 주거권이 섞여 이동 동선 확인이 필요한 권역", building: "역세권 오피스텔과 언덕 주거권의 출입·주차 확인이 중요", customer: "직장인과 주거권 거주자", rec: ["스웨디시", "딥티슈", "스포츠마사지"] },
  { slug: "mapo-gu", name: "마포구", dong: "공덕·홍대·합정·상암", profile: "숙소·상권·업무권이 혼합되어 시간대별 이용 상황이 다양한 권역", building: "상암 오피스권, 홍대 숙소권, 공덕 주상복합으로 출입 방식이 제각각", customer: "직장인·방문객·주거권 거주자", rec: ["스웨디시", "아로마테라피", "딥티슈"] },
  { slug: "seodaemun-gu", name: "서대문구", dong: "신촌·연희·홍제·남가좌", profile: "대학가와 주거권이 어우러져 저녁 문의가 많은 권역", building: "대학가 오피스텔과 주거 아파트의 출입 방식이 다양", customer: "직장인과 주거권 거주자", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "seocho-gu", name: "서초구", dong: "강남역·서초·반포·방배·잠원", profile: "업무권과 고급 주거권이 함께 있어 퇴근 후·주거권 문의가 모두 많은 권역", building: "업무권 오피스텔과 대단지 아파트의 출입·주차 규정 확인이 중요", customer: "직장인과 주거권 거주자", rec: ["딥티슈", "스웨디시", "아로마테라피"] },
  { slug: "seongdong-gu", name: "성동구", dong: "성수·왕십리·금호·옥수", profile: "성수 업무권과 주거권이 빠르게 섞여 저녁 문의가 많은 권역", building: "성수 오피스권과 강변 아파트의 출입 방식이 달라 확인 필요", customer: "직장인과 주거권 거주자", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
  { slug: "seongbuk-gu", name: "성북구", dong: "길음·정릉·돈암·안암", profile: "대학가와 주거권, 구릉지가 섞인 권역", building: "언덕 주거권과 역세권 아파트의 진입로·주차 확인이 필요", customer: "주거권 거주자와 직장인", rec: ["스웨디시", "딥티슈", "림프마사지"] },
  { slug: "songpa-gu", name: "송파구", dong: "잠실·문정·가락·방이", profile: "대단지 아파트와 문정 업무권이 함께 있어 주거·업무 문의가 모두 많은 권역", building: "잠실 대단지와 문정 오피스권의 동선·출입 확인이 중요", customer: "가족 단위 거주자와 직장인", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "yangcheon-gu", name: "양천구", dong: "목동·신정·신월", profile: "목동 대단지 주거권 중심으로 가족 단위 문의가 많은 권역", building: "대단지 아파트가 많아 동 호수와 방문자 주차 확인이 핵심", customer: "가족 단위 주거권 거주자", rec: ["스웨디시", "아로마테라피", "림프마사지"] },
  { slug: "yeongdeungpo-gu", name: "영등포구", dong: "여의도·영등포·당산·문래", profile: "여의도 업무권과 주거권이 함께 있어 퇴근 후 문의가 많은 권역", building: "여의도 오피스권과 주거 주상복합의 출입 규정 확인이 중요", customer: "여의도 직장인과 주거권 거주자", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
  { slug: "yongsan-gu", name: "용산구", dong: "이태원·한남·이촌·용산", profile: "호텔·외국인 거주권과 고급 주거권이 섞인 권역", building: "호텔과 고급 주거권의 프런트·출입 규정 확인이 중요", customer: "방문객과 주거권 거주자", rec: ["아로마테라피", "스웨디시", "딥티슈"] },
  { slug: "eunpyeong-gu", name: "은평구", dong: "연신내·불광·응암·은평뉴타운", profile: "뉴타운 대단지와 구도심 주거권이 섞인 권역", building: "뉴타운 아파트와 구도심 빌라의 진입로·주차 확인이 필요", customer: "주거권 거주자", rec: ["스웨디시", "림프마사지", "아로마테라피"] },
  { slug: "jongno-gu", name: "종로구", dong: "광화문·종로·혜화·평창", profile: "도심 업무권과 호텔, 구도심 주거권이 어우러진 권역", building: "도심 호텔·오피스권과 한옥·빌라권의 출입 방식이 제각각", customer: "직장인과 방문객", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "jung-gu", name: "중구", dong: "을지로·명동·동대문·신당", profile: "도심 업무권과 호텔·상권이 밀집한 권역", building: "도심 호텔과 오피스텔의 프런트·출입 규정 확인이 핵심", customer: "직장인과 방문객", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  { slug: "jungnang-gu", name: "중랑구", dong: "면목·상봉·묵동·중화", profile: "주거권 중심으로 생활권이 형성된 권역", building: "아파트와 빌라가 섞여 진입로·주차 확인이 필요", customer: "주거권 거주자", rec: ["스웨디시", "림프마사지", "딥티슈"] },
];

// ───────────────────────────────────────────────────────────────────────────
// 7. 데이터: 시도 하위 행정구역 (경기/인천/부산/경상 대표 지역)
// ───────────────────────────────────────────────────────────────────────────
const SUB_AREAS = {
  gyeonggi: [
    { slug: "suwon", name: "수원시", dong: "장안구·권선구·팔달구·영통구", profile: "행정구별 생활권이 뚜렷하고 영통 업무권과 구도심 상권이 함께 있는 도시", building: "영통 오피스텔과 대단지 아파트의 출입·주차 확인이 중요", move: "광교·영통 출퇴근 시간대 정체를 고려", rec: ["스웨디시", "딥티슈", "스포츠마사지"] },
    { slug: "seongnam", name: "성남시", dong: "분당·수정·중원", profile: "분당 업무·주거권과 구도심이 성격이 뚜렷하게 나뉘는 도시", building: "분당 대단지·오피스권과 구도심 주거권의 동선 확인이 필요", move: "판교·분당 출퇴근 정체가 변수", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
    { slug: "goyang", name: "고양시", dong: "일산동구·일산서구·덕양구", profile: "일산 신도시 대단지와 덕양 구도심이 섞인 도시", building: "일산 대단지 아파트의 동 호수·주차 확인이 핵심", move: "자유로·일산 권역 이동 시간을 고려", rec: ["스웨디시", "아로마테라피", "림프마사지"] },
    { slug: "yongin", name: "용인시", dong: "기흥·수지·처인", profile: "수지·기흥 주거권과 처인 외곽권의 거리가 큰 도시", building: "대단지 아파트와 단독·전원주택의 진입로 확인이 필요", move: "수지·기흥과 처인 간 이동 거리가 큰 변수", rec: ["스웨디시", "딥티슈", "아로마테라피"] },
  ],
  incheon: [
    { slug: "yeonsu-gu", name: "연수구", dong: "송도·연수·동춘", profile: "송도 국제도시 고층 주거·업무권과 구연수 주거권이 나뉘는 권역", building: "송도 고층 주상복합·오피스텔의 공동현관·주차 확인이 중요", move: "송도 내부 이동과 인천대교 접근 시간을 고려", rec: ["아로마테라피", "스웨디시", "림프마사지"] },
    { slug: "namdong-gu", name: "남동구", dong: "구월·논현·만수", profile: "행정 중심권과 주거권, 산업단지가 함께 있는 권역", building: "구월 주상복합과 논현 아파트의 출입·주차 확인이 필요", move: "구월 도심 시간대 정체를 고려", rec: ["스웨디시", "딥티슈", "스포츠마사지"] },
    { slug: "seo-gu", name: "서구", dong: "청라·검단·가정", profile: "청라 국제도시와 검단 신도시 대단지가 빠르게 성장한 권역", building: "청라·검단 대단지 아파트의 동 호수·방문자 주차 확인이 핵심", move: "청라·검단 권역 간 이동 시간을 고려", rec: ["스웨디시", "아로마테라피", "딥티슈"] },
  ],
  busan: [
    { slug: "haeundae-gu", name: "해운대구", dong: "해운대·센텀·우동·좌동", profile: "관광·숙소권과 센텀 업무권, 좌동 주거권이 함께 있는 권역", building: "해안 리조트·호텔의 객실 방문 규정과 센텀 오피스권 출입 확인이 필요", move: "성수기 해안도로 정체가 큰 변수", rec: ["아로마테라피", "스웨디시", "딥티슈"] },
    { slug: "busanjin-gu", name: "부산진구", dong: "서면·전포·부전", profile: "서면 중심 상권·업무권과 주거권이 밀집한 권역", building: "서면 오피스텔과 주상복합의 공동현관·주차 확인이 중요", move: "서면 도심 집중 시간대 정체를 고려", rec: ["딥티슈", "스웨디시", "스포츠마사지"] },
    { slug: "suyeong-gu", name: "수영구", dong: "광안·민락·남천", profile: "광안리 관광권과 해안 주거권이 어우러진 권역", building: "해안 주상복합·숙소의 출입·방문 규정 확인이 필요", move: "광안리 성수기·주말 정체를 고려", rec: ["아로마테라피", "스웨디시", "림프마사지"] },
  ],
  gyeongsang: [
    { slug: "changwon", name: "창원시", dong: "성산·의창·마산·진해", profile: "산업권과 주거권, 항만권이 통합되어 권역별 성격이 뚜렷한 도시", building: "산업단지 인근 숙소·관사와 주거 아파트의 출입 규정 확인이 필요", move: "산업단지 출퇴근 시간대와 통합시 권역 간 거리를 고려", rec: ["스포츠마사지", "딥티슈", "스웨디시"] },
    { slug: "pohang", name: "포항시", dong: "남구·북구", profile: "산업권과 해안 주거권이 함께 있는 도시", building: "산업단지 인근 숙소와 주거 아파트의 출입 확인이 필요", move: "산업단지 출퇴근 정체와 해안권 이동을 고려", rec: ["스포츠마사지", "딥티슈", "스웨디시"] },
    { slug: "gyeongju", name: "경주시", dong: "보문·황성·동천", profile: "관광권과 주거권이 나뉘어 숙소 유형이 다양한 도시", building: "보문 관광 숙소·리조트의 객실 방문 규정 확인이 중요", move: "관광 성수기 이동 지연이 변수", rec: ["아로마테라피", "스웨디시", "림프마사지"] },
  ],
};

// 시도 → 하위지역 매핑 보유 여부
const REGION_NAME = Object.fromEntries(REGIONS.map((r) => [r.slug, r.name]));

// ───────────────────────────────────────────────────────────────────────────
// 8. 페이지 생성: 메인
// ───────────────────────────────────────────────────────────────────────────
function buildIndex() {
  const depth = 0;
  const path0 = "/";
  const title = `${SITE.brand} | 전국 출장마사지 예약 안내`;
  const description = `${SITE.brand} 출장마사지 예약 안내. 스웨디시·아로마테라피·딥티슈·타이·스포츠·림프 관리와 지역별 이용 안내, 요금, FAQ를 한 곳에서 확인하세요. 전화예약 ${SITE.phone}.`;

  const mainFaqs = [
    { q: "예약은 어떻게 하나요?", a: "전화 또는 문자로 방문 지역, 희망 시간, 원하는 관리 종류를 알려주시면 가능 시간을 안내해 드립니다." },
    { q: "어디까지 출장이 가능한가요?", a: "전국 시도 단위로 안내가 가능하며, 지역 페이지에서 권역별 확인 사항을 보실 수 있습니다. 지역과 거리에 따라 가능 시간과 출장비가 달라질 수 있습니다." },
    { q: "결제는 어떻게 하나요?", a: "예약 시 안내해 드리는 방법으로 진행하며, 추가 출장비가 발생하는 경우 사전에 안내합니다." },
    { q: "취소나 변경이 가능한가요?", a: "가능합니다. 일정 변경이나 취소는 예약하신 연락처로 미리 알려주시면 원활하게 조정해 드립니다." },
    { q: "관리사는 어떻게 배정되나요?", a: "지역과 시간, 요청하신 관리 종류를 고려해 배정하며, 위생과 응대 기준을 준수합니다." },
    { q: "위생 관리는 어떻게 하나요?", a: "관리 도구와 소모품은 위생적으로 관리하며, 방문 시 청결을 우선합니다. 궁금한 점은 예약 시 문의해 주세요." },
  ];

  const jsonLd = [
    orgJsonLd(),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.brand,
      url: SITE.url,
      inLanguage: "ko",
    },
    faqJsonLd(mainFaqs),
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

  <section id="services" class="section" aria-labelledby="svc-h">
    <div class="container">
      <h2 id="svc-h" class="section-title">서비스 안내</h2>
      <p class="section-lead">컨디션과 선호에 따라 선택할 수 있는 대표 관리입니다. 각 관리의 특징과 추천 시간은 상세 페이지에서 확인하세요.</p>
      <div class="card-grid">
        ${SERVICES.map(
          (s) => `<a class="svc-card" href="services/${s.slug}/index.html">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.short)}</p>
          <span class="card-more">자세히 보기 →</span>
        </a>`
        ).join("\n        ")}
      </div>
    </div>
  </section>

  <section id="areas" class="section section-alt" aria-labelledby="area-h">
    <div class="container">
      <h2 id="area-h" class="section-title">출장 가능 지역</h2>
      <p class="section-lead">전국 시도 단위로 안내합니다. 지역별 생활권과 방문 시 확인사항이 다르므로 해당 지역 페이지에서 확인해 주세요.</p>
      <div class="area-grid">
        ${REGIONS.map(
          (r) => `<a class="area-card" href="areas/${r.slug}/index.html"><span>${esc(r.name)}</span></a>`
        ).join("\n        ")}
      </div>
    </div>
  </section>

  <section id="how" class="section" aria-labelledby="how-h">
    <div class="container">
      <h2 id="how-h" class="section-title">이용 방법</h2>
      <ol class="how-steps">
        <li><strong>예약 문의</strong><span>전화·문자로 지역, 희망 시간, 관리 종류를 알려주세요.</span></li>
        <li><strong>안내 확인</strong><span>가능 시간과 요금, 추가 출장비 여부를 사전에 안내해 드립니다.</span></li>
        <li><strong>방문 준비</strong><span>공동현관·주차·프런트 규정 등 방문 환경을 함께 확인합니다.</span></li>
        <li><strong>관리 진행</strong><span>컨디션을 확인하고 압을 조절하며 편안하게 진행합니다.</span></li>
      </ol>
      <div class="how-notes">
        <div><h3>관리 전 준비사항</h3><p>가벼운 식사 후 1시간 이상 지난 상태가 편하며, 알레르기·임신·질환은 미리 알려주세요.</p></div>
        <div><h3>결제 방법</h3><p>예약 시 안내해 드리는 방법으로 진행하고, 추가 출장비는 사전에 안내합니다.</p></div>
        <div><h3>취소·환불 안내</h3><p>일정 변경·취소는 미리 연락 주시면 원활히 조정합니다. 무단 변경 시 안내가 제한될 수 있습니다.</p></div>
        <div><h3>방문 유의사항</h3><p>건전한 휴식 관리 범위로 진행하며, 부적절한 요구에는 응하지 않습니다.</p></div>
      </div>
    </div>
  </section>

  <section id="pricing" class="section section-alt" aria-labelledby="price-h">
    <div class="container">
      <h2 id="price-h" class="section-title">요금 안내</h2>
      <p class="section-lead">아래는 시간 기준의 일반 안내이며, 지역·거리·시간대에 따라 추가 출장비가 발생할 수 있습니다. 정확한 금액은 예약 시 안내해 드립니다.</p>
      <div class="price-table" role="table" aria-label="시간별 요금 안내">
        <div class="price-row price-head" role="row"><span role="columnheader">관리 시간</span><span role="columnheader">기준 안내</span></div>
        <div class="price-row" role="row"><span role="cell">60분</span><span role="cell">전신 흐름을 가볍게 경험하기 좋은 기본 구성</span></div>
        <div class="price-row" role="row"><span role="cell">90분</span><span role="cell">충분한 이완과 부위별 집중이 가능한 구성</span></div>
        <div class="price-row" role="row"><span role="cell">120분</span><span role="cell">전신과 집중 부위를 여유 있게 다루는 구성</span></div>
      </div>
      <p class="price-note">※ 심야·장거리·도서 지역 등은 이동 조건에 따라 추가 비용이 안내될 수 있습니다. 과장된 효과나 의료적 효능을 약속하지 않습니다.</p>
    </div>
  </section>

  <section id="faq" class="section" aria-labelledby="faq-h">
    <div class="container">
      <h2 id="faq-h" class="section-title">자주 묻는 질문</h2>
      <div class="faq">
        ${faqHtml(mainFaqs)}
      </div>
    </div>
  </section>

  ${reserveBlock(depth)}
  <div class="container">${authorBlock("표시된 상호·연락처·주소는 사업자등록 정보와 일치하며, 효과를 과장하지 않는 범위에서 안내합니다.")}</div>
</main>
${footer(depth)}`;

  const html = head({ title, description, canonicalPath: path0, depth, jsonLd, verification: true }) + "\n" + body;
  writeFile("index.html", html);
  track(abs("/"), { changefreq: "daily", priority: "1.0", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 9. 페이지 생성: 회사 소개 (E-E-A-T) & 정책
// ───────────────────────────────────────────────────────────────────────────
function buildAbout() {
  const depth = 1;
  const p = "about/";
  const title = `회사 소개 | ${SITE.brand}`;
  const description = `${SITE.brand}(${SITE.company}) 회사 소개. 대표 ${SITE.ceo}, 사업자등록번호 ${SITE.bizNo}, 운영 원칙과 콘텐츠 작성·검수 기준을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "회사 소개" }], depth);
  const jsonLd = [
    bc.ld,
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: title,
      url: abs("/" + p),
      about: orgJsonLd(),
    },
  ];
  const body = `${header(depth, { active: "about" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>회사 소개</h1>
      <p class="doc-lead">${esc(SITE.brand)}는 ${esc(SITE.company)}가 운영하는 전국 출장 웰니스·릴랙스 관리 안내 서비스입니다. 예약 전에 필요한 정보를 먼저 투명하게 안내하는 것을 원칙으로 합니다.</p>

      <h2>사업자 정보</h2>
      <table class="info-table">
        <tbody>
          <tr><th>상호</th><td>${esc(SITE.brand)}</td></tr>
          <tr><th>회사명</th><td>${esc(SITE.company)}</td></tr>
          <tr><th>대표자</th><td>${esc(SITE.ceo)}</td></tr>
          <tr><th>사업자등록번호</th><td>${esc(SITE.bizNo)}</td></tr>
          <tr><th>주소</th><td>${esc(SITE.address)}</td></tr>
          <tr><th>예약·문의</th><td><a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a></td></tr>
        </tbody>
      </table>

      <h2>운영 원칙 (왜 만들었는가)</h2>
      <p>출장마사지는 방문 전 확인해야 할 정보가 많고, 과장된 효과 표현으로 오해가 생기기 쉬운 분야입니다. ${esc(SITE.brand)}는 이러한 점을 고려해, 광고 문구보다 실제 이용에 필요한 안내(가능 지역, 방문 환경 확인, 요금, 준비사항)를 먼저 제공하기 위해 이 사이트를 만들었습니다.</p>

      <h2>콘텐츠 작성·검수 기준 (누가, 어떻게)</h2>
      <p>사이트의 모든 안내 콘텐츠는 <strong>${esc(SITE.responsibleTeam)}</strong>이 실제 예약·출장 상담에서 반복적으로 확인하는 내용을 바탕으로 작성하고 검수합니다. 지역 페이지는 생활권·이동 조건·건물 유형 등 실제 방문 경험에서 확인한 차이를 반영하며, 지역명만 바꾼 복제 콘텐츠를 만들지 않습니다.</p>

      <h2>서비스 범위와 한계</h2>
      <ul>
        <li>본 서비스는 휴식과 컨디션 관리를 위한 웰니스 릴랙스 관리입니다.</li>
        <li>질병의 진단·치료·예방을 목적으로 하는 의료 행위가 아니며, 의료적 효능을 약속하지 않습니다.</li>
        <li>건전한 관리 범위에서만 진행하며, 부적절한 요구에는 응하지 않습니다.</li>
      </ul>

      <h2>연락처</h2>
      <p>예약과 문의는 전화 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a> 또는 문자로 받습니다. 콘텐츠 관련 문의는 ${esc(SITE.email)}로 보내주시면 확인합니다.</p>

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
  const description = `${SITE.brand} 이용약관 및 개인정보 처리방침. 예약·취소 기준, 수집 항목과 이용 목적, 보유 기간을 안내합니다.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "이용약관·개인정보" }], depth);
  const body = `${header(depth)}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>이용약관 및 개인정보 처리방침</h1>

      <h2>1. 서비스 안내</h2>
      <p>${esc(SITE.brand)}(${esc(SITE.company)})는 전국 출장 웰니스·릴랙스 관리 예약을 안내합니다. 본 서비스는 의료 행위가 아니며, 건전한 휴식 관리 범위로 제공됩니다.</p>

      <h2>2. 예약·취소 기준</h2>
      <ul>
        <li>예약은 전화·문자로 접수하며, 지역·거리·시간대에 따라 가능 시간과 출장비가 달라질 수 있습니다.</li>
        <li>일정 변경·취소는 예약하신 연락처로 사전에 알려주셔야 원활하게 조정됩니다.</li>
        <li>무단 변경·취소가 반복될 경우 예약 안내가 제한될 수 있습니다.</li>
      </ul>

      <h2>3. 개인정보 수집 항목 및 목적</h2>
      <ul>
        <li>수집 항목: 예약자 연락처, 방문 지역·주소, 희망 시간 등 예약 진행에 필요한 정보</li>
        <li>이용 목적: 예약 확인, 방문 안내, 고객 문의 응대</li>
        <li>보유 기간: 예약 목적 달성 후 관련 법령에 따른 기간 동안 보관하며, 이후 지체 없이 파기합니다.</li>
      </ul>

      <h2>4. 개인정보의 제3자 제공</h2>
      <p>법령에 근거가 있거나 이용자가 동의한 경우를 제외하고, 수집한 개인정보를 제3자에게 제공하지 않습니다.</p>

      <h2>5. 이용자 권리</h2>
      <p>이용자는 본인 개인정보의 열람·정정·삭제를 요청할 수 있습니다. 요청은 ${esc(SITE.email)} 또는 ${esc(SITE.phone)}로 접수해 주세요.</p>

      <h2>6. 문의</h2>
      <p>개인정보 및 약관 관련 문의는 ${esc(SITE.email)}로 보내주시면 확인 후 안내해 드립니다.</p>

      <p class="doc-meta">시행일: ${esc(SITE.buildDate)} · 운영: ${esc(SITE.company)} (대표 ${esc(SITE.ceo)})</p>
    </article>
  </div>
</main>
${footer(depth)}`;
  writeFile("policy/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "yearly", priority: "0.3", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 10. 페이지 생성: 서비스 인덱스 + 상세
// ───────────────────────────────────────────────────────────────────────────
function buildServicesIndex() {
  const depth = 1;
  const p = "services/";
  const title = `서비스 안내 | ${SITE.brand} 출장마사지`;
  const description = `${SITE.brand}의 출장 관리 종류 안내. 스웨디시, 아로마테라피, 딥티슈, 타이마사지, 스포츠마사지, 림프마사지의 특징과 추천 상황을 비교해 선택하세요.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "서비스 안내" }], depth);
  const body = `${header(depth, { active: "services" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <h1 class="page-title">서비스 안내</h1>
    <p class="section-lead">컨디션과 선호에 맞게 선택할 수 있는 대표 관리입니다. 모든 관리는 휴식과 컨디션 관리를 위한 웰니스 범위로 진행됩니다.</p>
    <div class="card-grid">
      ${SERVICES.map(
        (s) => `<a class="svc-card" href="${s.slug}/index.html">
        <h2>${esc(s.name)}</h2>
        <p>${esc(s.short)}</p>
        <span class="card-more">자세히 보기 →</span>
      </a>`
      ).join("\n      ")}
    </div>
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
  const title = `${s.name} 출장마사지 안내 | ${SITE.brand}`;
  const description = `${s.name} 출장 관리 안내 - ${s.short}. 추천 상황, 진행 방식, 추천 시간, 준비사항과 자주 묻는 질문을 확인하세요.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "서비스 안내", path: "services/" }, { name: s.name }], depth);
  const jsonLd = [
    bc.ld,
    serviceJsonLd({ name: `${s.name} 출장마사지`, description: s.short, url: "/" + p }),
    faqJsonLd(s.faqs),
  ];
  const body = `${header(depth, { active: "services" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>${esc(s.name)} 출장마사지 서비스 안내</h1>
      <p class="doc-lead">${esc(s.intro)}</p>

      <h2>${esc(s.name)}란?</h2>
      <p>${esc(s.intro)}</p>

      <h2>이런 경우에 좋습니다</h2>
      <ul>${s.forWhom.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>

      <h2>특징</h2>
      <ul>${s.features.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>

      <h2>관리 진행 방식</h2>
      <p>${esc(s.flow)}</p>

      <h2>추천 관리 시간</h2>
      <p>${esc(s.times)}</p>

      <h2>다른 마사지와의 차이</h2>
      <p>${esc(s.diff)}</p>

      <h2>이용 전 준비사항</h2>
      <ul>${s.prepare.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>

      <h2>예약 전 확인사항</h2>
      <ul>${s.check.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>

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
    <div class="area-grid area-grid-lg">
      ${REGIONS.map(
        (r) => `<a class="area-card" href="${r.slug}/index.html"><span>${esc(r.name)}</span><small>${esc(r.lead.split(".")[0])}</small></a>`
      ).join("\n      ")}
    </div>
  </div>
  ${reserveBlock(depth)}
</main>
${footer(depth)}`;
  writeFile("areas/index.html", head({ title, description, canonicalPath: "/" + p, depth, jsonLd: [bc.ld] }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.8", title, desc: description });
}

// ───────────────────────────────────────────────────────────────────────────
// 12. 페이지 생성: 시도 지역 페이지
// ───────────────────────────────────────────────────────────────────────────
function buildRegionPage(r) {
  const depth = 2;
  const p = `areas/${r.slug}/`;
  const subs = r.slug === "seoul" ? SEOUL_DISTRICTS : SUB_AREAS[r.slug] || [];
  const isSeoul = r.slug === "seoul";
  const title = `${r.name} 출장마사지 안내 | ${SITE.brand}`;
  const description = `${r.name} 출장마사지 이용 안내 - ${r.lead} 권역별 확인사항, 추천 관리, 자주 묻는 질문을 확인하세요. 전화예약 ${SITE.phone}.`;
  const bc = breadcrumb([{ name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" }, { name: r.name }], depth);
  const jsonLd = [
    bc.ld,
    serviceJsonLd({ name: `${r.name} 출장마사지`, description: r.lead, areaName: r.name, url: "/" + p }),
    faqJsonLd(r.faqs),
  ];

  const subListTitle = isSeoul ? "서울 25개 구 안내" : `${r.name} 주요 지역 안내`;
  const subList =
    subs.length > 0
      ? `<h2>${subListTitle}</h2>
      <p>아래 지역은 생활권과 방문 환경이 서로 달라 개별 안내 페이지로 구분했습니다.</p>
      <div class="sub-grid">
        ${subs.map((d) => `<a class="sub-card" href="${d.slug}/index.html"><span>${esc(d.name)}</span><small>${esc(d.dong)}</small></a>`).join("\n        ")}
      </div>`
      : "";

  const body = `${header(depth, { active: "areas" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>${esc(r.name)} 출장마사지 서비스 안내</h1>
      <p class="doc-lead">${esc(r.lead)}</p>

      <h2>${esc(r.name)} 이용 안내</h2>
      <p>${esc(r.traits)} ${esc(r.move)}</p>

      <h2>방문 시 확인할 점</h2>
      <p>${esc(r.note)}</p>

      <h2>추천 관리</h2>
      <ul>${r.rec.map((name) => {
        const svc = SERVICES.find((s) => s.name === name);
        return `<li><a href="../../services/${svc.slug}/index.html">${esc(name)}</a> — ${esc(svc.short)}</li>`;
      }).join("")}</ul>

      <h2>예약 전 확인사항</h2>
      <ul>
        <li>방문 지역의 정확한 위치와 건물 유형(아파트·오피스텔·호텔 등)을 알려주세요.</li>
        <li>지역과 거리, 시간대에 따라 가능 시간과 출장비가 달라질 수 있습니다.</li>
        <li>알레르기·임신·질환 등 사전에 알아야 할 사항을 미리 알려주세요.</li>
      </ul>

      ${subList}

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(r.faqs)}</div>

      ${authorBlock(`${esc(r.name)} 권역의 이동 조건과 건물 유형 차이는 실제 출장 상담에서 확인한 내용을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${r.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`areas/${r.slug}/index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.7", title, desc: description });

  // 하위 페이지 생성
  if (isSeoul) {
    subs.forEach((d) => buildSeoulDistrict(d));
  } else {
    subs.forEach((d) => buildSubArea(r, d));
  }
}

// 서울 구 페이지
function buildSeoulDistrict(d) {
  const depth = 3;
  const p = `areas/seoul/${d.slug}/`;
  const title = `${d.name} 출장마사지 안내 | ${SITE.brand}`;
  const description = `${d.name} 출장마사지 이용 안내 - ${d.dong} 등 ${d.profile}. 권역별 확인사항과 추천 관리, FAQ를 확인하세요.`;
  const bc = breadcrumb(
    [{ name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" }, { name: "서울", path: "areas/seoul/" }, { name: d.name }],
    depth
  );
  const faqs = [
    { q: `${d.name}는 어떤 곳까지 방문되나요?`, a: `${d.dong} 일대를 포함해 ${d.name} 전역으로 안내가 가능합니다. 정확한 위치와 건물 유형을 알려주시면 가능 시간을 안내해 드립니다.` },
    { q: `${d.name}에서 예약 시 무엇을 확인하나요?`, a: `${d.building} 따라서 출입 방법과 주차 가능 여부를 미리 알려주시면 방문이 원활합니다.` },
    { q: `${d.name}에서는 어떤 관리가 인기인가요?`, a: `${d.profile} 특성상 ${d.rec.join(", ")} 관리를 많이 찾습니다. 컨디션에 맞춰 안내해 드립니다.` },
  ];
  const jsonLd = [
    bc.ld,
    serviceJsonLd({ name: `${d.name} 출장마사지`, description: d.profile, areaName: `서울 ${d.name}`, url: "/" + p }),
    faqJsonLd(faqs),
  ];
  const r3 = "../../../";
  const body = `${header(depth, { active: "areas" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>${esc(d.name)} 출장마사지 서비스 안내</h1>
      <p class="doc-lead">${esc(d.name)}는 ${esc(d.profile)}입니다. 주요 생활권은 ${esc(d.dong)} 일대입니다.</p>

      <h2>${esc(d.name)} 출장마사지 이용 안내</h2>
      <p>${esc(d.name)}는 ${esc(d.profile)}으로, 주로 ${esc(d.customer)}의 문의가 많습니다. 같은 ${esc(d.name)} 안에서도 권역마다 방문 환경이 달라 위치를 먼저 확인합니다.</p>

      <h2>주요 권역별 안내</h2>
      <p>${esc(d.dong)} 등 권역에 따라 건물 유형과 출입 방식이 다릅니다. ${esc(d.building)}.</p>

      <h2>방문 시 확인할 점</h2>
      <ul>
        <li>${esc(d.building)}.</li>
        <li>공동현관 출입 방법, 주차 가능 여부, 프런트 방문객 규정을 미리 확인합니다.</li>
        <li>희망 시간대와 정확한 위치를 알려주시면 가능 시간을 안내합니다.</li>
      </ul>

      <h2>이용 가능한 관리</h2>
      <ul>${d.rec.map((name) => {
        const svc = SERVICES.find((s) => s.name === name);
        return `<li><a href="${r3}services/${svc.slug}/index.html">${esc(name)}</a> — ${esc(svc.short)}</li>`;
      }).join("")}</ul>

      <h2>이용 전 준비사항</h2>
      <ul>
        <li>가벼운 식사 후 1시간 이상 지난 상태가 편합니다.</li>
        <li>알레르기·임신·질환 등은 예약 시 미리 알려주세요.</li>
        <li>건전한 휴식 관리 범위로 진행하며, 부적절한 요구에는 응하지 않습니다.</li>
      </ul>

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(faqs)}</div>

      ${authorBlock(`${esc(d.name)}의 권역별 생활권과 건물 유형 차이는 실제 출장 상담 경험을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${d.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`${p}index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.6", title, desc: description });
}

// 경기/인천/부산/경상 하위 페이지
function buildSubArea(region, d) {
  const depth = 3;
  const p = `areas/${region.slug}/${d.slug}/`;
  const title = `${d.name} 출장마사지 안내 | ${SITE.brand}`;
  const description = `${d.name} 출장마사지 이용 안내 - ${d.dong} 등 ${d.profile}. 이동 변수와 방문 확인사항, 추천 관리, FAQ를 확인하세요.`;
  const bc = breadcrumb(
    [{ name: "홈", path: "/" }, { name: "출장 가능 지역", path: "areas/" }, { name: region.name, path: `areas/${region.slug}/` }, { name: d.name }],
    depth
  );
  const faqs = [
    { q: `${d.name}는 어디까지 방문되나요?`, a: `${d.dong} 일대를 포함해 ${d.name} 권역으로 안내가 가능합니다. 정확한 위치를 알려주시면 가능 시간을 안내해 드립니다.` },
    { q: `${d.name} 예약 시 무엇을 확인하나요?`, a: `${d.building} 또한 ${d.move} 점도 함께 확인합니다.` },
    { q: `${d.name}에서는 어떤 관리를 많이 찾나요?`, a: `${d.profile} 특성상 ${d.rec.join(", ")} 관리를 많이 찾습니다. 컨디션에 맞춰 안내해 드립니다.` },
  ];
  const jsonLd = [
    bc.ld,
    serviceJsonLd({ name: `${d.name} 출장마사지`, description: d.profile, areaName: `${region.name} ${d.name}`, url: "/" + p }),
    faqJsonLd(faqs),
  ];
  const r3 = "../../../";
  const body = `${header(depth, { active: "areas" })}
<main id="main">
  <div class="container">
    ${bc.html}
    <article class="doc">
      <h1>${esc(d.name)} 출장마사지 서비스 안내</h1>
      <p class="doc-lead">${esc(d.name)}는 ${esc(d.profile)}입니다. 주요 생활권은 ${esc(d.dong)}으로 나뉩니다.</p>

      <h2>${esc(d.name)} 이용 안내</h2>
      <p>${esc(d.profile)}이라, 권역에 따라 방문 환경과 이동 시간이 다릅니다. ${esc(d.move)}.</p>

      <h2>주요 권역별 안내</h2>
      <p>${esc(d.dong)} 등 생활권별로 건물 유형과 출입 방식이 다릅니다. ${esc(d.building)}.</p>

      <h2>이동·시간대 변수</h2>
      <p>${esc(d.move)}. 정확한 위치와 희망 시간을 알려주시면 가능 시간과 출장비를 사전에 안내해 드립니다.</p>

      <h2>이용 가능한 관리</h2>
      <ul>${d.rec.map((name) => {
        const svc = SERVICES.find((s) => s.name === name);
        return `<li><a href="${r3}services/${svc.slug}/index.html">${esc(name)}</a> — ${esc(svc.short)}</li>`;
      }).join("")}</ul>

      <h2>예약 전 확인사항</h2>
      <ul>
        <li>${esc(d.building)}.</li>
        <li>지역과 거리, 시간대에 따라 가능 시간과 출장비가 달라질 수 있습니다.</li>
        <li>알레르기·임신·질환 등은 예약 시 미리 알려주세요.</li>
      </ul>

      <h2>자주 묻는 질문</h2>
      <div class="faq">${faqHtml(faqs)}</div>

      ${authorBlock(`${esc(d.name)}의 생활권·이동 조건 차이는 실제 출장 상담 경험을 반영했습니다.`)}
    </article>
  </div>
  ${reserveBlock(depth, `${d.name} 예약 문의`)}
</main>
${footer(depth)}`;
  writeFile(`${p}index.html`, head({ title, description, canonicalPath: "/" + p, depth, jsonLd }) + "\n" + body);
  track(abs("/" + p), { changefreq: "monthly", priority: "0.6", title, desc: description });
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

  // RSS
  const items = indexUrls
    .map(
      (u) => `    <item>
      <title>${esc(u.title)}</title>
      <link>${u.loc}</link>
      <guid isPermaLink="true">${u.loc}</guid>
      <description>${esc(u.desc)}</description>
      <pubDate>${new Date(NOW_ISO).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.brand)} 업데이트</title>
    <link>${SITE.url}/</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE.brand)} 출장마사지 서비스·지역 안내 업데이트 피드</description>
    <language>ko</language>
    <lastBuildDate>${new Date(NOW_ISO).toUTCString()}</lastBuildDate>
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
