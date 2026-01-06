/* ============================================================
   한국형 Unix Timestamp 변환기
   - 초/밀리초 자동 감지
   - KST/UTC/ISO 출력
   - 상대시간(방금 전/몇분 전)
   - 배치 변환(여러 줄)
   ============================================================ */

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatKST(date) {
    // Intl 지원 브라우저에서는 Asia/Seoul 타임존 포맷
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
        // "2026. 01. 05. (월) 18:12:33" 형태가 나올 수 있어서 공백 정리
        return fmt.format(date).replace(/\s+/g, " ").trim() + " KST";
    } catch (e) {
        // fallback: KST는 UTC+9로 계산(서머타임 고려 X)
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
    return date.toISOString(); // 2026-01-05T09:12:33.000Z
}

function relativeKorean(targetMs) {
    const now = Date.now();
    let diff = targetMs - now; // 미래면 +
    const abs = Math.abs(diff);

    const sec = Math.floor(abs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    const suffix = diff >= 0 ? "후" : "전";

    if (sec < 10) return "방금 " + (diff >= 0 ? "후" : "전");
    if (sec < 60) return `${sec}초 ${suffix}`;
    if (min < 60) return `${min}분 ${suffix}`;
    if (hr < 24) return `${hr}시간 ${suffix}`;
    if (day < 30) return `${day}일 ${suffix}`;

    // 너무 크면 날짜로 유도
    return diff >= 0 ? "미래(날짜 확인)" : "과거(날짜 확인)";
}

function ddayLabelKST(targetDate) {
    // KST 기준 "오늘 00:00"과 비교해서 D-day 계산
    const now = new Date();
    const kstNowMs = now.getTime() + 9 * 60 * 60 * 1000;
    const kstNow = new Date(kstNowMs);

    const base = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())); // KST 00:00
    const targetKstMs = targetDate.getTime() + 9 * 60 * 60 * 1000;
    const t = new Date(targetKstMs);
    const targetBase = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));

    const diffDays = Math.floor((targetBase.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `D-${diffDays}`;
    if (diffDays === 0) return "D-Day";
    return `D+${Math.abs(diffDays)}`;
}

function cleanNumberText(s) {
    return (s || "").trim().replace(/[, ]+/g, "");
}

function detectUnit(numStr) {
    // auto: 길이 기반(가장 흔한 케이스)
    // 10=초, 13=밀리초
    // 16=마이크로초, 19=나노초(옵션 처리 가능)
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
    if (unit === "us") return Math.floor(n / 1000); // 마이크로초 → ms
    if (unit === "ns") return Math.floor(n / 1_000_000); // 나노초 → ms
    return NaN;
}

function fromDateToTimestamp(date, unit) {
    const ms = date.getTime();
    if (unit === "ms") return String(ms);
    if (unit === "s") return String(Math.floor(ms / 1000));
    return String(ms);
}

/* =============================
   단일 변환
   ============================= */
const tsInput = document.getElementById("ts-input");
const unitSelect = document.getElementById("ts-unit");
const btnConvert = document.getElementById("btn-convert");
const btnNow = document.getElementById("btn-now");
const btnClear = document.getElementById("btn-clear");

const outKst = document.getElementById("out-kst");
const outUtc = document.getElementById("out-utc");
const outIso = document.getElementById("out-iso");
const outRel = document.getElementById("out-rel");
const outDday = document.getElementById("out-dday");
const outHint = document.getElementById("out-hint");

function renderFromTimestamp() {
    const raw = cleanNumberText(tsInput.value);
    if (!raw) {
        outHint.textContent = "timestamp를 입력해주세요. (예: 1700000000 또는 1700000000000)";
        outKst.textContent = "-";
        outUtc.textContent = "-";
        outIso.textContent = "-";
        outRel.textContent = "-";
        outDday.textContent = "-";
        return;
    }

    const forced = unitSelect.value; // auto/s/ms/us/ns
    const unit = forced === "auto" ? detectUnit(raw) : forced;

    const ms = toMs(raw, unit);
    if (!Number.isFinite(ms)) {
        outHint.textContent = "숫자 형태의 timestamp만 입력해주세요.";
        return;
    }

    const d = new Date(ms);
    if (isNaN(d.getTime())) {
        outHint.textContent = "유효한 timestamp가 아닙니다. 값/단위를 확인해주세요.";
        return;
    }

    const len = raw.length;
    const unitLabel = unit === "s" ? "초(s)" : unit === "ms" ? "밀리초(ms)" : unit === "us" ? "마이크로초(μs)" : "나노초(ns)";

    outHint.textContent = `감지 단위: ${unitLabel} (입력 길이: ${len}자리)`;
    outKst.textContent = formatKST(d);
    outUtc.textContent = formatUTC(d);
    outIso.textContent = formatISO(d);
    outRel.textContent = relativeKorean(ms);
    outDday.textContent = ddayLabelKST(d);
}

btnConvert.addEventListener("click", renderFromTimestamp);

btnNow.addEventListener("click", () => {
    tsInput.value = String(Date.now()); // ms
    unitSelect.value = "ms";
    renderFromTimestamp();
});

btnClear.addEventListener("click", () => {
    tsInput.value = "";
    unitSelect.value = "auto";
    renderFromTimestamp();
});

/* =============================
   날짜 → timestamp
   ============================= */
const dtInput = document.getElementById("dt-input");
const dtUnit = document.getElementById("dt-unit");
const btnDtConvert = document.getElementById("btn-dt-convert");
const btnDtNow = document.getElementById("btn-dt-now");

const dtOutS = document.getElementById("dt-out-s");
const dtOutMs = document.getElementById("dt-out-ms");
const dtHint = document.getElementById("dt-hint");

function renderFromDatetime() {
    const v = dtInput.value;
    if (!v) {
        dtHint.textContent = "날짜/시간을 선택해주세요.";
        dtOutS.textContent = "-";
        dtOutMs.textContent = "-";
        return;
    }

    // datetime-local은 로컬 타임존 기준으로 Date가 만들어짐
    const d = new Date(v);
    if (isNaN(d.getTime())) {
        dtHint.textContent = "유효한 날짜/시간이 아닙니다.";
        return;
    }

    dtOutS.textContent = fromDateToTimestamp(d, "s");
    dtOutMs.textContent = fromDateToTimestamp(d, "ms");
    dtHint.textContent = `선택한 시간(로컬 기준)을 timestamp로 변환합니다. (표시: KST/UTC는 위 섹션에서 확인 가능)`;
}

btnDtConvert.addEventListener("click", renderFromDatetime);

btnDtNow.addEventListener("click", () => {
    const now = new Date();
    // datetime-local 입력값 형식: YYYY-MM-DDTHH:mm:ss
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    const hh = pad2(now.getHours());
    const mi = pad2(now.getMinutes());
    const ss = pad2(now.getSeconds());
    dtInput.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
    renderFromDatetime();
});

/* =============================
   배치 변환
   ============================= */
const batchInput = document.getElementById("batch-input");
const btnBatch = document.getElementById("btn-batch");
const btnBatchClear = document.getElementById("btn-batch-clear");
const batchSummary = document.getElementById("batch-summary");
const batchTableBody = document.getElementById("batch-tbody");

function extractTimestampCandidate(line) {
    // 라인에서 9~19자리 숫자 덩어리 추출 (로그에서 흔한 패턴)
    const m = line.match(/\b\d{9,19}\b/);
    return m ? m[0] : null;
}

function renderBatch() {
    const text = batchInput.value || "";
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

    batchTableBody.innerHTML = "";
    if (lines.length === 0) {
        batchSummary.textContent = "여러 줄 timestamp를 붙여넣으면 자동 변환해서 표로 보여줍니다.";
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
        const unitLabel = unit === "s" ? "초(s)" : unit === "ms" ? "밀리초(ms)" : unit === "us" ? "마이크로초(μs)" : "나노초(ns)";
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

        batchTableBody.appendChild(tr);
    });

    batchSummary.textContent = `총 ${lines.length}줄 중 ${ok}줄 변환 성공 (숫자 9~19자리 자동 감지)`;
}

btnBatch.addEventListener("click", renderBatch);
btnBatchClear.addEventListener("click", () => {
    batchInput.value = "";
    renderBatch();
});

/* =============================
   복사 버튼
   ============================= */
document.querySelectorAll("[data-copy-target]").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const targetId = btn.getAttribute("data-copy-target");
        const el = document.getElementById(targetId);
        const text = (el?.textContent || "").trim();
        if (!text || text === "-") return;

        try {
            await navigator.clipboard.writeText(text);
            btn.textContent = "복사됨!";
            setTimeout(() => (btn.textContent = "복사"), 800);
        } catch (e) {
            alert("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
        }
    });
});

/* =============================
   초기값 p
   ============================= */
document.addEventListener("DOMContentLoaded", () => {
    // timestamp는 현재(ms)로 기본 세팅
    tsInput.value = String(Date.now());
    unitSelect.value = "ms";
    renderFromTimestamp();

    // datetime-local은 현재로 기본 세팅
    btnDtNow.click();

    // 배치 안내 문구
    renderBatch();
});
