(function hanjaAmountConverter() {
    "use strict";
    const H_DIGITS = ["", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];
    const H_VALUES = { 零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 貳: 2, 贰: 2, 三: 3, 參: 3, 叁: 3, 四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陸: 6, 陆: 6, 七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9 };
    const SMALL = { 十: 10n, 拾: 10n, 百: 100n, 佰: 100n, 千: 1000n, 仟: 1000n };
    const BIG = { 万: 10000n, 萬: 10000n, 亿: 100000000n, 億: 100000000n, 兆: 1000000000000n, 京: 10000000000000000n };
    const BIG_NAMES = ["", "萬", "億", "兆", "京"];
    const K_DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const K_BIG_NAMES = ["", "만", "억", "조", "경"];

    function parseNumber(raw) {
        let value = String(raw || "").trim().replace(/[\s,₩￦]/g, "").replace(/원$/u, "");
        if (!value) return { ok: false, message: "숫자 금액을 입력해 주세요." };
        if (!/^-?\d+$/u.test(value)) return { ok: false, message: "정수, 쉼표, 원화 기호와 ‘원’만 입력할 수 있습니다." };
        const negative = value.startsWith("-");
        if (negative) value = value.slice(1);
        value = value.replace(/^0+(?=\d)/u, "");
        if (value.length > 20) return { ok: false, message: "최대 20자리까지 지원합니다." };
        const amount = BigInt(value);
        return { ok: true, amount: negative ? -amount : amount };
    }

    function parseHanja(raw) {
        let value = String(raw || "").trim().replace(/[\s,₩￦]/g, "").replace(/^金/u, "").replace(/(?:圓整|圓正|圆整|圆正|圓|圆|整|正)$/u, "");
        if (!value) return { ok: false, message: "한자 금액을 입력해 주세요." };
        let negative = false;
        if (value.startsWith("負")) { negative = true; value = value.slice(1); }
        else if (value.startsWith("-")) { negative = true; value = value.slice(1); }
        if (value === "零" || value === "〇") return { ok: true, amount: 0n };
        let total = 0n, section = 0n, digit = null, previousSmall = 10000n, previousBig = 100000000000000000000n;
        for (const character of value) {
            if (character === "零" || character === "〇") { if (digit !== null) return { ok: false, message: "0 표기 위치를 확인해 주세요." }; continue; }
            if (Object.prototype.hasOwnProperty.call(H_VALUES, character)) { if (digit !== null) return { ok: false, message: "한자 숫자가 연속된 부분을 해석할 수 없습니다." }; digit = BigInt(H_VALUES[character]); continue; }
            if (Object.prototype.hasOwnProperty.call(SMALL, character)) { const unit = SMALL[character]; if (unit >= previousSmall) return { ok: false, message: "拾·佰·仟 단위 순서를 확인해 주세요." }; section += (digit === null ? 1n : digit) * unit; digit = null; previousSmall = unit; continue; }
            const unit = BIG[character];
            if (!unit || unit >= previousBig) return { ok: false, message: "萬·億·兆·京 단위 순서를 확인해 주세요." };
            const group = section + (digit === null ? 0n : digit);
            total += (group === 0n ? 1n : group) * unit; section = 0n; digit = null; previousSmall = 10000n; previousBig = unit;
        }
        total += section + (digit === null ? 0n : digit);
        return { ok: true, amount: negative ? -total : total };
    }

    function four(group, digits, units) {
        const padded = String(group).padStart(4, "0");
        let output = "";
        for (let index = 0; index < 4; index += 1) { const digit = Number(padded[index]); if (!digit) continue; output += digits[digit] + units[index]; }
        return output;
    }
    function convertGroups(amount, digits, smallNames, bigNames, zero, negativeWord) {
        const negative = amount < 0n;
        let value = (negative ? -amount : amount).toString();
        if (value === "0") return zero;
        const groups = [];
        for (let end = value.length; end > 0; end -= 4) groups.unshift(value.slice(Math.max(0, end - 4), end));
        const parts = groups.map((group, index) => Number(group) ? four(group, digits, smallNames) + bigNames[groups.length - index - 1] : "").filter(Boolean);
        return `${negative ? negativeWord : ""}${parts.join(" ")}`;
    }
    const toHanja = (amount) => convertGroups(amount, H_DIGITS, ["仟", "佰", "拾", ""], BIG_NAMES, "零", "負");
    const toKorean = (amount) => convertGroups(amount, K_DIGITS, ["천", "백", "십", ""], K_BIG_NAMES, "영", "마이너스 ").replace(/일(?=천|백|십)/g, "");
    function formatWon(amount) { const negative = amount < 0n; const value = (negative ? -amount : amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); return `${negative ? "-" : ""}${value}원`; }
    function documentText(amount) { return `金 ${toHanja(amount).replace(/\s/g, "")}圓整 (₩${formatWon(amount).replace(/원$/u, "")})`; }

    if (typeof module !== "undefined" && module.exports) module.exports = { parseNumber, parseHanja, toHanja, toKorean, formatWon, documentText };
    if (typeof document === "undefined") return;
    const $ = (selector) => document.querySelector(selector);
    let mode = "number";
    function setMode(next) { mode = next; $("#number-mode").classList.toggle("active", mode === "number"); $("#hanja-mode").classList.toggle("active", mode === "hanja"); $("#mode-guide").textContent = mode === "number" ? "숫자를 입력하면 한자 대자와 문서용 참고 표기를 만듭니다." : "한자 대자를 입력하면 숫자와 한글 읽기로 확인합니다."; $("#amount-input").placeholder = mode === "number" ? "예: 120,000,000원" : "예: 金 壹億貳仟萬圓整"; $("#error-message").textContent = ""; $("#result-box").classList.add("hidden"); }
    function render() { const parsed = mode === "number" ? parseNumber($("#amount-input").value) : parseHanja($("#amount-input").value); if (!parsed.ok) { $("#error-message").textContent = parsed.message; $("#result-box").classList.add("hidden"); return; } const amount = parsed.amount; $("#error-message").textContent = ""; $("#result-summary").textContent = formatWon(amount); $("#hanja-output").textContent = toHanja(amount); $("#document-output").textContent = documentText(amount); $("#number-output").textContent = formatWon(amount); $("#korean-output").textContent = `${toKorean(amount)}원`; $("#result-box").classList.remove("hidden"); }
    $("#number-mode").addEventListener("click", () => setMode("number")); $("#hanja-mode").addEventListener("click", () => setMode("hanja")); $("#swap-mode").addEventListener("click", () => setMode(mode === "number" ? "hanja" : "number")); $("#convert-button").addEventListener("click", render); $("#amount-input").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); render(); } });
    $("#clear-button").addEventListener("click", () => { $("#amount-input").value = ""; $("#error-message").textContent = ""; $("#result-box").classList.add("hidden"); $("#amount-input").focus(); });
    document.querySelectorAll("[data-sample]").forEach((button) => button.addEventListener("click", () => { const samples = { small: ["number", "1,205,000"], large: ["number", "120,000,000"], hanja: ["hanja", "壹億貳仟萬圓整"] }; const sample = samples[button.dataset.sample]; setMode(sample[0]); $("#amount-input").value = sample[1]; render(); }));
    $("#copy-all").addEventListener("click", async () => { const text = $("#document-output").textContent; try { await navigator.clipboard.writeText(text); $("#copy-all").textContent = "복사됨"; window.setTimeout(() => { $("#copy-all").textContent = "문서 표기 복사"; }, 1200); } catch (_) { window.prompt("아래 내용을 복사하세요.", text); } });
    setMode("number");
})();
