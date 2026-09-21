(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.UnitPriceComparison = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const MAX_PRODUCTS = 4;
    const PROMO_MULTIPLIER = { normal: 1, bundle: 1, onePlusOne: 2, twoPlusOne: 1.5 };
    const DEFAULTS = [
        { name: "상품 A", price: 5790, qty: 5, volume: 500, unit: "g" },
        { name: "상품 B", price: 6570, qty: 6, volume: 500, unit: "g" },
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

    function promoMultiplier(promo) {
        return PROMO_MULTIPLIER[promo] || 1;
    }

    function computeProduct(p) {
        const receivedQty = Math.max(1, (Math.max(1, p.qty) || 1) * promoMultiplier(p.promo));
        const totalPaid = Math.max(0, (p.price || 0) - (p.discount || 0) + (p.shipping || 0));
        const pricePerUnit = totalPaid / receivedQty;
        let per100 = null;
        if (p.unit !== "ea" && p.volume > 0) {
            const baseAmount = (p.unit === "kg" || p.unit === "L") ? p.volume * 1000 : p.volume;
            const totalBase = baseAmount * receivedQty;
            per100 = totalBase > 0 ? (totalPaid / totalBase) * 100 : null;
        }
        return Object.assign({}, p, { receivedQty, totalPaid, pricePerUnit, per100 });
    }

    function basisValue(p, basis) {
        if (basis === "per100g") return (p.unit === "g" || p.unit === "kg") ? p.per100 : null;
        if (basis === "per100ml") return (p.unit === "mL" || p.unit === "L") ? p.per100 : null;
        return p.pricePerUnit;
    }

    function basisLabel(basis) {
        if (basis === "per100g") return "100g당 가격 기준";
        if (basis === "per100ml") return "100mL당 가격 기준";
        return "개당 가격 기준";
    }

    function formatWon(n) {
        if (!Number.isFinite(n)) return "-";
        return `${Math.round(n).toLocaleString("ko-KR")}원`;
    }

    function formatWonDecimal(n) {
        if (!Number.isFinite(n)) return "-";
        return `${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}원`;
    }

    function per100Label(unit) {
        if (unit === "g" || unit === "kg") return "100g당";
        if (unit === "mL" || unit === "L") return "100mL당";
        return "-";
    }

    function init(doc) {
        const $ = (s, ctx) => (ctx || doc).querySelector(s);
        const $$ = (s, ctx) => Array.from((ctx || doc).querySelectorAll(s));

        const listEl = $("#product-list");
        const template = $("#product-template");
        const addBtn = $("#add-product-btn");
        const advancedToggle = $("#advanced-toggle");

        let advancedOpen = false;
        let basis = "unit";

        function labelFor(index) {
            return `상품 ${String.fromCharCode(65 + index)}`;
        }

        function relabelCards() {
            $$(".upc-card", listEl).forEach((card, index) => {
                card.dataset.index = String(index);
                const nameInput = $(".upc-name", card);
                nameInput.placeholder = `${labelFor(index)} (선택)`;
                const removeBtn = $(".upc-remove", card);
                removeBtn.classList.toggle("hidden", index < 2);
            });
            addBtn.disabled = $$(".upc-card", listEl).length >= MAX_PRODUCTS;
        }

        function bindCard(node) {
            $$("input, select", node).forEach((el) => {
                el.addEventListener("input", render);
                el.addEventListener("change", render);
            });

            $(".upc-remove", node).addEventListener("click", () => {
                node.remove();
                relabelCards();
                render();
            });
        }

        function addCard(defaults) {
            const cards = $$(".upc-card", listEl);
            if (cards.length >= MAX_PRODUCTS) return;

            const node = template.content.firstElementChild.cloneNode(true);

            if (defaults) {
                $(".upc-name", node).value = defaults.name || "";
                $(".upc-price", node).value = defaults.price;
                $(".upc-qty", node).value = defaults.qty;
                $(".upc-volume", node).value = defaults.volume;
                $(".upc-unit", node).value = defaults.unit;
            }

            bindCard(node);

            listEl.appendChild(node);
            relabelCards();
        }

        addBtn.addEventListener("click", () => {
            addCard(null);
            render();
        });

        advancedToggle.addEventListener("click", () => {
            advancedOpen = !advancedOpen;
            advancedToggle.setAttribute("aria-expanded", String(advancedOpen));
            advancedToggle.querySelector(".toggle-icon").textContent = advancedOpen ? "–" : "+";
            listEl.classList.toggle("upc-advanced-open", advancedOpen);
            if (!advancedOpen) {
                basis = "unit";
                $$(".upc-basis-btn").forEach((b) => b.classList.toggle("active", b.dataset.basis === "unit"));
            }
            $("#basis-toggle-row").classList.toggle("hidden", !advancedOpen);
            $("#compare-table").classList.toggle("upc-basic-mode", !advancedOpen);
            render();
        });

        $$(".upc-basis-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                basis = btn.dataset.basis;
                $$(".upc-basis-btn").forEach((b) => b.classList.toggle("active", b === btn));
                render();
            });
        });

        $("#compare-qty").addEventListener("input", render);
        $("#compare-qty").addEventListener("change", render);

        function getProducts() {
            return $$(".upc-card", listEl).map((card, index) => {
                const name = $(".upc-name", card).value.trim() || labelFor(index);
                const promo = $(".upc-promo", card).value;
                const price = Number($(".upc-price", card).value) || 0;
                const qty = Math.max(1, Number($(".upc-qty", card).value) || 1);
                const volume = Math.max(0, Number($(".upc-volume", card).value) || 0);
                const unit = $(".upc-unit", card).value;
                const discount = Math.max(0, Number($(".upc-discount", card).value) || 0);
                const shipping = Math.max(0, Number($(".upc-shipping", card).value) || 0);
                return { name, promo, price, qty, volume, unit, discount, shipping };
            });
        }

        function render() {
            const products = getProducts().map(computeProduct);
            const valid = products.filter((p) => p.price > 0 && basisValue(p, basis) > 0);

            $("#result-basis-note").textContent = basisLabel(basis);

            if (valid.length < 2) {
                $("#result-hero-name").textContent = "-";
                $("#result-hero-sub").textContent = basis === "unit"
                    ? "두 개 이상의 상품에 가격을 입력하면 비교 결과가 나와요."
                    : "선택한 기준(용량 단위)에 맞는 상품이 2개 이상 필요해요.";
                $("#result-qty-value").textContent = "-";
                $("#compare-body").innerHTML = "";
                return;
            }

            const sorted = valid.slice().sort((a, b) => basisValue(a, basis) - basisValue(b, basis));
            const cheapest = sorted[0];
            const runnerUp = sorted[1];
            const cheapestVal = basisValue(cheapest, basis);
            const runnerUpVal = basisValue(runnerUp, basis);
            const diff = runnerUpVal - cheapestVal;
            const pct = runnerUpVal > 0 ? (diff / runnerUpVal) * 100 : 0;
            const cheapJosa = josa(cheapest.name, "이", "가");

            $("#result-hero-name").textContent = `${cheapest.name}${cheapJosa} 더 저렴해요`;
            $("#result-hero-sub").innerHTML =
                `${cheapest.name} ${formatWonDecimal(cheapestVal)} · ${runnerUp.name} ${formatWonDecimal(runnerUpVal)}<br>` +
                `${cheapest.name}${cheapJosa} ${formatWonDecimal(diff)}, 약 ${pct.toFixed(1)}% 저렴해요`;

            const compareQty = Math.max(1, Number($("#compare-qty").value) || 1);
            $("#result-qty-label").textContent = `${compareQty}개 구매 시`;
            $("#result-qty-value").textContent = `${formatWon(diff * compareQty)} 절약`;

            $("#compare-body").innerHTML = sorted.map((p) => {
                const isCheapest = p === cheapest;
                const per100Text = p.per100 != null ? `${per100Label(p.unit)} ${formatWonDecimal(p.per100)}` : "-";
                return `<tr${isCheapest ? " class=\"highlight\"" : ""}><td>${p.name}${isCheapest ? " <span class=\"upc-badge\">최저가</span>" : ""}</td><td>${formatWonDecimal(p.pricePerUnit)}</td><td class="upc-col-100">${per100Text}</td><td>${formatWon(p.totalPaid)}</td></tr>`;
            }).join("");

            if ($("#hero-chip-input") && $("#hero-chip-result")) {
                $("#hero-chip-input").textContent = `${cheapest.name} ${formatWonDecimal(cheapestVal)} / ${runnerUp.name} ${formatWonDecimal(runnerUpVal)}`;
                $("#hero-chip-result").textContent = `${cheapest.name} ${pct.toFixed(1)}% 저렴`;
            }
        }

        const existingCards = $$(".upc-card", listEl);
        if (existingCards.length) {
            existingCards.forEach(bindCard);
        } else {
            DEFAULTS.forEach((d) => addCard(d));
        }
        relabelCards();
        render();
    }

    return { computeProduct, promoMultiplier, josa, init };
});
