(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.TimeCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const UNIT_SECONDS = { seconds: 1, minutes: 60, hours: 3600 };
    const UNIT_LABELS = { seconds: "초", minutes: "분", hours: "시간" };
    const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

    function pad2(value) { return String(value).padStart(2, "0"); }

    function parseDateTime(value) {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDateTimeLocal(date) {
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }

    function formatKoreanDateTime(date) {
        return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} (${WEEKDAYS[date.getDay()]}) ${pad2(date.getHours())}:${pad2(date.getMinutes())}${date.getSeconds() ? `:${pad2(date.getSeconds())}` : ""}`;
    }

    function durationParts(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        return {
            totalSeconds,
            days: Math.floor(totalSeconds / 86400),
            hours: Math.floor((totalSeconds % 86400) / 3600),
            minutes: Math.floor((totalSeconds % 3600) / 60),
            seconds: totalSeconds % 60
        };
    }

    function formatDuration(milliseconds) {
        const part = durationParts(milliseconds);
        if (part.totalSeconds === 0) return "0초";
        const output = [];
        if (part.days) output.push(`${part.days}일`);
        if (part.days || part.hours) output.push(`${part.hours}시간`);
        if (part.days || part.hours || part.minutes) output.push(`${part.minutes}분`);
        if ((!part.days && !part.hours) || part.seconds) output.push(`${part.seconds}초`);
        return output.join(" ");
    }

    function calculateDifference(startValue, endValue, includeStartDate) {
        const start = parseDateTime(startValue);
        const end = parseDateTime(endValue);
        if (!start || !end) return { valid: false, error: "시작 날짜와 종료 날짜를 모두 입력해 주세요." };
        const elapsedMilliseconds = end.getTime() - start.getTime();
        if (elapsedMilliseconds < 0) return { valid: false, error: "종료 시간이 시작 시간보다 앞서 있어요." };
        const milliseconds = elapsedMilliseconds + (includeStartDate ? 86400000 : 0);
        return { valid: true, start, end, includeStartDate: Boolean(includeStartDate), elapsedMilliseconds, milliseconds, ...durationParts(milliseconds) };
    }

    function addTime(baseValue, value, unit, mode) {
        const base = parseDateTime(baseValue);
        const amount = Number(value);
        if (!base) return { valid: false, error: "기준 날짜와 시간을 입력해 주세요." };
        if (!Number.isFinite(amount) || amount < 0) return { valid: false, error: "계산할 값을 0 이상의 숫자로 입력해 주세요." };
        if (!UNIT_SECONDS[unit]) return { valid: false, error: "올바른 시간 단위를 선택해 주세요." };
        const sign = mode === "minus" ? -1 : 1;
        const offsetMilliseconds = amount * UNIT_SECONDS[unit] * 1000 * sign;
        return { valid: true, base, result: new Date(base.getTime() + offsetMilliseconds), amount, unit, mode, offsetMilliseconds };
    }

    function calculateWorkTime(startValue, endValue, breakMinutes, clamp) {
        const difference = calculateDifference(startValue, endValue);
        const rest = Number(breakMinutes);
        if (!difference.valid) return difference;
        if (!Number.isFinite(rest) || rest < 0) return { valid: false, error: "휴게시간을 0 이상의 숫자로 입력해 주세요." };
        const breakMilliseconds = rest * 60000;
        let netMilliseconds = difference.milliseconds - breakMilliseconds;
        if (netMilliseconds < 0 && !clamp) return { valid: false, error: "휴게시간이 총 근무시간보다 길어요." };
        netMilliseconds = Math.max(0, netMilliseconds);
        return { valid: true, ...difference, breakMinutes: rest, netMilliseconds, net: durationParts(netMilliseconds) };
    }

    function convertTime(value, from, to) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0) return { valid: false, error: "입력 값을 0 이상의 숫자로 입력해 주세요." };
        if (!UNIT_SECONDS[from] || !UNIT_SECONDS[to]) return { valid: false, error: "올바른 단위를 선택해 주세요." };
        const seconds = amount * UNIT_SECONDS[from];
        return { valid: true, input: amount, from, to, seconds, output: seconds / UNIT_SECONDS[to] };
    }

    function formatNumber(value, maximumFractionDigits) {
        return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: maximumFractionDigits == null ? 6 : maximumFractionDigits }).format(value);
    }

    function init(doc) {
        const $ = (selector) => doc.querySelector(selector);
        const tabs = Array.from(doc.querySelectorAll(".tc-mode-tab"));
        const panels = Array.from(doc.querySelectorAll(".tab-panel"));
        let activeMode = "diff";

        function inputNumber(selector) {
            const raw = $(selector).value.trim();
            return raw === "" ? NaN : Number(raw);
        }

        function setResult(view) {
            const box = $(".result-box");
            box.classList.toggle("is-error", Boolean(view.error));
            $("#result-label").textContent = view.label || "입력값을 확인해 주세요";
            $("#result-value").textContent = view.value;
            $("#result-summary").textContent = view.summary || "";
            $("#stat-one-label").textContent = view.statOneLabel || "—";
            $("#stat-one-value").textContent = view.statOneValue || "—";
            $("#stat-two-label").textContent = view.statTwoLabel || "—";
            $("#stat-two-value").textContent = view.statTwoValue || "—";
            $("#result-note").textContent = view.note || "";
        }

        function showError(message) {
            setResult({ error: true, value: message, summary: "입력한 값을 다시 확인해 주세요.", note: "계산은 입력값이 올바르면 자동으로 다시 실행돼요." });
        }

        function renderDifference() {
            const result = calculateDifference($("#diff-start").value, $("#diff-end").value, $("#diff-include-start").checked);
            if (!result.valid) return showError(result.error);
            setResult({
                label: "두 시간의 차이",
                value: formatDuration(result.milliseconds),
                summary: `${formatKoreanDateTime(result.start)} → ${formatKoreanDateTime(result.end)}`,
                statOneLabel: "총 분", statOneValue: `${formatNumber(result.totalSeconds / 60, 2)}분`,
                statTwoLabel: "소수 시간", statTwoValue: `${formatNumber(result.totalSeconds / 3600, 2)}시간`,
                note: result.includeStartDate ? "시작일 포함 옵션을 적용해 기본 시간 차이에 1일을 더했어요." : "기본값은 시작일을 포함하지 않아요. 필요하면 입력란 아래 옵션을 선택하세요."
            });
        }

        function renderAddSubtract() {
            const result = addTime($("#as-base").value, inputNumber("#as-value"), $("#as-unit").value, $("#as-mode").value);
            if (!result.valid) return showError(result.error);
            const unitLabel = UNIT_LABELS[result.unit];
            const operation = result.mode === "minus" ? "빼기" : "더하기";
            setResult({
                label: `${formatNumber(result.amount)}${unitLabel} ${operation} 결과`,
                value: formatKoreanDateTime(result.result),
                summary: `기준 ${formatKoreanDateTime(result.base)}`,
                statOneLabel: "이동 시간", statOneValue: formatDuration(Math.abs(result.offsetMilliseconds)),
                statTwoLabel: "계산 방향", statTwoValue: result.mode === "minus" ? "이전 시각" : "이후 시각",
                note: "초 단위를 사용하면 결과에 초까지 표시돼요."
            });
        }

        function renderWorkTime() {
            const result = calculateWorkTime($("#work-start").value, $("#work-end").value, inputNumber("#work-break"), $("#work-clamp").checked);
            if (!result.valid) return showError(result.error);
            setResult({
                label: "휴게시간을 제외한 실 근무시간",
                value: formatDuration(result.netMilliseconds),
                summary: `${formatKoreanDateTime(result.start)} → ${formatKoreanDateTime(result.end)}`,
                statOneLabel: "총 근무시간", statOneValue: formatDuration(result.milliseconds),
                statTwoLabel: "제외한 휴게", statTwoValue: `${formatNumber(result.breakMinutes)}분`,
                note: "급여·노무 산정 시에는 사업장의 취업규칙과 실제 근무 기록을 함께 확인하세요."
            });
        }

        function renderConversion() {
            const result = convertTime(inputNumber("#cv-value"), $("#cv-from").value, $("#cv-to").value);
            if (!result.valid) return showError(result.error);
            setResult({
                label: `${UNIT_LABELS[result.from]} → ${UNIT_LABELS[result.to]} 변환`,
                value: `${formatNumber(result.output)}${UNIT_LABELS[result.to]}`,
                summary: `${formatNumber(result.input)}${UNIT_LABELS[result.from]} = ${formatNumber(result.output)}${UNIT_LABELS[result.to]}`,
                statOneLabel: "초 기준", statOneValue: `${formatNumber(result.seconds)}초`,
                statTwoLabel: "시간 기준", statTwoValue: `${formatNumber(result.seconds / 3600)}시간`,
                note: "1시간은 60분, 1분은 60초를 기준으로 변환해요."
            });
        }

        const renderers = { diff: renderDifference, addsub: renderAddSubtract, work: renderWorkTime, convert: renderConversion };
        function render() { renderers[activeMode](); }

        function activateTab(mode, focus) {
            activeMode = mode;
            tabs.forEach((tab) => {
                const selected = tab.dataset.tab === mode;
                tab.classList.toggle("active", selected);
                tab.setAttribute("aria-selected", String(selected));
                tab.tabIndex = selected ? 0 : -1;
                if (selected && focus) tab.focus();
            });
            panels.forEach((panel) => {
                const selected = panel.id === `tab-${mode}`;
                panel.classList.toggle("active", selected);
                panel.hidden = !selected;
            });
            render();
        }

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => activateTab(tab.dataset.tab, false));
            tab.addEventListener("keydown", (event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const offset = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(index + offset + tabs.length) % tabs.length];
                activateTab(next.dataset.tab, true);
            });
        });

        function setDefaults() {
            const now = new Date();
            const start = new Date(now); start.setHours(9, 0, 0, 0);
            const end = new Date(now); end.setHours(18, 0, 0, 0);
            ["#diff-start", "#work-start"].forEach((selector) => { if (!$(selector).value) $(selector).value = formatDateTimeLocal(start); });
            ["#diff-end", "#work-end"].forEach((selector) => { if (!$(selector).value) $(selector).value = formatDateTimeLocal(end); });
            if (!$("#as-base").value) $("#as-base").value = formatDateTimeLocal(now);
        }

        doc.querySelectorAll(".input-panel input, .input-panel select").forEach((element) => {
            element.addEventListener("input", render);
            element.addEventListener("change", render);
        });
        ["#diff-btn", "#as-btn", "#work-btn", "#cv-btn"].forEach((selector) => $(selector).addEventListener("click", render));
        $("#diff-swap").addEventListener("click", () => { const start = $("#diff-start"); const end = $("#diff-end"); [start.value, end.value] = [end.value, start.value]; render(); });
        $("#as-now").addEventListener("click", () => { $("#as-base").value = formatDateTimeLocal(new Date()); render(); });
        $("#work-sample").addEventListener("click", () => {
            const now = new Date(); const start = new Date(now); const end = new Date(now);
            start.setHours(9, 0, 0, 0); end.setHours(18, 0, 0, 0);
            $("#work-start").value = formatDateTimeLocal(start); $("#work-end").value = formatDateTimeLocal(end); $("#work-break").value = 60; render();
        });
        $("#cv-swap").addEventListener("click", () => { const from = $("#cv-from"); const to = $("#cv-to"); [from.value, to.value] = [to.value, from.value]; render(); });

        setDefaults();
        activateTab("diff", false);
    }

    return { parseDateTime, formatDateTimeLocal, formatKoreanDateTime, durationParts, formatDuration, calculateDifference, addTime, calculateWorkTime, convertTime, formatNumber, init };
});
