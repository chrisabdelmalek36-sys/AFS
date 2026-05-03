/* =========================================================
   BASHA — Main JavaScript
   Scroll reveals, navigation, smooth transitions
   ========================================================= */

(function () {
  "use strict";

  /* -----  SCROLL REVEAL (Intersection Observer)  ----- */
  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: reveal everything immediately
    revealElements.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* -----  NAVIGATION — scroll background  ----- */
  var nav = document.getElementById("nav");

  if (nav) {
    var lastScroll = 0;

    function onScroll() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollY > 60) {
        nav.classList.add("is-scrolled");
      } else {
        nav.classList.remove("is-scrolled");
      }
      lastScroll = scrollY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* -----  NAVIGATION — mobile toggle  ----- */
  var toggle = document.querySelector(".nav__toggle");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("is-open");
      var isOpen = nav.classList.contains("is-open");
      toggle.setAttribute("aria-expanded", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    // Close when a link is clicked
    var navLinks = nav.querySelectorAll(".nav__links a");
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* -----  SMOOTH PAGE TRANSITIONS (subtle fade)  ----- */
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.8s cubic-bezier(0.22,0.61,0.36,1)";

  window.addEventListener("DOMContentLoaded", function () {
    // Small delay to let fonts load
    requestAnimationFrame(function () {
      document.body.style.opacity = "1";
    });
  });

  // If body is already loaded (script is deferred)
  if (document.readyState === "complete" || document.readyState === "interactive") {
    requestAnimationFrame(function () {
      document.body.style.opacity = "1";
    });
  }

  /* -----  PARALLAX-LITE for hero backgrounds  ----- */
  var heroBg = document.querySelector(".hero__bg, .page-hero__bg, .campaign-hero__bg");
  var heritageSkyline = document.querySelector(".maison-hero__skyline");
  var heritageTitle = document.querySelector(".maison-hero__title");

  if (heroBg || heritageSkyline) {
    window.addEventListener(
      "scroll",
      function () {
        var scrollY = window.pageYOffset;
        var vh = window.innerHeight;
        if (scrollY > vh * 1.5) return;

        if (heroBg) {
          heroBg.style.transform =
            "scale(1.05) translateY(" + scrollY * 0.15 + "px)";
        }
        if (heritageSkyline) {
          heritageSkyline.style.transform =
            "translateY(" + scrollY * 0.18 + "px)";
        }
        if (heritageTitle) {
          heritageTitle.style.transform =
            "translateY(" + scrollY * -0.08 + "px)";
        }
      },
      { passive: true }
    );
  }

  /* -----  CURSOR TRAIL (very subtle gold dot on desktop)  ----- */
  if (window.matchMedia("(pointer: fine)").matches) {
    var cursor = document.createElement("div");
    cursor.style.cssText =
      "position:fixed;top:0;left:0;width:6px;height:6px;border-radius:50%;" +
      "background:#c9a84c;pointer-events:none;z-index:9999;opacity:0;" +
      "transition:opacity 0.4s,transform 0.15s cubic-bezier(0.22,0.61,0.36,1);" +
      "mix-blend-mode:difference;";
    document.body.appendChild(cursor);

    var cursorVisible = false;

    document.addEventListener("mousemove", function (e) {
      if (!cursorVisible) {
        cursor.style.opacity = "0.7";
        cursorVisible = true;
      }
      cursor.style.transform =
        "translate(" + e.clientX + "px," + e.clientY + "px) translate(-50%,-50%)";
    });

    document.addEventListener("mouseleave", function () {
      cursor.style.opacity = "0";
      cursorVisible = false;
    });

    // Scale up on interactive elements
    var interactives = document.querySelectorAll("a, button, .look, .episode, .portrait");
    interactives.forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        cursor.style.width = "24px";
        cursor.style.height = "24px";
        cursor.style.opacity = "0.4";
      });
      el.addEventListener("mouseleave", function () {
        cursor.style.width = "6px";
        cursor.style.height = "6px";
        cursor.style.opacity = "0.7";
      });
    });
  }
})();
