(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BatteryRuntimeCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";
    const POWER_PRESETS = [50, 100, 150, 200];
    const HOUR_PRESETS = [4, 8, 12, 24];

    function toWh(capacity, unit, voltage) {
        const c = Math.max(0, Number(capacity) || 0);
        const v = Math.max(0, Number(voltage) || 0);
        if (unit === "mAh") return (c * v) / 1000;
        if (unit === "Ah") return c * v;
        return c;
    }

    function runtimeHours({ capacityWh, powerW, efficiency, reserve }) {
        const usableWh = capacityWh * (1 - Math.min(90, Math.max(0, reserve)) / 100);
        const effectiveWh = usableWh * (Math.min(100, Math.max(1, efficiency)) / 100);
        const hours = powerW > 0 ? effectiveWh / powerW : 0;
        return { usableWh, effectiveWh, hours };
    }

    function requiredWh({ powerW, hours, efficiency, reserve }) {
        const eff = Math.min(100, Math.max(1, efficiency)) / 100;
        const usableNeeded = eff > 0 ? (hours * powerW) / eff : 0;
        const reservePct = Math.min(90, Math.max(0, reserve)) / 100;
        return reservePct < 1 ? usableNeeded / (1 - reservePct) : usableNeeded;
    }

    function formatHours(hours) {
        if (!Number.isFinite(hours) || hours <= 0) return "0분";
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h <= 0) return `${m}분`;
        if (m === 0) return `${h}시간`;
        return `${h}시간 ${m}분`;
    }

    function formatWh(wh) {
        if (!Number.isFinite(wh)) return "0 Wh";
        return `${Math.round(wh).toLocaleString("ko-KR")} Wh`;
    }

    function init(doc) {
        const $ = (s) => doc.querySelector(s);
        const num = (s) => Math.max(0, Number($(s).value) || 0);

        let mode = "runtime";

        function capacityWh() {
            const unit = $("#battery-unit").value;
            return toWh(num("#battery-capacity"), unit, num("#battery-voltage"));
        }

        function efficiency() {
            return num("#efficiency") || 85;
        }

        function reserve() {
            return num("#reserve");
        }

        function updateVoltageField() {
            const unit = $("#battery-unit").value;
            const voltageField = $("#voltage-field");
            if (unit === "Wh") {
                voltageField.classList.add("hidden");
            } else {
                voltageField.classList.remove("hidden");
                $("#capacity-wh-hint").textContent = `≈ ${Math.round(capacityWh()).toLocaleString("ko-KR")} Wh`;
            }
        }

        function renderRuntime() {
            const capWh = capacityWh();
            const powerW = num("#device-power");
            const eff = efficiency();
            const res = reserve();
            const r = runtimeHours({ capacityWh: capWh, powerW, efficiency: eff, reserve: res });
            const theoretical = powerW > 0 ? capWh / powerW : 0;

            $("#runtime-hero-value").textContent = formatHours(r.hours);
            $("#runtime-hero-sub").textContent = `이론상 ${formatHours(theoretical)} · 효율 ${eff}% 적용`;
            $("#usable-wh").textContent = formatWh(r.effectiveWh);
            $("#power-display").textContent = `${powerW.toLocaleString("ko-KR")} Wh`;

            $("#power-compare-body").innerHTML = POWER_PRESETS.map((w) => {
                const x = runtimeHours({ capacityWh: capWh, powerW: w, efficiency: eff, reserve: res });
                const highlight = Math.abs(w - powerW) < 0.001 ? " class=\"highlight\"" : "";
                return `<tr${highlight}><td>${w}W</td><td>${formatHours(x.hours)}</td></tr>`;
            }).join("");

            const capacityLabel = $("#battery-unit").value === "Wh"
                ? `${num("#battery-capacity").toLocaleString("ko-KR")}Wh`
                : `${num("#battery-capacity").toLocaleString("ko-KR")}${$("#battery-unit").value}`;
            $("#hero-chip-input").textContent = `${capacityLabel} · ${powerW}W`;
            $("#hero-chip-result").textContent = formatHours(r.hours);
        }

        function renderCapacity() {
            const powerW = num("#target-power");
            const hours = num("#target-hours");
            const eff = efficiency();
            const res = reserve();
            const wh = requiredWh({ powerW, hours, efficiency: eff, reserve: res });

            $("#capacity-hero-value").textContent = `약 ${formatWh(wh)} 필요`;
            $("#capacity-hero-sub").textContent = `효율 ${eff}% 기준`;

            $("#hours-compare-body").innerHTML = HOUR_PRESETS.map((h) => {
                const x = requiredWh({ powerW, hours: h, efficiency: eff, reserve: res });
                const highlight = Math.abs(h - hours) < 0.001 ? " class=\"highlight\"" : "";
                return `<tr${highlight}><td>${h}시간</td><td>${formatWh(x)}</td></tr>`;
            }).join("");

            $("#hero-chip-input").textContent = `${powerW}W · ${hours}시간`;
            $("#hero-chip-result").textContent = `${formatWh(wh)}`;
        }

        function render() {
            updateVoltageField();
            if (mode === "runtime") {
                renderRuntime();
            } else {
                renderCapacity();
            }
        }

        doc.querySelectorAll("input, select").forEach((el) => {
            el.addEventListener("input", render);
            el.addEventListener("change", render);
        });

        doc.querySelectorAll(".br-tab").forEach((btn) => {
            btn.addEventListener("click", () => {
                mode = btn.dataset.mode;
                doc.querySelectorAll(".br-tab").forEach((b) => b.classList.toggle("active", b === btn));
                $("#mode-runtime-fields").classList.toggle("hidden", mode !== "runtime");
                $("#mode-capacity-fields").classList.toggle("hidden", mode !== "capacity");
                $("#result-runtime").classList.toggle("hidden", mode !== "runtime");
                $("#result-capacity").classList.toggle("hidden", mode !== "capacity");
                render();
            });
        });

        render();
    }

    return { toWh, runtimeHours, requiredWh, formatHours, formatWh, init };
});
