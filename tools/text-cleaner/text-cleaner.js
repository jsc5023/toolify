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

/* Mode */
const modeHelpEl = $("mode-help");
const modeRadios = Array.from(document.querySelectorAll('input[name="mode"]'));

/* Basic options */
const normalizeEolEl = $("normalize-eol");
const trimWholeEl = $("trim-whole");
const removeTrailingEl = $("remove-trailing");
const removeInvisibleEl = $("remove-invisible");
const collapseBlankLinesEl = $("collapse-blank-lines");
const blankMaxEl = $("blank-max");

/* Advanced */
const advancedToggle = $("advanced-toggle");
const advancedPanel = $("advanced-panel");
const trimLinesEl = $("trim-lines");
const collapseSpacesEl = $("collapse-spaces");
const tabsToSpacesEl = $("tabs-to-spaces");
const tabSizeEl = $("tab-size");

/* Remove (danger) */
const removeToggle = $("remove-toggle");
const removePanel = $("remove-panel");
const removeBracketsEl = $("remove-brackets");
const removeEnglishEl = $("remove-english");
const removeHanjaEl = $("remove-hanja");
const removeSpecialEl = $("remove-special");
const keepCharsEl = $("keep-chars");

/* ====== Toggle UI (Advanced / Remove) ====== */
function bindToggle(btn, panel) {
    btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!isOpen));
        panel.hidden = isOpen;
        const icon = btn.querySelector(".toggle-icon");
        if (icon) icon.textContent = isOpen ? "+" : "–";
    });
}
bindToggle(advancedToggle, advancedPanel);
bindToggle(removeToggle, removePanel);

/* ====== FAQ accordion (fallback if main.js doesn't handle) ====== */
document.querySelectorAll(".faq-item .faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        if (!item) return;
        item.classList.toggle("active");
    });
});

/* ====== Tab option enable/disable ====== */
tabsToSpacesEl.addEventListener("change", () => {
    tabSizeEl.disabled = !tabsToSpacesEl.checked;
    run();
});

/* ====== Re-run when option changes ====== */
[
    normalizeEolEl, trimWholeEl, removeTrailingEl, removeInvisibleEl,
    collapseBlankLinesEl, blankMaxEl,
    trimLinesEl, collapseSpacesEl, tabsToSpacesEl, tabSizeEl,
    removeBracketsEl, removeEnglishEl, removeHanjaEl, removeSpecialEl, keepCharsEl
].forEach((el) => el.addEventListener("change", () => run()));

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
    renderStats("", "", 0);
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

/* ====== Mode presets ====== */
function getMode() {
    const checked = modeRadios.find(r => r.checked);
    return checked ? checked.value : "normal";
}

function applyPreset(mode) {
    // 기본 옵션은 모두 안전한 범주 → 기본 ON 유지
    normalizeEolEl.checked = true;
    trimWholeEl.checked = true;
    removeTrailingEl.checked = true;
    removeInvisibleEl.checked = true;
    collapseBlankLinesEl.checked = true;

    // 모드별 추천
    if (mode === "normal") {
        blankMaxEl.value = "1";
        trimLinesEl.checked = false;      // 코드/정렬 고려해서 기본 OFF (원하면 고급에서 켜기)
        collapseSpacesEl.checked = false;
        tabsToSpacesEl.checked = false;
    }

    if (mode === "webnovel") {
        blankMaxEl.value = "1";
        trimLinesEl.checked = false;      // 웹소설은 줄 앞 공백이 의미 있을 수 있어 기본 OFF
        collapseSpacesEl.checked = true;  // 문장 합치면서 중복 공백 줄이는 게 보통 유리
        tabsToSpacesEl.checked = false;
    }

    if (mode === "continuous") {
        blankMaxEl.value = "0";           // 문단 사이 빈 줄 제거
        trimLinesEl.checked = true;       // 연속 텍스트는 줄 정리 함께 하는 게 보통 유리
        collapseSpacesEl.checked = false;
        tabsToSpacesEl.checked = false;
    }

    tabSizeEl.disabled = !tabsToSpacesEl.checked;

    // 제거 옵션은 항상 기본 OFF (사용자 의도 없으면 위험)
    // (사용자가 켜둔 건 유지하고 싶으면 아래 줄을 지우면 됨)
    // removeBracketsEl.checked = removeEnglishEl.checked = removeHanjaEl.checked = removeSpecialEl.checked = false;

    renderModeHelp(mode);
}

function renderModeHelp(mode) {
    if (mode === "normal") {
        modeHelpEl.textContent = "기본 문단 정리: 연속 빈 줄을 보기 좋게 정리하고, 줄 끝 공백/보이지 않는 문자를 함께 제거합니다.";
    } else if (mode === "webnovel") {
        modeHelpEl.textContent = "웹소설 줄바꿈 합치기: 빈 줄(문단)은 유지하고, 문단 내부의 줄바꿈만 공백으로 합쳐 읽기 좋게 만듭니다.";
    } else {
        modeHelpEl.textContent = "연속 텍스트 만들기: 문단 사이 빈 줄을 제거하여 연속된 텍스트처럼 보이게 만듭니다.";
    }
}

modeRadios.forEach(r => {
    r.addEventListener("change", () => {
        applyPreset(getMode());
        run();
    });
});

/* ====== Helpers for character checks ====== */
function isWhitespace(ch) {
    return ch === " " || ch === "\n" || ch === "\t" || ch === "\r" || ch === "\f" || ch === "\v";
}
function isDigit(ch) {
    const c = ch.charCodeAt(0);
    return c >= 48 && c <= 57;
}
function isEnglish(ch) {
    const c = ch.charCodeAt(0);
    return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}
function isHangul(ch) {
    const c = ch.charCodeAt(0);
    // Hangul Syllables + Jamo + Compatibility Jamo
    return (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || (c >= 0x3130 && c <= 0x318F);
}
let hanjaRegex = null;
try {
    hanjaRegex = new RegExp("\\p{Script=Han}", "u");
} catch {
    hanjaRegex = null;
}
function isHanja(ch) {
    if (hanjaRegex) return hanjaRegex.test(ch);
    const c = ch.charCodeAt(0);
    // CJK Unified Ideographs + Extension A + Compatibility Ideographs
    return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0xF900 && c <= 0xFAFF);
}

function escapeForSet(str) {
    return (str || "").replace(/[\]\\\-^]/g, "\\$&");
}

/* ====== Core cleaner ====== */
function removeInvisible(s) {
    // ZWSP, ZWNJ, ZWJ, WORD JOINER, BOM
    return s.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "");
}

function normalizeEol(s) {
    return s.replace(/\r\n?/g, "\n");
}

/* 괄호 및 내용 제거: 얕은 중첩은 반복으로 어느정도 처리 */
function removeBracketContents(s) {
    const patterns = [
        /\([^()]*\)/g,
        /\[[^\[\]]*\]/g,
        /\{[^{}]*\}/g,
        /<[^<>]*>/g
    ];

    let out = s;
    for (let loop = 0; loop < 10; loop++) {
        const before = out;
        patterns.forEach((re) => {
            out = out.replace(re, "");
        });
        if (out === before) break;
    }
    return out;
}

function collapseSpaces(s) {
    // 줄바꿈은 유지, 공백/탭만 압축
    return s.replace(/[ \t]{2,}/g, " ");
}

function tabsToSpaces(s, n) {
    return s.replace(/\t/g, " ".repeat(n));
}

function removeTrailingSpaces(s) {
    return s.replace(/[ \t]+$/gm, "");
}

function trimLines(s) {
    return s.split("\n").map(line => line.trim()).join("\n");
}

function limitBlankLines(s, blankMax) {
    const max = Number(blankMax);
    const keep = "\n".repeat(Math.max(1, max + 1)); // 0이면 "\n", 1이면 "\n\n"
    return s.replace(/\n{2,}/g, keep);
}

/* 웹소설 모드: 문단(빈 줄 기준) 유지 + 문단 내부 줄바꿈만 합치기 */
function webnovelMergeSoftLinebreaks(s, blankMax) {
    // 먼저 개행 통일 & 줄끝공백 제거가 있으면 좋음(외부에서 이미 수행)
    // 문단 구분: \n{2,}
    const parts = s.split(/\n{2,}/);
    const merged = parts.map(p => {
        // 문단 내부 줄바꿈을 공백으로
        const x = p.replace(/\n+/g, " ");
        // 중복 공백 정리
        return x.replace(/[ \t]{2,}/g, " ").trim();
    });

    const max = Number(blankMax);
    const sep = "\n".repeat(Math.max(1, max + 1));
    return merged.join(sep);
}

/* 특수문자 제거: 허용 범주 외 제거(문장부호 일부 + 사용자 보존) */
function removeSpecialChars(s, opt) {
    const baseKeep = '.,?!""\'\'“”‘’';
    const extraKeep = keepCharsEl ? (keepCharsEl.value || "") : "";
    const keepSet = new Set((baseKeep + extraKeep).split(""));

    const allowEnglish = !opt.removeEnglish;
    const allowHanja = !opt.removeHanja;

    let out = "";
    for (const ch of s) {
        if (isWhitespace(ch) || isDigit(ch) || isHangul(ch)) {
            out += ch;
            continue;
        }
        if (allowEnglish && isEnglish(ch)) {
            out += ch;
            continue;
        }
        if (allowHanja && isHanja(ch)) {
            out += ch;
            continue;
        }
        if (keepSet.has(ch)) {
            out += ch;
            continue;
        }
        // 그 외는 제거
    }
    return out;
}

function cleanText(text, opt) {
    let s = text;
    let changes = 0;

    const beforeAll = s;

    // 1) 보이지 않는 문자 제거
    if (opt.removeInvisible) {
        const before = s;
        s = removeInvisible(s);
        if (s !== before) changes++;
    }

    // 2) 개행 통일
    if (opt.normalizeEol) {
        const before = s;
        s = normalizeEol(s);
        if (s !== before) changes++;
    }

    // 3) 제거 옵션(주의) - 의미가 바뀌는 것들
    if (opt.removeBrackets) {
        const before = s;
        s = removeBracketContents(s);
        if (s !== before) changes++;
    }

    if (opt.removeEnglish) {
        const before = s;
        s = s.replace(/[A-Za-z]/g, "");
        if (s !== before) changes++;
    }

    if (opt.removeHanja) {
        const before = s;
        if (hanjaRegex) s = s.replace(/\p{Script=Han}/gu, "");
        else s = s.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, "");
        if (s !== before) changes++;
    }

    // 4) 탭 → 스페이스 (고급)
    if (opt.tabsToSpaces) {
        const before = s;
        const n = Number(opt.tabSize) || 4;
        s = tabsToSpaces(s, n);
        if (s !== before) changes++;
    }

    // 5) 줄 끝 공백 제거
    if (opt.removeTrailing) {
        const before = s;
        s = removeTrailingSpaces(s);
        if (s !== before) changes++;
    }

    // 6) 모드 처리
    if (opt.mode === "webnovel") {
        const before = s;
        s = webnovelMergeSoftLinebreaks(s, opt.blankMax);
        if (s !== before) changes++;
    } else if (opt.mode === "continuous") {
        // 문단 사이 빈 줄 제거: blankMax를 0으로 간주
        const before = s;
        s = limitBlankLines(s, 0);
        if (s !== before) changes++;
    } else {
        // normal: 별도 없음
    }

    // 7) 각 줄 trim (고급)
    if (opt.trimLines) {
        const before = s;
        s = trimLines(s);
        if (s !== before) changes++;
    }

    // 8) 연속 공백/탭 1개로 (고급)
    if (opt.collapseSpaces) {
        const before = s;
        s = collapseSpaces(s);
        if (s !== before) changes++;
    }

    // 9) 빈 줄 정리 (기본)
    if (opt.collapseBlankLines && opt.mode !== "continuous") {
        const before = s;
        s = limitBlankLines(s, opt.blankMax);
        if (s !== before) changes++;
    }

    // 10) 특수문자 제거 (주의)
    if (opt.removeSpecial) {
        const before = s;
        s = removeSpecialChars(s, opt);
        if (s !== before) changes++;
    }

    // 11) 전체 trim
    if (opt.trimWhole) {
        const before = s;
        s = s.trim();
        if (s !== before) changes++;
    }

    // 아무 것도 안 바뀌었으면 changes 0 유지
    if (beforeAll === s) changes = 0;

    return { text: s, changes };
}

/* ====== Run ====== */
function run() {
    const raw = inputEl.value ?? "";

    const mode = getMode();

    const opt = {
        mode,
        normalizeEol: normalizeEolEl.checked,
        trimWhole: trimWholeEl.checked,
        removeTrailing: removeTrailingEl.checked,
        removeInvisible: removeInvisibleEl.checked,
        collapseBlankLines: collapseBlankLinesEl.checked,
        blankMax: blankMaxEl.value,

        trimLines: trimLinesEl.checked,
        collapseSpaces: collapseSpacesEl.checked,
        tabsToSpaces: tabsToSpacesEl.checked,
        tabSize: tabSizeEl.value,

        removeBrackets: removeBracketsEl.checked,
        removeEnglish: removeEnglishEl.checked,
        removeHanja: removeHanjaEl.checked,
        removeSpecial: removeSpecialEl.checked
    };

    // 모드에 따라 blankMax select 의미를 조금 다르게 안내할 수 있음(여기선 로직만)
    const { text: cleaned, changes } = cleanText(raw, opt);
    outputEl.value = cleaned;
    renderStats(raw, cleaned, changes);
}

function renderStats(before, after, changes) {
    statsEl.textContent = `입력 ${before.length}자 → 결과 ${after.length}자 · 변경 ${changes}`;
}

/* ====== Init ====== */
applyPreset(getMode());
run();
