/* ============================================================
   chmod 권한 계산기 (스크린샷 스타일 매트릭스 UI)
   - 숫자 -> rwx / rwx -> 숫자(매트릭스 버튼)
   - 특수권한(SUID/SGID/Sticky) 4자리 지원
   - 대상 탭(파일/디렉토리/심링)로 설명/팁 변경
   ============================================================ */

const $ = (id) => document.getElementById(id);

function toast(msg) {
    const el = $("cc-toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => el.classList.add("hidden"), 1200);
}

function setError(msg) { $("cc-error").textContent = msg || ""; }
function setTip(html) { $("cc-tip").innerHTML = html || ""; }

function clearOutputs() {
    $("out-octal").textContent = "";
    $("out-rwx").textContent = "";
    $("out-symbolic").textContent = "";
    $("out-cmd").textContent = "";
    $("out-explain").textContent = "";
    setError("");
    setTip("");
}

function safeWriteClipboard(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast("복사됨");
}

function copyRowById(id) {
    const t = $(id).textContent.trim();
    safeWriteClipboard(t);
}

function copyAll() {
    const lines = [
        `숫자 권한: ${$("out-octal").textContent.trim()}`,
        `rwx 표기: ${$("out-rwx").textContent.trim()}`,
        `심볼릭: ${$("out-symbolic").textContent.trim()}`,
        `chmod 명령: ${$("out-cmd").textContent.trim()}`,
        `설명: ${$("out-explain").textContent.trim()}`
    ].filter((x) => !x.endsWith(":"));
    safeWriteClipboard(lines.join("\n"));
}

/* ---------------- 상태 ---------------- */

let MODE = "o2r"; // "o2r" | "r2o"
let TARGET = "file"; // file | dir | link

const state = {
    u: { r: false, w: false, x: false },
    g: { r: false, w: false, x: false },
    o: { r: false, w: false, x: false },
    special: { suid: false, sgid: false, sticky: false }
};

function setMode(mode) {
    MODE = mode;
    $("tab-o2r").classList.toggle("active", mode === "o2r");
    $("tab-r2o").classList.toggle("active", mode === "r2o");

    $("mode-hint").textContent =
        mode === "o2r"
            ? "숫자 권한(예: 755, 0644, 1777)을 입력하면 rwx/명령어/설명을 보여줍니다."
            : "버튼형 매트릭스로 r/w/x를 선택하면 숫자 권한과 chmod 명령을 자동 계산합니다. (입력칸은 선택사항)";

    $("cc-input").placeholder = (mode === "o2r")
        ? "예: 755, 0644, 1777"
        : "예: rwxr-xr-x (입력하거나 버튼으로 구성)";

    // r2o 모드에선 매트릭스를 적극 사용하므로 입력이 비어도 결과가 나올 수 있게 함
    convert();
}

function setTarget(t) {
    TARGET = t;

    $("type-file").classList.toggle("active", t === "file");
    $("type-dir").classList.toggle("active", t === "dir");
    $("type-link").classList.toggle("active", t === "link");

    // column label "실행"은 그대로 두고 설명에서만 차이를 강조(디렉토리/링크)
    convert();
}

function toggleSpecialUI() {
    const enabled = $("opt-special").checked;
    const wrap = $("cc-special-wrap");
    wrap.style.opacity = enabled ? "1" : "0.5";
    wrap.querySelectorAll("button").forEach((b) => (b.disabled = !enabled));

    if (!enabled) {
        state.special.suid = false;
        state.special.sgid = false;
        state.special.sticky = false;
        syncSpecialButtons();
        syncSpecialValue();
    }
}

/* ---------------- 계산 ---------------- */

function bitsToNum(bits) {
    return (bits.r ? 4 : 0) + (bits.w ? 2 : 0) + (bits.x ? 1 : 0);
}

function specialToNum(sp) {
    return (sp.suid ? 4 : 0) + (sp.sgid ? 2 : 0) + (sp.sticky ? 1 : 0);
}

function numToBits(n) {
    return { r: !!(n & 4), w: !!(n & 2), x: !!(n & 1) };
}

function normalizeOctalInput(input) {
    let s = (input || "").trim();
    if (!s) return { ok: false, msg: "권한 숫자를 입력해주세요. (예: 755, 644, 1777)" };

    s = s.replace(/\s+/g, "");
    if (s.startsWith("chmod")) s = s.replace(/^chmod/, "");
    s = s.replace(/^[=]/, "");

    if (!/^\d{3,4}$/.test(s)) return { ok: false, msg: "3자리 또는 4자리 숫자만 입력해주세요. (예: 755, 0644, 1777)" };
    if (s.length === 3) s = "0" + s;

    if (![...s].every((ch) => ch >= "0" && ch <= "7")) {
        return { ok: false, msg: "8진수 범위(0~7)만 허용됩니다." };
    }

    return {
        ok: true,
        special: parseInt(s[0], 10),
        u: parseInt(s[1], 10),
        g: parseInt(s[2], 10),
        o: parseInt(s[3], 10),
        raw4: s
    };
}

function applySpecialToExec(execChar, hasExec, specialFlag, upperChar, lowerChar) {
    if (!specialFlag) return execChar;
    return hasExec ? lowerChar : upperChar;
}

function octalToRwxString({ special, u, g, o }) {
    const suid = (special & 4) !== 0;
    const sgid = (special & 2) !== 0;
    const sticky = (special & 1) !== 0;

    const ub = numToBits(u);
    const gb = numToBits(g);
    const ob = numToBits(o);

    const uStr = `${ub.r ? "r" : "-"}${ub.w ? "w" : "-"}${ub.x ? "x" : "-"}`;
    const gStr = `${gb.r ? "r" : "-"}${gb.w ? "w" : "-"}${gb.x ? "x" : "-"}`;
    const oStr = `${ob.r ? "r" : "-"}${ob.w ? "w" : "-"}${ob.x ? "x" : "-"}`;

    const uX = applySpecialToExec(uStr[2], ub.x, suid, "S", "s");
    const gX = applySpecialToExec(gStr[2], gb.x, sgid, "S", "s");
    const oX = applySpecialToExec(oStr[2], ob.x, sticky, "T", "t");

    return `${uStr.slice(0,2)}${uX}${gStr.slice(0,2)}${gX}${oStr.slice(0,2)}${oX}`;
}

function octalToSymbolic({ special, u, g, o }) {
    const part = (who, n) => {
        const flags = [];
        if (n & 4) flags.push("r");
        if (n & 2) flags.push("w");
        if (n & 1) flags.push("x");
        return flags.length ? `${who}+${flags.join("")}` : `${who}-rwx`;
    };

    const specials = [];
    if (special & 4) specials.push("u+s");
    if (special & 2) specials.push("g+s");
    if (special & 1) specials.push("+t");

    const base = [part("u", u), part("g", g), part("o", o)].join(",");
    return specials.length ? `${base},${specials.join(",")}` : base;
}

function explain({ special, u, g, o }) {
    const isDir = TARGET === "dir";
    const isLink = TARGET === "link";

    const toWords = (n) => {
        const a = [];
        if (n & 4) a.push("읽기");
        if (n & 2) a.push("쓰기");
        if (n & 1) a.push(isDir ? "진입/탐색" : "실행");
        return a.length ? a.join("·") : "권한 없음";
    };

    const sp = [];
    if (special & 4) sp.push("SUID");
    if (special & 2) sp.push("SGID");
    if (special & 1) sp.push("Sticky");
    const spText = sp.length ? `특수권한: ${sp.join(", ")}` : "특수권한 없음";

    let head = "파일 권한: x=실행, r=읽기, w=쓰기";
    if (isDir) head = "디렉토리 권한: x=진입/탐색, r=목록 조회, w=생성/삭제(단 x 필요)";
    if (isLink) head = "심볼릭 링크: 일반적으로 링크 자체 권한보다 ‘대상’ 권한이 접근에 더 영향(환경에 따라 차이)";

    return `${head}\n소유자(u): ${toWords(u)} / 그룹(g): ${toWords(g)} / 기타(o): ${toWords(o)}\n${spText}`;
}

function tipHtml({ special }) {
    const isDir = TARGET === "dir";
    const isLink = TARGET === "link";

    const lines = [];
    if (isDir) {
        lines.push("디렉토리에서 <strong>w</strong>만 있고 <strong>x</strong>가 없으면 생성/삭제가 제대로 동작하지 않을 수 있어요.");
        lines.push("<strong>r</strong>만 있고 <strong>x</strong>가 없으면 목록을 봐도 해당 디렉토리에 들어갈 수 없어요.");
    } else if (isLink) {
        lines.push("심볼릭 링크는 접근 권한이 ‘대상’ 파일/디렉토리 권한에 의해 결정되는 경우가 많습니다.");
    } else {
        lines.push("스크립트/바이너리를 실행하려면 <strong>x</strong> 권한이 필요합니다.");
    }

    if (special & 1) lines.push("Sticky(1): 공유 디렉토리에서 <strong>본인 파일만 삭제</strong>하도록 제한할 때 자주 씁니다. (/tmp)");
    if (special & 4) lines.push("SUID(4): 실행 시 <strong>파일 소유자 권한</strong>으로 실행됩니다. 보안상 신중히 사용하세요.");
    if (special & 2) lines.push("SGID(2): 디렉토리에서는 <strong>그룹 상속</strong>에 자주 활용됩니다.");

    return `💡 <strong>팁</strong><br>${lines.map((x) => `- ${x}`).join("<br>")}`;
}

/* ---------------- 매트릭스 UI 동기화 ---------------- */

function syncRowValue(who) {
    const v = bitsToNum(state[who]);
    $(`val-${who}`).textContent = String(v);
}

function syncSpecialValue() {
    const v = $("opt-special").checked ? specialToNum(state.special) : 0;
    $("val-special").textContent = String(v);
    $("special-hint").textContent = specialHintText();
}

function specialHintText() {
    if (!$("opt-special").checked) return "특수권한이 꺼져 있습니다. (4자리 chmod 계산에서 제외)";
    const list = [];
    if (state.special.suid) list.push("SUID: 실행 시 소유자 권한으로 실행");
    if (state.special.sgid) list.push("SGID: 실행 시 그룹 권한/디렉토리 그룹 상속");
    if (state.special.sticky) list.push("Sticky: 공유 디렉토리에서 본인 파일만 삭제");
    return list.length ? `선택됨: ${list.join(" · ")}` : "선택된 특수권한이 없습니다. (특수값 0)";
}

function syncMatrixButtons() {
    document.querySelectorAll(".cc-matrix-row").forEach((row) => {
        const who = row.dataset.who;
        row.querySelectorAll(".cc-pill").forEach((btn) => {
            const bit = btn.dataset.bit;
            btn.classList.toggle("active", !!state[who][bit]);
        });
    });

    syncRowValue("u");
    syncRowValue("g");
    syncRowValue("o");
    syncSpecialButtons();
    syncSpecialValue();
}

function syncSpecialButtons() {
    document.querySelectorAll(".cc-special-pill").forEach((btn) => {
        const k = btn.dataset.special;
        btn.classList.toggle("active", !!state.special[k]);
    });
}

function clearMatrix() {
    ["u","g","o"].forEach((who) => {
        state[who].r = false; state[who].w = false; state[who].x = false;
    });
    state.special.suid = false; state.special.sgid = false; state.special.sticky = false;
    $("cc-input").value = "";
    syncMatrixButtons();
    convert();
}

function applyOctalToMatrix(octal3or4) {
    const norm = normalizeOctalInput(octal3or4);
    if (!norm.ok) return;

    state.u = numToBits(norm.u);
    state.g = numToBits(norm.g);
    state.o = numToBits(norm.o);

    // special
    if ($("opt-special").checked) {
        state.special.suid = (norm.special & 4) !== 0;
        state.special.sgid = (norm.special & 2) !== 0;
        state.special.sticky = (norm.special & 1) !== 0;
    } else {
        state.special.suid = false; state.special.sgid = false; state.special.sticky = false;
    }

    syncMatrixButtons();
}

/* ---------------- rwx 문자열 파싱 (입력 -> 매트릭스 반영용) ---------------- */

function parseRwxString(input) {
    let s = (input || "").trim();
    if (!s) return { ok: false, msg: "rwx 문자열을 입력하거나 버튼으로 권한을 구성해주세요." };

    s = s.replace(/\s+/g, "");
    if (s.length === 10 && (s[0] === "-" || s[0] === "d" || s[0] === "l")) s = s.slice(1);
    if (s.length !== 9) return { ok: false, msg: "rwx 문자열은 9자리여야 합니다. (예: rwxr-xr-x)" };

    const valid = /^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s);
    if (!valid) return { ok: false, msg: "유효한 rwx 형식이 아닙니다. (예: rwxr-xr-x, rwsr-xr-x, rwxrwxrwt)" };

    const uStr = s.slice(0,3);
    const gStr = s.slice(3,6);
    const oStr = s.slice(6,9);

    const parseChunk = (str) => {
        const r = str[0] === "r";
        const w = str[1] === "w";
        const xch = str[2];
        const x = (xch === "x" || xch === "s" || xch === "t");
        return { r, w, x, xch };
    };

    const u = parseChunk(uStr);
    const g = parseChunk(gStr);
    const o = parseChunk(oStr);

    const special = {
        suid: (u.xch === "s" || u.xch === "S"),
        sgid: (g.xch === "s" || g.xch === "S"),
        sticky: (o.xch === "t" || o.xch === "T")
    };

    return { ok: true, u, g, o, special };
}

function applyRwxToMatrix(rwxStr) {
    const r = parseRwxString(rwxStr);
    if (!r.ok) return { ok: false, msg: r.msg };

    state.u = { r: r.u.r, w: r.u.w, x: r.u.x };
    state.g = { r: r.g.r, w: r.g.w, x: r.g.x };
    state.o = { r: r.o.r, w: r.o.w, x: r.o.x };

    if ($("opt-special").checked) {
        state.special = { ...r.special };
    } else {
        state.special = { suid: false, sgid: false, sticky: false };
    }

    syncMatrixButtons();
    return { ok: true };
}

/* ---------------- 변환 실행 ---------------- */

function buildFromMatrix() {
    const u = bitsToNum(state.u);
    const g = bitsToNum(state.g);
    const o = bitsToNum(state.o);
    const special = $("opt-special").checked ? specialToNum(state.special) : 0;

    return { special, u, g, o };
}

function renderResult(from) {
    const special = from.special || 0;
    const octalShown = (special === 0) ? `${from.u}${from.g}${from.o}` : `${special}${from.u}${from.g}${from.o}`;

    const rwx = octalToRwxString(from);
    const symbolic = octalToSymbolic(from);
    const cmd = `chmod ${octalShown} <path>`;
    const exp = explain(from);

    $("out-octal").textContent = octalShown;
    $("out-rwx").textContent = rwx;
    $("out-symbolic").textContent = symbolic;
    $("out-cmd").textContent = cmd;
    $("out-explain").textContent = exp;

    setTip(tipHtml(from));
    setError("");
}

function convert() {
    const input = $("cc-input").value.trim();

    // 모드별 우선순위:
    // - o2r: 입력이 있으면 입력 우선, 없으면 매트릭스 상태로도 계산 가능(초기 값 000)
    // - r2o: 입력이 rwx면 매트릭스에 반영 후 계산, 입력이 숫자면 매트릭스에 반영 후 계산, 입력이 비면 매트릭스 그대로 계산
    let from = null;

    if (MODE === "o2r") {
        if (input) {
            const norm = normalizeOctalInput(input);
            if (!norm.ok) { clearOutputs(); setError(norm.msg); return; }
            from = norm;
            // 입력 -> 매트릭스도 동기화 (학습/UX)
            applyOctalToMatrix(norm.raw4);
        } else {
            from = buildFromMatrix();
        }
        renderResult(from);
        return;
    }

    // MODE === r2o
    if (input) {
        // 입력이 숫자면 매트릭스에 반영
        if (/^\d{3,4}$/.test(input.replace(/^0+/, (m)=>m))) {
            const norm = normalizeOctalInput(input);
            if (!norm.ok) { clearOutputs(); setError(norm.msg); return; }
            applyOctalToMatrix(norm.raw4);
            from = buildFromMatrix();
            renderResult(from);
            return;
        }

        // 입력이 rwx면 매트릭스 반영
        const r = applyRwxToMatrix(input);
        if (!r.ok) { clearOutputs(); setError(r.msg); return; }
    }

    from = buildFromMatrix();
    renderResult(from);
}

/* ---------------- 예시 ---------------- */

function applyExample(key) {
    const map = {
        ex755: "755",
        ex644: "644",
        ex600: "600",
        ex700: "700",
        ex775: "775",
        ex1777: "1777",
        ex4755: "4755"
    };

    $("cc-input").value = map[key] || "";
    setMode("o2r");
    convert();
}

/* ---------------- FAQ 바인딩 (main.js 없을 경우 대비) ---------------- */
function bindFaqLocal() {
    document.querySelectorAll(".faq-item .faq-question").forEach((btn) => {
        btn.addEventListener("click", () => btn.parentElement.classList.toggle("active"));
    });
}

/* ---------------- init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
    // 타입 탭
    $("type-file").addEventListener("click", () => setTarget("file"));
    $("type-dir").addEventListener("click", () => setTarget("dir"));
    $("type-link").addEventListener("click", () => setTarget("link"));

    // 모드
    $("tab-o2r").addEventListener("click", () => setMode("o2r"));
    $("tab-r2o").addEventListener("click", () => setMode("r2o"));
    $("swap-btn").addEventListener("click", () => {
        setMode(MODE === "o2r" ? "r2o" : "o2r");
    });

    // 옵션
    $("opt-special").addEventListener("change", () => {
        toggleSpecialUI();
        syncSpecialValue();
        convert();
    });

    // 입력/버튼
    $("convert-btn").addEventListener("click", convert);
    $("copy-all-btn").addEventListener("click", copyAll);

    // 개별 복사
    document.querySelectorAll(".cc-copy").forEach((btn) => {
        btn.addEventListener("click", () => copyRowById(btn.dataset.copy));
    });

    // 예시
    document.querySelectorAll(".cc-chip").forEach((chip) => {
        chip.addEventListener("click", () => applyExample(chip.dataset.ex));
    });

    // 입력 debounce
    $("cc-input").addEventListener("input", () => {
        clearTimeout(window.__deb);
        window.__deb = setTimeout(convert, 120);
    });

    // 매트릭스 버튼 토글
    document.querySelectorAll(".cc-matrix-row .cc-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
            const row = btn.closest(".cc-matrix-row");
            const who = row.dataset.who;
            const bit = btn.dataset.bit;

            state[who][bit] = !state[who][bit];
            btn.classList.toggle("active", state[who][bit]);

            syncRowValue(who);

            // 입력은 비우고 매트릭스가 정답이 되게
            $("cc-input").value = "";
            setMode("r2o"); // 클릭했으면 rwx->숫자 흐름으로 자연스럽게
            convert();
        });
    });

    // 특수 권한 토글
    document.querySelectorAll(".cc-special-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (!$("opt-special").checked) return;
            const k = btn.dataset.special;
            state.special[k] = !state.special[k];
            btn.classList.toggle("active", state.special[k]);
            syncSpecialValue();

            $("cc-input").value = "";
            setMode("r2o");
            convert();
        });
    });

    // 매트릭스 액션
    $("matrix-clear").addEventListener("click", clearMatrix);
    $("matrix-fill-755").addEventListener("click", () => {
        applyOctalToMatrix("755");
        $("cc-input").value = "";
        setMode("r2o");
        convert();
    });
    $("matrix-fill-644").addEventListener("click", () => {
        applyOctalToMatrix("644");
        $("cc-input").value = "";
        setMode("r2o");
        convert();
    });

    toggleSpecialUI();
    syncMatrixButtons();

    setTarget("file");
    setMode("o2r");
    convert();

    // FAQ
    if (typeof bindFaq === "function") bindFaq();
    else bindFaqLocal();
});
