(function nightSnackRoulette() {
    "use strict";

    const STORAGE_DISABLED = "toolify-night-snack-roulette-disabled-v1";
    const STORAGE_FILTERS = "toolify-night-snack-roulette-filters-v1";
    const STORAGE_CUSTOM = "toolify-night-snack-roulette-custom-v1";

    const CATEGORIES = {
        "chicken-pizza": "치킨·피자",
        bunsik: "분식",
        "noodle-rice": "면·밥",
        meat: "고기",
        spicy: "매운 음식",
        "snack-fast": "간단·패스트푸드",
        dessert: "디저트",
    };

    // 태그: 혼자 / 매운맛 / 든든함 / 가벼움 / 새벽에도찾기쉬움 (그 외 배달·2인이상·달콤함 등은 결과 카드 참고용)
    const FILTERS = {
        solo: { label: "혼자 먹기", tag: "혼자", exclude: false },
        "no-spicy": { label: "매운맛 제외", tag: "매운맛", exclude: true },
        hearty: { label: "든든하게", tag: "든든함", exclude: false },
        light: { label: "가볍게", tag: "가벼움", exclude: false },
        late: { label: "새벽에도 OK", tag: "새벽에도찾기쉬움", exclude: false },
    };

    const BASE_ITEMS = [
        // 치킨·피자 7
        { id: "fried-chicken", name: "후라이드치킨", category: "chicken-pizza", tags: ["배달", "든든함", "2인이상", "새벽에도찾기쉬움"], emoji: "🍗", img: "./images/fried-chicken.jpg" },
        { id: "yangnyeom-chicken", name: "양념치킨", category: "chicken-pizza", tags: ["배달", "매운맛", "2인이상", "새벽에도찾기쉬움"], emoji: "🍗", img: "./images/yangnyeom-chicken.jpg" },
        { id: "soy-chicken", name: "간장치킨", category: "chicken-pizza", tags: ["배달", "든든함", "2인이상"], emoji: "🍗", img: "./images/soy-chicken.jpg" },
        { id: "dakgangjeong", name: "닭강정", category: "chicken-pizza", tags: ["배달", "달콤함", "혼자"], emoji: "🍗", img: "./images/dakgangjeong.jpg" },
        { id: "pepperoni-pizza", name: "페퍼로니피자", category: "chicken-pizza", tags: ["배달", "든든함", "2인이상"], emoji: "🍕", img: "./images/pepperoni-pizza.jpg" },
        { id: "sweet-potato-pizza", name: "고구마피자", category: "chicken-pizza", tags: ["배달", "달콤함", "2인이상"], emoji: "🍕", img: "./images/sweet-potato-pizza.jpg" },
        { id: "bulgogi-pizza", name: "불고기피자", category: "chicken-pizza", tags: ["배달", "든든함", "2인이상"], emoji: "🍕", img: "./images/bulgogi-pizza.jpg" },

        // 분식 9
        { id: "tteokbokki", name: "떡볶이", category: "bunsik", tags: ["배달", "매운맛", "혼자", "새벽에도찾기쉬움"], emoji: "🍢", img: "./images/tteokbokki.jpg" },
        { id: "rose-tteokbokki", name: "로제떡볶이", category: "bunsik", tags: ["배달", "매운맛", "크리미"], emoji: "🍢", img: "./images/rose-tteokbokki.jpg" },
        { id: "sundae", name: "순대", category: "bunsik", tags: ["배달", "간단", "혼자"], emoji: "🌭", img: "./images/sundae.jpg" },
        { id: "fried-snacks", name: "튀김", category: "bunsik", tags: ["배달", "바삭함", "간단"], emoji: "🍤", img: "./images/fried-snacks.jpg" },
        { id: "rabokki", name: "라볶이", category: "bunsik", tags: ["매운맛", "든든함", "혼자"], emoji: "🍜", img: "./images/rabokki.jpg" },
        { id: "gimbap", name: "김밥", category: "bunsik", tags: ["가벼움", "혼자", "간단"], emoji: "🍙", img: "./images/gimbap.jpg" },
        { id: "cheese-ramen", name: "치즈라면", category: "bunsik", tags: ["혼자", "간단", "새벽에도찾기쉬움"], emoji: "🍜", img: "./images/cheese-ramen.jpg" },
        { id: "fried-dumplings", name: "군만두", category: "bunsik", tags: ["배달", "바삭함", "간단", "혼자"], emoji: "🥟", img: "./images/fried-dumplings.jpg" },
        { id: "boiled-dumplings", name: "물만두", category: "bunsik", tags: ["간단", "혼자", "가벼움"], emoji: "🥟", img: "./images/boiled-dumplings.jpg" },

        // 면·밥 11
        { id: "ramen", name: "라면", category: "noodle-rice", tags: ["혼자", "간단", "새벽에도찾기쉬움"], emoji: "🍜", img: "./images/ramen.jpg" },
        { id: "jjajang-ramen", name: "짜장라면", category: "noodle-rice", tags: ["혼자", "간단"], emoji: "🍜", img: "./images/jjajang-ramen.jpg" },
        { id: "bibim-noodles", name: "비빔면", category: "noodle-rice", tags: ["혼자", "매운맛", "간단"], emoji: "🍝", img: "./images/bibim-noodles.jpg" },
        { id: "jjajangmyeon", name: "짜장면", category: "noodle-rice", tags: ["배달", "든든함", "혼자"], emoji: "🍜", img: "./images/jjajangmyeon.jpg" },
        { id: "jjamppong", name: "짬뽕", category: "noodle-rice", tags: ["배달", "매운맛", "국물", "든든함"], emoji: "🍜", img: "./images/jjamppong.jpg" },
        { id: "fried-rice", name: "볶음밥", category: "noodle-rice", tags: ["배달", "든든함", "혼자"], emoji: "🍚", img: "./images/fried-rice.jpg" },
        { id: "kimchi-fried-rice", name: "김치볶음밥", category: "noodle-rice", tags: ["혼자", "매운맛", "간단"], emoji: "🍚", img: "./images/kimchi-fried-rice.jpg" },
        { id: "udon", name: "우동", category: "noodle-rice", tags: ["국물", "따뜻함", "혼자"], emoji: "🍜", img: "./images/udon.jpg" },
        { id: "yaki-udon", name: "야끼우동", category: "noodle-rice", tags: ["배달", "매운맛", "든든함"], emoji: "🍜", img: "./images/yaki-udon.jpg" },
        { id: "chicken-mayo-rice", name: "치킨마요덮밥", category: "noodle-rice", tags: ["혼자", "든든함", "간단"], emoji: "🍱", img: "./images/chicken-mayo-rice.jpg" },
        { id: "spam-mayo-rice", name: "스팸마요덮밥", category: "noodle-rice", tags: ["혼자", "든든함", "간단"], emoji: "🍱", img: "./images/spam-mayo-rice.jpg" },

        // 고기 10
        { id: "jokbal", name: "족발", category: "meat", tags: ["배달", "든든함", "2인이상", "야식대표"], emoji: "🍖", img: "./images/jokbal.jpg" },
        { id: "bossam", name: "보쌈", category: "meat", tags: ["배달", "든든함", "2인이상"], emoji: "🍖", img: "./images/bossam.jpg" },
        { id: "samgyeopsal", name: "삼겹살", category: "meat", tags: ["든든함", "2인이상"], emoji: "🥩", img: "./images/samgyeopsal.jpg" },
        { id: "gopchang", name: "곱창", category: "meat", tags: ["배달", "든든함", "2인이상", "야식대표"], emoji: "🍖", img: "./images/gopchang.jpg" },
        { id: "makchang", name: "막창", category: "meat", tags: ["배달", "든든함", "2인이상"], emoji: "🍖", img: "./images/makchang.jpg" },
        { id: "dakbal", name: "닭발", category: "meat", tags: ["배달", "매운맛", "2인이상", "야식대표"], emoji: "🌶️", img: "./images/dakbal.jpg" },
        { id: "odoldol", name: "오돌뼈", category: "meat", tags: ["배달", "매운맛", "야식대표"], emoji: "🍖", img: "./images/odoldol.jpg" },
        { id: "jeyuk-bokkeum", name: "제육볶음", category: "meat", tags: ["배달", "매운맛", "든든함"], emoji: "🍖", img: "./images/jeyuk-bokkeum.jpg" },
        { id: "chicken-skewer", name: "닭꼬치", category: "meat", tags: ["간단", "배달", "혼자"], emoji: "🍢", img: "./images/chicken-skewer.jpg" },
        { id: "sausage-vegetable-stir-fry", name: "소시지야채볶음", category: "meat", tags: ["간단", "든든함", "혼자"], emoji: "🌭", img: "./images/sausage-vegetable-stir-fry.jpg" },

        // 매운 음식 5
        { id: "malatang", name: "마라탕", category: "spicy", tags: ["배달", "매운맛", "혼자", "새벽에도찾기쉬움"], emoji: "🌶️", img: "./images/malatang.jpg" },
        { id: "mala-xiang-guo", name: "마라샹궈", category: "spicy", tags: ["배달", "매운맛", "든든함", "2인이상"], emoji: "🌶️", img: "./images/mala-xiang-guo.jpg" },
        { id: "buldak-noodles", name: "불닭볶음면", category: "spicy", tags: ["혼자", "매운맛", "간단"], emoji: "🌶️", img: "./images/buldak-noodles.jpg" },
        { id: "nakji-bokkeum", name: "낙지볶음", category: "spicy", tags: ["배달", "매운맛", "든든함"], emoji: "🐙", img: "./images/nakji-bokkeum.jpg" },
        { id: "jjukkumi-bokkeum", name: "주꾸미볶음", category: "spicy", tags: ["배달", "매운맛", "든든함"], emoji: "🐙", img: "./images/jjukkumi-bokkeum.jpg" },

        // 간단·패스트푸드 10
        { id: "hotdog", name: "핫도그", category: "snack-fast", tags: ["간단", "혼자", "배달"], emoji: "🌭", img: "./images/hotdog.jpg" },
        { id: "hamburger", name: "햄버거", category: "snack-fast", tags: ["배달", "혼자", "새벽에도찾기쉬움"], emoji: "🍔", img: "./images/hamburger.jpg" },
        { id: "cheeseburger", name: "치즈버거", category: "snack-fast", tags: ["배달", "혼자", "든든함"], emoji: "🍔", img: "./images/cheeseburger.jpg" },
        { id: "french-fries", name: "감자튀김", category: "snack-fast", tags: ["간단", "가벼움", "배달"], emoji: "🍟", img: "./images/french-fries.jpg" },
        { id: "chicken-nuggets", name: "치킨너겟", category: "snack-fast", tags: ["간단", "혼자", "배달"], emoji: "🍗", img: "./images/chicken-nuggets.jpg" },
        { id: "cup-ramen", name: "컵라면", category: "snack-fast", tags: ["혼자", "간단", "새벽에도찾기쉬움"], emoji: "🍜", img: "./images/cup-ramen.jpg" },
        { id: "triangle-gimbap", name: "삼각김밥", category: "snack-fast", tags: ["혼자", "간단", "가벼움"], emoji: "🍙", img: "./images/triangle-gimbap.jpg" },
        { id: "convenience-store-lunchbox", name: "편의점도시락", category: "snack-fast", tags: ["혼자", "든든함", "간단"], emoji: "🍱", img: "./images/convenience-store-lunchbox.jpg" },
        { id: "fish-cake-soup", name: "어묵탕", category: "snack-fast", tags: ["국물", "따뜻함", "간단", "혼자"], emoji: "🍢", img: "./images/fish-cake-soup.jpg" },
        { id: "popcorn", name: "팝콘", category: "snack-fast", tags: ["간단", "가벼움", "혼자"], emoji: "🍿", img: "./images/popcorn.jpg" },

        // 디저트 8
        { id: "ice-cream", name: "아이스크림", category: "dessert", tags: ["가벼움", "달콤함", "혼자"], emoji: "🍦", img: "./images/ice-cream.jpg" },
        { id: "bingsu", name: "빙수", category: "dessert", tags: ["배달", "달콤함", "2인이상"], emoji: "🍧", img: "./images/bingsu.jpg" },
        { id: "waffle", name: "와플", category: "dessert", tags: ["배달", "달콤함", "간단"], emoji: "🧇", img: "./images/waffle.jpg" },
        { id: "croffle", name: "크로플", category: "dessert", tags: ["배달", "달콤함", "간단"], emoji: "🥐", img: "./images/croffle.jpg" },
        { id: "donut", name: "도넛", category: "dessert", tags: ["달콤함", "간단", "혼자"], emoji: "🍩", img: "./images/donut.jpg" },
        { id: "cake", name: "케이크", category: "dessert", tags: ["달콤함", "2인이상"], emoji: "🍰", img: "./images/cake.jpg" },
        { id: "bunggeoppang", name: "붕어빵", category: "dessert", tags: ["달콤함", "가벼움", "겨울"], emoji: "🐟", img: "./images/bunggeoppang.jpg" },
        { id: "chocolate-snacks", name: "초코과자", category: "dessert", tags: ["달콤함", "간단", "혼자"], emoji: "🍫", img: "./images/chocolate-snacks.jpg" },
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

    function thumbHtml(item) {
        if (item.img) return `<img src="${item.img}" alt="${escapeHTML(item.name)}" loading="lazy" />`;
        return `<span class="emoji-thumb">${item.emoji || "🍽️"}</span>`;
    }

    function cardTemplate(item) {
        const disabled = disabledIds.has(item.id);
        const filteredOut = !passesFilters(item);
        const classes = ["menu-card"];
        if (disabled) classes.push("disabled");
        if (filteredOut) classes.push("filtered-out");
        const safeName = escapeHTML(item.name);
        const removeBtn = item.custom ? `<button class="card-remove" type="button" data-remove="${item.id}" aria-label="삭제">×</button>` : "";
        return `
            <div class="${classes.join(" ")}" data-id="${item.id}">
                ${removeBtn}
                <label class="card-toggle">
                    <input type="checkbox" data-toggle="${item.id}" ${disabled ? "" : "checked"} />
                    <span class="card-thumb">${thumbHtml(item)}</span>
                    <span class="card-name">${safeName}</span>
                    <span class="card-tags">${tagPillsHtml(item.tags || [])}</span>
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
            previewThumb.innerHTML = thumbHtml(item);
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

            $("#result-thumb").innerHTML = thumbHtml(winner);
            $("#result-name").textContent = winner.name;
            $("#result-tags").innerHTML = tagPillsHtml(winner.tags || []);
            resultBox.classList.remove("hidden");
            resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    spinButton.addEventListener("click", spin);
    $("#spin-again").addEventListener("click", spin);

    render();
})();
