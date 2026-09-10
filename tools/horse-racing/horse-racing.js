/* =========================================================
   도트 경마 게임 (가상코인 베팅 + 픽셀 캔버스 레이스)
   - 브라우저 전용 오락 게임. 실제 도박/결제와 무관.
   ========================================================= */
(function horseRacingInit() {
    "use strict";

    const canvas = document.getElementById("track");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // ---- 상수 ----
    let W = canvas.width;          // 480
    let H = canvas.height;         // 240
    let HORSES = 6;
    const RACE_LEN = 1000;           // 결승선까지 거리(가상 m)
    const PPM = 4;                   // 화면 픽셀 / m (카메라)
    const TRACK_TOP = 100;
    const LANE_H = 66;
    const START_BAL = 1000;
    const TAKEOUT = 0.8;             // 배당 공제 계수

    // 레이스 물리 상수 (라이브 / 몬테카를로 공용)
    const SPEED0 = 40;              // 기준 속도
    const BAND_K = 0.09, BAND_MAX = 14;  // 러버밴딩(접전 유지)
    const NOISE = 16;              // 페이스 난조 폭
    const SPURT_A = 18;            // 스퍼트 가속
    const STAM_K = 5;             // 후반 스태미나 영향
    const VMIN = 18, VMAX = 80;

    const BAL_KEY = "toolify-horse-racing-balance-v1";
    const HIST_KEY = "toolify-horse-racing-history-v1";

    // 레인(실크) 색 — 스크린샷 느낌
    const SILKS = [
        { plate: "#fde047", cap: "#ca8a04", body: "#f59e0b" }, // 1 노랑
        { plate: "#f9a8d4", cap: "#be185d", body: "#ec4899" }, // 2 핑크
        { plate: "#86efac", cap: "#15803d", body: "#22c55e" }, // 3 초록
        { plate: "#93c5fd", cap: "#1d4ed8", body: "#3b82f6" }, // 4 파랑
        { plate: "#c4b5fd", cap: "#6d28d9", body: "#8b5cf6" }, // 5 보라
        { plate: "#fdba74", cap: "#c2410c", body: "#f97316" }, // 6 주황
        { plate: "#67e8f9", cap: "#0e7490", body: "#06b6d4" },
        { plate: "#fda4af", cap: "#9f1239", body: "#f43f5e" },
        { plate: "#d9f99d", cap: "#4d7c0f", body: "#84cc16" },
        { plate: "#e2e8f0", cap: "#475569", body: "#94a3b8" },
    ];
    const COAT = ["#6b4423", "#4a3728", "#8a5a2b", "#3f3f46", "#7c5a3a", "#5b4636", "#d5f5f6", "#f4c6cd", "#c6a76d", "#e2e8f0"];

    const CHARACTER_NAMES = ["왕관", "리본", "초록 모히칸", "별빛 망토", "마법 모자", "불꽃 갈기", "유니콘", "기사 투구", "탐험 모자", "닌자 두건"];

    const DEFAULT_NAMES = ["천둥번개", "질풍질주", "새벽소나타", "은하갈기", "황금화살", "바람정령", "민트유니콘", "장미기사", "초원탐험가", "달빛닌자"];
    let mode = "draw";
    let editingNames = false;
    let names = [...DEFAULT_NAMES];
    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    // ---- 상태 ----
    let balance = loadBalance();
    let history = loadHistory();
    let horses = [];
    let selected = -1;
    let phase = "lobby"; // lobby | countdown | racing | result
    let raf = 0;

    // ---- DOM ----
    const $balance = document.getElementById("balance");
    const $wallet = document.querySelector(".hr-wallet");
    const $entries = document.getElementById("entries");
    const $betPick = document.getElementById("bet-pick");
    const $betOdds = document.getElementById("bet-odds");
    const $betAmount = document.getElementById("bet-amount");
    const $payoutHint = document.getElementById("payout-hint");
    const $startBtn = document.getElementById("start-btn");
    const $skipBtn = document.getElementById("skip-btn");
    const $overlay = document.getElementById("overlay");
    const $overlayBox = document.getElementById("overlay-box");
    const $lobbyPanel = document.getElementById("lobby-panel");
    const $stats = document.getElementById("stats");
    const $history = document.getElementById("history");
    const $resetBtn = document.getElementById("reset-btn");

    // ---- 저장 ----
    function loadBalance() {
        try {
            const v = parseInt(localStorage.getItem(BAL_KEY), 10);
            if (Number.isFinite(v) && v >= 0) return v;
        } catch (_) {}
        return START_BAL;
    }
    function saveBalance() {
        try { localStorage.setItem(BAL_KEY, String(balance)); } catch (_) {}
    }
    function loadHistory() {
        try {
            const v = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
            return Array.isArray(v) ? v.filter(h => h && typeof h.winnerName === "string" && Number.isFinite(h.money) && (!h.bet || (Number.isFinite(h.bet.amount) && Number.isFinite(h.bet.odds)))).slice(0, 30).map(h => ({ ...h, money: h.netVersion === 2 ? h.money : h.outcome === "win" && h.bet ? h.money - h.bet.amount : h.money, netVersion: 2 })) : [];
        } catch (_) { return []; }
    }
    function saveHistory() {
        try { localStorage.setItem(HIST_KEY, JSON.stringify(history.slice(0, 30))); } catch (_) {}
    }

    // ---- 유틸 ----
    const rnd = (a, b) => a + Math.random() * (b - a);
    const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
    // ---- 레이스 생성 ----
    function newRace() {
        horses = [];
        for (let i = 0; i < HORSES; i++) {
            const strength = mode === "draw" ? 1 : rnd(0.98, 1.02);
            horses.push({
                lane: i,
                name: names[i],
                strength: strength,
                coat: COAT[i % COAT.length],
                // 레이스 진행값
                m: 0,
                v: 0,
                spurt: 0,
                stamina: mode === "draw" ? 1 : rnd(0.98, 1.02),
                legPhase: Math.random() * 10,
                finishT: 0,
                rank: 0,
            });
        }

        // 승률 = 몬테카를로 시뮬레이션(레이스 로직과 동일한 모델) → 배당률
        const wins = new Array(HORSES).fill(0);
        const RUNS = mode === "bet" ? 240 : 0;
        for (let r = 0; r < RUNS; r++) wins[monteCarloWinner()]++;
        horses.forEach((h, i) => {
            const p = RUNS ? Math.max(0.02, wins[i] / RUNS) : 1 / HORSES;
            h.winProb = RUNS ? wins[i] / RUNS : 1 / HORSES;
            h.odds = Math.max(1.1, Math.round((1 / p) * TAKEOUT * 10) / 10);
        });

        selected = -1;
        bet = null;
        phase = "lobby";
        renderEntries();
        updateBetUI();
        hideOverlay();
        drawScene(0, true);
    }

    // 한 마리의 다음 속도 (라이브/몬테카를로 공용 물리)
    // st: {strength, stamina, spurt}  — spurt 잔여시간은 st에 기록
    function stepV(st, m, v, packM, dt) {
        const prog = m / RACE_LEN;
        let base = SPEED0 * st.strength - Math.max(-BAND_MAX, Math.min(BAND_MAX, (m - packM) * BAND_K));
        v += (base - v) * Math.min(1, dt * 2.2) + rnd(-NOISE, NOISE) * Math.sqrt(dt);
        if (st.spurt <= 0 && prog > 0.4 && Math.random() < dt * (0.25 + prog * 0.7)) st.spurt = rnd(0.7, 1.5);
        if (st.spurt > 0) { v += SPURT_A * dt; st.spurt -= dt; }
        if (prog > 0.6) v -= (prog - 0.6) * (1.7 - st.stamina) * STAM_K * dt;
        return Math.max(VMIN, Math.min(VMAX, v));
    }

    // 레이스 로직을 빠르게 1회 시뮬레이션 → 우승 레인 반환
    function monteCarloWinner() {
        const n = horses.length;
        const st = horses.map((h) => ({ strength: h.strength, stamina: h.stamina, spurt: 0 }));
        const m = new Array(n).fill(0);
        const v = st.map((s) => SPEED0 * s.strength);
        const dt = 1 / 60;
        for (let iter = 0; iter < 5000; iter++) {
            let sum = 0;
            for (let i = 0; i < n; i++) sum += m[i];
            const pack = sum / n;
            let winner = -1, earliest = Infinity;
            for (let i = 0; i < n; i++) {
                v[i] = stepV(st[i], m[i], v[i], pack, dt);
                m[i] += v[i] * dt;
                if (m[i] >= RACE_LEN) {
                    const crossing = dt - (m[i] - RACE_LEN) / v[i];
                    if (crossing < earliest) { earliest = crossing; winner = i; }
                }
            }
            if (winner >= 0) return winner;
        }
        let best = 0;
        for (let i = 1; i < n; i++) if (m[i] > m[best]) best = i;
        return best;
    }

    // ---- 출주표 렌더 ----
    function renderEntries() {
        $entries.replaceChildren();
        const bestProbability = Math.max(...horses.map(h => h.winProb));
        document.getElementById("edit-names").textContent = editingNames ? "수정 완료" : "이름 수정";
        document.getElementById("edit-names").setAttribute("aria-pressed", String(editingNames));
        horses.forEach((h, i) => {
            const row = document.createElement("div");
            row.className = "hr-entry" + (selected === i ? " selected" : "");
            row.setAttribute("role", "listitem");
            const badge = document.createElement("span");
            badge.className = "hr-entry-no";
            badge.style.background = SILKS[i].plate;
            badge.textContent = String(i + 1);
            const label = document.createElement("label");
            label.className = "hr-entry-main";
            const caption = document.createElement("span");
            caption.className = "hr-entry-form";
            caption.textContent = CHARACTER_NAMES[i];
            const input = document.createElement("input");
            input.className = "hr-name-input";
            input.hidden = !editingNames;
            const displayName = document.createElement("span");
            displayName.className = "hr-roster-name";
            displayName.textContent = h.name;
            displayName.title = h.name;
            displayName.hidden = editingNames;
            input.value = names[i]; input.maxLength = 20; input.placeholder = DEFAULT_NAMES[i];
            input.setAttribute("aria-label", (i + 1) + "번 참가자 이름");
            input.addEventListener("input", () => {
                if (phase !== "lobby") return;
                names[i] = input.value.trim() || DEFAULT_NAMES[i];
                h.name = names[i]; displayName.textContent = h.name; displayName.title = h.name;
                updateBetUI(); drawScene(0, true);
            });
            label.appendChild(caption); label.appendChild(input);
            label.appendChild(displayName);
            row.appendChild(badge); row.appendChild(label);
            {
                const choose = document.createElement("button");
                choose.type = "button"; choose.className = "hr-pick-button";
                choose.textContent = mode === "bet" ? (selected === i ? "✓ 선택됨 " : "선택 ") + h.odds.toFixed(1) + "배" : (selected === i ? "✓ 선택됨" : "선택하기");
                choose.setAttribute("aria-pressed", String(selected === i));
                choose.addEventListener("click", () => {
                    if (phase !== "lobby") return;
                    selected = i; renderEntries(); updateBetUI(); drawScene(0, true);
                });
                row.appendChild(choose);
                if (mode === "bet") {
                const stats = document.createElement("div");
                stats.className = "hr-runner-stats";
                const probability = document.createElement("strong");
                probability.className = "hr-probability";
                probability.textContent = "추정 " + (h.winProb * 100).toFixed(1) + "%";
                if (h.winProb === bestProbability && HORSES > 1) probability.textContent += " · 최고";
                const abilities = document.createElement("span");
                abilities.textContent = "속도 " + (h.strength * 100).toFixed(1) + " · 지구력 " + (h.stamina * 100).toFixed(1);
                stats.appendChild(probability); stats.appendChild(abilities); row.appendChild(stats);
                }
            }
            $entries.appendChild(row);
        });
    }

    // ---- 베팅 UI ----
    function clampAmount() {
        let a = parseInt($betAmount.value, 10);
        if (!Number.isFinite(a) || a < 0) a = 0;
        if (a > balance) a = balance;
        return a;
    }
    function updateRaceStatus() {
        let text;
        if (mode === "draw") {
            text = "🎲 뽑기 · " + HORSES + "명 참여";
            const winner = phase === "result" ? horses.find(h => h.rank === 1) : null;
            if (winner) text += " · 당첨: " + (winner.lane + 1) + "번 " + winner.name;
            else if (selected >= 0) text += " · 선택: " + (selected + 1) + "번 " + horses[selected].name;
            else text += " · 참가자를 선택해 주세요";
        } else if (phase !== "lobby" && !bet) text = "👀 관전 · 코인을 걸지 않은 경주";
        else {
            const runner = phase !== "lobby" && bet ? bet.horse : selected;
            text = "🪙 코인 베팅 · " + (runner >= 0 ? (runner + 1) + "번 " + horses[runner].name : "참가자를 선택하세요");
            if (runner >= 0) text += " · " + fmt(phase !== "lobby" && bet ? bet.amount : clampAmount()) + " C";
        }
        document.getElementById("race-selection").textContent = text;
    }
    function updateBetUI() {
        updateRaceStatus();
        $balance.textContent = fmt(balance);

        if (selected < 0) {
            $betPick.innerHTML = "선택한 말: <b>없음</b>";
            $betOdds.textContent = "";
        } else {
            const h = horses[selected];
            $betPick.innerHTML = `선택한 말: <b>${selected + 1}번 ${escapeHTML(h.name)}</b>`;
            $betOdds.textContent = `${h.odds.toFixed(1)}배`;
        }

        const amt = clampAmount();
        if (selected >= 0 && amt > 0) {
            const gain = Math.floor(amt * horses[selected].odds);
            $payoutHint.innerHTML = `적중 시 예상 획득: <b>${fmt(gain)} C</b> (순이익 +${fmt(gain - amt)})`;
            $startBtn.disabled = false;
            $startBtn.textContent = `${fmt(amt)} C 베팅하고 출발 🏇`;
        } else {
            $payoutHint.textContent = "적중 시 예상 획득: -";
            $startBtn.disabled = true;
            $startBtn.textContent = selected < 0 ? "말을 먼저 고르세요" : "베팅 코인을 입력하세요";
        }
    }

    $betAmount.addEventListener("input", updateBetUI);
    document.querySelectorAll(".hr-quick button").forEach((b) => {
        b.addEventListener("click", () => {
            const kind = b.dataset.amt;
            if (kind === "half") $betAmount.value = String(Math.floor(balance / 2));
            else if (kind === "max") $betAmount.value = String(balance);
            else $betAmount.value = String((parseInt($betAmount.value, 10) || 0) + parseInt(kind, 10));
            updateBetUI();
        });
    });

    // ---- 지갑 연출 ----
    function flashWallet() {
        $wallet.classList.remove("flash");
        void $wallet.offsetWidth;
        $wallet.classList.add("flash");
    }

    // ---- 오버레이 ----
    function showOverlay(html) {
        $overlayBox.innerHTML = html;
        $overlay.classList.add("show");
    }
    function hideOverlay() { $overlay.classList.remove("show"); }

    // ---- 게임 시작 ----
    let bet = null; // {horse, amount}
    function beginRace(withBet) {
        if (phase !== "lobby") return;

        if (withBet && mode !== "bet") return;
        if (withBet) {
            const amt = clampAmount();
            if (selected < 0 || amt <= 0) return;
            balance -= amt;
            bet = { horse: selected, amount: amt, odds: horses[selected].odds };
            saveBalance();
        } else {
            bet = null;
        }
        updateBetUI();

        document.querySelector(".hr-stage").scrollIntoView({behavior:"smooth", block:"start"});
        phase = "countdown";
        if (!withBet && mode === "bet") selected = -1;
        updateRaceStatus();
        document.querySelectorAll("#setup-panel button, #setup-panel input, #setup-panel select, #lobby-panel input, #lobby-panel button, #lobby-panel select").forEach(el => { el.disabled = true; });
        document.getElementById("draw-start").disabled = true;
        $lobbyPanel.style.opacity = ".5";
        $lobbyPanel.style.pointerEvents = "none";

        let n = 3;
        showOverlay(`<div class="hr-countdown">${n}</div>`);
        const tick = setInterval(() => {
            n--;
            if (n > 0) {
                showOverlay(`<div class="hr-countdown">${n}</div>`);
            } else if (n === 0) {
                showOverlay(`<div class="hr-countdown">GO!</div>`);
            } else {
                clearInterval(tick);
                hideOverlay();
                startLoop();
            }
        }, 800);
    }

    $startBtn.addEventListener("click", () => beginRace(true));
    $skipBtn.addEventListener("click", () => beginRace(false));

    // ---- 시뮬레이션 루프 ----
    let lastT = 0;
    let finishedCount = 0;
    let raceClock = 0;
    let endTimer = 0;

    function startLoop() {
        phase = "racing";
        lastT = performance.now();
        finishedCount = 0;
        raceClock = 0;
        endTimer = 0;
        horses.forEach((h) => { h.m = 0; h.v = 40 * h.strength; h.spurt = 0; h.finishT = 0; h.rank = 0; });
        raf = requestAnimationFrame(step);
    }

    function step(now) {
        if (phase !== "racing") return;
        let elapsed = (now - lastT) / 1000;
        lastT = now;
        if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
        if (elapsed > 1) elapsed = 1; // 긴 공백(탭 비활성) 후 과도한 점프 방지

        // 고정 스텝으로 나눠 진행 → 저FPS에서도 실시간 페이스 유지, 결승선 튀어넘기 방지
        const STEP = 1 / 60;
        while (elapsed > 1e-4 && finishedCount < HORSES) {
            const d = Math.min(STEP, elapsed);
            elapsed -= d;
            raceClock += d;
            simulate(d);
        }
        drawScene(raceClock, false);

        // 1등이 들어오면 잠깐 보여준 뒤 결과 (뒤처진 말 기다리지 않음)
        if (finishedCount >= 1 && !endTimer) {
            endTimer = setTimeout(() => { cancelAnimationFrame(raf); finishRace(); }, 1400);
        }
        if (finishedCount >= HORSES) {
            cancelAnimationFrame(raf);
            clearTimeout(endTimer);
            finishRace();
            return;
        }
        raf = requestAnimationFrame(step);
    }

    function simulate(dt) {
        // 팩(무리) 중심 — 러버밴딩으로 화면 안에 모으고, 실제 경마처럼 접전 유지
        let sum = 0, running = 0;
        for (const h of horses) { if (!h.finishT) { sum += h.m; running++; } }
        const packM = running ? sum / running : 0;

        horses.forEach((h) => {
            if (h.finishT) { h.m += h.v * dt; h.legPhase += h.v * dt * 0.09; return; }

            h.v = stepV(h, h.m, h.v, packM, dt);
            h.m += h.v * dt;
            h.legPhase += h.v * dt * 0.09;

            if (h.m >= RACE_LEN) {
                const overshoot = h.m - RACE_LEN;
                h.finishT = raceClock - overshoot / Math.max(1, h.v);
                h.m = RACE_LEN;
                finishedCount++;
            }
        });
    }

    // ---- 결과 처리 ----
    function finishRace() {
        if (phase !== "racing") return;
        phase = "result";
        clearTimeout(endTimer);

        // 아직 못 들어온 말은 예상 완주시각으로 순위 산정
        horses.forEach((h) => {
            if (!h.finishT) h.finishT = raceClock + (RACE_LEN - h.m) / Math.max(1, h.v);
        });
        const order = [...horses].sort((a, b) => a.finishT - b.finishT);
        order.forEach((h, i) => { h.rank = i + 1; });

        const winner = order[0];
        let resultMoney = 0;
        let outcome = "skip";

        if (bet) {
            if (bet.horse === winner.lane) {
                resultMoney = Math.floor(bet.amount * bet.odds);
                balance += resultMoney;
                resultMoney -= bet.amount;
                outcome = "win";
            } else {
                resultMoney = -bet.amount;
                outcome = "lose";
            }
            saveBalance();
            flashWallet();
        }

        history.unshift({
            t: Date.now(),
            bet: bet ? { no: bet.horse + 1, amount: bet.amount, odds: bet.odds } : null,
            winnerNo: winner.lane + 1,
            winnerName: winner.name,
            mode: mode,
            netVersion: 2,
            outcome: outcome,
            money: resultMoney,
        });
        history = history.slice(0, 30);
        saveHistory();

        renderResultOverlay(order, outcome, resultMoney);
        renderStats();
        renderHistory();
        updateBetUI();
    }

    function renderResultOverlay(order, outcome, money) {
        const top3 = order.slice(0, 3).map((h) => {
            const isBet = bet && h.lane === bet.horse;
            return `<div class="hr-order${isBet ? " win" : ""}">${h.rank}위 · ${h.lane + 1}번 ${escapeHTML(h.name)}${isBet ? " (베팅)" : ""}</div>`;
        }).join("");

        let money$ = "";
        if (outcome === "win") money$ = `<div class="hr-result-money plus">🎉 적중! +${fmt(money)} C</div>`;
        else if (outcome === "lose") money$ = `<div class="hr-result-money minus">아쉽네요… ${fmt(money)} C</div>`;
        else money$ = `<div class="hr-result-money">${mode === "draw" ? "뽑기 완료" : "관전 종료"}</div>`;

        let extra = "";
        if (mode === "bet" && balance <= 0) {
            extra = `<div class="small" style="color:#fca5a5;margin-top:6px">코인이 모두 소진되었습니다.</div>
                     <button class="hr-start" id="ov-reset" type="button" style="margin-top:10px">${fmt(START_BAL)} C로 다시 시작</button>`;
        } else {
            extra = `<button class="hr-start" id="ov-again" type="button" style="margin-top:12px">다음 경주 🏁</button>`;
        }

        showOverlay(`<h3>${mode === "draw" ? "🎲 " + escapeHTML(order[0].name) + " 선택!" : "🏆 경주 결과"}</h3>${top3}${money$}
            ${mode === "bet" ? `<div class="small" style="margin-top:8px">보유 코인: <b style="color:#fde047">${fmt(balance)} C</b></div>` : ""}${extra}`);

        const again = document.getElementById("ov-again");
        if (again) again.addEventListener("click", backToLobby);
        const reset = document.getElementById("ov-reset");
        if (reset) reset.addEventListener("click", () => { doReset(); backToLobby(); });
    }

    function backToLobby() {
        document.querySelectorAll("#setup-panel button, #setup-panel input, #setup-panel select, #lobby-panel input, #lobby-panel button, #lobby-panel select").forEach(el => { el.disabled = false; });
        document.getElementById("draw-start").disabled = false;
        $lobbyPanel.style.opacity = "";
        $lobbyPanel.style.pointerEvents = "";
        $betAmount.value = "";
        newRace();
    }

    // ---- 통계 / 기록 ----
    function renderStats() {
        const played = history.filter((h) => h.bet).length;
        const wins = history.filter((h) => h.outcome === "win").length;
        const net = history.reduce((a, h) => a + (h.money || 0), 0);
        const rate = played ? Math.round((wins / played) * 100) : 0;
        $stats.innerHTML =
            `<div class="hr-stat"><div class="hr-stat-k">베팅 경주</div><div class="hr-stat-v">${played}</div></div>` +
            `<div class="hr-stat"><div class="hr-stat-k">적중</div><div class="hr-stat-v">${wins} (${rate}%)</div></div>` +
            `<div class="hr-stat"><div class="hr-stat-k">최근 손익</div><div class="hr-stat-v" style="color:${net >= 0 ? "#15803d" : "#b91c1c"}">${net >= 0 ? "+" : ""}${fmt(net)}</div></div>`;
    }

    function renderHistory() {
        if (!history.length) {
            $history.innerHTML = `<div class="hr-history-empty">아직 경주 기록이 없습니다.</div>`;
            return;
        }
        $history.innerHTML = history.slice(0, 20).map((h) => {
            let left, right;
            if (!h.bet) {
                left = `<span class="r-skip">${h.mode === "draw" ? "뽑기" : "관전"}</span> · ${h.winnerNo}번 ${escapeHTML(h.winnerName)} 우승`;
                right = "-";
            } else {
                const cls = h.outcome === "win" ? "r-win" : "r-lose";
                const tag = h.outcome === "win" ? "적중" : "실패";
                left = `<span class="${cls}">${tag}</span> · ${h.bet.no}번에 ${fmt(h.bet.amount)}C (${h.bet.odds.toFixed(1)}배)`;
                right = `<span class="${cls}">${h.money >= 0 ? "+" : ""}${fmt(h.money)}</span>`;
            }
            return `<div class="hr-hrow"><span>${left}</span><span>${right}</span></div>`;
        }).join("");
    }

    function doReset() {
        balance = START_BAL;
        saveBalance();
        flashWallet();
        updateBetUI();
    }
    $resetBtn.addEventListener("click", () => {
        if (phase !== "lobby") return;
        doReset();
    });

    // =====================================================
    //  캔버스 렌더링 (픽셀 아트)
    // =====================================================
    function px(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    }

    // 3x5 픽셀 숫자 (1~9) — 캔버스에서 확대해도 또렷하게
    const DIGITS = {
        1: ["010", "110", "010", "010", "111"],
        2: ["111", "001", "111", "100", "111"],
        3: ["111", "001", "111", "001", "111"],
        4: ["101", "101", "111", "001", "001"],
        5: ["111", "100", "111", "001", "111"],
        6: ["111", "100", "111", "101", "111"],
        7: ["111", "001", "010", "010", "010"],
        8: ["111", "101", "111", "101", "111"],
        9: ["111", "101", "111", "001", "111"],
    };
    function drawDigit(n, x, y, color) {
        const g = DIGITS[n];
        if (!g) return;
        ctx.fillStyle = color;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
                if (g[r][c] === "1") ctx.fillRect((x + c) | 0, (y + r) | 0, 1, 1);
            }
        }
    }

    function drawScene(t, isStatic) {
        // 카메라: 선두를 화면 우측(72%)에 두고 따라감 (팩이 좁아 전원 화면 유지)
        let lead = 0;
        for (const h of horses) if (h.m > lead) lead = h.m;
        const viewM = W / PPM;                       // 화면에 보이는 거리
        let camM = lead - viewM * 0.57;
        camM = Math.max(-8, Math.min(RACE_LEN - viewM + 30, camM));

        drawBackground(camM);
        drawTrack(camM);

        // 뒤에 있는 말부터 그려 겹침 자연스럽게
        const ord = [...horses].sort((a, b) => a.m - b.m);
        for (const h of ord) drawHorse(h, camM, t);

        drawFinish(camM);
        drawHud(lead);
    }

    function drawBackground(camM) {
        // 하늘
        const g = ctx.createLinearGradient(0, 0, 0, TRACK_TOP);
        g.addColorStop(0, "#8ed0ec");
        g.addColorStop(1, "#cdeaf5");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, TRACK_TOP);

        // 먼 산
        px(0, 60, W, 24, "#bfe3d0");
        const mo = -(camM * 0.15) % 120;
        ctx.fillStyle = "#a9d7c0";
        for (let x = mo - 120; x < W + 120; x += 120) {
            ctx.beginPath();
            ctx.moveTo(x, 78); ctx.lineTo(x + 34, 46); ctx.lineTo(x + 70, 78);
            ctx.fill();
        }

        // 관중석 (패럴랙스, 도트 블록)
        const so = -(camM * 0.5) % 16;
        px(0, 66, W, 30, "#e7ddc8");
        px(0, 92, W, 6, "#b9ac8d");
        for (let x = so - 16; x < W + 16; x += 16) {
            // 지붕
            px(x, 62, 14, 5, "#c76b5a");
            // 관중 픽셀
            for (let cx = 0; cx < 14; cx += 2) {
                for (let cy = 0; cy < 22; cy += 3) {
                    const c = ((x + cx) * 7 + cy * 13 + Math.floor(x / 16) * 3) % 6;
                    const cols = ["#5b6b8a", "#c98a8a", "#8a9a6b", "#b0a0c0", "#d8c98a", "#7a7a7a"];
                    px(x + cx, 70 + cy, 2, 2, cols[c]);
                }
            }
        }
        // 광고판
        const ao = -(camM * 0.5) % 96;
        for (let x = ao - 96; x < W + 96; x += 96) {
            px(x + 10, 84, 40, 8, "#1f2937");
            px(x + 12, 86, 36, 4, ["#ef4444", "#3b82f6", "#22c55e", "#eab308"][Math.floor((x / 96) % 4 + 4) % 4]);
        }
        // 잔디 안쪽
        px(0, 96, W, 8, "#5bb26a");
    }

    function drawTrack(camM) {
        const trackBot = TRACK_TOP + LANE_H * HORSES;
        // 흙
        px(0, TRACK_TOP, W, trackBot - TRACK_TOP, "#c98f52");
        px(0, TRACK_TOP, W, 3, "#e6b980");

        // 흙 결(스크롤)
        const off = -(camM * PPM) % 12;
        ctx.fillStyle = "rgba(120,78,40,0.35)";
        for (let x = off - 12; x < W; x += 12) {
            for (let y = TRACK_TOP + 4; y < trackBot; y += 6) {
                ctx.fillRect(x + ((y / 6) % 2 ? 0 : 6), y, 3, 2);
            }
        }
        // 레인 구분선
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        for (let i = 1; i < HORSES; i++) {
            ctx.fillRect(0, TRACK_TOP + i * LANE_H, W, 1);
        }
        // 하단 레일
        px(0, trackBot, W, 4, "#e5e7eb");
        px(0, trackBot + 4, W, 3, "#9ca3af");
    }

    function laneY(lane) { return TRACK_TOP + lane * LANE_H + LANE_H - 4; }
    function screenX(m, camM) { return (m - camM) * PPM + 20; }

    function drawFinish(camM) {
        const fx = screenX(RACE_LEN, camM);
        if (fx < -20 || fx > W + 20) return;
        const top = TRACK_TOP - 2;
        const bot = TRACK_TOP + LANE_H * HORSES + 4;
        for (let y = top, i = 0; y < bot; y += 6, i++) {
            px(fx - 2, y, 4, 6, i % 2 ? "#111827" : "#f9fafb");
        }
        px(fx - 3, top - 14, 2, 14, "#374151");
        px(fx - 3, top - 14, 26, 8, "#ef4444");
        ctx.fillStyle = "#fff";
        ctx.font = "6px monospace";
        ctx.fillText("FINISH", fx - 1, top - 8);
    }

    function drawHorse(h, camM, t) {
        const x = screenX(h.m, camM);
        const y = laneY(h.lane);
        if (x < -40 || x > W + 40) return;

        ctx.save();
        ctx.translate(x, y - 8);
        ctx.scale(1.7, 1.7);
        ctx.translate(-x, -y);
        const s = SILKS[h.lane];
        const gallop = Math.sin(h.legPhase * Math.PI) > 0 ? 0 : 1;
        const bob = h.finishT ? 0 : (gallop ? -1 : 0);
        const yy = y + bob;

        // 그림자
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x - 8, y + 3, 20, 2);

        const coat = h.coat;
        const dark = "#2f241a";

        // 다리 (2프레임 갤럽)
        ctx.fillStyle = dark;
        if (gallop) {
            ctx.fillRect(x - 6, yy + 1, 2, 5);
            ctx.fillRect(x - 1, yy + 2, 2, 4);
            ctx.fillRect(x + 4, yy + 1, 2, 5);
            ctx.fillRect(x + 8, yy + 2, 2, 4);
        } else {
            ctx.fillRect(x - 7, yy + 2, 2, 4);
            ctx.fillRect(x - 2, yy + 1, 2, 5);
            ctx.fillRect(x + 5, yy + 2, 2, 4);
            ctx.fillRect(x + 9, yy + 1, 2, 5);
        }

        // 꼬리
        px(x - 10, yy - 4, 3, 6, coat);
        // 몸통
        px(x - 8, yy - 4, 16, 6, coat);
        px(x - 8, yy - 4, 16, 2, "rgba(255,255,255,0.12)");
        // 목
        px(x + 6, yy - 9, 4, 6, coat);
        // 머리
        px(x + 8, yy - 11, 5, 4, coat);
        px(x + 12, yy - 10, 2, 2, coat);
        // 갈기
        px(x + 5, yy - 10, 2, 6, dark);

        // 안장/실크(기수 몸)
        px(x - 3, yy - 8, 7, 4, s.body);
        // 기수 머리 + 모자
        px(x - 1, yy - 12, 3, 3, "#e8c39e");
        px(x - 2, yy - 14, 5, 2, s.cap);
        // 팔
        px(x + 2, yy - 9, 4, 2, s.body);

        // Each runner has a distinct silhouette as well as a different coat.
        switch (h.lane) {
            case 0: px(x-3, yy-18, 7, 3, "#facc15"); px(x-3, yy-21, 2, 4, "#facc15"); px(x+2, yy-21, 2, 4, "#facc15"); break;
            case 1: px(x-6, yy-16, 4, 4, "#ec4899"); px(x+1, yy-16, 4, 4, "#ec4899"); break;
            case 2: px(x-1, yy-21, 3, 8, "#4ade80"); break;
            case 3: px(x-8, yy-9, 7, 6, "#60a5fa"); px(x-8, yy-7, 2, 2, "#fff"); break;
            case 4: px(x-4, yy-16, 9, 2, "#a78bfa"); px(x-1, yy-23, 3, 8, "#7c3aed"); break;
            case 5: px(x+5, yy-15, 2, 9, "#fb923c"); px(x+7, yy-17, 2, 6, "#fde047"); break;
            case 6: px(x+10, yy-19, 2, 9, "#fef08a"); px(x+5, yy-11, 2, 6, "#f0abfc"); break;
            case 7: px(x-3, yy-17, 7, 6, "#cbd5e1"); px(x, yy-14, 4, 1, "#334155"); break;
            case 8: px(x-5, yy-15, 11, 2, "#a16207"); px(x-2, yy-19, 5, 5, "#d6b77c"); break;
            case 9: px(x-3, yy-17, 7, 6, "#334155"); px(x-2, yy-14, 5, 1, "#fff"); px(x-8, yy-15, 5, 2, "#ef4444"); break;
        }

        // 스퍼트 먼지
        if (h.spurt > 0 && !h.finishT) {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(x - 12 - i * 3 - Math.random() * 3, yy + 2 - Math.random() * 3, 2, 2);
            }
        }
        ctx.restore();
        drawRunnerName(h, x, y);
    }

    function drawRunnerName(h, x, y) {
        ctx.font = "bold 14px sans-serif";
        const full = (selected === h.lane ? "★ " : "") + (h.lane + 1) + " · " + h.name;
        let label = full;
        const limit = Math.min(200, W - 24);
        while (ctx.measureText(label).width > limit - 16 && label.length > 5) label = label.slice(0, -2) + "…";
        const width = ctx.measureText(label).width + 16;
        const left = Math.max(4, Math.min(W - width - 4, x - width / 2));
        ctx.fillStyle = selected === h.lane ? "#1d4ed8" : "#0f172a";
        ctx.fillRect(left, y - 65, width, 22);
        ctx.fillStyle = "#fff"; ctx.textAlign = "left";
        ctx.fillText(label, left + 8, y - 49);
    }
    function drawHud(lead) {
        const remain = Math.max(0, Math.round(RACE_LEN - lead));
        // 상단 리본
        px(0, 0, W, 20, "rgba(2,6,23,0.55)");
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("LIVE", 8, 14);

        ctx.fillStyle = "#e5e7eb";
        ctx.textAlign = "right";
        if (phase === "racing") {
            ctx.fillText("남은 거리 " + remain + " m", W - 8, 14);
        } else if (phase === "lobby") {
            ctx.fillText("PICK RACE · " + RACE_LEN + "m", W - 8, 14);
        } else if (phase === "result") {
            ctx.fillText("PHOTO FINISH", W - 8, 14);
        }
        ctx.textAlign = "left";

        // 진행 바
        if (phase === "racing") {
            px(6, 24, 120, 3, "rgba(255,255,255,0.25)");
            px(6, 24, Math.max(2, 120 * (lead / RACE_LEN)), 3, "#fde047");
        }
    }

    // ---- 규칙 모달 ----
    const $ruleModal = document.getElementById("rule-modal");
    document.getElementById("rule-btn").addEventListener("click", () => $ruleModal.classList.remove("is-hidden"));
    ["rule-close", "rule-dim", "rule-ok"].forEach((id) => {
        document.getElementById(id).addEventListener("click", () => $ruleModal.classList.add("is-hidden"));
    });

    function setMode(next) {
        if (phase !== "lobby") return;
        mode = next;
        document.getElementById("mode-draw").setAttribute("aria-pressed", String(mode === "draw"));
        document.getElementById("mode-bet").setAttribute("aria-pressed", String(mode === "bet"));
        $wallet.hidden = mode === "draw";
        $resetBtn.hidden = mode === "draw";
        $stats.hidden = mode === "draw";
        document.getElementById("stats-guide").hidden = mode === "draw";
        document.getElementById("bet-controls").hidden = mode === "draw";
        document.getElementById("draw-start").hidden = mode !== "draw";
        document.getElementById("mode-help").textContent = mode === "draw"
            ? "이름을 바꿔 친구나 메뉴 뽑기에 사용하세요. 참가자는 모두 같은 능력으로 출발합니다."
            : "우승할 말을 고르고 가상 코인을 걸어 보세요. 속도·지구력은 100을 기준으로 한 상대 능력입니다.";
        newRace();
        resizeTrack();
    }
    document.getElementById("edit-names").addEventListener("click", () => {
        if (phase !== "lobby") return;
        editingNames = !editingNames; renderEntries();
    });
    document.getElementById("mode-draw").addEventListener("click", () => setMode("draw"));
    document.getElementById("mode-bet").addEventListener("click", () => setMode("bet"));
    document.getElementById("draw-start").addEventListener("click", () => beginRace(false));
    document.getElementById("default-names").addEventListener("click", () => {
        if (phase !== "lobby") return;
        names = [...DEFAULT_NAMES]; horses.forEach((h, i) => { h.name = names[i]; });
        renderEntries(); updateBetUI();
    });
    document.getElementById("participant-count").addEventListener("change", (event) => {
        if (phase !== "lobby") return;
        HORSES = Math.max(2, Math.min(10, Math.trunc(Number(event.target.value) || 2)));
        event.target.value = String(HORSES);
        newRace(); resizeTrack();
    });
    function resizeTrack() {
        W = Math.max(300, Math.round(canvas.getBoundingClientRect().width));
        H = TRACK_TOP + LANE_H * HORSES + 12;
        canvas.width = W; canvas.height = H;
        ctx.imageSmoothingEnabled = false;
        drawScene(raceClock, phase === "lobby");
    }
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(resizeTrack).observe(canvas.parentElement);
    // ---- 초기화 ----
    renderStats();
    renderHistory();
    setMode("draw");
})();
