(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.LaundryDetergentCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const MAX_PRODUCTS = 2;
    const DEFAULTS = [
        { name: "", type: "liquid", capacity: 3, capUnit: "L", perUse: 40, price: 12900 },
    ];

    // 받침 유무에 따라 조사를 고른다. 한글이 아니면 받침 없는 형태를 기본값으로 사용.
    function josa(word, withBatchim, withoutBatchim) {
        const ch = (word || "").trim().slice(-1);
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) {
            return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
        }
        return withoutBatchim;
    }

    function computeProduct(p) {
        const capacityBase = p.type === "liquid" && p.capUnit === "L" ? p.capacity * 1000 : p.capacity;
        const usesCount = p.perUse > 0 ? capacityBase / p.perUse : 0;
        const costPerUse = usesCount > 0 ? p.price / usesCount : 0;
        return Object.assign({}, p, { usesCount, costPerUse });
    }

    function formatWon(n) {
        if (!Number.isFinite(n)) return "-";
        return `${Math.round(n).toLocaleString("ko-KR")}원`;
    }

    function formatCount(n) {
        if (!Number.isFinite(n) || n <= 0) return "-";
        return `${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}회`;
    }

    function init(doc) {
        const $ = (s, ctx) => (ctx || doc).querySelector(s);
        const $$ = (s, ctx) => Array.from((ctx || doc).querySelectorAll(s));

        const listEl = $("#product-list");
        const template = $("#product-template");
        const addBtn = $("#add-product-btn");
        const freqInput = $("#weekly-freq");

        function labelFor(index) {
            return index === 0 ? "세제 A" : "세제 B";
        }

        function applyType(card) {
            const type = $(".ldc-type", card).value;
            const isCapsule = type === "capsule";
            $(".ldc-cap-label", card).textContent = isCapsule ? "총 캡슐 개수" : "총 용량";
            $(".ldc-use-label", card).textContent = isCapsule ? "1회 사용 개수" : "1회 사용량";
            $(".ldc-use-badge", card).textContent = isCapsule ? "개" : "mL";
            $(".ldc-cap-compound", card).classList.toggle("is-capsule", isCapsule);
            if (isCapsule) {
                $(".ldc-cap-unit", card).value = "mL";
            }
        }

        function relabelCards() {
            $$(".ldc-card", listEl).forEach((card, index) => {
                card.dataset.index = String(index);
                const nameInput = $(".ldc-name", card);
                nameInput.placeholder = `${labelFor(index)} (선택)`;
                const removeBtn = $(".ldc-remove", card);
                removeBtn.classList.toggle("hidden", $$(".ldc-card", listEl).length < 2);
            });
            addBtn.classList.toggle("hidden", $$(".ldc-card", listEl).length >= MAX_PRODUCTS);
        }

        function addCard(defaults) {
            const cards = $$(".ldc-card", listEl);
            if (cards.length >= MAX_PRODUCTS) return;

            const node = template.content.firstElementChild.cloneNode(true);

            if (defaults) {
                $(".ldc-name", node).value = defaults.name || "";
                $(".ldc-type", node).value = defaults.type;
                $(".ldc-capacity", node).value = defaults.capacity;
                $(".ldc-cap-unit", node).value = defaults.capUnit;
                $(".ldc-per-use", node).value = defaults.perUse;
                $(".ldc-price", node).value = defaults.price;
            }

            applyType(node);

            $(".ldc-type", node).addEventListener("change", () => {
                applyType(node);
                render();
            });

            $$("input, select", node).forEach((el) => {
                el.addEventListener("input", render);
                el.addEventListener("change", render);
            });

            $(".ldc-remove", node).addEventListener("click", () => {
                node.remove();
                relabelCards();
                render();
            });

            listEl.appendChild(node);
            relabelCards();
        }

        addBtn.addEventListener("click", () => {
            addCard({ name: "", type: "liquid", capacity: 3, capUnit: "L", perUse: 40, price: 15900 });
            render();
        });

        freqInput.addEventListener("input", render);
        freqInput.addEventListener("change", render);

        function getProducts() {
            return $$(".ldc-card", listEl).map((card, index) => {
                const name = $(".ldc-name", card).value.trim() || labelFor(index);
                const type = $(".ldc-type", card).value;
                const capacity = Math.max(0, Number($(".ldc-capacity", card).value) || 0);
                const capUnit = $(".ldc-cap-unit", card).value;
                const perUse = Math.max(0, Number($(".ldc-per-use", card).value) || 0);
                const price = Math.max(0, Number($(".ldc-price", card).value) || 0);
                return { name, type, capacity, capUnit, perUse, price };
            });
        }

        function render() {
            const products = getProducts().map(computeProduct);
            const valid = products.filter((p) => p.price > 0 && p.costPerUse > 0);
            const weeklyFreq = Math.max(1, Number(freqInput.value) || 1);

            if (valid.length === 0) {
                $("#result-hero-label").textContent = "1회 세탁 비용";
                $("#result-hero-value").textContent = "-";
                $("#result-hero-sub").textContent = "총 용량·1회 사용량·구매 가격을 입력하면 결과가 나와요.";
                $("#compare-wrap").classList.add("hidden");
                $("#result-freq-text").textContent = "";
                return;
            }

            if (valid.length === 1) {
                const p = valid[0];
                $("#result-hero-label").textContent = "1회 세탁 비용";
                $("#result-hero-value").textContent = formatWon(p.costPerUse);
                $("#result-hero-sub").textContent = `총 ${formatCount(p.usesCount)} 세탁 가능 · 총 ${formatWon(p.price)} 지불`;
                $("#compare-wrap").classList.add("hidden");

                const weeks = p.usesCount / weeklyFreq;
                const months = weeks / 4.345;
                $("#result-freq-text").textContent =
                    `주 ${weeklyFreq}회 세탁 기준, 이 세제 하나로 약 ${weeks.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}주(약 ${months.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}개월) 사용할 수 있어요.`;

                if ($("#hero-chip-input") && $("#hero-chip-result")) {
                    const capText = p.type === "capsule" ? `${p.capacity}개` : `${p.capacity}${p.capUnit}`;
                    const useText = p.type === "capsule" ? `${p.perUse}개` : `${p.perUse}mL`;
                    $("#hero-chip-input").textContent = `${capText}·${useText}·${formatWon(p.price)}`;
                    $("#hero-chip-result").textContent = `1회 ${formatWon(p.costPerUse)}`;
                }
                return;
            }

            const sorted = valid.slice().sort((a, b) => a.costPerUse - b.costPerUse);
            const cheapest = sorted[0];
            const runnerUp = sorted[1];
            const diff = runnerUp.costPerUse - cheapest.costPerUse;
            const pct = runnerUp.costPerUse > 0 ? (diff / runnerUp.costPerUse) * 100 : 0;
            const cheapJosa = josa(cheapest.name, "이", "가");

            $("#result-hero-label").textContent = "더 저렴한 세제";
            $("#result-hero-value").textContent = `${cheapest.name}${cheapJosa} 더 저렴해요`;
            $("#result-hero-sub").innerHTML =
                `${cheapest.name} ${formatWon(cheapest.costPerUse)} · ${runnerUp.name} ${formatWon(runnerUp.costPerUse)}<br>` +
                `${cheapest.name}${cheapJosa} 1회 ${formatWon(diff)}, 약 ${pct.toFixed(1)}% 저렴해요`;

            $("#compare-wrap").classList.remove("hidden");
            $("#compare-body").innerHTML = sorted.map((p) => {
                const isCheapest = p === cheapest;
                return `<tr${isCheapest ? " class=\"highlight\"" : ""}><td>${p.name}${isCheapest ? " <span class=\"ldc-badge\">최저가</span>" : ""}</td><td>${formatWon(p.costPerUse)}</td><td>${formatCount(p.usesCount)}</td><td>${formatWon(p.price)}</td></tr>`;
            }).join("");

            const weeks = cheapest.usesCount / weeklyFreq;
            const months = weeks / 4.345;
            $("#result-freq-text").textContent =
                `주 ${weeklyFreq}회 세탁 기준, ${cheapest.name}${josa(cheapest.name, "은", "는")} 약 ${weeks.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}주(약 ${months.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}개월) 사용할 수 있어요.`;

            if ($("#hero-chip-input") && $("#hero-chip-result")) {
                $("#hero-chip-input").textContent = `${cheapest.name} ${formatWon(cheapest.costPerUse)} / ${runnerUp.name} ${formatWon(runnerUp.costPerUse)}`;
                $("#hero-chip-result").textContent = `${cheapest.name} ${pct.toFixed(1)}% 저렴`;
            }
        }

        DEFAULTS.forEach((d) => addCard(d));
        render();
    }

    return { computeProduct, josa, init };
});
