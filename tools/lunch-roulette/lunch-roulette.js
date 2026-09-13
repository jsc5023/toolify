(function lunchRoulette() {
    "use strict";

    const STORAGE_CUSTOM = "toolify-lunch-roulette-custom-v1";
    const STORAGE_DISABLED = "toolify-lunch-roulette-disabled-v1";

    // 카테고리 (한식 22 / 중식 8 / 일식 10 / 양식 10 / 분식·패스트푸드 10 = 60개)
    const CATEGORIES = {
        korean: "한식",
        chinese: "중식",
        japanese: "일식",
        western: "양식",
        snack: "분식·패스트푸드",
    };

    // 기본 메뉴 (사진: Pexels, 상업적 이용 가능한 무료 라이선스)
    const BASE_ITEMS = [
        // 한식 22
        { id: "kimchi-jjigae", name: "김치찌개", category: "korean", img: "./images/kimchi-jjigae.jpg" },
        { id: "jeyuk-bokkeum", name: "제육볶음", category: "korean", img: "./images/jeyuk-bokkeum.jpg" },
        { id: "naengmyeon", name: "냉면", category: "korean", img: "./images/naengmyeon.jpg" },
        { id: "bibimbap", name: "비빔밥", category: "korean", img: "./images/bibimbap.jpg" },
        { id: "gukbap", name: "국밥", category: "korean", img: "./images/gukbap.jpg" },
        { id: "kalguksu", name: "칼국수", category: "korean", img: "./images/kalguksu.jpg" },
        { id: "gimbap", name: "김밥", category: "korean", img: "./images/gimbap.jpg" },
        { id: "sundubu-jjigae", name: "순두부찌개", category: "korean", img: "./images/sundubu-jjigae.jpg" },
        { id: "samgyeopsal", name: "삼겹살", category: "korean", img: "./images/samgyeopsal.jpg" },
        { id: "galbitang", name: "갈비탕", category: "korean", img: "./images/galbitang.jpg" },
        { id: "samgyetang", name: "삼계탕", category: "korean", img: "./images/samgyetang.jpg" },
        { id: "japchae", name: "잡채", category: "korean", img: "./images/japchae.jpg" },
        { id: "bulgogi", name: "불고기", category: "korean", img: "./images/bulgogi.jpg" },
        { id: "gamjatang", name: "감자탕", category: "korean", img: "./images/gamjatang.jpg" },
        { id: "budae-jjigae", name: "부대찌개", category: "korean", img: "./images/budae-jjigae.jpg" },
        { id: "yukgaejang", name: "육개장", category: "korean", img: "./images/yukgaejang.jpg" },
        { id: "dakgalbi", name: "닭갈비", category: "korean", img: "./images/dakgalbi.jpg" },
        { id: "bossam", name: "보쌈", category: "korean", img: "./images/bossam.jpg" },
        { id: "jokbal", name: "족발", category: "korean", img: "./images/jokbal.jpg" },
        { id: "galbijjim", name: "갈비찜", category: "korean", img: "./images/galbijjim.jpg" },
        { id: "yukhoe", name: "육회", category: "korean", img: "./images/yukhoe.jpg" },
        { id: "gopchang", name: "곱창", category: "korean", img: "./images/gopchang.jpg" },

        // 중식 8
        { id: "jjajangmyeon", name: "짜장면", category: "chinese", img: "./images/jjajangmyeon.jpg" },
        { id: "jjamppong", name: "짬뽕", category: "chinese", img: "./images/jjamppong.jpg" },
        { id: "tangsuyuk", name: "탕수육", category: "chinese", img: "./images/tangsuyuk.jpg" },
        { id: "mapo-tofu", name: "마파두부", category: "chinese", img: "./images/mapo-tofu.jpg" },
        { id: "kkanpunggi", name: "깐풍기", category: "chinese", img: "./images/kkanpunggi.jpg" },
        { id: "gunmandu", name: "군만두", category: "chinese", img: "./images/gunmandu.jpg" },
        { id: "chinese-fried-rice", name: "중식 볶음밥", category: "chinese", img: "./images/chinese-fried-rice.jpg" },
        { id: "yurinki", name: "유린기", category: "chinese", img: "./images/yurinki.jpg" },

        // 일식 10
        { id: "tonkatsu", name: "돈까스", category: "japanese", img: "./images/tonkatsu.jpg" },
        { id: "sushi", name: "초밥", category: "japanese", img: "./images/sushi.jpg" },
        { id: "ramen", name: "라멘", category: "japanese", img: "./images/ramen.jpg" },
        { id: "udon", name: "우동", category: "japanese", img: "./images/udon.jpg" },
        { id: "soba", name: "소바", category: "japanese", img: "./images/soba.jpg" },
        { id: "gyudon", name: "규동", category: "japanese", img: "./images/gyudon.jpg" },
        { id: "takoyaki", name: "타코야끼", category: "japanese", img: "./images/takoyaki.jpg" },
        { id: "tendon", name: "텐동", category: "japanese", img: "./images/tendon.jpg" },
        { id: "karaage", name: "가라아게", category: "japanese", img: "./images/karaage.jpg" },
        { id: "yakitori", name: "야키토리", category: "japanese", img: "./images/yakitori.jpg" },

        // 양식 10
        { id: "pasta", name: "파스타", category: "western", img: "./images/pasta.jpg" },
        { id: "steak", name: "스테이크", category: "western", img: "./images/steak.jpg" },
        { id: "pizza", name: "피자", category: "western", img: "./images/pizza.jpg" },
        { id: "risotto", name: "리조또", category: "western", img: "./images/risotto.jpg" },
        { id: "omurice", name: "오므라이스", category: "western", img: "./images/omurice.jpg" },
        { id: "gratin", name: "그라탕", category: "western", img: "./images/gratin.jpg" },
        { id: "curry-rice", name: "카레라이스", category: "western", img: "./images/curry-rice.jpg" },
        { id: "salad", name: "샐러드", category: "western", img: "./images/salad.jpg" },
        { id: "pancake", name: "팬케이크", category: "western", img: "./images/pancake.jpg" },
        { id: "gambas", name: "감바스", category: "western", img: "./images/gambas.jpg" },

        // 분식·패스트푸드 10
        { id: "hamburger", name: "햄버거", category: "snack", img: "./images/hamburger.jpg" },
        { id: "tteokbokki", name: "떡볶이", category: "snack", img: "./images/tteokbokki.jpg" },
        { id: "kimchi-fried-rice", name: "김치볶음밥", category: "snack", img: "./images/kimchi-fried-rice.jpg" },
        { id: "korean-fried-chicken", name: "치킨", category: "snack", img: "./images/korean-fried-chicken.jpg" },
        { id: "corn-dog", name: "핫도그", category: "snack", img: "./images/corn-dog.jpg" },
        { id: "twigim", name: "튀김", category: "snack", img: "./images/twigim.jpg" },
        { id: "sandwich", name: "샌드위치", category: "snack", img: "./images/sandwich.jpg" },
        { id: "korean-toast", name: "토스트", category: "snack", img: "./images/korean-toast.jpg" },
        { id: "ramyeon", name: "라면", category: "snack", img: "./images/ramyeon.jpg" },
        { id: "jumeokbap", name: "주먹밥", category: "snack", img: "./images/jumeokbap.jpg" },
    ];

    function readJSON(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value === null ? fallback : value;
        } catch (_) {
            return fallback;
        }
    }
    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    }

    let customItems = readJSON(STORAGE_CUSTOM, []).filter((it) => it && typeof it.name === "string");
    let disabledIds = new Set(readJSON(STORAGE_DISABLED, []));

    function allItems() {
        return [...BASE_ITEMS, ...customItems];
    }

    function saveCustom() { writeJSON(STORAGE_CUSTOM, customItems); }
    function saveDisabled() { writeJSON(STORAGE_DISABLED, Array.from(disabledIds)); }

    const $ = (selector) => document.querySelector(selector);
    const grid = $("#menu-grid");
    const spinButton = $("#spin-button");
    const errorMessage = $("#error-message");
    const resultBox = $("#result-box");

    let spinning = false;

    function cardTemplate(item) {
        const disabled = disabledIds.has(item.id);
        const imgHtml = item.img
            ? `<img src="${item.img}" alt="${item.name}" loading="lazy" />`
            : `<span class="emoji-thumb">🍽️</span>`;
        const removeBtn = item.custom ? `<button class="card-remove" type="button" data-remove="${item.id}" aria-label="삭제">×</button>` : "";
        return `
            <div class="menu-card${disabled ? " disabled" : ""}" data-id="${item.id}">
                ${removeBtn}
                <label class="card-toggle">
                    <input type="checkbox" data-toggle="${item.id}" ${disabled ? "" : "checked"} />
                    <span class="card-thumb">${imgHtml}</span>
                    <span class="card-name">${item.name}</span>
                </label>
            </div>`;
    }

    // 카테고리는 기본적으로 접혀 있어 60개 카드가 한 번에 쏟아지지 않게 한다. 펼침 상태만 세션 동안 기억.
    const collapsedCats = new Set(Object.keys(CATEGORIES).concat(["custom"]));

    function groupTemplate(categoryKey, label, items) {
        const enabledInGroup = items.filter((it) => !disabledIds.has(it.id)).length;
        const collapsed = collapsedCats.has(categoryKey);
        return `
            <section class="menu-group${collapsed ? " collapsed" : ""}" data-group="${categoryKey}">
                <div class="menu-group-head">
                    <button type="button" class="group-toggle" data-cat-toggle="${categoryKey}">
                        <span class="chevron">▶</span> ${label} <span class="group-count">${enabledInGroup}/${items.length}</span>
                    </button>
                    <div class="group-actions">
                        <button type="button" class="group-btn" data-cat-select="${categoryKey}">전체 선택</button>
                        <button type="button" class="group-btn" data-cat-deselect="${categoryKey}">전체 해제</button>
                    </div>
                </div>
                <div class="menu-grid">${items.map(cardTemplate).join("")}</div>
            </section>`;
    }

    function render() {
        const parts = Object.entries(CATEGORIES).map(([key, label]) => {
            const items = BASE_ITEMS.filter((it) => it.category === key);
            return groupTemplate(key, label, items);
        });
        if (customItems.length > 0) {
            parts.push(groupTemplate("custom", "직접 추가", customItems));
        }
        grid.innerHTML = parts.join("");

        const enabledCount = allItems().filter((it) => !disabledIds.has(it.id)).length;
        $("#enabled-count").textContent = String(enabledCount);
        $("#total-count").textContent = String(allItems().length);
    }

    grid.addEventListener("click", (event) => {
        const toggleCat = event.target.closest("[data-cat-toggle]")?.dataset.catToggle;
        if (toggleCat) {
            if (collapsedCats.has(toggleCat)) collapsedCats.delete(toggleCat);
            else collapsedCats.add(toggleCat);
            const group = grid.querySelector(`.menu-group[data-group="${CSS.escape(toggleCat)}"]`);
            if (group) group.classList.toggle("collapsed", collapsedCats.has(toggleCat));
            return;
        }
        const removeId = event.target.closest("[data-remove]")?.dataset.remove;
        if (removeId) {
            customItems = customItems.filter((it) => it.id !== removeId);
            disabledIds.delete(removeId);
            saveCustom();
            saveDisabled();
            render();
            return;
        }
        const selectCat = event.target.closest("[data-cat-select]")?.dataset.catSelect;
        if (selectCat) {
            allItems().filter((it) => (it.category || "custom") === selectCat).forEach((it) => disabledIds.delete(it.id));
            saveDisabled();
            render();
            return;
        }
        const deselectCat = event.target.closest("[data-cat-deselect]")?.dataset.catDeselect;
        if (deselectCat) {
            allItems().filter((it) => (it.category || "custom") === deselectCat).forEach((it) => disabledIds.add(it.id));
            saveDisabled();
            render();
            return;
        }
        const toggleId = event.target.closest("[data-toggle]")?.dataset.toggle;
        if (toggleId) {
            if (disabledIds.has(toggleId)) disabledIds.delete(toggleId);
            else disabledIds.add(toggleId);
            saveDisabled();
            // 체크박스 자체는 기본 동작으로 이미 토글되므로 카드 배경만 갱신하고, 전체 리렌더는 피한다
            const card = grid.querySelector(`.menu-card[data-id="${CSS.escape(toggleId)}"]`);
            if (card) {
                card.classList.toggle("disabled", disabledIds.has(toggleId));
                const group = card.closest(".menu-group");
                if (group) {
                    const cards = group.querySelectorAll(".menu-card");
                    const enabled = Array.from(cards).filter((c) => !c.classList.contains("disabled")).length;
                    const countEl = group.querySelector(".group-count");
                    if (countEl) countEl.textContent = `${enabled}/${cards.length}`;
                }
            }
            $("#enabled-count").textContent = String(allItems().filter((it) => !disabledIds.has(it.id)).length);
        }
    });

    $("#select-all").addEventListener("click", () => {
        disabledIds = new Set();
        saveDisabled();
        render();
    });
    $("#select-none").addEventListener("click", () => {
        disabledIds = new Set(allItems().map((it) => it.id));
        saveDisabled();
        render();
    });

    $("#add-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const input = $("#add-input");
        const name = input.value.trim();
        if (!name) return;
        const id = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        customItems.push({ id, name, custom: true });
        saveCustom();
        collapsedCats.delete("custom");
        input.value = "";
        render();
    });

    function setSpinning(isSpinning) {
        spinning = isSpinning;
        spinButton.disabled = isSpinning;
        spinButton.innerHTML = isSpinning
            ? '<span class="spin-icon">🔄</span> 돌리는 중...'
            : "🎲 돌리기";

        const spinAgainButton = $("#spin-again");
        if (spinAgainButton) {
            spinAgainButton.disabled = isSpinning;
            spinAgainButton.innerHTML = isSpinning
                ? '<span class="spin-icon">🔄</span> 돌리는 중...'
                : "다시 돌리기";
        }
    }

    function spin() {
        if (spinning) return;
        const items = allItems().filter((it) => !disabledIds.has(it.id));
        if (items.length < 2) {
            errorMessage.textContent = "메뉴를 2개 이상 선택해 주세요.";
            return;
        }
        errorMessage.textContent = "";
        resultBox.classList.add("hidden");
        setSpinning(true);

        // 카테고리가 접혀 있으면 카드가 안 보이므로, 항상 보이는 미리보기에도 같이 표시한다
        const previewBox = $("#spin-preview");
        const previewThumb = $("#spin-preview-thumb");
        const previewName = $("#spin-preview-name");
        previewBox.classList.remove("hidden");
        previewBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

        const winnerIndex = Math.floor(Math.random() * items.length);
        const totalSteps = 22 + Math.floor(Math.random() * 6);
        const startIndex = ((winnerIndex - (totalSteps - 1)) % items.length + items.length) % items.length;

        const cards = items.map((it) => grid.querySelector(`.menu-card[data-id="${CSS.escape(it.id)}"]`));

        function delayFor(step) {
            const t = step / (totalSteps - 1);
            const eased = Math.pow(t, 2.4);
            return 70 + eased * 340;
        }

        let current = -1;
        function highlight(idx) {
            if (current >= 0 && cards[current]) cards[current].classList.remove("spin-active");
            current = idx;
            if (cards[current]) cards[current].classList.add("spin-active");

            const item = items[idx];
            previewThumb.innerHTML = item.img
                ? `<img src="${item.img}" alt="${item.name}" />`
                : `<span class="emoji-thumb">🍽️</span>`;
            previewName.textContent = item.name;
        }

        let step = 0;
        function tick() {
            const idx = (startIndex + step) % items.length;
            highlight(idx);
            step++;
            if (step < totalSteps) {
                window.setTimeout(tick, delayFor(step));
            } else {
                window.setTimeout(() => finish(items[winnerIndex], cards[idx]), 450);
            }
        }
        tick();

        function finish(winner, winnerCard) {
            setSpinning(false);
            if (winnerCard) winnerCard.classList.add("spin-winner");
            window.setTimeout(() => winnerCard && winnerCard.classList.remove("spin-winner"), 1600);
            previewBox.classList.add("hidden");

            const imgHtml = winner.img
                ? `<img src="${winner.img}" alt="${winner.name}" />`
                : `<span class="result-emoji">🍽️</span>`;
            $("#result-thumb").innerHTML = imgHtml;
            $("#result-name").textContent = winner.name;
            resultBox.classList.remove("hidden");
            resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    spinButton.addEventListener("click", spin);
    $("#spin-again").addEventListener("click", spin);

    render();
})();
