/* Talks to the Google Apps Script web app: reads cars, add-ons, settings and busy dates; sends bookings; tracks bookings. */
(function () {
  var SW = (window.SW = window.SW || {});
  var cfg = SW.cfg || window.SW_CONFIG || {};
  var CACHE_KEY = "sw_data_v1";
  var PREFERRED = ["Hatchbacks", "Sedans", "SUVs & 4x4", "Vans & Family", "Luxury & Wedding", "Commercial & Buses"];

  function fetchJson(url, opts, ms) {
    return new Promise(function (resolve, reject) {
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); reject(new Error("timeout")); }, ms || 15000);
      opts = opts || {};
      if (ctrl) opts.signal = ctrl.signal;
      fetch(url, opts)
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); })
        .then(function (t) {
          clearTimeout(timer);
          var j;
          try { j = JSON.parse(t); } catch (e) { return reject(new Error("bad json")); }
          resolve(j);
        })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }
  function withQuery(q) { return cfg.SCRIPT_URL + (cfg.SCRIPT_URL.indexOf("?") > -1 ? "&" : "?") + q; }

  /* ---------- settings: names in the sheet can be typed loosely ---------- */
  function normSettings(raw) {
    var m = {};
    Object.keys(raw || {}).forEach(function (k) { m[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = raw[k]; });
    function s(k, d) { var v = m[k]; return v === undefined || v === null || String(v).trim() === "" ? d : String(v).trim(); }
    function n(k, d) { var v = parseFloat(String(m[k]).replace(/[^0-9.]/g, "")); return isNaN(v) ? d : v; }
    var wa = s("whatsappnumber", "923000000000").replace(/\D/g, "");
    if (wa.charAt(0) === "0") wa = "92" + wa.slice(1);
    var terms = Object.keys(m).filter(function (k) { return /^rentalterm\d*$/.test(k) && String(m[k]).trim() !== ""; })
      .sort(function (a, b) { return (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0); })
      .map(function (k) { return String(m[k]).trim(); });
    return {
      name: s("companyname", "Safar Wheels"),
      phone: s("phone", "0300 0000000"),
      whatsapp: wa,
      address: s("address", "Lahore, Pakistan"),
      hours: s("openinghours", "Every day: 8 am - 10 pm").split(";").map(function (x) { return x.trim(); }).filter(Boolean),
      onlinePct: n("onlinebookingdiscount", 5),
      long36: n("longrentaldiscount36days", 5),
      long7: n("longrentaldiscount7days", 10),
      stampSize: Math.max(1, Math.floor(n("stampcardsize", 5))),
      stampPct: n("stamprewarddiscount", 10),
      maxPct: n("maxtotaldiscount", 20),
      outPct: n("outstationextra", 15),
      deliveryFee: n("deliveryfee", 1000),
      holdHours: Math.max(1, n("holdhoursforpending", 24)),
      maxDays: Math.max(1, Math.floor(n("maxrentaldays", 30))),
      maxAhead: Math.max(1, Math.floor(n("maxdaysahead", 180))),
      accepting: ["no", "n", "false", "0"].indexOf(s("acceptingbookings", "Yes").toLowerCase()) === -1,
      terms: terms
    };
  }

  /* ---------- build the data used by every page ---------- */
  function build(raw, source) {
    var cars = (raw.cars || []).map(function (c) {
      return {
        id: String(c.id || "").trim().toLowerCase(), name: String(c.name || "").trim(), category: String(c.category || "Other").trim(),
        seats: Math.max(1, Math.floor(Number(c.seats) || 1)), transmission: String(c.transmission || "").trim(),
        selfPrice: Math.max(0, Number(c.selfPrice) || 0), driverPrice: Math.max(0, Number(c.driverPrice) || 0),
        driverRule: String(c.driverRule || "").trim().toLowerCase() === "required" ? "Required" : "Optional",
        units: Math.max(1, Math.floor(Number(c.units) || 1)), deposit: Math.max(0, Number(c.deposit) || 0),
        description: String(c.description || ""), photo: String(c.photo || ""), popularity: Number(c.popularity) || 0
      };
    }).filter(function (c) {
      if (!c.id || !c.name) return false;
      c.modes = SW.driverModes(c);
      return c.modes.length > 0;
    });
    var byId = {}, seen = {};
    cars.forEach(function (c) {
      c.body = SW.bodyOf(c);
      c.minPrice = Math.min.apply(null, c.modes.map(function (m) { return m === "Self-drive" ? c.selfPrice : c.driverPrice; }));
      byId[c.id] = c;
      seen[c.category] = (seen[c.category] || 0) + 1;
    });
    var cats = PREFERRED.filter(function (c) { return seen[c]; });
    Object.keys(seen).forEach(function (c) { if (cats.indexOf(c) === -1) cats.push(c); });
    var addons = (raw.addons || []).map(function (a) {
      var ap = Array.isArray(a.appliesTo) ? a.appliesTo : String(a.appliesTo || "").split(",");
      return { name: String(a.name || "").trim(), price: Math.max(0, Number(a.price) || 0), charged: String(a.charged || "One time"), appliesTo: ap.map(function (x) { return String(x).trim(); }).filter(Boolean) };
    }).filter(function (a) { return a.name; });
    SW.data = {
      cars: cars, byId: byId, categories: cats, counts: seen, addons: addons,
      settings: normSettings(raw.settings), busy: raw.busy || {}, busyOk: !!raw.busy, source: source, demo: source === "demo"
    };
    return SW.data;
  }

  /* ---------- load (cars, add-ons and settings are kept a few minutes; busy dates never) ---------- */
  var loadPromise = null, busyPromise = null;
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; } }
  function writeCache(raw) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: { cars: raw.cars, addons: raw.addons, settings: raw.settings } })); } catch (e) { /* ignore */ }
  }

  function doLoad() {
    if (!cfg.SCRIPT_URL) return Promise.resolve(build(SW.demo.raw(), "demo"));
    var cached = readCache(), mins = cfg.CACHE_MINUTES || 5;
    function fromCache(source) {
      var data = build({ cars: cached.data.cars, addons: cached.data.addons, settings: cached.data.settings, busy: null }, source);
      return SW.busy(true).then(function () { return data; }, function () { return data; }); // if busy dates fail, busyOk stays false
    }
    if (cached && cached.data && Date.now() - cached.t < mins * 60000) return fromCache("cache");
    return fetchJson(withQuery("action=all&_=" + Date.now()), { cache: "no-store" }, 15000)
      .then(function (j) {
        if (!j || !j.ok || !j.cars) throw new Error("bad data");
        writeCache(j);
        return build(j, "live");
      })
      .catch(function (err) {
        if (cached && cached.data) return fromCache("stale");
        throw err;
      });
  }
  SW.load = function () { if (!loadPromise) loadPromise = doLoad(); return loadPromise; };

  // Fresh busy dates: { carId: [["2026-11-05","2026-11-07"], ...] }. Never taken from the browser cache.
  SW.busy = function () {
    if (!cfg.SCRIPT_URL) {
      return SW.demo.busy().then(function (j) { if (SW.data) { SW.data.busy = j.busy; SW.data.busyOk = true; } return j.busy; });
    }
    if (busyPromise) return busyPromise;
    busyPromise = fetchJson(withQuery("action=busy&_=" + Date.now()), { cache: "no-store" }, 15000)
      .then(function (j) {
        busyPromise = null;
        if (!j || !j.ok) throw new Error("bad data");
        if (SW.data) { SW.data.busy = j.busy || {}; SW.data.busyOk = true; }
        return j.busy || {};
      }, function (e) {
        busyPromise = null;
        if (SW.data) SW.data.busyOk = false;
        throw e;
      });
    return busyPromise;
  };

  /* ---------- availability helpers (the Apps Script checks again when a booking is sent) ---------- */
  function ranges(carId) { return (SW.data && SW.data.busy && SW.data.busy[carId]) || []; }
  SW.isTaken = function (carId, ymd) {
    var r = ranges(carId);
    for (var i = 0; i < r.length; i++) if (ymd >= r[i][0] && ymd <= r[i][1]) return true;
    return false;
  };
  // The first unavailable day between start and end (inclusive), or null when the whole range is free.
  SW.firstTaken = function (carId, start, end) {
    var r = ranges(carId);
    for (var i = 0; i < r.length; i++) if (r[i][0] <= end && r[i][1] >= start) return r[i][0] > start ? r[i][0] : start;
    return null;
  };
  SW.nextFree = function (carId, from) {
    var d = from, r = ranges(carId);
    for (var i = 0; i < r.length; i++) if (d >= r[i][0] && d <= r[i][1]) d = SW.d.add(r[i][1], 1);
    return d;
  };
  // { state: "today" | "soon" | "full", text }
  SW.availLabel = function (car) {
    var D = SW.d, today = D.today(), set = SW.data.settings;
    if (!SW.isTaken(car.id, today)) return { state: "today", text: "Available today" };
    var nf = SW.nextFree(car.id, today);
    if (D.diff(today, nf) > set.maxAhead) return { state: "full", text: "Fully booked for now" };
    return { state: "soon", text: "Next free: " + D.fmt(nf) };
  };
  // Nearest free windows of the same length, before and after the wanted dates.
  SW.suggest = function (carId, start, end) {
    var D = SW.d, set = SW.data.settings, n = D.days(start, end), today = D.today(), last = D.add(today, set.maxAhead), out = [];
    function free(s) { return s >= today && s <= last && !SW.firstTaken(carId, s, D.add(s, n - 1)); }
    var back = null, fwd = null, i, s;
    for (i = 1; i <= set.maxAhead + 30; i++) { s = D.add(start, i); if (s > last) break; if (free(s)) { fwd = s; break; } }
    for (i = 1; i <= set.maxAhead + 30; i++) { s = D.add(start, -i); if (s < today) break; if (free(s)) { back = s; break; } }
    [back, fwd].forEach(function (x) { if (x) out.push({ start: x, end: D.add(x, n - 1) }); });
    return out;
  };

  /* ---------- bookings ---------- */
  SW.book = function (payload) {
    if (!cfg.SCRIPT_URL) return SW.demo.book(payload);
    return fetchJson(cfg.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }, 30000);
  };

  // Phone is required; the booking reference is optional. Answers are never taken from the browser cache.
  //   phone only    -> { ok, mode: "list", bookings: [{ ref, carId, car, start, end, status, created, expired }], stamps }
  //   phone + ref   -> { ok, mode: "one",  bookings: [one booking], stamps }
  SW.track = function (phone, ref) {
    if (!cfg.SCRIPT_URL) return SW.demo.track(phone, ref);
    var q = "action=track&phone=" + encodeURIComponent(phone) + (ref ? "&ref=" + encodeURIComponent(ref) : "") + "&_=" + Date.now();
    return fetchJson(withQuery(q), { cache: "no-store" }, 20000);
  };

  // How many stamps this phone has (used to show the stamp reward in the price). Display only.
  SW.stamps = function (phone) {
    if (!cfg.SCRIPT_URL) return SW.demo.stamps(phone);
    return fetchJson(withQuery("action=stamps&phone=" + encodeURIComponent(phone) + "&_=" + Date.now()), { cache: "no-store" }, 15000);
  };

  SW.waLink = function (text) {
    var n = SW.data ? SW.data.settings.whatsapp : "923000000000";
    return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
  };
})();
