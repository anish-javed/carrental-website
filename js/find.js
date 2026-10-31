/* Find My Car: a short quiz that recommends 3 cars */
(function () {
  var SW = window.SW, $ = SW.$, esc = SW.esc;

  var STEPS = [
    { key: "people", q: "How many people are travelling?", opts: [
      { l: "1 - 2", v: 2 }, { l: "3 - 4", v: 4 }, { l: "5 - 7", v: 7 }, { l: "8 - 14", v: 14 }, { l: "15 - 29", v: 29 }, { l: "30 or more", v: 30 }] },
    { key: "luggage", q: "How much luggage?", opts: [
      { l: "Just a bag or two", v: 1 }, { l: "A few suitcases", v: 2 }, { l: "Lots of luggage", v: 3 }] },
    { key: "budget", q: "What is your budget per day?", opts: [
      { l: "Under Rs 6,000", v: [0, 6000] }, { l: "Rs 6,000 - 10,000", v: [6000, 10000] }, { l: "Rs 10,000 - 20,000", v: [10000, 20000] },
      { l: "More than Rs 20,000", v: [20000, 1e9] }, { l: "No limit", v: [0, 1e9] }] },
    { key: "trip", q: "What kind of trip is it?", opts: [
      { l: "Wedding", v: "wedding" }, { l: "Family trip", v: "family" }, { l: "Airport", v: "airport" }, { l: "Business", v: "business" }, { l: "Tour", v: "tour" }] }
  ];
  var PURPOSE = { wedding: "Wedding", family: "Family visit", airport: "Airport", business: "Business", tour: "Tour/Trip" };
  var LIKE = {
    wedding: { "Luxury & Wedding": 40, "SUVs & 4x4": 20, "Sedans": 18, "Vans & Family": 5 },
    family: { "Vans & Family": 35, "SUVs & 4x4": 30, "Sedans": 18, "Hatchbacks": 5 },
    airport: { "Sedans": 30, "SUVs & 4x4": 22, "Vans & Family": 15, "Hatchbacks": 12, "Luxury & Wedding": 10 },
    business: { "Sedans": 32, "Luxury & Wedding": 30, "SUVs & 4x4": 20 },
    tour: { "SUVs & 4x4": 32, "Vans & Family": 28, "Commercial & Buses": 28, "Sedans": 10 }
  };
  var BOOT = { hatch: 1, sedan: 2, suv: 3, pickup: 3, van: 4, minibus: 4, coach: 5 };
  var TRIPWORD = { wedding: "weddings", family: "family trips", airport: "airport runs", business: "business", tour: "tours" };

  SW.boot(function (data) {
    var step = 0, ans = {};
    var body = $("#qbody"), back = $("#qback");

    function show() {
      var s = STEPS[step];
      $("#qcount").textContent = "Question " + (step + 1) + " of " + STEPS.length;
      $("#qbar").style.width = (step / STEPS.length * 100 + 6) + "%";
      body.innerHTML = '<h2 class="quiz-q">' + s.q + '</h2><div class="quiz-opts">' + s.opts.map(function (o, i) {
        return '<button type="button" class="quiz-opt" data-i="' + i + '">' + o.l + "</button>";
      }).join("") + "</div>";
      back.hidden = step === 0;
    }
    body.addEventListener("click", function (e) {
      var b = e.target.closest(".quiz-opt");
      if (!b) return;
      var s = STEPS[step], o = s.opts[+b.getAttribute("data-i")];
      ans[s.key] = o;
      b.classList.add("picked");
      setTimeout(function () {
        if (step < STEPS.length - 1) { step++; show(); } else result();
      }, SW.reduce ? 0 : 220);
    });
    back.addEventListener("click", function () { if (step > 0) { step--; show(); } });
    $("#qagain").addEventListener("click", function () {
      step = 0; ans = {};
      $("#qresults").hidden = true; $("#quiz").hidden = false;
      show();
      $("#quiz").scrollIntoView({ behavior: SW.reduce ? "auto" : "smooth", block: "start" });
    });

    function score(c) {
      var need = ans.people.v, lug = ans.luggage.v, b = ans.budget.v, trip = ans.trip.v, reasons = [], sc = 0;
      if (c.seats < need) return null; // too small for the group
      var extra = c.seats - need;
      sc += Math.max(0, 30 - extra * (need <= 7 ? 3 : 1.2));
      reasons.push("Seats " + c.seats + " for your group of " + (need >= 30 ? "30+" : "up to " + need));
      var boot = BOOT[c.body] || 2;
      if (boot >= lug) { sc += 12 + (boot === lug ? 4 : 0); if (lug >= 2) reasons.push("Enough room for your luggage"); } else sc -= 14 * (lug - boot);
      if (c.minPrice >= b[0] && c.minPrice <= b[1]) { sc += 30; reasons.push("Fits your budget: from " + SW.money(c.minPrice) + "/day"); }
      else if (c.minPrice < b[0]) sc += 12;
      else sc -= Math.min(40, (c.minPrice - b[1]) / 400);
      var like = (LIKE[trip] || {})[c.category] || 0;
      sc += like;
      if (like >= 25) reasons.push("A great choice for " + TRIPWORD[trip]);
      sc += c.popularity / 12;
      return { car: c, score: sc, reasons: reasons };
    }

    function result() {
      var list = data.cars.map(score).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
      var top = list.slice(0, 3);
      var q = "&purpose=" + encodeURIComponent(PURPOSE[ans.trip.v]);
      $("#qsummary").textContent = ans.people.l + " people, " + ans.luggage.l.toLowerCase() + ", " + ans.budget.l.toLowerCase() + ", " + ans.trip.l.toLowerCase() + ".";
      $("#qgrid").innerHTML = top.length ? top.map(function (r, i) {
        return SW.carCard(r.car, { query: q, rank: i + 1, reason: r.reasons.slice(0, 3).join(". ") + ".", avail: true });
      }).join("") : '<div class="card empty"><h3>No exact match</h3><p>We do not have a vehicle with that many seats. Try fewer people, or <a href="fleet.html">browse the whole fleet</a> and call us for a custom plan.</p></div>';
      SW.tilt($("#qgrid"));
      SW.bindFav($("#qgrid"));
      $("#quiz").hidden = true;
      $("#qresults").hidden = false;
      SW.observe($("#qresults"));
      $("#qresults").scrollIntoView({ behavior: SW.reduce ? "auto" : "smooth", block: "start" });
    }
    show();
  });
})();
