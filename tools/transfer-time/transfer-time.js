(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.TransferTimeCalculator = api;
    if (typeof document !== "undefined") api.init(document);
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";
    const PRESETS = {
        internet100:{speed:100,unit:"Mbps",efficiency:85}, internet500:{speed:500,unit:"Mbps",efficiency:85}, internet1g:{speed:1,unit:"Gbps",efficiency:85},
        wifi:{speed:250,unit:"Mbps",efficiency:70}, nas:{speed:110,unit:"MBps",efficiency:90}, ssd:{speed:400,unit:"MBps",efficiency:95}
    };
    function sizeToBytes(value, unit) { return Math.max(0, Number(value) || 0) * ({MB:1e6,GB:1e9,TB:1e12}[unit] || 1e9); }
    function speedToBytesPerSecond(value, unit) {
        const n = Math.max(0, Number(value) || 0);
        return n * ({Mbps:1e6/8,Gbps:1e9/8,MBps:1e6,GBps:1e9}[unit] || 1e6/8);
    }
    function calculate(input) {
        const bytes = sizeToBytes(input.fileSize, input.fileUnit) * Math.max(1, Math.floor(Number(input.fileCount) || 1));
        const idealBps = speedToBytesPerSecond(input.speed, input.speedUnit);
        const efficiency = Math.min(100, Math.max(1, Number(input.efficiency) || 1)) / 100;
        const realBps = idealBps * efficiency;
        return { bytes, idealBps, realBps, idealSeconds:idealBps>0?bytes/idealBps:Infinity, realSeconds:realBps>0?bytes/realBps:Infinity, overheadSeconds:realBps>0?bytes/realBps-bytes/idealBps:Infinity, perGbSeconds:realBps>0?1e9/realBps:Infinity };
    }
    function formatDuration(seconds) {
        if (!Number.isFinite(seconds)) return "계산 불가";
        if (seconds < 1) return `${seconds.toFixed(2)}초`;
        const total = Math.round(seconds), days=Math.floor(total/86400), hours=Math.floor(total%86400/3600), minutes=Math.floor(total%3600/60), secs=total%60;
        const parts=[]; if(days)parts.push(`${days}일`); if(hours)parts.push(`${hours}시간`); if(minutes)parts.push(`${minutes}분`); if(secs&&parts.length<2)parts.push(`${secs}초`); return parts.slice(0,2).join(" ")||"0초";
    }
    function formatSize(bytes) { if(bytes>=1e12)return `${(bytes/1e12).toFixed(2)} TB`; if(bytes>=1e9)return `${(bytes/1e9).toFixed(bytes<1e10?2:1)} GB`; return `${(bytes/1e6).toFixed(1)} MB`; }
    function finishDate(seconds, now) { return Number.isFinite(seconds) ? new Date(now.getTime()+seconds*1000) : null; }
    function init(doc) {
        const $=(s)=>doc.querySelector(s), num=(s)=>Math.max(0,Number($(s).value)||0); let now=new Date();
        function input(overrides={}) { return {fileSize:num("#file-size"),fileUnit:$("#file-unit").value,fileCount:num("#file-count"),speed:num("#speed-value"),speedUnit:$("#speed-unit").value,efficiency:num("#efficiency"),...overrides}; }
        function formatClock(date) { if(!date)return "-"; const today=new Date(), dayOffset=Math.floor((new Date(date.getFullYear(),date.getMonth(),date.getDate())-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000); const day=dayOffset===0?"오늘":dayOffset===1?"내일":`${date.getMonth()+1}/${date.getDate()}`; return `${day} ${date.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}`; }
        function render() {
            now=new Date(); const r=calculate(input()), finish=finishDate(r.realSeconds,now);
            $("#total-size").textContent=formatSize(r.bytes); $("#real-speed").textContent=`${(r.realBps/1e6).toFixed(r.realBps<1e7?2:1)} MB/s`;
            $("#real-time").textContent=formatDuration(r.realSeconds); $("#ideal-time").textContent=formatDuration(r.idealSeconds); $("#per-gb-time").textContent=formatDuration(r.perGbSeconds); $("#overhead-time").textContent=formatDuration(r.overheadSeconds);
            $("#finish-clock").textContent=formatClock(finish); $("#finish-time").textContent=finish?`지금 시작하면 ${formatClock(finish)} 완료 예상`:"속도를 입력하면 완료 시각을 계산합니다.";
            const comparisons=[{label:"100Mbps",speed:100,unit:"Mbps"},{label:"500Mbps",speed:500,unit:"Mbps"},{label:"1Gbps",speed:1,unit:"Gbps"},{label:"2.5Gbps",speed:2.5,unit:"Gbps"},{label:"100MB/s",speed:100,unit:"MBps"}];
            $("#speed-comparison").innerHTML=comparisons.map(x=>{const c=calculate(input({speed:x.speed,speedUnit:x.unit}));return `<div class="comparison-item"><strong>${x.label}</strong><span>${formatDuration(c.realSeconds)}</span></div>`}).join("");
        }
        doc.querySelectorAll("input, select").forEach(el=>{el.addEventListener("input",render);el.addEventListener("change",render)});
        doc.querySelectorAll("[data-efficiency]").forEach(button=>button.addEventListener("click",()=>{$("#efficiency").value=button.dataset.efficiency;doc.querySelectorAll("[data-efficiency]").forEach(b=>b.classList.toggle("active",b===button));render()}));
        doc.querySelectorAll("[data-preset]").forEach(button=>button.addEventListener("click",()=>{const p=PRESETS[button.dataset.preset];$("#speed-value").value=p.speed;$("#speed-unit").value=p.unit;$("#efficiency").value=p.efficiency;doc.querySelectorAll("[data-efficiency]").forEach(b=>b.classList.toggle("active",Number(b.dataset.efficiency)===p.efficiency));render()})); render();
    }
    return { sizeToBytes, speedToBytesPerSecond, calculate, formatDuration, formatSize, finishDate, init };
});
