/* Home page */
(function () {
  var SW = window.SW, D = SW.d;

  SW.boot(function (data) {
    var set = data.settings, today = D.today();

    /* ---------- hero ---------- */
    SW.$("#hero-car").innerHTML = SW.carSvg("suv", { color: "#e8318a", label: "" });
    SW.$("#truck").innerHTML = SW.truckSvg();
    SW.$("#hp-disc").innerHTML = SW.icon("tag", "ic-s") + " Extra " + set.onlinePct + "% off when you book online";
    SW.$("#hp-hold").innerHTML = SW.icon("clock", "ic-s") + " Your dates are held for " + set.holdHours + " hours";
    SW.$("#hp-stamp").innerHTML = SW.icon("gift", "ic-s") + " Every " + ordinal(set.stampSize) + " rental earns " + set.stampPct + "% off";

    var sEl = SW.$("#sd-s"), rEl = SW.$("#sd-r");
    var cal = new SW.Calendar(SW.$("#hero-cal"), {
      min: today, maxStart: D.add(today, set.maxAhead), max: D.add(today, set.maxAhead + set.maxDays - 1), maxDays: set.maxDays,
      onChange: function (s, e) {
        sEl.textContent = s ? D.fmt(s) : "Choose a day";
        rEl.textContent = e ? D.fmt(e) : (s ? "Choose a day" : "Choose a day");
        SW.$(".date-box:nth-child(1)").classList.toggle("set", !!s);
        SW.$(".date-box:nth-child(3)").classList.toggle("set", !!e);
      }
    });

    var results = SW.$("#results"), grid = SW.$("#res-grid");
    SW.tilt(grid);
    SW.bindFav(grid);
    SW.$("#hero-search").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var r = cal.getRange();
      if (!r.start || !r.end) { cal.message("Please tap your pickup day and your return day first.", "warn"); return; }
      var btn = SW.$("button[type=submit]", ev.target);
      btn.disabled = true;
      var go = function () { btn.disabled = false; showResults(r.start, r.end); };
      SW.busy().then(go, go); // fresh availability every time
    });
    SW.$("#res-close").addEventListener("click", function () { results.hidden = true; });

    function showResults(s, e) {
      var n = D.days(s, e);
      var free = data.cars.filter(function (c) { return !SW.firstTaken(c.id, s, e); }).sort(function (a, b) { return b.popularity - a.popularity; });
      SW.$("#res-title").textContent = free.length ? free.length + (free.length === 1 ? " car is" : " cars are") + " free for " + D.range(s, e) : "No cars are free for those dates";
      SW.$("#res-sub").textContent = n + (n === 1 ? " day" : " days") + " (pickup day and return day both count)." + (data.busyOk ? "" : " We could not check the latest bookings, so we will confirm when you book.");
      var q = "&start=" + s + "&end=" + e;
      grid.innerHTML = free.length ? free.map(function (c) { return SW.carCard(c, { query: q, avail: false }); }).join("") :
        '<div class="card empty"><p>Every car is booked on at least one of these days. Try moving your dates a little, or <a href="fleet.html">look at the fleet</a> to see each car\'s next free date.</p></div>';
      results.hidden = false;
      SW.observe(results);
      results.scrollIntoView({ behavior: SW.reduce ? "auto" : "smooth", block: "start" });
    }

    /* ---------- rebook your last trip ---------- */
    var last = SW.store.get("last", null);
    if (last && data.byId[last.carId]) {
      var c = data.byId[last.carId], me = SW.me.get();
      SW.$("#rebook").innerHTML = '<section class="card rebook reveal"><div class="rb-art">' + SW.carArt(c) + '</div><div class="rb-text"><p class="eyebrow dark">Welcome back' + (me.name ? ", " + SW.esc(me.name.split(" ")[0]) : "") + "!</p>" +
        "<h2>Rebook your last trip</h2><p>" + SW.esc(c.name) + " - " + SW.esc(last.driver) + " - " + SW.esc(last.trip) + " - " + SW.plural(last.days, "day") + '</p></div>' +
        '<a class="btn btn-primary btn-lg" href="book.html?car=' + encodeURIComponent(c.id) + "&driver=" + encodeURIComponent(last.driver) + "&trip=" + encodeURIComponent(last.trip) + '&purpose=' + encodeURIComponent(last.purpose || "") + '">Rebook ' + SW.icon("arrow") + "</a></section>";
    }

    /* ---------- categories ---------- */
    SW.$("#cats").innerHTML = data.categories.map(function (cat) {
      var list = data.cars.filter(function (c) { return c.category === cat; });
      var from = Math.min.apply(null, list.map(function (c) { return c.minPrice; }));
      var sample = list.slice().sort(function (a, b) { return b.popularity - a.popularity; })[0];
      return '<a class="cat-card reveal" href="fleet.html?cat=' + encodeURIComponent(cat) + '"><div class="cat-art">' + SW.carSvg(sample.body, { color: SW.carColor(cat) }) + "</div><h3>" + SW.esc(cat) + "</h3><p>" +
        SW.plural(list.length, "vehicle") + " - from " + SW.money(from) + "/day</p></a>";
    }).join("");

    /* ---------- speedometers and trust points ---------- */
    var g = [[2500, "+", "Trips completed", 0.86], [data.cars.length, "", "Cars, vans & buses", 0.62], [98, "%", "Happy customers", 0.98], [12, " yrs", "On the road", 0.5]];
    SW.$("#gauges").innerHTML = g.map(function (x) {
      return '<div class="gauge">' + SW.gaugeSvg(x[3]) + '<b data-count="' + x[0] + '" data-suffix="' + x[1] + '">0</b><span>' + x[2] + "</span></div>";
    }).join("");
    var trust = [
      ["shield", "You pay nothing online", "We confirm your booking, then you pay us directly."],
      ["tag", "Clear prices", "Every line is shown: days, extras, discounts and total."],
      ["clock", set.holdHours + "-hour hold", "Your dates are kept for you while we confirm."],
      ["gift", "Stamp card", "Every " + ordinal(set.stampSize) + " completed rental earns " + set.stampPct + "% off."]
    ];
    SW.$("#trust").innerHTML = trust.map(function (t) { return '<li class="reveal">' + SW.icon(t[0]) + "<div><b>" + t[1] + "</b><span>" + t[2] + "</span></div></li>"; }).join("");

    /* ---------- featured cars ---------- */
    var feat = data.cars.slice().sort(function (a, b) { return b.popularity - a.popularity; }).slice(0, 6), fe = SW.$("#featured");
    fe.innerHTML = feat.map(function (c) { return SW.carCard(c); }).join("");
    SW.tilt(fe);
    SW.bindFav(fe);

    /* ---------- why ---------- */
    var why = [
      ["driver", "Professional drivers", "Polite, experienced and local. They know every road and every shortcut."],
      ["key", "Self-drive made easy", "Pick up at our office or have the car delivered to your door."],
      ["calendar", "Real availability", "The calendar shows exactly which days are free. No double bookings."],
      ["wa", "Quick help", "Call or WhatsApp us any time. We reply fast."],
      ["bag", "For every trip", "Weddings, airport runs, family visits, business, tours and group travel."],
      ["star", "Rewards for coming back", "Collect stamps on every completed rental and earn a discount."]
    ];
    SW.$("#why").innerHTML = why.map(function (w) { return '<div class="why-item reveal">' + SW.icon(w[0]) + "<h3>" + w[1] + "</h3><p>" + w[2] + "</p></div>"; }).join("");

    initRoad();
  });

  function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  /* ---------- a small car drives along the winding road as you scroll (scrolling itself is never held) ---------- */
  function initRoad() {
    var sec = SW.$("#road"), path = SW.$("#road-path"), car = SW.$("#road-car");
    if (!sec || !path || !car || !path.getTotalLength) return;
    car.innerHTML = SW.carSvg("hatch", { color: "#f6a91b", label: "" });
    var len = path.getTotalLength(), svg = path.ownerSVGElement, ticking = false;
    function place(p) {
      var a = path.getPointAtLength(len * p), b = path.getPointAtLength(Math.min(len, len * p + 2)), r = svg.getBoundingClientRect();
      var ang = Math.atan2((b.y - a.y) * (r.height / 300), (b.x - a.x) * (r.width / 1000)) * 180 / Math.PI;
      car.style.left = (a.x / 10) + "%";
      car.style.top = (a.y / 3) + "%";
      car.style.transform = "translate(-50%, -78%) rotate(" + ang.toFixed(1) + "deg)";
    }
    function update() {
      ticking = false;
      var r = sec.getBoundingClientRect(), vh = window.innerHeight || 800;
      var p = (vh - r.top) / (vh + r.height);
      place(Math.max(0.02, Math.min(0.98, p)));
    }
    if (SW.reduce) { place(0.55); return; }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
})();
