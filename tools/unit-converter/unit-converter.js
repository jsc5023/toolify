/* === 탭 전환 === */
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.tab;
        tabButtons.forEach((b) => b.classList.remove("active"));
        tabPanels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("tab-" + target).classList.add("active");
    });
});

/* 공통: 숫자 포맷 helper */
function formatNumber(value) {
    if (!isFinite(value)) return "계산할 수 없는 값입니다.";
    if (value === 0) return "0";

    const abs = Math.abs(value);

    // 너무 크거나 너무 작은 값은 지수 표기
    if (abs >= 1e7 || abs <= 1e-4) {
        return value.toExponential(6);
    }
    // 일반적인 값은 소수점 6자리 이내로
    return Number(value.toFixed(6)).toString();
}

/* === 길이 변환 === */
const lengthFactors = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    inch: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344,
};

document.getElementById("length-btn").addEventListener("click", () => {
    const value = Number(document.getElementById("length-value").value);
    const from = document.getElementById("length-from").value;
    const to = document.getElementById("length-to").value;
    const resultEl = document.getElementById("length-result");

    if (isNaN(value)) {
        resultEl.textContent = "변환할 값을 입력해주세요.";
        return;
    }

    const base = value * lengthFactors[from]; // meter
    const converted = base / lengthFactors[to];

    resultEl.textContent = `${value} ${from} = ${formatNumber(converted)} ${to}`;
});

/* === 무게 변환 === */
const weightFactors = {
    g: 0.001,
    kg: 1,
    t: 1000,
    lb: 0.45359237,
    oz: 0.0283495231,
};

document.getElementById("weight-btn").addEventListener("click", () => {
    const value = Number(document.getElementById("weight-value").value);
    const from = document.getElementById("weight-from").value;
    const to = document.getElementById("weight-to").value;
    const resultEl = document.getElementById("weight-result");

    if (isNaN(value)) {
        resultEl.textContent = "변환할 값을 입력해주세요.";
        return;
    }

    const base = value * weightFactors[from]; // kg
    const converted = base / weightFactors[to];

    resultEl.textContent = `${value} ${from} = ${formatNumber(converted)} ${to}`;
});

/* === 온도 변환 === */

function toCelsius(value, from) {
    switch (from) {
        case "c":
            return value;
        case "f":
            return (value - 32) * (5 / 9);
        case "k":
            return value - 273.15;
        default:
            return NaN;
    }
}

function fromCelsius(celsius, to) {
    switch (to) {
        case "c":
            return celsius;
        case "f":
            return celsius * (9 / 5) + 32;
        case "k":
            return celsius + 273.15;
        default:
            return NaN;
    }
}

document.getElementById("temp-btn").addEventListener("click", () => {
    const value = Number(document.getElementById("temp-value").value);
    const from = document.getElementById("temp-from").value;
    const to = document.getElementById("temp-to").value;
    const resultEl = document.getElementById("temp-result");

    if (isNaN(value)) {
        resultEl.textContent = "변환할 온도를 입력해주세요.";
        return;
    }

    const c = toCelsius(value, from);
    const converted = fromCelsius(c, to);

    resultEl.textContent = `${value} ${from.toUpperCase()} = ${formatNumber(converted)} ${to.toUpperCase()}`;
});

/* === 면적 변환 === */
const areaFactors = {
    m2: 1,
    pyeong: 3.3058,      // 1평 = 3.3058㎡
    km2: 1_000_000,      // 1㎢ = 1,000,000㎡
    ft2: 0.09290304,     // 1ft² = 0.09290304㎡
};

document.getElementById("area-btn").addEventListener("click", () => {
    const value = Number(document.getElementById("area-value").value);
    const from = document.getElementById("area-from").value;
    const to = document.getElementById("area-to").value;
    const resultEl = document.getElementById("area-result");

    if (isNaN(value)) {
        resultEl.textContent = "변환할 값을 입력해주세요.";
        return;
    }

    const base = value * areaFactors[from]; // m²
    const converted = base / areaFactors[to];

    const displayFrom =
        from === "m2" ? "㎡" : from === "pyeong" ? "평" : from === "km2" ? "㎢" : "ft²";
    const displayTo =
        to === "m2" ? "㎡" : to === "pyeong" ? "평" : to === "km2" ? "㎢" : "ft²";

    resultEl.textContent = `${value} ${displayFrom} = ${formatNumber(converted)} ${displayTo}`;
});

/* === 속도 변환 === */
const speedFactors = {
    kmh: 1000 / 3600,    // km/h -> m/s
    ms: 1,               // m/s
    mph: 1609.344 / 3600, // mile/h -> m/s
    knot: 1852 / 3600,   // knot -> m/s
};

document.getElementById("speed-btn").addEventListener("click", () => {
    const value = Number(document.getElementById("speed-value").value);
    const from = document.getElementById("speed-from").value;
    const to = document.getElementById("speed-to").value;
    const resultEl = document.getElementById("speed-result");

    if (isNaN(value)) {
        resultEl.textContent = "변환할 값을 입력해주세요.";
        return;
    }

    const base = value * speedFactors[from]; // m/s
    const converted = base / speedFactors[to];

    const displayFrom =
        from === "kmh" ? "km/h" : from === "ms" ? "m/s" : from === "mph" ? "mph" : "knot";
    const displayTo =
        to === "kmh" ? "km/h" : to === "ms" ? "m/s" : to === "mph" ? "mph" : "knot";

    resultEl.textContent = `${value} ${displayFrom} = ${formatNumber(converted)} ${displayTo}`;
});