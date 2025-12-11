// 이미지 압축기 전용 JS

const fileInput = document.getElementById("file-input");
const selectFilesBtn = document.getElementById("select-files-btn");
const dropZone = document.getElementById("drop-zone");
const qualityRange = document.getElementById("quality-range");
const qualityValue = document.getElementById("quality-value");
const maxWidthInput = document.getElementById("max-width");
const maxHeightInput = document.getElementById("max-height");
const convertJpgCheckbox = document.getElementById("convert-jpg");
const compressAllBtn = document.getElementById("compress-all-btn");
const imageListEl = document.getElementById("image-list");
const resultSummaryEl = document.getElementById("result-summary");

let images = []; // { file, originalSize, compressedBlob, compressedSize, name, mime, width, height }

function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
        value = value / 1024;
        i++;
    }
    return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

// ★ 절감률/증가율 표시 개선
function calcSavingRate(original, compressed) {
    if (!original || !compressed || original === 0) return "-";
    const diff = original - compressed;
    const rate = (diff / original) * 100;

    // 거의 차이가 없으면
    if (Math.abs(rate) < 0.05) {
        return "변화 없음";
    }

    if (rate >= 0) {
        // 용량이 줄어든 경우
        return `${rate.toFixed(1)}% 절감`;
    } else {
        // 오히려 커진 경우
        const inc = -rate;
        return `${inc.toFixed(1)}% 증가`;
    }
}

function updateQualityLabel() {
    qualityValue.textContent = `${qualityRange.value}%`;
}

qualityRange.addEventListener("input", updateQualityLabel);
updateQualityLabel();

// 파일 선택 버튼
selectFilesBtn.addEventListener("click", () => {
    fileInput.click();
});

// 드래그 & 드롭
["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
    });
});
["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
    });
});

dropZone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    handleFiles(files);
});

fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
});

// 이미지 파일만 필터링
function handleFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const newItems = imageFiles.map((file) => ({
        file,
        originalSize: file.size,
        compressedBlob: null,
        compressedSize: null,
        name: file.name,
        mime: file.type,
        width: null,
        height: null,
    }));

    images = images.concat(newItems);
    renderImageList();
    compressAllBtn.disabled = false;
    resultSummaryEl.textContent = `총 ${images.length}개의 이미지가 업로드되었습니다. 압축 옵션을 설정한 뒤, 전체 압축하기 버튼을 눌러주세요.`;
}

// 이미지 리스트 렌더링
function renderImageList() {
    imageListEl.innerHTML = "";

    if (images.length === 0) {
        compressAllBtn.disabled = true;
        resultSummaryEl.textContent =
            "아직 업로드된 이미지가 없습니다. 이미지를 올리면 원본 용량과 압축 후 용량을 비교해서 보여줍니다.";
        return;
    }

    let totalOriginal = 0;
    let totalCompressed = 0;

    images.forEach((item) => {
        totalOriginal += item.originalSize || 0;
        totalCompressed += item.compressedSize || 0;

        const row = document.createElement("div");
        row.className = "image-item";

        const thumb = document.createElement("div");
        thumb.className = "image-thumb";

        const img = document.createElement("img");
        img.alt = item.name;
        // 미리보기는 압축된 게 있으면 그것으로, 없으면 object URL
        if (item.compressedBlob) {
            img.src = URL.createObjectURL(item.compressedBlob);
        } else {
            img.src = URL.createObjectURL(item.file);
        }
        thumb.appendChild(img);

        const infoMain = document.createElement("div");
        infoMain.className = "image-info-main";

        const nameEl = document.createElement("div");
        nameEl.className = "image-name";
        nameEl.textContent = item.name;
        infoMain.appendChild(nameEl);

        const metaEl = document.createElement("div");
        metaEl.className = "image-meta";

        const sizeSpan = document.createElement("span");
        sizeSpan.textContent = `원본 ${formatBytes(item.originalSize)}`;

        const afterSpan = document.createElement("span");
        if (item.compressedSize != null) {
            afterSpan.textContent = `압축 후 ${formatBytes(item.compressedSize)}`;
        } else {
            afterSpan.textContent = `압축 전`;
        }

        const rateSpan = document.createElement("span");
        if (item.compressedSize != null) {
            rateSpan.textContent = calcSavingRate(
                item.originalSize,
                item.compressedSize
            );
        } else {
            rateSpan.textContent = "아직 압축 안 됨";
        }

        metaEl.appendChild(sizeSpan);
        metaEl.appendChild(afterSpan);
        metaEl.appendChild(rateSpan);
        infoMain.appendChild(metaEl);

        const actions = document.createElement("div");
        actions.className = "image-actions";

        const badge = document.createElement("div");
        badge.className = "compress-badge";
        badge.textContent =
            item.compressedSize != null ? "압축 완료" : "대기 중";
        actions.appendChild(badge);

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "download-btn";
        downloadBtn.textContent = "다운로드";
        downloadBtn.disabled = !item.compressedBlob;
        downloadBtn.addEventListener("click", () => {
            if (!item.compressedBlob) return;
            const a = document.createElement("a");
            const ext = item.compressedBlob.type.includes("png")
                ? "png"
                : "jpg";
            const baseName = item.name.replace(/\.[^/.]+$/, "");
            a.href = URL.createObjectURL(item.compressedBlob);
            a.download = `${baseName}-compressed.${ext}`;
            a.click();
        });

        actions.appendChild(downloadBtn);

        row.appendChild(thumb);
        row.appendChild(infoMain);
        row.appendChild(actions);

        imageListEl.appendChild(row);
    });

    if (totalCompressed > 0) {
        const savingRate = calcSavingRate(totalOriginal, totalCompressed);
        resultSummaryEl.textContent = `총 원본 용량 ${formatBytes(
            totalOriginal
        )} → 압축 후 ${formatBytes(
            totalCompressed
        )} (${savingRate})`;
    } else {
        resultSummaryEl.textContent = `총 ${images.length}개의 이미지가 업로드되었습니다. 아직 압축은 진행되지 않았습니다.`;
    }
}

// 실제 압축 처리 (캔버스 사용)
function compressImage(item, { quality, maxWidth, maxHeight, convertToJpg }) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (maxWidth || maxHeight) {
                const ratio = width / height;
                if (maxWidth && width > maxWidth) {
                    width = maxWidth;
                    height = Math.round(width / ratio);
                }
                if (maxHeight && height > maxHeight) {
                    height = maxHeight;
                    width = Math.round(height * ratio);
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(img, 0, 0, width, height);

            // ★ PNG → JPG 변환 옵션
            const outputMime =
                (convertToJpg && item.file.type === "image/png")
                    ? "image/jpeg"
                    : (item.file.type || "image/jpeg");

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error("압축 실패"));
                    }

                    let finalBlob = blob;
                    let finalSize = blob.size;

                    // ★ PNG인데 변환 옵션을 안 썼고, 또는 어떤 이미지든
                    //    "압축 후" 용량이 더 크면 → 원본 유지
                    if (!convertToJpg && blob.size >= item.originalSize) {
                        finalBlob = item.file;
                        finalSize = item.originalSize;
                    }

                    item.compressedBlob = finalBlob;
                    item.compressedSize = finalSize;
                    resolve(item);
                },
                outputMime,
                quality
            );
        };

        img.onerror = () => reject(new Error("이미지 로드 실패"));

        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("파일 읽기 실패"));

        reader.readAsDataURL(item.file);
    });
}

// 전체 압축 버튼
compressAllBtn.addEventListener("click", async () => {
    if (images.length === 0) return;

    compressAllBtn.disabled = true;
    compressAllBtn.textContent = "압축 중...";

    const quality = Number(qualityRange.value) / 100;
    const maxWidth = maxWidthInput.value ? Number(maxWidthInput.value) : null;
    const maxHeight = maxHeightInput.value ? Number(maxHeightInput.value) : null;
    const convertToJpg = convertJpgCheckbox.checked;

    for (let i = 0; i < images.length; i++) {
        const item = images[i];
        try {
            await compressImage(item, {
                quality,
                maxWidth,
                maxHeight,
                convertToJpg,
            });
        } catch (e) {
            console.error("압축 실패:", e);
        }
        renderImageList();
    }

    compressAllBtn.disabled = false;
    compressAllBtn.textContent = "선택한 옵션으로 전체 압축하기";
});
