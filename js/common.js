/* Shared helpers and the page frame (menu, footer, WhatsApp button, loading animation) for every page. */
(function () {
  var SW = (window.SW = window.SW || {});
  var cfg = (SW.cfg = window.SW_CONFIG || {});
  var mq = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  SW.reduce = mq("(prefers-reduced-motion: reduce)");
  SW.lite = mq("(max-width: 700px)") || mq("(pointer: coarse)");
  if (SW.lite) document.documentElement.classList.add("lite");
  if (SW.reduce) document.documentElement.classList.add("reduce");

  /* ---------- small helpers ---------- */
  SW.$ = function (s, r) { return (r || document).querySelector(s); };
  SW.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  SW.esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  SW.num = function (n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
  SW.money = function (n) { return "Rs " + SW.num(n); };
  SW.plural = function (n, one, many) { return n + " " + (n === 1 ? one : many || one + "s"); };
  SW.param = function (name) { try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; } };

  SW.store = {
    get: function (k, d) { try { var v = localStorage.getItem("sw_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("sw_" + k, JSON.stringify(v)); } catch (e) { /* private window: fine */ } },
    del: function (k) { try { localStorage.removeItem("sw_" + k); } catch (e) { /* ignore */ } }
  };
  SW.fav = {
    list: function () { return SW.store.get("fav", []); },
    has: function (id) { return SW.fav.list().indexOf(id) > -1; },
    toggle: function (id) {
      var l = SW.fav.list(), i = l.indexOf(id);
      if (i > -1) l.splice(i, 1); else l.push(id);
      SW.store.set("fav", l);
      return i === -1;
    }
  };
  SW.me = { // the customer's details, remembered in this browser for next time
    get: function () { return SW.store.get("me", {}); },
    set: function (o) { SW.store.set("me", o); }
  };

  /* ---------- phone numbers (Pakistani mobile: 03XX-XXXXXXX) ---------- */
  SW.phoneDigits = function (v) {
    var d = String(v || "").replace(/\D/g, "");
    if (/^92/.test(d) && d.length > 10) d = "0" + d.slice(2);
    else if (/^3/.test(d) && d.length === 10) d = "0" + d;
    return d.slice(0, 11);
  };
  SW.fmtPhone = function (v) { var d = SW.phoneDigits(v); return d.length > 4 ? d.slice(0, 4) + "-" + d.slice(4) : d; };
  SW.validPhone = function (v) { return /^03\d{9}$/.test(SW.phoneDigits(v)); };

  /* ---------- dates: "2026-11-05" text, counted in whole days. Pakistan has no daylight saving (UTC+5). ---------- */
  var DAY = 86400000, MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var D = (SW.d = {});
  D.MON = MON; D.MONTHS = MONTHS; D.DOW = DOW;
  D.ms = function (ymd) { var p = String(ymd).split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
  D.ymd = function (ms) { return new Date(ms).toISOString().slice(0, 10); };
  D.today = function () { return D.ymd(Date.now() + 5 * 3600000); };
  D.add = function (ymd, n) { return D.ymd(D.ms(ymd) + n * DAY); };
  D.diff = function (a, b) { return Math.round((D.ms(b) - D.ms(a)) / DAY); }; // b - a
  D.days = function (a, b) { return D.diff(a, b) + 1; }; // inclusive: pickup day and return day both count
  D.valid = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && D.ymd(D.ms(s)) === s; };
  D.dow = function (ymd) { return new Date(D.ms(ymd)).getUTCDay(); };
  D.fmt = function (ymd, year) { var p = ymd.split("-"); return +p[2] + " " + MON[+p[1] - 1] + (year ? " " + p[0] : ""); };
  D.long = function (ymd) { return DOW[D.dow(ymd)] + ", " + D.fmt(ymd, true); };
  D.range = function (a, b, year) {
    if (!b || a === b) return D.fmt(a, year);
    var p = a.split("-"), q = b.split("-");
    if (p[1] === q[1] && p[0] === q[0]) return +p[2] + "-" + +q[2] + " " + MON[+q[1] - 1] + (year ? " " + q[0] : "");
    return D.fmt(a, year) + " - " + D.fmt(b, year);
  };
  D.clock = function (hhmm) { // "14:30" -> "2:30 pm"
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
    if (!m) return "";
    var h = +m[1];
    return (h % 12 || 12) + ":" + m[2] + (h >= 12 ? " pm" : " am");
  };
  D.stamp = function (ms) { // "5 Nov, 3:20 pm" in Pakistan time
    var d = new Date(ms + 5 * 3600000), h = d.getUTCHours(), m = d.getUTCMinutes();
    return d.getUTCDate() + " " + MON[d.getUTCMonth()] + ", " + (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am");
  };

  /* ---------- toast ---------- */
  SW.toast = function (msg, ms) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, ms || 2600);
  };

  /* ---------- number animations ---------- */
  SW.countUp = function (el, to, ms, suffix) {
    suffix = suffix || "";
    if (SW.reduce || !window.requestAnimationFrame) { el.textContent = SW.num(to) + suffix; return; }
    var t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / (ms || 1400)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = SW.num(to * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  // A price that rolls like a car odometer. el is an empty element; value is a number.
  SW.odometer = function (el, value) {
    var txt = SW.num(value), old = el._odo;
    el.setAttribute("aria-label", SW.money(value));
    function setStrips(digits, vals) { digits.forEach(function (s, i) { s.style.transform = "translateY(-" + vals[i] * 10 + "%)"; }); }
    var chars = txt.split("");
    if (old && old.len === chars.length) {
      var ds = old.strips, k = 0, vals = [];
      chars.forEach(function (c) { if (c !== ",") vals.push(+c); });
      setStrips(ds, vals);
      return;
    }
    var html = '<span class="odo-rs" aria-hidden="true">Rs </span>', strips = [], vals2 = [];
    chars.forEach(function (c) {
      if (c === ",") html += '<span class="odo-c" aria-hidden="true">,</span>';
      else { html += '<span class="odo-d" aria-hidden="true"><span class="odo-s"><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></span></span>'; vals2.push(+c); }
    });
    el.innerHTML = html;
    strips = SW.$$(".odo-s", el);
    el._odo = { len: chars.length, strips: strips };
    if (SW.reduce || !window.requestAnimationFrame) { setStrips(strips, vals2); return; }
    requestAnimationFrame(function () { requestAnimationFrame(function () { setStrips(strips, vals2); }); });
  };

  /* ---------- reveal on scroll, gauges, tilt ---------- */
  var io = null;
  function activate(el) {
    el.classList.add("in");
    if (el.hasAttribute("data-count")) SW.countUp(el, +el.getAttribute("data-count"), 1500, el.getAttribute("data-suffix") || "");
    var g = el.querySelector && el.querySelector(".gauge-svg");
    if (g) {
      var f = Math.max(0, Math.min(1, +g.getAttribute("data-fill")));
      var arc = g.querySelector(".g-arc"), needle = g.querySelector(".g-needle");
      arc.style.strokeDashoffset = String(157.1 * (1 - f));
      needle.style.transform = "rotate(" + (-90 + 180 * f) + "deg)";
    }
  }
  SW.observe = function (root) {
    var els = SW.$$(".reveal:not(.in), [data-count]:not(.in), .gauge:not(.in)", root || document);
    els.forEach(function (el) {
      if (SW.reduce || !window.IntersectionObserver) { activate(el); return; }
      if (!io) io = new IntersectionObserver(function (list) {
        list.forEach(function (en) { if (en.isIntersecting) { activate(en.target); io.unobserve(en.target); } });
      }, { threshold: 0.15 });
      io.observe(el);
    });
  };

  SW.tilt = function (container) {
    if (SW.reduce || SW.lite) return;
    container.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var c = e.target.closest ? e.target.closest(".car-card") : null;
      if (!c) return;
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--rx", ((0.5 - y) * 7).toFixed(2) + "deg");
      c.style.setProperty("--ry", ((x - 0.5) * 9).toFixed(2) + "deg");
      c.style.setProperty("--mx", (x * 100).toFixed(0) + "%");
      c.style.setProperty("--my", (y * 100).toFixed(0) + "%");
      c.classList.add("tilting");
    });
    container.addEventListener("pointerleave", function (e) {
      var c = e.target;
      if (c && c.classList && c.classList.contains("car-card")) { c.classList.remove("tilting"); c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
    }, true);
  };

  /* ---------- page frame ---------- */
  var NAV = [["index.html", "Home", "home"], ["fleet.html", "Our Fleet", "fleet"], ["book.html", "Book a Car", "book"], ["track.html", "Track Booking", "track"], ["find.html", "Find My Car", "find"], ["about.html", "About & Contact", "about"]];
  var DEFAULTS = { name: "Safar Wheels", phone: "0300 0000000", whatsapp: "923000000000", address: "Lahore, Pakistan", hours: ["Every day: 8 am - 10 pm"] };

  function logo() {
    return '<a class="logo" href="index.html" aria-label="Safar Wheels home">' + SW.flower("#e8318a", "#f6a91b", 30) + '<span class="logo-t">Safar <b>Wheels</b></span></a>';
  }

  SW.buildChrome = function () {
    var page = document.body.getAttribute("data-page") || "";
    var hdr = document.getElementById("site-header");
    if (hdr) {
      hdr.className = "site-header";
      hdr.innerHTML = '<div class="bunting" aria-hidden="true"></div><div class="wrap bar">' + logo() +
        '<button class="nav-btn" type="button" aria-label="Menu" aria-expanded="false">' + SW.icon("menu") + "</button>" +
        '<nav class="nav" aria-label="Main">' + NAV.map(function (n) {
          return '<a href="' + n[0] + '"' + (n[2] === page ? ' class="on" aria-current="page"' : "") + (n[2] === "book" ? ' data-cta="1"' : "") + ">" + n[1] + "</a>";
        }).join("") + "</nav></div>";
      var btn = SW.$(".nav-btn", hdr), nav = SW.$(".nav", hdr);
      btn.addEventListener("click", function () { var o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o ? "true" : "false"); });
    }
    var ftr = document.getElementById("site-footer");
    if (ftr) {
      ftr.className = "site-footer";
      ftr.innerHTML = '<div class="flower-row" aria-hidden="true"></div><div class="wrap foot-grid"><div>' + logo() +
        '<p class="muted-on-dark">Cars, vans and buses for weddings, trips and business in Lahore. You pay nothing online.</p></div>' +
        '<div><h4>Explore</h4>' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[1] + "</a>"; }).join("") + "</div>" +
        '<div><h4>Contact</h4><p data-f="phone"></p><p data-f="address"></p><p data-f="hours"></p></div></div>' +
        '<div class="wrap foot-demo"><p>' + SW.esc(cfg.DEMO_LINE || "This is a demo website.") + '</p><p class="credit">Photos: <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a></p></div>';
    }
    if (!document.getElementById("wa-float")) {
      var wa = document.createElement("a");
      wa.id = "wa-float"; wa.className = "wa-float"; wa.target = "_blank"; wa.rel = "noopener";
      wa.setAttribute("aria-label", "Chat with us on WhatsApp");
      wa.innerHTML = SW.icon("wa") + "<span>WhatsApp</span>";
      document.body.appendChild(wa);
    }
    SW.applySettings(null);
  };

  // Fills the footer and the WhatsApp button. Called with the sheet settings once they have loaded.
  SW.applySettings = function (s) {
    var set = s || DEFAULTS;
    var f = function (k, html) { SW.$$('[data-f="' + k + '"]').forEach(function (e) { e.innerHTML = html; }); };
    f("phone", SW.icon("phone", "ic-s") + ' <a href="tel:' + SW.esc(String(set.phone).replace(/[^\d+]/g, "")) + '">' + SW.esc(set.phone) + "</a>");
    f("address", SW.icon("pin", "ic-s") + " " + SW.esc(set.address));
    f("hours", SW.icon("clock", "ic-s") + " " + SW.esc((set.hours || DEFAULTS.hours).join(" | ")));
    var wa = document.getElementById("wa-float");
    if (wa) wa.href = "https://wa.me/" + (set.whatsapp || DEFAULTS.whatsapp) + "?text=" + encodeURIComponent("Salaam! I have a question about renting a car from Safar Wheels.");
  };

  /* ---------- loading animation and friendly error ---------- */
  SW.makeLoader = function (text) {
    var d = document.createElement("div");
    d.className = "loader";
    d.setAttribute("role", "status");
    d.innerHTML = '<div class="loader-road"><div class="loader-car">' + SW.carSvg("sedan", { color: "#e8318a" }) + '</div></div><p>' + SW.esc(text || "Warming up the engine...") + "</p>";
    return d;
  };

  SW.showError = function (host, err) {
    var set = (SW.data && SW.data.settings) || DEFAULTS;
    host.innerHTML = '<section class="wrap err-box"><div class="card err-card">' + SW.carSvg("hatch", { color: "#9aa6b2" }) +
      "<h2>We cannot reach our booking sheet right now</h2>" +
      "<p>Please check your internet and try again. If it keeps happening, call us on <b>" + SW.esc(set.phone) + "</b> or send us a WhatsApp message and we will help you straight away.</p>" +
      '<div class="row"><button class="btn btn-primary" type="button" id="retry">' + SW.icon("refresh") + " Try again</button>" +
      '<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/' + SW.esc(set.whatsapp || DEFAULTS.whatsapp) + '">' + SW.icon("wa") + " WhatsApp us</a></div></div></section>";
    var r = document.getElementById("retry");
    if (r) r.addEventListener("click", function () { location.reload(); });
  };

  // Every page calls this: show the frame, show the loading animation, load the sheet data, then run the page code.
  SW.boot = function (init) {
    SW.buildChrome();
    var main = document.getElementById("main"), app = document.getElementById("app");
    if (!main || !app) return;
    app.hidden = true;
    var loader = SW.makeLoader();
    main.insertBefore(loader, app);
    SW.load().then(function (data) {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      app.hidden = false;
      SW.applySettings(data.settings);
      var p = null;
      try { p = init(data); } catch (e) { if (window.console) console.error(e); }
      if (p && p.then) p.then(function () { SW.observe(app); }, function (e) { if (window.console) console.error(e); });
      else SW.observe(app);
    }, function (err) {
      if (window.console) console.error(err);
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      app.hidden = false;
      SW.showError(app, err);
    });
  };
})();
