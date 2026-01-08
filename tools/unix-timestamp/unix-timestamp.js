/* ============================================================
   한국형 Unix Timestamp 변환기
   - 탭 전환(단일/날짜→TS/배치)
   - 초/밀리초 자동 감지 (+ us/ns 옵션)
   - KST/UTC/ISO 출력
   - 상대시간(방금 전/몇분 전)
   - 배치 변환(여러 줄)
   - 복사 버튼(글로벌 버튼 스타일 영향 제거)
   ============================================================ */

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatKST(date) {
    try {
        const fmt = new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
        return fmt.format(date).replace(/\s+/g, " ").trim() + " KST";
    } catch (e) {
        const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const yyyy = kst.getUTCFullYear();
        const mm = pad2(kst.getUTCMonth() + 1);
        const dd = pad2(kst.getUTCDate());
        const hh = pad2(kst.getUTCHours());
        const mi = pad2(kst.getUTCMinutes());
        const ss = pad2(kst.getUTCSeconds());
        const wd = weekdays[kst.getUTCDay()];
        return `${yyyy}-${mm}-${dd} (${wd}) ${hh}:${mi}:${ss} KST`;
    }
}

function formatUTC(date) {
    const yyyy = date.getUTCFullYear();
    const mm = pad2(date.getUTCMonth() + 1);
    const dd = pad2(date.getUTCDate());
    const hh = pad2(date.getUTCHours());
    const mi = pad2(date.getUTCMinutes());
    const ss = pad2(date.getUTCSeconds());
    const wd = weekdays[date.getUTCDay()];
    return `${yyyy}-${mm}-${dd} (${wd}) ${hh}:${mi}:${ss} UTC`;
}

function formatISO(date) {
    return date.toISOString();
}

function relativeKorean(targetMs) {
    const now = Date.now();
    const diff = targetMs - now; // 미래면 +
    const abs = Math.abs(diff);

    const sec = Math.floor(abs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    const suffix = diff >= 0 ? "후" : "전";

    if (sec < 10) return `방금 ${suffix}`;
    if (sec < 60) return `${sec}초 ${suffix}`;
    if (min < 60) return `${min}분 ${suffix}`;
    if (hr < 24) return `${hr}시간 ${suffix}`;
    if (day < 30) return `${day}일 ${suffix}`;

    return diff >= 0 ? "미래(날짜 확인)" : "과거(날짜 확인)";
}

function ddayLabelKST(targetDate) {
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const base = new Date(
        Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())
    ); // KST 00:00

    const targetKst = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000);
    const targetBase = new Date(
        Date.UTC(
            targetKst.getUTCFullYear(),
            targetKst.getUTCMonth(),
            targetKst.getUTCDate()
        )
    );

    const diffDays = Math.floor((targetBase.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `D-${diffDays}`;
    if (diffDays === 0) return "D-Day";
    return `D+${Math.abs(diffDays)}`;
}

function cleanNumberText(s) {
    return (s || "").trim().replace(/[, ]+/g, "");
}

function detectUnit(numStr) {
    const len = numStr.length;
    if (len >= 19) return "ns";
    if (len >= 16) return "us";
    if (len >= 13) return "ms";
    return "s";
}

function toMs(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    if (unit === "s") return n * 1000;
    if (unit === "ms") return n;
    if (unit === "us") return Math.floor(n / 1000);
    if (unit === "ns") return Math.floor(n / 1_000_000);
    return NaN;
}

function fromDateToTimestamp(date, unit) {
    const ms = date.getTime();
    if (unit === "ms") return String(ms);
    if (unit === "s") return String(Math.floor(ms / 1000));
    return String(ms);
}

/* =============================
   탭 전환
   ============================= */
function initTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;

            tabButtons.forEach((b) => b.classList.remove("active"));
            tabPanels.forEach((p) => p.classList.remove("active"));

            btn.classList.add("active");
            const panel = document.getElementById("tab-" + target);
            if (panel) panel.classList.add("active");
        });
    });
}

/* =============================
   DOM 참조
   ============================= */
function getEls() {
    return {
        // 단일
        tsInput: document.getElementById("ts-input"),
        unitSelect: document.getElementById("ts-unit"),
        btnConvert: document.getElementById("btn-convert"),
        btnNow: document.getElementById("btn-now"),
        btnClear: document.getElementById("btn-clear"),
        outKst: document.getElementById("out-kst"),
        outUtc: document.getElementById("out-utc"),
        outIso: document.getElementById("out-iso"),
        outRel: document.getElementById("out-rel"),
        outDday: document.getElementById("out-dday"),
        outHint: document.getElementById("out-hint"),

        // 날짜→TS
        dtInput: document.getElementById("dt-input"),
        btnDtConvert: document.getElementById("btn-dt-convert"),
        btnDtNow: document.getElementById("btn-dt-now"),
        dtOutS: document.getElementById("dt-out-s"),
        dtOutMs: document.getElementById("dt-out-ms"),
        dtHint: document.getElementById("dt-hint"),

        // 배치
        batchInput: document.getElementById("batch-input"),
        btnBatch: document.getElementById("btn-batch"),
        btnBatchClear: document.getElementById("btn-batch-clear"),
        batchSummary: document.getElementById("batch-summary"),
        batchTableBody: document.getElementById("batch-tbody"),
    };
}

/* =============================
   단일 변환
   ============================= */
function renderFromTimestamp(els) {
    const raw = cleanNumberText(els.tsInput.value);
    if (!raw) {
        els.outHint.textContent = "timestamp를 입력해주세요. (예: 1700000000 또는 1700000000000)";
        els.outKst.textContent = "-";
        els.outUtc.textContent = "-";
        els.outIso.textContent = "-";
        els.outRel.textContent = "-";
        els.outDday.textContent = "-";
        return;
    }

    const forced = els.unitSelect.value; // auto/s/ms/us/ns
    const unit = forced === "auto" ? detectUnit(raw) : forced;

    const ms = toMs(raw, unit);
    if (!Number.isFinite(ms)) {
        els.outHint.textContent = "숫자 형태의 timestamp만 입력해주세요.";
        return;
    }

    const d = new Date(ms);
    if (isNaN(d.getTime())) {
        els.outHint.textContent = "유효한 timestamp가 아닙니다. 값/단위를 확인해주세요.";
        return;
    }

    const unitLabel =
        unit === "s" ? "초(s)"
            : unit === "ms" ? "밀리초(ms)"
                : unit === "us" ? "마이크로초(μs)"
                    : "나노초(ns)";

    els.outHint.textContent = `감지 단위: ${unitLabel} (입력 길이: ${raw.length}자리)`;
    els.outKst.textContent = formatKST(d);
    els.outUtc.textContent = formatUTC(d);

    // ISO 영역은 code가 들어있어도 textContent로 그대로 보이게 처리
    els.outIso.textContent = formatISO(d);

    els.outRel.textContent = relativeKorean(ms);
    els.outDday.textContent = ddayLabelKST(d);
}

/* =============================
   날짜 → timestamp
   ============================= */
function renderFromDatetime(els) {
    const v = els.dtInput.value;
    if (!v) {
        els.dtHint.textContent = "날짜/시간을 선택해주세요.";
        els.dtOutS.textContent = "-";
        els.dtOutMs.textContent = "-";
        return;
    }

    const d = new Date(v); // datetime-local은 로컬 기준
    if (isNaN(d.getTime())) {
        els.dtHint.textContent = "유효한 날짜/시간이 아닙니다.";
        return;
    }

    els.dtOutS.textContent = fromDateToTimestamp(d, "s");
    els.dtOutMs.textContent = fromDateToTimestamp(d, "ms");
    els.dtHint.textContent = "선택한 시간(로컬 기준)을 timestamp로 변환했습니다.";
}

/* =============================
   배치 변환
   ============================= */
function extractTimestampCandidate(line) {
    const m = line.match(/\b\d{9,19}\b/);
    return m ? m[0] : null;
}

function renderBatch(els) {
    const text = els.batchInput.value || "";
    const lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    els.batchTableBody.innerHTML = "";

    if (lines.length === 0) {
        els.batchSummary.textContent = "여러 줄 timestamp를 붙여넣으면 자동 변환해서 표로 보여줍니다.";
        return;
    }

    let ok = 0;

    lines.forEach((line, idx) => {
        const raw = extractTimestampCandidate(line) || cleanNumberText(line);
        const unit = detectUnit(raw);
        const ms = toMs(raw, unit);
        const d = new Date(ms);

        const tr = document.createElement("tr");

        const tdIdx = document.createElement("td");
        tdIdx.textContent = String(idx + 1);

        const tdRaw = document.createElement("td");
        tdRaw.textContent = line;

        const tdUnit = document.createElement("td");
        const unitLabel =
            unit === "s" ? "초(s)"
                : unit === "ms" ? "밀리초(ms)"
                    : unit === "us" ? "마이크로초(μs)"
                        : "나노초(ns)";
        tdUnit.innerHTML = `<span class="badge">${unitLabel}</span>`;

        const tdKst = document.createElement("td");
        const tdRel = document.createElement("td");

        if (!raw || !Number.isFinite(ms) || isNaN(d.getTime())) {
            tdKst.textContent = "-";
            tdRel.textContent = "-";
        } else {
            ok++;
            tdKst.textContent = formatKST(d);
            tdRel.textContent = relativeKorean(ms);
        }

        tr.appendChild(tdIdx);
        tr.appendChild(tdRaw);
        tr.appendChild(tdUnit);
        tr.appendChild(tdKst);
        tr.appendChild(tdRel);

        els.batchTableBody.appendChild(tr);
    });

    els.batchSummary.textContent = `총 ${lines.length}줄 중 ${ok}줄 변환 성공 (숫자 9~19자리 자동 감지)`;
}

/* =============================
   복사 버튼
   ============================= */
function initCopyButtons() {
    document.querySelectorAll("[data-copy-target]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const targetId = btn.getAttribute("data-copy-target");
            const el = document.getElementById(targetId);

            const text = (el?.innerText || el?.textContent || "").trim();
            if (!text || text === "-") return;

            const old = btn.textContent;

            try {
                await navigator.clipboard.writeText(text);
                btn.textContent = "복사됨!";
                setTimeout(() => (btn.textContent = old), 900);
            } catch (e) {
                alert("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
            }
        });
    });
}

/* =============================
   초기값 세팅
   ============================= */
function setDefaults(els) {
    // timestamp: 현재(ms)
    els.tsInput.value = String(Date.now());
    els.unitSelect.value = "ms";
    renderFromTimestamp(els);

    // datetime-local: 현재로
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    const hh = pad2(now.getHours());
    const mi = pad2(now.getMinutes());
    const ss = pad2(now.getSeconds());
    els.dtInput.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
    renderFromDatetime(els);

    // batch 안내
    renderBatch(els);
}

function wireEvents(els) {
    // 단일
    els.btnConvert.addEventListener("click", () => renderFromTimestamp(els));
    els.btnNow.addEventListener("click", () => {
        els.tsInput.value = String(Date.now());
        els.unitSelect.value = "ms";
        renderFromTimestamp(els);
    });
    els.btnClear.addEventListener("click", () => {
        els.tsInput.value = "";
        els.unitSelect.value = "auto";
        renderFromTimestamp(els);
    });

    // 입력 바뀌면 즉시 반영(원하면 제거 가능)
    els.tsInput.addEventListener("input", () => renderFromTimestamp(els));
    els.unitSelect.addEventListener("change", () => renderFromTimestamp(els));

    // 날짜→TS
    els.btnDtConvert.addEventListener("click", () => renderFromDatetime(els));
    els.btnDtNow.addEventListener("click", () => {
        const n = new Date();
        const yyyy = n.getFullYear();
        const mm = pad2(n.getMonth() + 1);
        const dd = pad2(n.getDate());
        const hh = pad2(n.getHours());
        const mi = pad2(n.getMinutes());
        const ss = pad2(n.getSeconds());
        els.dtInput.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
        renderFromDatetime(els);
    });

    // 배치
    els.btnBatch.addEventListener("click", () => renderBatch(els));
    els.btnBatchClear.addEventListener("click", () => {
        els.batchInput.value = "";
        renderBatch(els);
    });
}

function init() {
    initTabs();
    initCopyButtons();
    initFAQ();

    const els = getEls();
    wireEvents(els);
    setDefaults(els);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
