const $ = (id) => document.getElementById(id);

const state = {
    typeChar: "-",     // -, d, l
    u: { r: true,  w: true,  x: true  }, // 7
    g: { r: true,  w: false, x: true  }, // 5
    o: { r: true,  w: false, x: true  }, // 5
    special: { suid: false, sgid: false, sticky: false }
};

function showError(msg) {
    $("cc-error").textContent = msg || "";
}

function toast(msg) {
    const el = $("cc-toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(window.__cc_toast);
    window.__cc_toast = setTimeout(() => el.classList.add("hidden"), 1200);
}

function copyText(t) {
    if (!t) return;
    navigator.clipboard?.writeText(t);
    toast("복사됨");
}

/* ---------- 계산 ---------- */

function sumTri(who) {
    const b = state[who];
    return (b.r ? 4 : 0) + (b.w ? 2 : 0) + (b.x ? 1 : 0);
}

function specialDigit() {
    return (state.special.suid ? 4 : 0)
        + (state.special.sgid ? 2 : 0)
        + (state.special.sticky ? 1 : 0);
}

// 표시용 숫자 권한: 특수권한 있으면 4자리, 없으면 3자리
function toPermNumber() {
    const s = specialDigit();
    const u = sumTri("u");
    const g = sumTri("g");
    const o = sumTri("o");
    return s > 0 ? `${s}${u}${g}${o}` : `${u}${g}${o}`;
}

function toSymbolic() {
    const u = triToRWX("u", "suid");
    const g = triToRWX("g", "sgid");
    const o = triToRWX("o", "sticky");
    return `${state.typeChar}${u}${g}${o}`;
}

function triToRWX(who, specialKey) {
    const b = state[who];
    const r = b.r ? "r" : "-";
    const w = b.w ? "w" : "-";

    // 실행 표시: 특수권한 + x 조합에 따라 s/S, t/T
    let x = b.x ? "x" : "-";
    if (specialKey === "suid" && state.special.suid) {
        x = b.x ? "s" : "S";
    }
    if (specialKey === "sgid" && state.special.sgid) {
        x = b.x ? "s" : "S";
    }
    if (specialKey === "sticky" && state.special.sticky) {
        x = b.x ? "t" : "T";
    }
    return `${r}${w}${x}`;
}

function render() {
    $("cc-u-val").textContent = String(sumTri("u"));
    $("cc-g-val").textContent = String(sumTri("g"));
    $("cc-o-val").textContent = String(sumTri("o"));
    $("cc-s-val").textContent = String(specialDigit());

    $("cc-octal").textContent = toPermNumber();
    $("cc-symbolic").textContent = toSymbolic();
    $("cc-cmd").textContent = `chmod ${toPermNumber()} 파일명`;

    // 토글 UI 반영
    document.querySelectorAll(".cc-tg[data-who]").forEach((btn) => {
        const who = btn.dataset.who;
        const bit = btn.dataset.bit;
        btn.classList.toggle("on", !!state[who][bit]);
    });

    document.querySelectorAll(".cc-tg[data-special]").forEach((btn) => {
        const k = btn.dataset.special;
        btn.classList.toggle("on", !!state.special[k]);
    });

    // 타입 탭 반영
    document.querySelectorAll(".cc-type-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.type === state.typeChar);
    });
}

/* ---------- 파싱 ---------- */

function applyInput(raw) {
    const s = (raw || "").trim();
    if (!s) {
        showError("");
        render();
        return;
    }

    // 1) 숫자 권한: 3~4자리 (앞 0 허용)
    const num = parseNumeric(s);
    if (num) {
        applyFromDigits(num);
        showError("");
        render();
        return;
    }

    // 2) 문자 권한: 9자리 또는 10자리(-/d/l 포함)
    const sym = parseSymbolic(s);
    if (sym) {
        applyFromSymbolic(sym);
        showError("");
        render();
        return;
    }

    // 3) u=...,g=...,o=... 형태
    const chmod = parseChmodClause(s);
    if (chmod) {
        applyFromChmodClause(chmod);
        showError("");
        render();
        return;
    }

    showError("입력 형식을 인식할 수 없습니다. 예: 755, 4755, -rwxr-xr-x, rwxr-xr-x, u=rwx,g=rx,o=rx");
}

function parseNumeric(s) {
    // 0644, 755, 1777, 4755 등
    const t = s.replace(/\s+/g, "");
    if (!/^\d{3,4}$/.test(t) && !/^\d{1,4}$/.test(t)) return null;

    // 의미있는 케이스만: 3 or 4자리 (단 1~2자리 입력은 혼동 가능하니 제외)
    if (t.length < 3 || t.length > 4) return null;

    const n = t.split("").map((c) => parseInt(c, 10));
    if (n.some((x) => Number.isNaN(x))) return null;

    // 각 자릿수 0~7 범위
    if (n.some((x) => x < 0 || x > 7)) return null;

    // 3자리면 [u,g,o], 4자리면 [s,u,g,o]
    return t;
}

function applyFromDigits(digits) {
    const t = digits;
    let s = 0, u = 0, g = 0, o = 0;

    if (t.length === 3) {
        u = +t[0]; g = +t[1]; o = +t[2];
        s = 0;
    } else {
        s = +t[0]; u = +t[1]; g = +t[2]; o = +t[3];
    }

    setTri("u", u);
    setTri("g", g);
    setTri("o", o);

    state.special.suid = (s & 4) === 4;
    state.special.sgid = (s & 2) === 2;
    state.special.sticky = (s & 1) === 1;
}

function setTri(who, val) {
    state[who].r = (val & 4) === 4;
    state[who].w = (val & 2) === 2;
    state[who].x = (val & 1) === 1;
}

function parseSymbolic(s) {
    let raw = (s || "").trim().replace(/\s+/g, "");
    if (!raw) return null;

    let type = null;

    if (raw.length === 9) {
        // 타입 없이 9자리면, 현재 탭 타입 유지하는 게 UX상 더 좋음
        type = state.typeChar;
        raw = type + raw;
    } else if (raw.length === 10) {
        type = raw[0];
    } else {
        return null;
    }

    if (!["-", "d", "l"].includes(type)) return null;

    const perm = raw.slice(1);
    // s/S, t/T 포함
    if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(perm)) return null;

    return raw; // 10자리 확정
}

function applyFromSymbolic(sym10) {
    const type = sym10[0];
    state.typeChar = type;

    const perm = sym10.slice(1);

    // u
    state.u.r = perm[0] === "r";
    state.u.w = perm[1] === "w";
    state.u.x = ["x", "s"].includes(perm[2]);
    state.special.suid = ["s", "S"].includes(perm[2]);

    // g
    state.g.r = perm[3] === "r";
    state.g.w = perm[4] === "w";
    state.g.x = ["x", "s"].includes(perm[5]);
    state.special.sgid = ["s", "S"].includes(perm[5]);

    // o
    state.o.r = perm[6] === "r";
    state.o.w = perm[7] === "w";
    state.o.x = ["x", "t"].includes(perm[8]);
    state.special.sticky = ["t", "T"].includes(perm[8]);
}

function parseChmodClause(s) {
    // u=rwx,g=rx,o=rx / u+rw,g-w,o=r 같은 건 범위 커지니
    // 여기서는 "u=...,g=...,o=..." 형태만 지원 (명확한 UX)
    const raw = s.replace(/\s+/g, "");
    if (!raw.includes("=")) return null;

    const parts = raw.split(",").filter(Boolean);
    let u = null, g = null, o = null;

    for (const p of parts) {
        const m = p.match(/^([ugo])=([rwx]+)$/);
        if (!m) return null;
        const who = m[1];
        const val = m[2];
        if (!/^[rwx]+$/.test(val)) return null;

        const tri = {
            r: val.includes("r"),
            w: val.includes("w"),
            x: val.includes("x")
        };

        if (who === "u") u = tri;
        if (who === "g") g = tri;
        if (who === "o") o = tri;
    }

    // 최소 하나라도 있어야 의미
    if (!u && !g && !o) return null;
    return { u, g, o };
}

function applyFromChmodClause(obj) {
    if (obj.u) state.u = { ...state.u, ...obj.u };
    if (obj.g) state.g = { ...state.g, ...obj.g };
    if (obj.o) state.o = { ...state.o, ...obj.o };

    // clause에는 특수권한 정보가 없으니 유지(사용자가 이미 켜둔걸 굳이 끄지 않음)
}

/* ---------- 이벤트 ---------- */

document.addEventListener("DOMContentLoaded", () => {
    // 타입 탭
    document.querySelectorAll(".cc-type-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.typeChar = btn.dataset.type;
            showError("");
            render();
        });
    });

    // 권한 토글
    document.querySelectorAll(".cc-tg[data-who]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const who = btn.dataset.who;
            const bit = btn.dataset.bit;
            state[who][bit] = !state[who][bit];
            showError("");
            render();
        });
    });

    // 특수권한 토글
    document.querySelectorAll(".cc-tg[data-special]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const k = btn.dataset.special;
            state.special[k] = !state.special[k];
            showError("");
            render();
        });
    });

    // 예시칩
    document.querySelectorAll(".cc-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const v = chip.dataset.ex;
            $("cc-raw").value = v;
            applyInput(v);
        });
    });

    // 적용 버튼
    $("cc-apply").addEventListener("click", () => applyInput($("cc-raw").value));

    // 입력 시 디바운스 자동 적용
    $("cc-raw").addEventListener("input", () => {
        clearTimeout(window.__cc_deb);
        window.__cc_deb = setTimeout(() => applyInput($("cc-raw").value), 180);
    });

    // 복사
    document.querySelectorAll(".cc-copy").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.copy;
            const t = $(id).textContent.trim();
            copyText(t);
        });
    });

    // 초기 렌더
    render();
});
