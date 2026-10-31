/*
  The price formula. The website uses it ONLY to show a live price.
  The Google Apps Script has the same formula and recalculates everything from the sheet,
  so a changed browser cannot change what the customer pays.
*/
(function () {
  var SW = (window.SW = window.SW || {});

  // Which ways a car can be rented: ["Self-drive", "With driver"], or just one of them.
  SW.driverModes = function (car) {
    var m = [];
    if (car.driverRule !== "Required" && car.selfPrice > 0) m.push("Self-drive");
    if (car.driverPrice > 0) m.push("With driver");
    return m;
  };

  SW.addonCharge = function (a) {
    var c = String(a.charged || "").toLowerCase();
    return /night/.test(c) ? "night" : /day/.test(c) ? "day" : "one";
  };

  // "Applies To" can hold category names, plus All, With driver and Outstation. Example: "All, With driver, Outstation".
  SW.addonApplies = function (a, car, driver, trip) {
    var list = (a.appliesTo || []).map(function (x) { return String(x).trim().toLowerCase(); }).filter(Boolean);
    if (!list.length) return true;
    var needDriver = list.indexOf("with driver") > -1, needOut = list.indexOf("outstation") > -1;
    if (needDriver && driver !== "With driver") return false;
    if (needOut && trip !== "Outstation") return false;
    var cats = list.filter(function (x) { return x !== "all" && x !== "with driver" && x !== "outstation"; });
    if (!cats.length) return true;
    return cats.indexOf(String(car.category).toLowerCase()) > -1;
  };

  SW.addonAmount = function (a, days) {
    var k = SW.addonCharge(a);
    return k === "day" ? a.price * days : k === "night" ? a.price * Math.max(0, days - 1) : a.price;
  };
  SW.addonDetail = function (a, days) {
    var k = SW.addonCharge(a);
    return k === "day" ? days + " day" + (days === 1 ? "" : "s") + " x " + SW.money(a.price) :
           k === "night" ? Math.max(0, days - 1) + " night" + (days === 2 ? "" : "s") + " x " + SW.money(a.price) : "one time";
  };

  /*
    o = { car, driver, trip, days, addons: [addon objects], pickup, reward (true if the stamp card reward is ready), s: settings }
    Returns every line of the price summary.
  */
  SW.price = function (o) {
    var s = o.s, car = o.car, days = o.days, withDriver = o.driver === "With driver";
    var rentalDaily = withDriver ? car.driverPrice : car.selfPrice;
    var outPerDay = (o.trip === "Outstation" && withDriver) ? Math.round(rentalDaily * s.outPct / 100) : 0;
    var q = {
      days: days, driver: o.driver, trip: o.trip, rentalDaily: rentalDaily,
      baseTotal: rentalDaily * days, outPct: s.outPct, outPerDay: outPerDay, outTotal: outPerDay * days,
      addons: [], addonsTotal: 0,
      delivery: o.pickup === "Deliver to me" ? s.deliveryFee : 0
    };
    (o.addons || []).forEach(function (a) {
      var amt = SW.addonAmount(a, days);
      q.addons.push({ name: a.name, amount: amt, detail: SW.addonDetail(a, days) });
      q.addonsTotal += amt;
    });
    q.subtotal = q.baseTotal + q.outTotal + q.addonsTotal + q.delivery;
    q.parts = [];
    if (s.onlinePct > 0) q.parts.push({ label: "Online booking discount", pct: s.onlinePct });
    var lng = days >= 7 ? s.long7 : days >= 3 ? s.long36 : 0;
    if (lng > 0) q.parts.push({ label: days >= 7 ? "Long rental discount (7+ days)" : "Long rental discount (3-6 days)", pct: lng });
    if (o.reward && s.stampPct > 0) q.parts.push({ label: "Stamp card reward", pct: s.stampPct });
    q.rawPct = q.parts.reduce(function (t, p) { return t + p.pct; }, 0);
    q.pct = Math.min(q.rawPct, s.maxPct);
    q.capped = q.rawPct > s.maxPct;
    q.discount = Math.round(q.subtotal * q.pct / 100);
    q.total = q.subtotal - q.discount;
    q.deposit = o.driver === "Self-drive" ? car.deposit : 0;
    return q;
  };
})();
