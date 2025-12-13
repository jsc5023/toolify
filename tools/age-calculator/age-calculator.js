// 나이 계산기 전용 JS

const birthInput = document.getElementById("birth-date");
const baseInput = document.getElementById("base-date");

const todayBtn = document.getElementById("today-btn");
const sampleBtn = document.getElementById("sample-btn");
const clearBtn = document.getElementById("clear-btn");
const calcBtn = document.getElementById("calc-btn");

const resultSummaryEl = document.getElementById("result-summary");
const ageManEl = document.getElementById("age-man");
const ageManSubEl = document.getElementById("age-man-sub");
const ageYearEl = document.getElementById("age-year");
const ageKorEl = document.getElementById("age-kor");
const nextBdayEl = document.getElementById("next-bday");
const nextBdaySubEl = document.getElementById("next-bday-sub");
const birthWeekdayEl = document.getElementById("birth-weekday");
const livedEl = document.getElementById("lived");
const livedSubEl = document.getElementById("lived-sub");

const weekdaysKo = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) {
    return String(n).padStart(2, "0");
}

// date input용 YYYY-MM-DD
function formatYMD(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// 시간/타임존 흔들림 줄이려고 "정오" 기준으로 Date 생성
function safeDateFromYMD(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    // 로컬 시간 기준 정오(12:00)로 생성
    return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function daysBetween(a, b) {
    // a, b는 Date (정오)
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isValidYMD(ymd) {
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd);
}

function setTodayToBase() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    baseInput.value = formatYMD(today);
}

function enableCalcIfReady() {
    const ok = isValidYMD(birthInput.value) && isValidYMD(baseInput.value);
    calcBtn.disabled = !ok;
    if (!ok) {
        resultSummaryEl.textContent = "생년월일을 입력하면 결과가 표시됩니다.";
    }
}

// 만 나이 계산
function calcManAge(birth, base) {
    let age = base.getFullYear() - birth.getFullYear();

    const baseMD = (base.getMonth() + 1) * 100 + base.getDate();
    const birthMD = (birth.getMonth() + 1) * 100 + birth.getDate();

    if (baseMD < birthMD) age -= 1;
    return age;
}

// 전체 개월 + 남은 일수 (출생일부터 기준일까지)
function calcMonthsAndDaysLived(birth, base) {
    // base가 birth보다 과거면 0
    if (base.getTime() < birth.getTime()) {
        return { months: 0, days: 0 };
    }

    let months =
        (base.getFullYear() - birth.getFullYear()) * 12 +
        (base.getMonth() - birth.getMonth());

    // "기준일의 일(day)"이 birth의 일보다 작으면 아직 한 달 덜 채움
    if (base.getDate() < birth.getDate()) {
        months -= 1;
    }

    // months를 birth에 더한 날짜를 anchor로 두고 남은 일수를 계산
    const anchor = new Date(birth.getFullYear(), birth.getMonth() + months, birth.getDate(), 12, 0, 0, 0);

    // anchor가 base보다 미래로 튀는 케이스(예: 1/31 + 1개월 = 3/3 같은 JS 보정) 방어
    // 월 이동 후 일자가 밀리면, anchor를 그 달의 마지막 날로 보정
    if (anchor.getMonth() !== (birth.getMonth() + months) % 12) {
        // 보정: 해당 월의 마지막 날로
        const y = birth.getFullYear() + Math.floor((birth.getMonth() + months) / 12);
        const m = (birth.getMonth() + months) % 12;
        const last = new Date(y, m + 1, 0, 12, 0, 0, 0);
        anchor.setFullYear(last.getFullYear(), last.getMonth(), last.getDate());
    }

    const days = daysBetween(anchor, base);
    return { months: Math.max(0, months), days: Math.max(0, days) };
}

// 다음 생일까지 D-day
function calcNextBirthdayInfo(birth, base) {
    const baseY = base.getFullYear();
    let next = new Date(baseY, birth.getMonth(), birth.getDate(), 12, 0, 0, 0);

    // 올해 생일이 이미 지났으면 내년
    const baseMD = (base.getMonth() + 1) * 100 + base.getDate();
    const birthMD = (birth.getMonth() + 1) * 100 + birth.getDate();
    if (baseMD > birthMD) {
        next = new Date(baseY + 1, birth.getMonth(), birth.getDate(), 12, 0, 0, 0);
    } else if (baseMD === birthMD) {
        // 오늘이 생일
        next = new Date(baseY, birth.getMonth(), birth.getDate(), 12, 0, 0, 0);
    }

    // D-day 계산 (오늘 생일이면 0)
    const d = daysBetween(base, next);
    return { nextDate: next, dday: d };
}

function renderResult(birth, base) {
    if (base.getTime() < birth.getTime()) {
        resultSummaryEl.textContent = "기준일이 생년월일보다 빠릅니다. 기준일을 다시 선택해 주세요.";
        ageManEl.textContent = "-";
        ageManSubEl.textContent = "-";
        ageYearEl.textContent = "-";
        ageKorEl.textContent = "-";
        nextBdayEl.textContent = "-";
        nextBdaySubEl.textContent = "-";
        birthWeekdayEl.textContent = "-";
        livedEl.textContent = "-";
        livedSubEl.textContent = "-";
        return;
    }

    // 만/연/세는 나이
    const man = calcManAge(birth, base);
    const yearAge = base.getFullYear() - birth.getFullYear();
    const kor = yearAge + 1;

    ageManEl.textContent = `${man}세`;
    ageYearEl.textContent = `${yearAge}세`;
    ageKorEl.textContent = `${kor}세`;

    // 만 나이 보조 문구
    const baseMD = (base.getMonth() + 1) * 100 + base.getDate();
    const birthMD = (birth.getMonth() + 1) * 100 + birth.getDate();
    if (baseMD === birthMD) {
        ageManSubEl.textContent = "오늘이 생일입니다 🎉";
    } else if (baseMD < birthMD) {
        ageManSubEl.textContent = "올해 생일 전 기준";
    } else {
        ageManSubEl.textContent = "올해 생일 지난 기준";
    }

    // 다음 생일까지
    const { nextDate, dday } = calcNextBirthdayInfo(birth, base);
    if (dday === 0) {
        nextBdayEl.textContent = "D-Day";
        nextBdaySubEl.textContent = "생일 축하합니다 🎂";
    } else {
        nextBdayEl.textContent = `D-${dday}`;
        nextBdaySubEl.textContent = `다음 생일: ${formatYMD(nextDate)}`;
    }

    // 태어난 요일
    const w = weekdaysKo[birth.getDay()];
    birthWeekdayEl.textContent = `${w}요일`;

    // 살아온 개월/일수 + 총 일수
    const livedDays = daysBetween(birth, base); // birth~base (기준일 포함 X)
    const { months, days } = calcMonthsAndDaysLived(birth, base);
    livedEl.textContent = `${months}개월 ${days}일`;
    livedSubEl.textContent = `총 ${livedDays}일째 (기준일: ${formatYMD(base)})`;

    // 요약
    resultSummaryEl.textContent =
        `${formatYMD(base)} 기준으로 계산했습니다. (생년월일: ${formatYMD(birth)})`;
}

function calculate() {
    if (!isValidYMD(birthInput.value) || !isValidYMD(baseInput.value)) return;

    const birth = safeDateFromYMD(birthInput.value);
    const base = safeDateFromYMD(baseInput.value);

    renderResult(birth, base);
}

todayBtn.addEventListener("click", () => {
    setTodayToBase();
    enableCalcIfReady();
    calculate();
});

sampleBtn.addEventListener("click", () => {
    birthInput.value = "1995-08-24";
    setTodayToBase();
    enableCalcIfReady();
    calculate();
});

clearBtn.addEventListener("click", () => {
    birthInput.value = "";
    setTodayToBase();
    enableCalcIfReady();
    // 결과 초기화
    resultSummaryEl.textContent = "생년월일을 입력하면 결과가 표시됩니다.";
    ageManEl.textContent = "-";
    ageManSubEl.textContent = "-";
    ageYearEl.textContent = "-";
    ageKorEl.textContent = "-";
    nextBdayEl.textContent = "-";
    nextBdaySubEl.textContent = "-";
    birthWeekdayEl.textContent = "-";
    livedEl.textContent = "-";
    livedSubEl.textContent = "-";
});

calcBtn.addEventListener("click", () => {
    calculate();
});

// 입력 변화 시 자동 계산(사용성 ↑)
[birthInput, baseInput].forEach((el) => {
    el.addEventListener("input", () => {
        enableCalcIfReady();
        if (!calcBtn.disabled) calculate();
    });
});

// 초기 로드 시 기준일은 오늘로 세팅
setTodayToBase();
enableCalcIfReady();
