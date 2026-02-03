const $ = (id) => document.getElementById(id);

/* Elements */
const inputEl = $("input");
const outputEl = $("output");
const statsEl = $("stats");

const pasteBtn = $("paste-btn");
const clearBtn = $("clear-btn");
const copyBtn = $("copy-btn");
const runBtn = $("run-btn");
const liveEl = $("live");

const modeHelpEl = $("mode-help");
const modeRadios = Array.from(document.querySelectorAll('input[name="mode"]'));

/* Options */
const keepNonSensitiveEl = $("keep-non-sensitive");
const trimLinesEl = $("trim-lines");
const maskDigitsOnlyEl = $("mask-digits-only");
const normalizeCardEl = $("normalize-card");
const maskCharEl = $("mask-char");

/* Custom options */
const customBoxEl = $("custom-box");
const revealStartEl = $("reveal-start");
const revealEndEl = $("reveal-end");

/* ====== Live input ====== */
let t = null;
inputEl.addEventListener("input", () => {
    if (!liveEl.checked) return;
    clearTimeout(t);
    t = setTimeout(run, 140);
});

runBtn.addEventListener("click", run);

clearBtn.addEventListener("click", () => {
    inputEl.value = "";
    outputEl.value = "";
    renderStats({ total: 0, masked: 0, kept: 0, unmatched: 0 });
});

copyBtn.addEventListener("click", async () => {
    const text = outputEl.value;
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        const prev = copyBtn.textContent;
        copyBtn.textContent = "복사됨!";
        setTimeout(() => (copyBtn.textContent = prev), 900);
    } catch {
        outputEl.focus();
        outputEl.select();
        document.execCommand("copy");
    }
});

pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (typeof text === "string") {
            inputEl.value = text;
            run();
        }
    } catch {
        inputEl.focus();
    }
});

/* ====== Mode ====== */
function getMode() {
    const checked = modeRadios.find((r) => r.checked);
    return checked ? checked.value : "auto";
}

function renderModeHelp(mode) {
    const help = {
        auto: "자동 감지: 한 줄 안에 여러 개인정보가 있어도 패턴으로 찾아 모두 마스킹합니다.",
        account: "계좌번호: 숫자 길이 기반으로 중간을 가립니다. (은행별 포맷이 달라 “추정” 방식입니다)",
        phone: "전화번호: 010-1234-5678 형태를 010-****-5678로 마스킹합니다.",
        rrn: "주민번호: 900101-1234567 형태를 900101-1******로 마스킹합니다.",
        email: "이메일: 앞 일부만 남기고 *** 처리합니다. (예: ab***@gmail.com)",
        card: "카드번호: 앞 4/뒤 4는 유지하고 가운데를 가립니다. (예: 1234 **** **** 3456)",
        custom: "커스텀: 앞/뒤 노출 자리수를 정해 나머지를 일괄 마스킹합니다."
    };
    modeHelpEl.textContent = help[mode] || help.auto;

    // 커스텀 옵션 표시
    if (mode === "custom") customBoxEl.style.display = "block";
    else customBoxEl.style.display = "none";
}

modeRadios.forEach((r) => {
    r.addEventListener("change", () => {
        renderModeHelp(getMode());
        run();
    });
});

/* ====== Utils ====== */
function repeatChar(ch, n) {
    return Array.from({ length: Math.max(0, n) }, () => ch).join("");
}

// digitsOnly=true면 숫자만 마스킹하고 하이픈/공백은 유지
function maskMiddlePreserve(raw, revealStart, revealEnd, maskChar, digitsOnly) {
    if (!raw) return raw;

    if (!digitsOnly) {
        const s = raw;
        if (s.length <= revealStart + revealEnd) return s;
        return s.slice(0, revealStart) + repeatChar(maskChar, s.length - revealStart - revealEnd) + s.slice(s.length - revealEnd);
    }

    const chars = raw.split("");
    const digitIdx = [];
    for (let i = 0; i < chars.length; i++) {
        if (/\d/.test(chars[i])) digitIdx.push(i);
    }

    const dLen = digitIdx.length;
    if (dLen <= revealStart + revealEnd) return raw;

    const startCut = revealStart;
    const endCut = revealEnd;

    for (let k = startCut; k < dLen - endCut; k++) {
        const idx = digitIdx[k];
        chars[idx] = maskChar;
    }
    return chars.join("");
}

/* ====== Detectors ====== */
// 전화번호(국내 일반 패턴)
const PHONE_RE = /(?:\b|^)(01[016789])[-\s]?\d{3,4}[-\s]?\d{4}(?:\b|$)/g;

// 주민등록번호 (YYMMDD-XXXXXXX) 엄격하진 않게, 일반적 패턴
const RRN_RE = /(?:\b|^)(\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01]))[-\s]?([1-4])(\d{6})(?:\b|$)/g;

// 이메일
const EMAIL_RE = /([A-Z0-9._%+-]{1,64})@([A-Z0-9.-]+\.[A-Z]{2,})(?!\S)/gi;

// 카드번호(13~19자리, 공백/하이픈 허용)
const CARD_RE = /(?:\b|^)(?:\d[ -]?){13,19}(?:\b|$)/g;

// 계좌번호 “추정”: 숫자 9~20자리(중간에 - 포함 가능)
const ACCOUNT_RE = /(?:\b|^)(?:\d[-\s]?){9,20}(?:\b|$)/g;

/* ====== Maskers ====== */
function maskPhone(str, opt) {
    // 010-1234-5678 => 010-****-5678
    return str.replace(PHONE_RE, (m) => {
        const digitsOnly = m.replace(/[^\d]/g, "");
        if (digitsOnly.length < 10 || digitsOnly.length > 11) return m;

        // 기본: 앞 3, 뒤 4 유지
        const revealStart = 3;
        const revealEnd = 4;
        return maskMiddlePreserve(m, revealStart, revealEnd, opt.maskChar, opt.maskDigitsOnly);
    });
}

function maskRRN(str, opt) {
    // 900101-1234567 => 900101-1******
    return str.replace(RRN_RE, (m, front, mm, dd, backFirst, backRest) => {
        // 원래 형식(하이픈/공백) 보존 + 숫자만 마스킹 옵션 적용
        // 주민번호는 앞 6 + 뒤 첫 1만 노출, 나머지 6 마스킹
        const digitsOnly = m.replace(/[^\d]/g, "");
        if (digitsOnly.length !== 13) return m;

        const revealStart = 7; // 6(앞) + 1(뒤 첫자리)
        const revealEnd = 0;

        // 주민번호는 뒤 6자리는 항상 마스킹이 일반적 → end=0
        return maskMiddlePreserve(m, revealStart, revealEnd, opt.maskChar, opt.maskDigitsOnly);
    });
}

function maskEmail(str, opt) {
    return str.replace(EMAIL_RE, (m, local, domain) => {
        if (!local || !domain) return m;
        const keep = Math.min(2, local.length);
        const maskedLocal =
            local.length <= keep ? local : local.slice(0, keep) + repeatChar(opt.maskChar, Math.max(3, local.length - keep));
        return `${maskedLocal}@${domain}`;
    });
}

function normalizeCardDigitsToGroups(digits) {
    // 16자리면 4-4-4-4, 그 외에는 그냥 원문 유지하는 편이 안전
    if (digits.length === 16) return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    return digits;
}

function maskCard(str, opt) {
    return str.replace(CARD_RE, (m) => {
        const digits = m.replace(/[^\d]/g, "");
        if (digits.length < 13 || digits.length > 19) return m;

        // 기본 정책: 앞4/뒤4 유지
        const revealStart = 4;
        const revealEnd = 4;

        // normalize-card 옵션이면 16자리만 그룹화(4칸)
        if (opt.normalizeCard && digits.length === 16) {
            const grouped = normalizeCardDigitsToGroups(digits); // "1234 5678 9012 3456"
            // digitsOnly 마스킹: 그룹 공백 유지하면서 숫자만 마스킹
            return maskMiddlePreserve(grouped, revealStart, revealEnd, opt.maskChar, true);
        }

        return maskMiddlePreserve(m, revealStart, revealEnd, opt.maskChar, opt.maskDigitsOnly);
    });
}

function maskAccount(str, opt) {
    return str.replace(ACCOUNT_RE, (m) => {
        const digits = m.replace(/[^\d]/g, "");
        // 너무 짧으면 계좌로 보기 애매(오탐 방지)
        if (digits.length < 9 || digits.length > 20) return m;

        // 기본: 앞4/뒤2 유지(계좌는 카드보다 뒤 노출을 더 적게)
        const revealStart = 4;
        const revealEnd = 2;

        // 단, 매우 짧은 케이스는 더 보수적으로
        if (digits.length <= 10) {
            return maskMiddlePreserve(m, 3, 2, opt.maskChar, opt.maskDigitsOnly);
        }

        return maskMiddlePreserve(m, revealStart, revealEnd, opt.maskChar, opt.maskDigitsOnly);
    });
}

function maskCustomLine(line, opt) {
    const a = Math.max(0, Number(opt.revealStart) || 0);
    const b = Math.max(0, Number(opt.revealEnd) || 0);
    return maskMiddlePreserve(line, a, b, opt.maskChar, opt.maskDigitsOnly);
}

function applyAuto(line, opt) {
    // 순서 중요: 주민/이메일/카드/전화/계좌(계좌는 오탐 가능성 있어 마지막)
    let s = line;
    s = maskRRN(s, opt);
    s = maskEmail(s, opt);
    s = maskCard(s, opt);
    s = maskPhone(s, opt);
    s = maskAccount(s, opt);
    return s;
}

/* ====== Run ====== */
function run() {
    const raw = inputEl.value ?? "";
    const lines = raw.split("\n");

    const opt = {
        mode: getMode(),
        keepNonSensitive: keepNonSensitiveEl.checked,
        trimLines: trimLinesEl.checked,
        maskDigitsOnly: maskDigitsOnlyEl.checked,
        normalizeCard: normalizeCardEl.checked,
        maskChar: maskCharEl.value || "*",
        revealStart: revealStartEl.value,
        revealEnd: revealEndEl.value
    };

    let masked = 0;
    let kept = 0;
    let unmatched = 0;

    const outLines = [];

    for (const originalLine of lines) {
        let line = originalLine;
        if (opt.trimLines) line = line.trim();

        // 빈 줄은 유지
        if (line.length === 0) {
            outLines.push("");
            kept++;
            continue;
        }

        const before = line;
        let after = line;

        if (opt.mode === "auto") {
            after = applyAuto(line, opt);
        } else if (opt.mode === "phone") {
            after = maskPhone(line, opt);
        } else if (opt.mode === "rrn") {
            after = maskRRN(line, opt);
        } else if (opt.mode === "email") {
            after = maskEmail(line, opt);
        } else if (opt.mode === "card") {
            after = maskCard(line, opt);
        } else if (opt.mode === "account") {
            after = maskAccount(line, opt);
        } else {
            // custom
            after = maskCustomLine(line, opt);
        }

        const changed = after !== before;

        if (changed) {
            outLines.push(after);
            masked++;
            continue;
        }

        // 변화 없음 = (해당 모드 기준) 미일치
        if (opt.keepNonSensitive) {
            outLines.push(originalLine); // 원문 유지(트림 적용 전)
            kept++;
        } else {
            outLines.push(""); // 제거 대신 빈 줄로(줄 수 유지)
            unmatched++;
        }
    }

    outputEl.value = outLines.join("\n");
    renderStats({ total: lines.length, masked, kept, unmatched });
}

function renderStats({ total, masked, kept, unmatched }) {
    statsEl.textContent = `처리 ${total}줄 · 마스킹 ${masked}줄 · 유지 ${kept}줄 · 미일치 ${unmatched}줄`;
}

/* Init */
renderModeHelp(getMode());
run();

/* 옵션 변경 시 재실행 */
[
    keepNonSensitiveEl,
    trimLinesEl,
    maskDigitsOnlyEl,
    normalizeCardEl,
    maskCharEl,
    revealStartEl,
    revealEndEl
].forEach((el) => el.addEventListener("change", () => run()));
