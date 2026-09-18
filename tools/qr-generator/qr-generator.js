(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.QrGenerator = api;
    if (typeof document !== "undefined") api.init(document, root);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    const DEFAULTS = { size: 256, margin: 4, level: "M", foreground: "#183b35", background: "#ffffff" };
    const SAMPLES = {
        url: "https://toolify.kr/",
        text: "Toolify에서 만든 QR 코드입니다."
    };

    function normalizeHex(value, fallback) {
        const hex = String(value || "").trim();
        return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : fallback;
    }

    function hexToRgb(hex) {
        const value = normalizeHex(hex, "#000000").slice(1);
        return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
    }

    function relativeLuminance(hex) {
        const rgb = hexToRgb(hex);
        const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
            const channel = value / 255;
            return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function contrastRatio(foreground, background) {
        const first = relativeLuminance(foreground);
        const second = relativeLuminance(background);
        return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    }

    function normalizeOptions(input) {
        const allowedSizes = [128, 192, 256, 320, 384, 512];
        const allowedMargins = [0, 2, 4, 8];
        const size = Number(input.size);
        const margin = Number(input.margin);
        const level = ["L", "M", "Q", "H"].includes(input.level) ? input.level : DEFAULTS.level;
        return {
            size: allowedSizes.includes(size) ? size : DEFAULTS.size,
            margin: allowedMargins.includes(margin) ? margin : DEFAULTS.margin,
            level,
            foreground: normalizeHex(input.foreground, DEFAULTS.foreground),
            background: normalizeHex(input.background, DEFAULTS.background)
        };
    }

    function calculateQuietZone(size, marginModules, moduleCount) {
        if (!marginModules) return 0;
        const modules = Math.max(1, Number(moduleCount) || 21);
        return Math.max(1, Math.ceil((Number(size) / modules) * Number(marginModules)));
    }

    function downloadLayout(size, quietZone) {
        const contentSize = Math.max(1, Number(size) || DEFAULTS.size);
        const padding = Math.max(0, Number(quietZone) || 0);
        return { width: contentSize + padding * 2, height: contentSize + padding * 2, offsetX: padding, offsetY: padding };
    }

    function init(doc, browserWindow) {
        const $ = (selector) => doc.querySelector(selector);
        const textEl = $("#qr-text");
        const previewEl = $("#qr-preview");
        const downloadButton = $("#qr-download-btn");
        let currentQr = null;

        function getOptions() {
            return normalizeOptions({
                size: $("#qr-size").value,
                margin: $("#qr-margin").value,
                level: $("#qr-level").value,
                foreground: $("#qr-foreground").value,
                background: $("#qr-background").value
            });
        }

        function setPlaceholder(title, message, isError) {
            previewEl.classList.toggle("is-error", Boolean(isError));
            previewEl.style.padding = "16px";
            previewEl.style.backgroundColor = "#ffffff";
            previewEl.innerHTML = `<div class="qr-placeholder"><span aria-hidden="true">▦</span><strong>${title}</strong><p>${message}</p></div>`;
            previewEl.setAttribute("aria-label", title);
        }

        function setDownloadReady(ready) {
            downloadButton.disabled = !ready;
        }

        function updateTextCount() {
            $("#qr-text-count").textContent = `${Array.from(textEl.value).length.toLocaleString("ko-KR")}자`;
        }

        function updateMeta(options, quietZone) {
            const finalSize = options.size + quietZone * 2;
            $("#qr-meta-size").textContent = quietZone ? `${finalSize}px PNG` : `${options.size}px PNG`;
            $("#qr-meta-level").textContent = `복원 ${options.level}`;
            $("#qr-meta-margin").textContent = `여백 ${options.margin}칸`;
        }

        function updateColorStatus() {
            const options = getOptions();
            const ratio = contrastRatio(options.foreground, options.background);
            $("#qr-foreground-value").textContent = options.foreground.toUpperCase();
            $("#qr-background-value").textContent = options.background.toUpperCase();
            const status = $("#contrast-status");
            const isGood = ratio >= 4.5 && relativeLuminance(options.foreground) < relativeLuminance(options.background);
            status.classList.toggle("warning", !isGood);
            status.textContent = isGood ? `색상 대비 ${ratio.toFixed(1)}:1 · 스캔하기 좋은 조합이에요.` : `색상 대비 ${ratio.toFixed(1)}:1 · 밝은 배경과 더 어두운 QR 색상을 권장해요.`;
        }

        function markStale() {
            if (!currentQr) return;
            currentQr = null;
            setDownloadReady(false);
            $("#preview-description").textContent = "내용이 변경됐어요. QR 코드를 다시 생성하세요.";
            $("#qr-result-note").textContent = "변경된 내용을 반영하려면 생성 버튼을 눌러 주세요.";
        }

        function generateQr() {
            const text = textEl.value.trim();
            if (!text) {
                currentQr = null;
                setDownloadReady(false);
                setPlaceholder("내용을 입력해 주세요", "URL이나 텍스트가 있어야 QR 코드를 만들 수 있어요.", true);
                $("#preview-description").textContent = "입력값을 확인해 주세요.";
                return false;
            }
            if (!browserWindow || typeof browserWindow.QRCode !== "function") {
                currentQr = null;
                setDownloadReady(false);
                setPlaceholder("생성 모듈을 불러오지 못했어요", "잠시 후 페이지를 새로고침해 주세요.", true);
                $("#preview-description").textContent = "QR 라이브러리 연결을 확인해 주세요.";
                return false;
            }

            const options = getOptions();
            previewEl.innerHTML = "";
            previewEl.classList.remove("is-error");
            previewEl.style.backgroundColor = options.background;
            previewEl.style.padding = "0";

            try {
                const instance = new browserWindow.QRCode(previewEl, {
                    text,
                    width: options.size,
                    height: options.size,
                    colorDark: options.foreground,
                    colorLight: options.background,
                    correctLevel: browserWindow.QRCode.CorrectLevel[options.level]
                });
                const moduleCount = instance._oQRCode && typeof instance._oQRCode.getModuleCount === "function" ? instance._oQRCode.getModuleCount() : 21;
                const quietZone = calculateQuietZone(options.size, options.margin, moduleCount);
                previewEl.style.padding = `${quietZone}px`;
                currentQr = { instance, text, options, quietZone };
                setDownloadReady(true);
                updateMeta(options, quietZone);
                $("#preview-description").textContent = "QR 코드가 준비됐어요.";
                $("#qr-result-note").textContent = "다운로드 이미지에도 선택한 바깥 여백이 포함됩니다.";
                previewEl.setAttribute("aria-label", `생성된 QR 코드: ${text.slice(0, 80)}`);
                return true;
            } catch (error) {
                currentQr = null;
                setDownloadReady(false);
                setPlaceholder("QR 코드를 만들지 못했어요", "내용을 줄이거나 오류 복원 수준을 낮춰 다시 시도해 주세요.", true);
                $("#preview-description").textContent = "입력 내용이 QR 용량을 초과했을 수 있어요.";
                return false;
            }
        }

        function downloadQr() {
            if (!currentQr) return false;
            const source = previewEl.querySelector("canvas") || previewEl.querySelector("img");
            if (!source) {
                setPlaceholder("이미지를 찾을 수 없어요", "QR 코드를 다시 생성해 주세요.", true);
                setDownloadReady(false);
                currentQr = null;
                return false;
            }
            const layout = downloadLayout(currentQr.options.size, currentQr.quietZone);
            const canvas = doc.createElement("canvas");
            canvas.width = layout.width;
            canvas.height = layout.height;
            const context = canvas.getContext("2d");
            context.fillStyle = currentQr.options.background;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(source, layout.offsetX, layout.offsetY, currentQr.options.size, currentQr.options.size);

            const link = doc.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "toolify-qr-code.png";
            doc.body.appendChild(link);
            link.click();
            link.remove();
            return true;
        }

        function resetOptions() {
            $("#qr-size").value = String(DEFAULTS.size);
            $("#qr-margin").value = String(DEFAULTS.margin);
            $("#qr-level").value = DEFAULTS.level;
            $("#qr-foreground").value = DEFAULTS.foreground;
            $("#qr-background").value = DEFAULTS.background;
            updateColorStatus();
            if (currentQr || textEl.value.trim()) generateQr();
        }

        textEl.addEventListener("input", () => { updateTextCount(); markStale(); });
        textEl.addEventListener("keydown", (event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); generateQr(); } });
        doc.querySelectorAll("[data-sample]").forEach((button) => button.addEventListener("click", () => { textEl.value = SAMPLES[button.dataset.sample]; updateTextCount(); markStale(); textEl.focus(); }));
        $("#qr-clear-btn").addEventListener("click", () => { textEl.value = ""; updateTextCount(); currentQr = null; setDownloadReady(false); setPlaceholder("QR 미리보기", "생성한 QR 코드가 여기에 표시됩니다.", false); $("#preview-description").textContent = "내용을 입력한 뒤 QR 코드를 생성하세요."; textEl.focus(); });
        ["#qr-size", "#qr-margin", "#qr-level", "#qr-foreground", "#qr-background"].forEach((selector) => $(selector).addEventListener("change", () => { updateColorStatus(); if (currentQr) generateQr(); else updateMeta(getOptions(), 0); }));
        $("#qr-generate-btn").addEventListener("click", generateQr);
        $("#qr-download-btn").addEventListener("click", downloadQr);
        $("#qr-reset-btn").addEventListener("click", resetOptions);

        updateTextCount();
        updateColorStatus();
        updateMeta(getOptions(), 0);
        setDownloadReady(false);
    }

    return { DEFAULTS, SAMPLES, normalizeHex, hexToRgb, relativeLuminance, contrastRatio, normalizeOptions, calculateQuietZone, downloadLayout, init };
});
