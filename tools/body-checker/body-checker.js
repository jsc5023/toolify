/* ============================================================
   BMI + 비만 기준표 + WHR(선택) + WHR 기준표
   ============================================================ */

function round2(n) {
    return Math.round(n * 100) / 100;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/* 한국에서 흔히 쓰는 BMI 분류(아시아 기준) */
function getBmiCategoryKR(bmi) {
    if (bmi < 18.5) return { key: "under", label: "저체중", range: "< 18.5" };
    if (bmi < 23.0) return { key: "normal", label: "정상", range: "18.5 ~ 22.9" };
    if (bmi < 25.0) return { key: "over", label: "과체중(전비만)", range: "23.0 ~ 24.9" };
    if (bmi < 30.0) return { key: "obese1", label: "비만 1단계", range: "25.0 ~ 29.9" };
    if (bmi < 35.0) return { key: "obese2", label: "비만 2단계", range: "30.0 ~ 34.9" };
    return { key: "obese3", label: "고도비만", range: "≥ 35.0" };
}

/* WHR 위험 기준(참고용) */
function getWhrRisk(sex, whr) {
    // 널리 쓰이는 컷: 남 0.90, 여 0.85
    const cut = sex === "male" ? 0.9 : 0.85;
    return {
        cut,
        risky: whr >= cut,
        label: whr >= cut ? "복부비만 위험" : "상대적으로 낮음"
    };
}

/* BMI 정상 범위(18.5~22.9) 기준으로 정상 체중 범위 계산 */
function getNormalWeightRange(heightCm) {
    const h = heightCm / 100;
    const minW = 18.5 * h * h;
    const maxW = 22.9 * h * h;
    return { minW: round2(minW), maxW: round2(maxW) };
}

/* 기준표 강조 처리 */
function highlightBmiTableRow(key) {
    document.querySelectorAll(".bmi-table tbody tr").forEach((tr) => tr.classList.remove("highlight"));
    const target = document.querySelector(`.bmi-table tbody tr[data-key="${key}"]`);
    if (target) target.classList.add("highlight");
}

/* 교차 코멘트 (차별화 포인트) */
function buildCrossComment(bmi, whrRiskLabel) {
    if (whrRiskLabel === null) {
        return "허리·엉덩이 둘레를 입력하면 WHR(복부 중심 위험)까지 함께 확인할 수 있어요.";
    }
    if (bmi < 23 && whrRiskLabel === "복부비만 위험") {
        return "BMI는 정상 범위지만 WHR 기준으로 복부비만 위험이 있어요. 체중보다 ‘허리둘레’ 관리가 더 중요할 수 있습니다.";
    }
    if (bmi >= 25 && whrRiskLabel !== "복부비만 위험") {
        return "BMI는 비만 구간이지만 WHR 위험은 상대적으로 낮은 편이에요. 전체 체중과 함께 복부 중심 위험도(WHR)를 같이 보는 것이 좋습니다.";
    }
    return "BMI는 전체 체중 대비 지표, WHR은 복부 중심 위험도를 참고하는 지표예요. 두 값을 함께 보면 더 현실적인 판단이 가능합니다.";
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html;
}

function calculate() {
    const heightCm = Number(document.getElementById("height").value);
    const weightKg = Number(document.getElementById("weight").value);
    const sex = document.getElementById("sex").value;

    const waistCm = Number(document.getElementById("waist").value);
    const hipCm = Number(document.getElementById("hip").value);

    // 초기화
    ["bmi-line", "bmi-line2", "bmi-line3", "whr-line", "whr-line2"].forEach((id) => setText(id, ""));
    setText("cross-comment", "");
    document.getElementById("cross-comment").classList.add("hidden");

    if (!heightCm || !weightKg) {
        setText("bmi-line", "키(cm)와 체중(kg)을 입력해주세요.");
        return;
    }
    if (heightCm < 50 || heightCm > 250 || weightKg < 10 || weightKg > 400) {
        setText("bmi-line", "키/체중 입력값이 너무 비정상적입니다. 단위를 확인해주세요.");
        return;
    }

    const h = heightCm / 100;
    const bmi = weightKg / (h * h);
    const bmiRounded = round2(bmi);

    const cat = getBmiCategoryKR(bmi);
    highlightBmiTableRow(cat.key);

    const normalW = getNormalWeightRange(heightCm);

    setHTML(
        "bmi-line",
        `BMI: <span class="result-strong">${bmiRounded}</span> <span class="badge">${cat.label}</span>`
    );
    setText("bmi-line2", `한국 기준 분류: ${cat.label} (BMI ${cat.range})`);
    setText("bmi-line3", `키 ${heightCm}cm 기준 정상 체중 범위(참고): ${normalW.minW}kg ~ ${normalW.maxW}kg`);

    // WHR (선택 입력)
    let whrRiskLabel = null;

    const hasWaist = Number.isFinite(waistCm) && waistCm > 0;
    const hasHip = Number.isFinite(hipCm) && hipCm > 0;

    if (hasWaist || hasHip) {
        // 둘 중 하나만 입력한 경우
        if (!hasWaist || !hasHip) {
            setText("whr-line", "WHR 계산을 위해 허리와 엉덩이 둘레를 모두 입력해주세요.");
            whrRiskLabel = null;
        } else {
            if (waistCm < 30 || waistCm > 200 || hipCm < 30 || hipCm > 250) {
                setText("whr-line", "허리/엉덩이 둘레 값이 이상합니다. cm 단위를 확인해주세요.");
                return;
            }
            const whr = waistCm / hipCm;
            const whrRounded = round2(whr);

            const whrRisk = getWhrRisk(sex, whr);
            whrRiskLabel = whrRisk.label;

            setHTML(
                "whr-line",
                `WHR(허리÷엉덩이): <span class="result-strong">${whrRounded}</span> <span class="badge">${whrRisk.label}</span>`
            );
            setText(
                "whr-line2",
                `참고 기준: ${sex === "male" ? "남성" : "여성"} ${whrRisk.cut} 이상이면 복부비만 위험으로 안내합니다.`
            );
        }
    } else {
        setText("whr-line", "허리·엉덩이 둘레(선택)를 입력하면 WHR(복부비만 위험)까지 함께 볼 수 있어요.");
        whrRiskLabel = null;
    }

    const cross = buildCrossComment(bmi, whrRiskLabel);
    setText("cross-comment", cross);
    document.getElementById("cross-comment").classList.remove("hidden");
}

function clearAll() {
    ["height", "weight", "waist", "hip"].forEach((id) => (document.getElementById(id).value = ""));
    document.getElementById("sex").value = "male";

    ["bmi-line", "bmi-line2", "bmi-line3", "whr-line", "whr-line2"].forEach((id) => setText(id, ""));
    setText("cross-comment", "");
    document.getElementById("cross-comment").classList.add("hidden");

    // 표 하이라이트 해제
    document.querySelectorAll(".bmi-table tbody tr").forEach((tr) => tr.classList.remove("highlight"));
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("calc-btn").addEventListener("click", calculate);
    document.getElementById("clear-btn").addEventListener("click", clearAll);
});
