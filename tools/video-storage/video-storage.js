(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.VideoStorageCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";
    const BITRATES = { "720-24":4,"720-30":5,"720-60":7.5,"720-120":13,"1080-24":8,"1080-30":10,"1080-60":16,"1080-120":28,"1440-24":16,"1440-30":20,"1440-60":30,"1440-120":50,"2160-24":35,"2160-30":45,"2160-60":68,"2160-120":120,"4320-24":80,"4320-30":100,"4320-60":160,"4320-120":280 };
    const USE_PRESETS = {
        phone:{resolution:"2160",fps:"30",codec:"h265",audio:128,cameras:1,storage:128,unit:"GB",daily:1},
        camera:{resolution:"2160",fps:"60",codec:"h264",audio:320,cameras:1,storage:256,unit:"GB",daily:2},
        cctv:{resolution:"1080",fps:"30",codec:"h265",audio:0,cameras:4,storage:2,unit:"TB",daily:24},
        dashcam:{resolution:"1440",fps:"30",codec:"h265",audio:128,cameras:2,storage:256,unit:"GB",daily:4}
    };
    function estimatedVideoBitrate(resolution, fps, codec) { return (BITRATES[`${resolution}-${fps}`] || 10) * (codec === "h265" ? 0.65 : 1); }
    function calculate(input) {
        const cameras = Math.max(1, Number(input.cameras) || 1);
        const totalMbps = (Math.max(0, Number(input.videoMbps) || 0) + Math.max(0, Number(input.audioKbps) || 0) / 1000) * cameras;
        const gbPerSecond = totalMbps / 8 / 1000;
        const perMinuteGB = gbPerSecond * 60, perHourGB = perMinuteGB * 60;
        const requiredGB = gbPerSecond * Math.max(0, Number(input.durationSeconds) || 0);
        const storageGB = Math.max(0, Number(input.storageGB) || 0);
        const usableGB = storageGB * Math.min(100, Math.max(0, Number(input.usablePercent) || 0)) / 100;
        const fitSeconds = gbPerSecond > 0 ? usableGB / gbPerSecond : 0;
        const dailyHours = Math.min(24, Math.max(0.1, Number(input.dailyHours) || 24));
        return { totalMbps, perMinuteGB, perHourGB, requiredGB, usableGB, fitSeconds, retentionDays: fitSeconds / 3600 / dailyHours };
    }
    function formatSize(gb) {
        if (gb < 0.001) return `${(gb * 1000000).toFixed(1)} KB`;
        if (gb < 1) return `${(gb * 1000).toFixed(gb < 0.1 ? 1 : 0)} MB`;
        if (gb < 1000) return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
        return `${(gb / 1000).toFixed(2)} TB`;
    }
    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return "0분";
        const minutes = seconds / 60;
        if (minutes < 60) return `약 ${minutes.toFixed(minutes < 10 ? 1 : 0)}분`;
        const hours = minutes / 60;
        if (hours < 48) return `약 ${hours.toFixed(hours < 10 ? 1 : 0)}시간`;
        return `약 ${(hours / 24).toFixed(1)}일`;
    }
    function init(doc) {
        const $ = (s) => doc.querySelector(s), num = (s) => Math.max(0, Number($(s).value) || 0);
        let automaticBitrate = true;
        function updateBitrate() { $("#bitrate").value = estimatedVideoBitrate($("#resolution").value, $("#fps").value, $("#codec").value).toFixed(1); automaticBitrate = true; }
        function durationSeconds() { return num("#duration-value") * ({minute:60,hour:3600,day:86400}[$("#duration-unit").value] || 3600); }
        function currentInput(storageGB) { return { videoMbps:num("#bitrate"),audioKbps:num("#audio-bitrate"),cameras:num("#camera-count"),durationSeconds:durationSeconds(),storageGB,usablePercent:num("#usable-percent"),dailyHours:num("#daily-hours") }; }
        function render() {
            const storageGB = num("#storage-value") * ($("#storage-unit").value === "TB" ? 1000 : 1), r = calculate(currentInput(storageGB));
            $("#required-storage").textContent = `약 ${formatSize(r.requiredGB)} 필요`;
            $("#per-hour-size").textContent = `전체 카메라 1시간당 ${formatSize(r.perHourGB)}`;
            $("#recordable-time").textContent = `${formatTime(r.fitSeconds)} 녹화`;
            $("#usable-storage").textContent = `실사용 가능 용량 ${formatSize(r.usableGB)} 기준`;
            $("#per-minute").textContent = formatSize(r.perMinuteGB); $("#per-hour").textContent = formatSize(r.perHourGB);
            $("#fit-time").textContent = formatTime(r.fitSeconds); $("#retention-days").textContent = `${r.retentionDays.toFixed(r.retentionDays < 10 ? 1 : 0)}일`;
            $("#estimate-note").textContent = automaticBitrate ? `선택한 설정의 예상 영상 비트레이트 ${num("#bitrate").toFixed(1)}Mbps를 적용했습니다.` : "직접 입력한 비트레이트를 적용했습니다.";
            $("#capacity-list").innerHTML = [64,128,256,512,1000].map((gb) => { const x=calculate(currentInput(gb)); return `<div class="capacity-item"><strong>${gb===1000?"1TB":`${gb}GB`}</strong><span>${formatTime(x.fitSeconds)}</span></div>`; }).join("");
        }
        ["#resolution","#fps","#codec"].forEach((s) => $(s).addEventListener("change", () => { updateBitrate(); render(); }));
        $("#bitrate").addEventListener("input", () => { automaticBitrate = false; render(); });
        doc.querySelectorAll("input:not(#bitrate), #duration-unit, #storage-unit").forEach((el) => { el.addEventListener("input", render); el.addEventListener("change", render); });
        doc.querySelectorAll("[data-use]").forEach((button) => button.addEventListener("click", () => {
            const p=USE_PRESETS[button.dataset.use]; $("#resolution").value=p.resolution; $("#fps").value=p.fps; $("#codec").value=p.codec; $("#audio-bitrate").value=p.audio; $("#camera-count").value=p.cameras; $("#storage-value").value=p.storage; $("#storage-unit").value=p.unit; $("#daily-hours").value=p.daily; updateBitrate(); render();
        }));
        updateBitrate(); render();
    }
    return { estimatedVideoBitrate, calculate, formatSize, formatTime, init };
});
