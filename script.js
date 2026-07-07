/* ============================================================
   KJT Services — small vanilla JS enhancements (v2).
   Everything here degrades gracefully: with JS disabled the
   nav stays visible, gallery tiles are static, the FAQ
   accordions still work (native <details>), the back-to-top
   link is simply always shown, and the form still submits
   normally.
   ============================================================ */
(function () {
  "use strict";

  // The "js" class (which enables JS-only behaviours like the collapsed
  // mobile nav) is added by an inline <script> in <head> so it applies
  // before first paint.

  /* ---------- Mobile nav toggle ---------- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function closeNav() {
    if (!header) return;
    header.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  if (header && toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close the menu after tapping a link (nice on one-page anchors).
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    // Close on Escape.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) {
        closeNav();
        toggle.focus();
      }
    });

    // Reset state if the viewport grows past the mobile breakpoint
    // (must match the 880px nav breakpoint in styles.css).
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 880) closeNav();
    });
  }

  /* ---------- Scroll-linked bits: header shadow + back-to-top ---------- */
  var backTop = document.querySelector(".back-to-top");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (header) header.classList.toggle("scrolled", y > 8);
    if (backTop) backTop.classList.toggle("is-visible", y > 520);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) {
      // Stagger reveal siblings inside the same container so grids of
      // cards cascade in instead of landing all at once (capped so a
      // long grid never waits noticeably).
      var i = 0, sib = el;
      while (i < 5 && (sib = sib.previousElementSibling)) {
        if (sib.classList.contains("reveal")) i++;
      }
      el.style.setProperty("--reveal-delay", (i * 0.08) + "s");
      io.observe(el);
    });
  } else {
    // No observer support or reduced motion: show everything.
    revealEls.forEach(function (el) { el.classList.add("revealed"); });
  }

  /* ---------- Stat count-up (stats strip on the main page) ---------- */
  // The final values live in the HTML (e.g. "300+", "5★"), so with no
  // JS or reduced motion the real numbers simply show. With JS, the
  // leading number counts up from 0 the first time it scrolls into
  // view, keeping whatever suffix follows it.
  var statNums = document.querySelectorAll(".stat-num");

  if (statNums.length && "IntersectionObserver" in window && !reduceMotion) {
    var statIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          statIo.unobserve(entry.target);
          var el = entry.target;
          var m = el.textContent.match(/^(\d+)(.*)$/);
          if (!m) return;
          var target = parseInt(m[1], 10);
          var suffix = m[2];
          var start = null;
          var DURATION = 900;
          function tick(now) {
            if (start === null) start = now;
            var t = Math.min((now - start) / DURATION, 1);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (t < 1) window.requestAnimationFrame(tick);
          }
          window.requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    statNums.forEach(function (el) { statIo.observe(el); });
  }

  /* ---------- Gallery lightbox ---------- */
  var tileButtons = document.querySelectorAll(".tile-btn");

  if (tileButtons.length) {
    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Enlarged gallery image");
    lightbox.hidden = true;
    lightbox.innerHTML =
      '<div class="lightbox-inner">' +
      '  <button type="button" class="lightbox-close" aria-label="Close">&times;</button>' +
      '  <div class="lightbox-media"></div>' +
      '  <p class="lightbox-caption"></p>' +
      "</div>";
    document.body.appendChild(lightbox);

    var mediaBox = lightbox.querySelector(".lightbox-media");
    var captionBox = lightbox.querySelector(".lightbox-caption");
    var closeBtn = lightbox.querySelector(".lightbox-close");
    var lastFocused = null;

    // Build the lightbox caption from the tile's two-line figcaption
    // (bold title + detail line). Falls back to the caption's plain
    // text if the owner ever replaces it with a single line.
    function fillCaption(figure) {
      captionBox.textContent = "";
      if (!figure) return;
      var title = figure.querySelector(".tile-title");
      var sub = figure.querySelector(".tile-sub");
      if (title) {
        var strong = document.createElement("strong");
        strong.textContent = title.textContent;
        captionBox.appendChild(strong);
      }
      if (sub) {
        var span = document.createElement("span");
        span.className = "lightbox-sub";
        span.textContent = sub.textContent;
        captionBox.appendChild(span);
      }
      if (!title && !sub) {
        var caption = figure.querySelector("figcaption");
        captionBox.textContent = caption ? caption.textContent : "";
      }
    }

    function openLightbox(btn) {
      var figure = btn.closest("figure");
      // Clone whatever is inside the tile button (SVG placeholder now,
      // or a real <img> once the owner swaps photos in).
      mediaBox.innerHTML = "";
      var media = btn.firstElementChild;
      if (media) {
        var clone = media.cloneNode(true);
        // The SVG placeholders define gradient ids; rename them on the
        // clone so the document never holds duplicate ids while open.
        clone.querySelectorAll("[id]").forEach(function (el) {
          el.setAttribute("id", "lb-" + el.getAttribute("id"));
        });
        clone.querySelectorAll("[fill]").forEach(function (el) {
          var fill = el.getAttribute("fill");
          if (fill && fill.indexOf("url(#") === 0) {
            el.setAttribute("fill", "url(#lb-" + fill.slice(5));
          }
        });
        mediaBox.appendChild(clone);
      }
      fillCaption(figure);
      lastFocused = btn;
      lightbox.hidden = false;
      // Lock the real scroller: html's overflow-x:clip stops body's
      // overflow from propagating to the viewport, so hiding body
      // overflow alone doesn't stop the page scrolling behind the
      // dialog in Firefox/Chromium (or on iOS).
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    tileButtons.forEach(function (btn) {
      btn.addEventListener("click", function () { openLightbox(btn); });
    });

    closeBtn.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
      // Keep focus inside the dialog while it is open.
      if (e.key === "Tab" && !lightbox.hidden) {
        e.preventDefault();
        closeBtn.focus();
      }
    });
  }

  /* ---------- Testimonial carousel ---------- */
  // One review shows at a time, fading in; auto-advances unless the
  // visitor is reading (hover/focus) or prefers reduced motion.
  // Without JS the CSS keeps all reviews stacked and controls hidden.
  var tCarousel = document.querySelector(".t-carousel");

  if (tCarousel) {
    var tSlides = Array.prototype.slice.call(tCarousel.querySelectorAll(".t-slide"));
    var tDotsBox = tCarousel.querySelector(".t-dots");
    var tIndex = 0;
    var tTimer = null;

    var tDots = tSlides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "t-dot";
      dot.setAttribute("aria-label", "Show review " + (i + 1) + " of " + tSlides.length);
      dot.addEventListener("click", function () { tShow(i); tRestart(); });
      tDotsBox.appendChild(dot);
      return dot;
    });

    function tShow(i) {
      tIndex = (i + tSlides.length) % tSlides.length;
      tSlides.forEach(function (slide, j) { slide.hidden = j !== tIndex; });
      tDots.forEach(function (dot, j) { dot.classList.toggle("is-active", j === tIndex); });
    }

    function tStop() {
      if (tTimer) { window.clearInterval(tTimer); tTimer = null; }
    }

    function tRestart() {
      tStop();
      if (!reduceMotion) {
        tTimer = window.setInterval(function () { tShow(tIndex + 1); }, 6500);
      }
    }

    tCarousel.querySelector(".t-prev").addEventListener("click", function () { tShow(tIndex - 1); tRestart(); });
    tCarousel.querySelector(".t-next").addEventListener("click", function () { tShow(tIndex + 1); tRestart(); });

    // don't rotate away from a review someone is reading or tabbing through
    tCarousel.addEventListener("mouseenter", tStop);
    tCarousel.addEventListener("mouseleave", tRestart);
    tCarousel.addEventListener("focusin", tStop);
    tCarousel.addEventListener("focusout", tRestart);

    tShow(0);
    tRestart();
  }

  /* ---------- Quote form niceties ---------- */
  var quoteForm = document.getElementById("quote-form");

  if (quoteForm) {
    // Don't allow a preferred date in the past.
    var dateInput = document.getElementById("date");
    if (dateInput) {
      var today = new Date();
      var iso =
        today.getFullYear() +
        "-" + String(today.getMonth() + 1).padStart(2, "0") +
        "-" + String(today.getDate()).padStart(2, "0");
      dateInput.min = iso;
    }

    // Remember the submit button's real label so we can restore it.
    var initialBtn = quoteForm.querySelector('button[type="submit"]');
    var defaultLabel = initialBtn ? initialBtn.textContent : "Send my quote request";

    // Prevent double submits and give feedback while sending.
    quoteForm.addEventListener("submit", function () {
      var submitBtn = quoteForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = "Sending…";
        submitBtn.setAttribute("aria-busy", "true");
        // Disable after the current tick so the submit still goes through.
        window.setTimeout(function () { submitBtn.disabled = true; }, 0);
      }
    });

    // Restore the button whenever the page is shown — including
    // back/forward-cache restores after visiting FormSubmit's
    // confirmation page — so a second request is always possible.
    window.addEventListener("pageshow", function () {
      var submitBtn = quoteForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
        submitBtn.textContent = defaultLabel;
      }
    });

    // Returning from FormSubmit's redirect (?sent=1): show the
    // thank-you banner and move focus to it so screen readers
    // announce the confirmation. (Without JS the #quote-sent
    // fragment shows the banner via the CSS :target rule.)
    if (new URLSearchParams(window.location.search).get("sent")) {
      var sentNote = document.getElementById("quote-sent");
      if (sentNote) {
        sentNote.classList.add("is-shown");
        sentNote.focus();
      }
    }
  }
})();
