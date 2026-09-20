(function (root, factory) {
    const api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    root.AverageSpeedCalculator = api;
    if (root.document) {
        if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", () => api.init(root.document));
        else api.init(root.document);
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
    "use strict";

    const MAX_SEGMENTS = 100;
    const MAX_VALUE = 1e12;
    const UNITS = {
        km: { distanceLabel: "km", speedLabel: "km/h", distanceToMeters: 1000, speedToMps: 1000 / 3600 },
        mi: { distanceLabel: "mile", speedLabel: "mph", distanceToMeters: 1609.344, speedToMps: 1609.344 / 3600 },
        m: { distanceLabel: "m", speedLabel: "m/s", distanceToMeters: 1, speedToMps: 1 }
    };

    function isBlank(value) {
        return value === null || value === undefined || String(value).trim() === "";
    }

    function parseNonNegative(value) {
        if (isBlank(value)) return { ok: true, empty: true, value: 0 };
        const number = Number(value);
        if (!Number.isFinite(number) || Math.abs(number) > MAX_VALUE) return { ok: false, message: "값이 너무 크거나 올바른 숫자가 아닙니다." };
        if (number < 0) return { ok: false, message: "음수는 입력할 수 없습니다." };
        return { ok: true, empty: false, value: number };
    }

    function parseDuration(hours, minutes, seconds) {
        const values = [hours, minutes, seconds].map(parseNonNegative);
        const invalid = values.find((value) => !value.ok);
        if (invalid) return invalid;
        const empty = values.every((value) => value.empty);
        const totalSeconds = values[0].value * 3600 + values[1].value * 60 + values[2].value;
        if (!Number.isFinite(totalSeconds) || totalSeconds > MAX_VALUE * 3600) return { ok: false, message: "시간 값이 너무 큽니다." };
        return { ok: true, empty, seconds: totalSeconds };
    }

    function calculateSegment(row, unitKey) {
        const unit = UNITS[unitKey] || UNITS.km;
        const mode = row.mode === "speed" ? "speed" : "time";
        const distance = parseNonNegative(row.distance);
        const dependentBlank = mode === "time"
            ? [row.hours, row.minutes, row.seconds].every(isBlank)
            : isBlank(row.speed);

        if (isBlank(row.distance) && dependentBlank) return { state: "empty", mode };
        if (!distance.ok) return { state: "invalid", mode, message: distance.message };
        if (distance.empty || dependentBlank) return { state: "partial", mode, message: mode === "time" ? "거리와 시간을 모두 입력해 주세요." : "거리와 속도를 모두 입력해 주세요." };
        if (distance.value <= 0) return { state: "invalid", mode, message: "이동 거리는 0보다 커야 합니다." };

        const distanceMeters = distance.value * unit.distanceToMeters;
        if (!Number.isFinite(distanceMeters)) return { state: "invalid", mode, message: "거리 값이 너무 큽니다." };

        if (mode === "time") {
            const duration = parseDuration(row.hours, row.minutes, row.seconds);
            if (!duration.ok) return { state: "invalid", mode, message: duration.message };
            if (duration.seconds <= 0) return { state: "invalid", mode, message: "소요시간은 0보다 커야 합니다." };
            return {
                state: "valid",
                mode,
                distanceInput: distance.value,
                distanceMeters,
                seconds: duration.seconds,
                speedMps: distanceMeters / duration.seconds
            };
        }

        const speed = parseNonNegative(row.speed);
        if (!speed.ok) return { state: "invalid", mode, message: speed.message };
        if (speed.empty) return { state: "partial", mode, message: "거리와 속도를 모두 입력해 주세요." };
        if (speed.value <= 0) return { state: "invalid", mode, message: "평균속도는 0보다 커야 합니다." };
        const speedMps = speed.value * unit.speedToMps;
        return {
            state: "valid",
            mode,
            distanceInput: distance.value,
            speedInput: speed.value,
            distanceMeters,
            speedMps,
            seconds: distanceMeters / speedMps
        };
    }

    function calculateJourney(rows, stopParts, unitKey) {
        const segmentResults = rows.map((row) => calculateSegment(row, unitKey));
        const validSegments = segmentResults.filter((segment) => segment.state === "valid");
        const stop = parseDuration(stopParts.hours, stopParts.minutes, stopParts.seconds);
        const stopSeconds = stop.ok ? stop.seconds : 0;
        const totalDistanceMeters = validSegments.reduce((sum, segment) => sum + segment.distanceMeters, 0);
        const movingSeconds = validSegments.reduce((sum, segment) => sum + segment.seconds, 0);
        const elapsedSeconds = movingSeconds + stopSeconds;
        const speeds = validSegments.map((segment) => segment.speedMps);
        const moveAverageMps = movingSeconds > 0 ? totalDistanceMeters / movingSeconds : null;
        const elapsedAverageMps = elapsedSeconds > 0 ? totalDistanceMeters / elapsedSeconds : null;
        return {
            segmentResults,
            validSegments,
            validCount: validSegments.length,
            invalidCount: segmentResults.filter((segment) => segment.state === "invalid" || segment.state === "partial").length,
            totalDistanceMeters,
            movingSeconds,
            stopSeconds,
            stopError: stop.ok ? "" : stop.message,
            elapsedSeconds,
            moveAverageMps,
            elapsedAverageMps,
            highestMps: speeds.length ? Math.max(...speeds) : null,
            lowestMps: speeds.length ? Math.min(...speeds) : null,
            arithmeticAverageMps: speeds.length ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : null
        };
    }

    function formatNumber(value, maximumFractionDigits) {
        if (!Number.isFinite(value)) return "-";
        const safeValue = Math.abs(value) < 1e-10 ? 0 : value;
        return safeValue.toLocaleString("ko-KR", { maximumFractionDigits: maximumFractionDigits === undefined ? 2 : maximumFractionDigits });
    }

    function formatInputNumber(value) {
        if (!Number.isFinite(value)) return "";
        return String(Number(value.toFixed(6)));
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "-";
        let rounded = Math.round(seconds);
        const hours = Math.floor(rounded / 3600);
        rounded -= hours * 3600;
        const minutes = Math.floor(rounded / 60);
        const remainingSeconds = rounded - minutes * 60;
        const parts = [];
        if (hours) parts.push(`${formatNumber(hours, 0)}시간`);
        if (minutes) parts.push(`${minutes}분`);
        if (remainingSeconds || !parts.length) parts.push(`${remainingSeconds}초`);
        return parts.join(" ");
    }

    function convertDistance(value, fromUnit, toUnit) {
        return value * UNITS[fromUnit].distanceToMeters / UNITS[toUnit].distanceToMeters;
    }

    function convertSpeed(value, fromUnit, toUnit) {
        return value * UNITS[fromUnit].speedToMps / UNITS[toUnit].speedToMps;
    }

    function init(doc) {
        const list = doc.getElementById("segment-list");
        const template = doc.getElementById("segment-row-template");
        if (!list || !template || list.dataset.initialized) return;
        list.dataset.initialized = "true";

        const elements = {
            unit: doc.getElementById("unit-system"), add: doc.getElementById("add-segment-btn"), limit: doc.getElementById("limit-message"),
            stopHours: doc.getElementById("stop-hours"), stopMinutes: doc.getElementById("stop-minutes"), stopSeconds: doc.getElementById("stop-seconds"),
            copy: doc.getElementById("copy-btn"), reset: doc.getElementById("reset-btn"), feedback: doc.getElementById("copy-feedback"),
            primaryLabel: doc.getElementById("primary-speed-label"), primarySpeed: doc.getElementById("primary-speed"), primaryDescription: doc.getElementById("primary-description"),
            totalDistance: doc.getElementById("total-distance"), movingTime: doc.getElementById("moving-time"), stopTime: doc.getElementById("stop-time"), elapsedTime: doc.getElementById("elapsed-time"),
            moveAverageRow: doc.getElementById("move-average-row"), moveAverage: doc.getElementById("move-average"), highest: doc.getElementById("highest-speed"), lowest: doc.getElementById("lowest-speed"),
            compare: doc.getElementById("average-compare"), arithmetic: doc.getElementById("arithmetic-average"), actual: doc.getElementById("actual-average"), count: doc.getElementById("count-summary"), note: doc.getElementById("result-note")
        };
        let nextId = 1;
        let currentUnit = "km";
        let latest = null;
        let updateFrame = null;
        let feedbackTimer = null;

        function entries() { return Array.from(list.querySelectorAll(".segment-entry")); }

        function createRow(values) {
            const data = Object.assign({ distance: "", mode: "time", hours: "", minutes: "", seconds: "", speed: "", secondsOpen: false }, values);
            const fragment = template.content.cloneNode(true);
            const entry = fragment.querySelector(".segment-entry");
            entry.dataset.rowId = String(nextId++);
            entry.dataset.secondsOpen = data.secondsOpen ? "true" : "false";
            entry.querySelector(".distance-input").value = data.distance;
            entry.querySelector(".mode-select").value = data.mode;
            entry.querySelector(".hours-input").value = data.hours;
            entry.querySelector(".minutes-input").value = data.minutes;
            entry.querySelector(".seconds-input").value = data.seconds;
            entry.querySelector(".speed-input").value = data.speed;
            list.appendChild(fragment);
            updateMode(entry);
            updateSecondsVisibility(entry);
            return entry;
        }

        function updateMode(entry) {
            const speedMode = entry.querySelector(".mode-select").value === "speed";
            entry.querySelector(".time-inputs").hidden = speedMode;
            entry.querySelector(".speed-input-wrap").hidden = !speedMode;
        }

        function updateSecondsVisibility(entry) {
            const isOpen = entry.dataset.secondsOpen === "true";
            const secondsField = entry.querySelector(".seconds-duration-field");
            const durationControl = entry.querySelector(".segment-duration-control");
            const toggle = entry.querySelector(".toggle-seconds");
            const seconds = parseNonNegative(entry.querySelector(".seconds-input").value);
            const hasSeconds = seconds.ok && !seconds.empty && seconds.value > 0;
            secondsField.hidden = !isOpen;
            durationControl.classList.toggle("is-seconds-open", isOpen);
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.textContent = isOpen ? "초 숨기기" : (hasSeconds ? `+ 초 (${formatNumber(seconds.value, 2)}초)` : "+ 초");
        }

        function renumber() {
            const rows = entries();
            rows.forEach((entry, index) => {
                const number = index + 1;
                entry.querySelector(".row-number").textContent = String(number).padStart(2, "0");
                entry.querySelector(".delete-row").disabled = rows.length <= 1;
                entry.querySelector(".delete-row").setAttribute("aria-label", `${number}번 구간 삭제`);
                const distance = entry.querySelector(".distance-input");
                const mode = entry.querySelector(".mode-select");
                const hours = entry.querySelector(".hours-input");
                const minutes = entry.querySelector(".minutes-input");
                const seconds = entry.querySelector(".seconds-input");
                const secondsField = entry.querySelector(".seconds-duration-field");
                const secondsToggle = entry.querySelector(".toggle-seconds");
                distance.id = `as-distance-${entry.dataset.rowId}`;
                mode.id = `as-mode-${entry.dataset.rowId}`;
                hours.id = `as-hours-${entry.dataset.rowId}`;
                minutes.id = `as-minutes-${entry.dataset.rowId}`;
                seconds.id = `as-seconds-${entry.dataset.rowId}`;
                secondsField.id = `as-seconds-field-${entry.dataset.rowId}`;
                entry.querySelector(".distance-field>label").htmlFor = distance.id;
                entry.querySelector(".mode-field>label").htmlFor = mode.id;
                hours.setAttribute("aria-label", `${number}번 구간 시간`);
                minutes.setAttribute("aria-label", `${number}번 구간 분`);
                seconds.setAttribute("aria-label", `${number}번 구간 초`);
                secondsToggle.setAttribute("aria-controls", secondsField.id);
                secondsToggle.setAttribute("aria-label", `${number}번 구간 초 입력 ${entry.dataset.secondsOpen === "true" ? "숨기기" : "표시"}`);
            });
            elements.add.disabled = rows.length >= MAX_SEGMENTS;
            elements.limit.textContent = rows.length >= MAX_SEGMENTS ? "구간은 최대 100개까지 추가할 수 있습니다." : `${rows.length} / ${MAX_SEGMENTS}개`;
        }

        function updateUnitLabels() {
            const unit = UNITS[currentUnit];
            list.querySelectorAll(".distance-unit").forEach((element) => { element.textContent = unit.distanceLabel; });
            list.querySelectorAll(".speed-unit").forEach((element) => { element.textContent = unit.speedLabel; });
        }

        function readRows() {
            return entries().map((entry) => {
                const distance = entry.querySelector(".distance-input");
                const speed = entry.querySelector(".speed-input");
                return {
                    distance: canonicalInputValue(distance, "canonicalMeters", UNITS[currentUnit].distanceToMeters),
                    mode: entry.querySelector(".mode-select").value,
                    hours: entry.querySelector(".hours-input").value,
                    minutes: entry.querySelector(".minutes-input").value,
                    seconds: entry.querySelector(".seconds-input").value,
                    speed: canonicalInputValue(speed, "canonicalMps", UNITS[currentUnit].speedToMps)
                };
            });
        }

        function canonicalInputValue(input, dataKey, unitFactor) {
            const canonical = Number(input.dataset[dataKey]);
            if (input.dataset.generatedValue === input.value && Number.isFinite(canonical)) return canonical / unitFactor;
            return input.value;
        }

        function speedText(speedMps) {
            if (speedMps === null || !Number.isFinite(speedMps)) return "-";
            return `${formatNumber(speedMps / UNITS[currentUnit].speedToMps)} ${UNITS[currentUnit].speedLabel}`;
        }

        function distanceText(meters) {
            if (!Number.isFinite(meters)) return "-";
            return `${formatNumber(meters / UNITS[currentUnit].distanceToMeters)} ${UNITS[currentUnit].distanceLabel}`;
        }

        function updateRows(result) {
            entries().forEach((entry, index) => {
                updateMode(entry);
                updateSecondsVisibility(entry);
                const output = entry.querySelector(".segment-result");
                const strong = output.querySelector("strong");
                const segment = result.segmentResults[index];
                output.classList.remove("is-empty", "is-error");
                if (segment.state === "empty") {
                    output.classList.add("is-empty");
                    strong.textContent = segment.mode === "time" ? "거리와 시간을 입력해 주세요." : "거리와 속도를 입력해 주세요.";
                } else if (segment.state === "partial" || segment.state === "invalid") {
                    output.classList.add("is-error");
                    strong.textContent = segment.message;
                } else if (segment.mode === "time") {
                    strong.textContent = `${speedText(segment.speedMps)}로 이동`;
                } else {
                    strong.textContent = `소요시간 ${formatDuration(segment.seconds)}`;
                }
            });
        }

        function updateSummary(result) {
            const hasValid = result.validCount > 0;
            const hasStop = result.stopSeconds > 0;
            const primary = hasStop ? result.elapsedAverageMps : result.moveAverageMps;
            elements.primaryLabel.textContent = hasStop ? "정차 포함 전체 평균속도" : "전체 평균속도";
            elements.primarySpeed.textContent = hasValid ? speedText(primary) : "-";
            elements.primaryDescription.textContent = hasValid ? (hasStop ? "전체 거리 ÷ (이동시간 + 정차시간)" : "전체 거리 ÷ 전체 이동시간") : "유효한 구간을 1개 이상 입력하세요.";
            elements.totalDistance.textContent = hasValid ? distanceText(result.totalDistanceMeters) : "-";
            elements.movingTime.textContent = hasValid ? formatDuration(result.movingSeconds) : "-";
            elements.stopTime.textContent = result.stopError ? "입력 확인" : formatDuration(result.stopSeconds);
            elements.elapsedTime.textContent = hasValid ? formatDuration(result.elapsedSeconds) : "-";
            elements.moveAverageRow.hidden = !hasStop || !hasValid;
            elements.moveAverage.textContent = hasValid ? speedText(result.moveAverageMps) : "-";
            elements.highest.textContent = hasValid ? speedText(result.highestMps) : "-";
            elements.lowest.textContent = hasValid ? speedText(result.lowestMps) : "-";
            elements.compare.hidden = result.validCount < 2;
            elements.arithmetic.textContent = speedText(result.arithmeticAverageMps);
            elements.actual.textContent = speedText(primary);
            elements.count.textContent = `유효한 구간 ${result.validCount}개 · 전체 ${result.segmentResults.length}개`;
            const notices = [];
            if (result.invalidCount) notices.push(`입력이 덜 되었거나 잘못된 구간 ${result.invalidCount}개는 합계에서 제외했습니다.`);
            if (result.stopError) notices.push(`정차·휴식 시간: ${result.stopError}`);
            if (!notices.length) notices.push("완전히 빈 구간은 계산에서 제외하며, 일부만 입력한 구간은 해당 행에서 안내해요.");
            elements.note.textContent = notices.join(" ");
        }

        function updateAll() {
            updateFrame = null;
            renumber();
            updateUnitLabels();
            latest = calculateJourney(readRows(), { hours: elements.stopHours.value, minutes: elements.stopMinutes.value, seconds: elements.stopSeconds.value }, currentUnit);
            updateRows(latest);
            updateSummary(latest);
        }

        function scheduleUpdate() {
            if (updateFrame !== null) return;
            updateFrame = root.setTimeout(updateAll, 16);
        }

        function convertVisibleValues(fromUnit, toUnit) {
            entries().forEach((entry) => {
                const distance = entry.querySelector(".distance-input");
                const speed = entry.querySelector(".speed-input");
                convertInputValue(distance, "canonicalMeters", UNITS[fromUnit].distanceToMeters, UNITS[toUnit].distanceToMeters);
                convertInputValue(speed, "canonicalMps", UNITS[fromUnit].speedToMps, UNITS[toUnit].speedToMps);
            });
        }

        function convertInputValue(input, dataKey, fromFactor, toFactor) {
            const parsed = parseNonNegative(input.value);
            if (!parsed.ok || parsed.empty) {
                delete input.dataset[dataKey];
                delete input.dataset.generatedValue;
                return;
            }
            const savedCanonical = Number(input.dataset[dataKey]);
            const canonical = input.dataset.generatedValue === input.value && Number.isFinite(savedCanonical)
                ? savedCanonical
                : parsed.value * fromFactor;
            input.value = formatInputNumber(canonical / toFactor);
            input.dataset[dataKey] = String(canonical);
            input.dataset.generatedValue = input.value;
        }

        function showFeedback(message) {
            root.clearTimeout(feedbackTimer);
            elements.feedback.textContent = message;
            feedbackTimer = root.setTimeout(() => { elements.feedback.textContent = ""; }, 1800);
        }

        function copyText() {
            const unit = UNITS[currentUnit];
            const lines = ["여러 구간 평균속도 계산"];
            latest.segmentResults.forEach((segment, index) => {
                if (segment.state !== "valid") return;
                const distance = `${formatNumber(segment.distanceMeters / unit.distanceToMeters)} ${unit.distanceLabel}`;
                if (segment.mode === "time") lines.push(`구간 ${index + 1}: ${distance} / ${formatDuration(segment.seconds)} = ${speedText(segment.speedMps)}`);
                else lines.push(`구간 ${index + 1}: ${distance} / ${speedText(segment.speedMps)} = ${formatDuration(segment.seconds)}`);
            });
            if (latest.validCount) {
                lines.push("");
                lines.push(`총 거리: ${distanceText(latest.totalDistanceMeters)}`);
                lines.push(`총 이동시간: ${formatDuration(latest.movingSeconds)}`);
                if (latest.stopSeconds > 0) lines.push(`정차·휴식 시간: ${formatDuration(latest.stopSeconds)}`);
                lines.push(`전체 평균속도: ${speedText(latest.stopSeconds > 0 ? latest.elapsedAverageMps : latest.moveAverageMps)}`);
            } else lines.push("유효한 구간이 없습니다.");
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
            } catch (_) { copied = false; }
            if (!copied) {
                const textarea = doc.createElement("textarea");
                textarea.value = value;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                doc.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try { copied = Boolean(doc.execCommand && doc.execCommand("copy")); } catch (_) { copied = false; }
                textarea.remove();
            }
            showFeedback(copied ? "복사했습니다." : "복사하지 못했습니다.");
        }

        function reset() {
            list.replaceChildren();
            currentUnit = "km";
            elements.unit.value = "km";
            elements.stopHours.value = "0";
            elements.stopMinutes.value = "0";
            elements.stopSeconds.value = "0";
            createRow({ distance: "100", mode: "time", hours: "1" });
            createRow({ distance: "100", mode: "time", hours: "2" });
            updateAll();
        }

        list.addEventListener("input", (event) => {
            if (event.target.matches("input")) scheduleUpdate();
        });
        list.addEventListener("change", (event) => {
            const entry = event.target.closest(".segment-entry");
            if (entry && event.target.matches(".mode-select")) updateMode(entry);
            scheduleUpdate();
        });
        list.addEventListener("click", (event) => {
            const secondsToggle = event.target.closest(".toggle-seconds");
            if (secondsToggle) {
                const entry = secondsToggle.closest(".segment-entry");
                entry.dataset.secondsOpen = entry.dataset.secondsOpen === "true" ? "false" : "true";
                updateSecondsVisibility(entry);
                renumber();
                return;
            }
            const button = event.target.closest(".delete-row");
            if (!button || entries().length <= 1) return;
            button.closest(".segment-entry").remove();
            updateAll();
        });
        [elements.stopHours, elements.stopMinutes, elements.stopSeconds].forEach((input) => input.addEventListener("input", scheduleUpdate));
        elements.add.addEventListener("click", () => {
            const rows = entries();
            if (rows.length >= MAX_SEGMENTS) return;
            const previousMode = rows.length ? rows[rows.length - 1].querySelector(".mode-select").value : "time";
            const entry = createRow({ mode: previousMode });
            updateAll();
            entry.querySelector(".distance-input").focus();
        });
        elements.unit.addEventListener("change", () => {
            const nextUnit = UNITS[elements.unit.value] ? elements.unit.value : "km";
            convertVisibleValues(currentUnit, nextUnit);
            currentUnit = nextUnit;
            updateAll();
        });
        elements.copy.addEventListener("click", copyResults);
        elements.reset.addEventListener("click", reset);

        reset();
    }

    return { MAX_SEGMENTS, UNITS, isBlank, parseNonNegative, parseDuration, calculateSegment, calculateJourney, formatNumber, formatDuration, convertDistance, convertSpeed, init };
});
