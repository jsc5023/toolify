const textInput = document.getElementById("text-input");

const charCountEl = document.getElementById("char-count");
const charNoSpaceCountEl = document.getElementById("char-nospace-count");
const wordCountEl = document.getElementById("word-count");
const lineCountEl = document.getElementById("line-count");
const byteCountEl = document.getElementById("byte-count");

const clearBtn = document.getElementById("clear-btn");
const sampleBtn = document.getElementById("sample-btn");
const copyBtn = document.getElementById("copy-btn");

function updateStats() {
    const text = textInput.value;

    // 전체 글자 수 (공백 포함)
    const totalChars = text.length;

    // 공백 제외 글자 수
    const noSpaceChars = text.replace(/\s/g, "").length;

    // 단어 수 (공백 기준)
    let wordCount = 0;
    const trimmed = text.trim();
    if (trimmed.length > 0) {
        // 줄바꿈, 탭 등 모든 공백을 기준으로 분리
        wordCount = trimmed.split(/\s+/).length;
    }

    // 줄 수
    const lines = text.length === 0 ? 0 : text.split("\n").length;

    // 바이트 수 (UTF-8 기준)
    const bytes = new Blob([text]).size;

    // DOM에 반영
    charCountEl.textContent = totalChars.toString();
    charNoSpaceCountEl.textContent = noSpaceChars.toString();
    wordCountEl.textContent = wordCount.toString();
    lineCountEl.textContent = lines.toString();
    byteCountEl.textContent = bytes.toString();
}

// 입력 이벤트 연결
textInput.addEventListener("input", updateStats);

// 내용 지우기
clearBtn.addEventListener("click", () => {
    const shouldClear = confirm(
        "입력한 모든 내용이 삭제됩니다.\n정말 지우시겠습니까?"
    );
    if (!shouldClear) return;

    textInput.value = "";
    updateStats();
    textInput.focus();
});

// 샘플 텍스트 넣기
sampleBtn.addEventListener("click", () => {
    const shouldInsertSample = confirm(
        "기존 내용이 사라지고 샘플 텍스트가 입력됩니다.\n계속하시겠습니까?"
    );
    if (!shouldInsertSample) return;

    const sampleText =
        "이곳에 글을 입력하면 글자 수, 공백 제외 글자 수, 단어 수, 줄 수, 바이트 수가 자동으로 계산됩니다.\n" +
        "자기소개서, 블로그 글, 공모전 원고처럼 글자 수 제한이 있는 글을 쓸 때 활용해 보세요.";

    textInput.value = sampleText;
    updateStats();
});

// 텍스트 복사하기
copyBtn.addEventListener("click", async () => {
    const text = textInput.value;
    if (!text) {
        alert("복사할 텍스트가 없습니다.");
        return;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            alert("텍스트가 클립보드에 복사되었습니다.");
        } else {
            // 오래된 브라우저 대비
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            alert("텍스트가 클립보드에 복사되었습니다.");
        }
    } catch (e) {
        console.error(e);
        alert("복사 중 오류가 발생했습니다. 직접 복사해 주세요.");
    }
});

// 초기 상태 업데이트
updateStats();