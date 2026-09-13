(function hanjaNumberConverter() {
    "use strict";

    /* ---------------- 표기 테이블 ---------------- */

    const DIGIT_HANJA = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    const DIGIT_KOREAN = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const SMALL_HANJA = ["千", "百", "十", ""];
    const SMALL_KOREAN = ["천", "백", "십", ""];
    const BIG_HANJA = ["", "萬", "億", "兆", "京"];
    const BIG_KOREAN = ["", "만", "억", "조", "경"];

    // 한자 → 숫자 역변환 시 인식할 문자(정자/간체 모두 허용)
    const H_VALUES = {
        零: 0, 〇: 0,
        一: 1, 壹: 1, 二: 2, 貳: 2, 贰: 2, 三: 3, 參: 3, 叁: 3,
        四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陸: 6, 陆: 6,
        七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9,
    };
    const SMALL_UNITS = { 十: 10n, 拾: 10n, 百: 100n, 佰: 100n, 千: 1000n, 仟: 1000n };
    const BIG_UNITS = { 萬: 10000n, 万: 10000n, 億: 100000000n, 亿: 100000000n, 兆: 1000000000000n, 京: 10000000000000000n };

    // 자주 쓰는 문맥(조항/서수/나이 등) 접두·접미 한자
    const CONTEXTS = {
        none: { label: "없음 (숫자만)", prefix: "", suffix: "", example: "123 → 一百二十三" },
        clause: { label: "제N조 (조항)", prefix: "第", suffix: "條", example: "3 → 第三條" },
        ordinal: { label: "제N번째 (순번)", prefix: "第", suffix: "番", example: "2 → 第二番" },
        age: { label: "N세 (나이)", prefix: "", suffix: "歲", example: "20 → 二十歲" },
        grade: { label: "N학년 (학년)", prefix: "", suffix: "學年", example: "3 → 三學年" },
        number: { label: "N번 (번호)", prefix: "", suffix: "番", example: "7 → 七番" },
        day: { label: "N일 (날짜)", prefix: "", suffix: "日", example: "15 → 十五日" },
        month: { label: "N월 (날짜)", prefix: "", suffix: "月", example: "9 → 九月" },
        year: { label: "N년 (날짜)", prefix: "", suffix: "年", example: "2026 → 二千二十六年" },
    };

    /* ---------------- 숫자 → 한자/한글 ---------------- */

    function parseNumberInput(raw) {
        let value = String(raw || "").trim().replace(/[\s,]/g, "");
        if (!value) return { ok: false, message: "숫자를 입력해 주세요." };
        if (!/^-?\d+$/.test(value)) return { ok: false, message: "숫자만 입력해 주세요. (예: 123, -45)" };

        const negative = value.startsWith("-");
        if (negative) value = value.slice(1);
        value = value.replace(/^0+(?=\d)/, "");

        if (value.length > 20) return { ok: false, message: "너무 큰 숫자입니다. (최대 20자리까지 지원)" };

        const amount = BigInt(value);
        return { ok: true, amount: negative ? -amount : amount };
    }

    function fourDigits(group, digits, units) {
        const padded = String(group).padStart(4, "0");
        let out = "";
        for (let i = 0; i < 4; i++) {
            const d = Number(padded[i]);
            if (!d) continue;
            out += digits[d] + units[i];
        }
        return out;
    }

    function convertGroups(amount, digits, smallUnits, bigUnits, zeroWord, negativeWord) {
        const negative = amount < 0n;
        const str = (negative ? -amount : amount).toString();
        if (str === "0") return zeroWord;

        const groups = [];
        for (let end = str.length; end > 0; end -= 4) groups.unshift(str.slice(Math.max(0, end - 4), end));

        const parts = groups
            .map((group, idx) => (Number(group) ? fourDigits(group, digits, smallUnits) + bigUnits[groups.length - idx - 1] : ""))
            .filter(Boolean);

        return (negative ? negativeWord : "") + parts.join("");
    }

    const toHanjaNumber = (amount) => convertGroups(amount, DIGIT_HANJA, SMALL_HANJA, BIG_HANJA, "零", "負");
    const toKoreanReading = (amount) =>
        convertGroups(amount, DIGIT_KOREAN, SMALL_KOREAN, BIG_KOREAN, "영", "마이너스 ").replace(/일(?=천|백|십)/g, "");

    function formatNumber(amount) {
        const negative = amount < 0n;
        const value = (negative ? -amount : amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return (negative ? "-" : "") + value;
    }

    /* ---------------- 한자 → 숫자 ---------------- */

    function stripContext(raw) {
        let value = String(raw || "").trim();
        let matched = "none";

        for (const [key, ctx] of Object.entries(CONTEXTS)) {
            if (key === "none" || !ctx.suffix) continue;
            if (value.endsWith(ctx.suffix)) {
                let core = value.slice(0, -ctx.suffix.length);
                if (ctx.prefix && core.startsWith(ctx.prefix)) core = core.slice(ctx.prefix.length);
                value = core;
                matched = key;
                break;
            }
        }
        return { core: value, matched };
    }

    function parseHanjaInput(raw) {
        const { core, matched } = stripContext(raw);
        let value = core.replace(/[\s,]/g, "");
        if (!value) return { ok: false, message: "한자 숫자를 입력해 주세요." };

        let negative = false;
        if (value.startsWith("負") || value.startsWith("负")) { negative = true; value = value.slice(1); }
        else if (value.startsWith("-")) { negative = true; value = value.slice(1); }

        if (value === "零" || value === "〇") return { ok: true, amount: 0n, matched };

        let total = 0n, section = 0n, digit = null;
        let previousSmall = 10000n, previousBig = 100000000000000000000n;

        for (const ch of value) {
            if (ch === "零" || ch === "〇") {
                if (digit !== null) return { ok: false, message: "0(零) 표기 위치를 확인해 주세요." };
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(H_VALUES, ch)) {
                if (digit !== null) return { ok: false, message: "숫자 한자가 연속된 부분을 해석할 수 없습니다." };
                digit = BigInt(H_VALUES[ch]);
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(SMALL_UNITS, ch)) {
                const unit = SMALL_UNITS[ch];
                if (unit >= previousSmall) return { ok: false, message: "十·百·千 단위 순서를 확인해 주세요." };
                section += (digit === null ? 1n : digit) * unit;
                digit = null;
                previousSmall = unit;
                continue;
            }
            const unit = BIG_UNITS[ch];
            if (!unit || unit >= previousBig) {
                return { ok: false, message: `해석할 수 없는 문자가 있습니다: "${ch}"` };
            }
            const group = section + (digit === null ? 0n : digit);
            total += (group === 0n ? 1n : group) * unit;
            section = 0n;
            digit = null;
            previousSmall = 10000n;
            previousBig = unit;
        }
        total += section + (digit === null ? 0n : digit);

        return { ok: true, amount: negative ? -total : total, matched };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { parseNumberInput, parseHanjaInput, toHanjaNumber, toKoreanReading, formatNumber, CONTEXTS };
    }
    if (typeof document === "undefined") return;

    /* ---------------- UI ---------------- */

    const $ = (selector) => document.querySelector(selector);
    let mode = "number";

    function selectedContextKey() {
        const select = $("#context-select");
        return select && CONTEXTS[select.value] ? select.value : "none";
    }

    function setMode(next) {
        mode = next;
        $("#number-mode").classList.toggle("active", mode === "number");
        $("#hanja-mode").classList.toggle("active", mode === "hanja");

        $("#mode-guide").textContent =
            mode === "number"
                ? "숫자를 입력하면 한자 숫자(一二三…)와 한글 음독으로 바꿔줍니다."
                : "一二三처럼 적힌 한자 숫자를 숫자와 한글 음독으로 확인합니다.";

        $("#number-input").placeholder = mode === "number" ? "예: 123" : "예: 一百二十三";
        $("#context-row").classList.toggle("hidden", mode !== "number");

        $("#error-message").textContent = "";
        $("#result-box").classList.add("hidden");
    }

    function render() {
        const input = $("#number-input").value;

        if (mode === "number") {
            const parsed = parseNumberInput(input);
            if (!parsed.ok) {
                $("#error-message").textContent = parsed.message;
                $("#result-box").classList.add("hidden");
                return;
            }
            const amount = parsed.amount;
            const contextKey = selectedContextKey();
            const ctx = CONTEXTS[contextKey];
            const hanja = ctx.prefix + toHanjaNumber(amount) + ctx.suffix;

            $("#error-message").textContent = "";
            $("#result-summary").textContent = formatNumber(amount);
            $("#hanja-output").textContent = hanja;
            $("#korean-output").textContent = toKoreanReading(amount);
            $("#number-output").textContent = formatNumber(amount);
            $("#context-output").textContent = ctx.label;
            $("#result-box").classList.remove("hidden");
        } else {
            const parsed = parseHanjaInput(input);
            if (!parsed.ok) {
                $("#error-message").textContent = parsed.message;
                $("#result-box").classList.add("hidden");
                return;
            }
            const amount = parsed.amount;

            $("#error-message").textContent = "";
            $("#result-summary").textContent = formatNumber(amount);
            $("#hanja-output").textContent = toHanjaNumber(amount);
            $("#korean-output").textContent = toKoreanReading(amount);
            $("#number-output").textContent = formatNumber(amount);
            $("#context-output").textContent = CONTEXTS[parsed.matched].label;
            $("#result-box").classList.remove("hidden");
        }
    }

    function copyText(text) {
        navigator.clipboard?.writeText(text).then(
            () => toast("복사됨"),
            () => window.prompt("아래 내용을 복사하세요.", text)
        );
    }

    function toast(msg) {
        const btn = $("#copy-all");
        if (!btn) return;
        const original = btn.textContent;
        btn.textContent = msg;
        window.setTimeout(() => { btn.textContent = original; }, 1200);
    }

    $("#number-mode").addEventListener("click", () => setMode("number"));
    $("#hanja-mode").addEventListener("click", () => setMode("hanja"));
    $("#swap-mode").addEventListener("click", () => {
        const hanjaNow = $("#hanja-output").textContent;
        const numberNow = $("#number-output").textContent;
        const nextMode = mode === "number" ? "hanja" : "number";
        const carryOver = nextMode === "hanja" ? hanjaNow : numberNow;
        setMode(nextMode);
        if (carryOver) $("#number-input").value = carryOver;
    });

    $("#convert-button").addEventListener("click", render);
    $("#context-select").addEventListener("change", () => { if (mode === "number") render(); });
    $("#number-input").addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); render(); }
    });

    $("#clear-button").addEventListener("click", () => {
        $("#number-input").value = "";
        $("#error-message").textContent = "";
        $("#result-box").classList.add("hidden");
        $("#number-input").focus();
    });

    document.querySelectorAll("[data-sample]").forEach((button) => {
        button.addEventListener("click", () => {
            const samples = {
                small: ["number", "123", "none"],
                big: ["number", "120000000", "none"],
                clause: ["number", "3", "clause"],
                hanja: ["hanja", "三千四百五十六", "none"],
            };
            const [sampleMode, value, contextKey] = samples[button.dataset.sample];
            setMode(sampleMode);
            $("#number-input").value = value;
            if (sampleMode === "number") $("#context-select").value = contextKey;
            render();
        });
    });

    $("#copy-all").addEventListener("click", () => copyText($("#hanja-output").textContent));

    setMode("number");
})();
