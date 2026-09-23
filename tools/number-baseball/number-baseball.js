const $ = (id) => document.getElementById(id);

const lobbyEl = $("lobby");
const gameEl = $("game");
const segBtns = Array.from(document.querySelectorAll(".nb-seg-btn"));
const optDupEl = $("opt-dup");
const optTimerEl = $("opt-timer");
const startBtn = $("start-btn");
const ruleBtn = $("rule-btn");
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
const ruleModal = $("rule-modal");
const ruleDim = $("rule-dim");
const ruleClose = $("rule-close");
const ruleOk = $("rule-ok");

let len = 3;
let secret = "";
let tries = 0;
let timerOn = true;
let startedAt = null;
let timerT = null;
let gameOver = false;

function pad2(n) {
    return String(n).padStart(2, "0");
}

function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.setTimeout(() => toastEl.classList.remove("show"), 1500);
}

function randomDigit() {
    if (window.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0] % 10;
    }
    return Math.floor(Math.random() * 10);
}

function makeSecret() {
    if (optDupEl.checked) {
        return Array.from({ length: len }, () => String(randomDigit())).join("");
    }

    const digits = [];
    while (digits.length < len) {
        const digit = String(randomDigit());
        if (!digits.includes(digit)) digits.push(digit);
    }
    return digits.join("");
}

function bestKey() {
    return `nb_best_v3_len${len}_dup${optDupEl.checked ? 1 : 0}_timer${timerOn ? 1 : 0}`;
}

function loadBest() {
    try {
        const raw = localStorage.getItem(bestKey());
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function renderBest() {
    const best = loadBest();
    if (!best) {
        bestEl.textContent = "최고기록: -";
        return;
    }
    bestEl.textContent = timerOn ? `최고기록: ${best.tries}회 · ${pad2(best.mm)}:${pad2(best.ss)}` : `최고기록: ${best.tries}회`;
}

function elapsedSec() {
    return timerOn && startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
}

function considerBest() {
    const sec = elapsedSec();
    const current = { tries, sec, mm: Math.floor(sec / 60), ss: sec % 60 };
    const previous = loadBest();
    const isBetter = !previous || current.tries < previous.tries || (current.tries === previous.tries && current.sec < previous.sec);

    if (isBetter) {
        try {
            localStorage.setItem(bestKey(), JSON.stringify(current));
            renderBest();
            toast("🎉 최고기록을 갱신했어요!");
        } catch {
            toast("정답! 이 브라우저에서는 기록을 저장할 수 없어요.");
        }
    }
}

function setDifficulty(newLength) {
    len = newLength;
    segBtns.forEach((button) => {
        const isActive = Number(button.dataset.len) === len;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
}

function startTimer() {
    window.clearInterval(timerT);
    if (!timerOn) {
        timerEl.textContent = "--:--";
        startedAt = null;
        return;
    }

    startedAt = Date.now();
    timerEl.textContent = "00:00";
    timerT = window.setInterval(() => {
        const seconds = elapsedSec();
        timerEl.textContent = `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;
    }, 250);
}

function stopTimer() {
    window.clearInterval(timerT);
    timerT = null;
}

function resetGameUI() {
    tries = 0;
    gameOver = false;
    triesEl.textContent = "0";
    historyEl.innerHTML = '<p class="nb-empty">아직 시도한 숫자가 없어요.</p>';
    guessEl.value = "";
    guessEl.maxLength = len;
    guessEl.placeholder = `${len}자리 숫자`;
    guessEl.disabled = false;
    submitBtn.disabled = false;
    badgeEl.textContent = `${len}자리`;
    renderBest();
}

function newGame() {
    timerOn = optTimerEl.checked;
    secret = makeSecret();
    resetGameUI();
    startTimer();
    guessEl.focus();
}

function validateGuess(guess) {
    if (!/^\d+$/.test(guess)) return "숫자만 입력해 주세요.";
    if (guess.length !== len) return `${len}자리로 입력해 주세요.`;
    if (!optDupEl.checked && new Set(guess).size !== guess.length) return "중복 없는 숫자로 입력해 주세요.";
    return null;
}

function judge(guess) {
    let strikes = 0;
    const secretRest = [];
    const guessRest = [];

    for (let index = 0; index < len; index += 1) {
        if (guess[index] === secret[index]) strikes += 1;
        else {
            secretRest.push(secret[index]);
            guessRest.push(guess[index]);
        }
    }

    // 중복 허용 모드에서도 남은 숫자의 실제 교집합만 볼로 계산합니다.
    const remaining = new Map();
    secretRest.forEach((digit) => remaining.set(digit, (remaining.get(digit) || 0) + 1));
    let balls = 0;
    guessRest.forEach((digit) => {
        const count = remaining.get(digit) || 0;
        if (count > 0) {
            balls += 1;
            remaining.set(digit, count - 1);
        }
    });

    return { strikes, balls };
}

function addHistoryRow(guess, strikes, balls) {
    historyEl.querySelector(".nb-empty")?.remove();
    const resultClass = strikes === len ? "ok" : strikes || balls ? "mid" : "bad";
    const row = document.createElement("div");
    row.className = "nb-row-item";
    row.innerHTML = `
        <div class="nb-left"><span class="nb-g">${guess}</span><span class="nb-r ${resultClass}">${strikes}S ${balls}B</span></div>
        <span class="nb-idx">#${tries}</span>`;
    historyEl.prepend(row);
}

function confetti() {
    confettiEl.innerHTML = "";
    const colors = ["#2865d9", "#e74c3c", "#f0af18", "#21a56c", "#8d62d8"];
    for (let index = 0; index < 20; index += 1) {
        const piece = document.createElement("span");
        piece.className = "p";
        piece.style.left = `${8 + randomDigit() * 9}%`;
        piece.style.backgroundColor = colors[randomDigit() % colors.length];
        piece.style.animationDelay = `${randomDigit() * 30}ms`;
        confettiEl.appendChild(piece);
    }
    window.setTimeout(() => { confettiEl.innerHTML = ""; }, 1100);
}

function win() {
    stopTimer();
    gameOver = true;
    guessEl.disabled = true;
    submitBtn.disabled = true;
    const seconds = elapsedSec();
    confetti();
    considerBest();
    const time = timerOn ? ` · ${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}` : "";
    toast(`정답! ${tries}회${time}`);
}

function submit() {
    if (gameOver) return;
    const guess = guessEl.value.trim();
    const error = validateGuess(guess);
    if (error) {
        toast(error);
        return;
    }

    tries += 1;
    triesEl.textContent = String(tries);
    const { strikes, balls } = judge(guess);
    addHistoryRow(guess, strikes, balls);
    guessEl.value = "";
    if (strikes === len) win();
}

function showGame() {
    lobbyEl.classList.add("is-hidden");
    gameEl.classList.remove("is-hidden");
    newGame();
}

function showLobby() {
    stopTimer();
    gameEl.classList.add("is-hidden");
    lobbyEl.classList.remove("is-hidden");
}

function openRules() {
    ruleModal.classList.remove("is-hidden");
    ruleClose.focus();
}

function closeRules() {
    ruleModal.classList.add("is-hidden");
    ruleBtn.focus();
}

segBtns.forEach((button) => button.addEventListener("click", () => setDifficulty(Number(button.dataset.len))));
startBtn.addEventListener("click", showGame);
submitBtn.addEventListener("click", submit);
newGameBtn.addEventListener("click", newGame);
backLobbyBtn.addEventListener("click", showLobby);
guessEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        submit();
    }
});
ruleBtn.addEventListener("click", openRules);
ruleDim.addEventListener("click", closeRules);
ruleClose.addEventListener("click", closeRules);
ruleOk.addEventListener("click", closeRules);
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ruleModal.classList.contains("is-hidden")) closeRules();
});
window.addEventListener("beforeunload", stopTimer);

setDifficulty(3);
renderBest();
