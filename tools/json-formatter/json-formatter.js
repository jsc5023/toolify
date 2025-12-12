// JSON 포매터 전용 JS

const jsonInputEl = document.getElementById("json-input");
const jsonOutputEl = document.getElementById("json-output");
const statusEl = document.getElementById("json-status");

const sampleBtn = document.getElementById("json-sample-btn");
const clearBtn = document.getElementById("json-clear-btn");
const formatBtn = document.getElementById("json-format-btn");
const minifyBtn = document.getElementById("json-minify-btn");
const copyBtn = document.getElementById("json-copy-btn");

// 상태 표시 헬퍼
function setStatusNeutral(message) {
    statusEl.textContent = message;
    statusEl.classList.remove("status-ok");
    statusEl.classList.remove("status-error");
}

function setStatusOk(message) {
    statusEl.textContent = message;
    statusEl.classList.add("status-ok");
    statusEl.classList.remove("status-error");
}

function setStatusError(message) {
    statusEl.textContent = message;
    statusEl.classList.add("status-error");
    statusEl.classList.remove("status-ok");
}

// JSON 파싱 헬퍼
function tryParseJson(text) {
    try {
        if (!text || text.trim().length === 0) {
            setStatusNeutral("JSON을 입력하면 자동으로 유효성 검사를 진행합니다.");
            return null;
        }
        const obj = JSON.parse(text);
        setStatusOk("유효한 JSON입니다.");
        return obj;
    } catch (err) {
        // 에러 메시지 살짝 정리
        const msg = err && err.message ? err.message : "JSON 파싱 중 오류가 발생했습니다.";
        setStatusError("유효하지 않은 JSON입니다. 오류: " + msg);
        return null;
    }
}

// 입력 변화 시 자동 유효성 검사 (간단 버전)
jsonInputEl.addEventListener("input", () => {
    const raw = jsonInputEl.value;
    // 비어 있으면 중립 상태
    if (!raw || raw.trim().length === 0) {
        setStatusNeutral("JSON을 입력하면 자동으로 유효성 검사를 진행합니다.");
        jsonOutputEl.value = "";
        return;
    }
    tryParseJson(raw);
});

// 예제 JSON 불러오기
sampleBtn.addEventListener("click", () => {
    const sample = {
        name: "Toolify",
        url: "https://toolify.kr",
        tools: [
            { id: "date-calculator", name: "날짜 계산기", category: "time" },
            { id: "image-compressor", name: "이미지 압축기", category: "image" },
            { id: "json-formatter", name: "JSON 포매터", category: "dev" }
        ],
        options: {
            theme: "light",
            language: "ko"
        }
    };

    const text = JSON.stringify(sample, null, 2);
    jsonInputEl.value = text;
    jsonOutputEl.value = "";
    setStatusOk("예제 JSON을 불러왔습니다. 바로 포매팅/압축 기능을 사용해 보세요.");
});

// 초기화
clearBtn.addEventListener("click", () => {
    jsonInputEl.value = "";
    jsonOutputEl.value = "";
    setStatusNeutral("JSON을 입력하면 자동으로 유효성 검사를 진행합니다.");
});

// 예쁘게 정렬하기
formatBtn.addEventListener("click", () => {
    const raw = jsonInputEl.value;
    const obj = tryParseJson(raw);
    if (!obj) {
        // 유효하지 않은 경우 statusError에서 이미 메시지 출력
        return;
    }
    const pretty = JSON.stringify(obj, null, 2);
    jsonOutputEl.value = pretty;
    setStatusOk("예쁘게 정렬된 JSON을 결과 영역에 표시했습니다.");
});

// 한 줄로 압축
minifyBtn.addEventListener("click", () => {
    const raw = jsonInputEl.value;
    const obj = tryParseJson(raw);
    if (!obj) {
        return;
    }
    const minified = JSON.stringify(obj);
    jsonOutputEl.value = minified;
    setStatusOk("한 줄로 압축된 JSON을 결과 영역에 표시했습니다.");
});

// 결과 복사
copyBtn.addEventListener("click", async () => {
    const targetText =
        jsonOutputEl.value && jsonOutputEl.value.trim().length > 0
            ? jsonOutputEl.value
            : jsonInputEl.value;

    if (!targetText || targetText.trim().length === 0) {
        setStatusNeutral("복사할 JSON이 없습니다. 먼저 JSON을 입력하거나 포매팅해 주세요.");
        return;
    }

    try {
        await navigator.clipboard.writeText(targetText);
        setStatusOk("JSON을 클립보드에 복사했습니다.");
    } catch (e) {
        console.error("클립보드 복사 실패:", e);
        setStatusError("클립보드 복사에 실패했습니다. 직접 선택 후 Ctrl+C로 복사해 주세요.");
    }
});

// 초기 상태
setStatusNeutral("JSON을 입력하면 자동으로 유효성 검사를 진행합니다.");
