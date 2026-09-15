/* 별점 계산기: 현재 평균 별점·리뷰 수·목표 별점으로 필요한 리뷰 수를 계산.
   서버 전송 없이 브라우저에서만 계산한다. */
(function starRatingCalculator() {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const currentRatingEl = $("current-rating");
    const currentCountEl = $("current-count");
    const targetRatingEl = $("target-rating");
    const newReviewAvgEl = $("new-review-avg");

    const resultEmpty = $("result-empty");
    const resultBody = $("result-body");
    const errorEl = $("rating-error");

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    function fmt(n) {
        return round2(n).toFixed(2);
    }

    // 필요한 신규 리뷰 수 X를 계산.
    // (A*N + r*X) / (N+X) >= T  =>  X*(r-T) >= N*(T-A)
    function computeNeeded(A, N, T, r) {
        if (T <= A) return { status: "reached", x: 0 };
        if (r <= T) return { status: "impossible" };
        const raw = (N * (T - A)) / (r - T);
        const x = Math.max(0, Math.ceil(raw - 1e-9));
        return { status: "ok", x };
    }

    function render() {
        const A = Number(currentRatingEl.value);
        const N = Number(currentCountEl.value);
        const T = Number(targetRatingEl.value);
        const r = Number(newReviewAvgEl.value);

        errorEl.textContent = "";

        const valid =
            Number.isFinite(A) && A >= 0 && A <= 5 &&
            Number.isFinite(N) && N >= 0 &&
            Number.isFinite(T) && T >= 0 && T <= 5 &&
            Number.isFinite(r) && r >= 0 && r <= 5 &&
            currentRatingEl.value !== "" && currentCountEl.value !== "" && targetRatingEl.value !== "";

        if (!valid) {
            resultEmpty.classList.remove("hidden");
            resultBody.classList.add("hidden");
            return;
        }

        const result = computeNeeded(A, N, T, r);

        resultEmpty.classList.add("hidden");
        resultBody.classList.remove("hidden");

        if (result.status === "reached") {
            $("needed-count").textContent = "0";
            $("needed-caption").textContent = `이미 목표 별점 ${fmt(T)}점을 달성했어요.`;
            $("srs-stats").classList.add("hidden");
            errorEl.textContent = "";
        } else if (result.status === "impossible") {
            $("needed-count").textContent = "—";
            $("needed-caption").textContent = "";
            $("srs-stats").classList.add("hidden");
            errorEl.textContent = `신규 리뷰 평균(${fmt(r)}점)이 목표 별점(${fmt(T)}점)보다 낮거나 같으면 아무리 많은 리뷰가 추가돼도 목표에 도달할 수 없어요.`;
        } else {
            const X = result.x;
            const totalN = N + X;
            const expected = X === 0 ? A : (A * N + r * X) / totalN;

            $("needed-count").textContent = String(X);
            $("needed-caption").textContent =
                X === 0
                    ? `이미 목표 별점 ${fmt(T)}점을 달성했어요.`
                    : `평균 ${fmt(r)}점 리뷰가 ${X}개 더 필요해요.`;

            $("srs-stats").classList.remove("hidden");
            $("stat-current-count").textContent = `${N.toLocaleString("ko-KR")}개`;
            $("stat-added-count").textContent = `${X.toLocaleString("ko-KR")}개`;
            $("stat-total-count").textContent = `${totalN.toLocaleString("ko-KR")}개`;
            $("stat-expected-rating").textContent = `${fmt(expected)}점`;
        }

        // 리뷰 1개 추가 시 별점 변화표 (목표와 무관하게 항상 계산)
        const deltaBody = $("delta-table-body");
        deltaBody.innerHTML = "";
        for (let star = 5; star >= 1; star--) {
            const newAvg = (A * N + star) / (N + 1);
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${"★".repeat(star)}${"☆".repeat(5 - star)} 추가</td><td>${fmt(A)} → <strong>${newAvg.toFixed(3)}</strong></td>`;
            deltaBody.appendChild(tr);
        }
    }

    function resetAll() {
        currentRatingEl.value = "4.2";
        currentCountEl.value = "100";
        targetRatingEl.value = "4.5";
        newReviewAvgEl.value = "5";
        render();
    }

    [currentRatingEl, currentCountEl, targetRatingEl, newReviewAvgEl].forEach((el) => {
        el.addEventListener("input", render);
    });
    $("reset-btn").addEventListener("click", resetAll);

    render();
})();
