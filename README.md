# 코코마사지 (COCO) 출장마사지 사이트

전국 출장 웰니스·릴랙스 관리 안내를 위한 **정적 HTML 사이트**입니다.
모든 페이지는 생성기 `build-site.mjs` 한 곳에서 만들어집니다. Google 검색 가이드라인(E-E-A-T,
도움되는 콘텐츠, Who/How/Why, 스팸 정책, 페이지 경험, 구조화 데이터)을 기준으로 설계했습니다.

## 사업자 정보

| 항목 | 내용 |
| --- | --- |
| 상호 | 코코마사지 |
| 회사 | YH LAB |
| 대표 | 김유환 |
| 사업자등록번호 | 815-26-00585 |
| 주소 | 경기도 파주시 청석로 268 |
| 예약·문의 | 0508-202-4717 |

## 빌드

```bash
node build-site.mjs
```

생성 결과(63개 색인 페이지):

```
index.html                  메인
about/                      회사 소개 (E-E-A-T 신뢰 신호)
policy/                     이용약관·개인정보 처리방침
services/                   서비스 인덱스 + 6개 상세(스웨디시·아로마·딥티슈·타이·스포츠·림프)
areas/                      지역 인덱스 + 시도 14개
areas/seoul/<구>/           서울 25개 구
areas/<시도>/<시군구>/       경기·인천·부산·경상 대표 하위 지역
sitemap.xml, sitemap1.xml   사이트맵 (sitemap1은 서치콘솔 보조 제출용)
rss.xml                     RSS 피드
robots.txt                  크롤러 안내
assets/                     favicon.svg, og-image.svg
styles.css, script.js       UI / 인터랙션
```

빌드 시 title·description·canonical 중복 검사가 자동 실행됩니다.

## SEO / 가이드라인 대응

- **E-E-A-T**: 실명 사업자 정보(회사·대표·등록번호·주소), 페이지마다 `작성·검수 기준` 박스, 회사 소개 페이지.
- **도움되는 콘텐츠 / 정보 이득**: 지역 페이지는 지역명만 바꾼 복제가 아니라 생활권·건물 유형·이동 변수·FAQ를 각각 다르게 구성.
- **Who/How/Why**: 회사 소개에 누가·어떻게·왜 만들었는지 명시.
- **스팸 정책 회피**: 도어웨이/대량 복제 페이지 배제, 의료·과장 표현 금지(`치료/완치` 등 사용 안 함).
- **페이지 경험**: 모바일 우선 반응형, 시맨틱 마크업, 시스템 폰트로 빠른 로딩, 인라인 SVG 자산.
- **구조화 데이터**: 메인 `Organization`+`WebSite`, 서비스/지역 `Service`(provider=Organization), 전 페이지 `BreadcrumbList`·`FAQPage`. 실제 주소가 있으므로 `Organization`에 `PostalAddress` 포함.
- **선호 이미지**: 모든 페이지 `og:image` 지정(임의 크롤링 방지).

## 다음 사이트 재사용 시 바꿀 값

`build-site.mjs` 상단 `SITE` 객체:

```js
const SITE = { url, brand, brandEn, company, ceo, bizNo, address, phone, phoneTel, email,
  googleVerification, naverVerification, buildDate };
```

그리고 데이터 배열: `SERVICES`, `REGIONS`, `SEOUL_DISTRICTS`, `SUB_AREAS`.

> **배포 전 확인**: `SITE.url`을 실제 도메인으로 바꾸면 canonical·og:url·sitemap·rss·robots·구조화 데이터가 모두 새 도메인 기준으로 재생성됩니다. `googleVerification`/`naverVerification` 값도 실제 발급 토큰으로 교체하세요. (현재 메인 인증 메타는 토큰 발급 후 `head()`에 추가)

## 배포

GitHub 저장소 → Cloudflare Pages 자동 배포(빌드 명령 불필요, 정적 파일 그대로 서빙). 배포 후 라이브 URL에서 200 OK, sitemap/robots 접근을 확인하고 Search Console·Naver Search Advisor에 sitemap을 제출합니다.

## OG 이미지

`assets/og-image.png` (1200×630 PNG)는 SNS·카카오톡·구글 Discover 썸네일용입니다. SVG 미지원 환경을 고려해 PNG로 제공하며, 문구 변경 시 `python3 scripts/make-og.py`로 재생성합니다(Pillow 필요, 나눔고딕 자동 다운로드). OG 메타·구조화 데이터의 image는 모두 이 PNG를 가리킵니다.
