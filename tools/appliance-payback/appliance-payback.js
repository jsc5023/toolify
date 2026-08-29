(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.AppliancePayback = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";
    const RATES = { basic: [910, 1600, 7300], energy: [120, 214.6, 307.3], climate: 9, fuel: 5, vat: 0.1, fund: 0.027 };
    const PRESETS = {
        fridge: { oldName: "오래된 냉장고", newName: "고효율 냉장고", oldKwh: 650, newKwh: 280, price: 1200000, discount: 100000, resale: 100000, extra: 0 },
        aircon: { oldName: "구형 에어컨", newName: "고효율 인버터 에어컨", oldKwh: 900, newKwh: 420, price: 1600000, discount: 150000, resale: 50000, extra: 150000 },
        dryer: { oldName: "히터식 건조기", newName: "히트펌프 건조기", oldKwh: 580, newKwh: 230, price: 1100000, discount: 50000, resale: 100000, extra: 0 },
        dehumidifier: { oldName: "구형 제습기", newName: "고효율 제습기", oldKwh: 420, newKwh: 250, price: 450000, discount: 30000, resale: 30000, extra: 0 }
    };
    function thresholds(month) { return [7, 8].includes(month) ? [300, 450] : [200, 400]; }
    function calculateBill(kwh, month) {
        const usage = Math.max(0, Number(kwh) || 0); const [first, second] = thresholds(month);
        const tier = usage <= first ? 0 : usage <= second ? 1 : 2;
        let energy = Math.min(usage, first) * RATES.energy[0] + Math.max(0, Math.min(usage, second) - first) * RATES.energy[1] + Math.max(0, usage - second) * RATES.energy[2];
        if ([12, 1, 2].includes(month) && usage > 1000) energy += (usage - 1000) * (736.2 - RATES.energy[2]);
        const basic = usage > 0 ? RATES.basic[tier] : 0;
        const subtotal = Math.floor(basic + energy + usage * (RATES.climate + RATES.fuel));
        const vat = Math.round(subtotal * RATES.vat); const fund = Math.floor(subtotal * RATES.fund / 10) * 10;
        return Math.floor((subtotal + vat + fund) / 10) * 10;
    }
    function annualBill(otherMonthlyKwh, applianceAnnualKwh) {
        let total = 0; const applianceMonthly = Math.max(0, applianceAnnualKwh) / 12;
        for (let month = 1; month <= 12; month += 1) total += calculateBill(Math.max(0, otherMonthlyKwh) + applianceMonthly, month);
        return total;
    }
    function calculate(values) {
        const netCost = Math.max(0, values.price + values.extra - values.discount - values.resale);
        const oldBill = annualBill(values.otherUsage, values.oldKwh); const newBill = annualBill(values.otherUsage, values.newKwh);
        const annualSaving = oldBill - newBill; const savedKwh = values.oldKwh - values.newKwh;
        const paybackYears = annualSaving > 0 ? netCost / annualSaving : Infinity;
        return { netCost, oldBill, newBill, annualSaving, savedKwh, paybackYears, periodProfit: annualSaving * values.years - netCost };
    }
    function formatPeriod(years) {
        if (!Number.isFinite(years)) return "회수 불가"; if (years === 0) return "즉시";
        const wholeYears = Math.floor(years); const months = Math.round((years - wholeYears) * 12);
        if (wholeYears === 0) return `약 ${Math.max(1, months)}개월`; if (months === 12) return `약 ${wholeYears + 1}년`;
        return months ? `약 ${wholeYears}년 ${months}개월` : `약 ${wholeYears}년`;
    }
    function init(doc) {
        const $ = (selector) => doc.querySelector(selector); const num = (id) => Math.max(0, Number($(id).value) || 0); const won = (value) => `${Math.abs(Math.round(value)).toLocaleString("ko-KR")}원`;
        function values() { return { oldKwh: num("#old-kwh"), newKwh: num("#new-kwh"), price: num("#price"), discount: num("#discount"), resale: num("#resale"), extra: num("#extra-cost"), otherUsage: num("#other-usage"), years: Math.min(30, Math.max(1, num("#use-years"))) }; }
        function render() {
            const v = values(); const r = calculate(v); const oldName = $("#old-name").value.trim() || "기존 제품"; const newName = $("#new-name").value.trim() || "새 제품";
            $("#net-cost").textContent = won(r.netCost); $("#saved-kwh").textContent = `${r.savedKwh.toLocaleString("ko-KR")} kWh/년`;
            $("#annual-saving").textContent = r.annualSaving >= 0 ? won(r.annualSaving) : `${won(r.annualSaving)} 증가`;
            $("#payback-period").textContent = formatPeriod(r.paybackYears); $("#period-label").textContent = `${v.years}년 누적손익`; $("#period-profit").textContent = `${r.periodProfit >= 0 ? "+" : "−"}${won(r.periodProfit)}`;
            $("#old-bill-label").textContent = `${oldName} 포함 연간요금`; $("#new-bill-label").textContent = `${newName} 포함 연간요금`; $("#old-bill").textContent = won(r.oldBill); $("#new-bill").textContent = won(r.newBill);
            const maxBill = Math.max(1, r.oldBill, r.newBill); $("#old-bar").style.width = `${r.oldBill / maxBill * 100}%`; $("#new-bar").style.width = `${r.newBill / maxBill * 100}%`;
            if (r.annualSaving <= 0) { $("#verdict-icon").textContent = "⚠️"; $("#verdict-title").textContent = "전기세 기준으로는 교체 이득이 없습니다"; $("#verdict-copy").textContent = "새 제품의 연간소비전력량이 기존 제품보다 낮은지 확인하세요."; }
            else if (r.paybackYears <= v.years) { $("#verdict-icon").textContent = "✅"; $("#verdict-title").textContent = `${formatPeriod(r.paybackYears)} 후부터 절약이 이득입니다`; $("#verdict-copy").textContent = `${v.years}년 사용하면 교체비용을 빼고 약 ${won(r.periodProfit)} 남습니다.`; }
            else { $("#verdict-icon").textContent = "⏳"; $("#verdict-title").textContent = `${v.years}년 안에는 본전 회수가 어렵습니다`; $("#verdict-copy").textContent = `예상 회수기간은 ${formatPeriod(r.paybackYears)}입니다. 성능·수리비 개선도 함께 비교하세요.`; }
            const points = Array.from(new Set([1, 3, 5, v.years])).sort((a, b) => a - b); const profits = points.map((year) => r.annualSaving * year - r.netCost); const maxAbs = Math.max(1, ...profits.map(Math.abs));
            $("#timeline").innerHTML = points.map((year, index) => { const profit = profits[index]; const height = Math.max(4, Math.abs(profit) / maxAbs * 75); return `<div class="timeline-item"><strong>${profit >= 0 ? "+" : "−"}${won(profit)}</strong><i class="timeline-bar ${profit < 0 ? "negative" : ""}" style="height:${height}px"></i><span>${year}년</span></div>`; }).join("");
        }
        doc.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
        doc.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => { const p = PRESETS[button.dataset.preset]; $("#old-name").value = p.oldName; $("#new-name").value = p.newName; $("#old-kwh").value = p.oldKwh; $("#new-kwh").value = p.newKwh; $("#price").value = p.price; $("#discount").value = p.discount; $("#resale").value = p.resale; $("#extra-cost").value = p.extra; render(); })); render();
    }
    return { calculateBill, annualBill, calculate, formatPeriod, init };
});
