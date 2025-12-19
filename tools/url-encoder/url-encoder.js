/* URL 인코더/디코더 (robust) */
(() => {
    const $ = (sel) => document.querySelector(sel);

    const inputEl = $("#ue-input");
    const outputEl = $("#ue-output");
    const apiEl = $("#ue-api");
    const spacePlusEl = $("#ue-space-plus");

    const runBtn = $("#ue-run");
    const clearBtn = $("#ue-clear");
    const swapBtn = $("#ue-swap");
    const copyBtn = $("#ue-copy");

    const statusEl = $("#ue-status");
    const errorEl = $("#ue-error");

    const tabs = document.querySelectorAll(".ue-tab");
    let mode = "encode"; // default

    function clearMsg() {
        statusEl.textContent = "";
        errorEl.textContent = "";
    }

    function setStatus(msg) {
        statusEl.textContent = msg;
        setTimeout(() => {
            if (statusEl.textContent === msg) statusEl.textContent = "";
        }, 1400);
    }

    function setError(msg) {
        errorEl.textContent = msg;
    }

    function encodeText(text) {
        const base = (apiEl.value === "uri") ? encodeURI(text) : encodeURIComponent(text);
        return spacePlusEl.checked ? base.replace(/%20/g, "+") : base;
    }

    function decodeText(text) {
        const prepared = spacePlusEl.checked ? text.replace(/\+/g, "%20") : text;
        return decodeURIComponent(prepared);
    }

    function run() {
        clearMsg();
        const text = (inputEl.value ?? "").trim();

        if (!text) {
            outputEl.value = "";
            setError("입력값을 넣어주세요.");
            return;
        }

        try {
            outputEl.value = (mode === "encode") ? encodeText(text) : decodeText(text);
            setStatus("완료!");
        } catch (e) {
            outputEl.value = "";
            setError("변환 실패: % 형식이 깨졌거나 올바르지 않은 인코딩 문자열일 수 있어요.");
        }
    }

    function setMode(next) {
        mode = next;
        tabs.forEach(t => {
            const active = t.dataset.mode === mode;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", active ? "true" : "false");
        });

        // 디코딩 모드에서는 encode 방식이 의미가 줄어든다는 안내
        clearMsg();
        if (mode === "decode") setStatus("디코딩 모드입니다.");
    }

    // 모드 탭
    tabs.forEach(t => {
        t.addEventListener("click", () => setMode(t.dataset.mode));
    });

    // 버튼
    runBtn.addEventListener("click", run);

    clearBtn.addEventListener("click", () => {
        clearMsg();
        inputEl.value = "";
        outputEl.value = "";
        setStatus("초기화!");
        inputEl.focus();
    });

    swapBtn.addEventListener("click", () => {
        clearMsg();
        const a = inputEl.value;
        inputEl.value = outputEl.value;
        outputEl.value = a;
        setStatus("교체 완료!");
    });

    copyBtn.addEventListener("click", async () => {
        clearMsg();
        const text = (outputEl.value ?? "").trim();
        if (!text) {
            setError("복사할 결과가 없습니다.");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            setStatus("복사 완료!");
        } catch {
            // fallback
            outputEl.focus();
            outputEl.select();
            document.execCommand("copy");
            setStatus("복사 완료!");
        }
    });

    // Ctrl/⌘ + Enter 실행
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
    });

    // 예시
    const examples = {
        korean: { mode: "encode", api: "component", plus: false, text: "한글 검색어" },
        query:  { mode: "encode", api: "component", plus: false, text: "https://example.com/search?q=한글 검색어&sort=최신&tag=hello world" },
        encoded:{ mode: "decode", api: "component", plus: false, text: "%ED%95%9C%EA%B8%80%20%EA%B2%80%EC%83%89%EC%96%B4" },
        form:   { mode: "decode", api: "component", plus: true,  text: "q=%ED%95%9C%EA%B8%80+%EA%B2%80%EC%83%89%EC%96%B4&tag=hello+world" }
    };

    document.querySelectorAll(".ue-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            const ex = examples[btn.dataset.ex];
            if (!ex) return;

            setMode(ex.mode);
            apiEl.value = ex.api;
            spacePlusEl.checked = ex.plus;
            inputEl.value = ex.text;

            run();
        });
    });

    // 초기 모드 세팅
    setMode("encode");
})();
