(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.LectureSpeedCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";
    const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

    function calculate({ lectureMinutes, lectureCount, speed }) {
        const count = Math.max(1, Number(lectureCount) || 0);
        const perLectureOriginal = Math.max(0, Number(lectureMinutes) || 0);
        const s = Math.max(0.01, Number(speed) || 1);
        const originalTotal = perLectureOriginal * count;
        const actualTotal = originalTotal / s;
        const saved = originalTotal - actualTotal;
        const perLectureActual = perLectureOriginal / s;
        return { originalTotal, actualTotal, saved, perLectureActual };
    }

    function formatMinutes(minutes) {
        if (!Number.isFinite(minutes) || minutes <= 0) return "0분";
        const total = Math.round(minutes);
        const h = Math.floor(total / 60);
        const m = total % 60;
        if (h <= 0) return `${m}분`;
        if (m === 0) return `${h}시간`;
        return `${h}시간 ${m}분`;
    }

    function init(doc) {
        const $ = (s) => doc.querySelector(s);
        const num = (s) => Math.max(0, Number($(s).value) || 0);

        function lectureMinutes() {
            if (!$("#duration-detail-field").classList.contains("hidden")) {
                return num("#lecture-duration-hour") * 60 + num("#lecture-duration-minute");
            }
            const unit = $("#lecture-duration-unit").value === "hour" ? 60 : 1;
            return num("#lecture-duration") * unit;
        }

        function currentInput() {
            return {
                lectureMinutes: lectureMinutes(),
                lectureCount: num("#lecture-count"),
                speed: num("#speed"),
            };
        }

        function render() {
            const input = currentInput();
            const r = calculate(input);

            $("#actual-total-time").textContent = formatMinutes(r.actualTotal);
            $("#original-total-time").textContent = formatMinutes(r.originalTotal);
            $("#saved-time").textContent = formatMinutes(r.saved);
            $("#per-lecture-time").textContent = formatMinutes(r.perLectureActual);

            const currentSpeed = Number($("#speed").value) || 1;
            $("#speed-compare-body").innerHTML = SPEEDS.map((s) => {
                const x = calculate({ ...input, speed: s });
                const highlight = Math.abs(s - currentSpeed) < 0.001 ? " class=\"highlight\"" : "";
                return `<tr${highlight}><td>${s}배속</td><td>${formatMinutes(x.actualTotal)}</td><td>${x.saved > 0 ? formatMinutes(x.saved) : "-"}</td></tr>`;
            }).join("");

            const speedLabel = String(Number($("#speed").value) || 1);
            $("#hero-chip-input").textContent = `${formatMinutes(input.lectureMinutes)} · ${speedLabel}배속`;
            $("#hero-chip-result").textContent = formatMinutes(r.perLectureActual);

            renderDailyPlan(input, r);
        }

        function renderDailyPlan(input, r) {
            const dailyHours = num("#daily-hours");
            const dailyResultEl = $("#daily-result");
            if (dailyHours <= 0) {
                dailyResultEl.classList.add("hidden");
                return;
            }
            dailyResultEl.classList.remove("hidden");

            const dailyMinutes = dailyHours * 60;
            $("#daily-hours-label").textContent = `하루 ${dailyHours}시간 기준`;

            if (r.perLectureActual <= 0 || dailyMinutes < r.perLectureActual) {
                $("#daily-lectures-line").innerHTML = `이 시간으로는 강의 1개도 다 듣기 어려워요.`;
            } else {
                const lecturesPerDay = Math.floor(dailyMinutes / r.perLectureActual);
                const remainder = dailyMinutes - lecturesPerDay * r.perLectureActual;
                $("#daily-lectures-line").innerHTML =
                    `${formatMinutes(input.lectureMinutes)} 강의 <strong>${lecturesPerDay}개</strong> 완료 가능 (약 ${formatMinutes(remainder)} 남음)`;
            }

            const days = r.actualTotal > 0 ? Math.ceil(r.actualTotal / dailyMinutes) : 0;
            $("#daily-days-line").innerHTML = `완강까지 약 <strong>${days}일</strong> 필요`;
        }

        doc.querySelectorAll("input, select").forEach((el) => {
            el.addEventListener("input", render);
            el.addEventListener("change", render);
        });

        const customSpeedField = $("#custom-speed-field");
        const customSpeedToggle = $("#speed-custom-toggle");

        doc.querySelectorAll("[data-speed]").forEach((button) => {
            button.addEventListener("click", () => {
                $("#speed").value = button.dataset.speed;
                doc.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("active", b === button));
                customSpeedToggle.classList.remove("active");
                customSpeedField.classList.add("hidden");
                render();
            });
        });

        customSpeedToggle.addEventListener("click", () => {
            doc.querySelectorAll("[data-speed]").forEach((b) => b.classList.remove("active"));
            customSpeedToggle.classList.add("active");
            customSpeedField.classList.remove("hidden");
            $("#speed").focus();
        });

        const durationSimpleField = $("#duration-simple-field");
        const durationDetailField = $("#duration-detail-field");

        $("#duration-detail-toggle").addEventListener("click", () => {
            durationSimpleField.classList.add("hidden");
            durationDetailField.classList.remove("hidden");
            $("#lecture-duration-hour").focus();
            render();
        });

        $("#duration-simple-toggle").addEventListener("click", () => {
            durationDetailField.classList.add("hidden");
            durationSimpleField.classList.remove("hidden");
            $("#lecture-duration").focus();
            render();
        });

        render();
    }

    return { calculate, formatMinutes, init };
});
