const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
        navLinks.classList.toggle("open");
    });

    navLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
            navLinks.classList.remove("open");
        }
    });
}

// === IndexNow 자동 제출 ===
function pingIndexNowOnce(urls) {
    // 같은 브라우저에서 여러 번 호출되는 것 방지
    if (localStorage.getItem("indexnow-pinged")) return;

    fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            host: "toolify.kr",
            key: "61434b5a3f9d4cb680b2bd861e557f31",
            keyLocation: "https://toolify.kr/61434b5a3f9d4cb680b2bd861e557f31.txt",
            urlList: urls,
        }),
    }).catch(() => {
        // 네트워크 오류 등은 무시 (사이트 기능에는 영향 없음)
    });

    localStorage.setItem("indexnow-pinged", "1");
}

// 페이지 로드 시 색인 알림을 1회만 전송
window.addEventListener("load", () => {
    pingIndexNowOnce([
        "https://toolify.kr/",
        "https://toolify.kr/tools/date-calculator/",
        "https://toolify.kr/tools/text-counter/"
    ]);
});

// =======================
// FAQ 토글 기능
// =======================
document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
        const item = btn.parentElement; // .faq-item
        item.classList.toggle("active");
    });
});