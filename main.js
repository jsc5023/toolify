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
    };

    function normalize(s) {
        return String(s).toLowerCase().replace(/\s+/g, "");
    }

    function setCompactMode() {
        // ✅ 전체일 때만 컴팩트 모드
        const isCompact = currentCategory === "all";
        toolList.classList.toggle("is-compact", isCompact);
    }

    function apply() {
        const q = input ? normalize(input.value) : "";
        const hasQuery = q.length > 0;

        if (clearBtn) clearBtn.classList.toggle("hidden", !hasQuery);

        setCompactMode();

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

    apply();
})();
