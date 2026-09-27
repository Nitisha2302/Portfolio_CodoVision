(() => {
  "use strict";

  const pages = window.CODOVISION_PAGES || [];
  const REAL3D_CSS = "vendor/real3d-flipbook/css/flipbook.style.css";
  const REAL3D_JS = "vendor/real3d-flipbook/js/flipbook.min.js";
  const PAGEFLIP_JS = "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js";

  const els = {
    book: document.getElementById("flipbook"),
    loader: document.getElementById("loader"),
    prev: document.getElementById("prevBtn"),
    next: document.getElementById("nextBtn"),
    slider: document.getElementById("pageSlider"),
    pageLabel: document.getElementById("pageLabel"),
    pageTitle: document.getElementById("pageTitle"),
    spreadBadge: document.getElementById("spreadBadge"),
    engineBadge: document.getElementById("engineBadge"),
    toc: document.getElementById("toc"),
    tocList: document.getElementById("tocList"),
    tocBtn: document.getElementById("tocBtn"),
    tocClose: document.getElementById("tocClose"),
    fullscreenBtn: document.getElementById("fullscreenBtn"),
    pageJumpForm: document.getElementById("pageJumpForm"),
    pageJumpInput: document.getElementById("pageJumpInput"),
    pageJumpTotal: document.getElementById("pageJumpTotal"),
  };

  /** A4 portrait leaf (mm ratio). Open book ≈ √2 landscape. */
  const A4_RATIO = 210 / 297;
  const SPREAD_RATIO = 2 * A4_RATIO; // open-book / full-mockup width÷height
  const INTERIOR_LEAVES = pages.length * 2;
  const END_LEAF = 1 + INTERIOR_LEAVES;
  const TOTAL_LEAVES = END_LEAF + 1;
  const VIEW_COUNT = 1 + pages.length + 1; // cover + spreads + end

  /** Sticky layout used by the current PageFlip instance (set via syncLayoutMode). */
  let activeCompact = false;

  function isCompactLayout() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  function syncLayoutMode() {
    activeCompact = isCompactLayout();
    document.body.classList.toggle("is-compact", activeCompact);
    return activeCompact;
  }

  function endLeafIndex() {
    return activeCompact ? pages.length + 1 : END_LEAF;
  }

  function viewFromLeaf(leaf) {
    if (leaf <= 0) return { kind: "cover", view: 0, spread: -1 };
    if (activeCompact) {
      if (leaf >= pages.length + 1) return { kind: "end", view: VIEW_COUNT - 1, spread: -1 };
      return { kind: "spread", view: leaf, spread: leaf - 1 };
    }
    if (leaf >= END_LEAF) return { kind: "end", view: VIEW_COUNT - 1, spread: -1 };
    const spread = Math.floor((leaf - 1) / 2);
    return { kind: "spread", view: 1 + spread, spread };
  }

  function leafFromView(view) {
    const v = Math.max(0, Math.min(view, VIEW_COUNT - 1));
    if (v === 0) return 0;
    if (v >= VIEW_COUNT - 1) return endLeafIndex();
    return activeCompact ? v : 1 + (v - 1) * 2;
  }

  let controller = null;
  let booting = false;
  let lastPageIndex = 0;
  let flipSoundReady = false;
  let flipAudio = null;
  /** @type {HTMLAudioElement[]} */
  let flipPool = [];
  let flipPoolIndex = 0;

  function isMobile() {
    return window.matchMedia("(max-width: 768px), (pointer: coarse) and (max-width: 1024px)").matches;
  }

  function initFlipSound() {
    flipAudio = new Audio("assets/flip.mp3");
    flipAudio.preload = "auto";
    flipAudio.volume = 0.85;
    // Small pool so rapid forward/back flips never cut each other off awkwardly
    flipPool = [0, 1, 2].map(() => {
      const a = new Audio("assets/flip.mp3");
      a.preload = "auto";
      a.volume = 0.85;
      return a;
    });
  }

  function unlockFlipSound() {
    if (flipSoundReady || !flipPool.length) return;
    const sample = flipPool[0];
    const prev = sample.volume;
    sample.volume = 0;
    sample
      .play()
      .then(() => {
        sample.pause();
        sample.currentTime = 0;
        sample.volume = prev;
        flipSoundReady = true;
      })
      .catch(() => {});
  }

  function playFlipSound() {
    if (!flipPool.length) return;
    const a = flipPool[flipPoolIndex % flipPool.length];
    flipPoolIndex += 1;
    try {
      a.pause();
      a.currentTime = 0;
      a.playbackRate = 1;
      a.volume = 0.85;
      const playPromise = a.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          unlockFlipSound();
        });
      }
    } catch (_) {}
  }

  /** Deeper, slower take of the same flip sample — feels like closing the book */
  function playCloseSound() {
    if (!flipPool.length) return;
    const a = flipPool[flipPoolIndex % flipPool.length];
    flipPoolIndex += 1;
    try {
      a.pause();
      a.currentTime = 0;
      a.playbackRate = 0.62;
      a.volume = 1;
      const playPromise = a.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => unlockFlipSound());
      }
      // Soft second thud shortly after for a "cover shut" feel
      window.setTimeout(() => {
        const b = flipPool[flipPoolIndex % flipPool.length];
        flipPoolIndex += 1;
        try {
          b.pause();
          b.currentTime = 0;
          b.playbackRate = 0.48;
          b.volume = 0.7;
          b.play().catch(() => {});
        } catch (_) {}
      }, 220);
    } catch (_) {}
  }

  function onPageTurned(pageIndex, { withSound = true } = {}) {
    const next = Math.max(0, pageIndex);
    if (withSound && next !== lastPageIndex) {
      playFlipSound();
    }
    lastPageIndex = next;
    updateUi(next);
  }

  function FlipBookCtor() {
    return window.FlipBook || window.Flipbook || null;
  }

  function setEngineBadge(label) {
    els.engineBadge.hidden = false;
    els.engineBadge.textContent = label;
  }

  function hideLoader() {
    els.loader.classList.add("hide");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  function loadStylesheet(href) {
    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve(true);
      link.onerror = () => {
        link.remove();
        resolve(false);
      };
      document.head.appendChild(link);
    });
  }

  async function resourceExists(url) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 1200);
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" },
      });
      window.clearTimeout(timer);
      return res.ok || res.status === 206;
    } catch (_) {
      return false;
    }
  }

  function updateUi(leafIndex) {
    const leafTotal = controller ? controller.getPageCount() : TOTAL_LEAVES;
    const safeLeaf = Math.max(0, Math.min(leafIndex, leafTotal - 1));
    const info = viewFromLeaf(safeLeaf);

    let title = "Portfolio";
    let label = "";
    let badge = "";

    if (info.kind === "cover") {
      title = "Front Cover";
      label = "Front Cover";
      badge = "";
    } else if (info.kind === "end") {
      title = "Back Cover";
      label = "Back Cover";
      badge = "";
    } else {
      const meta = pages[info.spread] || { title: "Page" };
      title = meta.title;
      const left = info.spread * 2 + 2;
      const right = left + 1;
      label = `${left}-${right} / ${leafTotal}`;
      badge = `${left}-${right} / ${leafTotal}`;
    }

    els.pageLabel.textContent = label;
    els.pageTitle.textContent = info.kind === "cover" || info.kind === "end" ? "" : title;
    if (els.spreadBadge) {
      els.spreadBadge.textContent = badge;
      els.spreadBadge.hidden = !badge;
    }

    els.slider.max = String(VIEW_COUNT);
    els.slider.value = String(info.view + 1);
    if (els.pageJumpInput) {
      els.pageJumpInput.max = String(VIEW_COUNT);
      // Don't overwrite while the user is typing in the field
      if (document.activeElement !== els.pageJumpInput) {
        els.pageJumpInput.value = String(info.view + 1);
      }
    }
    if (els.pageJumpTotal) {
      els.pageJumpTotal.textContent = String(VIEW_COUNT);
    }
    els.prev.disabled = info.view <= 0;
    els.next.disabled = false;
    els.next.title =
      info.kind === "end" ? "Close book & return to cover" : "Next page";

    document.body.classList.toggle("is-cover", info.kind === "cover");
    document.body.classList.toggle("is-end", info.kind === "end");
    // Desktop keeps open-book shell; compact uses single landscape pages.
    document.body.classList.remove("is-single-page");

    [...els.tocList.querySelectorAll("button")].forEach((btn) => {
      const v = Number(btn.dataset.view);
      btn.classList.toggle("active", v === info.view);
    });
  }

  function buildToc() {
    els.tocList.innerHTML = "";

    const addItem = (view, num, title, section) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.view = String(view);
      btn.innerHTML = `
        <span class="num">${num}</span>
        <span>${title}</span>
        <span class="sec">${section}</span>
      `;
      btn.addEventListener("click", () => {
        controller?.turnToPage(leafFromView(view));
        closeToc();
      });
      li.appendChild(btn);
      els.tocList.appendChild(li);
    };

    addItem(0, "CV", "Front Cover", "Book");
    pages.forEach((page, index) => {
      addItem(1 + index, String(index + 1).padStart(2, "0"), page.title, page.section);
    });
    addItem(VIEW_COUNT - 1, "BK", "Back Cover", "Book");
  }

  function openToc() {
    els.toc.hidden = false;
  }

  function closeToc() {
    els.toc.hidden = true;
  }

  async function preloadImages(urls) {
    // Warm the first few pages quickly; the rest load in the background.
    const priority = urls.slice(0, 4);
    const rest = urls.slice(4);

    const loadOne = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => resolve(src);
        img.src = src;
      });

    await Promise.all(priority.map(loadOne));
    rest.forEach((src) => {
      loadOne(src);
    });
  }

  function createReal3DController() {
    const Ctor = FlipBookCtor();
    if (!Ctor) throw new Error("Real3D constructor missing");

    const options = {
      name: "CodoVision Portfolio",
      pages: pages
        .filter((p) => p.src || p.hero)
        .map((p) => ({
          src: p.src || p.hero,
          thumb: p.src || p.hero,
          title: p.title,
        })),
      backgroundColor: "#e8eaee",
      viewMode: "webgl",
      skin: "light",
      sound: true,
      btnSound: { enabled: false },
      btnShare: { enabled: false },
      btnPrint: { enabled: false },
      btnDownload: { enabled: false },
      btnToc: { enabled: false },
      btnThumbs: { enabled: true },
      btnExpand: { enabled: true },
      btnAutoplay: { enabled: false },
      zoomMin: 0.95,
      zoomMax: 4,
      pageFlipDuration: 1,
      responsiveView: true,
      responsiveViewTreshold: 99999,
      singlePageMode: true,
      singlePageModeIfMobile: true,
      touchSwipeEnabled: true,
      lightBox: false,
      mobile: {
        viewMode: "swipe",
        singlePageMode: true,
        shadows: false,
        pageTextureSize: 1200,
        pageTextureSizeSmall: 900,
      },
    };

    els.book.innerHTML = "";
    els.book.classList.add("flipbook-real3d");
    const instance = new Ctor(els.book, options);

    const readPage = () => {
      try {
        if (typeof instance.getCurrentPageNumber === "function") {
          return Math.max(0, instance.getCurrentPageNumber() - 1);
        }
        if (typeof instance.getCurrentPageIndex === "function") {
          return instance.getCurrentPageIndex();
        }
      } catch (_) {}
      return Number(els.slider.value) - 1;
    };

    // Hook common callback names across Real3D versions
    if (typeof instance.on === "function") {
      instance.on("flip", () => updateUi(readPage()));
      instance.on("changePage", () => updateUi(readPage()));
    }

    return {
      engine: "Real3D FlipBook",
      getPage: readPage,
      getPageCount: () => pages.length,
      flipNext() {
        if (typeof instance.right === "function") instance.right();
        else if (typeof instance.nextButtonClick === "function") instance.nextButtonClick();
        else if (typeof instance.goToPage === "function") instance.goToPage(readPage() + 2);
        updateUi(readPage());
      },
      flipPrev() {
        if (typeof instance.left === "function") instance.left();
        else if (typeof instance.prevButtonClick === "function") instance.prevButtonClick();
        else if (typeof instance.goToPage === "function") instance.goToPage(Math.max(1, readPage()));
        updateUi(readPage());
      },
      turnToPage(index) {
        const target = index + 1;
        if (typeof instance.goToPage === "function") instance.goToPage(target);
        else if (typeof instance.gotoPage === "function") instance.gotoPage(target);
        updateUi(index);
      },
    };
  }

  function createFrontCover() {
    const sheet = document.createElement("div");
    sheet.className = activeCompact
      ? "flip-page flip-page--cover"
      : "flip-page flip-page--hard flip-page--cover";
    sheet.innerHTML = `
      <div class="book-cover book-cover--front">
        <div class="cover-copy-block">
          <div class="cover-brand-row">
            <img class="cover-logo" src="assets/logo.png" alt="" width="40" height="40" draggable="false" />
            <p class="cover-brand-sm">codovision</p>
          </div>
          <h1 class="cover-stack-title">
            <span>PORTFOLIO</span>
            <span>&amp; PAST</span>
            <span>WORK</span>
          </h1>
          <p class="cover-author-line">CODOVISION</p>
        </div>
        <div class="cover-art-panel" aria-hidden="true">
          <img src="assets/covers/front-art.png" alt="" draggable="false" />
        </div>
      </div>
    `;
    return sheet;
  }

  function createEndCover() {
    const sheet = document.createElement("div");
    sheet.className = activeCompact
      ? "flip-page flip-page--end"
      : "flip-page flip-page--hard flip-page--end";
    sheet.innerHTML = `
      <div class="book-cover book-cover--back">
        <div class="cover-atmosphere cover-atmosphere--back" aria-hidden="true">
          <div class="cover-orb cover-orb--c"></div>
          <div class="cover-orb cover-orb--d"></div>
          <div class="cover-grain"></div>
          <div class="cover-back-leaves"></div>
          <img class="cover-back-texture" src="assets/covers/front-art.png" alt="" draggable="false" />
        </div>
        <div class="book-cover-back-copy">
          <p class="book-cover-kicker">CodoVision</p>
          <h2 class="book-cover-headline">Real products across mobility, commerce, AI &amp; health.</h2>
          <p class="book-cover-body">
            Thirteen builds. One craft. From messengers and transport platforms to seller apps
            and AI health tools — designed to help your team pitch with proof.
          </p>
          <p class="book-cover-quote">Built once. Matched forever.</p>
        </div>
        <footer class="book-cover-back-foot">
          <div class="book-cover-mark">
            <img src="assets/logo.png" alt="" width="40" height="40" />
            <div>
              <strong>codovision</strong>
              <a class="book-cover-site" href="https://codovision.tech/" target="_blank" rel="noopener noreferrer" data-store-link>codovision.tech</a>
            </div>
          </div>
        </footer>
      </div>
    `;
    return sheet;
  }

  /** One landscape mockup → left leaf + right leaf (full image across open book) */
  function createHalfPage(src, side, leafIndex, title, pageMeta) {
    const sheet = document.createElement("div");
    sheet.className = `flip-page flip-page--${side}`;
    const face = document.createElement("div");
    face.className = "flip-page-face";
    face.style.backgroundImage = `url("${src}")`;
    // 200% width so each leaf shows exactly half of the landscape art
    face.style.backgroundSize = "200% 100%";
    face.style.backgroundPosition = side === "left" ? "left center" : "right center";
    face.style.backgroundRepeat = "no-repeat";

    const fold = document.createElement("div");
    fold.className = "page-fold";
    fold.setAttribute("aria-hidden", "true");

    const footer = document.createElement("div");
    footer.className = `page-footer page-footer--${side}`;
    const pageNo = leafIndex + 1; // cover = 1, interiors start at 2
    footer.textContent =
      side === "left"
        ? `Page ${pageNo} | ${title}`
        : `${title} | Page ${pageNo}`;

    face.appendChild(fold);
    face.appendChild(footer);
    if (side === "right" && pageMeta?.links?.length) {
      face.appendChild(createStoreHotspots(pageMeta, "half"));
    }
    sheet.appendChild(face);
    return sheet;
  }

  /** Compact: one full landscape mockup per flip */
  function createFullPage(src, leafIndex, title, pageMeta) {
    const sheet = document.createElement("div");
    sheet.className = "flip-page flip-page--full";
    const face = document.createElement("div");
    face.className = "flip-page-face flip-page-face--full";
    face.style.backgroundImage = `url("${src}")`;
    face.style.backgroundSize = "100% 100%";
    face.style.backgroundPosition = "center";
    face.style.backgroundRepeat = "no-repeat";

    const footer = document.createElement("div");
    footer.className = "page-footer page-footer--left";
    footer.textContent = `${title}`;

    face.appendChild(footer);
    if (pageMeta?.links?.length) {
      face.appendChild(createStoreHotspots(pageMeta, "full"));
    }
    sheet.appendChild(face);
    return sheet;
  }

  function createStoreHotspots(pageMeta, mode) {
    const links = pageMeta.links || [];
    const layout = pageMeta.linkLayout === "row" ? "row" : "stack";
    const region = pageMeta.linkRegion === "cover-bottom" ? "cover-bottom" : "panel";
    const wrap = document.createElement("div");
    wrap.className = `store-hotspots store-hotspots--${mode} store-hotspots--${layout} store-hotspots--${region} store-hotspots--n${links.length}`;
    wrap.setAttribute("aria-label", "Store and website links");

    const box =
      mode === "full"
        ? pageMeta.linkBoxFull || pageMeta.linkBox
        : pageMeta.linkBox;
    if (box) {
      if (box.top != null) wrap.style.top = box.top;
      if (box.left != null) wrap.style.left = box.left;
      if (box.width != null) wrap.style.width = box.width;
      if (box.height != null) wrap.style.height = box.height;
      if (box.bottom != null) {
        wrap.style.top = "auto";
        wrap.style.bottom = box.bottom;
      }
      if (box.right != null) wrap.style.right = box.right;
    }

    links.forEach((link) => {
      const a = document.createElement("a");
      a.className = `store-hotspot store-hotspot--${link.kind || "link"}`;
      a.href = link.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = `Open ${link.label || "link"}`;
      a.setAttribute("aria-label", link.label || "Open link");
      a.innerHTML = `<span class="store-hotspot-label">${link.label || "Open"}</span>`;

      const openLink = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
        window.open(link.href, "_blank", "noopener,noreferrer");
      };

      ["pointerdown", "mousedown", "mouseup", "touchstart", "touchend"].forEach(
        (evt) => {
          a.addEventListener(
            evt,
            (e) => {
              e.stopPropagation();
              if (typeof e.stopImmediatePropagation === "function") {
                e.stopImmediatePropagation();
              }
            },
            { passive: false, capture: true }
          );
        }
      );
      a.addEventListener("click", openLink, { capture: true });

      wrap.appendChild(a);
    });

    ["pointerdown", "mousedown", "click", "touchstart"].forEach((evt) => {
      wrap.addEventListener(
        evt,
        (e) => {
          e.stopPropagation();
        },
        { capture: true }
      );
    });

    return wrap;
  }

  function buildHtmlPages() {
    const nodes = [createFrontCover()];
    if (activeCompact) {
      pages.forEach((page, spreadIndex) => {
        const src = page.src || page.hero;
        const title = page.title || "Portfolio";
        nodes.push(createFullPage(src, spreadIndex + 1, title, page));
      });
    } else {
      pages.forEach((page, spreadIndex) => {
        const src = page.src || page.hero;
        const title = page.title || "Portfolio";
        const leftLeaf = 1 + spreadIndex * 2;
        const rightLeaf = leftLeaf + 1;
        nodes.push(createHalfPage(src, "left", leftLeaf, title, page));
        nodes.push(createHalfPage(src, "right", rightLeaf, title, page));
      });
    }
    nodes.push(createEndCover());
    return nodes;
  }

  /**
   * Desktop: A4 portrait leaves (open book = 2×A4).
   * Compact: one landscape leaf per full mockup, sized to the shell.
   */
  function bookSize() {
    const shell = els.book.parentElement;
    const maxW = Math.max(280, shell.clientWidth || 280);
    const maxH = Math.max(200, shell.clientHeight || 200);

    if (activeCompact) {
      let width = maxW;
      let height = Math.round(width / SPREAD_RATIO);
      if (height > maxH) {
        height = maxH;
        width = Math.round(height * SPREAD_RATIO);
      }
      return {
        width: Math.max(200, width),
        height: Math.max(140, height),
      };
    }

    const leafRatio = A4_RATIO;
    let height = maxH;
    let width = Math.round(height * leafRatio);
    if (width * 2 > maxW) {
      width = Math.floor(maxW / 2);
      height = Math.round(width / leafRatio);
    }
    return {
      width: Math.max(150, width),
      height: Math.max(212, height),
    };
  }

  function createPageFlipController() {
    if (!window.St || typeof window.St.PageFlip !== "function") {
      throw new Error("PageFlip library failed to load");
    }

    els.book.innerHTML = "";
    els.book.classList.remove(
      "flipbook-real3d",
      "is-closing",
      "is-opening",
      "is-back-flip"
    );

    const htmlPages = buildHtmlPages();
    htmlPages.forEach((el) => els.book.appendChild(el));

    const size = bookSize();
    const compact = activeCompact;
    const pageFlip = new St.PageFlip(els.book, {
      width: size.width,
      height: size.height,
      size: "fixed",
      minWidth: size.width,
      maxWidth: size.width,
      minHeight: size.height,
      maxHeight: size.height,
      drawShadow: true,
      flippingTime: compact ? 900 : 1100,
      // Desktop: open two-page book. Compact: one full spread at a time.
      usePortrait: compact,
      startPage: 0,
      autoSize: false,
      maxShadowOpacity: 0.75,
      // Hard covers + showCover fight portrait single-page mode on phones.
      showCover: !compact,
      mobileScrollSupport: true,
      swipeDistance: compact ? 22 : 28,
      clickEventForward: true,
      useMouseEvents: true,
      showPageCorners: !compact,
      disableFlipByClick: false,
    });

    pageFlip.loadFromHTML(htmlPages);
    lastPageIndex = pageFlip.getCurrentPageIndex();

    // Re-bind after PageFlip adopts nodes (listeners can be dropped/cloned)
    els.book.querySelectorAll("a.store-hotspot[href], a.book-cover-site[href]").forEach((node) => {
      const href = node.getAttribute("href");
      if (!href) return;
      const openLink = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
        window.open(href, "_blank", "noopener,noreferrer");
      };
      ["pointerdown", "mousedown", "touchstart"].forEach((evt) => {
        node.addEventListener(
          evt,
          (e) => {
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") {
              e.stopImmediatePropagation();
            }
          },
          { capture: true }
        );
      });
      node.addEventListener("click", openLink, { capture: true });
    });

    /**
     * Back-curl fix only needed in single-page portrait mode.
     * Open landscape book uses native reverse flip.
     */
    function patchBackFlip(book) {
      const collection = book.getPageCollection?.();
      const flipCtrl = book.getFlipController?.();
      const render = book.getRender?.();
      if (!collection || !flipCtrl || !render || collection.__codoBackPatched) return;
      collection.__codoBackPatched = true;

      const FORWARD = 0;
      const BACK = 1;
      const origGetBottomPage = collection.getBottomPage.bind(collection);
      const origCheckDirection = flipCtrl.checkDirection.bind(flipCtrl);
      const origTurnNext = book.turnToNextPage.bind(book);
      const origFold = flipCtrl.fold.bind(flipCtrl);
      const origStopMove = flipCtrl.stopMove.bind(flipCtrl);
      const origFlipPrev = flipCtrl.flipPrev.bind(flipCtrl);

      let mirroringBack = false;

      function endMirror() {
        if (!mirroringBack) return;
        mirroringBack = false;
        els.book.classList.remove("is-back-flip");
        collection.getBottomPage = origGetBottomPage;
        flipCtrl.checkDirection = origCheckDirection;
        book.turnToNextPage = origTurnNext;
      }

      function beginMirror() {
        mirroringBack = true;
        els.book.classList.add("is-back-flip");
        collection.getBottomPage = function (direction) {
          if (direction === FORWARD) {
            const i = this.getCurrentSpreadIndex();
            return i > 0 ? this.getPage(i - 1) : origGetBottomPage(direction);
          }
          return origGetBottomPage(direction);
        };
        book.turnToNextPage = function () {
          endMirror();
          book.turnToPrevPage();
        };
        flipCtrl.checkDirection = function (direction) {
          if (direction === FORWARD) return book.getCurrentPageIndex() >= 1;
          return origCheckDirection(direction);
        };
      }

      book.__codoEndMirror = endMirror;

      flipCtrl.flipPrev = function (corner) {
        if (book.getCurrentPageIndex() <= 0) return;
        if (render.getOrientation() !== "portrait") {
          return origFlipPrev(corner);
        }
        if (this.calc !== null) render.finishAnimation();
        endMirror();
        beginMirror();
        this.flipNext(corner === "bottom" ? "bottom" : "top");
      };

      flipCtrl.fold = function (pos) {
        if (render.getOrientation() !== "portrait") return origFold(pos);
        const bookPt = render.convertToBook(pos);
        if (
          this.getDirectionByPoint(bookPt) === BACK &&
          book.getCurrentPageIndex() > 0
        ) {
          if (this.state === "read" || this.state === "fold_corner") {
            const rect = this.getBoundsRect();
            this.flipPrev(bookPt.y >= rect.height / 2 ? "bottom" : "top");
          }
          return;
        }
        return origFold(pos);
      };

      flipCtrl.stopMove = function () {
        if (this.state === "flipping") return;
        if (this.calc !== null && this.calc.getPosition().x > 0 && mirroringBack) {
          endMirror();
        }
        return origStopMove();
      };
    }

    patchBackFlip(pageFlip);

    let flipping = false;
    let suppressFlipSound = false;
    let wrapping = false;
    let soundPlayedForTurn = false;

    function commitFlipSound() {
      if (suppressFlipSound || soundPlayedForTurn) return;
      soundPlayedForTurn = true;
      unlockFlipSound();
      playFlipSound();
    }

    pageFlip.on("changeState", (e) => {
      if (e.data === "flipping" && !flipping) {
        flipping = true;
        commitFlipSound();
      }
      if (e.data === "user_fold") unlockFlipSound();
      if (e.data === "read") {
        flipping = false;
        soundPlayedForTurn = false;
        pageFlip.__codoEndMirror?.();
        lastPageIndex = pageFlip.getCurrentPageIndex();
        updateUi(lastPageIndex);
      }
    });

    pageFlip.on("flip", (e) => {
      if (!soundPlayedForTurn && !suppressFlipSound) commitFlipSound();
      flipping = false;
      soundPlayedForTurn = false;
      pageFlip.__codoEndMirror?.();
      lastPageIndex = e.data;
      updateUi(e.data);
    });

    function wait(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function finishLibAnimation() {
      try {
        pageFlip.getRender?.().finishAnimation?.();
      } catch (_) {}
      flipping = false;
    }

    function softCurl(direction, corner = "top") {
      if (wrapping) return;
      const current = pageFlip.getCurrentPageIndex();
      const last = pageFlip.getPageCount() - 1;

      if (direction === "next" && current >= last) {
        closeBookToStart();
        return;
      }
      if (direction === "prev" && current <= 0) return;

      if (pageFlip.getState?.() === "flipping") finishLibAnimation();

      if (direction === "next") pageFlip.flipNext(corner);
      else pageFlip.flipPrev(corner);
    }

    async function closeBookToStart() {
      if (wrapping) return;
      wrapping = true;
      suppressFlipSound = true;
      finishLibAnimation();
      unlockFlipSound();
      playCloseSound();

      els.book.classList.remove("is-opening");
      els.book.classList.add("is-closing");
      await wait(650);

      try {
        pageFlip.turnToPage(0);
      } catch (_) {}
      lastPageIndex = 0;
      updateUi(0);

      els.book.classList.remove("is-closing");
      els.book.classList.add("is-opening");
      await wait(450);
      els.book.classList.remove("is-opening");

      suppressFlipSound = false;
      wrapping = false;
    }

    function animatedFlipTo(targetLeaf) {
      const current = pageFlip.getCurrentPageIndex();
      const cur = viewFromLeaf(current);
      const tgtLeaf = Math.max(0, Math.min(targetLeaf, pageFlip.getPageCount() - 1));
      const tgt = viewFromLeaf(tgtLeaf);
      const aligned = leafFromView(tgt.view);

      if (tgt.view === cur.view) {
        if (current !== aligned && tgt.kind === "spread") {
          try {
            pageFlip.turnToPage(aligned);
          } catch (_) {}
          lastPageIndex = aligned;
          updateUi(aligned);
        }
        return;
      }

      if (cur.kind === "end" && tgt.kind === "cover") {
        closeBookToStart();
        return;
      }
      if (tgt.view === cur.view + 1) {
        softCurl("next", "top");
        return;
      }
      if (tgt.view === cur.view - 1) {
        softCurl("prev", "top");
        return;
      }
      playFlipSound();
      pageFlip.turnToPage(aligned);
      lastPageIndex = aligned;
      updateUi(aligned);
    }

    return {
      engine: "3D PageFlip",
      _api: pageFlip,
      getPage: () => pageFlip.getCurrentPageIndex(),
      getPageCount: () => pageFlip.getPageCount(),
      flipNext() {
        unlockFlipSound();
        softCurl("next", "top");
      },
      flipPrev() {
        unlockFlipSound();
        softCurl("prev", "top");
      },
      turnToPage(index) {
        unlockFlipSound();
        animatedFlipTo(index);
      },
      destroy() {
        try {
          const ui = pageFlip.getUI?.();
          ui?.removeHandlers?.();
          ui?.destroy?.();
        } catch (_) {}
        if (els.book && els.book.isConnected) els.book.innerHTML = "";
      },
    };
  }

  function createStaticFallback() {
    els.book.innerHTML = "";
    const host = document.createElement("div");
    host.className = "static-host";
    els.book.appendChild(host);
    let view = 0;

    function render() {
      if (view === 0) {
        host.className = "static-host static-host--single";
        host.innerHTML = "";
        host.appendChild(createFrontCover());
        return;
      }
      if (view >= VIEW_COUNT - 1) {
        host.className = "static-host static-host--single";
        host.innerHTML = "";
        host.appendChild(createEndCover());
        return;
      }
      const spread = view - 1;
      const page = pages[spread];
      const src = page?.src || "";
      const title = page?.title || "Portfolio";
      const leftNo = spread * 2 + 2;
      const rightNo = leftNo + 1;
      host.className = "static-host";
      host.innerHTML = `
        <div class="static-spread">
          <div class="static-spread-left" style="background-image:url('${src}')">
            <div class="page-fold" aria-hidden="true"></div>
            <div class="page-footer page-footer--left">Page ${leftNo} | ${title}</div>
          </div>
          <div class="static-spread-right" style="background-image:url('${src}')">
            <div class="page-fold" aria-hidden="true"></div>
            <div class="page-footer page-footer--right">${title} | Page ${rightNo}</div>
          </div>
        </div>
      `;
    }

    render();

    return {
      engine: "Static Viewer",
      getPage: () => leafFromView(view),
      getPageCount: () => TOTAL_LEAVES,
      flipNext() {
        if (view >= VIEW_COUNT - 1) {
          playCloseSound();
          view = 0;
          render();
          lastPageIndex = 0;
          updateUi(0);
          return;
        }
        view += 1;
        render();
        onPageTurned(leafFromView(view));
      },
      flipPrev() {
        if (view > 0) {
          view -= 1;
          render();
          onPageTurned(leafFromView(view));
        }
      },
      turnToPage(leaf) {
        view = viewFromLeaf(leaf).view;
        render();
        onPageTurned(leafFromView(view));
      },
    };
  }

  async function tryLoadReal3D() {
    const exists = await resourceExists(REAL3D_JS);
    if (!exists) return false;
    await loadStylesheet(REAL3D_CSS);
    await loadScript(REAL3D_JS);
    return Boolean(FlipBookCtor());
  }

  async function initEngine() {
    if (booting || controller) return;
    booting = true;

    try {
      await preloadImages([
        "assets/covers/front-art.png",
        ...pages.map((p) => p.src).filter(Boolean),
      ]);

      let usedReal3D = false;
      try {
        usedReal3D = await tryLoadReal3D();
      } catch (err) {
        console.warn("Real3D FlipBook not available:", err);
      }

      if (usedReal3D) {
        try {
          controller = createReal3DController();
          setEngineBadge("Real3D FlipBook");
          hideLoader();
          updateUi(0);
          return;
        } catch (err) {
          console.warn("Real3D init failed, using fallback.", err);
        }
      }

      try {
        await loadScript(PAGEFLIP_JS);
        controller = createPageFlipController();
        setEngineBadge(controller.engine);
      } catch (err) {
        console.warn(err);
        controller = createStaticFallback();
        setEngineBadge(controller.engine);
      }

      hideLoader();
      updateUi(0);
    } finally {
      booting = false;
    }
  }

  function toggleFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().then(() => {
        document.body.classList.add("is-fullscreen");
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        document.body.classList.remove("is-fullscreen");
      }).catch(() => {});
    }
  }

  function rebuildPageFlipKeepingPage() {
    if (controller?.engine !== "3D PageFlip") return;
    const page = controller.getPage();
    // Map with the OLD layout before syncing to the new breakpoint.
    const view = viewFromLeaf(page).view;
    syncLayoutMode();
    controller.destroy?.();
    controller = createPageFlipController();
    const leaf = leafFromView(view);
    // Silent resize restore — no flip sound
    try {
      controller._api.turnToPage(leaf);
    } catch (_) {}
    lastPageIndex = leaf;
    updateUi(leaf);
  }

  document.addEventListener("fullscreenchange", () => {
    document.body.classList.toggle("is-fullscreen", Boolean(document.fullscreenElement));
    rebuildPageFlipKeepingPage();
  });

  els.prev.addEventListener("click", () => {
    unlockFlipSound();
    controller?.flipPrev();
  });
  els.next.addEventListener("click", () => {
    unlockFlipSound();
    controller?.flipNext();
  });
  els.slider.addEventListener("input", () => {
    unlockFlipSound();
    const view = Number(els.slider.value) - 1;
    controller?.turnToPage(leafFromView(view));
  });

  function jumpToEnteredPage() {
    if (!els.pageJumpInput) return;
    const raw = Number(els.pageJumpInput.value);
    if (!Number.isFinite(raw)) {
      els.pageJumpInput.value = String(viewFromLeaf(controller?.getPage?.() || 0).view + 1);
      return;
    }
    const pageNum = Math.max(1, Math.min(VIEW_COUNT, Math.round(raw)));
    els.pageJumpInput.value = String(pageNum);
    unlockFlipSound();
    controller?.turnToPage(leafFromView(pageNum - 1));
  }

  els.pageJumpForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    jumpToEnteredPage();
  });
  els.pageJumpInput?.addEventListener("keydown", (e) => {
    // Avoid book arrow-key handlers while typing a page number
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      jumpToEnteredPage();
    }
  });
  els.pageJumpInput?.addEventListener("change", jumpToEnteredPage);

  els.tocBtn.addEventListener("click", openToc);
  els.tocClose.addEventListener("click", closeToc);
  els.toc.addEventListener("click", (e) => {
    if (e.target === els.toc) closeToc();
  });
  els.fullscreenBtn.addEventListener("click", toggleFullscreen);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      unlockFlipSound();
      controller?.flipNext();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      unlockFlipSound();
      controller?.flipPrev();
    } else if (e.key === "Escape") {
      closeToc();
    }
  });

  // Unlock audio on first touch/click anywhere (browser autoplay policy)
  ["pointerdown", "touchstart", "keydown"].forEach((evt) => {
    window.addEventListener(evt, unlockFlipSound, { once: true, passive: true });
  });

  let resizeTimer = 0;
  function scheduleResizeRebuild() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuildPageFlipKeepingPage, 220);
  }
  window.addEventListener("resize", scheduleResizeRebuild);
  window.addEventListener("orientationchange", scheduleResizeRebuild);
  window.visualViewport?.addEventListener("resize", scheduleResizeRebuild);

  syncLayoutMode();
  initFlipSound();
  buildToc();
  initEngine();
})();
