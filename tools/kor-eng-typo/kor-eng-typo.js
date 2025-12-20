/**
 * Toolify 한/영타 변환기 (2벌식) - 개선판
 * - 영문키 -> 한글 조합
 * - 한글 -> 영문키
 * - 자동 감지
 * - 숫자/특수문자/공백 유지
 *
 * FIX:
 * 1) 모음 단독 입력 시 'ㅇ' 자동 삽입 제거 (야야야 문제 해결)
 * 2) 대문자 구간 smart 처리 개선: 의미 있는 Shift 키만 유지하고 나머지만 소문자화 (TH -> 쏘 유지)
 */

// 대문자(Shift) 처리 정책
// - "smart": A~Z 중 '의미 있는 Shift'만 유지, 나머지는 소문자로 내려서 실수 보정 (추천)
// - "ignore": 모든 A~Z를 소문자로 (Shift 완전 무시)
// - "strict": 대문자를 그대로 사용 (R=ㄲ, O=ㅒ, P=ㅖ 등)
const SHIFT_POLICY = "smart";

/* =========================
 * 1) 2벌식 키 ↔ 자모 매핑
 * ========================= */

const KEY_TO_JAMO = new Map([
    // 자음
    ["r", "ㄱ"], ["R", "ㄲ"],
    ["s", "ㄴ"],
    ["e", "ㄷ"], ["E", "ㄸ"],
    ["f", "ㄹ"],
    ["a", "ㅁ"],
    ["q", "ㅂ"], ["Q", "ㅃ"],
    ["t", "ㅅ"], ["T", "ㅆ"],
    ["d", "ㅇ"],
    ["w", "ㅈ"], ["W", "ㅉ"],
    ["c", "ㅊ"],
    ["z", "ㅋ"],
    ["x", "ㅌ"],
    ["v", "ㅍ"],
    ["g", "ㅎ"],

    // 모음
    ["k", "ㅏ"],
    ["o", "ㅐ"], ["O", "ㅒ"],
    ["i", "ㅑ"],
    ["j", "ㅓ"],
    ["p", "ㅔ"], ["P", "ㅖ"],
    ["u", "ㅕ"],
    ["h", "ㅗ"],
    ["y", "ㅛ"],
    ["n", "ㅜ"],
    ["b", "ㅠ"],
    ["m", "ㅡ"],
    ["l", "ㅣ"],
]);

// Shift로 의미가 있는 대문자(=실제로 2벌식에서 다른 자모가 나오는 것들)
const SHIFT_MEANINGFUL = new Set(["R", "E", "Q", "T", "W", "O", "P"]);

const JAMO_TO_KEYSEQ = new Map([
    // 자음
    ["ㄱ", "r"], ["ㄲ", "R"],
    ["ㄴ", "s"],
    ["ㄷ", "e"], ["ㄸ", "E"],
    ["ㄹ", "f"],
    ["ㅁ", "a"],
    ["ㅂ", "q"], ["ㅃ", "Q"],
    ["ㅅ", "t"], ["ㅆ", "T"],
    ["ㅇ", "d"],
    ["ㅈ", "w"], ["ㅉ", "W"],
    ["ㅊ", "c"],
    ["ㅋ", "z"],
    ["ㅌ", "x"],
    ["ㅍ", "v"],
    ["ㅎ", "g"],

    // 모음
    ["ㅏ", "k"],
    ["ㅐ", "o"], ["ㅒ", "O"],
    ["ㅑ", "i"],
    ["ㅓ", "j"],
    ["ㅔ", "p"], ["ㅖ", "P"],
    ["ㅕ", "u"],
    ["ㅗ", "h"],
    ["ㅛ", "y"],
    ["ㅜ", "n"],
    ["ㅠ", "b"],
    ["ㅡ", "m"],
    ["ㅣ", "l"],

    // 복합 모음
    ["ㅘ", "hk"],
    ["ㅙ", "ho"],
    ["ㅚ", "hl"],
    ["ㅝ", "nj"],
    ["ㅞ", "np"],
    ["ㅟ", "nl"],
    ["ㅢ", "ml"],

    // 겹받침
    ["ㄳ", "rt"],
    ["ㄵ", "sw"],
    ["ㄶ", "sg"],
    ["ㄺ", "fr"],
    ["ㄻ", "fa"],
    ["ㄼ", "fq"],
    ["ㄽ", "ft"],
    ["ㄾ", "fx"],
    ["ㄿ", "fv"],
    ["ㅀ", "fg"],
    ["ㅄ", "qt"],
]);

/* =========================
 * 2) 한글 조합 테이블
 * ========================= */

const L_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const V_LIST = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const T_LIST = ["", "ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

const L_INDEX = new Map(L_LIST.map((c, i) => [c, i]));
const V_INDEX = new Map(V_LIST.map((c, i) => [c, i]));
const T_INDEX = new Map(T_LIST.map((c, i) => [c, i]));

const VOWEL_SET = new Set(V_LIST);
const VALID_FINAL_SET = new Set(T_LIST.filter(Boolean));

const VOWEL_COMBINE = new Map([
    ["ㅗㅏ", "ㅘ"],
    ["ㅗㅐ", "ㅙ"],
    ["ㅗㅣ", "ㅚ"],
    ["ㅜㅓ", "ㅝ"],
    ["ㅜㅔ", "ㅞ"],
    ["ㅜㅣ", "ㅟ"],
    ["ㅡㅣ", "ㅢ"],

    // 실수 입력 보정
    ["ㅏㅣ", "ㅐ"],
    ["ㅓㅣ", "ㅔ"],
    ["ㅑㅣ", "ㅒ"],
    ["ㅕㅣ", "ㅖ"],

    ["ㅘㅣ", "ㅙ"],
    ["ㅝㅣ", "ㅞ"],
]);

const DOUBLE_INITIAL = new Map([
    ["ㄱㄱ", "ㄲ"],
    ["ㄷㄷ", "ㄸ"],
    ["ㅂㅂ", "ㅃ"],
    ["ㅅㅅ", "ㅆ"],
    ["ㅈㅈ", "ㅉ"],
]);

const FINAL_COMBINE = new Map([
    ["ㄱㅅ", "ㄳ"],
    ["ㄴㅈ", "ㄵ"],
    ["ㄴㅎ", "ㄶ"],
    ["ㄹㄱ", "ㄺ"],
    ["ㄹㅁ", "ㄻ"],
    ["ㄹㅂ", "ㄼ"],
    ["ㄹㅅ", "ㄽ"],
    ["ㄹㅌ", "ㄾ"],
    ["ㄹㅍ", "ㄿ"],
    ["ㄹㅎ", "ㅀ"],
    ["ㅂㅅ", "ㅄ"],
]);

const FINAL_SPLIT = new Map([
    ["ㄳ", ["ㄱ", "ㅅ"]],
    ["ㄵ", ["ㄴ", "ㅈ"]],
    ["ㄶ", ["ㄴ", "ㅎ"]],
    ["ㄺ", ["ㄹ", "ㄱ"]],
    ["ㄻ", ["ㄹ", "ㅁ"]],
    ["ㄼ", ["ㄹ", "ㅂ"]],
    ["ㄽ", ["ㄹ", "ㅅ"]],
    ["ㄾ", ["ㄹ", "ㅌ"]],
    ["ㄿ", ["ㄹ", "ㅍ"]],
    ["ㅀ", ["ㄹ", "ㅎ"]],
    ["ㅄ", ["ㅂ", "ㅅ"]],
]);

/* =========================
 * 3) 유틸
 * ========================= */

function isHangulSyllable(ch) {
    const code = ch.codePointAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
}
function isHangulJamoCompat(ch) {
    const code = ch.codePointAt(0);
    return code >= 0x3130 && code <= 0x318f;
}
function isLatinLetter(ch) {
    const code = ch.codePointAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}
function isVowelJamo(j) {
    return VOWEL_SET.has(j);
}
function composeSyllable(L, V, T) {
    const li = L_INDEX.get(L);
    const vi = V_INDEX.get(V);
    const ti = T ? (T_INDEX.get(T) ?? 0) : 0;
    if (li == null || vi == null || ti == null) return `${L ?? ""}${V ?? ""}${T ?? ""}`;
    const code = 0xac00 + (li * 21 + vi) * 28 + ti;
    return String.fromCharCode(code);
}

/**
 * FIX #2: smart 대문자 처리 개선
 */
function normalizeShift(text) {
    if (SHIFT_POLICY === "strict") return text;
    if (SHIFT_POLICY === "ignore") return text.replace(/[A-Z]/g, (c) => c.toLowerCase());

    let out = "";
    for (const ch of text) {
        if (ch >= "A" && ch <= "Z") {
            out += SHIFT_MEANINGFUL.has(ch) ? ch : ch.toLowerCase();
        } else {
            out += ch;
        }
    }
    return out;
}

/* =========================
 * 4) 영타 -> 한글
 * ========================= */

function tokenizeEnglish(text) {
    const normalized = normalizeShift(text);
    const tokens = [];
    for (const ch of normalized) {
        if (KEY_TO_JAMO.has(ch)) {
            const jamo = KEY_TO_JAMO.get(ch);
            tokens.push({ type: isVowelJamo(jamo) ? "V" : "C", value: jamo });
        } else {
            tokens.push({ type: "RAW", value: ch });
        }
    }
    return tokens;
}

function englishToKorean(text) {
    const tokens = tokenizeEnglish(text);
    let out = "";

    // 상태: (초성 L?) + (중성 V?) + (종성 T?)
    // FIX #1: L이 없고 V만 있는 상태는 "모음 단독 입력" 상태 (ㅇ 삽입 X)
    let L = null;
    let V = null;
    let T = null;

    const flush = () => {
        if (!L && !V && !T) return;

        if (!V) {
            if (L) out += L;
            else if (T) out += T;
        } else {
            if (!L) out += V;              // 모음 단독
            else out += composeSyllable(L, V, T);
        }
        L = null; V = null; T = null;
    };

    const commitNoFinalCarry = (carry) => {
        out += composeSyllable(L, V, null);
        L = carry;
        V = null;
        T = null;
    };

    for (let i = 0; i < tokens.length; i++) {
        const cur = tokens[i];

        if (cur.type === "RAW") {
            flush();
            out += cur.value;
            continue;
        }

        const j = cur.value;

        if (cur.type === "C") {
            // 자음
            if (V && !L) {
                flush();
                L = j;
                continue;
            }

            if (!V) {
                if (!L) {
                    L = j;
                    continue;
                }
                const merged = DOUBLE_INITIAL.get(`${L}${j}`);
                if (merged) {
                    L = merged;
                    continue;
                }
                out += L;
                L = j;
                continue;
            }

            // (L,V) 상태: 종성 후보
            if (!VALID_FINAL_SET.has(j)) {
                flush();
                L = j;
                continue;
            }

            if (!T) {
                T = j;
                continue;
            }

            if (FINAL_SPLIT.has(T)) {
                flush();
                L = j;
                continue;
            }

            const comb = FINAL_COMBINE.get(`${T}${j}`);
            if (comb) {
                T = comb;
                continue;
            }

            flush();
            L = j;
            continue;
        }

        // 모음
        if (!V) {
            V = j;  // (L 있든 없든) 일단 V 세팅. L 없으면 모음 단독
            continue;
        }

        if (!T) {
            const comb = VOWEL_COMBINE.get(`${V}${j}`);
            if (comb) {
                V = comb;
                continue;
            }
            flush();
            V = j;   // 다음 모음도 단독으로 시작 가능
            continue;
        }

        // (L,V,T) 상태에서 모음이 오면 받침 분리
        if (FINAL_SPLIT.has(T)) {
            const [t1, t2] = FINAL_SPLIT.get(T);
            out += composeSyllable(L, V, t1);
            L = t2;
            V = j;
            T = null;
            continue;
        }

        // 단일 받침이면 다음 초성으로 이동
        const carry = T;
        commitNoFinalCarry(carry);
        V = j;
    }

    flush();
    return out;
}

/* =========================
 * 5) 한글 -> 영타
 * ========================= */

function decomposeSyllable(ch) {
    if (!isHangulSyllable(ch)) return null;
    const code = ch.codePointAt(0) - 0xac00;
    const li = Math.floor(code / 588);
    const vi = Math.floor((code % 588) / 28);
    const ti = code % 28;
    return { L: L_LIST[li], V: V_LIST[vi], T: T_LIST[ti] || "" };
}

function koreanToEnglish(text) {
    let out = "";
    for (const ch of text) {
        const d = decomposeSyllable(ch);
        if (!d) {
            if (isHangulJamoCompat(ch) && JAMO_TO_KEYSEQ.has(ch)) out += JAMO_TO_KEYSEQ.get(ch);
            else out += ch;
            continue;
        }
        out += (JAMO_TO_KEYSEQ.get(d.L) ?? "");
        out += (JAMO_TO_KEYSEQ.get(d.V) ?? "");
        if (d.T) out += (JAMO_TO_KEYSEQ.get(d.T) ?? "");
    }
    return out;
}

/* =========================
 * 6) 자동 감지
 * ========================= */

function autoConvert(text) {
    let latin = 0;
    let hangul = 0;

    for (const ch of text) {
        if (isLatinLetter(ch)) latin++;
        else if (isHangulSyllable(ch) || isHangulJamoCompat(ch)) hangul++;
    }

    // tie(=같을 때)는 영타->한글로 두는 게 보통 체감이 좋음
    return (hangul > latin) ? koreanToEnglish(text) : englishToKorean(text);
}

/* =========================
 * 7) DOM 연결 (수동 모드 지원)
 * ========================= */

(function bindToolifyHangulConverter() {
    const inputEl = document.getElementById("input-text");
    const outputEl = document.getElementById("output-text");
    const copyBtn = document.getElementById("copy-btn");
    const clearBtn = document.getElementById("clear-btn");
    const hintEl = document.getElementById("detect-hint");
    const modeEls = Array.from(document.querySelectorAll('input[name="mode"]'));
    const toastEl = document.getElementById("copy-toast");

    if (!inputEl || !outputEl) return;

    function detectDirectionText(src) {
        let latin = 0, hangul = 0;
        for (const ch of src) {
            if (isLatinLetter(ch)) latin++;
            else if (isHangulSyllable(ch) || isHangulJamoCompat(ch)) hangul++;
        }
        // autoConvert와 같은 기준
        return (hangul > latin) ? "한→영" : "영→한";
    }

    function convertByMode(src, mode) {
        if (!src) return { out: "", hint: mode === "auto" ? "감지: 자동" : "" };

        if (mode === "en2ko") return { out: englishToKorean(src), hint: "모드: 영→한" };
        if (mode === "ko2en") return { out: koreanToEnglish(src), hint: "모드: 한→영" };

        // auto
        const dir = detectDirectionText(src);
        return { out: autoConvert(src), hint: `감지: ${dir}` };
    }

    function getSelectedMode() {
        const checked = modeEls.find((el) => el.checked);
        return checked ? checked.value : "auto";
    }

    const render = () => {
        const src = inputEl.value ?? "";
        const mode = getSelectedMode();
        const { out, hint } = convertByMode(src, mode);

        outputEl.value = out;
        if (hintEl) hintEl.textContent = hint || (mode === "auto" ? "감지: 자동" : "");
    };

    inputEl.addEventListener("input", render);
    modeEls.forEach((el) => el.addEventListener("change", render));

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            inputEl.value = "";
            render();
            inputEl.focus();
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            const text = outputEl.value || "";
            try {
                await navigator.clipboard.writeText(text);
                if (toastEl) {
                    toastEl.textContent = "복사되었습니다!";
                    setTimeout(() => (toastEl.textContent = ""), 1200);
                }
            } catch {
                outputEl.focus();
                outputEl.select();
                document.execCommand("copy");
                if (toastEl) {
                    toastEl.textContent = "복사되었습니다!";
                    setTimeout(() => (toastEl.textContent = ""), 1200);
                }
            }
        });
    }

    render();
})();
