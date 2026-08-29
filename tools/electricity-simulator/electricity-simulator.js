(function () {
    "use strict";

    const PRESETS = {
        aircon: { name: "에어컨", watts: 1800, hours: 8, days: 30 },
        pc: { name: "데스크톱 PC", watts: 500, hours: 5, days: 30 },
        dehumidifier: { name: "제습기", watts: 300, hours: 6, days: 20 },
        fridge: { name: "냉장고", watts: 45, hours: 24, days: 30 },
        washer: { name: "세탁기", watts: 500, hours: 1, days: 12 }
    };
    const RATES = { basic: [910, 1600, 7300], energy: [120, 214.6, 307.3], climate: 9, fuel: 5, vat: 0.1, fund: 0.027 };
    const $ = (selector, root = document) => root.querySelector(selector);
    const list = $("#appliance-list");
    const monthSelect = $("#billing-month");
    const won = (value) => `${Math.max(0, Math.round(value)).toLocaleString("ko-KR")}원`;
    const number = (input, max = Infinity) => Math.min(max, Math.max(0, Number(input.value) || 0));

    function thresholds(month) { return [7, 8].includes(Number(month)) ? [300, 450] : [200, 400]; }

    function calculateBill(kwh, month) {
        const usage = Math.max(0, kwh);
        const [first, second] = thresholds(month);
        const tier = usage <= first ? 0 : usage <= second ? 1 : 2;
        let energy = Math.min(usage, first) * RATES.energy[0];
        energy += Math.max(0, Math.min(usage, second) - first) * RATES.energy[1];
        energy += Math.max(0, usage - second) * RATES.energy[2];
        if (![7, 8].includes(Number(month)) && [12, 1, 2].includes(Number(month)) && usage > 1000) {
            energy += (usage - 1000) * (736.2 - RATES.energy[2]);
        }
        const basic = usage > 0 ? RATES.basic[tier] : 0;
        const climate = usage * RATES.climate;
        const fuel = usage * RATES.fuel;
        const subtotal = Math.floor(basic + energy + climate + fuel);
        const vat = Math.round(subtotal * RATES.vat);
        const fund = Math.floor(subtotal * RATES.fund / 10) * 10;
        const total = Math.floor((subtotal + vat + fund) / 10) * 10;
        return { usage, tier, basic, energy, climate, fuel, subtotal, vat, fund, total };
    }

    function addAppliance(data = { name: "새 가전", watts: 100, hours: 1, days: 30 }) {
        const row = $("#appliance-template").content.firstElementChild.cloneNode(true);
        $(".name-input", row).value = data.name;
        $(".watts-input", row).value = data.watts;
        $(".hours-input", row).value = data.hours;
        $(".days-input", row).value = data.days;
        row.addEventListener("input", render);
        $(".remove-button", row).addEventListener("click", () => { row.remove(); render(); });
        list.appendChild(row);
        render();
    }

    function rowUsage(row, reduced) {
        const watts = number($(".watts-input", row));
        const hours = number($(".hours-input", row), 24);
        const days = number($(".days-input", row), 31);
        const reduction = reduced ? Math.min(hours, number($(".reduce-input", row), 24)) : 0;
        return watts * (hours - reduction) * days / 1000;
    }

    function render() {
        const base = number($("#base-usage"));
        const month = Number(monthSelect.value);
        let applianceKwh = 0, reducedKwh = 0, runningUsage = base;
        const baseBill = calculateBill(base, month);
        document.querySelectorAll(".appliance-row").forEach((row) => {
            const usage = rowUsage(row, false);
            const after = rowUsage(row, true);
            const beforeAdd = calculateBill(runningUsage, month).total;
            runningUsage += usage;
            const afterAdd = calculateBill(runningUsage, month).total;
            applianceKwh += usage; reducedKwh += after;
            $(".row-kwh", row).textContent = `${usage.toFixed(1)} kWh/월`;
            $(".row-cost", row).textContent = `예상 추가요금 ${won(afterAdd - beforeAdd)}`;
        });
        const totalUsage = base + applianceKwh;
        const reducedUsage = base + reducedKwh;
        const bill = calculateBill(totalUsage, month);
        const reducedBill = calculateBill(reducedUsage, month);
        const saving = Math.max(0, bill.total - reducedBill.total);
        const [first, second] = thresholds(month);
        $("#total-kwh").textContent = `${totalUsage.toFixed(1)} kWh`;
        $("#total-cost").textContent = won(bill.total);
        $("#saving-cost").textContent = `${won(saving)} 절약`;
        $("#tier-one-label").textContent = `1구간 ~${first}`;
        $("#tier-two-label").textContent = `2구간 ~${second}`;
        const marker = Math.min(100, totalUsage / Math.max(second * 1.5, 600) * 100);
        $("#tier-marker").style.left = `${marker}%`;
        $("#tier-fill").style.width = `${marker}%`;
        const labels = ["1구간", "2구간", "3구간"];
        const next = bill.tier === 0 ? first - totalUsage : bill.tier === 1 ? second - totalUsage : 0;
        $("#tier-message").textContent = bill.tier < 2
            ? `현재 ${labels[bill.tier]}입니다. 다음 누진구간까지 약 ${Math.max(0, next).toFixed(1)}kWh 남았습니다.`
            : `현재 3구간입니다. 절약 목표 적용 시 ${reducedUsage.toFixed(1)}kWh, 예상 ${won(reducedBill.total)}입니다.`;
        $("#breakdown-body").innerHTML = [
            ["기존 사용량 기준 요금", won(baseBill.total)], ["기본요금", won(bill.basic)],
            ["누진 전력량요금", won(bill.energy)], ["기후환경요금", won(bill.climate)],
            ["연료비조정액", won(bill.fuel)], ["부가가치세", won(bill.vat)],
            ["전력산업기반기금", won(bill.fund)], ["예상 청구액", won(bill.total)]
        ].map(([label, value]) => `<div class="breakdown-line"><span>${label}</span><strong>${value}</strong></div>`).join("");
    }

    for (let month = 1; month <= 12; month += 1) {
        const option = document.createElement("option"); option.value = month; option.textContent = `${month}월${[7, 8].includes(month) ? " (하계 완화)" : ""}`;
        monthSelect.appendChild(option);
    }
    monthSelect.value = new Date().getMonth() + 1;
    monthSelect.addEventListener("change", render);
    $("#base-usage").addEventListener("input", render);
    $("#add-appliance").addEventListener("click", () => addAppliance());
    document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => addAppliance(PRESETS[button.dataset.preset])));
    $("#breakdown-toggle").addEventListener("click", (event) => {
        const open = event.currentTarget.getAttribute("aria-expanded") === "true";
        event.currentTarget.setAttribute("aria-expanded", String(!open));
        $("#breakdown-body").classList.toggle("hidden", open);
    });
    addAppliance(PRESETS.aircon); addAppliance(PRESETS.pc); addAppliance(PRESETS.dehumidifier);
    window.ElectricitySimulator = { calculateBill, thresholds };
})();
