(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.MultipleDateInterval = api;
    if (root.document) {
        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", () => api.init(root.document));
        } else {
            api.init(root.document);
        }
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const DAY_MS = 86400000;
    const MAX_ROWS = 100;

    function isLeapYear(year) {
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }

    function daysInMonth(year, month) {
        if (month === 2) return isLeapYear(year) ? 29 : 28;
        return [4, 6, 9, 11].includes(month) ? 30 : 31;
    }

    function parseYMD(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
        return { year, month, day, value: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
    }

    // Date-only values are converted at UTC midnight. setUTCFullYear avoids Date.UTC's 1900 offset for years 0–99.
    function toDayNumber(date) {
        const utc = new Date(0);
        utc.setUTCHours(0, 0, 0, 0);
        utc.setUTCFullYear(date.year, date.month - 1, date.day);
        return Math.floor(utc.getTime() / DAY_MS);
    }

    function compareDates(left, right) {
        return toDayNumber(left) - toDayNumber(right);
    }

    function differenceDays(from, to) {
        return toDayNumber(to) - toDayNumber(from);
    }

    function effectiveDays(rawDays, includeStart) {
        if (!includeStart) return rawDays;
        if (rawDays > 0) return rawDays + 1;
        if (rawDays < 0) return rawDays - 1;
        return 1;
    }

    function addMonthsClamped(date, months) {
        const monthIndex = date.year * 12 + date.month - 1 + months;
        const year = Math.floor(monthIndex / 12);
        const month = ((monthIndex % 12) + 12) % 12 + 1;
        return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
    }

    function calendarDuration(from, to) {
        let start = from;
        let end = to;
        if (compareDates(start, end) > 0) {
            start = to;
            end = from;
        }

        let totalMonths = Math.max(0, (end.year - start.year) * 12 + end.month - start.month);
        while (totalMonths > 0 && compareDates(addMonthsClamped(start, totalMonths), end) > 0) totalMonths -= 1;
        const anchor = addMonthsClamped(start, totalMonths);
        return {
            years: Math.floor(totalMonths / 12),
            months: totalMonths % 12,
            days: differenceDays(anchor, end)
        };
    }

    function weekdayIndex(date) {
        return ((toDayNumber(date) + 4) % 7 + 7) % 7;
    }

    function countWeekdaysInclusive(from, to) {
        let start = from;
        let end = to;
        if (compareDates(start, end) > 0) {
            start = to;
            end = from;
        }
        const length = differenceDays(start, end) + 1;
        const fullWeeks = Math.floor(length / 7);
        let weekdays = fullWeeks * 5;
        const remainder = length % 7;
        const firstWeekday = weekdayIndex(start);
        for (let offset = 0; offset < remainder; offset += 1) {
            const weekday = (firstWeekday + offset) % 7;
            if (weekday >= 1 && weekday <= 5) weekdays += 1;
        }
        return weekdays;
    }

    function businessBreakdown(from, to, includeStart) {
        const rawDays = differenceDays(from, to);
        const total = Math.abs(rawDays) + (includeStart ? 1 : 0);
        if (total === 0) return { total: 0, weekdays: 0, weekends: 0 };

        let weekdays = countWeekdaysInclusive(from, to);
        if (!includeStart) {
            const startWeekday = weekdayIndex(from);
            if (startWeekday >= 1 && startWeekday <= 5) weekdays -= 1;
        }
        return { total, weekdays, weekends: total - weekdays };
    }

    function calculateRows(rows, options) {
        const settings = Object.assign({ includeStart: false, businessDays: false }, options);
        const parsedRows = rows.map((row, index) => ({
            index,
            date: parseYMD(row.date),
            value: row.date || "",
            memo: row.memo || ""
        }));
        const validRows = parsedRows.filter((row) => row.date);
        const intervals = [];

        for (let index = 0; index < parsedRows.length - 1; index += 1) {
            const from = parsedRows[index];
            const to = parsedRows[index + 1];
            if (!from.date || !to.date) continue;
            const rawDays = differenceDays(from.date, to.date);
            intervals.push({
                fromIndex: index,
                toIndex: index + 1,
                from,
                to,
                rawDays,
                days: effectiveDays(rawDays, settings.includeStart),
                reverse: rawDays < 0,
                business: settings.businessDays ? businessBreakdown(from.date, to.date, settings.includeStart) : null
            });
        }

        const absoluteGaps = intervals.map((interval) => Math.abs(interval.days));
        let total = null;
        let hasBlankBreak = false;
        if (validRows.length >= 2) {
            const first = validRows[0];
            const last = validRows[validRows.length - 1];
            const rawDays = differenceDays(first.date, last.date);
            hasBlankBreak = parsedRows.slice(first.index + 1, last.index).some((row) => !row.date);
            total = {
                from: first,
                to: last,
                rawDays,
                days: effectiveDays(rawDays, settings.includeStart),
                reverse: rawDays < 0,
                calendar: calendarDuration(first.date, last.date),
                business: settings.businessDays ? businessBreakdown(first.date, last.date, settings.includeStart) : null
            };
        }

        return {
            parsedRows,
            validCount: validRows.length,
            intervalCount: intervals.length,
            intervals,
            total,
            hasBlankBreak,
            average: absoluteGaps.length ? absoluteGaps.reduce((sum, value) => sum + value, 0) / absoluteGaps.length : null,
            shortest: absoluteGaps.length ? Math.min(...absoluteGaps) : null,
            longest: absoluteGaps.length ? Math.max(...absoluteGaps) : null
        };
    }

    // 날짜 입력칸 서식/보정. 년 4자리·월 2자리·일 2자리만 받으며, 범위를 넘는 값은 가능한 최대값으로 보정한다.
    // (연도는 최대 4자리, 월은 1~12, 일은 해당 달의 마지막 날까지)
    const DATE_SEGMENT_LIMITS = [4, 2, 2];

    function clampNumber(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeDateText(raw, final) {
        const source = String(raw == null ? "" : raw);
        const parts = ["", "", ""];
        let segment = 0;
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (char >= "0" && char <= "9") {
                if (parts[segment].length >= DATE_SEGMENT_LIMITS[segment]) {
                    // 뒤에 구분자가 이어지면 넘치는 숫자는 버린다(99999-09-19 → 9999-09-19). 구분자 없이 이어 쓰면 다음 칸으로 넘긴다.
                    if (segment === 2 || /\D/.test(source.slice(index + 1))) continue;
                    segment += 1;
                }
                parts[segment] += char;
            } else if (parts[segment].length > 0 && segment < 2) {
                // 구분자를 방금 입력한 경우에만(뒤에 숫자가 없을 때) 한 자리 월/일을 0으로 채운다.
                if (segment > 0 && parts[segment].length === 1 && !/\d/.test(source.slice(index + 1))) parts[segment] = `0${parts[segment]}`;
                segment += 1;
            }
        }

        if (final) {
            if (parts[1].length === 1) parts[1] = `0${parts[1]}`;
            if (parts[2].length === 1) parts[2] = `0${parts[2]}`;
        }
        if (parts[0].length === 4 && Number(parts[0]) < 1) parts[0] = "0001";
        if (parts[1].length === 2) parts[1] = String(clampNumber(Number(parts[1]), 1, 12)).padStart(2, "0");
        if (parts[2].length === 2) {
            const monthKnown = parts[0].length === 4 && parts[1].length === 2;
            const maxDay = monthKnown ? daysInMonth(Number(parts[0]), Number(parts[1])) : 31;
            parts[2] = String(clampNumber(Number(parts[2]), 1, maxDay)).padStart(2, "0");
        }

        let text = parts[0];
        if (segment >= 1) text += `-${parts[1]}`;
        if (segment >= 2) text += `-${parts[2]}`;
        const complete = parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2;
        return { text, canonical: complete ? parts.join("-") : "" };
    }

    // 계산에 쓰는 값: 한 자리 월/일(2026-2-9)도 채워서 유효한 YYYY-MM-DD 로 만든다. 불완전하면 "".
    function canonicalDate(raw) {
        return normalizeDateText(raw, true).canonical;
    }

    function toYMDString(date) {
        return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    }

    // Day arithmetic goes through the UTC day number, so the browser's time zone / DST never shifts a calendar date.
    function addDays(date, days) {
        const shifted = new Date((toDayNumber(date) + days) * DAY_MS);
        return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
    }

    // "Today" is the visitor's local calendar date at the moment the page is used.
    function localToday(now) {
        return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    }

    function todayValue(now) {
        return toYMDString(localToday(now));
    }

    function defaultDateValues(now) {
        const today = localToday(now);
        return [toYMDString(today), toYMDString(addDays(today, 7))];
    }

    function formatDate(date) {
        return date ? `${String(date.year).padStart(4, "0")}.${String(date.month).padStart(2, "0")}.${String(date.day).padStart(2, "0")}` : "";
    }

    function formatWeeks(days) {
        const absolute = Math.abs(days);
        const weeks = Math.floor(absolute / 7);
        const remainder = absolute % 7;
        if (!weeks) return `${remainder}일`;
        return remainder ? `${weeks}주 ${remainder}일` : `${weeks}주`;
    }

    function formatDays(days) {
        return `${Number(days).toLocaleString("en-US")}일`;
    }

    function formatAverage(value) {
        if (value === null) return "-";
        return `${Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}일`;
    }

    function init(doc) {
        const list = doc.getElementById("date-list");
        const template = doc.getElementById("date-row-template");
        if (!list || !template || list.dataset.initialized) return;
        list.dataset.initialized = "true";

        const elements = {
            add: doc.getElementById("add-date-btn"),
            limit: doc.getElementById("limit-message"),
            includeStart: doc.getElementById("include-start"),
            businessDays: doc.getElementById("business-days"),
            sort: doc.getElementById("sort-btn"),
            copy: doc.getElementById("copy-btn"),
            reset: doc.getElementById("reset-btn"),
            feedback: doc.getElementById("copy-feedback"),
            totalDays: doc.getElementById("total-days"),
            totalCalendar: doc.getElementById("total-calendar"),
            totalRange: doc.getElementById("total-range"),
            countSummary: doc.getElementById("count-summary"),
            average: doc.getElementById("average-gap"),
            shortest: doc.getElementById("shortest-gap"),
            shortestRange: doc.getElementById("shortest-range"),
            longest: doc.getElementById("longest-gap"),
            longestRange: doc.getElementById("longest-range"),
            businessSummary: doc.getElementById("business-summary"),
            businessNote: doc.getElementById("business-note"),
            totalWeekdays: doc.getElementById("total-weekdays"),
            totalWeekends: doc.getElementById("total-weekends"),
            notice: doc.getElementById("summary-notice")
        };
        let nextRowId = 1;
        let latestResult = null;
        let feedbackTimer = null;
        let reorderLocked = false;
        const REORDER_MS = 200;
        const REDUCED_MOTION = doc.defaultView && doc.defaultView.matchMedia ? doc.defaultView.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

        function createRow(dateValue, memoValue) {
            const fragment = template.content.cloneNode(true);
            const entry = fragment.querySelector(".date-entry");
            entry.dataset.rowId = String(nextRowId++);
            fragment.querySelector(".date-input").value = dateValue || "";
            fragment.querySelector(".memo-input").value = memoValue || "";
            list.appendChild(fragment);
            return entry;
        }

        // 아주 약한 배경 강조. 클래스를 뗐다 붙여 연속 동작에서도 애니메이션이 다시 시작되게 한다.
        function flashRow(entry) {
            const row = entry.querySelector(".date-row");
            row.classList.remove("is-flash");
            void row.offsetWidth;
            row.classList.add("is-flash");
        }

        function focusKeepingView(control, entry, behavior) {
            control.focus({ preventScroll: true });
            entry.scrollIntoView({ block: "nearest", behavior: behavior || "auto" });
        }

        // FLIP: 실제로 자리를 바꾸는 두 항목(entry)만 translateY 로 이동시킨다.
        // 위치는 목록 상단 기준 offset 으로 재므로 포커스 이동에 따른 페이지 스크롤과 무관하다.
        function reorderEntries(entry, other, isUp) {
            const listTop = () => list.getBoundingClientRect().top;
            const pair = [entry, other];
            const animate = !REDUCED_MOTION.matches;
            const first = animate ? pair.map((node) => node.getBoundingClientRect().top - listTop()) : null;

            if (isUp) list.insertBefore(entry, other);
            else list.insertBefore(other, entry);
            updateAll();
            const same = entry.querySelector(isUp ? ".move-up" : ".move-down");
            const opposite = entry.querySelector(isUp ? ".move-down" : ".move-up");
            focusKeepingView(same.disabled ? opposite : same, entry, "instant");
            if (!animate) return;

            const deltas = pair.map((node, index) => first[index] - (node.getBoundingClientRect().top - listTop()));
            if (!deltas.some((delta) => Math.abs(delta) > 0.5)) return;

            reorderLocked = true;
            pair.forEach((node, index) => {
                node.classList.add("is-swapping");
                node.style.transition = "none";
                node.style.transform = `translateY(${deltas[index]}px)`;
            });
            entry.classList.add("is-swapping-lead");
            void list.offsetHeight;
            pair.forEach((node) => {
                node.style.transition = `transform ${REORDER_MS}ms ease-out`;
                node.style.transform = "";
            });
            setTimeout(() => {
                pair.forEach((node) => {
                    node.classList.remove("is-swapping", "is-swapping-lead");
                    node.style.transition = "";
                    node.style.transform = "";
                });
                reorderLocked = false;
            }, REORDER_MS + 20);
        }

        function createDefaultRows() {
            defaultDateValues(new Date()).forEach((value) => createRow(value));
        }

        function entries() {
            return Array.from(list.querySelectorAll(".date-entry"));
        }

        function readRows() {
            return entries().map((entry) => ({
                date: canonicalDate(entry.querySelector(".date-input").value),
                memo: entry.querySelector(".memo-input").value.trim()
            }));
        }

        function syncMemoToggle(entry) {
            const toggle = entry.querySelector(".memo-toggle");
            const open = !entry.querySelector(".memo-row").hidden;
            const hasMemo = entry.querySelector(".memo-input").value.trim() !== "";
            toggle.setAttribute("aria-expanded", String(open));
            toggle.classList.toggle("has-memo", hasMemo);
            toggle.querySelector(".memo-label").textContent = open ? "메모 닫기" : hasMemo ? "메모" : "+ 메모";
        }

        function toggleMemo(entry) {
            const row = entry.querySelector(".memo-row");
            row.hidden = !row.hidden;
            syncMemoToggle(entry);
            if (!row.hidden) entry.querySelector(".memo-input").focus();
        }

        function renumberRows() {
            const rows = entries();
            rows.forEach((entry, index) => {
                const number = index + 1;
                const dateInput = entry.querySelector(".date-input");
                const memoInput = entry.querySelector(".memo-input");
                const memoToggle = entry.querySelector(".memo-toggle");
                dateInput.id = `mdi-date-${entry.dataset.rowId}`;
                memoInput.id = `mdi-memo-${entry.dataset.rowId}`;
                dateInput.setAttribute("aria-label", `${number}번째 날짜`);
                entry.querySelector(".date-picker-btn").setAttribute("aria-label", `${number}번째 날짜 달력에서 선택`);
                memoInput.setAttribute("aria-label", `${number}번째 날짜 메모`);
                memoToggle.setAttribute("aria-controls", memoInput.id);
                entry.querySelector(".row-number").textContent = String(number).padStart(2, "0");
                const up = entry.querySelector(".move-up");
                const down = entry.querySelector(".move-down");
                const remove = entry.querySelector(".delete-row");
                up.disabled = index === 0;
                down.disabled = index === rows.length - 1;
                remove.disabled = rows.length <= 2;
                up.setAttribute("aria-label", `${number}번째 날짜 위로 이동`);
                down.setAttribute("aria-label", `${number}번째 날짜 아래로 이동`);
                remove.setAttribute("aria-label", `${number}번째 날짜 삭제`);
                entry.querySelector(".interval-result").hidden = index === rows.length - 1;
                syncMemoToggle(entry);
            });
            elements.add.disabled = rows.length >= MAX_ROWS;
            elements.limit.textContent = rows.length >= MAX_ROWS ? "날짜는 최대 100개까지 추가할 수 있습니다." : `${rows.length} / ${MAX_ROWS}개`;
        }

        function updateIntervalCards(result) {
            const intervalMap = new Map(result.intervals.map((interval) => [interval.fromIndex, interval]));
            entries().forEach((entry, index) => {
                const box = entry.querySelector(".interval-result");
                if (box.hidden) return;
                const strong = box.querySelector("strong");
                const small = box.querySelector("small");
                const interval = intervalMap.get(index);
                box.classList.remove("is-reverse", "is-empty", "is-duplicate");
                if (!interval) {
                    box.classList.add("is-empty");
                    strong.textContent = "날짜를 입력하면 간격이 표시돼요";
                    small.textContent = "";
                    return;
                }
                const absolute = Math.abs(interval.days);
                if (interval.reverse) {
                    box.classList.add("is-reverse");
                    strong.textContent = `${formatDays(absolute)} 빠름 (역순)`;
                } else {
                    if (interval.rawDays === 0) box.classList.add("is-duplicate");
                    strong.textContent = formatDays(absolute);
                }
                const parts = interval.rawDays === 0 ? ["같은 날짜"] : [formatWeeks(absolute)];
                if (interval.business) parts.push(`평일 ${interval.business.weekdays}일 · 주말 ${interval.business.weekends}일`);
                small.textContent = `· ${parts.join(" · ")}`;
            });
        }

        function rangeText(interval) {
            return interval ? `${formatDate(interval.from.date)} → ${formatDate(interval.to.date)}` : "";
        }

        function findGap(result, target) {
            return target === null ? null : result.intervals.find((interval) => Math.abs(interval.days) === target) || null;
        }

        function updateSummary(result) {
            elements.countSummary.textContent = `입력 날짜 ${result.validCount}개 · 계산 구간 ${result.intervalCount}개`;
            elements.average.textContent = formatAverage(result.average);
            elements.shortest.textContent = result.shortest === null ? "-" : formatDays(result.shortest);
            elements.longest.textContent = result.longest === null ? "-" : formatDays(result.longest);
            elements.shortestRange.textContent = rangeText(findGap(result, result.shortest));
            elements.longestRange.textContent = rangeText(findGap(result, result.longest));
            elements.businessSummary.hidden = !elements.businessDays.checked;
            elements.businessNote.hidden = !elements.businessDays.checked;

            if (!result.total) {
                elements.totalDays.textContent = "-";
                elements.totalCalendar.textContent = "유효한 날짜를 2개 이상 입력하세요.";
                elements.totalRange.textContent = "";
                elements.totalDays.classList.remove("is-reverse");
                elements.totalWeekdays.textContent = "-";
                elements.totalWeekends.textContent = "-";
            } else {
                const total = result.total;
                const absolute = Math.abs(total.days);
                elements.totalDays.textContent = total.reverse ? `-${formatDays(absolute)}` : formatDays(absolute);
                elements.totalDays.classList.toggle("is-reverse", total.reverse);
                const duration = total.calendar;
                const elapsedLabel = elements.includeStart.checked ? " (실제 경과 기간)" : "";
                elements.totalCalendar.textContent = total.reverse
                    ? `마지막 날짜가 ${duration.years}년 ${duration.months}개월 ${duration.days}일 빠릅니다.${elapsedLabel}`
                    : `${duration.years}년 ${duration.months}개월 ${duration.days}일${elapsedLabel}`;
                elements.totalRange.textContent = `${formatDate(total.from.date)} → ${formatDate(total.to.date)}${elements.includeStart.checked ? " · 시작일 포함" : ""}`;
                if (total.business) {
                    elements.totalWeekdays.textContent = formatDays(total.business.weekdays);
                    elements.totalWeekends.textContent = formatDays(total.business.weekends);
                }
            }

            const notices = [];
            if (result.hasBlankBreak) notices.push("빈 날짜가 있어 해당 위치의 구간 계산은 끊겼습니다.");
            if (result.total && result.total.reverse) notices.push("전체 기간이 역순입니다. 입력 순서를 확인해 주세요.");
            notices.push("전체 기간은 구간 합계가 아니라 첫 번째와 마지막 유효 날짜로 직접 계산합니다.");
            elements.notice.textContent = notices.join(" ");
        }

        function updateAll() {
            renumberRows();
            latestResult = calculateRows(readRows(), {
                includeStart: elements.includeStart.checked,
                businessDays: elements.businessDays.checked
            });
            updateIntervalCards(latestResult);
            updateSummary(latestResult);
        }

        function showFeedback(message) {
            clearTimeout(feedbackTimer);
            elements.feedback.textContent = message;
            feedbackTimer = setTimeout(() => { elements.feedback.textContent = ""; }, 2200);
        }

        function copyText() {
            const lines = ["여러 날짜 간격 계산 결과"];
            latestResult.intervals.forEach((interval) => {
                const label = interval.reverse ? `${Math.abs(interval.days)}일 빠름 (역순)` : `${Math.abs(interval.days)}일`;
                lines.push(`${formatDate(interval.from.date)} → ${formatDate(interval.to.date)} : ${label}`);
                if (interval.from.memo) lines.push(`  메모: ${interval.from.memo}`);
            });
            if (latestResult.total) {
                lines.push("");
                lines.push(`전체 기간: ${latestResult.total.reverse ? "-" : ""}${Math.abs(latestResult.total.days)}일`);
                const shortest = latestResult.shortest === null ? "-" : `${latestResult.shortest}일`;
                const longest = latestResult.longest === null ? "-" : `${latestResult.longest}일`;
                lines.push(`계산 구간: ${latestResult.intervalCount}개 · 평균 ${formatAverage(latestResult.average)} · 최단 ${shortest} · 최장 ${longest}`);
                if (latestResult.total.business) lines.push(`평일 ${latestResult.total.business.weekdays}일 · 주말 ${latestResult.total.business.weekends}일 (월~금 / 토·일 기준 · 공휴일 별도 제외 없음)`);
            } else {
                lines.push("유효한 날짜를 2개 이상 입력해 주세요.");
            }
            return lines.join("\n");
        }

        async function copyResults() {
            const value = copyText();
            let copied = false;
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                    await navigator.clipboard.writeText(value);
                    copied = true;
                }
            } catch (error) {
                copied = false;
            }

            if (!copied) {
                const textarea = doc.createElement("textarea");
                textarea.value = value;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                doc.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                textarea.setSelectionRange(0, textarea.value.length);
                try {
                    copied = Boolean(doc.execCommand && doc.execCommand("copy"));
                } catch (error) {
                    copied = false;
                } finally {
                    textarea.remove();
                }
            }

            if (copied) {
                showFeedback("복사했습니다.");
            } else {
                showFeedback("복사하지 못했습니다. 다시 시도해 주세요.");
            }
        }

        function formatDateInput(input) {
            const raw = input.value;
            const caret = input.selectionStart;
            const atEnd = caret === null || caret >= raw.length;
            const digitsBeforeCaret = atEnd ? 0 : (raw.slice(0, caret).match(/\d/g) || []).length;
            const { text } = normalizeDateText(raw, false);
            if (text === raw) return;
            input.value = text;
            if (atEnd) return;
            let position = 0;
            let seen = 0;
            while (position < text.length && seen < digitsBeforeCaret) {
                if (text[position] >= "0" && text[position] <= "9") seen += 1;
                position += 1;
            }
            input.setSelectionRange(position, position);
        }

        list.addEventListener("input", (event) => {
            const target = event.target;
            if (target.matches(".date-input")) {
                formatDateInput(target);
                target.removeAttribute("aria-invalid");
                updateAll();
            } else if (target.matches(".memo-input")) {
                updateAll();
            }
        });
        list.addEventListener("focusout", (event) => {
            const target = event.target;
            if (!target.matches || !target.matches(".date-input")) return;
            const { text, canonical } = normalizeDateText(target.value, true);
            const finalText = canonical || text.replace(/-+$/, "");
            if (finalText !== target.value) {
                target.value = finalText;
                updateAll();
            }
            if (target.value && !canonical) target.setAttribute("aria-invalid", "true");
            else target.removeAttribute("aria-invalid");
        });
        // 달력 선택: 숨겨진 네이티브 date input 이 4자리 연도(0001~9999)만 고르게 한다.
        list.addEventListener("change", (event) => {
            const native = event.target;
            if (!native.matches || !native.matches(".date-native") || !native.value) return;
            const input = native.closest(".date-field").querySelector(".date-input");
            input.value = canonicalDate(native.value);
            input.removeAttribute("aria-invalid");
            updateAll();
        });
        list.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (!button) return;
            const entry = button.closest(".date-entry");
            if (!entry) return;
            if (button.classList.contains("memo-toggle")) {
                toggleMemo(entry);
                return;
            }
            if (button.classList.contains("date-picker-btn")) {
                const field = entry.querySelector(".date-field");
                const native = field.querySelector(".date-native");
                native.value = canonicalDate(field.querySelector(".date-input").value);
                if (typeof native.showPicker === "function") {
                    try { native.showPicker(); } catch (error) { native.focus(); }
                } else {
                    native.focus();
                }
                return;
            }
            const isUp = button.classList.contains("move-up");
            const isDown = button.classList.contains("move-down");
            if (isUp || isDown) {
                // 애니메이션 중(약 200ms)에는 순서 변경 입력을 무시해 상태가 꼬이지 않게 한다.
                const other = isUp ? entry.previousElementSibling : entry.nextElementSibling;
                if (reorderLocked || !other) return;
                // 같은 날짜 항목(entry 노드·rowId)이 그대로 이동하므로 그 항목의 같은 방향 버튼으로 포커스를 유지한다.
                reorderEntries(entry, other, isUp);
                return;
            }
            if (button.classList.contains("delete-row") && entries().length > 2) entry.remove();
            updateAll();
        });
        elements.add.addEventListener("click", () => {
            if (entries().length >= MAX_ROWS) return;
            const entry = createRow(todayValue(new Date()));
            updateAll();
            focusKeepingView(entry.querySelector(".date-input"), entry);
            flashRow(entry);
        });
        elements.includeStart.addEventListener("change", updateAll);
        elements.businessDays.addEventListener("change", updateAll);
        elements.sort.addEventListener("click", () => {
            const sorted = entries().map((entry, index) => ({ entry, index, date: parseYMD(canonicalDate(entry.querySelector(".date-input").value)) }))
                .sort((left, right) => {
                    if (left.date && right.date) return compareDates(left.date, right.date) || left.index - right.index;
                    if (left.date) return -1;
                    if (right.date) return 1;
                    return left.index - right.index;
                });
            sorted.forEach(({ entry }) => list.appendChild(entry));
            updateAll();
        });
        elements.copy.addEventListener("click", copyResults);
        elements.reset.addEventListener("click", () => {
            list.replaceChildren();
            elements.includeStart.checked = false;
            elements.businessDays.checked = false;
            createDefaultRows();
            updateAll();
            list.querySelector(".date-input").focus();
        });

        createDefaultRows();
        updateAll();
    }

    return {
        MAX_ROWS,
        isLeapYear,
        daysInMonth,
        parseYMD,
        addDays,
        normalizeDateText,
        canonicalDate,
        todayValue,
        defaultDateValues,
        toDayNumber,
        differenceDays,
        effectiveDays,
        calendarDuration,
        weekdayIndex,
        countWeekdaysInclusive,
        businessBreakdown,
        calculateRows,
        formatWeeks,
        init
    };
});
