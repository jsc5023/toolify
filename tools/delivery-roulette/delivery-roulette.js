(function deliveryRoulette() {
    "use strict";

    const STORAGE_DISABLED = "toolify-delivery-roulette-disabled-v1";
    const STORAGE_FILTERS = "toolify-delivery-roulette-filters-v1";
    const STORAGE_CUSTOM = "toolify-delivery-roulette-custom-v1";

    const CATEGORIES = {
        "chicken-pizza-burger": "치킨·피자·버거",
        snack: "분식·간식",
        korean: "한식",
        "meat-night": "고기·야식",
        chinese: "중식",
        japanese: "일식",
        "western-etc": "양식·기타",
        light: "가벼운 메뉴",
    };

    // 태그: 1인배달 / 2인이상 / 매운맛 / 든든함 / 가벼움 / 야식 / 술안주
    const FILTERS = {
        solo: { label: "1인 배달", tag: "1인배달", exclude: false },
        "no-spicy": { label: "매운맛 제외", tag: "매운맛", exclude: true },
        hearty: { label: "든든하게", tag: "든든함", exclude: false },
        light: { label: "가볍게", tag: "가벼움", exclude: false },
    };

    // 사진: Pexels, 상업적 이용 가능한 무료 라이선스
    const BASE_ITEMS = [
        // 치킨·피자·버거 10
        { id: "fried-chicken", name: "후라이드치킨", category: "chicken-pizza-burger", tags: ["2인이상", "야식", "술안주"], img: "./images/fried-chicken.jpg" },
        { id: "yangnyeom-chicken", name: "양념치킨", category: "chicken-pizza-burger", tags: ["2인이상", "야식", "술안주"], img: "./images/yangnyeom-chicken.jpg" },
        { id: "ganjang-chicken", name: "간장치킨", category: "chicken-pizza-burger", tags: ["2인이상", "야식"], img: "./images/ganjang-chicken.jpg" },
        { id: "dak-gangjeong", name: "닭강정", category: "chicken-pizza-burger", tags: ["1인배달", "야식"], img: "./images/dak-gangjeong.jpg" },
        { id: "pepperoni-pizza", name: "페퍼로니피자", category: "chicken-pizza-burger", tags: ["2인이상", "든든함"], img: "./images/pepperoni-pizza.jpg" },
        { id: "sweet-potato-pizza", name: "고구마피자", category: "chicken-pizza-burger", tags: ["2인이상", "든든함"], img: "./images/sweet-potato-pizza.jpg" },
        { id: "bulgogi-pizza", name: "불고기피자", category: "chicken-pizza-burger", tags: ["2인이상", "든든함"], img: "./images/bulgogi-pizza.jpg" },
        { id: "hamburger", name: "햄버거", category: "chicken-pizza-burger", tags: ["1인배달", "든든함"], img: "./images/hamburger.jpg" },
        { id: "gourmet-burger", name: "수제버거", category: "chicken-pizza-burger", tags: ["1인배달", "든든함"], img: "./images/gourmet-burger.jpg" },
        { id: "hotdog", name: "핫도그", category: "chicken-pizza-burger", tags: ["1인배달", "가벼움"], img: "./images/hotdog.jpg" },

        // 분식·간식 8
        { id: "tteokbokki", name: "떡볶이", category: "snack", tags: ["1인배달", "매운맛"], img: "./images/tteokbokki.jpg" },
        { id: "rose-tteokbokki", name: "로제떡볶이", category: "snack", tags: ["1인배달", "든든함"], img: "./images/rose-tteokbokki.jpg" },
        { id: "dak-kkochi", name: "닭꼬치", category: "snack", tags: ["1인배달", "야식", "술안주"], img: "./images/dak-kkochi.jpg" },
        { id: "twigim", name: "튀김", category: "snack", tags: ["1인배달", "야식"], img: "./images/twigim.jpg" },
        { id: "gimbap", name: "김밥", category: "snack", tags: ["1인배달", "가벼움"], img: "./images/gimbap.jpg" },
        { id: "rabokki", name: "라볶이", category: "snack", tags: ["1인배달", "매운맛"], img: "./images/rabokki.jpg" },
        { id: "tonkatsu", name: "돈까스", category: "snack", tags: ["1인배달", "든든함"], img: "./images/tonkatsu.jpg" },
        { id: "cheese-tonkatsu", name: "치즈돈까스", category: "snack", tags: ["1인배달", "든든함"], img: "./images/cheese-tonkatsu.jpg" },

        // 한식 12
        { id: "jeyuk-bokkeum", name: "제육볶음", category: "korean", tags: ["든든함", "2인이상", "매운맛"], img: "./images/jeyuk-bokkeum.jpg" },
        { id: "dwaeji-bulgogi", name: "돼지불백", category: "korean", tags: ["든든함", "2인이상"], img: "./images/dwaeji-bulgogi.jpg" },
        { id: "kimchi-jjigae", name: "김치찌개", category: "korean", tags: ["든든함", "1인배달"], img: "./images/kimchi-jjigae.jpg" },
        { id: "doenjang-jjigae", name: "된장찌개", category: "korean", tags: ["든든함", "1인배달"], img: "./images/doenjang-jjigae.jpg" },
        { id: "budae-jjigae", name: "부대찌개", category: "korean", tags: ["든든함", "2인이상", "야식"], img: "./images/budae-jjigae.jpg" },
        { id: "sundubu-jjigae", name: "순두부찌개", category: "korean", tags: ["든든함", "1인배달"], img: "./images/sundubu-jjigae.jpg" },
        { id: "yukgaejang", name: "육개장", category: "korean", tags: ["든든함", "매운맛"], img: "./images/yukgaejang.jpg" },
        { id: "galbitang", name: "갈비탕", category: "korean", tags: ["든든함", "2인이상"], img: "./images/galbitang.jpg" },
        { id: "seolleongtang", name: "설렁탕", category: "korean", tags: ["든든함", "1인배달"], img: "./images/seolleongtang.jpg" },
        { id: "gukbap", name: "국밥", category: "korean", tags: ["든든함", "1인배달", "야식"], img: "./images/gukbap.jpg" },
        { id: "bibimbap", name: "비빔밥", category: "korean", tags: ["1인배달", "가벼움"], img: "./images/bibimbap.jpg" },
        { id: "jjimdak", name: "찜닭", category: "korean", tags: ["든든함", "2인이상", "야식"], img: "./images/jjimdak.jpg" },

        // 고기·야식 8
        { id: "jokbal", name: "족발", category: "meat-night", tags: ["2인이상", "야식", "술안주"], img: "./images/jokbal.jpg" },
        { id: "bossam", name: "보쌈", category: "meat-night", tags: ["2인이상", "야식", "술안주"], img: "./images/bossam.jpg" },
        { id: "samgyeopsal", name: "삼겹살", category: "meat-night", tags: ["2인이상", "야식", "술안주"], img: "./images/samgyeopsal.jpg" },
        { id: "makchang", name: "막창", category: "meat-night", tags: ["2인이상", "야식", "술안주"], img: "./images/makchang.jpg" },
        { id: "gopchang", name: "곱창", category: "meat-night", tags: ["2인이상", "야식", "술안주"], img: "./images/gopchang.jpg" },
        { id: "dakbal", name: "닭발", category: "meat-night", tags: ["매운맛", "야식", "술안주"], img: "./images/dakbal.jpg" },
        { id: "odolppyeo", name: "오돌뼈", category: "meat-night", tags: ["매운맛", "야식", "술안주"], img: "./images/odolppyeo.jpg" },
        { id: "dakbokkeumtang", name: "닭볶음탕", category: "meat-night", tags: ["든든함", "매운맛", "2인이상"], img: "./images/dakbokkeumtang.jpg" },

        // 중식 7
        { id: "jjajangmyeon", name: "짜장면", category: "chinese", tags: ["1인배달", "든든함"], img: "./images/jjajangmyeon.jpg" },
        { id: "jjamppong", name: "짬뽕", category: "chinese", tags: ["1인배달", "매운맛"], img: "./images/jjamppong.jpg" },
        { id: "fried-rice", name: "볶음밥", category: "chinese", tags: ["1인배달", "가벼움"], img: "./images/fried-rice.jpg" },
        { id: "tangsuyuk", name: "탕수육", category: "chinese", tags: ["2인이상", "든든함"], img: "./images/tangsuyuk.jpg" },
        { id: "malatang", name: "마라탕", category: "chinese", tags: ["1인배달", "매운맛"], img: "./images/malatang.jpg" },
        { id: "malaxiangguo", name: "마라샹궈", category: "chinese", tags: ["2인이상", "매운맛"], img: "./images/malaxiangguo.jpg" },
        { id: "yangkkochi", name: "양꼬치", category: "chinese", tags: ["2인이상", "야식", "술안주"], img: "./images/yangkkochi.jpg" },

        // 일식 7
        { id: "sushi", name: "초밥", category: "japanese", tags: ["1인배달", "가벼움"], img: "./images/sushi.jpg" },
        { id: "hoedeopbap", name: "회덮밥", category: "japanese", tags: ["1인배달", "가벼움"], img: "./images/hoedeopbap.jpg" },
        { id: "donburi", name: "돈부리", category: "japanese", tags: ["1인배달", "든든함"], img: "./images/donburi.jpg" },
        { id: "gyudon", name: "규동", category: "japanese", tags: ["1인배달", "든든함"], img: "./images/gyudon.jpg" },
        { id: "katsudon", name: "가츠동", category: "japanese", tags: ["1인배달", "든든함"], img: "./images/katsudon.jpg" },
        { id: "udon", name: "우동", category: "japanese", tags: ["1인배달", "가벼움"], img: "./images/udon.jpg" },
        { id: "soba", name: "메밀소바", category: "japanese", tags: ["1인배달", "가벼움"], img: "./images/soba.jpg" },

        // 양식·기타 5
        { id: "pasta", name: "파스타", category: "western-etc", tags: ["1인배달", "든든함"], img: "./images/pasta.jpg" },
        { id: "risotto", name: "리조또", category: "western-etc", tags: ["1인배달", "든든함"], img: "./images/risotto.jpg" },
        { id: "steak-rice-bowl", name: "스테이크덮밥", category: "western-etc", tags: ["1인배달", "든든함"], img: "./images/steak-rice-bowl.jpg" },
        { id: "sandwich", name: "샌드위치", category: "western-etc", tags: ["1인배달", "가벼움"], img: "./images/sandwich.jpg" },
        { id: "poke", name: "포케", category: "western-etc", tags: ["1인배달", "가벼움"], img: "./images/poke.jpg" },

        // 가벼운 메뉴 3
        { id: "salad", name: "샐러드", category: "light", tags: ["1인배달", "가벼움"], img: "./images/salad.jpg" },
        { id: "chicken-breast-lunchbox", name: "닭가슴살 도시락", category: "light", tags: ["1인배달", "가벼움"], img: "./images/chicken-breast-lunchbox.jpg" },
        { id: "juk-porridge", name: "죽", category: "light", tags: ["1인배달", "가벼움"], img: "./images/juk-porridge.jpg" },
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

    let disabledIds = new Set(readJSON(STORAGE_DISABLED, []));
    let activeFilters = new Set(readJSON(STORAGE_FILTERS, []).filter((k) => FILTERS[k]));
    // 직접 추가한 메뉴. 태그가 없으므로 필터를 거치지 않고 항상 후보에 포함된다.
    let customItems = readJSON(STORAGE_CUSTOM, []).filter((it) => it && typeof it.name === "string");

    function allItems() {
        return [...BASE_ITEMS, ...customItems];
    }

    function saveDisabled() { writeJSON(STORAGE_DISABLED, Array.from(disabledIds)); }
    function saveFilters() { writeJSON(STORAGE_FILTERS, Array.from(activeFilters)); }
    function saveCustom() { writeJSON(STORAGE_CUSTOM, customItems); }

    // 직접 추가한 메뉴 이름이 innerHTML 템플릿에 들어가므로 마크업으로 해석되지 않게 막는다.
    function escapeHTML(text) {
        return String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }

    function passesFilters(item) {
        if (item.custom) return true;
        for (const key of activeFilters) {
            const filter = FILTERS[key];
            const has = item.tags.includes(filter.tag);
            if (filter.exclude ? has : !has) return false;
        }
        return true;
    }
    function isSpinnable(item) {
        return !disabledIds.has(item.id) && passesFilters(item);
    }

    const $ = (selector) => document.querySelector(selector);
    const grid = $("#menu-grid");
    const spinButton = $("#spin-button");
    const errorMessage = $("#error-message");
    const resultBox = $("#result-box");

    let spinning = false;

    function tagPillsHtml(tags) {
        return tags.slice(0, 3).map((t) => `<span class="tag-pill">${t}</span>`).join("");
    }

    function cardTemplate(item) {
        const disabled = disabledIds.has(item.id);
        const filteredOut = !passesFilters(item);
        const classes = ["menu-card"];
        if (disabled) classes.push("disabled");
        if (filteredOut) classes.push("filtered-out");
        const safeName = escapeHTML(item.name);
        const imgHtml = item.img
            ? `<img src="${item.img}" alt="${safeName}" loading="lazy" />`
            : `<span class="emoji-thumb">🍽️</span>`;
        const removeBtn = item.custom ? `<button class="card-remove" type="button" data-remove="${item.id}" aria-label="삭제">×</button>` : "";
        return `
            <div class="${classes.join(" ")}" data-id="${item.id}">
                ${removeBtn}
                <label class="card-toggle">
                    <input type="checkbox" data-toggle="${item.id}" ${disabled ? "" : "checked"} />
                    <span class="card-thumb">${imgHtml}</span>
                    <span class="card-name">${safeName}</span>
                    <span class="card-tags">${tagPillsHtml(item.tags)}</span>
                </label>
            </div>`;
    }

    const collapsedCats = new Set(Object.keys(CATEGORIES).concat(["custom"]));

    function groupTemplate(categoryKey, label, items) {
        const spinnableInGroup = items.filter(isSpinnable).length;
        const collapsed = collapsedCats.has(categoryKey);
        return `
            <section class="menu-group${collapsed ? " collapsed" : ""}" data-group="${categoryKey}">
                <div class="menu-group-head">
                    <button type="button" class="group-toggle" data-cat-toggle="${categoryKey}">
                        <span class="chevron">▶</span> ${label} <span class="group-count">${spinnableInGroup}/${items.length}</span>
                    </button>
                    <div class="group-actions">
                        <button type="button" class="group-btn" data-cat-select="${categoryKey}">전체 선택</button>
                        <button type="button" class="group-btn" data-cat-deselect="${categoryKey}">전체 해제</button>
                    </div>
                </div>
                <div class="menu-grid">${items.map(cardTemplate).join("")}</div>
            </section>`;
    }

    function renderFilters() {
        document.querySelectorAll("[data-filter]").forEach((btn) => {
            btn.classList.toggle("active", activeFilters.has(btn.dataset.filter));
        });
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

        const spinnableCount = allItems().filter(isSpinnable).length;
        $("#enabled-count").textContent = String(spinnableCount);
        $("#total-count").textContent = String(allItems().length);
        renderFilters();
    }

    document.querySelectorAll("[data-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.filter;
            if (activeFilters.has(key)) activeFilters.delete(key);
            else activeFilters.add(key);
            saveFilters();
            render();
        });
    });

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
            const card = grid.querySelector(`.menu-card[data-id="${CSS.escape(toggleId)}"]`);
            if (card) {
                card.classList.toggle("disabled", disabledIds.has(toggleId));
                const group = card.closest(".menu-group");
                if (group) {
                    const items = allItems().filter((it) => (it.category || "custom") === group.dataset.group);
                    const spinnableInGroup = items.filter(isSpinnable).length;
                    const countEl = group.querySelector(".group-count");
                    if (countEl) countEl.textContent = `${spinnableInGroup}/${items.length}`;
                }
            }
            $("#enabled-count").textContent = String(allItems().filter(isSpinnable).length);
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
        customItems.push({ id, name, custom: true, tags: ["직접추가"] });
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
        const items = allItems().filter(isSpinnable);
        if (items.length < 2) {
            errorMessage.textContent = "조건에 맞는 메뉴가 2개 이상 필요해요. 필터나 선택을 조정해 주세요.";
            return;
        }
        errorMessage.textContent = "";
        resultBox.classList.add("hidden");
        setSpinning(true);

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
                ? `<img src="${item.img}" alt="${escapeHTML(item.name)}" />`
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
                ? `<img src="${winner.img}" alt="${escapeHTML(winner.name)}" />`
                : `<span class="result-emoji">🍽️</span>`;
            $("#result-thumb").innerHTML = imgHtml;
            $("#result-name").textContent = winner.name;
            $("#result-tags").innerHTML = tagPillsHtml(winner.tags);
            resultBox.classList.remove("hidden");
            resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    spinButton.addEventListener("click", spin);
    $("#spin-again").addEventListener("click", spin);

    render();
})();
