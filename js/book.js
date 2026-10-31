/* Book a Car page */
(function () {
  var SW = window.SW, D = SW.d, $ = SW.$, esc = SW.esc;

  SW.boot(function (data) {
    var set = data.settings, today = D.today(), startedAt = Date.now();
    var form = $("#bk"), carSel = $("#car");
    var car = null, selected = {}, reward = false, stampPhone = "", finished = false;

    /* ---------- the calendar ---------- */
    var cal = new SW.Calendar($("#cal"), {
      min: today, maxStart: D.add(today, set.maxAhead), max: D.add(today, set.maxAhead + set.maxDays - 1), maxDays: set.maxDays,
      onChange: function () { $("#e-dates").textContent = ""; renderAddons(); renderSummary(); }
    });
    cal.setDisabled("Choose a car first, then pick your dates.");
    if (!data.busyOk) $("#busy-warn").hidden = false;

    if (!set.accepting) {
      var cl = $("#closed");
      cl.hidden = false;
      cl.innerHTML = "We are not taking online bookings right now. Please call us on <b>" + esc(set.phone) + "</b> or send us a WhatsApp message.";
      $("#submit").disabled = true;
    }

    /* ---------- small readers ---------- */
    function radio(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
    var getDriver = function () { return radio("driver"); }, getTrip = function () { return radio("trip"); }, getPickup = function () { return radio("pickup"); };

    /* ---------- car list ---------- */
    var opts = '<option value="">Choose a car...</option>';
    data.categories.forEach(function (cat) {
      opts += '<optgroup label="' + esc(cat) + '">';
      data.cars.filter(function (c) { return c.category === cat; }).forEach(function (c) {
        opts += '<option value="' + esc(c.id) + '">' + esc(c.name) + " - from " + SW.money(c.minPrice) + "/day</option>";
      });
      opts += "</optgroup>";
    });
    carSel.innerHTML = opts;
    carSel.addEventListener("change", function () { setCar(carSel.value); });

    function setCar(id, preferDriver) {
      car = data.byId[String(id || "").toLowerCase()] || null;
      carSel.value = car ? car.id : "";
      $("#e-car").textContent = "";
      var prev = $("#car-prev");
      if (!car) {
        prev.innerHTML = ""; $("#driver-seg").innerHTML = ""; $("#driver-note").textContent = ""; $("#pax-note").textContent = "";
        cal.setDisabled("Choose a car first, then pick your dates.");
        selected = {}; renderAddons(); renderSummary();
        return;
      }
      var av = SW.availLabel(car);
      prev.innerHTML = '<div class="prev-card"><div class="car-art" style="--c:' + SW.carColor(car.id) + '">' + SW.carArt(car) + '</div><div class="prev-info"><span class="chip">' + esc(car.category) + "</span><h3>" + esc(car.name) + "</h3>" +
        '<ul class="specs">' + SW.specList(car) + "</ul>" + SW.priceBlock(car) + '<span class="avail ' + av.state + '"><i></i>' + esc(av.text) + "</span></div></div>";
      renderDrivers(preferDriver);
      var px = $("#pax");
      px.max = car.seats;
      if (+px.value > car.seats) px.value = car.seats;
      $("#pax-note").textContent = "This car has " + car.seats + " seats.";
      cal.setDisabled("");
      cal.setOptions({
        isTaken: function (d) { return SW.isTaken(car.id, d); },
        firstTaken: function (a, b) { return SW.firstTaken(car.id, a, b); },
        suggest: function (a, b) { return SW.suggest(car.id, a, b); }
      });
      var r = cal.getRange();
      if (r.start && r.end && SW.firstTaken(car.id, r.start, r.end)) {
        cal.clear();
        cal.message("Your dates are not free for this car, so we cleared them. Please pick new dates.", "warn");
      }
      updateTripUi(); renderAddons(); renderSummary();
    }

    function renderDrivers(prefer) {
      var cur = prefer || getDriver(), pick = car.modes.indexOf(cur) > -1 ? cur : car.modes[0];
      $("#driver-seg").innerHTML = car.modes.map(function (m) {
        return '<label class="seg-opt"><input type="radio" name="driver" value="' + m + '"' + (m === pick ? " checked" : "") + "><span>" + m + "<small>" + SW.money(m === "Self-drive" ? car.selfPrice : car.driverPrice) + "/day</small></span></label>";
      }).join("");
      updateDriverUi();
    }
    function updateDriverUi() {
      var d = getDriver(), note = "";
      if (car.driverRule === "Required") note = "This vehicle is rented with a professional driver only.";
      else if (d === "Self-drive") note = "You drive. A refundable deposit of " + SW.money(car.deposit) + " is paid at pickup.";
      else note = "A professional driver comes with the car.";
      $("#driver-note").textContent = note;
      $("#confirm-txt").textContent = d === "Self-drive" ? "I will show my original CNIC and my original driving licence at pickup." : "I will show my original CNIC at pickup.";
    }
    function updateTripUi() {
      var trip = getTrip(), d = getDriver();
      $("#dest-wrap").hidden = trip !== "Outstation";
      $("#trip-note").textContent = trip === "Outstation" ?
        (d === "With driver" ? "Outstation trips add " + set.outPct + "% to the with-driver daily price." : "There is no outstation extra for self-drive. Please tell us where you are going.") : "";
      $("#deliver-lbl").textContent = "Deliver to me (+" + SW.money(set.deliveryFee) + ")";
      $("#addr-wrap").hidden = getPickup() !== "Deliver to me";
      $("#office-note").textContent = getPickup() === "Our office" ? "Our office: " + set.address : "We bring the car to the address you type below.";
    }

    /* ---------- add-ons ---------- */
    function renderAddons() {
      var r = cal.getRange(), days = r.start && r.end ? D.days(r.start, r.end) : null, step = $("#addon-step");
      var list = car ? data.addons.filter(function (a) {
        return SW.addonApplies(a, car, getDriver(), getTrip()) && !(SW.addonCharge(a) === "night" && days !== null && days < 2);
      }) : [];
      Object.keys(selected).forEach(function (n) { if (!list.some(function (a) { return a.name === n; })) delete selected[n]; });
      step.hidden = !list.length;
      $("#n-you").textContent = list.length ? "6" : "5";
      $("#addons").innerHTML = list.map(function (a) {
        var k = SW.addonCharge(a), per = k === "day" ? "per day" : k === "night" ? "per night" : "one time";
        return '<label class="check addon"><input type="checkbox" data-addon="' + esc(a.name) + '"' + (selected[a.name] ? " checked" : "") + "><span><b>" + esc(a.name) + "</b><small>" + SW.money(a.price) + " " + per + "</small></span></label>";
      }).join("");
    }
    $("#addons").addEventListener("change", function (e) {
      var b = e.target.closest("[data-addon]");
      if (!b) return;
      var n = b.getAttribute("data-addon");
      if (b.checked) selected[n] = true; else delete selected[n];
      renderSummary();
    });

    /* ---------- price summary (display only; the Apps Script recalculates everything) ---------- */
    function currentQuote() {
      var r = cal.getRange(), driver = getDriver();
      if (!car || !r.start || !r.end || !driver) return null;
      return SW.price({
        car: car, driver: driver, trip: getTrip(), days: D.days(r.start, r.end), pickup: getPickup(), reward: reward, s: set,
        addons: data.addons.filter(function (a) { return selected[a.name]; })
      });
    }
    function row(l, v, cls) { return '<div class="r ' + (cls || "") + '"><dt>' + l + "</dt><dd>" + v + "</dd></div>"; }
    function renderSummary() {
      var q = currentQuote(), box = $("#sum-lines"), tr = $("#total-row"), dep = $("#deposit");
      if (!q) {
        box.innerHTML = '<p class="sum-empty">' + (car ? "Pick your pickup day and return day to see the price." : "Choose a car and your dates to see the price.") + "</p>";
        tr.hidden = true; dep.hidden = true;
        return;
      }
      var r = cal.getRange(), h = '<dl class="sum-lines">';
      h += '<div class="sum-car"><b>' + esc(car.name) + "</b><span>" + q.driver + " - " + D.range(r.start, r.end) + "</span></div>";
      h += row(SW.plural(q.days, "day") + " x " + SW.money(q.rentalDaily), SW.money(q.baseTotal));
      if (q.outPerDay) h += row("Outstation extra " + q.outPct + "%: " + q.days + " x " + SW.money(q.outPerDay), SW.money(q.outTotal));
      q.addons.forEach(function (a) { h += row(esc(a.name) + ": " + a.detail, SW.money(a.amount)); });
      if (q.delivery) h += row("Delivery to your address", SW.money(q.delivery));
      h += row("Subtotal", SW.money(q.subtotal), "sub");
      q.parts.forEach(function (p) { h += row(esc(p.label), p.pct + "%", "disc"); });
      if (q.parts.length) h += row("Discount" + (q.capped ? " (limited to " + q.pct + "%)" : " (" + q.pct + "%)"), "- " + SW.money(q.discount), "disc strong");
      box.innerHTML = h + "</dl>";
      tr.hidden = false;
      SW.odometer($("#odo"), q.total);
      dep.hidden = !(q.deposit > 0);
      if (q.deposit > 0) dep.innerHTML = SW.icon("shield", "ic-s") + " Deposit " + SW.money(q.deposit) + ": paid at pickup, refundable. It is not part of the total above.";
    }

    /* ---------- reacting to choices ---------- */
    form.addEventListener("change", function (e) {
      var n = e.target.name;
      if (n === "driver") { updateDriverUi(); updateTripUi(); renderAddons(); renderSummary(); }
      else if (n === "trip" || n === "pickup") { updateTripUi(); renderAddons(); renderSummary(); }
    });
    form.addEventListener("input", function (e) {
      var f = e.target.closest ? e.target.closest(".field, .check, .step") : null;
      var er = f ? f.querySelector(".err") : null;
      if (er) er.textContent = "";
    });

    var pax = $("#pax");
    $("#pax-").addEventListener("click", function () { pax.value = Math.max(1, (parseInt(pax.value, 10) || 1) - 1); });
    $("#pax\\+").addEventListener("click", function () { var m = car ? car.seats : 99; pax.value = Math.min(m, (parseInt(pax.value, 10) || 0) + 1); });

    /* ---------- phone: auto-format and stamp card ---------- */
    var phone = $("#phone");
    phone.addEventListener("input", function () {
      phone.value = SW.fmtPhone(phone.value);
      if (SW.validPhone(phone.value)) checkStamps();
      else { reward = false; stampPhone = ""; $("#stamp-note").textContent = ""; renderSummary(); }
    });
    function checkStamps() {
      var d = SW.phoneDigits(phone.value);
      if (d === stampPhone) return;
      stampPhone = d;
      SW.stamps(d).then(function (res) {
        if (d !== stampPhone || !res || !res.ok) return;
        var s = res.stamps || {};
        reward = !!res.reward;
        var note = "";
        if (reward) note = "Stamp card reward ready: " + set.stampPct + "% extra off is added to this booking.";
        else if (s.completed > 0) note = "Your stamp card: " + (s.completed % s.size) + " of " + s.size + " stamps.";
        $("#stamp-note").textContent = note;
        renderSummary();
      }, function () { /* not important: the server works it out when the booking is sent */ });
    }

    /* ---------- checking the form ---------- */
    function validate() {
      var errs = [];
      function bad(id, msg) { errs.push({ id: id, msg: msg }); }
      var r = cal.getRange();
      if (!car) bad("car", "Please choose a car.");
      if (!r.start || !r.end) bad("dates", "Please pick your pickup day and your return day on the calendar.");
      else if (car && SW.firstTaken(car.id, r.start, r.end)) bad("dates", D.fmt(SW.firstTaken(car.id, r.start, r.end)) + " is already booked for this car. Please pick other dates.");
      if (car && !getDriver()) bad("driver", "Please choose a driver option.");
      if (getTrip() === "Outstation" && $("#dest").value.trim().length < 2) bad("dest", "Please type the city you are going to.");
      if (!$("#purpose").value) bad("purpose", "Please choose the purpose of your trip.");
      var px = parseInt($("#pax").value, 10);
      if (!(px >= 1)) bad("pax", "Please enter the number of passengers.");
      else if (car && px > car.seats) bad("pax", "This car has only " + car.seats + " seats.");
      if (getPickup() === "Deliver to me" && $("#address").value.trim().length < 8) bad("addr", "Please type your pickup area and address.");
      if ($("#name").value.trim().length < 2) bad("name", "Please type your name.");
      if (!SW.validPhone(phone.value)) bad("phone", "Please type a mobile number like 0300-1234567.");
      var em = $("#email").value.trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) bad("email", "This email does not look right.");
      if (!$("#confirm").checked) bad("confirm", "Please tick the box to confirm.");
      return errs;
    }
    var FOCUS = { car: "#car", driver: "#driver-seg", dest: "#dest", purpose: "#purpose", pax: "#pax", addr: "#address", name: "#name", phone: "#phone", email: "#email", confirm: "#confirm" };

    function message(text) {
      var m = $("#form-msg");
      m.hidden = !text;
      m.textContent = text || "";
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      message("");
      SW.$$(".err", form).forEach(function (e) { e.textContent = ""; });
      var errs = validate();
      if (errs.length) {
        errs.forEach(function (e) { var el = $("#e-" + e.id); if (el) el.textContent = e.msg; });
        var first = errs[0], target = first.id === "dates" ? $("#cal") : $(FOCUS[first.id] || "#e-" + first.id);
        if (target) {
          target.scrollIntoView({ behavior: SW.reduce ? "auto" : "smooth", block: "center" });
          if (target.focus && first.id !== "dates") target.focus({ preventScroll: true });
        }
        return;
      }
      var r = cal.getRange(), px = parseInt(pax.value, 10), trip = getTrip(), pick = getPickup();
      var payload = {
        car: car.id, start: r.start, end: r.end, driver: getDriver(), trip: trip, purpose: $("#purpose").value, passengers: px,
        pickup: pick, address: pick === "Deliver to me" ? $("#address").value.trim() : "", time: $("#time").value,
        destination: trip === "Outstation" ? $("#dest").value.trim() : "", addons: Object.keys(selected),
        name: $("#name").value.trim(), phone: SW.fmtPhone(phone.value), email: $("#email").value.trim(), notes: $("#notes").value.trim(),
        confirmed: true, hp: $("#hp").value, elapsed: Date.now() - startedAt
      };
      var btn = $("#submit"), label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "Saving your booking...";
      SW.book(payload).then(function (res) {
        btn.disabled = false; btn.innerHTML = label;
        if (res && res.ok) { done(res, payload); return; }
        message((res && res.error) || "Sorry, something went wrong. Please try again, or call us.");
        if (res && res.conflict) {
          SW.busy(true).then(function () {
            cal.clear();
            cal.refresh();
            var s = SW.suggest(car.id, payload.start, payload.end);
            cal.message((res.error || "These dates were just taken.") + " Please pick again.", "warn", s);
            $("#cal").scrollIntoView({ behavior: SW.reduce ? "auto" : "smooth", block: "center" });
          }, function () { /* keep the message above */ });
        }
      }, function () {
        btn.disabled = false; btn.innerHTML = label;
        message("We could not reach our booking sheet. Nothing was saved. Please check your internet and try again, or call " + set.phone + ".");
      });
    });

    /* ---------- thank-you screen ---------- */
    function waText(res) {
      var b = res.booking, q = res.quote;
      return [
        "Salaam! I just booked a car on Safar Wheels.", "",
        "Booking ref: " + res.ref, "Name: " + b.name, "Phone: " + b.phone, "Car: " + b.carName,
        "Dates: " + D.fmt(b.start, true) + " to " + D.fmt(b.end, true) + " (" + SW.plural(b.days, "day") + ")",
        "Driver: " + b.driver, "Trip: " + b.trip, "Purpose: " + b.purpose, "Passengers: " + b.passengers,
        "Pickup: " + b.pickup + (b.address ? " - " + b.address : ""),
        b.time ? "Pickup time: " + D.clock(b.time) : null,
        b.destination ? "Destination: " + b.destination : null,
        "Add-ons: " + (b.addons.length ? b.addons.join(", ") : "None"),
        "Total: " + SW.money(q.total) + (q.deposit ? " (plus refundable deposit " + SW.money(q.deposit) + " at pickup)" : ""),
        b.notes ? "Notes: " + b.notes : null, "", "Please confirm my booking. Thank you!"
      ].filter(function (l) { return l !== null; }).join("\n");
    }

    function done(res, payload) {
      finished = true;
      var b = res.booking, q = res.quote;
      SW.store.set("last", { carId: b.carId, driver: b.driver, trip: b.trip, purpose: b.purpose, passengers: b.passengers, days: b.days, ref: res.ref, t: Date.now() });
      SW.store.set("track", { phone: b.phone, ref: res.ref });
      SW.me.set({ name: b.name, phone: b.phone, email: b.email });

      $("#d-name").textContent = b.name.split(" ")[0];
      $("#d-ref").textContent = res.ref;
      $("#d-hold").textContent = "Your dates are held for " + res.holdHours + " hours while we confirm.";
      var rows = [
        ["Car", b.carName], ["Dates", D.fmt(b.start, true) + " to " + D.fmt(b.end, true) + " (" + SW.plural(b.days, "day") + ")"], ["Driver", b.driver], ["Trip", b.trip + (b.destination ? " to " + b.destination : "")],
        ["Purpose", b.purpose], ["Passengers", b.passengers], ["Pickup", b.pickup + (b.address ? ": " + b.address : "") + (b.time ? " at " + D.clock(b.time) : "")],
        ["Add-ons", b.addons.length ? b.addons.join(", ") : "None"], ["Total to pay us", SW.money(q.total)]
      ];
      if (q.deposit) rows.push(["Deposit", SW.money(q.deposit) + " - paid at pickup, refundable"]);
      if (res.demo) rows.push(["Demo", "This is a demo booking. It is kept only in this browser."]);
      $("#d-sum").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("");
      $("#d-wa").href = SW.waLink(waText(res));
      $("#d-wa").innerHTML = SW.icon("wa") + " Send details on WhatsApp";
      $("#form-sec").hidden = true;
      $("#done").hidden = false;
      var lane = $("#drive-car");
      lane.innerHTML = SW.carSvg(car.body, { color: SW.carColor(car.id), label: "" });
      lane.classList.remove("go"); void lane.offsetWidth; lane.classList.add("go");
      $("#drive-lane").onclick = function () { lane.classList.remove("go"); void lane.offsetWidth; lane.classList.add("go"); };
      $("#d-again").onclick = function () { location.href = "book.html"; };
      window.scrollTo(0, 0);
    }

    /* ---------- start: remembered details and links from other pages ---------- */
    var me = SW.me.get();
    if (me.name) $("#name").value = me.name;
    if (me.email) $("#email").value = me.email;
    if (me.phone) { phone.value = SW.fmtPhone(me.phone); if (SW.validPhone(phone.value)) checkStamps(); }

    var qTrip = SW.param("trip"), qPurpose = SW.param("purpose"), qDriver = SW.param("driver");
    if (qTrip === "Outstation") form.querySelector('input[name="trip"][value="Outstation"]').checked = true;
    if (qPurpose && SW.$$("#purpose option").some(function (o) { return o.value === qPurpose; })) $("#purpose").value = qPurpose;
    updateTripUi();
    setCar(SW.param("car"), qDriver);

    var qs = SW.param("start"), qe = SW.param("end");
    if (car && qs && qe && D.valid(qs) && D.valid(qe) && qs >= today && qe >= qs && D.days(qs, qe) <= set.maxDays && qs <= D.add(today, set.maxAhead)) {
      if (SW.firstTaken(car.id, qs, qe)) {
        cal.goTo(qs);
        cal.message(D.fmt(SW.firstTaken(car.id, qs, qe)) + " is already booked for this car. Please pick other dates.", "warn", SW.suggest(car.id, qs, qe));
      } else cal.setRange(qs, qe);
    }
    renderSummary();

    // If the visitor comes back to this tab later, ask for fresh availability again.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || finished) return;
      SW.busy(true).then(function () {
        cal.refresh();
        var r = cal.getRange();
        if (car && r.start && r.end && SW.firstTaken(car.id, r.start, r.end)) {
          cal.clear();
          cal.message("Someone booked part of those dates while you were away. Please pick again.", "warn", SW.suggest(car.id, r.start, r.end));
        }
      }, function () { /* keep what we have */ });
    });
  });
})();
