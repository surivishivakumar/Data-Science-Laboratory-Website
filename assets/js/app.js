/* ==========================================================================
   Digital Laboratory
   All rendering and interaction logic.
   Every value shown here is read from assets/js/data.js.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     0. SHORT HELPERS
     --------------------------------------------------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const PREVIEW_SECONDS = 15; // length of the hover preview clip

  function plural(n, one, many) {
    return n + " " + (n === 1 ? one : many || one + "s");
  }

  function initialsOf(name) {
    const parts = String(name || "")
      .replace(/[^A-Za-z\s.]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function highlightMatch(text, query) {
    const safe = esc(text);
    if (!query) return safe;
    const needle = query.trim();
    if (!needle) return safe;
    const rx = new RegExp("(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return safe.replace(rx, "<mark>$1</mark>");
  }

  let toastTimer = null;
  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove("is-show");
    }, 2200);
  }

  const ICON = {
    play: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M10 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M13.2 5.4 11.8 6.8l4.2 4.2H4v2h12l-4.2 4.2 1.4 1.4L19.8 12 13.2 5.4Z" fill="currentColor"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M10.8 18.6 12.2 17.2 8 13h16v-2H8l4.2-4.2-1.4-1.4L4.2 12l6.6 6.6Z" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    sound: '<svg class="on" viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.2-3.9v7.8A4.5 4.5 0 0 0 16.5 12Zm-2.2-8.3v2.1a7 7 0 0 1 0 12.4v2.1a9 9 0 0 0 0-16.6Z"/></svg>',
    soundOff: '<svg class="off" viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm17.3 1.3-1.4-1.4-2.3 2.3-2.3-2.3-1.4 1.4 2.3 2.3-2.3 2.3 1.4 1.4 2.3-2.3 2.3 2.3 1.4-1.4-2.3-2.3 2.3-2.3Z"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2.5" y="5.5" width="13" height="13" rx="2.5"/><path d="m16 10.5 5.5-3.2v9.4L16 13.5v-3Z"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.8 4-5.7 7.5-5.7s6.1 1.9 7.5 5.7"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4.5 4.5L19 7"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2c-.2-1.5-.9-2.3-2.4-2.5C17.2 4.4 14.8 4.4 12 4.4s-5.2 0-7.2.3c-1.5.2-2.2 1-2.4 2.5C2.2 9.2 2.2 10.4 2.2 12s0 2.8.2 4.8c.2 1.5.9 2.3 2.4 2.5 2 .3 4.4.3 7.2.3s5.2 0 7.2-.3c1.5-.2 2.2-1 2.4-2.5.2-2 .2-3.2.2-4.8s0-2.8-.2-4.8ZM10.1 14.9V9.1l5.1 2.9-5.1 2.9Z"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7 0-.3-.4-1.3.1-2.7 0 0 .9-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>',
    external: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8V7.8L14 3Z"/><path d="M13.8 3v5h5M8.6 12.6h6.8M8.6 16.4h4.8"/></svg>'
  };

  /* ---------------------------------------------------------------------
     1. PYTHON SYNTAX HIGHLIGHTER  (offline, no external library)
     --------------------------------------------------------------------- */
  const PYTHON_RULES = new RegExp(
    [
      "(?<com>#[^\\n]*)",
      "(?<tri>\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?''')",
      "(?<str>[fFrRbB]{0,2}\"(?:\\\\.|[^\"\\\\])*\"|[fFrRbB]{0,2}'(?:\\\\.|[^'\\\\])*')",
      "(?<dec>@[A-Za-z_][\\w.]*)",
      "(?<mag>![A-Za-z_]\\w*)",
      "(?<num>\\b0[xXbBoO][0-9a-fA-F_]+\\b|\\b\\d[\\d_]*\\.?[\\d_]*(?:[eE][+-]?\\d+)?\\b)",
      "(?<kw>\\b(?:and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|match|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\\b)",
      "(?<bi>\\b(?:abs|all|any|bool|dict|enumerate|filter|float|format|frozenset|getattr|hasattr|input|int|isinstance|iter|len|list|map|max|min|next|open|print|range|repr|reversed|round|set|setattr|sorted|str|sum|tuple|type|zip|json|os|re|sys|requests|sqlite3|pd|np|plt|sns|requests|conn|cursor|fig|ax|db|df|text|ax0|ax1)\\b)",
      "(?<fn>\\b[A-Za-z_]\\w*(?=\\s*\\())",
      "(?<id>\\b[A-Za-z_]\\w*\\b)",
      "(?<pun>[{}()\\[\\].,:;=+\\-*/%<>!&|^~$?]+)"
    ].join("|"),
    "gm"
  );

  const TOKEN_CLASS = {
    com: "tok-com", tri: "tok-tri", str: "tok-str", dec: "tok-dec",
    mag: "tok-mag", num: "tok-num", kw: "tok-kw", bi: "tok-bi",
    fn: "tok-fn", id: "tok-id", pun: "tok-pun"
  };

  function highlightPython(code) {
    const source = String(code == null ? "" : code);
    let out = "";
    let cursor = 0;
    let match;

    PYTHON_RULES.lastIndex = 0;
    while ((match = PYTHON_RULES.exec(source)) !== null) {
      if (match[0] === "") { PYTHON_RULES.lastIndex++; continue; }
      if (match.index > cursor) {
        out += esc(source.slice(cursor, match.index));
      }
      const kind = Object.keys(match.groups).find(function (k) {
        return match.groups[k] !== undefined;
      });
      out += '<span class="' + (TOKEN_CLASS[kind] || "tok-id") + '">' + esc(match[0]) + "</span>";
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length) out += esc(source.slice(cursor));
    return out;
  }

  /* ---------------------------------------------------------------------
     1b. STUDENT CARD EDITOR  (edit form + localStorage persistence)
     --------------------------------------------------------------------- */
  const CARD_STORE_KEY = "dslab.student-card.v1";
  const CARD_DEFAULTS = {
    student: JSON.parse(JSON.stringify(student)),
    labMeta: {
      subjectCode: labMeta.subjectCode,
      academicYear: labMeta.academicYear,
      department: labMeta.department
    }
  };

  /* Every editable field of the card, in form order. `group` says which
     data.js object owns the value; `req` / `min` / `max` / `rx` drive
     validation. These are the only keys that are ever written to storage. */
  const CARD_FIELDS = [
    { key: "name", label: "Student Name", group: "student", req: true, min: 2, max: 80 },
    { key: "idNumber", label: "Student ID / Roll Number", group: "student", req: true, max: 32,
      rx: /^[A-Za-z0-9][A-Za-z0-9\-/. ]*$/, rxMsg: "Use letters, numbers and - / . only." },
    { key: "section", label: "Section", group: "student", req: true, max: 40 },
    { key: "department", label: "Branch / Course", group: "labMeta", req: true, max: 100 },
    { key: "subjectCode", label: "Subject Code", group: "labMeta", req: true, max: 40,
      rx: /^[A-Za-z0-9][A-Za-z0-9\-/. ]*$/, rxMsg: "Use letters, numbers and - / . only." },
    { key: "academicYear", label: "Academic Year", group: "labMeta", req: true, max: 30,
      rx: /^\d{4}\s*[-\u2013\u2014/]\s*\d{2,4}$/, rxMsg: "Use a range like 2025 - 2026." },
    { key: "faculty", label: "Faculty", group: "student", req: true, max: 80 },
    { key: "profession", label: "Profession", group: "student", req: true, max: 80 },
    { key: "photo", label: "Photo path / URL", group: "student", req: false, max: 300,
      rx: /^(?:https?:\/\/|assets\/|\.?\.?\/)[^\s]+\.(?:png|jpe?g|webp|gif|avif)$/i,
      rxMsg: "Use an image path or URL ending in .jpg, .png, .webp or .gif.",
      hint: "Optional. Leave empty for the initials placeholder, for example assets/img/student-photo.jpg" }
  ];

  /* ---- storage ---- */
  function readCardStore() {
    try {
      const raw = localStorage.getItem(CARD_STORE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch (e) {
      return null;
    }
  }

  function applyCardData(data) {
    if (!data) return;
    CARD_FIELDS.forEach(function (f) {
      const src = f.group === "student" ? data.student : data.labMeta;
      if (src && typeof src[f.key] === "string") {
        if (f.group === "student") student[f.key] = src[f.key];
        else labMeta[f.key] = src[f.key];
      }
    });
  }

  function restoreStudentCard() {
    applyCardData(readCardStore());
  }

  function writeCardStore() {
    const data = { v: 1, student: {}, labMeta: {} };
    CARD_FIELDS.forEach(function (f) {
      if (f.group === "student") data.student[f.key] = student[f.key];
      else data.labMeta[f.key] = labMeta[f.key];
    });
    try {
      localStorage.setItem(CARD_STORE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearCardStore() {
    try { localStorage.removeItem(CARD_STORE_KEY); } catch (e) { /* ignore */ }
  }

  /* ---- re-render only what the model change affects ---- */
  function refreshStudentCardUI() {
    const card = document.getElementById("studentCard");
    if (card) {
      const holder = document.createElement("div");
      holder.innerHTML = studentCardHtml();
      const fresh = holder.firstElementChild;
      if (fresh && card.parentNode) card.parentNode.replaceChild(fresh, card);
    }
    const codeNode = $(".univ-card__code b");
    if (codeNode) codeNode.textContent = labMeta.subjectCode;
    paintBranding();
  }

  /* ---- modal ---- */
  let cardModal = null;
  let cardModalTrigger = null;

  function cardFieldHtml(f) {
    const id = "cf-" + f.key;
    return (
      '<div class="fld">' +
        '<label class="fld__label" for="' + id + '">' + esc(f.label) +
          (f.req ? ' <span class="fld__req" aria-hidden="true">*</span>' : "") +
        "</label>" +
        '<input class="fld__input" id="' + id + '" name="' + f.key + '" type="text"' +
          ' maxlength="' + f.max + '" autocomplete="off" spellcheck="false"' +
          ' aria-describedby="' + id + '-err">' +
        (f.hint ? '<p class="fld__hint">' + esc(f.hint) + "</p>" : "") +
        '<p class="fld__err" id="' + id + '-err" role="alert"></p>' +
      "</div>"
    );
  }

  function ensureCardModal() {
    if (cardModal) return cardModal;
    const wrap = document.createElement("div");
    wrap.className = "cm";
    wrap.id = "cardModal";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="cm__backdrop" data-cm-close></div>' +
      '<div class="cm__panel" role="dialog" aria-modal="true" aria-labelledby="cmTitle">' +
        '<div class="cm__head">' +
          "<div>" +
            '<h3 class="cm__title" id="cmTitle">Edit Student Card</h3>' +
            '<p class="cm__sub">Saved in this browser, so the changes stay after you close the site.</p>' +
          "</div>" +
          '<button class="cm__x" type="button" aria-label="Close" data-cm-close>' + ICON.close + "</button>" +
        "</div>" +
        '<form class="cm__form" id="cardEditForm" novalidate>' +
          '<div class="cm__grid">' + CARD_FIELDS.map(cardFieldHtml).join("") + "</div>" +
          '<div class="cm__actions">' +
            '<button class="btn btn--sm btn--ghost cm__reset" id="cardResetBtn" type="button">Reset / Restore Default</button>' +
            '<span class="cm__gap"></span>' +
            '<button class="btn btn--sm" type="button" data-cm-close>Cancel</button>' +
            '<button class="btn btn--sm btn--primary" type="submit">Save</button>' +
          "</div>" +
        "</form>" +
      "</div>";
    document.body.appendChild(wrap);
    cardModal = wrap;

    wrap.addEventListener("click", function (event) {
      if (event.target.closest("[data-cm-close]")) closeCardEditor();
    });
    $("#cardEditForm", wrap).addEventListener("submit", function (event) {
      event.preventDefault();
      saveCardEditor();
    });
    $("#cardResetBtn", wrap).addEventListener("click", resetStudentCard);
    wrap.addEventListener("input", function (event) {
      if (event.target.classList && event.target.classList.contains("fld__input")) {
        clearFieldError(event.target);
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && cardModal && !cardModal.hidden) closeCardEditor();
    });
    return wrap;
  }

  function fillCardForm() {
    CARD_FIELDS.forEach(function (f) {
      const input = $("#cf-" + f.key, cardModal);
      if (!input) return;
      input.value = String((f.group === "student" ? student[f.key] : labMeta[f.key]) || "");
      clearFieldError(input);
    });
  }

  function showFieldError(input, message) {
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    const err = document.getElementById(input.id + "-err");
    if (err) err.textContent = message;
  }

  function clearFieldError(input) {
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    const err = document.getElementById(input.id + "-err");
    if (err) err.textContent = "";
  }

  function fieldError(f, raw) {
    const value = String(raw == null ? "" : raw).trim();
    if (f.req && !value) return f.label + " is required.";
    if (!value) return "";
    if (f.min && value.length < f.min) return f.label + " must be at least " + f.min + " characters.";
    if (f.max && value.length > f.max) return f.label + " must be " + f.max + " characters or fewer.";
    if (f.rx && !f.rx.test(value)) return f.rxMsg || (f.label + " is not valid.");
    return "";
  }

  function saveCardEditor() {
    const values = {};
    let firstBad = null;
    CARD_FIELDS.forEach(function (f) {
      const input = $("#cf-" + f.key, cardModal);
      if (!input) return;
      const value = input.value.trim();
      const message = fieldError(f, value);
      if (message) {
        showFieldError(input, message);
        if (!firstBad) firstBad = input;
      } else {
        clearFieldError(input);
      }
      values[f.key] = value;
    });
    if (firstBad) {
      firstBad.focus();
      firstBad.scrollIntoView({ block: "nearest" });
      return;
    }

    CARD_FIELDS.forEach(function (f) {
      if (f.group === "student") student[f.key] = values[f.key];
      else labMeta[f.key] = values[f.key];
    });
    const stored = writeCardStore();
    refreshStudentCardUI();
    closeCardEditor();
    toast(stored ? "Student card updated" : "Card updated - browser storage is unavailable, changes last for this session only");
  }

  function resetStudentCard() {
    CARD_FIELDS.forEach(function (f) {
      if (f.group === "student") student[f.key] = CARD_DEFAULTS.student[f.key];
      else labMeta[f.key] = CARD_DEFAULTS.labMeta[f.key];
    });
    clearCardStore();
    fillCardForm();
    refreshStudentCardUI();
    toast("Student card restored to the default details");
  }

  function openCardEditor(trigger) {
    ensureCardModal();
    cardModalTrigger = trigger || document.activeElement;
    fillCardForm();
    cardModal.hidden = false;
    document.body.classList.add("cm-open");
    const first = $("#cf-name", cardModal);
    if (first) first.focus();
  }

  function closeCardEditor() {
    if (!cardModal || cardModal.hidden) return;
    cardModal.hidden = true;
    document.body.classList.remove("cm-open");
    const fresh = document.getElementById("editCardBtn");
    if (fresh) fresh.focus();
    else if (cardModalTrigger && document.contains(cardModalTrigger)) cardModalTrigger.focus();
    cardModalTrigger = null;
  }

  /* ---------------------------------------------------------------------
     2. SHARED PARTIALS
     --------------------------------------------------------------------- */
  function studentFieldsHtml() {
    const rows = [
      ["Name:", student.name],
      ["ID Number:", student.idNumber],
      ["Section:", student.section],
      ["Branch:", labMeta.department],
      ["Faculty:", student.faculty],
      ["Profession:", student.profession]
    ];
    return rows
      .map(function (row) {
        return '<div class="idcard__field"><dt>' + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd></div>";
      })
      .join("");
  }

  function studentCardHtml() {
    const photo = student.photo
      ? '<img class="idcard__photo" src="' + esc(student.photo) + '" alt="Photograph of ' + esc(student.name) + '">'
      : '<div class="idcard__photo-ph">' +
          ICON.person +
          '<span class="idcard__initials">' + esc(initialsOf(student.name)) + "</span>" +
          "<small>Your photo goes here<br>assets/img/student-photo.jpg</small>" +
        "</div>";

    const social = socialLinksHtml();

    return (
      '<aside class="card idcard" id="studentCard">' +
        '<div class="idcard__strip">' +
          '<span class="idcard__strip-txt"><b>' + esc(laboratory.name) + "</b></span>" +
        "</div>" +
        '<div class="idcard__body">' +
          photo +
          '<dl class="idcard__fields">' + studentFieldsHtml() + "</dl>" +
        "</div>" +
        (social ? '<div class="idcard__social">' + social + "</div>" : "") +
        '<div class="idcard__foot">' +
          "<span>" + esc(labMeta.subjectCode) + "</span>" +
          '<span class="idcard__bars" aria-hidden="true">' +
            [10, 16, 8, 18, 12, 20, 9, 15, 11, 19, 7, 14].map(function (h) {
              return "<i style=\"height:" + h + "px\"></i>";
            }).join("") +
          "</span>" +
          "<span>" + esc(labMeta.academicYear) + "</span>" +
        "</div>" +
        '<div class="idcard__actions">' +
          '<button class="btn btn--sm btn--ghost idcard__edit" id="editCardBtn" type="button">' +
            ICON.pencil + "<span>Edit Student Card</span>" +
          "</button>" +
        "</div>" +
      "</aside>"
    );
  }

  /* video frame with 10 second hover-to-play behaviour */
  function previewVideoHtml(experiment) {
    const src = experiment.previewVideo;
    const ytId = youtubeIdOf(experiment.previewYoutube || experiment.youtubeVideo);

    /* YouTube cannot hover-play, mute-autoplay, loop a 15-second window or be
       scrubbed by script without the IFrame API, so when the preview is supplied
       as a YouTube link we show the real thumbnail with a play badge and open
       the player on click. Hover preview needs a local .mp4 (previewVideo). */
    if (!src && ytId) {
      return (
        '<div class="media media--yt">' +
          '<a class="media__poster" href="https://www.youtube.com/watch?v=' + esc(ytId) + '" ' +
            'target="_blank" rel="noopener noreferrer" aria-label="Watch the preview on YouTube">' +
            '<img class="media__poster-img" alt="" loading="lazy" ' +
              'src="https://i.ytimg.com/vi/' + esc(ytId) + '/hqdefault.jpg">' +
            '<span class="media__poster-play">' + ICON.youtube + ICON.play + "</span>" +
            '<span class="badge badge--live">' + ICON.youtube + " YOUTUBE PREVIEW</span>" +
          "</a>" +
          '<div class="media__hint">' + ICON.youtube + " Click to watch the preview on YouTube</div>" +
        "</div>"
      );
    }

    if (!src) {
      return (
        '<div class="media">' +
          '<div class="media__ph">' + ICON.video +
            "<strong>Preview video pending</strong>" +
            "<span>Set <code>previewVideo</code> (or <code>youtubeVideo</code>) in <code>assets/js/data.js</code></span>" +
          "</div>" +
        "</div>"
      );
    }

    return (
      '<div class="media" data-preview>' +
        '<video class="media__video" src="' + esc(src) + '" playsinline preload="metadata" ' +
          'aria-label="Preview of ' + esc(experiment.name) + '"></video>' +
        '<div class="media__badges">' +
          '<span class="badge badge--live">' + ICON.play + " " + PREVIEW_SECONDS + "s PREVIEW</span>" +
          '<span class="badge">Hover to play</span>' +
        "</div>" +
        '<button class="media__sound is-muted" type="button" data-sound aria-label="Unmute preview">' +
          ICON.sound + ICON.soundOff +
        "</button>" +
        '<div class="media__hint">' + ICON.play + " Move the mouse over the video to preview</div>" +
      "</div>"
    );
  }

  /* Overlay a "file not found" notice without destroying the player element,
     so the card keeps its shape and badges and works again after a refresh
     once the mp4 has been added. */
  function showMediaFallback(frame, src, tall) {
    if (frame.querySelector(".media__overlay")) return;
    const video = frame.querySelector("video");
    if (video) video.style.visibility = "hidden";

    const overlay = document.createElement("div");
    overlay.className = "media__overlay" + (tall ? " media__ph--tall" : "");
    overlay.innerHTML =
      ICON.video +
      "<strong>Video file not added yet</strong>" +
      "<span>Place <code>" + esc(src) + "</code> in the videos folder, then refresh</span>";
    frame.appendChild(overlay);
  }

  /* regular video for an individual section */
  /* Some experiments were written for the site rather than converted from a
     submitted lab-notebook file. Say so plainly instead of implying the whole
     set came from the student's own record. */
  function authoredNoticeHtml(experiment) {
    if (!experiment || experiment.authored !== true) return "";
    return (
      '<p class="notice notice--warn">' +
        '<strong>Added for this site.</strong> ' +
        esc(experiment.authoredNote || "This experiment is not part of the submitted lab record.") +
      "</p>"
    );
  }

  /* Data files each section actually touches, so the button only appears when
     there is a real file behind it. */
  var SECTION_FILES = {
    "1-a": ["StudentOutputs.csv", "StudentsOutputs.csv"],
    "1-b": ["Student.json"],
    "1-c": ["Student.xlsx"],
    "2-b": ["Engineer.db", "ds_experiment2b.db"],
    "5-a": ["iris.csv"]
  };

  function humanFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* Offers the section's Python source and the data files it reads or writes.
     The .py is built in the browser from the same string that feeds the Code
     Lab, so the download can never drift from the code shown on screen. */
  function downloadsHtml(experiment, section) {
    const key = experiment.id + "-" + section.id;
    const fileName = "experiment-" + experiment.id + "-" + section.id.toLowerCase() + ".py";
    const dataFiles = SECTION_FILES[key] || [];
    const code = String(section.code || "");

    const rows = [];
    rows.push(
      '<div class="dl-row">' +
        '<div class="dl-row__text">' +
          '<b>Python source</b>' +
          "<span>" + esc(fileName) + " &middot; " + plural(code.split("\n").length, "line") +
               " &middot; same code the Code Run page runs</span>" +
        "</div>" +
        '<button class="btn btn--ghost dl-btn" type="button" data-dl-src="' + esc(key) + '">' +
          ICON.download + " Download .py" +
        "</button>" +
      "</div>"
    );

    dataFiles.forEach(function (f) {
      const href = "assets/downloads/" + f;
      rows.push(
        '<div class="dl-row">' +
          '<div class="dl-row__text">' +
            "<b>" + esc(f) + "</b>" +
            "<span>Data file used by this part</span>" +
          "</div>" +
          '<a class="btn btn--ghost dl-btn" href="' + esc(href) + '" download>' +
            ICON.download + " Download" +
          "</a>" +
        "</div>"
      );
    });

    return (
      '<div class="downloads">' +
        '<h3 class="field-label"><span class="dot"></span>Download</h3>' +
        rows.join("") +
      "</div>"
    );
  }

  function sectionVideoHtml(section) {
    const src = section.video;
    const ytId = youtubeIdOf(section.youtubeVideo);

    /* A YouTube link takes priority: the embedded player gives real
       play/pause/scrub/fullscreen, which a linked file also does. */
    if (ytId) {
      return (
        '<div class="media media--yt">' +
          '<iframe class="media__embed" src="https://www.youtube-nocookie.com/embed/' + esc(ytId) +
            '?rel=0" title="Video for section ' + esc(section.letter) + '" ' +
            'loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; ' +
            'gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' +
          '<div class="media__badges">' +
            '<span class="badge badge--live">' + ICON.youtube + " YOUTUBE</span>" +
          "</div>" +
          '<a class="media__watch" href="https://www.youtube.com/watch?v=' + esc(ytId) + '" ' +
            'target="_blank" rel="noopener noreferrer">' + ICON.youtube + " Watch on YouTube</a>" +
        "</div>"
      );
    }

    if (!src) {
      return (
        '<div class="media">' +
          '<div class="media__ph media__ph--tall">' + ICON.video +
            "<strong>Section video pending</strong>" +
            "<span>Set this section's <code>youtubeVideo</code> or <code>video</code> in <code>assets/js/data.js</code></span>" +
          "</div>" +
        "</div>"
      );
    }

    return (
      '<div class="media">' +
        '<video class="media__video media__video--tall" src="' + esc(src) + '" controls playsinline preload="metadata" ' +
          'aria-label="Video for section ' + esc(section.letter) + '"></video>' +
      "</div>"
    );
  }

  function youtubeIdOf(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const m = raw.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{6,}$/.test(raw) ? raw : "";
  }

  function youtubeBlockHtml(experiment) {
    const id = youtubeIdOf(experiment.youtubeVideo);
    const media = id
      ? '<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(id) +
        '?rel=0" title="YouTube video for ' + esc(experiment.name) +
        '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
      : '<div class="media"><div class="media__ph">' + ICON.youtube +
        "<strong>YouTube video pending</strong>" +
        "<span>Set <code>youtubeVideo</code> in <code>assets/js/data.js</code></span>" +
        "</div></div>";

    const link = experiment.youtubeLink
      ? '<a class="link-row link-row--yt" href="' + esc(experiment.youtubeLink) + '" target="_blank" rel="noopener noreferrer">' +
          ICON.youtube +
          '<span class="link-row__text"><b>YouTube Link</b>' +
          '<span class="link-row__url">' + esc(experiment.youtubeLink) + "</span></span>" +
          ICON.external +
        "</a>"
      : '<div class="link-row link-row--yt">' + ICON.youtube +
          '<span class="link-row__text"><b>YouTube Link</b>' +
          '<span class="link-row__url">Set <code>youtubeLink</code> in data.js</span></span>' +
        "</div>";

    const gh = experiment.githubLink
      ? '<a class="link-row link-row--gh" href="' + esc(experiment.githubLink) + '" target="_blank" rel="noopener noreferrer">' +
          ICON.github +
          '<span class="link-row__text"><b>GitHub Link</b>' +
          '<span class="link-row__url">' + esc(experiment.githubLink) + "</span></span>" +
          ICON.external +
        "</a>"
      : '<div class="link-row link-row--gh">' + ICON.github +
          '<span class="link-row__text"><b>GitHub Link</b>' +
          '<span class="link-row__url">Set <code>githubLink</code> in data.js</span></span>' +
        "</div>";

    return (
      '<div class="stack-sm">' + media + link + gh + "</div>"
    );
  }

  /* ---------------------------------------------------------------------
     3. CODE VIEWER
     --------------------------------------------------------------------- */
  function codeViewerHtml(rawCode, fileName) {
    const code = String(rawCode || "").replace(/\s+$/, "");
    const lines = code ? code.split("\n") : [""];

    const rows = lines
      .map(function (line, i) {
        return (
          '<div class="code-line">' +
            '<span class="code-gutter">' + (i + 1) + "</span>" +
            '<span class="code-code">' + (highlightPython(line) || "&nbsp;") + "</span>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="code">' +
        '<div class="code__bar">' +
          '<span class="code__dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<span class="code__name">' + esc(fileName) + "</span>" +
          '<span class="code__bar-spacer"></span>' +
          '<span class="chip chip--accent">Python</span>' +
        "</div>" +
        '<div class="code-panel" data-code-panel tabindex="0">' +
          '<div class="code-table">' + rows + "</div>" +
        "</div>" +
        '<div class="code-foot">' +
          "<span>" + plural(lines.length, "line") + "</span>" +
          '<span class="code-foot__spacer"></span>' +
          '<button class="btn btn--sm" type="button" data-copy>' + ICON.copy + " Copy Code</button>" +
          '<button class="btn btn--sm btn--ghost" type="button" data-download>' + ICON.download + " .py</button>" +
        "</div>" +
      "</div>"
    );
  }

  function wireCodeViewer(root, code, fileName) {
    const copyBtn = $("[data-copy]", root);
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyText(code).then(function (ok) {
          toast(ok ? "Code copied to clipboard" : "Copy blocked by the browser - select the code manually");
          copyBtn.innerHTML = (ok ? ICON.check : ICON.copy) + " " + (ok ? "Copied" : "Copy Code");
          setTimeout(function () {
            copyBtn.innerHTML = ICON.copy + " Copy Code";
          }, 1900);
        });
      });
    }

    const dlBtn = $("[data-download]", root);
    if (dlBtn) {
      dlBtn.addEventListener("click", function () {
        const blob = new Blob([code], { type: "text/x-python;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        toast("Downloaded " + fileName);
      });
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  /* ---------------------------------------------------------------------
     4. HOVER PREVIEW BEHAVIOUR
     --------------------------------------------------------------------- */
  function bindHoverPreview(frame) {
    const video = $("video", frame);
    if (!video) return;

    const soundBtn = $("[data-sound]", frame);
    let timer = null;

    // browsers only allow unattended autoplay when muted
    video.muted = true;
    if (soundBtn) soundBtn.classList.add("is-muted");

    function start() {
      clearInterval(timer);
      if (video.currentTime > 0.05) video.currentTime = 0;
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () {
          video.muted = true;           // fall back to muted autoplay
          if (soundBtn) soundBtn.classList.add("is-muted");
          video.play().catch(function () {});
        });
      }
      // keep the preview running for about ten seconds, then loop the clip
      timer = setInterval(function () {
        if (video.ended || video.currentTime >= PREVIEW_SECONDS) {
          video.currentTime = 0;
          video.play().catch(function () {});
        }
      }, 220);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      video.pause();
      video.currentTime = 0;             // rewind on mouse leave
    }

    frame.addEventListener("mouseenter", start);
    frame.addEventListener("mouseleave", stop);
    frame.addEventListener("click", function (event) {
      if (event.target.closest("[data-sound]")) return;
      if (video.paused) { start(); } else { stop(); }
    });

    video.addEventListener("error", function () {
      stop();
      clearInterval(timer);
      showMediaFallback(frame, video.getAttribute("src") || "", false);
    });

    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        video.muted = !video.muted;
        soundBtn.classList.toggle("is-muted", video.muted);
        soundBtn.setAttribute("aria-label", video.muted ? "Unmute preview" : "Mute preview");
      });
    }
  }

  function wireAllPreviews(root) {
    $$("[data-preview]", root).forEach(bindHoverPreview);
  }

  function wireVideoErrors(root) {
    $$("video", root).forEach(function (video) {
      if (video.hasAttribute("controls")) {
        video.addEventListener("error", function () {
          showMediaFallback(video.parentElement, video.getAttribute("src") || "", true);
        });
      }
    });
  }

  /* ---------------------------------------------------------------------
     4b. PYTHON CODE LAB
     ---------------------------------------------------------------------
     Runs real Python in the browser with Pyodide (CPython compiled to
     WebAssembly) inside a Web Worker.

     Why a worker: Pyodide executes synchronously, so running it on the main
     thread would freeze the whole page and make the Stop button useless. The
     worker is built from a Blob URL, which keeps the site working when opened
     straight from the filesystem (a file:// worker script is blocked by
     Chrome, a blob:// one is not).

     Why not a server: the whole site stays double-click-and-open, with no
     install and no build step. The only cost is a one-time ~10 MB download
     of the Python runtime, after which the browser caches it.
     --------------------------------------------------------------------- */
  const PYODIDE_VERSION = "0.27.2";
  const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";

  /* Source handed over by a section page's "Run this code" button. */
  let pendingLabCode = null;

  /* Survives route changes so the runtime is only downloaded once. */
  let labWorker = null;
  let labReady = false;
  let labBusy = false;

  const LAB_SAMPLES = {
    starter: [
      "# Digital Laboratory - Python 3.12",
      "# Press Run (or Ctrl+Enter). Output appears below, plots on the right.",
      "",
      "import pandas as pd",
      "import numpy as np",
      "",
      "marks = [78, 85, 90, 72, 88, 65, 70]",
      "df = pd.DataFrame({\"Marks\": marks})",
      "",
      "print(df)",
      "print(\"Mean:\", df[\"Marks\"].mean())",
      "print(\"Std :\", round(df[\"Marks\"].std(), 3))"
    ].join("\n"),
    plot: [
      "import matplotlib",
      "matplotlib.use(\"Agg\")",
      "import matplotlib.pyplot as plt",
      "import numpy as np",
      "",
      "x = np.linspace(0, 2 * np.pi, 200)",
      "plt.figure(figsize=(6, 3.6))",
      "plt.plot(x, np.sin(x), label=\"sin x\")",
      "plt.plot(x, np.cos(x), label=\"cos x\")",
      "plt.title(\"Trigonometric functions\")",
      "plt.grid(alpha=0.3)",
      "plt.legend()",
      "plt.show()",
      "print(\"figure rendered\")"
    ].join("\n"),
    data: [
      "import pandas as pd",
      "import numpy as np",
      "",
      "df = pd.DataFrame({",
      "    \"Department\": [\"CSE\"] * 5 + [\"ECE\"] * 5,",
      "    \"Marks\": [78, 85, 90, 72, 88, 65, 70, 82, 75, 80],",
      "})",
      "",
      "print(df.groupby(\"Department\")[\"Marks\"].agg([\"mean\", \"max\"]))",
      "",
      "q1 = df[\"Marks\"].quantile(0.25)",
      "q3 = df[\"Marks\"].quantile(0.75)",
      "iqr = q3 - q1",
      "outliers = df[(df[\"Marks\"] < q1 - 1.5 * iqr) | (df[\"Marks\"] > q3 + 1.5 * iqr)]",
      "print(\"IQR outliers:\")",
      "print(outliers if len(outliers) else \"none\")"
    ].join("\n")
  };

  function renderCodeLab() {
    const carry = pendingLabCode;
    const seed = carry && carry.code ? carry.code : LAB_SAMPLES.starter;

    return (
      '<div class="page stack">' +
           crumb([{ label: "Home", href: "#/" }, { label: "Code Run" }]) +

        '<header class="section-title-row" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
          '<span class="chip chip--gold">Python 3.12</span>' +
             '<h1 class="sec-title" style="margin:0">Code Run</h1>' +
          '<span class="exp-head__spacer"></span>' +
          '<span class="chip chip--accent" data-lab-runtime>Runtimenot loaded</span>' +
        "</header>" +

        (carry && carry.code
          ? '<div class="lab-banner">' + ICON.link +
            "<span><b>Loaded from " + esc(carry.label) + "</b> &middot; " + esc(carry.title || "") + "</span>" +
            '<button class="lab-banner__x" type="button" data-lab-clear aria-label="Discard the loaded code">' + ICON.close + "</button>" +
          "</div>"
          : "") +

        '<p class="sec-sub">A real Python 3.12 interpreter running inside your browser via Pyodide. ' +
          "It supports the whole data-science stack used in these experiments &mdash; " +
          "<code>pandas</code>, <code>numpy</code>, <code>matplotlib</code>, <code>seaborn</code>, " +
          "<code>re</code>, <code>sqlite3</code> and the standard library. " +
          "Nothing you write is uploaded anywhere.</p>" +

        '<div class="lab-grid">' +

          '<section class="card lab-editor">' +
            '<div class="code__bar">' +
              "<span>main.py</span>" +
              '<span class="code__bar-spacer"></span>' +
              '<button class="btn btn--run" type="button" data-lab-run>' + ICON.play + " Run</button>" +
              '<button class="btn btn--stop" type="button" data-lab-stop disabled>' + ICON.stop + " Stop</button>" +
              '<button class="btn btn--ghost btn--sm" type="button" data-lab-reset>Reset</button>' +
            "</div>" +
            '<textarea class="lab-code" id="labEditor" spellcheck="false" autocomplete="off" ' +
              'autocapitalize="off" autocorrect="off" aria-label="Python source editor">' + esc(seed) + "</textarea>" +
            '<div class="lab-samples">' +
              "<span>Examples:</span>" +
              '<button class="btn btn--ghost btn--sm" type="button" data-lab-sample="starter">Starter</button>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-lab-sample="plot">Plot</button>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-lab-sample="data">Data cleaning</button>' +
            "</div>" +
          "</section>" +

          '<section class="card lab-out">' +
            '<div class="code__bar">' +
              "<span>Console</span>" +
              '<span class="code__bar-spacer"></span>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-lab-clearout>Clear</button>' +
            "</div>" +
            '<div class="lab-console" id="labConsole">' +
              '<p class="lab-console__idle">Output will appear here. Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run.</p>' +
            "</div>" +
            '<div class="lab-status" id="labStatus" hidden></div>' +
            '<div class="lab-figs" id="labFigs"></div>' +
          "</section>" +

        "</div>" +

        '<p class="lab-foot">' +
          ICON.info +
          " First run downloads the Python runtime (about 10 MB) from a public CDN and needs an internet connection. " +
          "After that your browser caches it and later runs start instantly, even offline. " +
          "Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run, <kbd>Ctrl</kbd>+<kbd>.</kbd> to stop." +
        "</p>" +
      "</div>"
    );
  }

  /* Every DOM reference below is resolved at call time on purpose. The worker
     outlives individual renders, so its message handler must write to whatever
     Code Lab view is on screen *now* - holding on to the nodes from the first
     render would silently post output into a detached element. */
  function labRefs() {
    return {
      editor: $("#labEditor"),
      out: $("#labConsole"),
      figs: $("#labFigs"),
      status: $("#labStatus"),
      chip: $("[data-lab-runtime]"),
      run: $("[data-lab-run]"),
      stop: $("[data-lab-stop]")
    };
  }

  function labSetStatus(msg, kind) {
    const el = labRefs().status;
    if (!el) return;
    if (!msg) { el.hidden = true; return; }
    el.hidden = false;
    el.className = "lab-status lab-status--" + (kind || "info");
    el.textContent = msg;
  }

  function labSetRunning(on) {
    labBusy = on;
    const r = labRefs();
    if (r.run) r.run.disabled = on;
    if (r.stop) r.stop.disabled = !on;
    if (!r.chip) return;
    r.chip.textContent = on ? "Running..." : (labReady ? "Python 3.12 ready" : "Runtime not loaded");
    r.chip.classList.toggle("chip--accent", !labReady);
    r.chip.classList.toggle("chip--gold", labReady);
  }

  function labAppendOut(text, cls) {
    const box = labRefs().out;
    if (!box) return;
    const idle = box.querySelector(".lab-console__idle");
    if (idle) idle.remove();
    const line = document.createElement("div");
    line.className = "lab-console__line" + (cls ? " " + cls : "");
    line.textContent = text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function labAddFigures(figsData) {
    const box = labRefs().figs;
    if (!box) return;
    figsData.forEach(function (src, i) {
      box.insertAdjacentHTML("beforeend",
        '<figure class="lab-fig"><img alt="Figure ' + (i + 1) + '" src="data:image/png;base64,' + esc(src) + '">' +
        "<figcaption>Figure " + (i + 1) + "</figcaption></figure>");
    });
  }

  function ensureLabWorker() {
    if (labWorker) return;

    /* The Python side: run the snippet, capture both streams, and export any
       matplotlib figures as base64 PNGs so they can be shown as images. */
    const wrapper = [
      "import sys, io, base64, json",
      "_o, _e = sys.stdout, sys.stderr",
      "_b = io.StringIO()",
      "sys.stdout = _b; sys.stderr = _b",
      "_err = None",
      "try:",
      '    exec(compile(_CODE, "<lab>", "exec"), {"__name__": "__main__"})',
      "except SystemExit:",
      "    pass",
      "except BaseException:",
      "    import traceback",
      "    _err = traceback.format_exc()",
      "_figs = []",
      "try:",
      "    import matplotlib",
      '    matplotlib.use("Agg")',
      "    import matplotlib.pyplot as _plt",
      "    for _n in list(_plt.get_fignums()):",
      "        _f = _plt.figure(_n)",
      "        _buf = io.BytesIO()",
      '        _f.savefig(_buf, format="png", dpi=110, bbox_inches="tight")',
      "        _figs.append(base64.b64encode(_buf.getvalue()).decode())",
      "        _plt.close(_f)",
      '    _plt.close("all")',
      "except Exception:",
      "    pass",
      "sys.stdout = _o; sys.stderr = _e",
      '_RESULT = json.dumps({"out": _b.getvalue(), "err": _err, "figs": _figs})'
    ].join("\n");

    const src = [
      "let py = null;",
      "const post = (m) => self.postMessage(m);",
      "const WRAP = " + JSON.stringify(wrapper) + ";",
      "self.onmessage = async (e) => {",
      "  const { code } = e.data;",
      "  try {",
      "    if (!py) {",
      '      post({ type: "status", msg: "Downloading the Python runtime (~10 MB, first run only)..." });',
      '      importScripts("' + PYODIDE_CDN + 'pyodide.js");',
      "      py = await loadPyodide({ indexURL: \"" + PYODIDE_CDN + "\" });",
      '      post({ type: "ready" });',
      "    }",
      '    post({ type: "status", msg: "Loading packages..." });',
      "    await py.loadPackagesFromImports(code);",
      '    post({ type: "status", msg: "Running..." });',
      "    py.globals.set(\"_CODE\", code);",
      "    py.runPython(WRAP);",
      '    post({ type: "done", data: JSON.parse(py.globals.get("_RESULT")) });',
      "  } catch (err) {",
      '    post({ type: "error", msg: (err && err.message) ? err.message : String(err) });',
      "  }",
      "};"
    ].join("\n");

    labWorker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));

    labWorker.onmessage = function (ev) {
      const msg = ev.data || {};
      if (msg.type === "status") { labSetStatus(msg.msg, "info"); return; }
      if (msg.type === "ready") { labReady = true; labSetStatus("", "info"); labSetRunning(false); return; }
      if (msg.type === "error") {
        labSetRunning(false);
        labSetStatus("Run failed", "error");
        labAppendOut(msg.msg, "lab-console__line--error");
        return;
      }
      if (msg.type === "done") {
        labSetRunning(false);
        labSetStatus("", "info");
        const d = msg.data || {};
        if (d.out && d.out.trim()) labAppendOut(d.out.replace(/\n$/, ""));
        if (d.err) labAppendOut(d.err.replace(/\n$/, ""), "lab-console__line--error");
        if (!((d.out || "").trim() || (d.err || "").trim())) labAppendOut("(no output)");
        labAddFigures(d.figs || []);
      }
    };

    labWorker.onerror = function (ev) {
      labSetRunning(false);
      labSetStatus("The Python runtime could not start", "error");
      labAppendOut(ev.message || "Worker error. Check your internet connection on the first run.",
        "lab-console__line--error");
    };
  }

  function labRun() {
    if (labBusy) return;
    const r = labRefs();
    if (r.figs) r.figs.innerHTML = "";
    if (r.out) r.out.innerHTML = "";
    labSetRunning(true);
    labSetStatus("Starting...", "info");
    ensureLabWorker();
    if (r.editor) labWorker.postMessage({ code: r.editor.value });
  }

  function labStop() {
    if (!labWorker) return;
    /* Terminating is the only way to interrupt synchronous CPython code. */
    labWorker.terminate();
    labWorker = null;
    labReady = false;
    labSetRunning(false);
    labSetStatus("Stopped", "warn");
    labAppendOut("(stopped by user)", "lab-console__line--warn");
  }

  function wireCodeLab() {
    const editor = $("#labEditor");
    if (!editor) return;

    /* Editor niceties: Tab inserts spaces, Ctrl+Enter runs, Ctrl+. stops. */
    editor.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = editor.selectionStart, t = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "    " + editor.value.slice(t);
        editor.selectionStart = editor.selectionEnd = s + 4;
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        labRun();
      } else if (e.key === "." && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        labStop();
      }
    });

    $("[data-lab-run]").addEventListener("click", labRun);
    $("[data-lab-stop]").addEventListener("click", labStop);

    $("[data-lab-reset]").addEventListener("click", function () {
      const box = labRefs().editor;
      if (box) box.value = pendingLabCode && pendingLabCode.code ? pendingLabCode.code : LAB_SAMPLES.starter;
      toast("Editor reset");
    });

    const clearBtn = $("[data-lab-clear]");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        pendingLabCode = null;
        go("#/codelab");
      });
    }

    $$("[data-lab-sample]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const box = labRefs().editor;
        if (box) box.value = LAB_SAMPLES[btn.getAttribute("data-lab-sample")] || "";
        toast("Example loaded");
      });
    });

    $("[data-lab-clearout]").addEventListener("click", function () {
      const r = labRefs();
      if (r.out) r.out.innerHTML = "";
      if (r.figs) r.figs.innerHTML = "";
    });

    labSetRunning(false);
  }

  /* ---------------------------------------------------------------------
     5. ROUTER
     --------------------------------------------------------------------- */
  const view = $("#view");

  function go(hash) {
    if (window.location.hash === hash) render();
    else window.location.hash = hash;
  }

  function parseRoute() {
    const raw = (window.location.hash || "#/").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    return { name: parts[0] || "home", id: parts[1] || "", sid: parts[2] || "" };
  }

  function findExperiment(id) {
    return experiments.filter(function (e) { return String(e.id) === String(id); })[0] || null;
  }

  function findSection(experiment, sid) {
    return experiment.sections.filter(function (s) {
      return String(s.id) === String(sid) || String(s.letter) === String(sid);
    })[0] || null;
  }

  function crumb(items) {
    return '<nav class="breadcrumb">' + items.map(function (item, i) {
      const last = i === items.length - 1;
      const node = last || !item.href
        ? "<span>" + esc(item.label) + "</span>"
        : '<a href="' + esc(item.href) + '" data-link>' + ICON.arrowLeft + " " + esc(item.label) + "</a>";
      return last ? node : node + '<span aria-hidden="true">/</span>';
    }).join("") + "</nav>";
  }

  function notFound() {
    return (
      '<div class="page stack">' +
        crumb([{ label: "Home", href: "#/" }, { label: "Not found" }]) +
        '<div class="card card--pad center stack">' +
          '<h1 class="sec-title">That page does not exist</h1>' +
          '<p class="sec-sub" style="margin-inline:auto">The link may be out of date, or the experiment was renamed.</p>' +
          '<div class="center"><a class="btn btn--primary" href="#/" data-link>' + ICON.arrowLeft + " Back to the laboratory</a></div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
     PAGE 1 - MAIN LABORATORY PAGE
     --------------------------------------------------------------------- */
  let addCursor = 0;   // which experiment the "+ ADD" button will open next

  function renderHome() {
    const cards = experiments
      .map(function (e, i) {
        return (
          '<article class="exp-card" data-exp-card="' + e.id + '" ' +
            'style="animation-delay:' + Math.min(i * 45, 400) + 'ms" tabindex="0" role="button" ' +
            'aria-label="Open preview of Experiment ' + e.id + ", " + esc(e.name) + '">' +
            '<div class="exp-card__top">' +
              '<span class="exp-card__num">' + e.id + "</span>" +
              '<h3 class="exp-card__name">' + esc(e.name) + "</h3>" +
            "</div>" +
            '<p class="exp-card__tag">' + esc(e.tagline || "") + "</p>" +
            '<div class="exp-card__foot">' +
              '<span class="chip">' + plural(e.sections.length, "part") + "</span>" +
              '<span class="exp-card__parts">' + e.sections.map(function (s) {
                return "<i>" + esc(s.letter) + "</i>";
              }).join("") + "</span>" +
            "</div>" +
          "</article>"
        );
      })
      .join("");

    const nextExperiment = experiments[addCursor % Math.max(experiments.length, 1)];

    return (
      '<div class="page stack">' +

        '<section class="lab-hero" id="dashboardTop">' +
          '<div class="card univ-card">' +
            '<h2 class="univ-card__lab">' + esc(laboratory.name) + "</h2>" +
            '<p class="univ-card__code">Subject Code: <b>' + esc(labMeta.subjectCode) + "</b></p>" +
            '<p class="univ-card__addr">' + esc(laboratory.address) + "</p>" +

            '<div class="search" id="search">' +
              '<div class="search__box">' +
                '<span class="search__icon">' + ICON.search + "</span>" +
                '<input class="search__input" id="searchInput" type="search" autocomplete="off" ' +
                  'spellcheck="false" placeholder="Search Experiments..." aria-label="Search experiments" ' +
                  'role="combobox" aria-expanded="false" aria-controls="searchResults" aria-autocomplete="list">' +
                '<button class="search__clear" id="searchClear" type="button" aria-label="Clear search">' + ICON.close + "</button>" +
              "</div>" +
              '<div class="ac" id="searchResults" role="listbox" aria-label="Search suggestions"></div>' +
              '<p class="search__hint">Press <kbd>/</kbd> to search &middot; <kbd>&uarr;</kbd><kbd>&darr;</kbd> to move &middot; <kbd>Enter</kbd> to open</p>' +
            "</div>" +
          "</div>" +
          studentCardHtml() +
        "</section>" +

        '<section id="catalogue">' +
          '<div class="exp-head section-title-row">' +
            '<h2 class="exp-head__title">Experiments: <span class="exp-head__count" id="expCount">' +
              plural(experiments.length, "experiment") + "</span></h2>" +
            '<span class="exp-head__spacer"></span>' +
            '<span class="exp-head__hint" id="addHint"></span>' +
            '<button class="btn btn--add" id="addBtn" type="button">+ ADD</button>' +
          "</div>" +
          '<div class="exp-grid" id="expGrid">' + (cards || emptyStateHtml()) + "</div>" +
        "</section>" +

      "</div>"
    );
  }

  function emptyStateHtml() {
    return (
      '<div class="empty-state">' +
        ICON.search +
        "<h3>No experiments match your search</h3>" +
        '<p class="muted">Try a different keyword, or clear the search box to see all ' + plural(experiments.length, "experiment") + ".</p>" +
      "</div>"
    );
  }

  function wireHome() {
    const grid = $("#expGrid");
    const input = $("#searchInput");
    const results = $("#searchResults");
    const wrapper = $("#search");
    const addBtn = $("#addBtn");
    const addHint = $("#addHint");
    let activeIndex = -1;
    let visible = experiments.slice();

    /* ---- "+ ADD" : walks forward through the experiment list ---- */
    function addTarget() {
      return experiments[addCursor % Math.max(experiments.length, 1)];
    }

    function paintAddHint() {
      const target = addTarget();
      addHint.innerHTML = target
        ? "opens <b>Experiment " + target.id + " &middot; " + esc(target.name) + "</b>"
        : "";
    }

    addBtn.addEventListener("click", function () {
      const target = addTarget();
      if (!target) return;
      addCursor = (addCursor + 1) % Math.max(experiments.length, 1);
      paintAddHint();
      go("#/experiment/" + target.id);
    });
    paintAddHint();

    /* ---- opening a specific experiment ---- */
    function openExperiment(id) {
      addCursor = experiments.findIndex(function (e) { return String(e.id) === String(id); });
      if (addCursor < 0) addCursor = 0;
      paintAddHint();
      closeList();
      go("#/experiment/" + id);
    }

    $$("[data-exp-card]", grid).forEach(function (card) {
      card.addEventListener("click", function () { openExperiment(card.getAttribute("data-exp-card")); });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openExperiment(card.getAttribute("data-exp-card"));
        }
      });
    });

    /* ---- search + autocomplete ----
       Matches the experiment name first, but also the tagline, the summary
       and the part titles, so searching for a library such as "pandas" or a
       technique such as "multiindex" finds the right experiment even when
       those words never appear in its title. */
    function haystack(e) {
      if (e.__hay) return e.__hay;
      const parts = [e.name, e.tagline, e.summary];
      (e.sections || []).forEach(function (s) {
        parts.push(s.title);
        /* The full source is indexed too so a student can find the part that
           actually calls a library, e.g. searching "scipy" or "numpy".
           The whole corpus is only a few tens of kB, so this stays cheap. */
        if (s.code) parts.push(s.code);
      });
      e.__hay = parts.join(" \u0001 ").toLowerCase();
      return e.__hay;
    }

    function matches(query) {
      const q = query.trim().toLowerCase();
      if (!q) return experiments.slice();
      return experiments.filter(function (e) {
        return haystack(e).indexOf(q) !== -1;
      });
    }

    function paintCards(query) {
      visible = matches(query);
      const q = query.trim();

      if (!visible.length) {
        grid.innerHTML = emptyStateHtml();
        $("#expCount").textContent = "0 results";
        return;
      }

      grid.innerHTML = visible
        .map(function (e) {
          return (
            '<article class="exp-card" data-exp-card="' + e.id + '" tabindex="0" role="button" ' +
              'aria-label="Open preview of Experiment ' + e.id + ", " + esc(e.name) + '">' +
              '<div class="exp-card__top">' +
                '<span class="exp-card__num">' + e.id + "</span>" +
                "<h3 class=\"exp-card__name\">" + highlightMatch(e.name, q) + "</h3>" +
              "</div>" +
              '<p class="exp-card__tag">' + esc(e.tagline || "") + "</p>" +
              '<div class="exp-card__foot">' +
                '<span class="chip">' + plural(e.sections.length, "part") + "</span>" +
                '<span class="exp-card__parts">' + e.sections.map(function (s) {
                  return "<i>" + esc(s.letter) + "</i>";
                }).join("") + "</span>" +
              "</div>" +
            "</article>"
          );
        })
        .join("");

      $$("[data-exp-card]", grid).forEach(function (card) {
        card.addEventListener("click", function () { openExperiment(card.getAttribute("data-exp-card")); });
        card.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openExperiment(card.getAttribute("data-exp-card"));
          }
        });
      });

      $("#expCount").textContent = q
        ? visible.length + " of " + experiments.length
        : plural(experiments.length, "experiment");
    }

    function closeList() {
      results.classList.remove("is-open");
      input.setAttribute("aria-expanded", "false");
      activeIndex = -1;
    }

    function paintList() {
      const q = input.value.trim();
      if (!q) return closeList();
      const found = matches(q).slice(0, 8);

      if (!found.length) {
        results.innerHTML = '<div class="ac__empty">No experiment matches &ldquo;' + esc(q) + "&rdquo;</div>";
      } else {
        results.innerHTML = found
          .map(function (e, i) {
            return (
              '<button class="ac__item" type="button" data-ac="' + e.id + '" role="option" ' +
                'aria-selected="' + (i === activeIndex) + '">' +
                '<span class="ac__num">' + e.id + "</span>" +
                '<span class="ac__name">' + highlightMatch(e.name, q) + "</span>" +
                '<span class="ac__meta">' + plural(e.sections.length, "part") + "</span>" +
              "</button>"
            );
          })
          .join("");
        $$("[data-ac]", results).forEach(function (btn) {
          btn.addEventListener("click", function () { openExperiment(btn.getAttribute("data-ac")); });
        });
      }

      results.classList.add("is-open");
      input.setAttribute("aria-expanded", "true");
      $$("[data-ac]", results).forEach(function (btn, i) {
        btn.classList.toggle("is-active", i === activeIndex);
      });
    }

    function move(delta) {
      const items = $$("[data-ac]", results);
      if (!items.length) return;
      activeIndex = (activeIndex + delta + items.length) % items.length;
      items.forEach(function (btn, i) {
        btn.classList.toggle("is-active", i === activeIndex);
        btn.setAttribute("aria-selected", i === activeIndex);
      });
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", function () {
      wrapper.classList.toggle("is-filled", input.value.length > 0);
      activeIndex = -1;
      paintCards(input.value);
      paintList();
    });

    input.addEventListener("focus", function () {
      if (input.value.trim()) paintList();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
      else if (event.key === "Enter") {
        const items = $$("[data-ac]", results);
        if (items.length) {
          event.preventDefault();
          openExperiment(items[Math.max(activeIndex, 0)].getAttribute("data-ac"));
        }
      } else if (event.key === "Escape") {
        closeList();
        input.blur();
      }
    });

    $("#searchClear").addEventListener("click", function () {
      input.value = "";
      wrapper.classList.remove("is-filled");
      activeIndex = -1;
      paintCards("");
      closeList();
      input.focus();
    });

    document.addEventListener("click", function (event) {
      if (!wrapper.contains(event.target)) closeList();
    });

    document.addEventListener("keydown", function (event) {
      const tag = (event.target.tagName || "").toLowerCase();
      if (event.key === "/" && tag !== "input" && tag !== "textarea") {
        event.preventDefault();
        input.focus();
        input.select();
      }
      if (event.key === "Escape" && document.activeElement === input) closeList();
    });

    paintCards("");
  }

  /* ---------------------------------------------------------------------
     PAGE 2 - EXPERIMENT PREVIEW CARD
     --------------------------------------------------------------------- */
  function renderPreview(experiment) {
    return (
      '<div class="page stack">' +
        crumb([
          { label: "Home", href: "#/" },
          { label: "Experiment " + experiment.id }
        ]) +

        '<section class="split" style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(18px,2.6vw,30px);align-items:start">' +
          previewVideoHtml(experiment) +
          '<div class="preview-aside">' +
            '<p class="eyebrow">Experiment ' + experiment.id + "</p>" +
            '<h1 class="preview-title"><span class="hl">' + esc(experiment.name) + "</span></h1>" +
            '<p class="sec-sub">' + esc(experiment.tagline || "") + "</p>" +
            authoredNoticeHtml(experiment) +
            '<div class="meta-row">' +
              '<span class="chip chip--accent">' + plural(experiment.sections.length, "part") + "</span>" +
              '<span class="chip">' + esc(labMeta.subjectCode) + "</span>" +
              '<span class="chip">' + esc(labMeta.academicYear) + "</span>" +
              '<span class="chip">~' + PREVIEW_SECONDS + "s preview</span>" +
            "</div>" +
            '<div>' +
              "<h3 class=\"field-label\"><span class=\"dot\"></span>Parts in this experiment</h3>" +
              '<ul class="mini-list">' + experiment.sections.map(function (s) {
                return "<li><b>" + esc(s.letter) + "</b><span>" + esc(s.title) + "</span></li>";
              }).join("") + "</ul>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<button class="overview-cta" type="button" id="overviewBtn">' +
          '<span class="overview-cta__label">' + ICON.doc +
            "<span><h2>Overview</h2>" +
            "<p>Read the full description, watch the YouTube walkthrough and open any part A / B / C &hellip;</p></span>" +
          "</span>" +
          '<span class="overview-cta__arrow">' + ICON.arrowRight + "</span>" +
        "</button>" +

      "</div>"
    );
  }

  function wirePreviewPage(experiment) {
    wireAllPreviews(document);
    const btn = $("#overviewBtn");
    if (btn) btn.addEventListener("click", function () { go("#/overview/" + experiment.id); });
  }

  /* ---------------------------------------------------------------------
     PAGE 3 - EXPERIMENT OVERVIEW / DETAILS
     --------------------------------------------------------------------- */
  function renderOverview(experiment) {
    const parts = experiment.sections
      .map(function (s) {
        return (
          '<button class="part" type="button" data-part="' + esc(s.id) + '" aria-label="Open section ' + esc(s.letter) + '">' +
            '<span class="part__letter">' + esc(s.letter) + "</span>" +
            '<span class="part__label">' + esc(s.title.split(" ").slice(0, 3).join(" ")) + "</span>" +
          "</button>"
        );
      })
      .join("");

    return (
      '<div class="page stack">' +
        crumb([
          { label: "Home", href: "#/" },
          { label: "Experiment " + experiment.id, href: "#/experiment/" + experiment.id },
          { label: "Overview" }
        ]) +

        '<section class="split" style="display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(18px,2.6vw,30px);align-items:start">' +
          previewVideoHtml(experiment) +
          '<div class="preview-aside">' +
            '<p class="eyebrow">Experiment ' + experiment.id + "</p>" +
            '<h1 class="preview-title"><span class="hl">' + esc(experiment.name) + "</span></h1>" +
            '<p class="sec-sub">' + esc(experiment.tagline || "") + "</p>" +
            authoredNoticeHtml(experiment) +
            "<div>" +
              '<h3 class="field-label"><span class="dot"></span>Experiment sections &middot; ' +
                plural(experiment.sections.length, "part") + "</h3>" +
              '<div class="parts">' + parts + "</div>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="split" style="display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(18px,2.6vw,30px);align-items:start">' +
          '<div class="card card--pad">' +
            '<h2 class="field-label"><span class="dot"></span>YouTube video</h2>' +
            youtubeBlockHtml(experiment) +
            '<h2 class="field-label" style="margin-top:22px"><span class="dot"></span>Summary of Experiment</h2>' +
            '<p class="summary">' + esc(experiment.summary || "Summary pending - set `summary` in assets/js/data.js.") + "</p>" +
          "</div>" +

          '<div class="card card--pad">' +
            '<h2 class="field-label"><span class="dot"></span>At a glance</h2>' +
            '<dl class="idcard__fields" style="margin-bottom:18px">' +
              "<div class=\"idcard__field\"><dt>Subject Code</dt><dd>" + esc(labMeta.subjectCode) + "</dd></div>" +
              "<div class=\"idcard__field\"><dt>Laboratory</dt><dd>" + esc(laboratory.name) + "</dd></div>" +
              "<div class=\"idcard__field\"><dt>Experiment</dt><dd>" + experiment.id + "</dd></div>" +
              "<div class=\"idcard__field\"><dt>Sections</dt><dd>" + plural(experiment.sections.length, "part") + "</dd></div>" +
              "<div class=\"idcard__field\"><dt>Academic Year</dt><dd>" + esc(labMeta.academicYear) + "</dd></div>" +
            "</dl>" +
            "<h3 class=\"field-label\"><span class=\"dot\"></span>All sections</h3>" +
            '<ul class="mini-list">' + experiment.sections.map(function (s) {
              return "<li><b>" + esc(s.letter) + "</b><span>" + esc(s.title) + "</span></li>";
            }).join("") + "</ul>" +
          "</div>" +
        "</section>" +

        '<div class="pager">' +
          '<a class="btn btn--ghost" href="#/experiment/' + experiment.id + '" data-link>' + ICON.arrowLeft + " Back to preview</a>" +
          '<a class="btn btn--primary" href="#/section/' + experiment.id + "/" + experiment.sections[0].id + '" data-link>' +
            "Open part " + esc(experiment.sections[0].letter) + ICON.arrowRight +
          "</a>" +
        "</div>" +

      "</div>"
    );
  }

  function wireOverview(experiment) {
    wireAllPreviews(document);
    $$("[data-part]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        go("#/section/" + experiment.id + "/" + btn.getAttribute("data-part"));
      });
    });
  }

  /* ---------------------------------------------------------------------
     PAGE 4 - INDIVIDUAL EXPERIMENT SECTION
     --------------------------------------------------------------------- */
  function renderSection(experiment, section) {
    const siblings = experiment.sections;
    const at = siblings.indexOf(section);
    const prev = at > 0 ? siblings[at - 1] : null;
    const next = at < siblings.length - 1 ? siblings[at + 1] : null;
    const code = String(section.code || "");
    const fileName = "experiment-" + experiment.id + "-" + section.id.toLowerCase() + ".py";

    const output = section.outputImage
      ? '<figure class="output-figure">' +
          '<h2 class="field-label"><span class="dot"></span>Output</h2>' +
          '<img src="' + esc(section.outputImage) + '" alt="Output produced by section ' + esc(section.letter) + '" loading="lazy">' +
          "<figcaption>" + esc(section.title) + "</figcaption>" +
        "</figure>"
      : "";

    /* Notes carried over from the lab notebook: what the part does, the key
       points, and the traps worth knowing before running it. */
    const notes = section.notes
      ? '<div class="refbox">' +
          '<h3 class="field-label"><span class="dot"></span>Notes</h3>' +
          '<pre class="refbox__pre">' + esc(String(section.notes)) + "</pre>" +
        "</div>"
      : "";

    return (
      '<div class="page stack">' +
        crumb([
          { label: "Home", href: "#/" },
          { label: "Experiment " + experiment.id, href: "#/experiment/" + experiment.id },
          { label: "Overview", href: "#/overview/" + experiment.id },
          { label: section.letter }
        ]) +

        '<header class="section-title-row" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
          '<span class="chip chip--gold">Experiment ' + experiment.id + "</span>" +
          '<h1 class="sec-title" style="margin:0">' + esc(experiment.name) + "</h1>" +
          '<span class="exp-head__spacer"></span>' +
          '<span class="chip chip--accent" style="font-size:15px;padding:9px 16px">Part ' + esc(section.letter) + "</span>" +
        "</header>" +

        authoredNoticeHtml(experiment) +

        '<section class="split" style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:clamp(18px,2.6vw,30px);align-items:start">' +

          /* LEFT : video, then the code block underneath it */
          "<div>" +
            sectionVideoHtml(section) +
            '<div style="margin-top:22px">' +
              '<h2 class="field-label"><span class="dot"></span>Code</h2>' +
              codeViewerHtml(code, fileName) +
              (code ? '<div class="code-runbar">' +
                '<button class="btn btn--run" type="button" data-run-code>' + ICON.play + " Run this code</button>" +
                   '<span class="code-runbar__hint">Opens Code Run with this part pre-loaded</span>' +
              "</div>" : "") +
            "</div>" +
          "</div>" +

          /* RIGHT : details for this part */
          '<aside class="card card--pad stack">' +
            '<div>' +
              '<p class="eyebrow">Experiment ' + experiment.id + " &middot; Part " + esc(section.letter) + "</p>" +
              '<h2 class="sec-title" style="font-size:clamp(19px,2.3vw,24px)">' + esc(section.title) + "</h2>" +
            "</div>" +
            '<dl class="idcard__fields">' +
              '<div class="idcard__field"><dt>Experiment</dt><dd>' + experiment.id + "</dd></div>" +
              '<div class="idcard__field"><dt>Part</dt><dd>' + esc(section.letter) + "</dd></div>" +
              '<div class="idcard__field"><dt>Language</dt><dd>Python</dd></div>' +
              '<div class="idcard__field"><dt>Lines</dt><dd>' + (code ? plural(code.split("\n").length, "line") : "0") + "</dd></div>" +
              '<div class="idcard__field"><dt>Subject</dt><dd>' + esc(labMeta.subjectCode) + "</dd></div>" +
            "</dl>" +
            output +
            notes +
            downloadsHtml(experiment, section) +
            '<div>' +
              '<h3 class="field-label"><span class="dot"></span>Jump to part</h3>' +
              '<div class="parts">' + siblings.map(function (s) {
                const active = s.id === section.id;
                return '<button class="part" type="button" data-goto="' + esc(s.id) + '" ' +
                  (active ? 'style="border-color:var(--accent);box-shadow:var(--glow)"' : "") + '>' +
                  '<span class="part__letter">' + esc(s.letter) + "</span>" +
                  '<span class="part__label">' + (active ? "current" : "part " + esc(s.letter)) + "</span>" +
                "</button>";
              }).join("") + "</div>" +
            "</div>" +
          "</aside>" +

        "</section>" +

        '<div class="pager">' +
          (prev
            ? '<a class="btn btn--ghost" href="#/section/' + experiment.id + "/" + prev.id + '" data-link>' +
                ICON.arrowLeft + " Part " + esc(prev.letter) + "</a>"
            : '<a class="btn btn--ghost" href="#/overview/' + experiment.id + '" data-link>' + ICON.arrowLeft + " Overview</a>") +
          (next
            ? '<a class="btn btn--primary" href="#/section/' + experiment.id + "/" + next.id + '" data-link>' +
                "Part " + esc(next.letter) + ICON.arrowRight + "</a>"
            : '<a class="btn btn--primary" href="#/overview/' + experiment.id + '" data-link>Back to overview ' + ICON.arrowRight + "</a>") +
        "</div>" +

      "</div>"
    );
  }

  function wireSection(experiment, section) {
    wireVideoErrors(document);
    wireCodeViewer(document, String(section.code || ""), "experiment-" + experiment.id + "-" + section.id.toLowerCase() + ".py");

    /* "Run this code" -> Code Lab, carrying this part's source across. */
    $$("[data-run-code]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        pendingLabCode = {
          code: String(section.code || ""),
          label: "Experiment " + experiment.id + " · Part " + section.letter,
          title: section.title
        };
        go("#/codelab");
      });
    });

    $$("[data-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        go("#/section/" + experiment.id + "/" + btn.getAttribute("data-goto"));
      });
    });

    /* Save the .py. Built from the same string the Code Lab runs, so the
       file on disk is byte-identical to the code shown on the page. */
    $$("[data-dl-src]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const name = "experiment-" + experiment.id + "-" + section.id.toLowerCase() + ".py";
        const header =
          "# Experiment " + experiment.id + " - Part " + section.letter + "\n" +
          "# " + section.title + "\n" +
          "# " + labMeta.subjectCode + "  " + labMeta.academicYear + "\n" +
          "#\n" +
          "# Source as shown on the Digital Laboratory site.\n\n";
        const blob = new Blob([header + String(section.code || "")], { type: "text/x-python;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        /* release the object URL once the browser has taken the file */
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        toast("Downloaded " + name);
      });
    });

    if (section.outputImage) {
      const img = $(".output-figure img");
      if (img) {
        img.addEventListener("error", function () {
          img.closest(".output-figure").style.display = "none";
        });
      }
    }
  }

  /* ---------------------------------------------------------------------
     PAGE - MODULES  (syllabus, mapped to the experiments in data.js)
     --------------------------------------------------------------------- */
  function renderModules() {
    const cards = modules.map(function (m) {
      const items = (m.experiments || []).map(function (id) {
        const exp = findExperiment(id);
        if (!exp) return "";
        return (
          "<li><b>" + esc(String(id)) + "</b><span>" +
            '<a href="#/experiment/' + esc(String(id)) + '" data-link>' + esc(exp.name) + "</a>" +
          "</span></li>"
        );
      }).join("");

      return (
        '<article class="card card--pad">' +
          '<p class="eyebrow">Module ' + esc(String(m.number)) + "</p>" +
          '<h2 class="sec-title" style="margin:0">' + esc(m.title) + "</h2>" +
          '<p class="sec-sub">' + esc(m.description) + "</p>" +
          '<h3 class="field-label"><span class="dot"></span>Experiments in this module &middot; ' +
            plural((m.experiments || []).length, "experiment") + "</h3>" +
          '<ul class="mini-list">' + (items || "<li><span>No experiments mapped yet.</span></li>") + "</ul>" +
        "</article>"
      );
    }).join("");

    return (
      '<div class="page stack">' +
        crumb([{ label: "Home", href: "#/" }, { label: "Modules" }]) +

        '<section class="card card--pad">' +
          '<p class="eyebrow">' + esc(laboratory.name) + "</p>" +
          '<h1 class="preview-title"><span class="hl">Modules</span></h1>' +
          '<p class="sec-sub">The laboratory syllabus is split into ' + plural(modules.length, "module") +
            ", following the same order as the experiment catalogue. Each module lists the experiments that cover it.</p>" +
          '<div class="meta-row">' +
            '<span class="chip">' + plural(modules.length, "module") + "</span>" +
            '<span class="chip">' + plural(experiments.length, "experiment") + "</span>" +
            '<span class="chip">' + esc(labMeta.subjectCode) + "</span>" +
          "</div>" +
        "</section>" +

        '<div class="exp-grid">' + cards + "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
     PAGE - TOOLS  (libraries actually used by the experiment code)
     --------------------------------------------------------------------- */
  function renderTools() {
    const cards = tools.map(function (t) {
      const links = (t.experiments || []).map(function (id) {
        const exp = findExperiment(id);
        return exp
          ? '<a class="chip" href="#/experiment/' + esc(String(id)) + '" data-link>Experiment ' + esc(String(id)) + "</a>"
          : "";
      }).join("");
      const where = t.where
        ? '<a class="chip chip--accent" href="' + esc(t.whereHref || "#/codelab") + '" data-link>' + esc(t.where) + "</a>"
        : "";
      const related = (links + where) ||
        '<span class="chip">Not used directly</span>';

      return (
        '<article class="card card--pad">' +
          '<p class="eyebrow">' + esc(t.kind || "Tool") + "</p>" +
          '<h2 class="sec-title" style="margin:0">' + esc(t.name) + "</h2>" +
          '<p class="sec-sub">' + esc(t.definition) + "</p>" +
          '<h3 class="field-label"><span class="dot"></span>Used in this laboratory</h3>' +
          '<p class="summary">' + esc(t.use) + "</p>" +
          '<h3 class="field-label"><span class="dot"></span>Related experiments</h3>' +
          '<div class="meta-row">' + related + "</div>" +
        "</article>"
      );
    }).join("");

    return (
      '<div class="page stack">' +
        crumb([{ label: "Home", href: "#/" }, { label: "Tools" }]) +

        '<section class="card card--pad">' +
          '<p class="eyebrow">' + esc(laboratory.name) + "</p>" +
          '<h1 class="preview-title"><span class="hl">Tools</span></h1>' +
          '<p class="sec-sub">Everything listed here is taken from the experiment source code in this ' +
            "laboratory - libraries, formats and runtimes the experiments really use. Nothing has been added just because it is popular.</p>" +
          '<div class="meta-row">' +
            '<span class="chip">' + plural(tools.length, "tool") + "</span>" +
            '<span class="chip">' + plural(experiments.length, "experiment") + "</span>" +
            '<a class="chip chip--accent" href="#/codelab" data-link>Try them in Code Run</a>' +
          "</div>" +
        "</section>" +

        '<div class="exp-grid">' + cards + "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
     6. RENDER CONTROLLER
     --------------------------------------------------------------------- */
  function render() {
    const route = parseRoute();
    const scrollY = window.scrollY;
    let pageTitle = laboratory.name;

    switch (route.name) {
      /* The laboratory's root routes all open the Dashboard/Home page:
         an empty hash, "#/" (name "home") and "#/dashboard". Anything
         else falls through to default, which shows the Not Found page. */
      case "":
      case "home":
      case "dashboard":
        view.innerHTML = renderHome();
        wireHome();
        pageTitle = "Home - " + laboratory.name;
        scrollToBlock("#dashboardTop");
        break;

      /* Top-bar navigation targets. These reuse the main page so the
         required 4-step experiment flow is never duplicated or altered;
         they simply bring the relevant block into view. */
      case "catalogue":
        view.innerHTML = renderHome();
        wireHome();
        pageTitle = "Experiments - " + laboratory.name;
        scrollToBlock("#catalogue");
        break;

      case "student":
        view.innerHTML = renderHome();
        wireHome();
        pageTitle = "Student Card - " + laboratory.name;
        scrollToBlock("#studentCard");
        break;

      case "codelab": {
        const carry = pendingLabCode;
        pageTitle = "Code Run - " + laboratory.name;
        if (window.DSCodeLab && typeof window.DSCodeLab.mount === "function") {
          view.innerHTML = '<div id="lab2Host"></div>';
          window.DSCodeLab.mount(document.getElementById("lab2Host"), {
            code: carry ? carry.code : "",
            name: carry ? carry.label : ""
          });
          pendingLabCode = null;
        } else {
          view.innerHTML = renderCodeLab();
          wireCodeLab();
        }
        break;
      }

      case "modules":
        view.innerHTML = renderModules();
        pageTitle = "Modules - " + laboratory.name;
        break;

      case "tools":
        view.innerHTML = renderTools();
        pageTitle = "Tools - " + laboratory.name;
        break;

      case "experiment": {
        const exp = findExperiment(route.id);
        if (!exp) { view.innerHTML = notFound(); break; }
        view.innerHTML = renderPreview(exp);
        wirePreviewPage(exp);
        pageTitle = "Experiment " + exp.id + " - " + exp.name;
        break;
      }

      case "overview": {
        const exp = findExperiment(route.id);
        if (!exp) { view.innerHTML = notFound(); break; }
        view.innerHTML = renderOverview(exp);
        wireOverview(exp);
        pageTitle = "Overview - Experiment " + exp.id + " - " + exp.name;
        break;
      }

      case "section": {
        const exp = findExperiment(route.id);
        const sec = exp ? findSection(exp, route.sid) : null;
        if (!exp || !sec) { view.innerHTML = notFound(); break; }
        view.innerHTML = renderSection(exp, sec);
        wireSection(exp, sec);
        pageTitle = "Experiment " + exp.id + " (" + sec.letter + ") - " + exp.name;
        break;
      }

      default:
        view.innerHTML = notFound();
        pageTitle = "Page not found - " + laboratory.name;
    }

    document.title = pageTitle;
    paintNav();
    if (scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* Scrolls a block into view once the router has swapped the DOM. */
  function scrollToBlock(selector) {
    const target = $(selector);
    if (!target) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* Highlights whichever top-bar link matches the current route. */
  function paintNav() {
    const route = parseRoute();
    let active = "dashboard";
    if (route.name === "catalogue") active = "catalogue";
    else if (route.name === "student") active = "dashboard";
    else if (route.name === "codelab") active = "codelab";
    else if (route.name === "modules") active = "modules";
    else if (route.name === "tools") active = "tools";
    else if (route.name === "experiment" || route.name === "overview" || route.name === "section") active = "catalogue";
    $$(".topnav__link").forEach(function (link) {
      const on = link.getAttribute("data-nav") === active;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  /* ---------------------------------------------------------------------
     7. BRANDING + THEME
     --------------------------------------------------------------------- */
  function paintBranding() {
    $$("[data-bind]").forEach(function (node) {
      const path = node.getAttribute("data-bind").split(".");
      let value = window;
      for (let i = 0; i < path.length; i++) {
        if (value == null) break;
        value = value[path[i]];
      }
      if (value != null) node.textContent = value;
    });
    if (!document.title) {
      document.title = laboratory.name;
    }
    paintSocial();
  }

  /* Renders the GitHub / LinkedIn buttons defined by `social` in data.js.
     A blank URL in data.js hides that button automatically. The same markup is
     reused by the Student Card, so links appear in both places. */
  function socialLinksHtml() {
    const cfg = window.social || {};
    const links = [];

    if (cfg.githubUrl) {
      links.push(
        '<a class="social-btn" href="' + esc(cfg.githubUrl) + '" target="_blank" rel="noopener noreferrer">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>' +
          "<span>GitHub" + (cfg.githubLabel ? "<em>" + esc(cfg.githubLabel) + "</em>" : "") + "</span>" +
        "</a>"
      );
    }

    if (cfg.linkedinUrl) {
      links.push(
        '<a class="social-btn" href="' + esc(cfg.linkedinUrl) + '" target="_blank" rel="noopener noreferrer">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.71h.05c.53-1 1.83-2.06 3.76-2.06C21.4 8.65 22 11 22 14.02V21h-4v-6.2c0-1.48-.03-3.39-2.06-3.39-2.07 0-2.39 1.61-2.39 3.28V21h-4V9Z"/></svg>' +
          "<span>LinkedIn" + (cfg.linkedinLabel ? "<em>" + esc(cfg.linkedinLabel) + "</em>" : "") + "</span>" +
        "</a>"
      );
    }

    if (cfg.email) {
      links.push(
        '<a class="social-btn" href="mailto:' + esc(cfg.email) + '">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 5h18v14H3V5Zm2 2v.4l7 4.6 7-4.6V7H5Zm14 2.7-6.4 4.2a1 1 0 0 1-1.2 0L5 9.7V17h14V9.7Z"/></svg>' +
          "<span>Email<em>" + esc(cfg.email) + "</em></span>" +
        "</a>"
      );
    }

    return links.join("");
  }

  function paintSocial() {
    const host = $("#footerSocial");
    if (!host) return;
    host.innerHTML = socialLinksHtml();
    host.hidden = !host.innerHTML;
  }

  function initTheme() {
    const saved = localStorage.getItem("dsl-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    const btn = $("#themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        const now = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", now);
        localStorage.setItem("dsl-theme", now);
        toast(now === "light" ? "Light theme" : "Dark theme");
      });
    }
  }

  /* ---------------------------------------------------------------------
     8. BOOT
     --------------------------------------------------------------------- */
  document.addEventListener("click", function (event) {
    const editBtn = event.target.closest("#editCardBtn");
    if (editBtn) {
      event.preventDefault();
      openCardEditor(editBtn);
      return;
    }
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return;
    event.preventDefault();
    go(href);
  });

  window.addEventListener("hashchange", render);

  /* Keeps --topbar-h equal to the real rendered height of the sticky top bar,
     so scroll-padding-top can never drift out of sync with the layout (it
     changes as the nav wraps onto more lines on narrow screens). */
  function syncTopbarHeight() {
    const bar = $(".topbar");
    if (!bar) return;
    const h = Math.round(bar.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--topbar-h", h + "px");
  }
  window.addEventListener("resize", syncTopbarHeight);
  window.addEventListener("load", syncTopbarHeight);

  restoreStudentCard();
  paintBranding();
  initTheme();
  render();
  syncTopbarHeight();
})();