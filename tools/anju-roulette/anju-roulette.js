(function anjuRoulette() {
    "use strict";

    const STORAGE_DISABLED = "toolify-anju-roulette-disabled-v1";
    const STORAGE_ALCOHOL = "toolify-anju-roulette-alcohol-v1";
    const STORAGE_TASTE = "toolify-anju-roulette-taste-v1";
    const STORAGE_CUSTOM = "toolify-anju-roulette-custom-v1";

    const CATEGORIES = {
        meat: "고기·구이",
        fried: "치킨·튀김",
        seafood: "해산물",
        soup: "국물·탕",
        spicy: "매운 안주",
        jeon: "전·한식",
        dry: "간단·마른안주",
        cheese: "치즈·양식",
    };

    // 술 종류 필터: 단일 선택 (전체 = 필터 없음)
    const ALCOHOL_OPTIONS = ["소주", "맥주", "막걸리", "하이볼", "와인"];
    // 취향 필터: 다중 선택, 태그를 모두 포함해야 통과
    const TASTE_OPTIONS = ["매운맛", "국물", "간단", "든든함"];

    // 60가지 술안주. img는 ./images/의 무료 라이선스 사진(Pexels 43장 + Wikimedia Commons 17장,
    // Commons 사진의 작가·라이선스는 index.html 하단 '사진 출처'에 표기). emoji는 이미지 로드 실패 시 폴백.
    const BASE_ITEMS = [
        // 고기·구이 10
        { id: "samgyeopsal", img: "./images/samgyeopsal.jpg", name: "삼겹살", category: "meat", alcohol: ["소주", "맥주"], tags: ["든든함", "2인이상", "배달가능"], emoji: "🥓" },
        { id: "pork-ribs", img: "./images/pork-ribs.jpg", name: "돼지갈비", category: "meat", alcohol: ["소주", "맥주"], tags: ["든든함", "2인이상"], emoji: "🍖" },
        { id: "dakgalbi", img: "./images/dakgalbi.jpg", name: "닭갈비", category: "meat", alcohol: ["소주", "맥주"], tags: ["매운맛", "든든함", "2인이상"], emoji: "🍗" },
        { id: "chicken-skewer", img: "./images/chicken-skewer.jpg", name: "닭꼬치", category: "meat", alcohol: ["맥주", "하이볼"], tags: ["간단", "배달가능"], emoji: "🍢" },
        { id: "grilled-sausage", img: "./images/grilled-sausage.jpg", name: "소시지구이", category: "meat", alcohol: ["맥주", "하이볼"], tags: ["간단", "무난함"], emoji: "🌭" },
        { id: "gopchang-gui", img: "./images/gopchang-gui.jpg", name: "곱창구이", category: "meat", alcohol: ["소주", "맥주"], tags: ["든든함", "야식", "2인이상"], emoji: "🍖" },
        { id: "makchang-gui", img: "./images/makchang-gui.jpg", name: "막창구이", category: "meat", alcohol: ["소주", "맥주"], tags: ["든든함", "야식", "2인이상"], emoji: "🍖" },
        { id: "odolbbyeo", img: "./images/odolbbyeo.jpg", name: "오돌뼈", category: "meat", alcohol: ["소주", "맥주"], tags: ["매운맛", "야식", "배달가능"], emoji: "🍖" },
        { id: "bulgogi", img: "./images/bulgogi.jpg", name: "불고기", category: "meat", alcohol: ["소주", "맥주"], tags: ["든든함", "무난함"], emoji: "🥩" },
        { id: "steak", img: "./images/steak.jpg", name: "스테이크", category: "meat", alcohol: ["와인", "하이볼"], tags: ["든든함", "분위기"], emoji: "🥩" },

        // 치킨·튀김 9
        { id: "fried-chicken", img: "./images/fried-chicken.jpg", name: "후라이드치킨", category: "fried", alcohol: ["맥주", "하이볼"], tags: ["배달가능", "무난함", "야식"], emoji: "🍗" },
        { id: "yangnyeom-chicken", img: "./images/yangnyeom-chicken.jpg", name: "양념치킨", category: "fried", alcohol: ["맥주", "소주"], tags: ["배달가능", "야식", "매운맛"], emoji: "🍗" },
        { id: "dakgangjeong", img: "./images/dakgangjeong.jpg", name: "닭강정", category: "fried", alcohol: ["맥주", "하이볼"], tags: ["배달가능", "간단"], emoji: "🍗" },
        { id: "french-fries", img: "./images/french-fries.jpg", name: "감자튀김", category: "fried", alcohol: ["맥주", "하이볼"], tags: ["간단"], emoji: "🍟" },
        { id: "shrimp-tempura", img: "./images/shrimp-tempura.jpg", name: "새우튀김", category: "fried", alcohol: ["맥주", "하이볼"], tags: ["간단"], emoji: "🍤" },
        { id: "fried-squid", img: "./images/fried-squid.jpg", name: "오징어튀김", category: "fried", alcohol: ["맥주", "소주"], tags: ["배달가능"], emoji: "🦑" },
        { id: "cheese-stick", img: "./images/cheese-stick.jpg", name: "치즈스틱", category: "fried", alcohol: ["맥주", "하이볼"], tags: ["간단"], emoji: "🧀" },
        { id: "donkatsu", img: "./images/donkatsu.jpg", name: "돈까스", category: "fried", alcohol: ["맥주", "소주"], tags: ["든든함", "배달가능"], emoji: "🍖" },
        { id: "assorted-fried", img: "./images/assorted-fried.jpg", name: "모둠튀김", category: "fried", alcohol: ["맥주", "소주"], tags: ["배달가능", "2인이상"], emoji: "🍤" },

        // 해산물 9
        { id: "sashimi", img: "./images/sashimi.jpg", name: "회", category: "seafood", alcohol: ["소주"], tags: ["2인이상"], emoji: "🍣" },
        { id: "salmon-sashimi", img: "./images/salmon-sashimi.jpg", name: "연어회", category: "seafood", alcohol: ["소주", "와인"], tags: [], emoji: "🍣" },
        { id: "golbaengi-muchim", img: "./images/golbaengi-muchim.jpg", name: "골뱅이무침", category: "seafood", alcohol: ["소주", "맥주"], tags: ["매운맛", "배달가능"], emoji: "🐌" },
        { id: "boiled-squid", img: "./images/boiled-squid.jpg", name: "오징어숙회", category: "seafood", alcohol: ["소주"], tags: [], emoji: "🦑" },
        { id: "boiled-octopus", img: "./images/boiled-octopus.jpg", name: "문어숙회", category: "seafood", alcohol: ["소주"], tags: [], emoji: "🐙" },
        { id: "steamed-clams", img: "./images/steamed-clams.jpg", name: "조개찜", category: "seafood", alcohol: ["소주", "맥주"], tags: ["국물", "2인이상"], emoji: "🦪" },
        { id: "grilled-shrimp", img: "./images/grilled-shrimp.jpg", name: "새우구이", category: "seafood", alcohol: ["맥주", "와인"], tags: ["간단"], emoji: "🍤" },
        { id: "seafood-pajeon", img: "./images/seafood-pajeon.jpg", name: "해물파전", category: "seafood", alcohol: ["막걸리", "소주"], tags: ["든든함", "2인이상"], emoji: "🥞" },
        { id: "sea-squirt", img: "./images/sea-squirt.jpg", name: "멍게", category: "seafood", alcohol: ["소주"], tags: [], emoji: "🐚" },

        // 국물·탕 9
        { id: "fish-cake-soup", img: "./images/fish-cake-soup.jpg", name: "어묵탕", category: "soup", alcohol: ["소주", "맥주"], tags: ["국물", "간단"], emoji: "🍲" },
        { id: "kimchi-jjigae", img: "./images/kimchi-jjigae.jpg", name: "김치찌개", category: "soup", alcohol: ["소주"], tags: ["국물", "든든함", "배달가능"], emoji: "🍲" },
        { id: "budae-jjigae", img: "./images/budae-jjigae.jpg", name: "부대찌개", category: "soup", alcohol: ["소주", "맥주"], tags: ["국물", "든든함", "2인이상"], emoji: "🍲" },
        { id: "dak-bokkeumtang", img: "./images/dak-bokkeumtang.jpg", name: "닭볶음탕", category: "soup", alcohol: ["소주", "맥주"], tags: ["매운맛", "든든함", "2인이상"], emoji: "🍗" },
        { id: "altang", img: "./images/altang.jpg", name: "알탕", category: "soup", alcohol: ["소주"], tags: ["국물"], emoji: "🍲" },
        { id: "jjamppong-soup", img: "./images/jjamppong-soup.jpg", name: "짬뽕탕", category: "soup", alcohol: ["소주", "맥주"], tags: ["매운맛", "국물", "야식"], emoji: "🍜" },
        { id: "mussel-soup", img: "./images/mussel-soup.jpg", name: "홍합탕", category: "soup", alcohol: ["소주"], tags: ["국물"], emoji: "🦪" },
        { id: "clam-soup", img: "./images/clam-soup.jpg", name: "조개탕", category: "soup", alcohol: ["소주"], tags: ["국물"], emoji: "🦪" },
        { id: "sundubu-jjigae", img: "./images/sundubu-jjigae.jpg", name: "순두부찌개", category: "soup", alcohol: ["소주"], tags: ["매운맛", "국물", "든든함"], emoji: "🍲" },

        // 매운 안주 7
        { id: "dakbal", img: "./images/dakbal.jpg", name: "닭발", category: "spicy", alcohol: ["소주", "맥주"], tags: ["매운맛", "야식", "배달가능"], emoji: "🌶️" },
        { id: "spicy-jokbal", img: "./images/spicy-jokbal.jpg", name: "매운족발", category: "spicy", alcohol: ["소주", "맥주"], tags: ["매운맛", "야식", "2인이상"], emoji: "🌶️" },
        { id: "nakji-bokkeum", img: "./images/nakji-bokkeum.jpg", name: "낙지볶음", category: "spicy", alcohol: ["소주"], tags: ["매운맛", "든든함"], emoji: "🌶️" },
        { id: "jjukkumi-bokkeum", img: "./images/jjukkumi-bokkeum.jpg", name: "주꾸미볶음", category: "spicy", alcohol: ["소주", "맥주"], tags: ["매운맛", "든든함"], emoji: "🌶️" },
        { id: "tteokbokki", img: "./images/tteokbokki.jpg", name: "떡볶이", category: "spicy", alcohol: ["맥주", "소주"], tags: ["매운맛", "배달가능", "간단"], emoji: "🌶️" },
        { id: "buldak-bokkeum", img: "./images/buldak-bokkeum.jpg", name: "불닭볶음", category: "spicy", alcohol: ["소주", "맥주"], tags: ["매운맛", "야식"], emoji: "🌶️" },
        { id: "spicy-odolbbyeo", img: "./images/spicy-odolbbyeo.jpg", name: "매운오돌뼈", category: "spicy", alcohol: ["소주", "맥주"], tags: ["매운맛", "야식", "배달가능"], emoji: "🌶️" },

        // 전·한식 7
        { id: "kimchi-jeon", img: "./images/kimchi-jeon.jpg", name: "김치전", category: "jeon", alcohol: ["막걸리", "소주"], tags: ["간단"], emoji: "🥞" },
        { id: "buchu-jeon", img: "./images/buchu-jeon.jpg", name: "부추전", category: "jeon", alcohol: ["막걸리", "소주"], tags: ["간단"], emoji: "🥞" },
        { id: "potato-jeon", img: "./images/potato-jeon.jpg", name: "감자전", category: "jeon", alcohol: ["막걸리"], tags: [], emoji: "🥞" },
        { id: "yukjeon", img: "./images/yukjeon.jpg", name: "육전", category: "jeon", alcohol: ["막걸리", "소주"], tags: ["든든함"], emoji: "🥩" },
        { id: "tofu-kimchi", img: "./images/tofu-kimchi.jpg", name: "두부김치", category: "jeon", alcohol: ["소주", "막걸리"], tags: ["든든함", "무난함"], emoji: "🥘" },
        { id: "jeyuk-bokkeum", img: "./images/jeyuk-bokkeum.jpg", name: "제육볶음", category: "jeon", alcohol: ["소주", "맥주"], tags: ["매운맛", "든든함", "배달가능"], emoji: "🥘" },
        { id: "bossam", img: "./images/bossam.jpg", name: "보쌈", category: "jeon", alcohol: ["소주", "막걸리"], tags: ["든든함", "2인이상", "배달가능"], emoji: "🥬" },

        // 간단·마른안주 6
        { id: "meoktae", img: "./images/meoktae.jpg", name: "먹태", category: "dry", alcohol: ["맥주", "하이볼"], tags: ["간단"], emoji: "🐟" },
        { id: "nogari", img: "./images/nogari.jpg", name: "노가리", category: "dry", alcohol: ["맥주", "소주"], tags: ["간단"], emoji: "🐟" },
        { id: "beef-jerky", img: "./images/beef-jerky.jpg", name: "육포", category: "dry", alcohol: ["맥주", "하이볼", "와인"], tags: ["간단"], emoji: "🥓" },
        { id: "jwipo", img: "./images/jwipo.jpg", name: "쥐포", category: "dry", alcohol: ["맥주", "소주"], tags: ["간단"], emoji: "🐟" },
        { id: "peanuts", img: "./images/peanuts.jpg", name: "땅콩", category: "dry", alcohol: ["맥주", "하이볼"], tags: ["간단"], emoji: "🥜" },
        { id: "dried-squid-strips", img: "./images/dried-squid-strips.jpg", name: "오징어채", category: "dry", alcohol: ["맥주", "소주"], tags: ["간단"], emoji: "🦑" },

        // 치즈·양식 3
        { id: "cheese-platter", img: "./images/cheese-platter.jpg", name: "치즈플래터", category: "cheese", alcohol: ["와인", "하이볼"], tags: ["간단", "분위기"], emoji: "🧀" },
        { id: "nachos", img: "./images/nachos.jpg", name: "나초", category: "cheese", alcohol: ["맥주", "하이볼"], tags: ["간단"], emoji: "🌽" },
        { id: "pepperoni-pizza", img: "./images/pepperoni-pizza.jpg", name: "페퍼로니피자", category: "cheese", alcohol: ["맥주", "와인"], tags: ["든든함", "배달가능", "2인이상"], emoji: "🍕" },
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
    // 술 종류는 여러 개 동시에 켤 수 있다 (OR 조건: 선택한 술 중 하나라도 어울리면 통과).
    let activeAlcohols = new Set(readJSON(STORAGE_ALCOHOL, []).filter((a) => ALCOHOL_OPTIONS.includes(a)));
    let activeTaste = new Set(readJSON(STORAGE_TASTE, []).filter((t) => TASTE_OPTIONS.includes(t)));
    // 직접 추가한 안주. 술 종류·취향 정보가 없으므로 필터를 거치지 않고 항상 후보에 포함된다.
    let customItems = readJSON(STORAGE_CUSTOM, []).filter((it) => it && typeof it.name === "string");

    function allItems() {
        return [...BASE_ITEMS, ...customItems];
    }

    function saveDisabled() { writeJSON(STORAGE_DISABLED, Array.from(disabledIds)); }
    function saveAlcohol() { writeJSON(STORAGE_ALCOHOL, Array.from(activeAlcohols)); }
    function saveTaste() { writeJSON(STORAGE_TASTE, Array.from(activeTaste)); }
    function saveCustom() { writeJSON(STORAGE_CUSTOM, customItems); }

    // 직접 추가한 안주 이름이 innerHTML 템플릿에 들어가므로 마크업으로 해석되지 않게 막는다.
    function escapeHTML(text) {
        return String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }

    function passesFilters(item) {
        if (item.custom) return true;
        if (activeAlcohols.size > 0 && !item.alcohol.some((a) => activeAlcohols.has(a))) return false;
        for (const tag of activeTaste) {
            if (!item.tags.includes(tag)) return false;
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

    function pillsHtml(list, className) {
        return list.map((t) => `<span class="${className}">${escapeHTML(t)}</span>`).join("");
    }

    function cardTemplate(item) {
        const disabled = disabledIds.has(item.id);
        const filteredOut = !passesFilters(item);
        const classes = ["menu-card"];
        if (disabled) classes.push("disabled");
        if (filteredOut) classes.push("filtered-out");
        const safeName = escapeHTML(item.name);
        const thumb = item.img
            ? `<img src="${item.img}" alt="${safeName}" loading="lazy" />`
            : `<span class="emoji-thumb">${item.emoji || "🍽️"}</span>`;
        const removeBtn = item.custom ? `<button class="card-remove" type="button" data-remove="${item.id}" aria-label="삭제">×</button>` : "";
        return `
            <div class="${classes.join(" ")}" data-id="${item.id}">
                ${removeBtn}
                <label class="card-toggle">
                    <input type="checkbox" data-toggle="${item.id}" ${disabled ? "" : "checked"} />
                    <span class="card-thumb">${thumb}</span>
                    <span class="card-name">${safeName}</span>
                    ${item.alcohol && item.alcohol.length ? `<span class="card-alcohol">${pillsHtml(item.alcohol, "alcohol-pill")}</span>` : ""}
                    <span class="card-tags">${pillsHtml(item.tags.slice(0, 3), "tag-pill")}</span>
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
        document.querySelectorAll("[data-alcohol]").forEach((btn) => {
            const isAll = btn.dataset.alcohol === "all";
            btn.classList.toggle("active", isAll ? activeAlcohols.size === 0 : activeAlcohols.has(btn.dataset.alcohol));
        });
        document.querySelectorAll("[data-taste]").forEach((btn) => {
            btn.classList.toggle("active", activeTaste.has(btn.dataset.taste));
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

    document.querySelectorAll("[data-alcohol]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.dataset.alcohol === "all") {
                activeAlcohols = new Set();
            } else {
                const key = btn.dataset.alcohol;
                if (activeAlcohols.has(key)) activeAlcohols.delete(key);
                else activeAlcohols.add(key);
            }
            saveAlcohol();
            render();
        });
    });
    document.querySelectorAll("[data-taste]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.taste;
            if (activeTaste.has(key)) activeTaste.delete(key);
            else activeTaste.add(key);
            saveTaste();
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
        customItems.push({ id, name, custom: true, alcohol: [], tags: ["직접추가"] });
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
            errorMessage.textContent = "조건에 맞는 안주가 2개 이상 필요해요. 필터나 선택을 조정해 주세요.";
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
                : `<span class="emoji-thumb">${item.emoji || "🍽️"}</span>`;
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
                : `<span class="result-emoji">${winner.emoji || "🍽️"}</span>`;
            $("#result-thumb").innerHTML = imgHtml;
            $("#result-name").textContent = winner.name;
            $("#result-alcohol").innerHTML = pillsHtml(winner.alcohol || [], "alcohol-pill");
            $("#result-tags").innerHTML = pillsHtml((winner.tags || []).slice(0, 3), "tag-pill");
            resultBox.classList.remove("hidden");
            resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    spinButton.addEventListener("click", spin);
    $("#spin-again").addEventListener("click", spin);

    render();
})();
