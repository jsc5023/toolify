const $ = (id) => document.getElementById(id);

const inputEl = $("input");
const outputEl = $("output");
const statsEl = $("stats");

const pasteBtn = $("paste-btn");
const clearBtn = $("clear-btn");
const copyBtn = $("copy-btn");
const runBtn = $("run-btn");
const liveEl = $("live");

/* 기본 옵션 */
const normalizeEolEl = $("normalize-eol");
const trimWholeEl = $("trim-whole");
const trimLinesEl = $("trim-lines");
const removeTrailingEl = $("remove-trailing");
const collapseBlankLinesEl = $("collapse-blank-lines");
const blankMaxEl = $("blank-max");
const removeInvisibleEl = $("remove-invisible");

/* 고급 옵션 */
const advancedToggleBtn = $("advanced-toggle");
const advancedPanel = $("advanced-panel");

const collapseSpacesEl = $("collapse-spaces");
const tabsToSpacesEl = $("tabs-to-spaces");
const tabSizeEl = $("tab-size");

const uniqueLinesEl = $("unique-lines");
const uniqueCiEl = $("unique-ci");

const sortLinesEl = $("sort-lines");
const sortOrderEl = $("sort-order");
const sortNumericEl = $("sort-numeric");

const linePrefixEl = $("line-prefix");
const lineSuffixEl = $("line-suffix");
const affixNonEmptyEl = $("affix-nonempty");

/* 프리셋 버튼 */
const presetBtns = document.querySelectorAll(".preset-btn");

/* =========================
   UI 이벤트
========================= */

/* 고급 옵션 토글 */
advancedToggleBtn.addEventListener("click", () => {
    const isOpen = !advancedPanel.classList.contains("hidden");
    if (isOpen) {
        advancedPanel.classList.add("hidden");
        advancedToggleBtn.setAttribute("aria-expanded", "false");
        advancedToggleBtn.textContent = "고급 옵션 펼치기 ▾";
    } else {
        advancedPanel.classList.remove("hidden");
        advancedToggleBtn.setAttribute("aria-expanded", "true");
        advancedToggleBtn.textContent = "고급 옵션 접기 ▴";
    }
});

/* 탭 옵션 enable/disable */
tabsToSpacesEl.addEventListener("change", () => {
    tabSizeEl.disabled = !tabsToSpacesEl.checked;
    run();
});

/* 정렬 옵션 enable/disable */
sortLinesEl.addEventListener("change", () => {
    sortOrderEl.disabled = !sortLinesEl.checked;
    run();
});

/* 옵션 변경 시 자동 반영 */
[
    normalizeEolEl, trimWholeEl, trimLinesEl, removeTrailingEl,
    collapseBlankLinesEl, blankMaxEl, removeInvisibleEl,
    collapseSpacesEl, tabsToSpacesEl, tabSizeEl,
    uniqueLinesEl, uniqueCiEl,
    sortLinesEl, sortOrderEl, sortNumericEl,
    linePrefixEl, lineSuffixEl, affixNonEmptyEl
].forEach((el) => el.addEventListener("change", () => run()));

/* 입력 즉시 정리 */
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
        copyBtn.textContent = "복사됨!";
        setTimeout(() => (copyBtn.textContent = "결과 복사"), 900);
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

/* 프리셋 */
presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        const preset = btn.dataset.preset;
        applyPreset(preset);
        run();
    });
});

/* =========================
   핵심 로직
========================= */

function applyPreset(name) {
    // 공통 초기화(안전)
    normalizeEolEl.checked = true;
    removeTrailingEl.checked = true;
    removeInvisibleEl.checked = true;

    // 기본값
    trimLinesEl.checked = true;
    trimWholeEl.checked = true;
    collapseBlankLinesEl.checked = true;
    blankMaxEl.value = "1";

    // 고급 초기화
    collapseSpacesEl.checked = false;
    tabsToSpacesEl.checked = false;
    tabSizeEl.value = "4";
    tabSizeEl.disabled = true;

    uniqueLinesEl.checked = false;
    uniqueCiEl.checked = false;

    sortLinesEl.checked = false;
    sortOrderEl.value = "asc";
    sortOrderEl.disabled = true;
    sortNumericEl.checked = true;

    linePrefixEl.value = "";
    lineSuffixEl.value = "";
    affixNonEmptyEl.checked = true;

    if (name === "text") {
        // 일반 텍스트: 깔끔하게
        // (기본값 그대로)
    } else if (name === "code") {
        // 코드: 들여쓰기/공백 보존 쪽으로 안전하게
        trimLinesEl.checked = false;
        trimWholeEl.checked = false;
        collapseBlankLinesEl.checked = false;
        collapseSpacesEl.checked = false;
        tabsToSpacesEl.checked = false;

        // 고급 패널을 굳이 열 필요 없음
    } else if (name === "list") {
        // 리스트: 빈 줄 제거 + 중복 제거 + 정렬
        trimLinesEl.checked = true;
        trimWholeEl.checked = true;
        collapseBlankLinesEl.checked = true;
        blankMaxEl.value = "0";

        uniqueLinesEl.checked = true;
        uniqueCiEl.checked = false;

        sortLinesEl.checked = true;
        sortOrderEl.disabled = false;
        sortOrderEl.value = "asc";
        sortNumericEl.checked = true;
    }
}

function cleanText(text, opt) {
    let s = text;
    let changes = 0;

    // 1) 보이지 않는 문자 제거 (ZWSP, BOM 등)
    if (opt.removeInvisible) {
        const before = s;
        s = s.replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, "");
        if (s !== before) changes++;
    }

    // 2) 개행 통일 (CRLF/CR -> LF)
    if (opt.normalizeEol) {
        const before = s;
        s = s.replace(/\r\n?/g, "\n");
        if (s !== before) changes++;
    }

    // 3) 탭 -> 스페이스
    if (opt.tabsToSpaces) {
        const before = s;
        const n = Number(opt.tabSize) || 4;
        s = s.replace(/\t/g, " ".repeat(n));
        if (s !== before) changes++;
    }

    // 4) 줄 끝 공백 제거
    if (opt.removeTrailing) {
        const before = s;
        s = s.replace(/[ \t]+$/gm, "");
        if (s !== before) changes++;
    }

    // 5) 각 줄 좌우 공백 제거
    if (opt.trimLines) {
        const before = s;
        s = s.split("\n").map((line) => line.trim()).join("\n");
        if (s !== before) changes++;
    }

    // 6) 연속 공백/탭 1개로 줄이기 (개행은 유지)
    if (opt.collapseSpaces) {
        const before = s;
        s = s.replace(/[ \t]{2,}/g, " ");
        if (s !== before) changes++;
    }

    // 7) 빈 줄 정리 (연속 개행 제한)
    if (opt.collapseBlankLines) {
        const before = s;
        const max = Number(opt.blankMax);
        const keep = "\n".repeat(Math.max(1, max + 1));
        s = s.replace(/\n{2,}/g, keep);
        if (s !== before) changes++;
    }

    // 8) 중복 줄 제거
    if (opt.uniqueLines) {
        const before = s;
        const lines = s.split("\n");
        const seen = new Set();
        const out = [];

        for (const line of lines) {
            const key = opt.uniqueCi ? line.toLowerCase() : line;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(line);
        }

        s = out.join("\n");
        if (s !== before) changes++;
    }

    // 9) 줄 정렬
    if (opt.sortLines) {
        const before = s;
        const lines = s.split("\n");

        const collator = new Intl.Collator("ko", {
            numeric: !!opt.sortNumeric,
            sensitivity: "base"
        });

        lines.sort((a, b) => collator.compare(a, b));
        if (opt.sortOrder === "desc") lines.reverse();

        s = lines.join("\n");
        if (s !== before) changes++;
    }

    // 10) prefix/suffix
    if ((opt.prefix && opt.prefix.length) || (opt.suffix && opt.suffix.length)) {
        const before = s;
        const lines = s.split("\n");
        const out = lines.map((line) => {
            if (opt.affixNonEmpty && line.length === 0) return line;
            return `${opt.prefix}${line}${opt.suffix}`;
        });
        s = out.join("\n");
        if (s !== before) changes++;
    }

    // 11) 전체 trim
    if (opt.trimWhole) {
        const before = s;
        s = s.trim();
        if (s !== before) changes++;
    }

    return { text: s, changes };
}

function run() {
    const raw = inputEl.value ?? "";

    const opt = {
        // basic
        removeInvisible: removeInvisibleEl.checked,
        normalizeEol: normalizeEolEl.checked,
        removeTrailing: removeTrailingEl.checked,
        trimLines: trimLinesEl.checked,
        collapseBlankLines: collapseBlankLinesEl.checked,
        blankMax: blankMaxEl.value,
        trimWhole: trimWholeEl.checked,

        // advanced
        collapseSpaces: collapseSpacesEl.checked,
        tabsToSpaces: tabsToSpacesEl.checked,
        tabSize: tabSizeEl.value,

        uniqueLines: uniqueLinesEl.checked,
        uniqueCi: uniqueCiEl.checked,

        sortLines: sortLinesEl.checked,
        sortOrder: sortOrderEl.value,
        sortNumeric: sortNumericEl.checked,

        prefix: linePrefixEl.value ?? "",
        suffix: lineSuffixEl.value ?? "",
        affixNonEmpty: affixNonEmptyEl.checked
    };

    const { text: cleaned, changes } = cleanText(raw, opt);
    outputEl.value = cleaned;
    renderStats(raw, cleaned, changes);
}

function renderStats(before, after, changes) {
    const inLines = before.length ? before.split(/\r\n|\r|\n/).length : 0;
    const outLines = after.length ? after.split(/\r\n|\r|\n/).length : 0;
    statsEl.textContent = `입력 ${before.length}자 / ${inLines}줄 → 결과 ${after.length}자 / ${outLines}줄 · 변경 ${changes}`;
}

/* 최초 1회: 기본 프리셋(일반 텍스트) 느낌으로 */
applyPreset("text");
run();
