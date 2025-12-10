const outputEl = document.getElementById("pw-output");
const strengthEl = document.getElementById("pw-strength");

const lengthInput = document.getElementById("pw-length");
const includeLower = document.getElementById("include-lower");
const includeUpper = document.getElementById("include-upper");
const includeNumber = document.getElementById("include-number");
const includeSymbol = document.getElementById("include-symbol");
const excludeSimilar = document.getElementById("exclude-similar");

const generateBtn = document.getElementById("generate-btn");
const copyBtn = document.getElementById("copy-btn");

// 문자 집합
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBER = "0123456789";
const SYMBOL = "!@#$%^&*()-_=+[]{};:,.?/";

const SIMILAR = "0Oo1Il";

function buildCharset() {
    let charset = "";

    if (includeLower.checked) charset += LOWER;
    if (includeUpper.checked) charset += UPPER;
    if (includeNumber.checked) charset += NUMBER;
    if (includeSymbol.checked) charset += SYMBOL;

    if (excludeSimilar.checked) {
        charset = charset
            .split("")
            .filter((ch) => !SIMILAR.includes(ch))
            .join("");
    }

    return charset;
}

function generatePassword() {
    const len = Number(lengthInput.value);
    const charset = buildCharset();

    if (!charset) {
        alert("최소 한 가지 이상의 문자 유형을 선택해 주세요.");
        return "";
    }

    if (isNaN(len) || len < 4 || len > 64) {
        alert("비밀번호 길이는 4~64자 사이로 입력해 주세요.");
        return "";
    }

    let result = "";
    const n = charset.length;

    for (let i = 0; i < len; i++) {
        const idx = Math.floor(Math.random() * n);
        result += charset[idx];
    }

    return result;
}

function updateStrength(pw) {
    strengthEl.classList.remove(
        "pw-strength-weak",
        "pw-strength-medium",
        "pw-strength-strong"
    );

    if (!pw) {
        strengthEl.textContent = "-";
        return;
    }

    let score = 0;

    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;

    if (score <= 2) {
        strengthEl.textContent = "약함";
        strengthEl.classList.add("pw-strength-weak");
    } else if (score === 3 || score === 4) {
        strengthEl.textContent = "보통";
        strengthEl.classList.add("pw-strength-medium");
    } else {
        strengthEl.textContent = "강함";
        strengthEl.classList.add("pw-strength-strong");
    }
}

// 생성 버튼
generateBtn.addEventListener("click", () => {
    const pw = generatePassword();
    if (!pw) return;

    outputEl.value = pw;
    updateStrength(pw);
});

// 복사 버튼
copyBtn.addEventListener("click", async () => {
    const text = outputEl.value;
    if (!text) {
        alert("복사할 비밀번호가 없습니다.");
        return;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }
        alert("비밀번호가 클립보드에 복사되었습니다.");
    } catch (e) {
        console.error(e);
        alert("복사 중 오류가 발생했습니다. 직접 복사해 주세요.");
    }
});

// 초기 상태
updateStrength("");
