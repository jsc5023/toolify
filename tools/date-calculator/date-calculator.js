const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

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

/* === 두 날짜 사이 일수 계산 === */
document.getElementById("diff-btn").addEventListener("click", () => {
    const start = document.getElementById("start-date").value;
    const end = document.getElementById("end-date").value;
    const includeStart = document.getElementById("include-start").checked;
    const diffResult = document.getElementById("diff-result");

    if (!start || !end) {
        diffResult.textContent = "시작 날짜와 끝 날짜를 모두 선택해주세요.";
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const diffTime = endDate.getTime() - startDate.getTime();
    const baseDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const days = includeStart ? baseDays + 1 : baseDays;

    if (days < 0) {
        diffResult.textContent = "끝 날짜가 시작 날짜보다 앞입니다.";
        return;
    }

    diffResult.textContent = `총 ${days}일 입니다.`;
});

/* === D-Day 계산 === */
const ddayBaseSelect = document.getElementById("dday-base");
const ddayBaseWrapper = document.getElementById("dday-base-wrapper");

ddayBaseSelect.addEventListener("change", () => {
    if (ddayBaseSelect.value === "custom") {
        ddayBaseWrapper.classList.remove("hidden");
    } else {
        ddayBaseWrapper.classList.add("hidden");
    }
});

document.getElementById("dday-btn").addEventListener("click", () => {
    const target = document.getElementById("target-date").value;
    const baseType = ddayBaseSelect.value;
    const baseCustom = document.getElementById("dday-base-date").value;
    const ddayResult = document.getElementById("dday-result");
    const ddayExtra = document.getElementById("dday-extra");

    if (!target) {
        ddayResult.textContent = "목표 날짜를 선택해주세요.";
        ddayExtra.textContent = "";
        return;
    }

    let baseDate;
    if (baseType === "today") {
        const now = new Date();
        baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
        if (!baseCustom) {
            ddayResult.textContent = "기준 날짜를 선택해주세요.";
            ddayExtra.textContent = "";
            return;
        }
        baseDate = new Date(baseCustom);
    }

    const targetDate = new Date(target);
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let label;
    if (diffDays > 0) label = `D-${diffDays}`;
    else if (diffDays === 0) label = "D-Day";
    else label = `D+${Math.abs(diffDays)}`;

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    const weekday = weekdays[targetDate.getDay()];

    ddayResult.textContent = label;
    ddayExtra.textContent = `목표 날짜: ${yyyy}-${mm}-${dd} (${weekday}요일 기준)`;
});

/* === 날짜 + N일 계산 === */
document.getElementById("add-btn").addEventListener("click", () => {
    const base = document.getElementById("base-date").value;
    const days = Number(document.getElementById("days").value);
    const mode = document.getElementById("mode").value;
    const addResult = document.getElementById("add-result");
    const addExtra = document.getElementById("add-extra");

    if (!base || isNaN(days)) {
        addResult.textContent = "기준 날짜와 일수를 입력해주세요.";
        addExtra.textContent = "";
        return;
    }

    const baseDate = new Date(base);
    const offset = mode === "plus" ? days : -days;

    const resultDate = new Date(baseDate);
    resultDate.setDate(resultDate.getDate() + offset);

    const yyyy = resultDate.getFullYear();
    const mm = String(resultDate.getMonth() + 1).padStart(2, "0");
    const dd = String(resultDate.getDate()).padStart(2, "0");
    const weekday = weekdays[resultDate.getDay()];

    addResult.textContent = `결과 날짜: ${yyyy}-${mm}-${dd}`;
    addExtra.textContent = `(${weekday}요일 기준)`;
});

/* === 평일(주말 제외) 기준 일수 계산 === */
document.getElementById("biz-btn").addEventListener("click", () => {
    const start = document.getElementById("biz-start").value;
    const end = document.getElementById("biz-end").value;
    const includeStart = document.getElementById("biz-include-start").checked;
    const bizResult = document.getElementById("biz-result");

    if (!start || !end) {
        bizResult.textContent = "시작 날짜와 끝 날짜를 모두 선택해주세요.";
        return;
    }

    let startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate.getTime() < startDate.getTime()) {
        bizResult.textContent = "끝 날짜가 시작 날짜보다 앞입니다.";
        return;
    }

    if (!includeStart) {
        startDate.setDate(startDate.getDate() + 1);
    }

    let count = 0;
    const current = new Date(startDate);

    while (current.getTime() <= endDate.getTime()) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }

    bizResult.textContent = `평일 기준 총 ${count}일 입니다. (토/일 제외)`;
});

/* === 날짜 목록 보기 === */
document.getElementById("list-btn").addEventListener("click", () => {
    const start = document.getElementById("list-start").value;
    const end = document.getElementById("list-end").value;
    const box = document.getElementById("list-box");
    const summary = document.getElementById("list-summary");

    box.textContent = "";
    summary.textContent = "";

    if (!start || !end) {
        summary.textContent = "시작 날짜와 끝 날짜를 모두 선택해주세요.";
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate.getTime() < startDate.getTime()) {
        summary.textContent = "끝 날짜가 시작 날짜보다 앞입니다.";
        return;
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays > 366) {
        summary.textContent =
            "기간이 366일을 초과합니다. 너무 긴 기간은 목록이 길어져 브라우저가 느려질 수 있습니다.";
    } else {
        summary.textContent = `총 ${totalDays}일, 아래와 같이 날짜 목록을 표시합니다.`;
    }

    const current = new Date(startDate);
    let lines = "";

    while (current.getTime() <= endDate.getTime()) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        const weekday = weekdays[current.getDay()];
        lines += `${yyyy}-${mm}-${dd} (${weekday}요일)\n`;
        current.setDate(current.getDate() + 1);
    }

    box.textContent = lines.trim();
});

/* === 요일 개수 세기 === */
document.getElementById("wd-btn").addEventListener("click", () => {
    const start = document.getElementById("wd-start").value;
    const end = document.getElementById("wd-end").value;
    const box = document.getElementById("wd-box");
    const summary = document.getElementById("wd-summary");

    box.textContent = "";
    summary.textContent = "";

    if (!start || !end) {
        summary.textContent = "시작 날짜와 끝 날짜를 모두 선택해주세요.";
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate.getTime() < startDate.getTime()) {
        summary.textContent = "끝 날짜가 시작 날짜보다 앞입니다.";
        return;
    }

    const counts = [0, 0, 0, 0, 0, 0, 0];
    const current = new Date(startDate);

    while (current.getTime() <= endDate.getTime()) {
        counts[current.getDay()]++;
        current.setDate(current.getDate() + 1);
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    summary.textContent = `총 ${totalDays}일 동안 요일별 개수입니다.`;

    let lines = "";
    for (let i = 0; i < 7; i++) {
        lines += `${weekdays[i]}요일: ${counts[i]}회\n`;
    }
    box.textContent = lines.trim();
});


/* ============================================================
   ✅ 여기부터 — "오늘 날짜를 기본값으로 자동 설정" 기능 추가
   ============================================================ */

/** yyyy-mm-dd 형태의 오늘 날짜 반환 (KST 포함 로컬 기준) */
function getTodayStr() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

/** 비어 있는 input[type=date]에 기본값(오늘) 채워 넣기 */
function initDefaultDates() {
    const today = getTodayStr();
    document.querySelectorAll('input[type="date"]').forEach((el) => {
        if (!el.value) el.value = today;
    });
}

/** 페이지 로드 후 실행 */
document.addEventListener("DOMContentLoaded", () => {
    initDefaultDates();
});

/** FAQ 토글 */
document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
        const item = btn.parentElement;
        item.classList.toggle("active");
    });
});
