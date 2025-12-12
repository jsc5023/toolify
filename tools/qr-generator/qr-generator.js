/* QR 코드 생성기 전용 JS */
let currentQr = null;

const textEl = document.getElementById("qr-text");
const sizeEl = document.getElementById("qr-size");
const marginEl = document.getElementById("qr-margin");
const levelEl = document.getElementById("qr-level");
const fgEl = document.getElementById("qr-foreground");
const bgEl = document.getElementById("qr-background");
const previewEl = document.getElementById("qr-preview");
const generateBtn = document.getElementById("qr-generate-btn");
const downloadBtn = document.getElementById("qr-download-btn");

/**
 * QR 코드 생성
 */
function generateQr() {
    const text = textEl.value.trim();

    if (!text) {
        previewEl.innerHTML = `<p class="qr-placeholder">생성할 내용을 입력해주세요.</p>`;
        previewEl.style.backgroundColor = "#f9fafb";
        previewEl.style.padding = "16px";
        currentQr = null;
        return;
    }

    const size = Number(sizeEl.value) || 256;
    const margin = Number(marginEl.value) || 2;
    const levelKey = levelEl.value; // L, M, Q, H
    const fg = fgEl.value || "#000000";
    const bg = bgEl.value || "#ffffff";

    // 기존 QR 제거
    previewEl.innerHTML = "";

    // 여백 느낌 + 배경색 직접 적용
    previewEl.style.padding = margin > 0 ? `${margin * 2}px` : "0";
    previewEl.style.backgroundColor = bg;

    currentQr = new QRCode(previewEl, {
        text,
        width: size,
        height: size,
        colorDark: fg,
        colorLight: bg,
        correctLevel: QRCode.CorrectLevel[levelKey],
    });
}

// 옵션 바꿀 때 자동 재생성
[fgEl, bgEl, sizeEl, marginEl, levelEl].forEach((el) => {
    el.addEventListener("change", () => {
        if (textEl.value.trim()) {
            generateQr();
        }
    });
});

/**
 * PNG 다운로드
 */
function downloadQr() {
    if (!currentQr) {
        alert("먼저 QR 코드를 생성한 뒤 다운로드해주세요.");
        return;
    }

    const canvas = previewEl.querySelector("canvas");
    const img = previewEl.querySelector("img");
    let dataUrl;

    if (canvas) {
        dataUrl = canvas.toDataURL("image/png");
    } else if (img) {
        // 일부 환경에서는 img 태그로 렌더링될 수 있음
        // 캔버스로 다시 그려서 다운로드
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        dataUrl = tempCanvas.toDataURL("image/png");
    } else {
        alert("다운로드할 QR 코드를 찾을 수 없습니다. 다시 생성해 주세요.");
        return;
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qrcode.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

generateBtn.addEventListener("click", generateQr);
downloadBtn.addEventListener("click", downloadQr);

// 엔터+Ctrl로 바로 생성 (텍스트 포커스 상태에서)
textEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        generateQr();
    }
});
