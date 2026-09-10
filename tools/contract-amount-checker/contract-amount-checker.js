(function contractAmountChecker() {
    "use strict";

    const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const DIGIT_VALUES = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
    const SMALL_UNITS = { 십: 10n, 백: 100n, 천: 1000n };
    const BIG_UNITS = { 만: 10000n, 억: 100000000n, 조: 1000000000000n, 경: 10000000000000000n };
    const BIG_NAMES = ["", "만", "억", "조", "경"];
    const HANJA_DIGITS = ["", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];
    const HANJA_DIGIT_VALUES = { 零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 貳: 2, 贰: 2, 三: 3, 參: 3, 叁: 3, 四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陸: 6, 陆: 6, 七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9 };
    const HANJA_SMALL_UNITS = { 十: 10n, 拾: 10n, 百: 100n, 佰: 100n, 千: 1000n, 仟: 1000n };
    const HANJA_BIG_UNITS = { 万: 10000n, 萬: 10000n, 亿: 100000000n, 億: 100000000n, 兆: 1000000000000n, 京: 10000000000000000n };
    const HANJA_BIG_NAMES = ["", "萬", "億", "兆", "京"];
    const MAX_DIGITS = 20;

    function parseNumberAmount(raw) {
        let value = String(raw || "").trim().replace(/[\s,₩￦]/g, "").replace(/원$/u, "");
        if (!value) return { ok: false, message: "숫자로 적힌 금액을 입력해 주세요." };
        if (!/^-?\d+$/u.test(value)) return { ok: false, message: "숫자 금액에는 정수, 쉼표, 원화 기호와 ‘원’만 사용할 수 있습니다." };
        const negative = value.startsWith("-");
        if (negative) value = value.slice(1);
        value = value.replace(/^0+(?=\d)/u, "");
        if (value.length > MAX_DIGITS) return { ok: false, message: `숫자 금액은 최대 ${MAX_DIGITS}자리까지 지원합니다.` };
        const amount = BigInt(value);
        return { ok: true, amount: negative ? -amount : amount };
    }

    function parseKoreanAmount(raw) {
        let value = String(raw || "").trim().replace(/[\s,₩￦]/g, "");
        value = value.replace(/^금/u, "").replace(/(?:원정|원|정)$/u, "");
        if (!value) return { ok: false, message: "한글로 적힌 금액을 입력해 주세요." };

        let negative = false;
        if (value.startsWith("마이너스")) {
            negative = true;
            value = value.slice("마이너스".length);
        } else if (value.startsWith("-")) {
            negative = true;
            value = value.slice(1);
        }
        if (value === "영" || value === "공") return { ok: true, amount: 0n };
        if (!value || !/^[일이삼사오육칠팔구십백천만억조경]+$/u.test(value)) return { ok: false, message: "지원하지 않는 글자 또는 금액 표현이 포함되어 있습니다." };

        let total = 0n;
        let section = 0n;
        let pendingDigit = null;
        let previousSmall = 10000n;
        let previousBig = 100000000000000000000n;

        for (const character of value) {
            if (Object.prototype.hasOwnProperty.call(DIGIT_VALUES, character)) {
                if (pendingDigit !== null) return { ok: false, message: "한글 숫자가 연속된 부분을 해석할 수 없습니다." };
                pendingDigit = BigInt(DIGIT_VALUES[character]);
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(SMALL_UNITS, character)) {
                const unit = SMALL_UNITS[character];
                if (unit >= previousSmall) return { ok: false, message: "십·백·천 단위의 순서를 확인해 주세요." };
                section += (pendingDigit === null ? 1n : pendingDigit) * unit;
                pendingDigit = null;
                previousSmall = unit;
                continue;
            }
            const unit = BIG_UNITS[character];
            if (!unit || unit >= previousBig) return { ok: false, message: "만·억·조·경 단위의 순서를 확인해 주세요." };
            const group = section + (pendingDigit === null ? 0n : pendingDigit);
            total += (group === 0n ? 1n : group) * unit;
            section = 0n;
            pendingDigit = null;
            previousSmall = 10000n;
            previousBig = unit;
        }

        total += section + (pendingDigit === null ? 0n : pendingDigit);
        return { ok: true, amount: negative ? -total : total };
    }

    function parseHanjaAmount(raw) {
        let value = String(raw || "").trim().replace(/[\s,₩￦]/g, "");
        value = value.replace(/^金/u, "").replace(/(?:圓整|圓正|圆整|圆正|圓|圆|整|正)$/u, "");
        if (!value) return { ok: false, message: "한자 대자 금액을 입력해 주세요." };
        let negative = false;
        if (value.startsWith("負")) {
            negative = true;
            value = value.slice(1);
        } else if (value.startsWith("-")) {
            negative = true;
            value = value.slice(1);
        }
        if (value === "零" || value === "〇") return { ok: true, amount: 0n };

        let total = 0n;
        let section = 0n;
        let pendingDigit = null;
        let previousSmall = 10000n;
        let previousBig = 100000000000000000000n;

        for (const character of value) {
            if (character === "零" || character === "〇") {
                if (pendingDigit !== null) return { ok: false, message: "한자 숫자의 0 표기 위치를 확인해 주세요." };
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(HANJA_DIGIT_VALUES, character)) {
                if (pendingDigit !== null) return { ok: false, message: "한자 숫자가 연속된 부분을 해석할 수 없습니다." };
                pendingDigit = BigInt(HANJA_DIGIT_VALUES[character]);
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(HANJA_SMALL_UNITS, character)) {
                const unit = HANJA_SMALL_UNITS[character];
                if (unit >= previousSmall) return { ok: false, message: "拾·佰·仟 단위의 순서를 확인해 주세요." };
                section += (pendingDigit === null ? 1n : pendingDigit) * unit;
                pendingDigit = null;
                previousSmall = unit;
                continue;
            }
            const unit = HANJA_BIG_UNITS[character];
            if (!unit || unit >= previousBig) return { ok: false, message: "萬·億·兆·京 단위의 순서를 확인해 주세요." };
            const group = section + (pendingDigit === null ? 0n : pendingDigit);
            total += (group === 0n ? 1n : group) * unit;
            section = 0n;
            pendingDigit = null;
            previousSmall = 10000n;
            previousBig = unit;
        }

        total += section + (pendingDigit === null ? 0n : pendingDigit);
        return { ok: true, amount: negative ? -total : total };
    }

    function fourDigitsToKorean(group) {
        const padded = String(group).padStart(4, "0");
        const units = ["천", "백", "십", ""];
        let output = "";
        for (let index = 0; index < 4; index += 1) {
            const digit = Number(padded[index]);
            if (!digit) continue;
            output += digit === 1 && units[index] ? units[index] : DIGITS[digit] + units[index];
        }
        return output;
    }

    function amountToKorean(amount) {
        const negative = amount < 0n;
        let digits = (negative ? -amount : amount).toString();
        if (digits === "0") return "영";
        const groups = [];
        for (let end = digits.length; end > 0; end -= 4) groups.unshift(digits.slice(Math.max(0, end - 4), end));
        const parts = groups.map((group, index) => {
            if (Number(group) === 0) return "";
            return fourDigitsToKorean(group) + BIG_NAMES[groups.length - index - 1];
        }).filter(Boolean);
        return `${negative ? "마이너스 " : ""}${parts.join(" ")}`;
    }

    function fourDigitsToHanja(group) {
        const padded = String(group).padStart(4, "0");
        const units = ["仟", "佰", "拾", ""];
        let output = "";
        for (let index = 0; index < 4; index += 1) {
            const digit = Number(padded[index]);
            if (!digit) continue;
            output += HANJA_DIGITS[digit] + units[index];
        }
        return output;
    }

    function amountToHanja(amount) {
        const negative = amount < 0n;
        let digits = (negative ? -amount : amount).toString();
        if (digits === "0") return "零";
        const groups = [];
        for (let end = digits.length; end > 0; end -= 4) groups.unshift(digits.slice(Math.max(0, end - 4), end));
        const parts = groups.map((group, index) => {
            if (Number(group) === 0) return "";
            return fourDigitsToHanja(group) + HANJA_BIG_NAMES[groups.length - index - 1];
        }).filter(Boolean);
        return `${negative ? "負" : ""}${parts.join(" ")}`;
    }

    function formatWon(amount) {
        const negative = amount < 0n;
        const digits = (negative ? -amount : amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return `${negative ? "-" : ""}${digits}원`;
    }

    function buildContractText(amount) {
        const numeric = formatWon(amount).replace(/원$/u, "");
        return `금 ${amountToKorean(amount).replace(/\s/g, "")}원정 (₩${numeric})`;
    }

    function buildHanjaContractText(amount) {
        const numeric = formatWon(amount).replace(/원$/u, "");
        return `金 ${amountToHanja(amount).replace(/\s/g, "")}圓整 (₩${numeric})`;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { parseNumberAmount, parseKoreanAmount, parseHanjaAmount, amountToKorean, amountToHanja, formatWon, buildContractText, buildHanjaContractText };
    }
    if (typeof document === "undefined") return;

    const $ = (selector) => document.querySelector(selector);
    const numberInput = $("#number-amount");
    const koreanInput = $("#korean-amount");
    const hanjaInput = $("#hanja-amount");
    const result = $("#check-result");

    function setResultState(state, icon, title, message) {
        result.className = `check-result ${state}`;
        $("#result-icon").textContent = icon;
        $("#result-title").textContent = title;
        $("#result-message").textContent = message;
    }

    function checkAmounts() {
        const number = parseNumberAmount(numberInput.value);
        const korean = parseKoreanAmount(koreanInput.value);
        const hasHanja = hanjaInput.value.trim().length > 0;
        const hanja = hasHanja ? parseHanjaAmount(hanjaInput.value) : null;
        if (!number.ok || !korean.ok || (hanja && !hanja.ok)) {
            setResultState("error", "⚠️", "입력값을 확인해 주세요", !number.ok ? number.message : !korean.ok ? korean.message : hanja.message);
            $("#result-values").classList.add("hidden");
            $("#contract-output").classList.add("hidden");
            return;
        }

        $("#result-values").classList.remove("hidden");
        $("#number-result").textContent = formatWon(number.amount);
        $("#korean-result").textContent = formatWon(korean.amount);
        $("#hanja-result").textContent = hanja ? formatWon(hanja.amount) : "미입력(선택)";
        const koreanDifference = number.amount >= korean.amount ? number.amount - korean.amount : korean.amount - number.amount;
        const hanjaDifference = hanja ? (number.amount >= hanja.amount ? number.amount - hanja.amount : hanja.amount - number.amount) : null;
        $("#difference-result").textContent = hanjaDifference === null
            ? `한글 ${formatWon(koreanDifference)}`
            : `한글 ${formatWon(koreanDifference)} · 한자 ${formatWon(hanjaDifference)}`;

        if (number.amount === korean.amount && (!hanja || number.amount === hanja.amount)) {
            setResultState("match", "✅", hanja ? "세 금액이 모두 일치합니다" : "두 금액이 일치합니다", hanja ? "숫자·한글·한자 대자를 같은 값으로 해석했습니다." : "숫자와 한글 금액을 같은 값으로 해석했습니다.");
            $("#contract-text").textContent = buildContractText(number.amount);
            $("#hanja-contract-text").textContent = buildHanjaContractText(number.amount);
            $("#contract-output").classList.remove("hidden");
        } else {
            setResultState("mismatch", "❌", "두 금액이 일치하지 않습니다", "원본 문서의 숫자 자릿수와 만·억·조 단위를 다시 확인하세요.");
            $("#contract-output").classList.add("hidden");
        }
    }

    $("#check-button").addEventListener("click", checkAmounts);
    [numberInput, koreanInput, hanjaInput].forEach((input) => input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") checkAmounts();
    }));
    $("#reset-button").addEventListener("click", () => {
        numberInput.value = "";
        koreanInput.value = "";
        hanjaInput.value = "";
        result.className = "check-result idle";
        $("#result-icon").textContent = "🔎";
        $("#result-title").textContent = "두 금액을 입력해 주세요";
        $("#result-message").textContent = "숫자와 한글 금액을 독립적으로 해석해 비교합니다.";
        $("#result-values").classList.add("hidden");
        $("#contract-output").classList.add("hidden");
        numberInput.focus();
    });
    document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
        const examples = {
            match: ["120,000,000원", "금 일억이천만원정", "金 壹億貳仟萬圓整"],
            mismatch: ["12,000,000원", "금 일억이천만원정", "金 壹仟貳佰萬圓整"],
            large: ["1,205,000원", "금 백이십만오천원정", "金 壹佰貳拾萬伍仟圓整"],
        };
        [numberInput.value, koreanInput.value, hanjaInput.value] = examples[button.dataset.example];
        checkAmounts();
    }));
    document.querySelectorAll(".copy-output").forEach((button) => button.addEventListener("click", async () => {
        const text = $(`#${button.dataset.copyTarget}`).textContent;
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = "복사됨";
            window.setTimeout(() => { button.textContent = "복사"; }, 1200);
        } catch (_) {
            window.prompt("아래 내용을 복사하세요.", text);
        }
    }));
})();
