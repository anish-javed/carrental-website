/*
  Date-range calendar, made by hand (no library).
  - tap the pickup day, then the return day (tap the same day twice for a 1-day rental)
  - days that are already booked are greyed out with a tooltip
  - a range with a booked day inside is refused, with the reason and the nearest free dates
  - big touch-friendly buttons; works without hover
  opt = {
    min, max, maxStart,            // "2026-11-01" style dates
    maxDays,                       // longest rental
    isTaken(ymd),                  // true when the car is not free that day (optional)
    firstTaken(start, end),        // first taken day inside a range, or null (optional)
    suggest(start, end),           // [{start, end}] nearest free windows (optional)
    onChange(start, end)           // called when the choice changes (end can be null)
  }
*/
(function () {
  var SW = (window.SW = window.SW || {});

  SW.Calendar = function (host, opt) {
    var D = SW.d, self = this;
    var start = null, end = null, hoverEnd = null, disabledMsg = "", view;
    opt = opt || {};
    var today = opt.min || D.today();
    view = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 };

    host.classList.add("cal");
    host.innerHTML =
      '<div class="cal-top"><button type="button" class="cal-nav" data-nav="-1" aria-label="Previous month">' + SW.icon("arrow", "flip") + '</button>' +
      '<span class="cal-hint">Free days are white. Grey striped days are booked.</span>' +
      '<button type="button" class="cal-nav" data-nav="1" aria-label="Next month">' + SW.icon("arrow") + '</button></div>' +
      '<div class="cal-months"></div><div class="cal-msg" role="status" aria-live="polite"></div><div class="cal-info"></div>';
    var monthsEl = SW.$(".cal-months", host), msgEl = SW.$(".cal-msg", host), infoEl = SW.$(".cal-info", host);
    var prevBtn = SW.$('[data-nav="-1"]', host), nextBtn = SW.$('[data-nav="1"]', host);

    function monthKey(y, m) { return y * 12 + m; }
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function taken(d) { return opt.isTaken ? !!opt.isTaken(d) : false; }
    function firstTaken(a, b) {
      if (opt.firstTaken) return opt.firstTaken(a, b);
      for (var d = a; d <= b; d = D.add(d, 1)) if (taken(d)) return d;
      return null;
    }

    function monthHtml(y, m) {
      var first = y + "-" + pad(m + 1) + "-01", lead = (D.dow(first) + 6) % 7, count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      var h = '<div class="cal-month"><div class="cal-mh">' + D.MONTHS[m] + " " + y + '</div><div class="cal-grid">';
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (w) { h += '<span class="cal-w">' + w + "</span>"; });
      for (var i = 0; i < lead; i++) h += '<span class="cal-blank"></span>';
      for (var d = 1; d <= count; d++) {
        var ymd = y + "-" + pad(m + 1) + "-" + pad(d);
        h += '<button type="button" class="cal-day" data-d="' + ymd + '"><span>' + d + "</span></button>";
      }
      return h + "</div></div>";
    }

    function render() {
      var y2 = view.m === 11 ? view.y + 1 : view.y, m2 = (view.m + 1) % 12;
      monthsEl.innerHTML = monthHtml(view.y, view.m) + monthHtml(y2, m2);
      var min = monthKey(+today.slice(0, 4), +today.slice(5, 7) - 1);
      prevBtn.disabled = monthKey(view.y, view.m) <= min;
      var maxD = opt.max || D.add(today, 400);
      nextBtn.disabled = monthKey(y2, m2) >= monthKey(+maxD.slice(0, 4), +maxD.slice(5, 7) - 1);
      paint();
    }

    function paint(wave) {
      var pendingStart = start && !end, k = 0, maxD = opt.max || D.add(today, 400), maxS = opt.maxStart || maxD;
      var lo = start, hi = end || (pendingStart && hoverEnd && hoverEnd >= start ? hoverEnd : null);
      SW.$$(".cal-day", monthsEl).forEach(function (b) {
        var d = b.getAttribute("data-d");
        var off = d < today || d > maxD || (!pendingStart && d > maxS) || !!disabledMsg;
        var t = !off && taken(d);
        b.disabled = off;
        b.classList.toggle("today", d === D.today());
        b.classList.toggle("taken", t);
        b.setAttribute("aria-disabled", t ? "true" : "false");
        if (t) { b.title = D.fmt(d) + ": already booked"; b.setAttribute("aria-label", D.fmt(d) + ", already booked"); }
        else { b.removeAttribute("title"); b.setAttribute("aria-label", D.fmt(d)); }
        var isS = d === start, isE = !!end && d === end;
        b.classList.toggle("sel-start", isS);
        b.classList.toggle("sel-end", isE || (isS && end === start));
        var inR = lo && hi && d > lo && d < hi;
        b.classList.toggle("in-range", !!inR);
        b.classList.toggle("preview", !!inR && !end);
        if (wave && inR) { b.style.setProperty("--k", Math.min(k++, 14)); b.classList.add("wave"); setTimeout(function () { b.classList.remove("wave"); }, 800); }
      });
      info();
    }

    function info() {
      if (disabledMsg) { infoEl.textContent = disabledMsg; return; }
      if (!start) infoEl.textContent = "Tap your pickup day.";
      else if (!end) infoEl.innerHTML = "Pickup: <b>" + D.long(start) + "</b>. Now tap your return day. (Tap the same day again for a 1-day rental.)";
      else {
        var n = D.days(start, end);
        infoEl.innerHTML = "<b>" + D.fmt(start) + " to " + D.fmt(end) + " = " + SW.plural(n, "day") + "</b>. The pickup day and the return day both count." +
          ' <button type="button" class="link-btn" data-clear="1">Clear dates</button>';
      }
    }

    function message(text, kind, sugg) {
      msgEl.className = "cal-msg" + (text ? " show " + (kind || "warn") : "");
      msgEl.textContent = text || "";
      if (sugg && sugg.length) {
        var wrap = document.createElement("div");
        wrap.className = "cal-sugg";
        wrap.innerHTML = "<span>Nearest free dates:</span>" + sugg.map(function (s, i) {
          return '<button type="button" class="chip" data-sugg="' + i + '">' + D.range(s.start, s.end) + "</button>";
        }).join("");
        msgEl.appendChild(wrap);
        msgEl._sugg = sugg;
      }
    }

    function pop(d) {
      var b = SW.$('.cal-day[data-d="' + d + '"]', monthsEl);
      if (!b) return;
      b.classList.remove("pop");
      void b.offsetWidth; // restart the little pop animation
      b.classList.add("pop");
    }

    function changed() { if (opt.onChange) opt.onChange(start, end); }

    function pick(d) {
      message("");
      if (taken(d)) {
        message(D.fmt(d) + " is already booked for this car. Please pick a free day.", "warn", null);
        return;
      }
      if (!start || (start && end)) { start = d; end = null; hoverEnd = null; paint(); pop(d); changed(); return; }
      if (d < start) { start = d; hoverEnd = null; paint(); pop(d); changed(); return; }
      // second tap = the return day
      var n = D.days(start, d);
      if (opt.maxDays && n > opt.maxDays) {
        message("You can rent for up to " + opt.maxDays + " days at a time. Please pick an earlier return day.", "warn");
        return;
      }
      var bad = firstTaken(start, d);
      if (bad) {
        var s = opt.suggest ? opt.suggest(start, d) : [];
        message(D.fmt(bad) + " is already booked for this car, so these dates will not work." + (s.length ? "" : " Please choose different dates."), "warn", s);
        return;
      }
      end = d; hoverEnd = null;
      paint(true); pop(d); changed();
    }

    host.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-nav]");
      if (nav) { var dm = +nav.getAttribute("data-nav"); view.m += dm; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } render(); return; }
      if (e.target.closest("[data-clear]")) { self.clear(); return; }
      var sg = e.target.closest("[data-sugg]");
      if (sg && msgEl._sugg) { var s = msgEl._sugg[+sg.getAttribute("data-sugg")]; message(""); self.setRange(s.start, s.end); return; }
      var b = e.target.closest(".cal-day");
      if (b && !b.disabled) pick(b.getAttribute("data-d"));
    });
    // hover preview (mouse only; touch screens simply do not use it)
    host.addEventListener("mouseover", function (e) {
      if (!start || end || SW.lite) return;
      var b = e.target.closest ? e.target.closest(".cal-day") : null;
      if (!b || b.disabled) return;
      var d = b.getAttribute("data-d");
      if (d !== hoverEnd) { hoverEnd = d; paint(); }
    });
    host.addEventListener("mouseleave", function () { if (hoverEnd) { hoverEnd = null; paint(); } });

    /* ---------- public methods ---------- */
    this.getRange = function () { return { start: start, end: end }; };
    this.setRange = function (s, e, silent) {
      start = s || null; end = e || null; hoverEnd = null;
      if (start) { view = { y: +start.slice(0, 4), m: +start.slice(5, 7) - 1 }; }
      render();
      if (end) { paint(true); pop(end); }
      if (!silent) changed();
    };
    this.clear = function () { message(""); start = null; end = null; hoverEnd = null; paint(); changed(); };
    this.refresh = function () { paint(); };           // call after the busy dates change
    this.setOptions = function (o) { Object.keys(o).forEach(function (k) { opt[k] = o[k]; }); render(); };
    this.setDisabled = function (msg) { disabledMsg = msg || ""; if (disabledMsg) { start = null; end = null; message(""); } paint(); };
    this.message = message;
    this.goTo = function (ymd) { view = { y: +ymd.slice(0, 4), m: +ymd.slice(5, 7) - 1 }; render(); };
    render();
  };
})();
