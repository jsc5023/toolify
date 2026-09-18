(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.AgeCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
    function pad2(value) { return String(value).padStart(2, "0"); }
    function isLeapYear(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
    function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
    function parseYMD(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return null;
        const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
        return date.month >= 1 && date.month <= 12 && date.day >= 1 && date.day <= daysInMonth(date.year, date.month) ? date : null;
    }
    function formatYMD(date) { return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`; }
    function compareDates(first, second) { return Date.UTC(first.year, first.month - 1, first.day) - Date.UTC(second.year, second.month - 1, second.day); }
    function daysBetween(first, second) { return Math.round((Date.UTC(second.year, second.month - 1, second.day) - Date.UTC(first.year, first.month - 1, first.day)) / 86400000); }
    function weekday(date) { return WEEKDAYS[new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()]; }
    function birthdayInYear(birth, year) { return { year, month: birth.month, day: birth.month === 2 && birth.day === 29 && !isLeapYear(year) ? 28 : birth.day }; }
    function addMonthsClamped(date, months) {
        const index = date.year * 12 + date.month - 1 + months;
        const year = Math.floor(index / 12); const month = index % 12 + 1;
        return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
    }
    function livedMonthsAndDays(birth, base) {
        let months = (base.year - birth.year) * 12 + base.month - birth.month;
        let anchor = addMonthsClamped(birth, months);
        if (compareDates(anchor, base) > 0) { months -= 1; anchor = addMonthsClamped(birth, months); }
        return { months: Math.max(0, months), days: Math.max(0, daysBetween(anchor, base)) };
    }
    function calculate(birthValue, baseValue) {
        const birth = typeof birthValue === "string" ? parseYMD(birthValue) : birthValue;
        const base = typeof baseValue === "string" ? parseYMD(baseValue) : baseValue;
        if (!birth || !base) return { valid: false, error: "생년월일과 기준일을 모두 입력해 주세요." };
        if (compareDates(base, birth) < 0) return { valid: false, error: "기준일이 생년월일보다 빠릅니다. 기준일을 다시 선택해 주세요." };
        const birthday = birthdayInYear(birth, base.year);
        const yearAge = base.year - birth.year;
        const manAge = yearAge - (compareDates(base, birthday) < 0 ? 1 : 0);
        const nextBirthday = compareDates(base, birthday) <= 0 ? birthday : birthdayInYear(birth, base.year + 1);
        const lived = livedMonthsAndDays(birth, base);
        return { valid: true, birth, base, manAge, yearAge, koreanAge: yearAge + 1, birthdayThisYear: birthday, nextBirthday, birthdayDday: daysBetween(base, nextBirthday), birthWeekday: weekday(birth), lived, livedDays: daysBetween(birth, base) };
    }
    function todayYMD(now) { const date = now || new Date(); return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }; }

    function init(doc) {
        const $ = (selector) => doc.querySelector(selector);
        const birthInput = $("#birth-date"), baseInput = $("#base-date"), calcButton = $("#calc-btn");
        function resetResult(message) {
            $(".result-box").classList.remove("is-error"); $("#age-man").textContent = "-"; $("#age-man-sub").textContent = message; $("#age-year").textContent = "-"; $("#age-kor").textContent = "-"; $("#next-bday").textContent = "-"; $("#next-bday-sub").textContent = "-"; $("#birth-weekday").textContent = "-"; $("#lived").textContent = "-"; $("#lived-sub").textContent = "-"; $("#result-summary").textContent = message;
        }
        function render() {
            const result = calculate(birthInput.value, baseInput.value);
            if (!result.valid) {
                const hasBothValues = birthInput.value && baseInput.value;
                $(".result-box").classList.toggle("is-error", Boolean(hasBothValues));
                resetResult(result.error);
                $(".result-box").classList.toggle("is-error", Boolean(hasBothValues));
                return false;
            }
            $(".result-box").classList.remove("is-error");
            $("#age-man").textContent = `만 ${result.manAge}세`;
            const birthdayStatus = result.birthdayDday === 0 ? "오늘이 생일입니다 🎉" : compareDates(result.base, result.birthdayThisYear) < 0 ? "올해 생일 전 기준" : "올해 생일 지난 기준";
            $("#age-man-sub").textContent = birthdayStatus;
            $("#age-year").textContent = `${result.yearAge}세`; $("#age-kor").textContent = `${result.koreanAge}세`;
            $("#next-bday").textContent = result.birthdayDday === 0 ? "D-Day" : `D-${result.birthdayDday}`;
            $("#next-bday-sub").textContent = result.birthdayDday === 0 ? "생일 축하합니다 🎂" : `다음 생일: ${formatYMD(result.nextBirthday)}`;
            $("#birth-weekday").textContent = `${result.birthWeekday}요일`;
            $("#lived").textContent = `${result.lived.months}개월 ${result.lived.days}일`;
            $("#lived-sub").textContent = `총 ${result.livedDays.toLocaleString("ko-KR")}일째`;
            $("#result-summary").textContent = `${formatYMD(result.base)} 기준 · 생년월일 ${formatYMD(result.birth)}`;
            return true;
        }
        function update() { const ready = Boolean(parseYMD(birthInput.value) && parseYMD(baseInput.value)); calcButton.disabled = !ready; if (ready) render(); else resetResult("생년월일을 입력하면 결과가 표시됩니다."); }
        function setBaseToday() { baseInput.value = formatYMD(todayYMD()); update(); }
        birthInput.addEventListener("input", update); baseInput.addEventListener("input", update); calcButton.addEventListener("click", render);
        $("#today-btn").addEventListener("click", setBaseToday);
        $("#sample-btn").addEventListener("click", () => { birthInput.value = "1995-08-24"; baseInput.value = formatYMD(todayYMD()); update(); });
        $("#clear-btn").addEventListener("click", () => { birthInput.value = ""; baseInput.value = formatYMD(todayYMD()); update(); birthInput.focus(); });
        baseInput.value = formatYMD(todayYMD()); update();
    }
    return { isLeapYear, daysInMonth, parseYMD, formatYMD, compareDates, daysBetween, weekday, birthdayInYear, addMonthsClamped, livedMonthsAndDays, calculate, todayYMD, init };
});
