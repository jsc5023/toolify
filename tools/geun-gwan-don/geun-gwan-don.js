/* 근·관·돈 계산기 전용 JS */

const $ = (sel) => document.querySelector(sel);

const inputValue = $("#input-value");
const inputUnit = $("#input-unit");

const unitGramInput = $("#unit-gram");
const unitGramHint = $("#unit-gram-hint");

const geunOptions = $("#geun-options");

const calcBtn = $("#calc-btn");
const copyBtn = $("#copy-btn");
const resetBtn = $("#reset-btn");

const resultEl = $("#result");
const resultExtraEl = $("#result-extra");
const gridEl = $("#result-grid");

/**
 * 고정 기준
 * 1돈 = 3.75g
 * 1관 = 3750g (= 3.75kg = 1000돈)
 * 1근 = 사용자 입력(기본 600g)
 */
const FIXED = {
    don: 3.75,
    gwan: 3750
};

function clampPositive(n, fallback) {
    if (!isFinite(n) || n <= 0) return fallback;
    return n;
}

function getGeunGram() {
    return clampPositive(Number(unitGramInput.value), 600);
}

function isGeunMode() {
    return inputUnit.value === "geun";
}

function syncUnitGramUI() {
    const unit = inputUnit.value;

    if (unit === "don") {
        unitGramInput.value = String(FIXED.don);
        unitGramInput.disabled = true;
        unitGramHint.textContent = "고정값: 1돈 = 3.75g";
        geunOptions.classList.add("hidden");
    } else if (unit === "gwan") {
        unitGramInput.value = String(FIXED.gwan);
        unitGramInput.disabled = true;
        unitGramHint.textContent = "고정값: 1관 = 3750g (3.75kg)";
        geunOptions.classList.add("hidden");
    } else if (unit === "g") {
        unitGramInput.value = "1";
        unitGramInput.disabled = true;
        unitGramHint.textContent = "고정값: 1g = 1g";
        geunOptions.classList.add("hidden");
    } else if (unit === "kg") {
        unitGramInput.value = "1000";
        unitGramInput.disabled = true;
        unitGramHint.textContent = "고정값: 1kg = 1000g";
        geunOptions.classList.add("hidden");
    } else {
        // geun
        unitGramInput.disabled = false;
        if (!unitGramInput.value) unitGramInput.value = "600";
        unitGramHint.textContent = "입력 가능: 1근 기준(g)을 조정하세요.";
        geunOptions.classList.remove("hidden");
    }

    // 결과가 떠있으면 즉시 재계산
    if (resultEl.textContent.trim()) calculate();
}

function toGrams(value, unit) {
    const v = Number(value);

    switch (unit) {
        case "don":
            return v * FIXED.don;
        case "gwan":
            return v * FIXED.gwan;
        case "geun":
            return v * getGeunGram();
        case "g":
            return v;
        case "kg":
            return v * 1000;
        default:
            return NaN;
    }
}

function formatNumber(n, digits = 6) {
    const fixed = n.toFixed(digits);
    return fixed.replace(/\.?0+$/, "");
}

function renderCards(grams) {
    const kg = grams / 1000;
    const geun = grams / getGeunGram();
    const don = grams / FIXED.don;
    const gwan = grams / FIXED.gwan;

    const geunLabel = `근(斤) (1근=${getGeunGram()}g)`;

    const cards = [
        { label: "그램(g)", value: `${grams.toLocaleString()} g` },
        { label: "킬로그램(kg)", value: `${formatNumber(kg)} kg` },
        { label: geunLabel, value: `${formatNumber(geun)} 근` },
        { label: "돈(錢)", value: `${formatNumber(don)} 돈` },
        { label: "관(貫)", value: `${formatNumber(gwan)} 관` }
    ];

    gridEl.innerHTML = cards
        .map(
            (c) => `
      <div class="result-card">
        <div class="label">${c.label}</div>
        <div class="value">${c.value}</div>
      </div>
    `
        )
        .join("");
}

function buildSummaryText(grams) {
    const kg = grams / 1000;
    const geun = grams / getGeunGram();
    const don = grams / FIXED.don;
    const gwan = grams / FIXED.gwan;

    return [
        `기준: 1근=${getGeunGram()}g / 1돈=3.75g / 1관=3750g`,
        `g: ${grams.toLocaleString()} g`,
        `kg: ${formatNumber(kg)} kg`,
        `근: ${formatNumber(geun)} 근`,
        `돈: ${formatNumber(don)} 돈`,
        `관: ${formatNumber(gwan)} 관`
    ].join("\n");
}

function showMessage(msg, extra = "") {
    resultEl.textContent = msg;
    resultExtraEl.textContent = extra;
}

function calculate() {
    const value = Number(inputValue.value);

    if (!inputValue.value || isNaN(value)) {
        showMessage("값을 입력해주세요.", "");
        gridEl.innerHTML = "";
        return;
    }

    const grams = toGrams(value, inputUnit.value);

    if (!isFinite(grams) || grams < 0) {
        showMessage("올바른 값을 입력해주세요.", "");
        gridEl.innerHTML = "";
        return;
    }

    const kg = grams / 1000;

    let extra = `기준: 1돈=3.75g · 1관=3750g`;
    if (isGeunMode()) extra = `기준: 1근=${getGeunGram()}g · 1돈=3.75g · 1관=3750g`;

    showMessage(
        `결과: ${grams.toLocaleString()} g (${formatNumber(kg)} kg)`,
        extra
    );

    renderCards(grams);
}

/* 이벤트 */
calcBtn.addEventListener("click", calculate);

inputUnit.addEventListener("change", syncUnitGramUI);

// 근(g) 직접 수정하면 바로 반영
unitGramInput.addEventListener("input", () => {
    if (!unitGramInput.disabled && resultEl.textContent.trim()) calculate();
});

document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const g = clampPositive(Number(btn.dataset.gram), 600);
        unitGramInput.value = String(g);
        if (resultEl.textContent.trim()) calculate();
    });
});

copyBtn.addEventListener("click", async () => {
    const value = Number(inputValue.value);
    if (!inputValue.value || isNaN(value)) {
        showMessage("복사할 결과가 없습니다. 먼저 값을 입력하고 변환해주세요.", "");
        return;
    }

    const grams = toGrams(value, inputUnit.value);
    const text = buildSummaryText(grams);

    try {
        await navigator.clipboard.writeText(text);
        showMessage("결과를 클립보드에 복사했습니다.", "원하는 곳에 붙여넣기(Ctrl+V) 하세요.");
    } catch (e) {
        showMessage("복사에 실패했습니다.", "브라우저 권한(클립보드 접근)을 확인해주세요.");
    }
});

resetBtn.addEventListener("click", () => {
    inputValue.value = "";
    inputUnit.value = "geun";
    unitGramInput.value = "600";

    showMessage("", "");
    gridEl.innerHTML = "";

    syncUnitGramUI();
});

/* 초기 UI 세팅 */
syncUnitGramUI();
