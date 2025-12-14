/* ============================
   시간 계산기 전용 JS
   - 날짜 계산기와 동일한 탭 전환 방식
   - 시간 차이 / N시간 후전 / 근무시간 / 단위 변환
   - FAQ 아코디언
   - 기본값 자동 세팅
   ============================ */

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

/* === 탭 전환 (date-calculator와 동일) === */
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

/* ===== 유틸 ===== */
function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatKoreanDateTime(d) {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    const wd = weekdays[d.getDay()];
    return `${yyyy}-${mm}-${dd} (${wd}) ${hh}:${mi}:${ss}`;
}

function formatDateTimeLocal(d) {
    // datetime-local: YYYY-MM-DDTHH:mm
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parseDateTimeLocal(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
}

function msToParts(msAbs) {
    const totalSeconds = Math.floor(msAbs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const rem1 = totalSeconds % 86400;
    const hours = Math.floor(rem1 / 3600);
    const rem2 = rem1 % 3600;
    const minutes = Math.floor(rem2 / 60);
    const seconds = rem2 % 60;
    return { totalSeconds, days, hours, minutes, seconds };
}

function partsToPretty(p) {
    const seg = [];
    if (p.days) seg.push(`${p.days}일`);
    seg.push(`${p.hours}시간`);
    seg.push(`${p.minutes}분`);
    seg.push(`${p.seconds}초`);
    return seg.join(" ");
}

/* ============================================================
   1) 시간 차이
   ============================================================ */
document.getElementById("diff-btn").addEventListener("click", () => {
    const sVal = document.getElementById("diff-start").value;
    const eVal = document.getElementById("diff-end").value;
    const result = document.getElementById("diff-result");
    const extra = document.getElementById("diff-extra");

    const s = parseDateTimeLocal(sVal);
    const e = parseDateTimeLocal(eVal);

    if (!s || !e) {
        result.textContent = "시작 시간과 종료 시간을 모두 입력해주세요.";
        extra.textContent = "";
        return;
    }

    const delta = e.getTime() - s.getTime();
    if (delta < 0) {
        result.textContent = "종료 시간이 시작 시간보다 앞입니다.";
        extra.textContent = "";
        return;
    }

    const parts = msToParts(delta);
    result.textContent = `총 ${partsToPretty(parts)} 입니다.`;
    extra.textContent = `총 ${parts.totalSeconds.toLocaleString()}초 · 시작: ${formatKoreanDateTime(s)} · 종료: ${formatKoreanDateTime(e)}`;
});

document.getElementById("diff-swap").addEventListener("click", () => {
    const s = document.getElementById("diff-start");
    const e = document.getElementById("diff-end");
    const tmp = s.value;
    s.value = e.value;
    e.value = tmp;
});

/* ============================================================
   2) N시간 후/전
   ============================================================ */
function unitToMs(unit) {
    if (unit === "hours") return 3600 * 1000;
    if (unit === "minutes") return 60 * 1000;
    return 1000; // seconds
}

document.getElementById("as-btn").addEventListener("click", () => {
    const baseVal = document.getElementById("as-base").value;
    const v = Number(document.getElementById("as-value").value);
    const unit = document.getElementById("as-unit").value;
    const mode = document.getElementById("as-mode").value;

    const result = document.getElementById("as-result");
    const extra = document.getElementById("as-extra");

    const base = parseDateTimeLocal(baseVal);
    if (!base) {
        result.textContent = "기준 시간을 입력해주세요.";
        extra.textContent = "";
        return;
    }

    if (isNaN(v)) {
        result.textContent = "값을 숫자로 입력해주세요.";
        extra.textContent = "";
        return;
    }

    const offsetMs = v * unitToMs(unit) * (mode === "plus" ? 1 : -1);
    const out = new Date(base.getTime() + offsetMs);

    const unitLabel = unit === "hours" ? "시간" : unit === "minutes" ? "분" : "초";
    const modeLabel = mode === "plus" ? "더한" : "뺀";

    result.textContent = `결과 시간: ${formatKoreanDateTime(out)}`;
    extra.textContent = `기준: ${formatKoreanDateTime(base)} · ${v}${unitLabel} ${modeLabel} 결과`;
});

document.getElementById("as-now").addEventListener("click", () => {
    document.getElementById("as-base").value = formatDateTimeLocal(new Date());
});

/* ============================================================
   3) 근무시간
   ============================================================ */
document.getElementById("work-btn").addEventListener("click", () => {
    const sVal = document.getElementById("work-start").value;
    const eVal = document.getElementById("work-end").value;
    const breakMin = Number(document.getElementById("work-break").value);
    const clamp = document.getElementById("work-clamp").checked;

    const result = document.getElementById("work-result");
    const extra = document.getElementById("work-extra");

    const s = parseDateTimeLocal(sVal);
    const e = parseDateTimeLocal(eVal);

    if (!s || !e) {
        result.textContent = "근무 시작과 종료 시간을 모두 입력해주세요.";
        extra.textContent = "";
        return;
    }

    const totalMs = e.getTime() - s.getTime();
    if (totalMs < 0) {
        result.textContent = "근무 종료 시간이 시작 시간보다 앞입니다.";
        extra.textContent = "";
        return;
    }

    if (isNaN(breakMin) || breakMin < 0) {
        result.textContent = "휴게시간(분)을 0 이상의 숫자로 입력해주세요.";
        extra.textContent = "";
        return;
    }

    const breakMs = breakMin * 60 * 1000;
    let netMs = totalMs - breakMs;

    if (netMs < 0) {
        if (clamp) netMs = 0;
        else {
            result.textContent = "휴게시간이 총 근무시간보다 큽니다. 휴게시간을 줄여주세요.";
            extra.textContent = "";
            return;
        }
    }

    const totalParts = msToParts(totalMs);
    const netParts = msToParts(netMs);

    result.textContent = `실 근무시간: ${partsToPretty(netParts)} 입니다.`;
    extra.textContent = `총 시간: ${partsToPretty(totalParts)} · 휴게: ${breakMin}분 제외 · 시작: ${formatKoreanDateTime(s)} · 종료: ${formatKoreanDateTime(e)}`;
});

document.getElementById("work-sample").addEventListener("click", () => {
    const now = new Date();
    const s = new Date(now);
    s.setHours(9, 0, 0, 0);
    const e = new Date(now);
    e.setHours(18, 0, 0, 0);

    document.getElementById("work-start").value = formatDateTimeLocal(s);
    document.getElementById("work-end").value = formatDateTimeLocal(e);
    document.getElementById("work-break").value = 60;
});

/* ============================================================
   4) 단위 변환
   ============================================================ */
function toSeconds(value, unit) {
    if (unit === "hours") return value * 3600;
    if (unit === "minutes") return value * 60;
    return value;
}

function fromSeconds(sec, unit) {
    if (unit === "hours") return sec / 3600;
    if (unit === "minutes") return sec / 60;
    return sec;
}

function prettifyNumber(x) {
    if (Number.isInteger(x)) return x.toString();
    return x.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

document.getElementById("cv-btn").addEventListener("click", () => {
    const v = Number(document.getElementById("cv-value").value);
    const from = document.getElementById("cv-from").value;
    const to = document.getElementById("cv-to").value;

    const result = document.getElementById("cv-result");
    const extra = document.getElementById("cv-extra");

    if (isNaN(v) || v < 0) {
        result.textContent = "입력 값을 0 이상의 숫자로 입력해주세요.";
        extra.textContent = "";
        return;
    }

    const sec = toSeconds(v, from);
    const out = fromSeconds(sec, to);

    const fromLabel = from === "hours" ? "시간" : from === "minutes" ? "분" : "초";
    const toLabel = to === "hours" ? "시간" : to === "minutes" ? "분" : "초";

    result.textContent = `변환 값: ${prettifyNumber(out)} ${toLabel}`;
    extra.textContent = `${v} ${fromLabel} = ${prettifyNumber(out)} ${toLabel}`;
});

document.getElementById("cv-swap").addEventListener("click", () => {
    const fromEl = document.getElementById("cv-from");
    const toEl = document.getElementById("cv-to");
    const tmp = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = tmp;
});

/* ============================================================
   ✅ 기본값 자동 설정 (datetime-local)
   ============================================================ */
function initDefaultDateTimes() {
    const now = new Date();

    // diff 기본: 오늘 09:00 ~ 18:00
    const d1 = new Date(now);
    d1.setHours(9, 0, 0, 0);
    const d2 = new Date(now);
    d2.setHours(18, 0, 0, 0);

    const diffStart = document.getElementById("diff-start");
    const diffEnd = document.getElementById("diff-end");
    if (diffStart && !diffStart.value) diffStart.value = formatDateTimeLocal(d1);
    if (diffEnd && !diffEnd.value) diffEnd.value = formatDateTimeLocal(d2);

    // addsub 기본: 현재 시간
    const asBase = document.getElementById("as-base");
    if (asBase && !asBase.value) asBase.value = formatDateTimeLocal(now);

    // work 기본: 오늘 09:00 ~ 18:00, 휴게 60
    const workStart = document.getElementById("work-start");
    const workEnd = document.getElementById("work-end");
    const workBreak = document.getElementById("work-break");
    if (workStart && !workStart.value) workStart.value = formatDateTimeLocal(d1);
    if (workEnd && !workEnd.value) workEnd.value = formatDateTimeLocal(d2);
    if (workBreak && !workBreak.value) workBreak.value = 60;

    // convert 기본: 3600 초
    const cvValue = document.getElementById("cv-value");
    if (cvValue && !cvValue.value) cvValue.value = 3600;
}

document.addEventListener("DOMContentLoaded", () => {
    initDefaultDateTimes();
});

/* ============================================================
   FAQ 아코디언 (date-calculator와 동일)
   ============================================================ */
document.querySelectorAll(".faq-item .faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        item.classList.toggle("active");
    });
});
