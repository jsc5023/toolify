const $ = (id) => document.getElementById(id);

/* 화면 */
const lobbyEl = $("lobby");
const gameEl = $("game");

/* 로비 */
const segBtns = Array.from(document.querySelectorAll(".nb-seg-btn"));
const optDupEl = $("opt-dup");
const optTimerEl = $("opt-timer"); // 기본 OFF(HTML에서 unchecked)
const startBtn = $("start-btn");
const ruleBtn = $("rule-btn");

/* 모달 */
const ruleModal = $("rule-modal");
const ruleDim = $("rule-dim");
const ruleClose = $("rule-close");
const ruleOk = $("rule-ok");

/* 게임 */
const guessEl = $("guess");
const submitBtn = $("submit");
const newGameBtn = $("new-game");
const backLobbyBtn = $("back-lobby");

const triesEl = $("tries");
const timerEl = $("timer");
const historyEl = $("history");
const toastEl = $("toast");
const confettiEl = $("confetti");
const badgeEl = $("game-badge");
const bestEl = $("best");

/* 상태 */
let len = 3;          // ✅ 로비 기본 3자리(HTML is-active에 맞춤)
let secret = "";
let tries = 0;

let timerOn = true;  // ✅ 기본 ON
let startedAt = null;
let timerT = null;

let gameOver = false;

function pad2(n){ return String(n).padStart(2, "0"); }

function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 900);
}

/* ===== 최고기록(localStorage) =====
   - len/dup/timer 조합별로 저장
   - 기준: (시도 적은게 우선) -> (시간 짧은게 우선)
*/
function bestKey(){
    return `nb_best_v2_len${len}_dup${optDupEl.checked ? 1 : 0}_timer${timerOn ? 1 : 0}`;
}
function loadBest(){
    try{
        const raw = localStorage.getItem(bestKey());
        if (!raw) return null;
        return JSON.parse(raw);
    }catch{
        return null;
    }
}
function saveBest(best){
    localStorage.setItem(bestKey(), JSON.stringify(best));
}
function renderBest(){
    const b = loadBest();
    if (!b) {
        bestEl.textContent = "최고기록: -";
        return;
    }
    const timeTxt = (timerOn ? `${pad2(b.mm)}:${pad2(b.ss)}` : "타이머 OFF");
    bestEl.textContent = `최고기록: ${b.tries}회 · ${timeTxt}`;
}
function considerBest(){
    const sec = elapsedSec();
    const mm = Math.floor(sec/60);
    const ss = sec%60;

    const cur = { tries, sec, mm, ss };
    const prev = loadBest();

    const better =
        !prev ||
        (cur.tries < prev.tries) ||
        (cur.tries === prev.tries && cur.sec < prev.sec);

    if (better){
        saveBest(cur);
        renderBest();
        toast("🎉 최고기록 갱신!");
    }
}

/* ===== UI ===== */
function setDifficulty(newLen){
    len = newLen;
    segBtns.forEach(b => {
        const active = Number(b.dataset.len) === len;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
    });
}

function makeSecret(){
    const allowDup = optDupEl.checked;
    if (allowDup) {
        let s = "";
        for (let i=0; i<len; i++) s += String(Math.floor(Math.random()*10));
        return s;
    }
    const digits = [];
    while (digits.length < len) {
        const d = Math.floor(Math.random() * 10);
        if (!digits.includes(d)) digits.push(d);
    }
    return digits.join("");
}

/* ===== 타이머 ===== */
function startTimer(){
    if (!timerOn) {
        timerEl.textContent = "--:--";
        startedAt = null;
        return;
    }
    startedAt = Date.now();
    clearInterval(timerT);
    timerT = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        const mm = Math.floor(sec / 60);
        const ss = sec % 60;
        timerEl.textContent = `${pad2(mm)}:${pad2(ss)}`;
    }, 250);
}
function stopTimer(){
    clearInterval(timerT);
    timerT = null;
}
function elapsedSec(){
    if (!timerOn || !startedAt) return 0;
    return Math.floor((Date.now() - startedAt) / 1000);
}

/* ===== 화면 전환 ===== */
function goGame(){
    lobbyEl.classList.add("is-hidden");
    gameEl.classList.remove("is-hidden");
    requestAnimationFrame(() => guessEl.focus());
}
function goLobby(){
    gameEl.classList.add("is-hidden");
    lobbyEl.classList.remove("is-hidden");
}

/* ===== 게임 초기화 ===== */
function resetGameUI(){
    tries = 0;
    triesEl.textContent = "0";
    historyEl.innerHTML = "";

    guessEl.value = "";
    guessEl.maxLength = len;
    guessEl.placeholder = `${len}자리 숫자 입력 후 Enter`;

    badgeEl.textContent = `${len}자리`;

    gameOver = false;
    guessEl.disabled = false;
    submitBtn.disabled = false;

    renderBest();

    // ✅ 기록은 최신이 위(스크롤 0)
    historyEl.scrollTop = 0;
}

function newGame(){
    secret = makeSecret();
    resetGameUI();
    startTimer();
    toast("새 게임 시작!");
    // console.log("secret:", secret);
}

/* ===== 검증/판정 ===== */
function validateGuess(g){
    if (!/^\d+$/.test(g)) return "숫자만 입력해줘!";
    if (g.length !== len) return `${len}자리로 입력해줘!`;
    if (!optDupEl.checked) {
        const set = new Set(g.split(""));
        if (set.size !== g.length) return "중복 없는 숫자로 입력해줘!";
    }
    return null;
}

function judge(g){
    let s = 0, b = 0;
    for (let i=0; i<len; i++){
        if (g[i] === secret[i]) s++;
        else if (secret.includes(g[i])) b++;
    }
    return { s, b };
}

function rowEl(g, s, b, idx){
    const cls = (s === len) ? "ok" : (s > 0 || b > 0) ? "mid" : "bad";
    const el = document.createElement("div");
    el.className = "nb-row-item";
    el.innerHTML = `
    <div class="nb-left">
      <span class="nb-g">${g}</span>
      <span class="nb-r ${cls}">${s}S ${b}B</span>
    </div>
    <div class="nb-idx">#${idx}</div>
  `;
    if (s === 0 && b === 0) el.classList.add("shake"); // ✅ 0S0B만 흔들림
    return el;
}

/* ===== 컨페티 ===== */
function confetti(){
    confettiEl.innerHTML = "";
    const colors = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"];
    const count = 18;
    for (let i=0; i<count; i++){
        const p = document.createElement("div");
        p.className = "p";
        p.style.left = `${10 + Math.random()*80}%`;
        p.style.animationDelay = `${Math.random()*120}ms`;
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        p.style.transform = `translateY(0) rotate(${Math.random()*180}deg)`;
        confettiEl.appendChild(p);
    }
    setTimeout(() => (confettiEl.innerHTML = ""), 1100);
}

function onWin(){
    stopTimer();
    gameOver = true;

    guessEl.disabled = true;
    submitBtn.disabled = true;
    guessEl.placeholder = "정답! 새 게임을 눌러주세요.";

    confetti();
    considerBest();

    const sec = elapsedSec();
    const mm = Math.floor(sec/60);
    const ss = sec%60;
    const timeTxt = timerOn ? `${pad2(mm)}:${pad2(ss)}` : "타이머 OFF";
    toast(`정답! ${tries}회 · ${timeTxt}`);
}

/* ===== 제출 ===== */
function submit(){
    if (gameOver) return toast("게임이 끝났어요! 새 게임을 눌러주세요.");

    const g = (guessEl.value || "").trim();
    const err = validateGuess(g);
    if (err) { toast(err); return; }

    tries++;
    triesEl.textContent = String(tries);

    const { s, b } = judge(g);

    // ✅ 최신이 위로 쌓이게
    const item = rowEl(g, s, b, tries);
    historyEl.prepend(item);
    historyEl.scrollTop = 0;

    guessEl.value = "";

    if (s === len) onWin();
}

/* ===== 규칙 모달 ===== */
function openRule(){ ruleModal.classList.remove("is-hidden"); }
function closeRule(){ ruleModal.classList.add("is-hidden"); }

/* ===== 이벤트 ===== */
segBtns.forEach(btn => {
    btn.addEventListener("click", () => setDifficulty(Number(btn.dataset.len)));
});

optTimerEl.addEventListener("change", () => {
    timerOn = optTimerEl.checked;
    if (!timerOn) stopTimer();
    renderBest(); // 키가 바뀜
});

startBtn.addEventListener("click", () => {
    timerOn = optTimerEl.checked;
    goGame();
    newGame();
});

submitBtn.addEventListener("click", submit);

guessEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        submit();
    }
});

newGameBtn.addEventListener("click", newGame);

backLobbyBtn.addEventListener("click", () => {
    stopTimer();
    goLobby();
});

/* 규칙 버튼(로비) */
ruleBtn.addEventListener("click", openRule);
ruleDim.addEventListener("click", closeRule);
ruleClose.addEventListener("click", closeRule);
ruleOk.addEventListener("click", closeRule);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ruleModal.classList.contains("is-hidden")) closeRule();
});

/* 초기값 */
setDifficulty(3);
timerOn = true;
renderBest();
timerEl.textContent = "--:--";
