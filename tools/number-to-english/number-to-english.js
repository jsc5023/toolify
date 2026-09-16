(function numberToEnglish() {
    "use strict";

    /* ---------------- 기본 변환 테이블 ---------------- */

    const ONES = [
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
    ];
    const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const SCALES = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion"];

    const ORDINAL_IRREGULAR = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };

    const CURRENCIES = {
        dollar: { label: "달러 (Dollars)", unit: ["Dollar", "Dollars"], sub: ["Cent", "Cents"] },
        pound: { label: "파운드 (Pounds)", unit: ["Pound", "Pounds"], sub: ["Penny", "Pence"] },
        euro: { label: "유로 (Euros)", unit: ["Euro", "Euros"], sub: ["Cent", "Cents"] },
        won: { label: "원 (Won)", unit: ["Won", "Won"], noSub: true },
        yen: { label: "엔 (Yen)", unit: ["Yen", "Yen"], noSub: true },
        yuan: { label: "위안 (Yuan)", unit: ["Yuan", "Yuan"], noSub: true },
    };

    // 문자 출력 스타일
    const CASE_MODES = {
        sentence: "Sentence case",
        lower: "lowercase",
        upper: "UPPERCASE",
        title: "Title Case",
    };

    function twoDigitWords(n) {
        if (n < 20) return ONES[n];
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        return TENS[tens] + (ones ? "-" + ONES[ones] : "");
    }

    function threeDigitWords(n, useAnd) {
        if (n === 0) return "";
        const hundreds = Math.floor(n / 100);
        const rem = n % 100;
        const parts = [];
        if (hundreds) parts.push(ONES[hundreds] + " hundred");
        if (rem) {
            if (hundreds && useAnd) parts.push("and");
            parts.push(twoDigitWords(rem));
        }
        return parts.join(" ");
    }

    function integerToWords(absValue, useAnd) {
        if (absValue === 0n) return "zero";
        const groups = [];
        let remaining = absValue;
        while (remaining > 0n) {
            groups.unshift(Number(remaining % 1000n));
            remaining /= 1000n;
        }
        const words = [];
        groups.forEach((group, idx) => {
            if (!group) return;
            const scale = SCALES[groups.length - 1 - idx];
            words.push(threeDigitWords(group, useAnd) + (scale ? " " + scale : ""));
        });
        return words.join(" ");
    }

    function ordinalizeWord(word) {
        if (ORDINAL_IRREGULAR[word]) return ORDINAL_IRREGULAR[word];
        if (word.endsWith("y")) return word.slice(0, -1) + "ieth";
        return word + "th";
    }

    function ordinalizeLastWord(sentence) {
        const words = sentence.split(" ");
        const last = words[words.length - 1];
        words[words.length - 1] = last.includes("-")
            ? last.split("-").map((part, idx) => (idx === 0 ? part : ordinalizeWord(part))).join("-")
            : ordinalizeWord(last);
        return words.join(" ");
    }

    function applyCase(text, caseMode) {
        if (!text) return text;
        switch (caseMode) {
            case "lower":
                return text.toLowerCase();
            case "upper":
                return text.toUpperCase();
            case "title":
                return text.replace(/[a-zA-Z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            case "sentence":
            default:
                return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        }
    }

    function formatNumber(negative, integerPart, decimalDigits) {
        const value = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return (negative ? "-" : "") + value + (decimalDigits ? "." + decimalDigits : "");
    }

    /* ---------------- 입력 파싱 ---------------- */

    function parseGeneralInput(raw) {
        let value = String(raw || "").trim().replace(/[\s,]/g, "");
        if (!value) return { ok: false, message: "숫자를 입력해 주세요." };
        if (!/^-?\d+(\.\d+)?$/.test(value)) return { ok: false, message: "숫자만 입력해 주세요. (예: 1234, -12.5)" };

        const negative = value.startsWith("-");
        if (negative) value = value.slice(1);

        let [intPart, decPart = ""] = value.split(".");
        intPart = intPart.replace(/^0+(?=\d)/, "");
        if (intPart.length > 24) return { ok: false, message: "너무 큰 숫자입니다. (최대 24자리까지 지원)" };

        return { ok: true, negative, integerPart: BigInt(intPart || "0"), decimalDigits: decPart };
    }

    function parseAmountInput(raw) {
        let value = String(raw || "").trim().replace(/[\s,$£€]/g, "");
        if (!value) return { ok: false, message: "금액을 입력해 주세요." };
        if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return { ok: false, message: "숫자만 입력해 주세요. (예: 1234.56, 최대 소수 2자리)" };

        const negative = value.startsWith("-");
        if (negative) value = value.slice(1);

        let [intPart, decPart = ""] = value.split(".");
        intPart = intPart.replace(/^0+(?=\d)/, "");
        if (intPart.length > 18) return { ok: false, message: "너무 큰 금액입니다. (최대 18자리까지 지원)" };

        const cents = decPart ? Number(decPart.padEnd(2, "0")) : 0;
        return { ok: true, negative, integerPart: BigInt(intPart || "0"), cents };
    }

    /* ---------------- 결과 생성 ---------------- */

    function buildGeneralWords(parsed, useAnd, ordinal) {
        const decimalBlocked = ordinal && parsed.decimalDigits;
        let words = integerToWords(parsed.integerPart, useAnd);
        if (ordinal && !decimalBlocked) words = ordinalizeLastWord(words);
        if (parsed.decimalDigits && !(ordinal && !decimalBlocked)) {
            words += " point " + parsed.decimalDigits.split("").map((d) => ONES[Number(d)]).join(" ");
        }
        return {
            // 문자 출력(대소문자)은 render() 단계에서 applyCase로 적용하므로 여기선 원문(소문자)만 반환
            text: (parsed.negative ? "negative " : "") + words,
            note: decimalBlocked ? "소수점이 있는 값은 서수로 표기할 수 없어 일반 표기로 보여드립니다." : "",
        };
    }

    function buildAmountWords(parsed, currencyKey, useAnd) {
        const currency = CURRENCIES[currencyKey] || CURRENCIES.dollar;
        const intWords = integerToWords(parsed.integerPart, useAnd);
        const sign = parsed.negative ? "negative " : "";

        if (currency.noSub) {
            // 원/엔/위안처럼 보조단위가 없는 화폐는 정수 금액만 표기
            const text = `${sign}${intWords} ${currency.unit[0]} only`;
            return { fraction: text, spelled: text, noSub: true };
        }

        const unitWord = parsed.integerPart === 1n ? currency.unit[0] : currency.unit[1];
        const centsStr = String(parsed.cents).padStart(2, "0");
        const fraction = `${sign}${intWords} ${unitWord} and ${centsStr}/100`;

        let spelled;
        if (parsed.cents === 0) {
            spelled = `${sign}${intWords} ${unitWord} only`;
        } else {
            const subWord = parsed.cents === 1 ? currency.sub[0] : currency.sub[1];
            spelled = `${sign}${intWords} ${unitWord} and ${twoDigitWords(parsed.cents)} ${subWord}`;
        }
        return { fraction, spelled, noSub: false };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { parseGeneralInput, parseAmountInput, buildGeneralWords, buildAmountWords, integerToWords, applyCase, CURRENCIES, CASE_MODES };
    }
    if (typeof document === "undefined") return;

    /* ---------------- UI ---------------- */

    const $ = (selector) => document.querySelector(selector);
    let mode = "general";

    function setMode(next) {
        mode = next;
        $("#general-mode").classList.toggle("active", mode === "general");
        $("#amount-mode").classList.toggle("active", mode === "amount");

        $("#mode-guide").textContent =
            mode === "general"
                ? "숫자를 영어 단어로 읽어줍니다. 서수(1st, 2nd…) 표기도 선택할 수 있습니다."
                : "금액을 수표·인보이스에 쓰는 영어 표기(분수/스펠링)로 바꿔줍니다.";

        $("#ordinal-row").classList.toggle("hidden", mode !== "general");
        $("#currency-row").classList.toggle("hidden", mode !== "amount");
        $("#currency-note").classList.toggle("hidden", mode !== "amount");
        $("#number-input").placeholder = mode === "general" ? "예: 1234.5, -12" : "예: 1234.56";

        $("#row-general").classList.toggle("hidden", mode !== "general");
        $("#row-amount").classList.toggle("hidden", mode !== "amount");

        $("#error-message").textContent = "";
        $("#result-box").classList.add("hidden");
    }

    function render() {
        const input = $("#number-input").value;
        const useAnd = $("#and-toggle").checked;
        const caseMode = $("#case-select").value;

        if (mode === "general") {
            const parsed = parseGeneralInput(input);
            if (!parsed.ok) {
                $("#error-message").textContent = parsed.message;
                $("#result-box").classList.add("hidden");
                return;
            }
            const ordinal = $("#ordinal-toggle").checked;
            const result = buildGeneralWords(parsed, useAnd, ordinal);

            $("#error-message").textContent = result.note;
            $("#general-output").textContent = applyCase(result.text, caseMode);
            $("#number-output").textContent = formatNumber(parsed.negative, parsed.integerPart, parsed.decimalDigits);
            $("#result-box").classList.remove("hidden");

            if ($("#hero-chip-input")) $("#hero-chip-input").textContent = $("#number-output").textContent;
            if ($("#hero-chip-result")) $("#hero-chip-result").textContent = $("#general-output").textContent;
        } else {
            const parsed = parseAmountInput(input);
            if (!parsed.ok) {
                $("#error-message").textContent = parsed.message;
                $("#result-box").classList.add("hidden");
                return;
            }
            const currencyKey = $("#currency-select").value;
            const result = buildAmountWords(parsed, currencyKey, useAnd);

            $("#error-message").textContent = "";
            $("#fraction-output").textContent = applyCase(result.fraction, caseMode);
            $("#spelled-output").textContent = applyCase(result.spelled, caseMode);
            $("#spelled-output").closest("div").classList.toggle("hidden", result.noSub);
            $("#number-output").textContent = formatNumber(parsed.negative, parsed.integerPart, String(parsed.cents).padStart(2, "0"));
            $("#result-box").classList.remove("hidden");

            if ($("#hero-chip-input")) $("#hero-chip-input").textContent = $("#number-output").textContent;
            if ($("#hero-chip-result")) $("#hero-chip-result").textContent = $("#fraction-output").textContent;
        }
    }

    function copyText(text) {
        if (!text) return;
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

    $("#general-mode").addEventListener("click", () => setMode("general"));
    $("#amount-mode").addEventListener("click", () => setMode("amount"));

    $("#convert-button").addEventListener("click", render);
    $("#and-toggle").addEventListener("change", render);
    $("#ordinal-toggle").addEventListener("change", render);
    $("#currency-select").addEventListener("change", render);
    $("#case-select").addEventListener("change", render);
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
                basic: ["general", "1234", null],
                ordinal: ["general", "23", null],
                decimal: ["general", "12.5", null],
                amount: ["amount", "1234.56", "dollar"],
                won: ["amount", "50000", "won"],
            };
            const [sampleMode, value, currencyKey] = samples[button.dataset.sample];
            setMode(sampleMode);
            if (sampleMode === "general") $("#ordinal-toggle").checked = button.dataset.sample === "ordinal";
            if (currencyKey) $("#currency-select").value = currencyKey;
            $("#number-input").value = value;
            render();
        });
    });

    $("#copy-all").addEventListener("click", () => {
        const text = mode === "general" ? $("#general-output").textContent : $("#fraction-output").textContent;
        copyText(text);
    });

    setMode("general");
})();
