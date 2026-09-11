/* Age-based estimates only; no age is stored or sent to a server. */
(function () {
    "use strict";
    function calculate(age) {
        if (!Number.isInteger(age) || age < 18 || age > 100) return null;
        const maximum = 220 - age;
        const zones = Array.from({ length: 5 }, (_, index) => [
            Math.round(maximum * (50 + index * 10) / 100),
            Math.round(maximum * (60 + index * 10) / 100)
        ]);
        return { maximum, zones };
    }
    if (typeof module !== "undefined" && module.exports) module.exports = { calculate };
    if (typeof document === "undefined") return;
    const ageInput = document.getElementById("age");
    const set = (id, value) => { document.getElementById(id).textContent = value; };
    function render() {
        const raw = ageInput.value.trim();
        const result = raw === "" ? null : calculate(Number(raw));
        const invalid = !result && (raw !== "" || ageInput.validity.badInput);
        ageInput.setAttribute("aria-invalid", String(invalid));
        set("age-error", invalid ? "만 18~100세 사이의 정수로 입력해 주세요." : "");
        set("fat-range", result ? result.zones[1].join("~") : "—");
        set("max-rate", result ? `${result.maximum} 회/분` : "—");
        set("result-help", result ? `만 ${Number(raw)}세 기준 추정치입니다. 개인별 실제 지방 연소 강도와는 다를 수 있습니다.` : "만 나이를 입력해 내 참고 구간을 확인하세요.");
        for (let index = 0; index < 5; index++) {
            set(`zone-${index + 1}`, result ? `${result.zones[index].join("~")} bpm` : "—");
        }
        set("formula-example", result ? `220 − ${Number(raw)} = ${result.maximum}회/분. 여기에 60%와 70%를 곱하면 약 ${result.zones[1].join("~")}회/분입니다. 소수점은 반올림합니다.` : "예: 30세는 최대심박수 약 190회/분, 지방 연소 참고 구간은 약 114~133회/분입니다.");
    }
    ageInput.addEventListener("input", render);
    document.getElementById("example").addEventListener("click", () => {
        ageInput.value = "30";
        render();
        ageInput.focus();
    });
    render();
})();
