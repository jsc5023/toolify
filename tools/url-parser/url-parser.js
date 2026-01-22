/* ============================================================
   URL 파서/쿼리 편집기 (단독 동작 완성본)
   - 탭 전환
   - URL 구성요소 파싱
   - 쿼리 파라미터 표 편집 (중복 key 유지)
   - 디코딩 표시 옵션(표에서만)
   - 공백 + 생성 옵션
   - 빈 값 유지 옵션
   - 배치 파싱 + 예제 넣기
   - 복사 버튼
   - FAQ 토글(메인.js 없어도 동작)
   ============================================================ */

function safeDecode(s) {
    try { return decodeURIComponent(s); } catch { return s; }
}

function normalizeUrlInput(input) {
    const raw = (input || "").trim();
    if (!raw) return { ok: false, error: "URL을 입력해주세요." };

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(raw);
    const candidate = hasScheme ? raw : `https://${raw}`;

    try {
        const u = new URL(candidate);
        return { ok: true, url: u, assumedScheme: !hasScheme };
    } catch {
        return { ok: false, error: "유효한 URL이 아닙니다. (예: https://example.com?a=1)" };
    }
}

function buildQueryString(rows, { keepEmpty, plusSpace }) {
    const parts = [];

    for (const { k, v } of rows) {
        const key = (k ?? "").trim();
        const val = (v ?? "");

        // key 자체가 빈 경우
        if (!key && !keepEmpty) continue;

        // 인코딩은 encodeURIComponent 기준
        let ek = encodeURIComponent(key);
        let ev = encodeURIComponent(val);

        if (plusSpace) {
            ek = ek.replace(/%20/g, "+");
            ev = ev.replace(/%20/g, "+");
        }

        // keepEmpty=false 일 때 value가 빈 문자열이면 key= 형태를 만들지 말고 key만? -> 일반적으로 key=가 더 안전
        // 여기서는 "빈 값도 유지" 옵션이 있을 때만 유지하도록 설계.
        if (val === "" && !keepEmpty) {
            continue;
        }

        parts.push(`${ek}=${ev}`);
    }

    return parts.join("&");
}

function readTableRows(tbody) {
    const rows = [];
    tbody.querySelectorAll("tr").forEach((tr) => {
        const k = tr.querySelector("[data-col='key']")?.value ?? "";
        const v = tr.querySelector("[data-col='val']")?.value ?? "";
        rows.push({ k, v });
    });
    return rows;
}

function clearTbody(tbody) {
    tbody.innerHTML = "";
}

function reindex(tbody) {
    tbody.querySelectorAll("tr").forEach((tr, i) => {
        tr.children[0].textContent = String(i + 1);
    });
}

function addRow(tbody, { k = "", v = "" } = {}) {
    const idx = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");

    const tdIdx = document.createElement("td");
    tdIdx.textContent = String(idx);

    const tdKey = document.createElement("td");
    const inKey = document.createElement("input");
    inKey.className = "cell-input";
    inKey.setAttribute("data-col", "key");
    inKey.placeholder = "key";
    inKey.value = k;
    tdKey.appendChild(inKey);

    const tdVal = document.createElement("td");
    const inVal = document.createElement("input");
    inVal.className = "cell-input";
    inVal.setAttribute("data-col", "val");
    inVal.placeholder = "value";
    inVal.value = v;
    tdVal.appendChild(inVal);

    const tdDel = document.createElement("td");
    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn-del";
    btnDel.textContent = "삭제";
    btnDel.addEventListener("click", () => {
        tr.remove();
        reindex(tbody);
    });
    tdDel.appendChild(btnDel);

    tr.appendChild(tdIdx);
    tr.appendChild(tdKey);
    tr.appendChild(tdVal);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
}

/* =============================
   탭 전환
   ============================= */
function initTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;

            tabButtons.forEach((b) => b.classList.remove("active"));
            tabPanels.forEach((p) => p.classList.remove("active"));

            btn.classList.add("active");
            const panel = document.getElementById("tab-" + target);
            if (panel) panel.classList.add("active");
        });
    });
}

/* =============================
   복사 버튼
   ============================= */
function initCopyButtons() {
    document.querySelectorAll("[data-copy-target]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const targetId = btn.getAttribute("data-copy-target");
            const el = document.getElementById(targetId);
            const text = (el?.innerText || el?.textContent || "").trim();
            if (!text || text === "-") return;

            const old = btn.textContent;
            try {
                await navigator.clipboard.writeText(text);
                btn.textContent = "복사됨!";
                setTimeout(() => (btn.textContent = old), 900);
            } catch {
                alert("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
            }
        });
    });
}

/* =============================
   파싱/편집
   ============================= */
function parseAndRenderSingle(state) {
    const {
        urlInput,
        optDecodeView,
        outProtocol, outHost, outPath, outHash,
        outHint,
        paramsTbody
    } = state;

    const res = normalizeUrlInput(urlInput.value);
    if (!res.ok) {
        outProtocol.textContent = "-";
        outHost.textContent = "-";
        outPath.textContent = "-";
        outHash.textContent = "-";
        outHint.textContent = res.error;

        clearTbody(paramsTbody);
        addRow(paramsTbody);
        state.outUrl.textContent = "-";
        state.outUrlHint.textContent = "-";
        return;
    }

    const u = res.url;

    outProtocol.textContent = (u.protocol || "").replace(":", "");
    outHost.textContent = u.host || "-";
    outPath.textContent = u.pathname || "/";
    outHash.textContent = u.hash || "-";

    outHint.textContent = res.assumedScheme
        ? "스킴(http/https)이 없어 https:// 를 가정해 파싱했습니다."
        : "URL을 파싱했습니다.";

    // Query table
    clearTbody(paramsTbody);
    const decodeView = optDecodeView.checked;

    let count = 0;
    // URLSearchParams는 순서/중복 보존
    u.searchParams.forEach((value, key) => {
        count++;
        const k = decodeView ? safeDecode(key) : key;
        const v = decodeView ? safeDecode(value) : value;
        addRow(paramsTbody, { k, v });
    });

    if (count === 0) addRow(paramsTbody);

    // 기본으로 재생성도 수행
    rebuildSingle(state);
}

function rebuildSingle(state) {
    const {
        urlInput,
        optPlusSpace,
        optKeepEmpty,
        paramsTbody,
        outUrl,
        outUrlHint
    } = state;

    const res = normalizeUrlInput(urlInput.value);
    if (!res.ok) {
        outUrl.textContent = "-";
        outUrlHint.textContent = "먼저 유효한 URL을 입력하고 파싱해주세요.";
        return;
    }

    const u = res.url;
    const rows = readTableRows(paramsTbody);

    const qs = buildQueryString(rows, {
        keepEmpty: optKeepEmpty.checked,
        plusSpace: optPlusSpace.checked
    });

    // URL 객체에 직접 설정
    u.search = qs ? `?${qs}` : "";

    outUrl.textContent = u.toString();
    outUrlHint.textContent = `파라미터 ${rows.length}개 기준으로 URL을 재생성했습니다.`;
}

/* =============================
   새로 만들기
   ============================= */
function buildUrlFromRows(state) {
    const {
        buildBase, buildHash,
        buildPlusSpace, buildKeepEmpty,
        buildTbody,
        buildOutUrl, buildHint
    } = state;

    const baseRaw = (buildBase.value || "").trim();
    if (!baseRaw) {
        buildOutUrl.textContent = "-";
        buildHint.textContent = "Base URL을 입력해주세요. (예: https://example.com/search)";
        return;
    }

    const res = normalizeUrlInput(baseRaw);
    if (!res.ok) {
        buildOutUrl.textContent = "-";
        buildHint.textContent = res.error;
        return;
    }

    const u = res.url;
    const rows = readTableRows(buildTbody);

    const qs = buildQueryString(rows, {
        keepEmpty: buildKeepEmpty.checked,
        plusSpace: buildPlusSpace.checked
    });

    u.search = qs ? `?${qs}` : "";

    let h = (buildHash.value || "").trim();
    if (h) {
        if (!h.startsWith("#")) h = "#" + h;
        u.hash = h;
    } else {
        u.hash = "";
    }

    buildOutUrl.textContent = u.toString();
    buildHint.textContent = "입력한 파라미터로 URL을 생성했습니다.";
}

/* =============================
   배치 파싱
   ============================= */
function renderBatch(state) {
    const { batchInput, batchSummary, batchTbody } = state;

    const text = batchInput.value || "";
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    batchTbody.innerHTML = "";

    if (lines.length === 0) {
        batchSummary.textContent = "여러 줄 URL을 붙여넣으면 자동 파싱하여 표로 보여줍니다.";
        return;
    }

    let ok = 0;

    lines.forEach((line, idx) => {
        const tr = document.createElement("tr");

        const tdIdx = document.createElement("td");
        const tdStatus = document.createElement("td");
        const tdHost = document.createElement("td");
        const tdPath = document.createElement("td");
        const tdParams = document.createElement("td");
        const tdRebuilt = document.createElement("td");

        tdIdx.textContent = String(idx + 1);

        const res = normalizeUrlInput(line);
        if (!res.ok) {
            tdStatus.textContent = "실패";
            tdHost.textContent = "-";
            tdPath.textContent = "-";
            tdParams.textContent = "-";
            tdRebuilt.textContent = line;
        } else {
            ok++;
            const u = res.url;

            tdStatus.textContent = res.assumedScheme ? "OK(https 가정)" : "OK";
            tdHost.textContent = u.host || "-";
            tdPath.textContent = u.pathname || "/";

            let c = 0;
            u.searchParams.forEach(() => c++);
            tdParams.textContent = String(c);

            tdRebuilt.textContent = u.toString();
        }

        tr.appendChild(tdIdx);
        tr.appendChild(tdStatus);
        tr.appendChild(tdHost);
        tr.appendChild(tdPath);
        tr.appendChild(tdParams);
        tr.appendChild(tdRebuilt);

        batchTbody.appendChild(tr);
    });

    batchSummary.textContent = `총 ${lines.length}줄 중 ${ok}줄 파싱 성공`;
}

function fillBatchExample(state) {
    state.batchInput.value =
        `https://example.com/search?q=%ED%95%9C%EA%B8%80&sort=desc#top
example.com/path?tag=a&tag=b&empty=
http://localhost:8080/api/users?page=2&size=20
https://toolify.kr/tools/url-encoder/?q=URL%20%EC%9D%B8%EC%BD%94%EB%94%A9
not a url
google.com/search?q=unix+timestamp
https://example.com?a=1&a=2&b=%2B%20%25`;
    renderBatch(state);
}

/* =============================
   초기 세팅 + 이벤트
   ============================= */
function setDefaults(state) {
    // single 예시
    state.urlInput.value = "https://example.com/search?q=%ED%95%9C%EA%B8%80&sort=desc&tag=a&tag=b#top";
    clearTbody(state.paramsTbody);
    addRow(state.paramsTbody);
    parseAndRenderSingle(state);

    // build 예시 3줄
    state.buildBase.value = "https://example.com/search";
    state.buildHash.value = "top";
    clearTbody(state.buildTbody);
    addRow(state.buildTbody, { k: "q", v: "한글" });
    addRow(state.buildTbody, { k: "tag", v: "a" });
    addRow(state.buildTbody, { k: "tag", v: "b" });
    buildUrlFromRows(state);

    // batch 안내
    renderBatch(state);
}

function init() {
    initTabs();
    initCopyButtons();
    initFAQ();

    const state = {
        // single
        urlInput: document.getElementById("url-input"),
        optDecodeView: document.getElementById("opt-decode-view"),
        optPlusSpace: document.getElementById("opt-plus-space"),
        optKeepEmpty: document.getElementById("opt-keep-empty"),

        btnParse: document.getElementById("btn-parse"),
        btnRebuild: document.getElementById("btn-rebuild"),
        btnClear: document.getElementById("btn-clear"),
        btnAddRow: document.getElementById("btn-add-row"),

        outProtocol: document.getElementById("out-protocol"),
        outHost: document.getElementById("out-host"),
        outPath: document.getElementById("out-path"),
        outHash: document.getElementById("out-hash"),
        outHint: document.getElementById("out-hint"),

        paramsTbody: document.getElementById("params-tbody"),
        outUrl: document.getElementById("out-url"),
        outUrlHint: document.getElementById("out-url-hint"),

        // build
        buildBase: document.getElementById("build-base"),
        buildHash: document.getElementById("build-hash"),
        buildPlusSpace: document.getElementById("build-plus-space"),
        buildKeepEmpty: document.getElementById("build-keep-empty"),

        btnBuild: document.getElementById("btn-build"),
        btnBuildClear: document.getElementById("btn-build-clear"),
        btnBuildAddRow: document.getElementById("btn-build-add-row"),

        buildTbody: document.getElementById("build-tbody"),
        buildOutUrl: document.getElementById("build-out-url"),
        buildHint: document.getElementById("build-hint"),

        // batch
        batchInput: document.getElementById("batch-input"),
        btnBatch: document.getElementById("btn-batch"),
        btnBatchExample: document.getElementById("btn-batch-example"),
        btnBatchClear: document.getElementById("btn-batch-clear"),
        batchSummary: document.getElementById("batch-summary"),
        batchTbody: document.getElementById("batch-tbody"),
    };

    // single events
    state.btnParse.addEventListener("click", () => parseAndRenderSingle(state));
    state.btnRebuild.addEventListener("click", () => rebuildSingle(state));
    state.btnClear.addEventListener("click", () => {
        state.urlInput.value = "";
        clearTbody(state.paramsTbody);
        addRow(state.paramsTbody);
        parseAndRenderSingle(state);
    });
    state.btnAddRow.addEventListener("click", () => addRow(state.paramsTbody));

    // 자동 반영(원치 않으면 지워도 됨)
    state.urlInput.addEventListener("input", () => parseAndRenderSingle(state));
    state.optDecodeView.addEventListener("change", () => parseAndRenderSingle(state));
    state.optPlusSpace.addEventListener("change", () => rebuildSingle(state));
    state.optKeepEmpty.addEventListener("change", () => rebuildSingle(state));
    state.paramsTbody.addEventListener("input", () => rebuildSingle(state));

    // build events
    state.btnBuild.addEventListener("click", () => buildUrlFromRows(state));
    state.btnBuildAddRow.addEventListener("click", () => addRow(state.buildTbody));
    state.btnBuildClear.addEventListener("click", () => {
        state.buildBase.value = "";
        state.buildHash.value = "";
        clearTbody(state.buildTbody);
        addRow(state.buildTbody);
        state.buildOutUrl.textContent = "-";
        state.buildHint.textContent = "입력값을 비웠습니다.";
    });

    state.buildBase.addEventListener("input", () => buildUrlFromRows(state));
    state.buildHash.addEventListener("input", () => buildUrlFromRows(state));
    state.buildPlusSpace.addEventListener("change", () => buildUrlFromRows(state));
    state.buildKeepEmpty.addEventListener("change", () => buildUrlFromRows(state));
    state.buildTbody.addEventListener("input", () => buildUrlFromRows(state));

    // batch events
    state.btnBatch.addEventListener("click", () => renderBatch(state));
    state.btnBatchExample.addEventListener("click", () => fillBatchExample(state));
    state.btnBatchClear.addEventListener("click", () => {
        state.batchInput.value = "";
        renderBatch(state);
    });

    setDefaults(state);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
