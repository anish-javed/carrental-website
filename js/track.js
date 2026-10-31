/* Track Booking page: shows the remembered booking at once, refreshes every 30 seconds, animates changes */
(function () {
  var SW = window.SW, D = SW.d, $ = SW.$, esc = SW.esc;
  var STAGES = ["Pending", "Confirmed", "Completed"];
  var TEXT = {
    Pending: "We have your booking and your dates are held. We will call or WhatsApp you soon to confirm.",
    Confirmed: "Your booking is confirmed. See you at pickup!",
    Completed: "Trip completed. Thank you for travelling with Safar Wheels!",
    Cancelled: "This booking was cancelled. You can book again any time."
  };

  SW.boot(function (data) {
    var set = data.settings, current = null, timer = null, busy = false, seen = {};
    var phoneEl = $("#t-phone"), refEl = $("#t-ref"), list = $("#t-list"), msg = $("#t-msg");

    phoneEl.addEventListener("input", function () { phoneEl.value = SW.fmtPhone(phoneEl.value); });
    refEl.addEventListener("input", function () { refEl.value = refEl.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""); });

    function showMsg(t) { msg.hidden = !t; msg.textContent = t || ""; }

    /* ---------- one booking card; updated in place so changes can animate ---------- */
    function cardHtml(b) {
      return '<article class="card tr-card" data-ref="' + esc(b.ref) + '" data-status="Pending">' +
        '<div class="tr-head"><span class="ref-chip">' + esc(b.ref) + '</span><span class="tr-badge"></span></div>' +
        '<h3>' + esc(b.car) + '</h3><p class="tr-dates">' + SW.icon("calendar", "ic-s") + " " + D.range(b.start, b.end, true) + " - " + SW.plural(D.days(b.start, b.end), "day") + "</p>" +
        '<div class="progress" aria-hidden="true"><div class="pr-line"><div class="pr-fill"></div></div>' +
        STAGES.map(function (s, i) { return '<div class="pr-node n' + i + '"><i>' + SW.icon("check", "ic-s") + "</i><span>" + s + "</span></div>"; }).join("") + "</div>" +
        '<div class="cancel-banner">' + SW.icon("close") + "<span>Cancelled</span></div>" +
        '<p class="tr-text"></p><div class="tr-actions"></div></article>';
    }
    function setStatus(el, b) {
      var st = b.status, idx = STAGES.indexOf(st), cancelled = st === "Cancelled";
      el.setAttribute("data-status", cancelled ? "Cancelled" : STAGES[idx > -1 ? idx : 0]);
      el.classList.toggle("cancelled", cancelled);
      var fill = cancelled ? 0 : Math.max(0, idx) / (STAGES.length - 1);
      SW.$(".pr-fill", el).style.width = (fill * 100) + "%";
      SW.$$(".pr-node", el).forEach(function (n, i) {
        n.classList.toggle("done", !cancelled && i <= idx);
        n.classList.toggle("now", !cancelled && i === idx);
      });
      SW.$(".tr-badge", el).textContent = cancelled ? "Cancelled" : st;
      var text = TEXT[st] || TEXT.Pending;
      if (st === "Pending" && b.expired) text = "Your " + set.holdHours + "-hour hold has ended. Please call or WhatsApp us to keep these dates.";
      if (st === "Confirmed") text = "Your booking is confirmed. See you on " + D.fmt(b.start) + "!";
      SW.$(".tr-text", el).textContent = text;
      var again = '<a class="btn btn-ghost btn-sm" href="book.html?car=' + encodeURIComponent(b.carId || "") + '">' + SW.icon("refresh", "ic-s") + " Book this car again</a>";
      SW.$(".tr-actions", el).innerHTML = b.carId ? again : "";
    }

    function render(bookings, announce) {
      var keep = {};
      bookings.forEach(function (b, i) {
        keep[b.ref] = true;
        var el = list.querySelector('[data-ref="' + b.ref + '"]');
        if (!el) {
          var wrap = document.createElement("div");
          wrap.innerHTML = cardHtml(b);
          el = wrap.firstChild;
          list.insertBefore(el, list.children[i] || null);
          if (!SW.reduce) el.classList.add("enter");
          // draw the line from the start so it animates up to the real status
          requestAnimationFrame(function () { requestAnimationFrame(function () { setStatus(el, b); }); });
        } else {
          var old = el.getAttribute("data-status");
          var nowSt = b.status === "Cancelled" ? "Cancelled" : (STAGES.indexOf(b.status) > -1 ? b.status : "Pending");
          setStatus(el, b);
          if (old !== nowSt && announce) {
            el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
            SW.toast(b.ref + " is now " + nowSt + ".", 3500);
          }
        }
        seen[b.ref] = b.status;
      });
      SW.$$(".tr-card", list).forEach(function (el) { if (!keep[el.getAttribute("data-ref")]) el.parentNode.removeChild(el); });
    }

    function stampCard(s) {
      var box = $("#stamp-card");
      if (!s) { box.hidden = true; return; }
      var size = s.size || set.stampSize, earned = Math.floor(s.completed / size), ready = earned > s.used;
      var filled = s.completed % size;
      if (ready && filled === 0) filled = size;
      var h = '<div class="sc-head"><h2>' + SW.icon("gift") + " Your stamp card</h2><p>Every completed rental gives you a stamp. " + size + " stamps = " + set.stampPct + "% off your next booking.</p></div><div class=\"stamps\">";
      for (var i = 0; i < size; i++) h += '<div class="stamp' + (i < filled ? " on" : "") + '" style="--i:' + i + '">' + (i < filled ? SW.flower("#e8318a", "#f6a91b", 34) : "<span>" + (i + 1) + "</span>") + "</div>";
      h += "</div>";
      h += ready ? '<p class="reward-ready">' + SW.icon("star") + " Reward ready! " + set.stampPct + "% extra off is added automatically to your next booking.</p>"
        : '<p class="muted">' + s.completed + (s.completed === 1 ? " completed rental" : " completed rentals") + " so far. " + (size - filled) + " more to go.</p>";
      box.innerHTML = h;
      box.hidden = false;
    }

    /* ---------- asking the server ---------- */
    function ask(phone, ref, opts) {
      opts = opts || {};
      if (busy) return;
      busy = true;
      if (!opts.quiet) { $("#t-go").disabled = true; $("#t-go").textContent = "Checking..."; }
      SW.track(phone, ref).then(function (res) {
        busy = false; $("#t-go").disabled = false; $("#t-go").textContent = "Check my booking";
        if (!res || !res.ok) {
          if (!opts.quiet || !current) { showMsg((res && res.error) || "We could not find that booking."); if (!opts.quiet) { list.innerHTML = ""; stampCard(null); $("#t-live").hidden = true; } }
          return;
        }
        showMsg("");
        current = { phone: phone, ref: ref };
        SW.store.set("track", { phone: phone, ref: ref || "" });
        SW.store.set("track_res", { phone: phone, ref: ref || "", t: Date.now(), res: res });
        render(res.bookings || [], !!opts.quiet);
        stampCard(res.stamps);
        $("#t-live").hidden = false;
        startTimer();
      }, function () {
        busy = false; $("#t-go").disabled = false; $("#t-go").textContent = "Check my booking";
        if (!opts.quiet) showMsg("We could not reach our booking sheet right now. Please try again in a moment, or call " + set.phone + ".");
      });
    }

    function startTimer() {
      if (timer) return;
      timer = setInterval(function () {
        if (document.visibilityState === "visible" && current) ask(current.phone, current.ref, { quiet: true });
      }, 30000);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && current) ask(current.phone, current.ref, { quiet: true });
    });

    $("#tf").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!SW.validPhone(phoneEl.value)) { showMsg("Please type the mobile number you booked with, like 0300-1234567."); phoneEl.focus(); return; }
      showMsg("");
      seen = {}; list.innerHTML = "";
      ask(SW.fmtPhone(phoneEl.value), refEl.value.trim(), {});
    });

    /* ---------- open: show what we remember straight away, then ask for the latest ---------- */
    var mem = SW.store.get("track", null), cache = SW.store.get("track_res", null);
    var qRef = SW.param("ref");
    if (mem && mem.phone) { phoneEl.value = SW.fmtPhone(mem.phone); refEl.value = mem.ref || ""; }
    if (qRef) refEl.value = qRef.toUpperCase();
    if (cache && mem && cache.res && cache.res.ok && cache.phone === mem.phone && (cache.ref || "") === (mem.ref || "")) {
      render(cache.res.bookings || [], false);
      stampCard(cache.res.stamps);
      $("#t-live").hidden = false;
    }
    if (mem && mem.phone && SW.validPhone(mem.phone)) ask(SW.fmtPhone(mem.phone), refEl.value.trim(), { quiet: !!cache });
  });
})();
