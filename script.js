// 코코마사지 인터랙션: 모바일 메뉴 토글, FAQ 아코디언
(function () {
  "use strict";
  // 모바일 메뉴
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // 모바일: 드롭다운 펼치기
  document.querySelectorAll(".has-sub > a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width:680px)").matches) {
        var li = a.parentElement;
        // 서브메뉴가 있으면 첫 탭에서 펼치기
        if (li.querySelector(".submenu, .submenu-wide") && !li.classList.contains("open")) {
          e.preventDefault();
          li.classList.add("open");
        }
      }
    });
  });
  // FAQ 아코디언
  document.querySelectorAll(".faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var answer = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      answer.style.maxHeight = expanded ? null : answer.scrollHeight + "px";
    });
  });
})();
