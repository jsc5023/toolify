(function () {
    "use strict";
    const { activities } = window.ActivityRouletteData || { activities: [] };
    const limits = { time: { any: Infinity, m30: 30, h1: 60, h2: 120, half: 240 }, cost: { any: Infinity, free: 0, c10: 10000, c30: 30000, c50: 50000 } };
    const placeNames = { home: "집에서", indoor: "실내 외출", outdoor: "야외" };
    const companionNames = { solo: "혼자", friend: "친구", couple: "연인", family: "가족" };
    const state = { companion: "any", place: "any", time: "any", cost: "any", excluded: new Set(), recent: [], spinning: false, winner: null };
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    function randomIndex(length) {
        if (length <= 1) return 0;
        if (window.crypto && window.crypto.getRandomValues) {
            const bound = Math.floor(0x100000000 / length) * length;
            const values = new Uint32Array(1);
            do { window.crypto.getRandomValues(values); } while (values[0] >= bound);
            return values[0] % length;
        }
        return Math.floor(Math.random() * length);
    }
    function shuffle(items) { const copy = items.slice(); for (let i = copy.length - 1; i > 0; i -= 1) { const j = randomIndex(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
    function filtered() {
        return activities.filter((item) => !state.excluded.has(item.id)
            && (state.companion === "any" || item.companion.includes(state.companion))
            && (state.place === "any" || item.place === state.place)
            && item.maxMinutes <= limits.time[state.time]
            && item.costMax <= limits.cost[state.cost]);
    }
    function duration(item) {
        if (item.maxMinutes <= 30) return item.minMinutes === item.maxMinutes ? `${item.maxMinutes}분` : `${item.minMinutes}~${item.maxMinutes}분`;
        const min = item.minMinutes < 60 ? `${item.minMinutes}분` : `${item.minMinutes / 60}시간`;
        const max = item.maxMinutes < 60 ? `${item.maxMinutes}분` : `${item.maxMinutes / 60}시간`;
        return `${min}~${max}`;
    }
    function cost(item) { return item.costMax === 0 ? "무료" : item.costMax <= 10000 ? (item.costMax <= 3000 ? "거의 무료" : "1만원 이하") : item.costMax <= 30000 ? "3만원 이하" : "5만원 이하"; }
    function updateStatus() {
        const pool = filtered(); const count = $("#candidate-count"); const empty = $("#empty-state");
        count.textContent = state.companion === "any" && state.place === "any" && state.time === "any" && state.cost === "any" ? `활동 ${pool.length}개 중 하나를 골라드려요` : `조건에 맞는 활동 ${pool.length}개`;
        $("#excluded-status").textContent = state.excluded.size ? `제외 ${state.excluded.size}개` : "제외한 활동 없음";
        empty.hidden = pool.length !== 0; $("#spin-button").disabled = state.spinning || pool.length === 0;
        return pool;
    }
    function setFilter(group, value) {
        state[group] = value;
        $$(`[data-filter-group="${group}"]`).forEach((button) => { const selected = button.dataset.value === value; button.classList.toggle("active", selected); button.setAttribute("aria-pressed", String(selected)); });
        state.recent = []; state.winner = null; $("#result-box").hidden = true; $("#result-empty").hidden = false; updateStatus();
    }
    function wheelItems(pool, winner) {
        const rest = shuffle(pool.filter((item) => item.id !== winner.id)).slice(0, 7);
        return shuffle([winner, ...rest]);
    }
    function splitWheelLabel(label) {
        const value = String(label || "").trim();
        if (value.length <= 8) return [value];
        const words = value.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
            let left = "", right = "";
            words.forEach((word) => { if (left.length <= right.length) left += `${left ? " " : ""}${word}`; else right += `${right ? " " : ""}${word}`; });
            if (left.length <= 9 && right.length <= 9) return [left, right];
        }
        const middle = Math.ceil(value.length / 2);
        return [value.slice(0, middle), value.slice(middle)];
    }
    function escapeSvg(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char])); }
    function renderLabels(items, winnerIndex, rotationOffset) {
        const labels = $("#wheel-labels"), count = items.length;
        const fontSize = count >= 8 ? 14 : count >= 6 ? 15 : 16;
        labels.innerHTML = items.map((item, index) => {
            const angle = -90 + (index + .5) * 360 / count + rotationOffset;
            const radians = angle * Math.PI / 180;
            const radius = 145;
            const x = 220 + Math.cos(radians) * radius;
            const y = 220 + Math.sin(radians) * radius;
            const lines = splitWheelLabel(item.wheelLabel);
            // Positions follow the spinning segment, but text stays screen-upright.
            // This avoids the 180° snap that occurred at the left/right boundaries.
            return `<text class="wheel-label${index === winnerIndex ? " winner" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fontSize}">${lines.map((line, lineIndex) => `<tspan x="${x.toFixed(1)}" dy="${lineIndex ? 16 : lines.length > 1 ? -7 : 5}">${escapeSvg(line)}</tspan>`).join("")}</text>`;
        }).join("");
    }
    function renderWheel(items, winnerIndex) {
        const wheel = $("#activity-wheel"), rotor = $("#wheel-rotor"), count = items.length;
        const colors = ["#dfead7", "#eaf1e4", "#cfe0cc", "#f3ead8", "#d9eee8", "#e8f0dc", "#f0e5cf", "#d8e9dc"];
        const gap = count > 1 ? .65 : 0;
        wheel.style.background = `conic-gradient(${items.map((_, i) => { const start = i * 360 / count + gap; const end = (i + 1) * 360 / count - gap; const color = i === winnerIndex ? "#bcdac5" : colors[i % colors.length]; return `${color} ${start}deg ${end}deg`; }).join(",")})`;
        renderLabels(items, winnerIndex, 0);
        wheel.dataset.winnerIndex = String(winnerIndex); rotor.style.transform = "rotate(0deg)";
    }
    function showResult(item) {
        const box = $("#result-box"); state.winner = item; $("#result-empty").hidden = true;
        $("#result-name").textContent = item.name;
        $("#result-meta").textContent = `${duration(item)} · ${cost(item)} · ${placeNames[item.place]}`;
        $("#result-description").textContent = item.description;
        $("#result-tip").textContent = item.tip;
        box.hidden = false;
        state.recent = [item.id, ...state.recent.filter((id) => id !== item.id)].slice(0, 3);
    }
    function spin() {
        if (state.spinning) return;
        const pool = updateStatus();
        if (!pool.length) return;
        let available = pool.filter((item) => !state.recent.includes(item.id));
        if (pool.length < 6 || !available.length) available = pool.filter((item) => item.id !== state.winner?.id);
        if (!available.length) available = pool;
        const winner = available[randomIndex(available.length)]; const visible = wheelItems(pool, winner); const winnerIndex = visible.findIndex((item) => item.id === winner.id);
        const rotor = $("#wheel-rotor"); renderWheel(visible, winnerIndex);
        state.spinning = true; $("#spin-button").disabled = true; $("#spin-button").textContent = "돌리는 중…"; $("#result-box").hidden = true; $("#result-empty").hidden = false;
        const angle = 360 - (winnerIndex + .5) * 360 / visible.length + 360 * (4 + randomIndex(3));
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const finish = () => {
            state.spinning = false; $("#spin-button").textContent = "🎲 룰렛 돌리기"; updateStatus(); showResult(winner);
        };
        const draw = (rotation) => { rotor.style.transform = `rotate(${rotation}deg)`; renderLabels(visible, winnerIndex, rotation); };
        if (reduced) { draw(angle); finish(); return; }
        const startedAt = performance.now(), durationMs = 1300;
        const tick = (now) => {
            const progress = Math.min(1, (now - startedAt) / durationMs);
            const eased = 1 - Math.pow(1 - progress, 3);
            draw(angle * eased);
            if (progress < 1) requestAnimationFrame(tick); else finish();
        };
        requestAnimationFrame(tick);
    }
    function resetFilters() { ["companion", "place", "time", "cost"].forEach((key) => setFilter(key, "any")); }
    function validate() {
        const ids = new Set(), names = new Set();
        activities.forEach((item) => { if (!item.id || !item.name || !item.description || ids.has(item.id) || names.has(item.name) || item.minMinutes > item.maxMinutes || !["home", "indoor", "outdoor"].includes(item.place) || !item.companion.length || item.costMax < 0) throw new Error(`Invalid activity: ${item.id}`); ids.add(item.id); names.add(item.name); });
    }
    function init() {
        validate();
        $$("[data-filter-group]").forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filterGroup, button.dataset.value)));
        $("#spin-button").addEventListener("click", spin); $("#spin-again").addEventListener("click", spin);
        $("#exclude-again").addEventListener("click", () => { if (state.winner) state.excluded.add(state.winner.id); spin(); });
        $("#reset-filters").addEventListener("click", resetFilters); $("#clear-excluded").addEventListener("click", () => { state.excluded.clear(); state.recent = []; updateStatus(); });
        $("#copy-result").addEventListener("click", async () => { if (!state.winner) return; const item = state.winner; const text = `심심한데 뭐하지?\n🎯 ${item.name}\n${duration(item)} · ${cost(item)} · ${placeNames[item.place]}`; try { await navigator.clipboard.writeText(text); $("#copy-result").textContent = "복사했어요"; setTimeout(() => { $("#copy-result").textContent = "결과 복사"; }, 1200); } catch (_) {} });
        resetFilters(); renderWheel(activities.slice(0, 8), 0);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
