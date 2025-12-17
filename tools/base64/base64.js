const plainInput = document.getElementById("plain-input");
const base64Output = document.getElementById("base64-output");

const encodeBtn = document.getElementById("encode-btn");
const decodeBtn = document.getElementById("decode-btn");
const copyBtn = document.getElementById("copy-btn");
const clearBtn = document.getElementById("clear-btn");

const b64LenEl = document.getElementById("b64-len");
const b64ValidEl = document.getElementById("b64-valid");

const fileInput = document.getElementById("file-input");
const fileToBase64Btn = document.getElementById("file-to-base64-btn");

/**
 * UTF-8 안전 인코딩/디코딩
 * - btoa/atob는 기본적으로 Latin1 기반이라 한글이 깨질 수 있음
 * - TextEncoder/TextDecoder로 UTF-8 처리
 */
function toBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function fromBase64Utf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

function normalizeBase64(input) {
    // 공백/개행 제거
    return (input || "").trim().replace(/\s+/g, "");
}

function isLikelyBase64(str) {
    const s = normalizeBase64(str);
    if (!s) return false;
    // 길이는 4의 배수인 경우가 많음 (패딩 포함)
    if (s.length % 4 !== 0) return false;
    // Base64 문자 + 패딩만 허용
    return /^[A-Za-z0-9+/]*={0,2}$/.test(s);
}

function updateMeta() {
    const s = normalizeBase64(base64Output.value);
    b64LenEl.textContent = String(s.length);

    if (!s) {
        b64ValidEl.textContent = "-";
        return;
    }

    // 엄격 검증 + 실제 atob 테스트
    if (!isLikelyBase64(s)) {
        b64ValidEl.textContent = "아님";
        return;
    }

    try {
        atob(s);
        b64ValidEl.textContent = "가능";
    } catch {
        b64ValidEl.textContent = "아님";
    }
}

// 텍스트 → Base64
encodeBtn.addEventListener("click", () => {
    const text = plainInput.value || "";
    if (!text) {
        alert("인코딩할 텍스트를 입력해 주세요.");
        return;
    }

    try {
        base64Output.value = toBase64Utf8(text);
        updateMeta();
    } catch (e) {
        console.error(e);
        alert("인코딩 중 오류가 발생했습니다.");
    }
});

// Base64 → 텍스트
decodeBtn.addEventListener("click", () => {
    const b64 = normalizeBase64(base64Output.value);
    if (!b64) {
        alert("디코딩할 Base64 문자열을 입력해 주세요.");
        return;
    }

    try {
        // 먼저 기본 atob로 검사
        atob(b64);
    } catch (e) {
        console.error(e);
        alert("유효한 Base64 문자열이 아닙니다.");
        updateMeta();
        return;
    }

    try {
        plainInput.value = fromBase64Utf8(b64);
        updateMeta();
    } catch (e) {
        console.error(e);
        alert("디코딩은 되었지만 UTF-8 텍스트로 복원할 수 없습니다. (바이너리 데이터일 수 있어요)");
        updateMeta();
    }
});

// 복사
copyBtn.addEventListener("click", async () => {
    const text = base64Output.value || "";
    if (!text) {
        alert("복사할 Base64 문자열이 없습니다.");
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
        alert("Base64 문자열이 클립보드에 복사되었습니다.");
    } catch (e) {
        console.error(e);
        alert("복사 중 오류가 발생했습니다. 직접 복사해 주세요.");
    }
});

// 초기화
clearBtn.addEventListener("click", () => {
    plainInput.value = "";
    base64Output.value = "";
    updateMeta();
});

// 입력 변화 시 메타 업데이트
base64Output.addEventListener("input", updateMeta);

// 파일 → Base64(Data URL)
fileToBase64Btn.addEventListener("click", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
        alert("변환할 파일을 선택해 주세요.");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        // Data URL (예: data:image/png;base64,....)
        const dataUrl = reader.result;
        base64Output.value = String(dataUrl || "");
        updateMeta();
    };
    reader.onerror = (e) => {
        console.error(e);
        alert("파일 읽기 중 오류가 발생했습니다.");
    };

    reader.readAsDataURL(file);
});

// 초기 상태
updateMeta();
