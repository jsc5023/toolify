const $ = (id) => document.getElementById(id);

/* Elements */
const inputEl = $("input");
const outputEl = $("output");
const statsEl = $("stats");

const pasteBtn = $("paste-btn");
const clearBtn = $("clear-btn");
const copyBtn = $("copy-btn");
const runBtn = $("run-btn");
const liveEl = $("live");

const modeHelpEl = $("mode-help");
const modeRadios = Array.from(document.querySelectorAll('input[name="mode"]'));

/* Options */
const keepNonNumericEl = $("keep-non-numeric");
const allowPercentEl = $("allow-percent");
const negativeParenthesesEl = $("negative-parentheses");
const trimLinesEl = $("trim-lines");
const decimalsEl = $("decimals");
const roundingEl = $("rounding");
const currencyPrefixEl = $("currency-prefix");
const suffixEl = $("suffix");

/* ====== Live input ====== */
let t = null;
inputEl.addEventListener("input", () => {
    if (!liveEl.checked) return;
    clearTimeout(t);
    t = setTimeout(run, 120);
});

runBtn.addEventListener("click", run);

clearBtn.addEventListener("click", () => {
    inputEl.value = "";
    outputEl.value = "";
    renderStats({ total: 0, converted: 0, kept: 0, errors: 0 });
});

copyBtn.addEventListener("click", async () => {
    const text = outputEl.value;
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        const prev = copyBtn.textContent;
        copyBtn.textContent = "복사됨!";
        setTimeout(() => (copyBtn.textContent = prev), 900);
    } catch {
        outputEl.focus();
        outputEl.select();
        document.execCommand("copy");
    }
});

pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (typeof text === "string") {
            inputEl.value = text;
            run();
        }
    } catch {
        inputEl.focus();
    }
});

/* ====== Mode ====== */
function getMode() {
    const checked = modeRadios.find((r) => r.checked);
    return checked ? checked.value : "add-commas";
}

function renderModeHelp(mode) {
    if (mode === "add-commas") {
        modeHelpEl.textContent = "콤마 추가: 숫자(정수/소수)에 천 단위 콤마를 넣어 보기 좋게 표시합니다.";
    } else if (mode === "remove-commas") {
        modeHelpEl.textContent = "콤마/공백 제거: 1,234,567 / ₩1,234 같은 입력에서 숫자만 추출합니다.";
    } else {
        modeHelpEl.textContent = "소수점 고정: 지정한 자리수로 반올림한 뒤 0을 채워 고정 표기합니다.";
    }
}

modeRadios.forEach((r) => {
    r.addEventListener("change", () => {
        renderModeHelp(getMode());
        run();
    });
});

/* ====== Parsing & Formatting ====== */
function normalizeLine(line, opt) {
    let s = line;

    if (opt.trimLines) s = s.trim();

    // 빈 줄
    if (s.length === 0) return { kind: "empty", out: "" };

    // 퍼센트 허용: "12.3%" → "12.3"
    if (opt.allowPercent) s = s.replace(/%/g, "");

    // 통화 기호/문자 제거(대충): 숫자, +/-, 소수점, 콤마, 공백만 남기고 나머지 제거
    // (remove-commas 모드일 때 특히 유용)
    s = s.replace(/[^\d+\-.,\s]/g, "");

    // 공백 제거
    s = s.replace(/\s+/g, "");

    // 콤마 제거
    s = s.replace(/,/g, "");

    // 유효 숫자 형태인지 검사
    // 허용: +123, -123, 123.45, .5(이건 싫으면 막아도 됨)
    if (!/^[+\-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) {
        return { kind: "non-numeric", out: line };
    }

    const n = Number(s);
    if (!Number.isFinite(n)) {
        return { kind: "error", out: line };
    }

    return { kind: "number", value: n };
}

function roundTo(n, digits, mode) {
    const d = Number(digits) || 0;
    const factor = Math.pow(10, d);

    if (mode === "floor") return Math.floor(n * factor) / factor;
    if (mode === "ceil") return Math.ceil(n * factor) / factor;
    return Math.round(n * factor) / factor;
}

function addCommas(str) {
    // str: "1234" or "1234.50" or "-1234.50"
    const sign = str.startsWith("-") ? "-" : "";
    const raw = sign ? str.slice(1) : str;

    const [intPart, decPart] = raw.split(".");
    const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${sign}${withComma}.${decPart}` : `${sign}${withComma}`;
}

function formatNumber(n, opt) {
    const mode = opt.mode;

    let val = n;

    // fixed-decimals 모드에서는 반올림 + 자리 고정
    if (mode === "fixed-decimals") {
        val = roundTo(val, opt.decimals, opt.rounding);
        const s = val.toFixed(Number(opt.decimals) || 0);
        return applyAffixes(applyNegStyle(addCommas(s), opt), opt);
    }

    // add-commas 모드: 값 그대로(필요하면 옵션으로 자리수 반올림을 붙일 수도 있음)
    if (mode === "add-commas") {
        // 소수는 원본 그대로 살리고 싶으니 String 변환
        // 하지만 JS 부동소수점 문제를 피하려면 fixed 옵션을 쓰는 게 안정적
        const s = String(val);
        return applyAffixes(applyNegStyle(addCommas(s), opt), opt);
    }

    // remove-commas 모드: 숫자만 출력(콤마 없이)
    // (여기서는 suffix/prefix 적용 가능)
    const s = String(val);
    return applyAffixes(applyNegStyle(s, opt), opt);
}

function applyNegStyle(s, opt) {
    if (!opt.negativeParentheses) return s;

    if (s.startsWith("-")) {
        return `(${s.slice(1)})`;
    }
    return s;
}

function applyAffixes(s, opt) {
    const prefix = (opt.prefix || "").trim();
    const suffix = (opt.suffix || "").trim();
    return `${prefix}${s}${suffix}`;
}

/* ====== Run ====== */
function run() {
    const raw = inputEl.value ?? "";
    const lines = raw.split("\n");

    const opt = {
        mode: getMode(),
        keepNonNumeric: keepNonNumericEl.checked,
        allowPercent: allowPercentEl.checked,
        negativeParentheses: negativeParenthesesEl.checked,
        trimLines: trimLinesEl.checked,
        decimals: decimalsEl.value,
        rounding: roundingEl.value,
        prefix: currencyPrefixEl.value || "",
        suffix: suffixEl.value || ""
    };

    let converted = 0;
    let kept = 0;
    let errors = 0;

    const outLines = [];

    for (const line of lines) {
        const parsed = normalizeLine(line, opt);

        if (parsed.kind === "empty") {
            outLines.push("");
            kept++;
            continue;
        }

        if (parsed.kind === "number") {
            outLines.push(formatNumber(parsed.value, opt));
            converted++;
            continue;
        }

        if (parsed.kind === "error") {
            // 숫자로 파싱은 됐는데 이상한 케이스
            if (opt.keepNonNumeric) outLines.push(line);
            errors++;
            continue;
        }

        // non-numeric
        if (opt.keepNonNumeric) {
            outLines.push(line);
            kept++;
        } else {
            // 유지 안 함: 제거
            errors++;
        }
    }

    outputEl.value = outLines.join("\n");
    renderStats({ total: lines.length, converted, kept, errors });
}

function renderStats({ total, converted, kept, errors }) {
    statsEl.textContent = `처리 ${total}줄 · 변환 ${converted}줄 · 유지 ${kept}줄 · 오류 ${errors}줄`;
}

/* Init */
renderModeHelp(getMode());
run();

/* 옵션 변경 시 재실행 */
[
    keepNonNumericEl, allowPercentEl, negativeParenthesesEl, trimLinesEl,
    decimalsEl, roundingEl, currencyPrefixEl, suffixEl
].forEach((el) => el.addEventListener("change", () => run()));
