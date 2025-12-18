/* ============================================================
   한글 금액 변환기 (숫자 ↔ 한글)
   - 결과를 표 형태로: 기본/편의/숫자/자리수
   ============================================================ */

const $ = (id) => document.getElementById(id);

const DIGIT_KO = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const KO_DIGIT_MAP = {
    영: 0, 공: 0,
    일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9,
};

const SMALL_UNIT = ["", "십", "백", "천"];
const BIG_UNIT = ["", "만", "억", "조", "경"];

function toast(msg) {
    const el = $("mc-toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => el.classList.add("hidden"), 1200);
}

function formatComma(numStr) {
    const sign = numStr.startsWith("-") ? "-" : "";
    const raw = sign ? numStr.slice(1) : numStr;
    return sign + raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function digitsCount(numStr) {
    const s = numStr.replace(/[^\d]/g, "");
    return s ? String(s.length) : "";
}

function splitByMan(numStr) {
    // "12345678" => "1234만 5678"
    const sign = numStr.startsWith("-") ? "-" : "";
    let s = sign ? numStr.slice(1) : numStr;
    s = s.replace(/[^\d]/g, "");
    if (!s) return "";

    // 4자리씩 끊기
    const groups = [];
    for (let i = s.length; i > 0; i -= 4) {
        groups.unshift(s.substring(Math.max(0, i - 4), i));
    }

    // 왼쪽 그룹들에 만/억/조/경 붙이기 (4자리 단위)
    const parts = [];
    const groupCount = groups.length;

    for (let idx = 0; idx < groupCount; idx++) {
        const g = groups[idx];
        const bigIdx = groupCount - 1 - idx; // 오른쪽부터 0
        const n = parseInt(g, 10);

        if (n === 0) continue;
        const unit = BIG_UNIT[bigIdx] || "";
        parts.push(String(n) + unit);
    }

    return (sign ? "-" : "") + (parts.join(" ") || "0");
}

/* ---------------- 숫자 -> 한글 ---------------- */

function normalizeNumberInput(input) {
    let s = (input || "").trim();
    if (!s) return { ok: false, msg: "숫자를 입력해주세요." };

    s = s.replace(/원/g, "").replace(/\s/g, "").replace(/,/g, "");
    if (!/^-?\d+$/.test(s)) return { ok: false, msg: "숫자만 입력해주세요. (예: 123456, -1000)" };

    const isNeg = s.startsWith("-");
    if (isNeg) s = s.slice(1);

    // 0 처리
    if (s === "0") return { ok: true, isNeg, digits: "0" };

    // 자리수 제한 (너무 큰 값 방지)
    if (s.length > 20) return { ok: false, msg: "너무 큰 숫자입니다. (최대 20자리까지 지원)" };

    return { ok: true, isNeg, digits: s };
}

function fourDigitsToKorean(fourStr, mode /* "basic" | "easy" */) {
    const s = fourStr.padStart(4, "0");
    let out = "";

    for (let i = 0; i < 4; i++) {
        const d = parseInt(s[i], 10);
        const unit = SMALL_UNIT[4 - 1 - i]; // 천,백,십,""

        if (d === 0) continue;

        if (mode === "easy") {
            // 편의: '일십/일백/일천' -> '십/백/천'
            if (d === 1 && unit !== "") out += unit;
            else out += DIGIT_KO[d] + unit;
        } else {
            // 기본: '일십/일백/일천'처럼 '일' 포함
            out += DIGIT_KO[d] + unit;
        }
    }

    return out || "";
}

function numberToKoreanBoth(inputDigits, isNeg) {
    // 4자리씩 끊기
    const groups = [];
    for (let i = inputDigits.length; i > 0; i -= 4) {
        groups.unshift(inputDigits.substring(Math.max(0, i - 4), i));
    }

    const groupCount = groups.length;
    if (groupCount > BIG_UNIT.length) {
        return { ok: false, msg: "지원 범위를 초과했습니다. (단위 확장 필요)" };
    }

    const partsBasic = [];
    const partsEasy = [];

    groups.forEach((g, idx) => {
        const num = parseInt(g, 10);
        const bigIdx = groupCount - 1 - idx;
        if (num === 0) return;

        const unit = BIG_UNIT[bigIdx] || "";
        const basic = fourDigitsToKorean(g, "basic");
        const easy = fourDigitsToKorean(g, "easy");

        partsBasic.push((basic + unit).trim());
        partsEasy.push((easy + unit).trim());
    });

    let basicOut = (partsBasic.join(" ").trim() || "영") + "원";
    let easyOut = (partsEasy.join(" ").trim() || "영") + "원";

    if (isNeg) {
        basicOut = "마이너스 " + basicOut;
        easyOut = "마이너스 " + easyOut;
    }

    return { ok: true, basic: basicOut, easy: easyOut };
}

/* ---------------- 한글 -> 숫자 ---------------- */

function koreanToNumber(input) {
    let s = (input || "").trim();
    if (!s) return { ok: false, msg: "한글 금액을 입력해주세요." };

    s = s.replace(/[, ]/g, "");
    s = s.replace(/(원|정)$/g, "");

    let isNeg = false;
    if (s.startsWith("마이너스")) {
        isNeg = true;
        s = s.replace(/^마이너스/, "");
    } else if (s.startsWith("-")) {
        isNeg = true;
        s = s.slice(1);
    }

    if (!s) return { ok: false, msg: "변환할 한글 금액이 비어있습니다." };

    if (s === "영" || s === "공") {
        return { ok: true, value: "0", isNeg };
    }

    const unitOrder = [
        { u: "경", m: 10n ** 16n },
        { u: "조", m: 10n ** 12n },
        { u: "억", m: 10n ** 8n },
        { u: "만", m: 10n ** 4n },
    ];

    let total = 0n;
    let rest = s;

    for (const { u, m } of unitOrder) {
        const idx = rest.indexOf(u);
        if (idx === -1) continue;

        const left = rest.slice(0, idx);
        rest = rest.slice(idx + 1);

        const sectionVal = left ? parseKoreanSection(left) : 1n;
        if (sectionVal === null) return { ok: false, msg: `해석할 수 없는 표현이 있습니다: ${u} 앞부분` };
        total += sectionVal * m;
    }

    if (rest) {
        const sectionVal = parseKoreanSection(rest);
        if (sectionVal === null) return { ok: false, msg: "해석할 수 없는 표현이 있습니다. (만 미만 구간)" };
        total += sectionVal;
    }

    let out = total.toString();
    if (isNeg && out !== "0") out = "-" + out;
    return { ok: true, value: out, isNeg };
}

function parseKoreanSection(section) {
    if (!section) return 0n;

    const valid = /^[영공일이삼사오육칠팔구십백천]+$/.test(section);
    if (!valid) return null;

    let sum = 0n;
    let tmp = 0n;
    const unitMap = { 십: 10n, 백: 100n, 천: 1000n };

    for (let i = 0; i < section.length; i++) {
        const ch = section[i];

        if (ch in KO_DIGIT_MAP) {
            tmp = BigInt(KO_DIGIT_MAP[ch]);
            continue;
        }

        if (ch in unitMap) {
            const mul = unitMap[ch];
            const v = (tmp === 0n ? 1n : tmp) * mul;
            sum += v;
            tmp = 0n;
            continue;
        }

        return null;
    }

    sum += tmp;
    return sum;
}

/* ---------------- UI ---------------- */

let MODE = "n2k"; // "n2k" | "k2n"

function setMode(mode) {
    MODE = mode;

    $("tab-n2k").classList.toggle("active", mode === "n2k");
    $("tab-k2n").classList.toggle("active", mode === "k2n");

    $("mode-hint").textContent =
        mode === "n2k"
            ? "숫자를 입력하면 한글 금액으로 변환됩니다. (콤마/원 허용)"
            : "한글 금액을 입력하면 숫자로 변환됩니다. (원/마이너스 허용)";

    clearOutputs();
    $("mc-error").textContent = "";
}

function clearOutputs() {
    $("out-basic").textContent = "";
    $("out-easy").textContent = "";
    $("out-split").textContent = "";
    $("out-len").textContent = "";
}

function setError(msg) {
    $("mc-error").textContent = msg || "";
}

function convert() {
    const input = $("mc-input").value;

    if (!input.trim()) {
        clearOutputs();
        setError("");
        return;
    }

    if (MODE === "n2k") {
        const norm = normalizeNumberInput(input);
        if (!norm.ok) {
            clearOutputs();
            setError(norm.msg);
            return;
        }

        const both = numberToKoreanBoth(norm.digits, norm.isNeg);
        if (!both.ok) {
            clearOutputs();
            setError(both.msg);
            return;
        }

        const numStr = (norm.isNeg ? "-" : "") + norm.digits;

        $("out-basic").textContent = both.basic;
        $("out-easy").textContent = both.easy;
        $("out-split").textContent = splitByMan(numStr);
        $("out-len").textContent = digitsCount(norm.digits);

        setError("");
    } else {
        const r = koreanToNumber(input);
        if (!r.ok) {
            clearOutputs();
            setError(r.msg);
            return;
        }

        const raw = r.value; // digits maybe with "-"
        $("out-basic").textContent = formatComma(raw);         // 기본: 콤마 숫자
        $("out-easy").textContent = splitByMan(raw);           // 편의: 만 단위 읽기
        $("out-split").textContent = raw === "0" ? "0" : raw;  // 숫자: 원본 숫자(부호 포함)
        $("out-len").textContent = digitsCount(raw);

        setError("");
    }
}

function copyText(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast("복사됨");
}

function copyRowById(id) {
    const t = $(id).textContent.trim();
    copyText(t);
}

function copyAll() {
    const lines = [
        `기본: ${$("out-basic").textContent.trim()}`,
        `편의: ${$("out-easy").textContent.trim()}`,
        `숫자: ${$("out-split").textContent.trim()}`,
        `자리수: ${$("out-len").textContent.trim()}`
    ].filter((x) => !x.endsWith(":"));

    copyText(lines.join("\n"));
}

function applyExample(key) {
    if (key === "ex1") $("mc-input").value = "12345678";
    if (key === "ex2") $("mc-input").value = "120000000000";
    if (key === "ex3") $("mc-input").value = "일억이천만원";
    if (key === "ex4") $("mc-input").value = "마이너스 오천원";

    // 예시 성격에 맞게 모드 자동 전환
    if (key === "ex1" || key === "ex2") setMode("n2k");
    if (key === "ex3" || key === "ex4") setMode("k2n");

    convert();
}

document.addEventListener("DOMContentLoaded", () => {
    setMode("n2k");

    $("tab-n2k").addEventListener("click", () => setMode("n2k"));
    $("tab-k2n").addEventListener("click", () => setMode("k2n"));

    $("swap-btn").addEventListener("click", () => {
        setMode(MODE === "n2k" ? "k2n" : "n2k");
        convert();
    });

    $("convert-btn").addEventListener("click", convert);
    $("copy-all-btn").addEventListener("click", copyAll);

    // 개별 복사
    document.querySelectorAll(".mc-copy").forEach((btn) => {
        btn.addEventListener("click", () => copyRowById(btn.dataset.copy));
    });

    // 예시 칩
    document.querySelectorAll(".mc-chip").forEach((chip) => {
        chip.addEventListener("click", () => applyExample(chip.dataset.ex));
    });

    // 입력 시 자동 변환 (debounce)
    $("mc-input").addEventListener("input", () => {
        clearTimeout(window.__deb);
        window.__deb = setTimeout(convert, 120);
    });

    bindFaq();
});
