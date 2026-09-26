/*
 * 전화번호 추출·정리
 * 파이프라인: candidate extraction -> normalization -> pattern validation
 *            -> classification -> formatting -> deduplication
 * 모든 처리는 브라우저 내부에서만 이루어지며 입력/결과를 어디로도 전송하지 않는다.
 */
const $ = (id) => document.getElementById(id);

/* ====== 0. 설정: 전화번호 규칙을 한 곳에서 관리 ====== */
const MAX_INPUT_CHARS = 300000;
const SEP = "[-.\\s/]?";

// 자리수 판단 근거: 국번(prefix) 뒤에 오는 가입자 번호(body)가 7자리(기존)
// 또는 8자리(현재 표준)인 국내 유선/이동전화 체계를 기준으로 한다.
const DOMESTIC_GROUPS = [
    {
        id: "mobile",
        label: "휴대폰",
        prefixes: ["010"],
        lens: [7, 8],
        allowParens: false
    },
    {
        // 011/016/017/018/019는 2G/3G 시절 이동전화 국번이었다. 010으로 번호이동된
        // 경우가 많지만 실제 매핑 정보가 없어 자동 변환하지 않고 별도 유형으로만 분류한다.
        id: "legacy",
        label: "01X",
        prefixes: ["011", "016", "017", "018", "019"],
        lens: [7, 8],
        allowParens: false
    },
    {
        id: "area",
        label: "지역전화",
        prefixes: [
            "02",
            "031", "032", "033",
            "041", "042", "043", "044",
            "051", "052", "053", "054", "055",
            "061", "062", "063", "064"
        ],
        lens: [7, 8],
        allowParens: true
    },
    {
        id: "voip",
        label: "070",
        prefixes: ["070"],
        lens: [8],
        allowParens: false
    },
    {
        // 050 안심번호(050X), 060, 080은 사업자·서비스에 따라 자리수 편차가 있어
        // 6~8자리 body 범위를 폭넓게 허용한다. (완료 보고의 "확인 필요 규칙" 참고)
        id: "special",
        label: "특수/서비스",
        prefixes: ["0502", "0503", "0504", "0505", "0506", "0507", "0508", "0509", "060", "080"],
        lens: [6, 7, 8],
        allowParens: false
    }
];

const FILTER_LABELS = {
    all: "전체",
    mobile: "휴대폰",
    legacy: "01X",
    area: "지역전화",
    voip: "070",
    special: "특수/서비스",
    representative: "대표번호",
    confirm: "확인 필요"
};

const FILTER_ORDER = ["all", "mobile", "legacy", "area", "voip", "special", "representative", "confirm"];

/* ====== 1. candidate extraction ====== */
function altGroup(list) {
    return `(?:${list.join("|")})`;
}

function digitsBlob(n) {
    return Array.from({ length: n }, () => "\\d").join(SEP);
}

function buildValidRegexes() {
    const rules = [];
    DOMESTIC_GROUPS.forEach((group) => {
        const prefixLiteral = altGroup(group.prefixes);
        const prefixPart = group.allowParens
            ? `(?:\\(${prefixLiteral}\\)${SEP}|${prefixLiteral})`
            : prefixLiteral;
        group.lens.forEach((len) => {
            rules.push({
                groupId: group.id,
                label: group.label,
                kind: "valid",
                re: new RegExp(`(?<!\\d)(${prefixPart})${SEP}(${digitsBlob(len)})(?!\\d)`, "g")
            });
        });
    });
    return rules;
}

function buildNearMissRegexes() {
    // 정의된 자리수보다 정확히 한 자리 짧은 경우만 "확인 필요"로 넓게 잡는다.
    // (과도한 확대 추출을 피하기 위해 한 자리 오차만 허용)
    const rules = [];
    DOMESTIC_GROUPS.forEach((group) => {
        const minLen = Math.min(...group.lens);
        const nearLen = minLen - 1;
        if (nearLen < 4) return;
        const prefixLiteral = altGroup(group.prefixes);
        rules.push({
            groupId: group.id,
            label: group.label,
            kind: "nearmiss",
            re: new RegExp(`(?<!\\d)(${prefixLiteral})${SEP}(${digitsBlob(nearLen)})(?!\\d)`, "g")
        });
    });
    return rules;
}

// 15xx / 16xx / 18xx 형태의 8자리 전국대표번호 (트렁크 0 없음)
const REPRESENTATIVE_REGEX = new RegExp(`(?<!\\d)(1[568]\\d{2})${SEP}(${digitsBlob(4)})(?!\\d)`, "g");
// +82 뒤 트렁크 0이 생략된 7~11자리 국내번호
const INTL_REGEX = new RegExp(`(?<!\\d)\\+82${SEP}((?:\\d${SEP}){6,10}\\d)(?!\\d)`, "g");

// 정규식 목록은 모듈 로드 시 한 번만 만들어 재사용한다.
// (표 모드에서 셀 단위로 extractPhones를 수천 번 호출해도 매번 재컴파일하지 않도록)
const VALID_RULES = buildValidRegexes();
const NEARMISS_RULES = buildNearMissRegexes();

function onlyDigits(str) {
    return (str || "").replace(/\D/g, "");
}

/* ====== 2~3. normalization + pattern validation ====== */
function matchDomesticExact(digits) {
    for (const group of DOMESTIC_GROUPS) {
        const sortedPrefixes = [...group.prefixes].sort((a, b) => b.length - a.length);
        for (const prefix of sortedPrefixes) {
            if (!digits.startsWith(prefix)) continue;
            const bodyLen = digits.length - prefix.length;
            if (group.lens.includes(bodyLen)) {
                return {
                    groupId: group.id,
                    label: group.label,
                    prefixDigits: prefix,
                    bodyDigits: digits.slice(prefix.length)
                };
            }
        }
    }
    return null;
}

function collectCandidates(text) {
    const candidates = [];

    VALID_RULES.forEach((rule) => {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(text))) {
            candidates.push({
                start: m.index,
                end: m.index + m[0].length,
                raw: m[0],
                groupId: rule.groupId,
                label: rule.label,
                kind: "valid",
                prefixDigits: onlyDigits(m[1]),
                bodyDigits: onlyDigits(m[2])
            });
        }
    });

    NEARMISS_RULES.forEach((rule) => {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(text))) {
            candidates.push({
                start: m.index,
                end: m.index + m[0].length,
                raw: m[0],
                groupId: rule.groupId,
                label: rule.label,
                kind: "nearmiss",
                prefixDigits: onlyDigits(m[1]),
                bodyDigits: onlyDigits(m[2])
            });
        }
    });

    {
        const re = REPRESENTATIVE_REGEX;
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text))) {
            candidates.push({
                start: m.index,
                end: m.index + m[0].length,
                raw: m[0],
                groupId: "representative",
                label: "대표번호",
                kind: "valid",
                prefixDigits: m[1],
                bodyDigits: onlyDigits(m[2])
            });
        }
    }

    {
        const re = INTL_REGEX;
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text))) {
            const reconstructed = "0" + onlyDigits(m[1]);
            const resolved = matchDomesticExact(reconstructed);
            if (resolved) {
                candidates.push({
                    start: m.index,
                    end: m.index + m[0].length,
                    raw: m[0],
                    groupId: resolved.groupId,
                    label: resolved.label,
                    kind: "valid",
                    prefixDigits: resolved.prefixDigits,
                    bodyDigits: resolved.bodyDigits
                });
            }
        }
    }

    return candidates;
}

// 규칙 26: 긴 숫자열 내부에서 부분 전화번호를 잘라내지 않도록,
// 서로 겹치는 후보 중 하나만 남긴다. (정상 매치 우선, 그다음 더 긴 매치 우선)
function resolveOverlaps(candidates) {
    const sorted = [...candidates].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        const lenA = a.end - a.start;
        const lenB = b.end - b.start;
        if (lenA !== lenB) return lenB - lenA;
        if (a.kind !== b.kind) return a.kind === "valid" ? -1 : 1;
        return 0;
    });

    const accepted = [];
    let lastEnd = -1;
    for (const c of sorted) {
        if (c.start >= lastEnd) {
            accepted.push(c);
            lastEnd = c.end;
        }
    }
    return accepted.sort((a, b) => a.start - b.start);
}

/* ====== 4~5. classification + formatting ====== */
function formatDomestic(prefixDigits, bodyDigits) {
    if (bodyDigits.length <= 4) return `${prefixDigits}-${bodyDigits}`;
    const head = bodyDigits.slice(0, bodyDigits.length - 4);
    const tail = bodyDigits.slice(-4);
    return `${prefixDigits}-${head}-${tail}`;
}

function buildEntries(candidates) {
    return candidates.map((c) => {
        const canonical = c.prefixDigits + c.bodyDigits;
        return {
            ...c,
            canonical,
            formatted: c.kind === "valid" ? formatDomestic(c.prefixDigits, c.bodyDigits) : null
        };
    });
}

/* ====== 6. deduplication ====== */
function dedupe(list) {
    const seen = new Map();
    const order = [];
    list.forEach((entry) => {
        const existing = seen.get(entry.canonical);
        if (existing) {
            existing.count += 1;
        } else {
            seen.set(entry.canonical, { ...entry, count: 1 });
            order.push(entry.canonical);
        }
    });
    return order.map((key) => seen.get(key));
}

function extractPhones(text) {
    const candidates = collectCandidates(text);
    const resolved = resolveOverlaps(candidates);
    const entries = buildEntries(resolved);
    return {
        valid: entries.filter((e) => e.kind === "valid"),
        confirm: entries.filter((e) => e.kind === "nearmiss")
    };
}

/* ====== UI 상태 ====== */
const inputEl = $("input");
const outputEl = $("output");
const summaryEl = $("summary");
const emptyNoteEl = $("empty-note");
const lengthWarningEl = $("length-warning");
const liveEl = $("live");
const pasteBtn = $("paste-btn");
const resetBtn = $("reset-btn");
const sampleBtn = $("sample-btn");
const copyBtn = $("copy-btn");
const copyFeedbackEl = $("copy-feedback");
const dedupEl = $("dedup");
const sortSelect = $("sort-select");
const formatSelect = $("format-select");
const delimiterSelect = $("delimiter-select");
const filterButtons = Array.from(document.querySelectorAll(".pe-filter"));

let lastResult = { valid: [], confirm: [] };
let currentFilter = "all";

const SAMPLE_TEXT = [
    "홍길동 01012345678",
    "회사 문의: 02-1234-5678",
    "김철수 / 010.1234.5678",
    "인터넷전화 070 1234 5678",
    "해외표기 +82 10 9876 5432",
    "대표번호 1588-1588",
    "고객센터(051) 123-4567"
].join("\n");

/* ====== 필터별 개수 계산 ====== */
function countByFilter(validList, confirmList) {
    const counts = { all: validList.length, mobile: 0, legacy: 0, area: 0, voip: 0, special: 0, representative: 0, confirm: confirmList.length };
    validList.forEach((e) => {
        counts[e.groupId] = (counts[e.groupId] || 0) + 1;
    });
    return counts;
}

/* ====== 정렬 ====== */
function applySort(list, sortMode) {
    if (sortMode !== "numeric") return list;
    return [...list].sort((a, b) => Number(a.canonical) - Number(b.canonical));
}

/* ====== 출력 텍스트 구성 ====== */
function entryToOutputText(entry, formatMode, isConfirm) {
    if (isConfirm) return entry.raw.trim();
    if (formatMode === "digits") return entry.canonical;
    if (formatMode === "original") return entry.raw.trim();
    return entry.formatted;
}

function joinWithDelimiter(list, delimiter) {
    const map = { newline: "\n", comma: ", ", tab: "\t" };
    return list.join(map[delimiter] || "\n");
}

/* ====== 렌더링 ====== */
function renderOutput() {
    const dedupOn = dedupEl.checked;
    const sortMode = sortSelect.value;
    const formatMode = formatSelect.value;
    const delimiter = delimiterSelect.value;

    const validSource = dedupOn ? dedupe(lastResult.valid) : lastResult.valid;
    const confirmSource = dedupOn ? dedupe(lastResult.confirm) : lastResult.confirm;

    const uniqueValid = dedupe(lastResult.valid);
    const uniqueConfirm = dedupe(lastResult.confirm);

    const counts = countByFilter(dedupOn ? uniqueValid : validSource, dedupOn ? uniqueConfirm : confirmSource);
    FILTER_ORDER.forEach((key) => {
        const el = document.querySelector(`[data-count="${key}"]`);
        if (el) el.textContent = String(counts[key] || 0);
    });

    const isConfirmFilter = currentFilter === "confirm";
    let list = isConfirmFilter
        ? confirmSource
        : currentFilter === "all"
            ? validSource
            : validSource.filter((e) => e.groupId === currentFilter);

    list = applySort(list, sortMode);

    const textParts = list.map((e) => entryToOutputText(e, formatMode, isConfirmFilter));
    outputEl.value = joinWithDelimiter(textParts, delimiter);

    const totalRaw = lastResult.valid.length + lastResult.confirm.length;
    if (totalRaw === 0) {
        emptyNoteEl.hidden = inputEl.value.trim().length === 0;
        emptyNoteEl.textContent = "전화번호 형식과 일치하는 번호를 찾지 못했어요.";
    } else if (list.length === 0) {
        emptyNoteEl.hidden = false;
        emptyNoteEl.textContent = "선택한 유형에 해당하는 번호가 없어요.";
    } else {
        emptyNoteEl.hidden = true;
    }

    const total = lastResult.valid.length;
    const unique = uniqueValid.length;
    const duplicate = total - unique;
    const confirmCount = uniqueConfirm.length;
    summaryEl.textContent = `발견 ${total}개 · 고유 번호 ${unique}개 · 중복 ${duplicate}개 · 확인 필요 ${confirmCount}개`;
}

function run() {
    let raw = inputEl.value || "";
    let truncated = false;
    if (raw.length > MAX_INPUT_CHARS) {
        raw = raw.slice(0, MAX_INPUT_CHARS);
        truncated = true;
    }
    lengthWarningEl.hidden = !truncated;

    lastResult = extractPhones(raw);
    renderOutput();
}

/* ====== 이벤트 ====== */
let debounceTimer = null;
inputEl.addEventListener("input", () => {
    if (!liveEl.checked) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, 160);
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

sampleBtn.addEventListener("click", () => {
    inputEl.value = SAMPLE_TEXT;
    run();
    inputEl.focus();
});

resetBtn.addEventListener("click", () => {
    inputEl.value = "";
    dedupEl.checked = true;
    sortSelect.value = "original";
    formatSelect.value = "hyphen";
    delimiterSelect.value = "newline";
    currentFilter = "all";
    filterButtons.forEach((btn) => {
        const active = btn.dataset.filter === "all";
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
    });
    copyFeedbackEl.textContent = "";
    lengthWarningEl.hidden = true;
    run();
});

filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        filterButtons.forEach((b) => {
            const active = b === btn;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-pressed", String(active));
        });
        renderOutput();
    });
});

[dedupEl, sortSelect, formatSelect, delimiterSelect].forEach((el) => {
    el.addEventListener("change", renderOutput);
});

copyBtn.addEventListener("click", async () => {
    const text = outputEl.value;
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        copyFeedbackEl.textContent = "복사했습니다.";
    } catch {
        outputEl.focus();
        outputEl.select();
        document.execCommand("copy");
        copyFeedbackEl.textContent = "복사했습니다.";
    }
    setTimeout(() => {
        copyFeedbackEl.textContent = "";
    }, 1500);
});

/* Init */
filterButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.filter === "all")));
run();

/* ======================================================================
 * 모드 전환 (엑셀·표 정리 / 텍스트 추출)
 * 두 모드 모두 위에서 정의한 extractPhones()를 그대로 재사용한다.
 * 엑셀·표 정리를 기본 모드로 한다.
 * ====================================================================== */
const modeTabs = Array.from(document.querySelectorAll(".pe-mode-tab"));
const modePanelText = $("mode-panel-text");
const modePanelTable = $("mode-panel-table");

function activateMode(mode) {
    modeTabs.forEach((t) => {
        const active = t.dataset.mode === mode;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
        t.tabIndex = active ? 0 : -1;
    });
    modePanelText.hidden = mode !== "text";
    modePanelTable.hidden = mode !== "table";
}

modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => activateMode(tab.dataset.mode));
});

/* ======================================================================
 * 엑셀·표 전화번호 정리 모드
 * 붙여넣기 전에는 작은 안내 영역만 보여주고, 붙여넣은 뒤에는 표 자체가
 * 메인 작업 화면이 된다(에디터블 셀 + 열 선택/출력 설정 + 요약 + 액션).
 * ====================================================================== */
const EDITABLE_PREVIEW_LIMIT = 200;
const TABLE_SAMPLE_ROWS = [
    ["이름", "연락처", "지역", "비고"],
    ["김철수", "01012345678", "부산", "신규"],
    ["이영희", "010.2222.3333", "서울", "기존"],
    ["박민수", "+82 10 4444 5555", "대구", "상담"],
    ["최영수", "010-1234-5678", "인천", "중복 예시"]
];
const TABLE_SAMPLE_TEXT = TABLE_SAMPLE_ROWS.map((r) => r.join("\t")).join("\n");

const PHONE_HEADER_HINTS = ["연락처", "전화번호", "휴대폰", "휴대전화", "핸드폰", "전화", "mobile", "phone", "tel"];

const tableInputEl = $("table-input");
const tablePastePromptEl = $("table-paste-prompt");
const tableWorkspaceEl = $("table-workspace");
const tableHeaderToggle = $("table-header-toggle");
const tableColumnSelect = $("table-column-select");
const tableFormatSelect = $("table-format-select");
const tableDedupEl = $("table-dedup");
const tableDedupNoteEl = $("table-dedup-note");
const tableSummaryEl = $("table-summary");
const tableDupDetailEl = $("table-dup-detail");
const tableDupListEl = $("table-dup-list");
const tablePreviewEl = $("table-preview");
const tablePreviewNoteEl = $("table-preview-note");
const tablePasteTipEl = $("table-paste-tip");
const tableDownloadBtn = $("table-download-btn");
const tableStatusColEl = $("table-status-col");
const tableCopyAllBtn = $("table-copy-all-btn");
const tableCopyPhoneBtn = $("table-copy-phone-btn");
const tableCopyFeedbackEl = $("table-copy-feedback");
const tableSampleBtn = $("table-sample-btn");
const tableCreateBlankBtn = $("table-create-blank-btn");
const tableRepasteBtn = $("table-repaste-btn");
const tableAddRowBtn = $("table-add-row-btn");
const tableAddColBtn = $("table-add-col-btn");
const tableConfirmDialogEl = $("table-confirm-dialog");
const tableConfirmTitleEl = $("table-confirm-title");
const tableConfirmMessageEl = $("table-confirm-message");
const tableConfirmCancelBtn = $("table-confirm-cancel");
const tableConfirmOkBtn = $("table-confirm-ok");

// tableRows: 전체 데이터를 항상 여기 보관한다(미리보기는 최대 200행만 렌더링해도
// 복사/다운로드/요약 통계는 항상 이 전체 배열을 기준으로 계산한다).
let tableColCount = 0;
let tableRows = [];
let tableState = { hasHeader: false, headerAuto: true, columnIndex: -1, columnAuto: true, format: "hyphen", dedup: false };

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// row = 줄바꿈, column = 탭. \r\n, \n 모두 처리하고 빈 셀 때문에 열이 밀리지 않도록
// 모든 행을 최대 열 개수에 맞춰 패딩한다.
function parseTableText(raw) {
    const normalized = (raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    if (lines.length === 0) return { rows: [], colCount: 0 };
    const rawRows = lines.map((line) => line.split("\t"));
    const colCount = rawRows.reduce((max, r) => Math.max(max, r.length), 1);
    const rows = rawRows.map((r) => {
        const copy = r.slice();
        while (copy.length < colCount) copy.push("");
        return copy;
    });
    return { rows, colCount };
}

function columnLooksLikePhone(value) {
    return extractPhones(value || "").valid.length > 0;
}

// 헤더 유무를 자동 판단한다: 첫 행 자체가 전화번호처럼 보이면 헤더가 아니고,
// 나머지 행 중 한 열이라도 전화번호 일치 비율이 높으면(표본 최대 200행) 헤더로 본다.
function detectHeaderRow(rows) {
    if (rows.length < 2) return false;
    const first = rows[0];
    if (first.some((v) => columnLooksLikePhone(v))) return false;

    const restRows = rows.slice(1, 201);
    let bestRatio = 0;
    for (let c = 0; c < rows[0].length; c++) {
        const values = restRows.map((r) => r[c] || "").filter((v) => v.trim() !== "");
        if (values.length < 2) continue;
        const matches = values.filter(columnLooksLikePhone).length;
        bestRatio = Math.max(bestRatio, matches / values.length);
    }
    return bestRatio >= 0.6;
}

function computeColumnStats(rawRows, hasHeader) {
    const headerRow = hasHeader ? rawRows[0] : null;
    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
    const sample = dataRows.slice(0, 200);
    const colCount = rawRows[0] ? rawRows[0].length : 0;
    const stats = [];
    for (let c = 0; c < colCount; c++) {
        const values = sample.map((r) => r[c] || "");
        const nonEmpty = values.filter((v) => v.trim() !== "");
        const matches = nonEmpty.filter(columnLooksLikePhone).length;
        const ratio = nonEmpty.length ? matches / nonEmpty.length : 0;
        const label = (headerRow && headerRow[c] && headerRow[c].trim()) || `${c + 1}열`;
        stats.push({ index: c, label, ratio, nonEmptyCount: nonEmpty.length });
    }
    return stats;
}

// 열 이름에 전화번호 관련 단어가 있으면 우선 추천하고, 없으면 내용 일치 비율이
// 높은(50% 이상) 열을 추천한다. 확신이 낮으면 강제로 적용하지 않고 첫 열만 기본 선택한다.
function suggestPhoneColumnIndex(stats) {
    const nameMatch = stats.find((s) => PHONE_HEADER_HINTS.some((hint) => s.label.toLowerCase().includes(hint.toLowerCase())));
    if (nameMatch) return nameMatch.index;
    const byRatio = [...stats].filter((s) => s.nonEmptyCount > 0).sort((a, b) => b.ratio - a.ratio)[0];
    if (byRatio && byRatio.ratio >= 0.5) return byRatio.index;
    return stats.length ? 0 : -1;
}

// 선택된 열의 셀 하나를 처리한다. 전화번호가 아닌 다른 열 값은 절대 건드리지 않는다.
function processPhoneCell(text, outputFormat) {
    const raw = text || "";
    if (raw.trim() === "") {
        return { status: "empty", display: raw, canonical: null };
    }
    const { valid, confirm } = extractPhones(raw);
    if (valid.length === 0) {
        // 전화번호 형식과 일치하지 않음 -> 원본 값을 그대로 유지하고 확인 필요로만 표시
        return { status: "confirm", display: raw, canonical: null };
    }
    let display = raw;
    [...valid].sort((a, b) => b.start - a.start).forEach((entry) => {
        const replacement = outputFormat === "digits" ? entry.canonical : entry.formatted;
        display = display.slice(0, entry.start) + replacement + display.slice(entry.end);
    });
    // 셀 안에 번호가 2개 이상이거나(여러 번호), 확인 필요 부분이 섞여 있으면 "multi"로 표시
    const status = valid.length > 1 || confirm.length > 0 ? "multi" : "ok";
    const canonical = status === "ok" ? valid[0].canonical : null;
    return { status, display, canonical };
}

function canonicalToFormatted(canonical) {
    const domestic = matchDomesticExact(canonical);
    if (domestic) return formatDomestic(domestic.prefixDigits, domestic.bodyDigits);
    if (/^1[568]\d{6}$/.test(canonical)) return formatDomestic(canonical.slice(0, 4), canonical.slice(4));
    return canonical;
}

// 셀 하나(원본/현재 값을 분리 보관)를 만든다. current는 화면/복사/다운로드에 쓰이고
// original은 나중에 원본 확인·되돌리기 기능을 붙일 수 있도록 절대 덮어쓰지 않는다.
function makeRow(rowNumber, rawCells) {
    return {
        rowNumber,
        originalCells: rawCells.slice(),
        cells: rawCells.slice(),
        phoneRaw: "",
        status: "empty",
        canonical: null,
        display: "",
        isDuplicate: false
    };
}

// 선택된 전화번호 열을 기준으로 phoneRaw를 원본 값으로 재설정한다.
// (열을 바꾸거나 표를 새로 불러왔을 때만 호출 - 사용자가 직접 수정한 값은 덮어쓰지 않는다)
function resetPhoneSourceFromOriginal() {
    const colIndex = tableState.columnIndex;
    if (colIndex === -1) return;
    tableRows.forEach((row) => {
        row.phoneRaw = row.originalCells[colIndex] || "";
    });
}

// 한 행의 전화번호 상태를 다시 계산해 cells[columnIndex]에 반영한다.
function applyPhoneProcessing(row, format) {
    const result = processPhoneCell(row.phoneRaw, format);
    row.status = result.status;
    row.canonical = result.canonical;
    row.display = result.display;
    row.cells[tableState.columnIndex] = result.display;
}

// 전화번호 열이 삭제되어 columnIndex가 -1인 동안에는 사용자가 다시 열을 고를 때까지
// 임의로 다른 열을 전화번호 열로 확정하지 않고 상태만 비운다.
function reprocessAllRows() {
    if (tableState.columnIndex === -1) {
        tableRows.forEach((row) => {
            row.status = "empty";
            row.canonical = null;
            row.display = "";
        });
        recomputeDuplicates();
        return;
    }
    const format = tableState.format;
    tableRows.forEach((row) => applyPhoneProcessing(row, format));
    recomputeDuplicates();
}

// 중복 판단은 canonical 기준으로만 하되, 행을 자동 삭제하지 않고 상태만 "중복"으로 표시한다.
function recomputeDuplicates() {
    const canonicalMap = new Map();
    tableRows.forEach((row) => {
        if (row.status === "ok" && row.canonical) {
            if (!canonicalMap.has(row.canonical)) canonicalMap.set(row.canonical, []);
            canonicalMap.get(row.canonical).push(row.rowNumber);
        }
    });
    const duplicateCanonicals = new Set([...canonicalMap.entries()].filter(([, list]) => list.length > 1).map(([c]) => c));
    tableRows.forEach((row) => {
        row.isDuplicate = row.status === "ok" && duplicateCanonicals.has(row.canonical);
    });
    return { canonicalMap, duplicateCanonicals };
}

function computeSummary() {
    return {
        total: tableRows.length,
        done: tableRows.filter((r) => r.status === "ok" || r.status === "multi").length,
        empty: tableRows.filter((r) => r.status === "empty").length,
        confirm: tableRows.filter((r) => r.status === "confirm").length
    };
}

// 중복 제거 옵션이 켜져 있을 때만 같은 canonical의 두 번째 이후 행을 결과에서 제외한다.
// 옵션이 꺼져 있으면(기본값) 모든 행을 그대로 유지한다. 표 전체 복사/Excel 다운로드도
// 항상 이 함수가 만든 전체(미리보기 잘림 없는) 결과를 사용한다.
function getFilteredOutput() {
    const headerRow = tableState.hasHeader ? tableHeaderRow() : null;
    if (!tableState.dedup) return { headerRow, rows: tableRows };
    const seen = new Set();
    const kept = [];
    tableRows.forEach((row) => {
        if (row.status === "ok" && row.canonical) {
            if (seen.has(row.canonical)) return;
            seen.add(row.canonical);
        }
        kept.push(row);
    });
    return { headerRow, rows: kept };
}

let tableHeaderCells = null;
function tableHeaderRow() {
    return tableHeaderCells;
}

// 화면 배지와 Excel "검수 상태" 열이 같은 값을 쓰도록 상태 판정을 한 곳에 모은다.
const STATUS_TEXT = { empty: "빈 번호", confirm: "확인 필요", multi: "여러 번호" };
function statusText(row) {
    if (STATUS_TEXT[row.status]) return STATUS_TEXT[row.status];
    return row.isDuplicate ? "중복" : "정상";
}
function statusBadgeClass(row) {
    if (row.status === "empty") return "pe-badge-empty";
    if (row.status === "confirm") return "pe-badge-confirm";
    if (row.status === "multi") return "pe-badge-multi";
    if (row.isDuplicate) return "pe-badge-dup";
    return "";
}
function statusBadge(row) {
    return `<span class="pe-badge ${statusBadgeClass(row)}">${statusText(row)}</span>`;
}

// 표는 스프레드시트처럼 편집 가능해야 하므로(한국어 IME/포커스 안정성을 위해
// contenteditable 대신 <input>을 사용) 셀마다 input을 렌더링한다. 성능을 위해
// 최대 200행만 실제로 렌더링하고, 나머지는 내부 배열에만 유지한다.
// 헤더가 있는 표(붙여넣은 표 + 직접 만든 표 모두)는 헤더 이름도 input으로 바로 고칠 수 있고,
// 각 열/행 옆의 ✕ 버튼으로 열/행을 지울 수 있다(항상 DOM에 있어 키보드 접근 가능, 평소엔 옅게 표시).
function renderTablePreview(output) {
    const headLabels = output.headerRow || Array.from({ length: tableColCount }, (_, i) => `${i + 1}열`);
    let html = "<thead><tr>";
    headLabels.forEach((label, idx) => {
        const isPhoneCol = idx === tableState.columnIndex;
        const removeBtn = `<button type="button" class="pe-col-remove" data-col="${idx}" title="이 열 삭제" aria-label="${idx + 1}번째 열 삭제">✕</button>`;
        const labelHtml = output.headerRow
            ? `<input type="text" class="pe-header-input" data-col="${idx}" value="${escapeHtml(label || "")}" aria-label="${idx + 1}번째 열 이름" />`
            : `<span class="pe-col-label">${escapeHtml(label)}</span>`;
        html += `<th class="${isPhoneCol ? "pe-phone-col" : ""}"><span class="pe-th-row">${labelHtml}${removeBtn}</span></th>`;
    });
    html += '<th class="pe-status-th">상태</th></tr></thead><tbody>';

    const visible = output.rows.slice(0, EDITABLE_PREVIEW_LIMIT);
    visible.forEach((row) => {
        html += `<tr data-row-number="${row.rowNumber}">`;
        row.cells.forEach((cellText, idx) => {
            const isPhoneCol = idx === tableState.columnIndex;
            html += `<td class="${isPhoneCol ? "pe-phone-col" : ""}"><input type="text" class="pe-cell-input" data-row-number="${row.rowNumber}" data-col="${idx}" value="${escapeHtml(cellText)}" aria-label="${escapeHtml((output.headerRow && output.headerRow[idx]) || `${idx + 1}열`)} 값 (${row.rowNumber}행)" /></td>`;
        });
        html += `<td class="pe-status-cell"><span class="pe-status-inner">${statusBadge(row)}<button type="button" class="pe-row-remove" data-row-number="${row.rowNumber}" title="이 행 삭제" aria-label="${row.rowNumber}행 삭제">✕</button></span></td></tr>`;
    });
    html += "</tbody>";
    tablePreviewEl.innerHTML = html;

    if (output.rows.length > EDITABLE_PREVIEW_LIMIT) {
        tablePreviewNoteEl.hidden = false;
        tablePreviewNoteEl.textContent =
            `전체 ${output.rows.length.toLocaleString("ko-KR")}행 중 ${EDITABLE_PREVIEW_LIMIT}행을 미리보고 있습니다. Excel 다운로드와 표 전체 복사는 전체 데이터에 적용됩니다.`;
    } else {
        tablePreviewNoteEl.hidden = true;
        tablePreviewNoteEl.textContent = "";
    }
}

function renderDupDetail(canonicalMap, duplicateCanonicals) {
    if (duplicateCanonicals.size === 0) {
        tableDupDetailEl.hidden = true;
        tableDupListEl.innerHTML = "";
        return;
    }
    tableDupDetailEl.hidden = false;
    let html = "";
    duplicateCanonicals.forEach((canonical) => {
        const rowsList = canonicalMap.get(canonical) || [];
        html += `<div><strong>${escapeHtml(canonicalToFormatted(canonical))}</strong><span>${rowsList.map((n) => `${n}행`).join(", ")}</span></div>`;
    });
    tableDupListEl.innerHTML = html;
}

let lastTableOutput = { headerRow: null, rows: [] };

function renderTableResult() {
    if (!tableRows.length) return;
    const { canonicalMap, duplicateCanonicals } = recomputeDuplicates();
    const summary = computeSummary();
    tableSummaryEl.textContent =
        tableState.columnIndex === -1
            ? `전체 행 ${summary.total} · 전화번호가 있는 열을 선택해주세요.`
            : `전체 행 ${summary.total} · 정리 완료 ${summary.done} · 빈 번호 ${summary.empty} · ` +
              `중복 번호 ${duplicateCanonicals.size}종 · 확인 필요 ${summary.confirm}`;

    renderDupDetail(canonicalMap, duplicateCanonicals);
    updatePasteTip();

    lastTableOutput = getFilteredOutput();
    renderTablePreview(lastTableOutput);
}

// multi-cell paste 기능은 이미 동작하고 있으므로(로직 변경 없음), 표 위에 "설명"이 아니라
// "행동 순서" 중심의 짧은 한 줄 안내만 보여준다(항상 동일한 문구 - 상태별 분기는 두지 않는다).
function updatePasteTip() {
    if (!tablePasteTipEl) return;
    tablePasteTipEl.innerHTML =
        '💡 Excel에서 여러 셀을 복사한 뒤, 붙여넣을 위치의 첫 번째 칸을 클릭하고 Ctrl+V하세요.' +
        '<span class="pe-paste-tip-sub">Mac: Command+V</span>';
}

// columnIndex가 -1이면(열 삭제 등으로 전화번호 열이 사라진 상태) 다른 열을 몰래
// 대신 확정하지 않고 "선택해주세요" placeholder를 보여준 채로 사용자의 선택을 기다린다.
function refreshColumnOptions(forceResuggest, rawRowsForStats) {
    const stats = computeColumnStats(rawRowsForStats, tableState.hasHeader);

    if (forceResuggest || (tableState.columnAuto && tableState.columnIndex !== -1)) {
        const suggested = suggestPhoneColumnIndex(stats);
        tableState.columnIndex = suggested >= 0 ? suggested : (stats.length ? 0 : -1);
    }
    if (tableState.columnIndex >= stats.length) {
        tableState.columnIndex = stats.length ? 0 : -1;
    }

    tableColumnSelect.innerHTML = "";
    if (tableState.columnIndex === -1) {
        const placeholder = document.createElement("option");
        placeholder.value = "-1";
        placeholder.textContent = "선택해주세요";
        placeholder.disabled = true;
        placeholder.selected = true;
        tableColumnSelect.appendChild(placeholder);
    }
    stats.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.index);
        opt.textContent = s.label;
        tableColumnSelect.appendChild(opt);
    });
    tableColumnSelect.value = String(tableState.columnIndex);
}

// 표 붙여넣기(또는 샘플) 직후 전체 파이프라인을 새로 만든다. 붙여넣기 프롬프트를
// 숨기고 편집 가능한 작업 표를 메인 화면으로 보여준다.
function loadTableText(raw, { forceResuggest }) {
    const parsed = parseTableText(raw);
    if (parsed.rows.length === 0) return;

    tableColCount = parsed.colCount;

    if (tableState.headerAuto || forceResuggest) {
        tableState.hasHeader = detectHeaderRow(parsed.rows);
    }
    tableHeaderToggle.checked = tableState.hasHeader;

    tableHeaderCells = tableState.hasHeader ? parsed.rows[0].slice() : null;
    const dataRows = tableState.hasHeader ? parsed.rows.slice(1) : parsed.rows;
    tableRows = dataRows.map((cells, i) => makeRow(i + 1, cells));

    refreshColumnOptions(true, parsed.rows);
    resetPhoneSourceFromOriginal();
    reprocessAllRows();

    tablePastePromptEl.hidden = true;
    tableWorkspaceEl.hidden = false;
    renderTableResult();
}

// 「빈 표 직접 만들기」: Excel 없이도 바로 편집 가능한 작은 표를 만든다.
// 붙여넣기로 만든 표와 동일한 tableRows 모델/렌더러를 그대로 재사용한다.
const BLANK_TABLE_HEADERS = ["이름", "연락처", "비고"];
const BLANK_TABLE_ROW_COUNT = 5;

function createBlankTable() {
    tableState = { hasHeader: true, headerAuto: false, columnIndex: -1, columnAuto: true, format: "hyphen", dedup: false };
    tableFormatSelect.value = "hyphen";
    tableDedupEl.checked = false;
    tableDedupNoteEl.hidden = true;
    tableHeaderToggle.checked = true;

    tableColCount = BLANK_TABLE_HEADERS.length;
    tableHeaderCells = BLANK_TABLE_HEADERS.slice();
    tableRows = Array.from({ length: BLANK_TABLE_ROW_COUNT }, (_, i) => makeRow(i + 1, Array(tableColCount).fill("")));

    refreshColumnOptions(true, [tableHeaderCells, ...tableRows.map((r) => r.originalCells)]);
    resetPhoneSourceFromOriginal();
    reprocessAllRows();

    tablePastePromptEl.hidden = true;
    tableWorkspaceEl.hidden = false;
    renderTableResult();
}

function currentRawRowsForStats() {
    return tableHeaderCells ? [tableHeaderCells, ...tableRows.map((r) => r.originalCells)] : tableRows.map((r) => r.originalCells);
}

function addTableRow() {
    const newRowNumber = tableRows.length ? Math.max(...tableRows.map((r) => r.rowNumber)) + 1 : 1;
    const row = makeRow(newRowNumber, Array(tableColCount).fill(""));
    if (tableState.columnIndex !== -1) {
        applyPhoneProcessing(row, tableState.format);
    }
    tableRows.push(row);
    renderTableResult();
}

function removeTableRow(rowNumber) {
    if (tableRows.length <= 1) return; // 표가 완전히 비어버리지 않도록 최소 1행은 유지한다.
    tableRows = tableRows.filter((r) => r.rowNumber !== rowNumber);
    renderTableResult();
}

function addTableColumn() {
    tableColCount += 1;
    if (tableHeaderCells) tableHeaderCells.push(`열 ${tableColCount}`);
    tableRows.forEach((row) => {
        row.originalCells.push("");
        row.cells.push("");
    });
    refreshColumnOptions(false, currentRawRowsForStats());
    renderTableResult();
}

// 전화번호 열을 삭제하면 다른 열을 몰래 대신 확정하지 않고 다시 선택하게 한다(요구사항 17).
function removeTableColumn(colIndex) {
    if (tableColCount <= 1) return; // 최소 1열은 유지한다.
    const wasPhoneColumn = colIndex === tableState.columnIndex;

    tableColCount -= 1;
    if (tableHeaderCells) tableHeaderCells.splice(colIndex, 1);
    tableRows.forEach((row) => {
        row.originalCells.splice(colIndex, 1);
        row.cells.splice(colIndex, 1);
    });

    if (wasPhoneColumn) {
        tableState.columnIndex = -1;
        tableState.columnAuto = false;
    } else if (colIndex < tableState.columnIndex) {
        tableState.columnIndex -= 1;
    }

    refreshColumnOptions(false, currentRawRowsForStats());
    if (wasPhoneColumn) reprocessAllRows();
    renderTableResult();
}

/* ======================================================================
 * 표 안에서 여러 셀 붙여넣기(Excel 스타일 범위 paste)
 * 파싱 원칙은 표 전체 붙여넣기와 동일: 행=줄바꿈, 열=탭인 clipboard text를
 * 2차원 matrix로 만들고, 현재 선택된 셀(startRow/startCol)부터 채운다.
 * ====================================================================== */
function parseClipboardMatrix(text) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
    return lines.map((line) => line.split("\t"));
}

// 붙여넣을 범위 안에 이미 값이 있는 셀이 하나라도 있는지 확인한다(있으면 확인 절차 필요).
function findPasteConflicts(startIndex, startCol, matrix) {
    const conflicts = [];
    matrix.forEach((cols, r) => {
        const row = tableRows[startIndex + r];
        if (!row) return; // 아직 없는(새로 만들 예정인) 행은 덮어쓸 기존 값이 없다.
        cols.forEach((val, c) => {
            const colIdx = startCol + c;
            if (colIdx >= tableColCount) return; // 아직 없는(새로 만들 예정인) 열도 마찬가지.
            if ((row.cells[colIdx] || "").trim() !== "") conflicts.push(row);
        });
    });
    return conflicts;
}

function applyMultiCellPaste(startRowNumber, startCol, matrix) {
    const startIndex = tableRows.findIndex((r) => r.rowNumber === startRowNumber);
    if (startIndex === -1) return;

    const neededRows = startIndex + matrix.length;
    const neededCols = startCol + Math.max(...matrix.map((r) => r.length));

    while (tableRows.length < neededRows) {
        const newRowNumber = tableRows.length ? Math.max(...tableRows.map((r) => r.rowNumber)) + 1 : 1;
        tableRows.push(makeRow(newRowNumber, Array(tableColCount).fill("")));
    }
    while (tableColCount < neededCols) {
        tableColCount += 1;
        if (tableHeaderCells) tableHeaderCells.push(`열 ${tableColCount}`); // 기존 헤더 이름은 그대로 둔다.
        tableRows.forEach((row) => {
            row.originalCells.push("");
            row.cells.push("");
        });
    }

    matrix.forEach((cols, r) => {
        const row = tableRows[startIndex + r];
        cols.forEach((val, c) => {
            const colIdx = startCol + c;
            row.originalCells[colIdx] = val;
            if (colIdx === tableState.columnIndex) {
                // 전화번호 열에 붙여넣은 값만 기존 parser로 정리한다.
                row.phoneRaw = val;
                applyPhoneProcessing(row, tableState.format);
            } else {
                // 나머지 열은 clipboard 값을 그대로 유지한다.
                row.cells[colIdx] = val;
            }
        });
    });

    refreshColumnOptions(false, currentRawRowsForStats());
    renderTableResult();
}

tablePreviewEl.addEventListener("paste", (event) => {
    const target = event.target;
    if (!target.classList || !target.classList.contains("pe-cell-input")) return;

    const clipboard = event.clipboardData || window.clipboardData;
    const text = clipboard ? clipboard.getData("text") : "";
    if (!text) return;

    const matrix = parseClipboardMatrix(text);
    if (matrix.length === 1 && matrix[0].length === 1) return; // 셀 1개 붙여넣기는 기본 동작에 맡긴다.

    event.preventDefault();
    const startRowNumber = Number(target.dataset.rowNumber);
    const startCol = Number(target.dataset.col);
    const startIndex = tableRows.findIndex((r) => r.rowNumber === startRowNumber);
    if (startIndex === -1) return;

    const conflicts = findPasteConflicts(startIndex, startCol, matrix);
    if (conflicts.length > 0) {
        const rowSpan = matrix.length;
        const colSpan = Math.max(...matrix.map((r) => r.length));
        confirmTableReplacement({
            title: "여러 셀을 붙여넣을까요?",
            message: `선택한 위치부터 ${rowSpan}행 × ${colSpan}열 데이터를 붙여넣으면 기존 값이 일부 바뀝니다. 이 작업은 되돌릴 수 없습니다.`,
            confirmLabel: "붙여넣기",
            trigger: target
        }).then((ok) => {
            if (ok) applyMultiCellPaste(startRowNumber, startCol, matrix);
        });
    } else {
        applyMultiCellPaste(startRowNumber, startCol, matrix);
    }
});

function rebuildFromHeaderToggle() {
    // 헤더 포함 여부가 바뀌면 어떤 행이 "데이터"인지 자체가 달라지므로
    // 원본 붙여넣기 텍스트를 기준으로 처음부터 다시 만든다(직접 수정한 값은 초기화됨).
    const allRawRows = (tableHeaderCells ? [tableHeaderCells] : []).concat(tableRows.map((r) => r.originalCells));
    tableHeaderCells = tableState.hasHeader ? allRawRows[0] : null;
    const dataRows = tableState.hasHeader ? allRawRows.slice(1) : allRawRows;
    tableRows = dataRows.map((cells, i) => makeRow(i + 1, cells));
    refreshColumnOptions(false, allRawRows);
    resetPhoneSourceFromOriginal();
    reprocessAllRows();
    renderTableResult();
}

function resetToPastePrompt() {
    tableInputEl.value = "";
    tableColCount = 0;
    tableRows = [];
    tableHeaderCells = null;
    tableState = { hasHeader: false, headerAuto: true, columnIndex: -1, columnAuto: true, format: "hyphen", dedup: false };
    tableFormatSelect.value = "hyphen";
    tableDedupEl.checked = false;
    tableDedupNoteEl.hidden = true;
    tableHeaderToggle.checked = false;
    tableCopyFeedbackEl.textContent = "";
    tableWorkspaceEl.hidden = true;
    tablePastePromptEl.hidden = false;
    tableInputEl.focus();
}

/* ======================================================================
 * 표를 지우는 동작(새 표 붙여넣기 / 새 빈 표 만들기 / 여러 셀 덮어쓰기) 공용 확인 dialog.
 * 네이티브 <dialog>의 showModal()을 사용해 Escape 닫기·backdrop·포커스 가둠을
 * 브라우저가 기본으로 처리하게 하고, 평소에는 [open] 속성이 없어 화면에 전혀 보이지 않는다.
 * ====================================================================== */
let tableConfirmResolve = null;
let tableConfirmTrigger = null;

function confirmTableReplacement({ title, message, confirmLabel, trigger }) {
    return new Promise((resolve) => {
        tableConfirmTitleEl.textContent = title;
        tableConfirmMessageEl.textContent = message;
        tableConfirmOkBtn.textContent = confirmLabel || "확인";
        tableConfirmResolve = resolve;
        tableConfirmTrigger = trigger || document.activeElement;

        if (typeof tableConfirmDialogEl.showModal === "function") {
            tableConfirmDialogEl.showModal();
        } else {
            // <dialog>를 지원하지 않는 아주 오래된 브라우저를 위한 최소 대비책.
            resolve(window.confirm(`${title}\n${message}`));
        }
    });
}

function closeTableConfirm(result) {
    if (tableConfirmDialogEl.open) tableConfirmDialogEl.close();
    if (tableConfirmResolve) {
        tableConfirmResolve(result);
        tableConfirmResolve = null;
    }
    // 취소했을 때 포커스가 원래 누르던 버튼(또는 셀)으로 자연스럽게 돌아가게 한다.
    if (tableConfirmTrigger && typeof tableConfirmTrigger.focus === "function") {
        tableConfirmTrigger.focus();
    }
    tableConfirmTrigger = null;
}

tableConfirmCancelBtn.addEventListener("click", () => closeTableConfirm(false));
tableConfirmOkBtn.addEventListener("click", () => closeTableConfirm(true));
// <dialog>는 Escape를 누르면 close() 전에 'cancel' 이벤트를 낸다. 기본 동작을 막고
// 우리 쪽에서 직접 닫아 resolve(false)와 focus 복귀를 항상 함께 처리한다.
tableConfirmDialogEl.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeTableConfirm(false);
});
// backdrop(다이얼로그 바깥) 클릭도 취소로 취급한다 - 클릭 좌표가 다이얼로그 박스 밖이면 배경 클릭이다.
tableConfirmDialogEl.addEventListener("click", (event) => {
    const rect = tableConfirmDialogEl.getBoundingClientRect();
    const inside =
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeTableConfirm(false);
});

/* ====== 셀 / 헤더 편집, 행·열 삭제 ====== */
tablePreviewEl.addEventListener(
    "change",
    (event) => {
        const input = event.target;
        if (!input.classList) return;

        if (input.classList.contains("pe-header-input")) {
            const col = Number(input.dataset.col);
            if (!tableHeaderCells) return;
            tableHeaderCells[col] = input.value;
            // 이름만 갱신 - forceResuggest는 주지 않아 사용자가 이미 고른 열은 그대로 둔다.
            // (열 이름을 "연락처"로 바꾸면 columnAuto가 켜져 있을 때만 자동으로 그 열이 추천된다)
            refreshColumnOptions(false, currentRawRowsForStats());
            renderTableResult();
            return;
        }

        if (!input.classList.contains("pe-cell-input")) return;
        const rowNumber = Number(input.dataset.rowNumber);
        const col = Number(input.dataset.col);
        const row = tableRows.find((r) => r.rowNumber === rowNumber);
        if (!row) return;

        if (col === tableState.columnIndex) {
            // 전화번호 셀 수정: 사용자가 입력한 값을 새 원문으로 삼아 즉시 재계산한다.
            row.phoneRaw = input.value;
            applyPhoneProcessing(row, tableState.format);
        } else {
            // 다른 열은 값만 그대로 갱신하고 전화번호 처리는 절대 하지 않는다.
            row.cells[col] = input.value;
        }
        renderTableResult();
    },
    true
);
tablePreviewEl.addEventListener("keydown", (event) => {
    const isTextInput = event.target.classList && (event.target.classList.contains("pe-cell-input") || event.target.classList.contains("pe-header-input"));
    if (event.key === "Enter" && isTextInput) {
        event.preventDefault();
        event.target.blur();
    }
});
tablePreviewEl.addEventListener("click", (event) => {
    const rowBtn = event.target.closest(".pe-row-remove");
    if (rowBtn) {
        removeTableRow(Number(rowBtn.dataset.rowNumber));
        return;
    }
    const colBtn = event.target.closest(".pe-col-remove");
    if (colBtn) {
        removeTableColumn(Number(colBtn.dataset.col));
    }
});

/* ====== 표 모드 이벤트 ====== */
tableSampleBtn.addEventListener("click", () => {
    tableState.headerAuto = true;
    tableState.columnAuto = true;
    loadTableText(TABLE_SAMPLE_TEXT, { forceResuggest: true });
});

tableCreateBlankBtn.addEventListener("click", async () => {
    // paste-prompt 화면에서만 보이는 버튼이라 보통 현재 데이터가 없지만,
    // 재사용 가능한 안전장치로 동일한 확인 절차를 그대로 적용해둔다.
    if (tableHasContent()) {
        const ok = await confirmTableReplacement({
            title: "새 빈 표를 만들까요?",
            message: "현재 작성 중인 표는 지워집니다. 이 작업은 되돌릴 수 없습니다.",
            confirmLabel: "새 빈 표 만들기",
            trigger: tableCreateBlankBtn
        });
        if (!ok) return;
    }
    createBlankTable();
});

tableInputEl.addEventListener("paste", () => {
    tableState.headerAuto = true;
    tableState.columnAuto = true;
    // paste 이벤트 시점에는 아직 textarea.value가 갱신되지 않았을 수 있어 다음 tick에 읽는다.
    setTimeout(() => loadTableText(tableInputEl.value, { forceResuggest: true }), 0);
});
tableInputEl.addEventListener("change", () => {
    if (tableInputEl.value.trim()) {
        loadTableText(tableInputEl.value, { forceResuggest: true });
    }
});

// "새 표 붙여넣기"는 실수로 현재 작업을 날릴 수 있으므로, 실제로 입력된 내용이
// 하나라도 있을 때만 확인을 거친다(빈 표를 막 만들었을 뿐이면 바로 되돌아간다).
function tableHasContent() {
    return tableRows.some((row) => row.cells.some((c) => (c || "").trim() !== ""));
}

// "새 작업 시작"은 현재 표를 끝내고 최초 선택 화면(붙여넣기/빈 표/샘플)으로 돌아가는 동작이다.
tableRepasteBtn.addEventListener("click", async () => {
    if (!tableHasContent()) {
        resetToPastePrompt();
        return;
    }
    const ok = await confirmTableReplacement({
        title: "새 작업을 시작할까요?",
        message: "현재 작성 중인 표 내용은 사라집니다. 새 작업 화면에서 표 붙여넣기, 빈 표 만들기, 샘플 불러오기를 다시 선택할 수 있습니다.",
        confirmLabel: "새 작업 시작",
        trigger: tableRepasteBtn
    });
    if (ok) resetToPastePrompt();
});

tableAddRowBtn.addEventListener("click", addTableRow);
tableAddColBtn.addEventListener("click", addTableColumn);

tableHeaderToggle.addEventListener("change", () => {
    tableState.hasHeader = tableHeaderToggle.checked;
    tableState.headerAuto = false;
    rebuildFromHeaderToggle();
});

tableColumnSelect.addEventListener("change", () => {
    tableState.columnIndex = Number(tableColumnSelect.value);
    tableState.columnAuto = false;
    resetPhoneSourceFromOriginal();
    reprocessAllRows();
    renderTableResult();
});

tableFormatSelect.addEventListener("change", () => {
    tableState.format = tableFormatSelect.value;
    reprocessAllRows();
    renderTableResult();
});

tableDedupEl.addEventListener("change", () => {
    tableState.dedup = tableDedupEl.checked;
    tableDedupNoteEl.hidden = !tableState.dedup;
    renderTableResult();
});

/* ====== 복사 / 다운로드 ====== */
function buildTsvFromOutput(output) {
    const lines = [];
    if (output.headerRow) lines.push(output.headerRow.join("\t"));
    output.rows.forEach((row) => lines.push(row.cells.join("\t")));
    return lines.join("\n");
}

function buildHtmlTableFromOutput(output) {
    let html = "<table>";
    if (output.headerRow) {
        html += "<tr>" + output.headerRow.map((h) => `<th>${escapeHtml(h)}</th>`).join("") + "</tr>";
    }
    output.rows.forEach((row) => {
        html += "<tr>" + row.cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>";
    });
    html += "</table>";
    return html;
}

function buildPhoneColumnText(output) {
    return output.rows.map((row) => row.display).join("\n");
}

function showCopyFeedback(message) {
    tableCopyFeedbackEl.textContent = message;
    setTimeout(() => {
        tableCopyFeedbackEl.textContent = "";
    }, 1500);
}

function fallbackCopy(text) {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
}

// Excel에 다시 붙여넣었을 때 행/열 구조가 그대로 복원되도록 text/plain(TSV)을 기본으로 하고,
// 가능하면 text/html도 함께 제공한다(호환성 문제가 있으면 TSV writeText로 자동 대체).
async function copyTableAll() {
    const tsv = buildTsvFromOutput(lastTableOutput);
    if (!tsv) return;
    try {
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            const html = buildHtmlTableFromOutput(lastTableOutput);
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/plain": new Blob([tsv], { type: "text/plain" }),
                    "text/html": new Blob([html], { type: "text/html" })
                })
            ]);
        } else {
            await navigator.clipboard.writeText(tsv);
        }
    } catch {
        try {
            await navigator.clipboard.writeText(tsv);
        } catch {
            fallbackCopy(tsv);
        }
    }
    showCopyFeedback("복사했습니다.");
}

async function copyPhoneColumnOnly() {
    const text = buildPhoneColumnText(lastTableOutput);
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        fallbackCopy(text);
    }
    showCopyFeedback("복사했습니다.");
}

function sheetNameSafe(name) {
    return name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet1";
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

// 각 열 header/데이터 표시 길이를 기준으로 Excel 열 너비(문자 수, wch)를 계산한다.
// 전화번호 열은 "010-1234-5678"(13자)이 줄바꿈·잘림 없이 한 번에 보이도록
// 최소 16자 폭을 보장한다. 매우 긴 값이 섞인 열이 과도하게 넓어지지 않도록 상한도 둔다.
const COL_WIDTH_MIN = 8;
const COL_WIDTH_MAX = 38;
const PHONE_COL_WIDTH_MIN = 16;
const COL_WIDTH_SAMPLE_ROWS = 500;

function computeColumnWidths(output) {
    const widths = [];
    for (let c = 0; c < tableColCount; c++) {
        let maxLen = output.headerRow ? (output.headerRow[c] || "").length : 0;
        const sample = output.rows.slice(0, COL_WIDTH_SAMPLE_ROWS);
        sample.forEach((row) => {
            const len = (row.cells[c] || "").length;
            if (len > maxLen) maxLen = len;
        });
        let width = Math.min(COL_WIDTH_MAX, Math.max(COL_WIDTH_MIN, maxLen + 2));
        if (c === tableState.columnIndex) {
            width = Math.max(width, PHONE_COL_WIDTH_MIN);
        }
        widths.push({ wch: width });
    }
    return widths;
}

// Excel의 "앞자리 0 손실" 문제를 막기 위해 모든 셀을 문자열(t:'s')로 저장한다.
// (전화번호 열뿐 아니라 표 전체를 문자열로 저장 - 숫자 열까지 텍스트가 되는 대신
// 전화번호가 숫자로 오인되어 앞자리 0이 사라지는 사고를 원천적으로 막는다)
// "검수 상태" 열은 화면 배지와 같은 statusText()를 그대로 써서 Excel과 화면이 항상 일치한다.
// (표 전체 복사는 원래 열 구조만 다루므로 이 옵션의 영향을 받지 않는다 - buildTsvFromOutput 참고)
const STATUS_COL_WIDTH = 12;

function downloadExcel() {
    if (!window.XLSX) {
        showCopyFeedback("Excel 생성 라이브러리를 불러오지 못했습니다.");
        return;
    }
    const XLSX = window.XLSX;
    const output = getFilteredOutput();
    const includeStatus = tableStatusColEl.checked;
    const ws = {};
    let r = 0;

    const headerRow = output.headerRow ? output.headerRow.slice() : null;
    if (headerRow && includeStatus) headerRow.push("검수 상태");
    if (headerRow) {
        headerRow.forEach((h, c) => {
            ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: "s", v: h || "" };
        });
        r = 1;
    }

    output.rows.forEach((row, i) => {
        const cells = includeStatus ? row.cells.concat([statusText(row)]) : row.cells;
        cells.forEach((val, c) => {
            ws[XLSX.utils.encode_cell({ r: r + i, c })] = { t: "s", v: val ?? "" };
        });
    });

    const colCount = tableColCount + (includeStatus ? 1 : 0);
    const totalRows = r + output.rows.length;
    ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(totalRows - 1, 0), c: Math.max(colCount - 1, 0) }
    });
    ws["!cols"] = includeStatus ? computeColumnWidths(output).concat([{ wch: STATUS_COL_WIDTH }]) : computeColumnWidths(output);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe("전화번호 정리"));

    const now = new Date();
    const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
    try {
        XLSX.writeFile(wb, `toolify-phone-cleaned-${stamp}.xlsx`);
    } catch {
        showCopyFeedback("Excel 파일 생성에 실패했습니다.");
    }
}

tableDownloadBtn.addEventListener("click", downloadExcel);
tableCopyAllBtn.addEventListener("click", copyTableAll);
tableCopyPhoneBtn.addEventListener("click", copyPhoneColumnOnly);

/* 엑셀·표 정리를 기본 모드로 시작한다. */
activateMode("table");
