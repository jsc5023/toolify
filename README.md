# ⭐ Toolify – 올인원 웹 도구 모음

날짜 계산기, 글자수 세기, 비밀번호 생성기 등 자주 사용하는 웹 도구들을 한 곳에서 제공하는 무료 올인원 웹 도구 서비스입니다.

회원가입 없이 누구나 빠르게 사용할 수 있으며, 모든 기능은 브라우저에서만 동작하여 개인정보가 서버로 전송되지 않습니다.

🔗 [Live](https://toolify.kr/)

---

## ✨ 주요 기능 (Features)

### 📅 날짜 계산기
* 두 날짜 사이의 일수 계산
* D-Day 계산
* 날짜 더하기/빼기
* 평일(주말 제외) 기준 계산
* 날짜 목록 출력, 요일 개수 계산

### ✏️ 글자수 세기
* 글자 수 (공백 포함/제외)
* 단어 수
* 줄 수
* 바이트 수 (UTF-8)
* 실시간 자동 계산

### 🔐 비밀번호 생성기
* 소문자/대문자/숫자/특수문자 옵션 선택
* 헷갈리기 쉬운 문자 제외 기능 제공 (0/O, 1/l 등)
* 비밀번호 강도 분석 제공
* 생성/복사 기능 지원

---

## 📂 프로젝트 구조
```
toolify/
│
├── index.html                     # 메인 페이지
├── style.css                      # 전체 공통 스타일
├── main.js                        # 공통 네비/반응형 JS
│
├── tools/
│   ├── date-calculator/           # 날짜 계산기
│   │   ├── index.html
│   │   ├── date-calculator.css
│   │   └── date-calculator.js
│   │
│   ├── text-counter/              # 글자수 세기
│   │   ├── index.html
│   │   ├── text-counter.css
│   │   └── text-counter.js
│   │
│   ├── password-generator/        # 비밀번호 생성기
│       ├── index.html
│       ├── password-generator.css
│       └── password-generator.js
│
├── privacy.html
├── terms.html
└── contact.html
```

---

## 🛠 기술 스택 (Tech Stack)

| 분야 | 기술 |
|------|------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Hosting | Vercel |
| SEO | meta 태그, OG 태그, canonical 링크, robots.txt, sitemap |
| Analytics | Google AdSense, Naver Site Verification |

---

## 📝 개발 의도

Toolify는 "가벼운 도구를 빠르게 제공하는 웹앱"을 목표로 개발되었습니다. 매번 검색해서 사용하는 계산기 도구들을 하나의 사이트에서 접근 가능하도록 통합하는것을 목표로 합니다.

---

## 📜 라이선스

MIT License