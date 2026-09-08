// =======================
// 네비 토글 (공통)
// =======================
(function navToggleInit() {
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (!navToggle || !navLinks) return;

    navToggle.addEventListener("click", () => {
        navLinks.classList.toggle("open");
    });

    navLinks.addEventListener("click", (e) => {
        if (e.target && e.target.tagName === "A") navLinks.classList.remove("open");
    });
})();

// =======================
// 헤더 검색 아이콘 (홈 전용)
// =======================
(function headerSearchInit() {
    const btn = document.querySelector("#header-search-btn");
    const input = document.querySelector("#tool-search");
    if (!btn) return;

    btn.addEventListener("click", () => {
        // 홈이 아니면 홈으로 이동 (다른 페이지에서도 이 JS가 로드될 수 있으니 안전 처리)
        if (!input) {
            window.location.href = "../../#tool-search";
            return;
        }

        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
    });
})();

// =======================
// IndexNow 자동 제출 (공통)
// =======================
function pingIndexNowOnce(urls) {
    if (localStorage.getItem("indexnow-pinged")) return;

    fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            host: "toolify.kr",
            key: "61434b5a3f9d4cb680b2bd861e557f31",
            keyLocation: "https://toolify.kr/61434b5a3f9d4cb680b2bd861e557f31.txt",
            urlList: urls,
        }),
    }).catch(() => {});

    localStorage.setItem("indexnow-pinged", "1");
}

window.addEventListener("load", () => {
    pingIndexNowOnce([
        "https://toolify.kr/",
        "https://toolify.kr/tools/date-calculator/",
        "https://toolify.kr/tools/text-counter/",
        "https://toolify.kr/tools/password-generator/",
        "https://toolify.kr/tools/electricity-simulator/",
        "https://toolify.kr/tools/appliance-payback/",
        "https://toolify.kr/tools/video-storage/",
        "https://toolify.kr/tools/transfer-time/",
    ]);
});

// =======================
// FAQ 토글 (공통)
// =======================
(function faqToggleInit() {
    const questions = document.querySelectorAll(".faq-question");
    if (!questions || questions.length === 0) return;

    questions.forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = btn.closest(".faq-item") || btn.parentElement;
            if (!item) return;
            item.classList.toggle("active");
        });
    });
})();

// =======================
// 최근 사용 + 즐겨찾기 (브라우저 로컬 저장)
// =======================
(function personalToolsInit() {
    const FAVORITES_KEY = "toolify-favorites-v1";
    const RECENT_KEY = "toolify-recent-v1";

    function readList(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
        } catch (_) {
            return [];
        }
    }

    function writeList(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {}
    }

    function currentToolSlug() {
        const match = window.location.pathname.replace(/\\/g, "/").match(/\/tools\/([^/]+)\/(?:index\.html)?$/i);
        return match ? match[1] : "";
    }

    const currentSlug = currentToolSlug();
    if (currentSlug) {
        const recent = readList(RECENT_KEY).filter((slug) => slug !== currentSlug);
        writeList(RECENT_KEY, [currentSlug, ...recent].slice(0, 6));
    }

    const cards = Array.from(document.querySelectorAll(".tool-item[data-href]"));
    if (cards.length === 0) return;

    const registry = new Map();
    cards.forEach((card) => {
        const href = card.getAttribute("data-href") || "";
        const slugMatch = href.match(/^tools\/([^/]+)\/$/);
        const heading = card.querySelector("h3");
        if (slugMatch && heading) registry.set(slugMatch[1], { href, title: heading.textContent.trim() });
    });

    function validSlugs(key) {
        return readList(key).filter((slug, index, values) => registry.has(slug) && values.indexOf(slug) === index);
    }

    function renderLinks(target, empty, slugs) {
        if (!target || !empty) return;
        target.innerHTML = "";
        slugs.forEach((slug) => {
            const tool = registry.get(slug);
            const link = document.createElement("a");
            link.className = "personal-link";
            link.href = tool.href;
            link.textContent = tool.title;
            link.title = tool.title;
            target.appendChild(link);
        });
        empty.classList.toggle("hidden", slugs.length > 0);
    }

    function renderPersonalTools() {
        const favorites = validSlugs(FAVORITES_KEY);
        const recent = validSlugs(RECENT_KEY);
        writeList(FAVORITES_KEY, favorites);
        writeList(RECENT_KEY, recent);

        renderLinks(document.querySelector("#favorite-tools"), document.querySelector("#favorite-empty"), favorites);
        renderLinks(document.querySelector("#recent-tools"), document.querySelector("#recent-empty"), recent);

        const clearButton = document.querySelector("#clear-recent");
        if (clearButton) clearButton.classList.toggle("hidden", recent.length === 0);

        cards.forEach((card) => {
            const button = card.querySelector(".favorite-button");
            const href = card.getAttribute("data-href") || "";
            const match = href.match(/^tools\/([^/]+)\/$/);
            if (!button || !match) return;
            const active = favorites.includes(match[1]);
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
            button.setAttribute("aria-label", active ? "즐겨찾기에서 제거" : "즐겨찾기에 추가");
            button.title = active ? "즐겨찾기에서 제거" : "즐겨찾기에 추가";
            button.textContent = active ? "★" : "☆";
        });
    }

    cards.forEach((card) => {
        const head = card.querySelector(".tool-head");
        const href = card.getAttribute("data-href") || "";
        const match = href.match(/^tools\/([^/]+)\/$/);
        if (!head || !match) return;

        const button = document.createElement("button");
        button.className = "favorite-button";
        button.type = "button";
        const pill = head.querySelector(".pill");
        head.insertBefore(button, pill || null);
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const favorites = validSlugs(FAVORITES_KEY);
            const next = favorites.includes(match[1])
                ? favorites.filter((slug) => slug !== match[1])
                : [...favorites, match[1]];
            writeList(FAVORITES_KEY, next);
            renderPersonalTools();
        });
    });

    document.querySelector("#clear-recent")?.addEventListener("click", () => {
        writeList(RECENT_KEY, []);
        renderPersonalTools();
    });

    renderPersonalTools();
})();

// =======================
// (홈 전용) 카드 전체 클릭
// =======================
(function clickableCardsInit() {
    const cards = document.querySelectorAll(".tool-item.clickable[data-href]");
    if (!cards || cards.length === 0) return;

    cards.forEach((card) => {
        card.addEventListener("click", (e) => {
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
            if (tag === "a" || tag === "button" || tag === "input" || tag === "select" || tag === "textarea") return;

            const href = card.getAttribute("data-href");
            if (href) window.location.href = href;
        });
    });
})();

// =======================
// (홈 전용) 카테고리 + 검색 (통합 필터 + 전체=컴팩트 모드)
// =======================
(function filterAndSearchInit() {
    const cards = Array.from(document.querySelectorAll(".tool-item[data-category]"));
    const toolList = document.querySelector("#tool-list");
    if (cards.length === 0 || !toolList) return;

    const buttons = Array.from(document.querySelectorAll(".seg-btn[data-filter]"));
    const hint = document.querySelector("#filter-hint");

    const input = document.querySelector("#tool-search");
    const clearBtn = document.querySelector("#tool-search-clear");
    const searchHint = document.querySelector("#search-hint");

    let currentCategory = "all";

    const labelMap = {
        all: "전체",
        "date-time": "날짜/시간",
        dev: "개발자",
        image: "이미지",
        util: "유틸리티",
        game: "미니게임",
    };

    function normalize(s) {
        return String(s).toLowerCase().replace(/\s+/g, "");
    }

    function setCompactMode(hasQuery) {
        // 전체 목록은 간결하게 보여주되, 검색 중에는 일치한 설명을 확인할 수 있게 펼친다.
        const isCompact = currentCategory === "all" && !hasQuery;
        toolList.classList.toggle("is-compact", isCompact);
    }

    function apply() {
        const q = input ? normalize(input.value) : "";
        const hasQuery = q.length > 0;

        if (clearBtn) clearBtn.classList.toggle("hidden", !hasQuery);

        setCompactMode(hasQuery);

        let visible = 0;

        cards.forEach((card) => {
            const cat = card.getAttribute("data-category");
            const passCategory = currentCategory === "all" || cat === currentCategory;
            if (!passCategory) {
                card.style.display = "none";
                return;
            }

            const text = normalize(card.innerText || "");
            const passSearch = !hasQuery || text.includes(q);

            card.style.display = passSearch ? "" : "none";
            if (passSearch) visible++;
        });

        if (hint) hint.textContent = `현재: ${labelMap[currentCategory] || currentCategory}`;
        if (searchHint) searchHint.textContent = hasQuery ? `검색 결과: ${visible}개` : "";
    }

    function showAllTools() {
        currentCategory = "all";
        if (input) input.value = "";
        buttons.forEach((button) => {
            const isAll = button.dataset.filter === "all";
            button.classList.toggle("active", isAll);
            button.setAttribute("aria-selected", isAll ? "true" : "false");
        });
        apply();
    }

    // 카테고리 버튼
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            currentCategory = btn.dataset.filter || "all";
            buttons.forEach((b) => b.classList.toggle("active", b === btn));
            buttons.forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
            apply();
            document.querySelector("#tools")?.scrollIntoView({ behavior: "smooth" });
        });
    });

    // 검색
    if (input) {
        input.addEventListener("input", () => {
            apply();
            if (normalize(input.value).length > 0) {
                document.querySelector("#tools")?.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    if (clearBtn && input) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            apply();
            input.focus();
        });
    }

    const showAllTriggers = [
        document.querySelector("#show-all-tools"),
        ...document.querySelectorAll('a[href="#tools"]'),
    ].filter(Boolean);

    showAllTriggers.forEach((trigger) => {
        trigger.addEventListener("click", (event) => {
            event.preventDefault();
            showAllTools();
            window.requestAnimationFrame(() => {
                toolList.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    });

    apply();
})();
