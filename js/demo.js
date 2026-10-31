/*
  DEMO MODE. Used only while SCRIPT_URL in config.js is empty.
  It gives the website the same sample fleet as the Google Sheet, and keeps demo bookings in this browser only,
  so you can try the calendar, the price, the thank-you page and tracking before you set up the sheet.
*/
(function () {
  var SW = (window.SW = window.SW || {});

  // id | name | category | seats | transmission | self-drive/day | with-driver/day | driver rule | units | deposit | popularity | description
  var CARS = [
    "alto|Suzuki Alto 660cc|Hatchbacks|4|Manual|3000|4000|Optional|2|20000|75|Small, light on fuel and easy to park in the old city.",
    "wagonr|Suzuki Wagon R|Hatchbacks|4|Manual|3500|4500|Optional|2|25000|55|Tall seats, good boot space and very easy to drive.",
    "cultus|Suzuki Cultus|Hatchbacks|4|Manual|4000|5000|Optional|2|30000|60|A comfortable all-round city car with cold AC.",
    "vitz|Toyota Vitz|Hatchbacks|4|Automatic|4500|5500|Optional|1|35000|50|Small automatic that is smooth in Lahore traffic.",
    "yaris|Toyota Yaris|Sedans|5|Automatic|5500|6500|Optional|2|40000|66|Modern sedan with a quiet cabin and good mileage.",
    "city|Honda City|Sedans|5|Automatic|6000|7000|Optional|2|45000|90|Roomy back seat, smooth ride. Great for airport trips.",
    "altis|Toyota Corolla Altis|Sedans|5|Automatic|6500|7500|Optional|2|50000|95|Our favourite for business trips and family visits.",
    "civic|Honda Civic|Sedans|5|Automatic|0|9500|Required|1|0|76|Sporty and stylish. Rented with a professional driver only.",
    "grande|Toyota Corolla Altis Grande|Sedans|5|Automatic|0|10000|Required|1|0|70|Top model with leather seats. Driver included.",
    "sportage|Kia Sportage|SUVs & 4x4|5|Automatic|0|11000|Required|1|0|78|Stylish SUV with a high seat and a big boot.",
    "revo|Toyota Hilux Revo|SUVs & 4x4|5|Automatic|0|13500|Required|2|0|72|Strong 4x4 double cabin for the motorway, the north and rough roads.",
    "fortuner|Toyota Fortuner|SUVs & 4x4|7|Automatic|0|16000|Required|2|0|88|Seven seats and plenty of power for long family tours.",
    "karvaan|Changan Karvaan|Vans & Family|8|Manual|0|8000|Required|1|0|62|Value van for families and small groups.",
    "brv|Honda BRV|Vans & Family|7|Automatic|0|9000|Required|1|0|58|Seven-seater with an easy automatic drive.",
    "starex|Hyundai Grand Starex|Vans & Family|11|Automatic|0|11000|Required|1|0|64|Comfortable 11-seater for weddings and group trips.",
    "prado|Toyota Prado|Luxury & Wedding|7|Automatic|0|24000|Required|1|0|82|Premium SUV for weddings, VIP guests and long journeys.",
    "eclass|Mercedes E-Class|Luxury & Wedding|4|Automatic|0|32000|Required|1|0|68|A classic wedding car with a professional driver.",
    "v8|Toyota Land Cruiser V8|Luxury & Wedding|7|Automatic|0|35000|Required|1|0|74|The top choice for grand arrivals and VIP travel.",
    "hiace|Toyota Hiace Grand Cabin|Commercial & Buses|14|Manual|0|13500|Required|3|0|85|14 seats with high roof. Popular for tours and events.",
    "coaster22|Toyota Coaster 22 Seater|Commercial & Buses|22|Manual|0|24000|Required|2|0|80|Mid-size bus for baraats, trips and company outings.",
    "coaster29|Toyota Coaster 29 Seater|Commercial & Buses|29|Manual|0|28000|Required|1|0|52|Extra seats for bigger groups.",
    "minibus35|Mini Bus 35 Seater|Commercial & Buses|35|Manual|0|32000|Required|1|0|48|Big group transport with AC and reclining seats.",
    "coach49|Luxury Coach 49 Seater|Commercial & Buses|49|Manual|0|45000|Required|1|0|45|Full-size coach for long trips and large events."
  ];
  var ADDONS = [
    { name: "Wedding flower decoration", price: 8000, charged: "One time", appliesTo: ["Luxury & Wedding", "Sedans", "SUVs & 4x4"] },
    { name: "Child seat", price: 300, charged: "Per day", appliesTo: ["Hatchbacks", "Sedans", "SUVs & 4x4", "Vans & Family"] },
    { name: "Driver night halt", price: 2000, charged: "Per night", appliesTo: ["All", "With driver", "Outstation"] },
    { name: "Microphone and sound system", price: 3000, charged: "One time", appliesTo: ["Commercial & Buses"] }
  ];
  var SETTINGS = {
    "Company Name": "Safar Wheels", "Phone": "0300 0000000", "WhatsApp Number": "923000000000",
    "Address": "Demo Plaza, Main Boulevard, Lahore", "Opening Hours": "Every day: 8 am - 10 pm",
    "Online Booking Discount %": 5, "Long Rental Discount 3-6 Days %": 5, "Long Rental Discount 7+ Days %": 10,
    "Stamp Card Size": 5, "Stamp Reward Discount %": 10, "Max Total Discount %": 20, "Outstation Extra %": 15,
    "Delivery Fee": 1000, "Hold Hours for Pending": 24, "Max Rental Days": 30, "Max Days Ahead": 180, "Accepting Bookings": "Yes", "Stat Trips": 2500, "Stat Happy Customers %": 98, "Stat Years": 12,
    "Rental Term 1": "Documents at pickup: please bring your original CNIC. For a self-drive rental, also bring your original driving licence. We only look at them.",
    "Rental Term 2": "Fuel and motorway tolls are not included in the price.",
    "Rental Term 3": "Kilometre limit: 250 km per day. After that, extra kilometres are charged at Rs 40 per km.",
    "Rental Term 4": "With a driver, one rental day means 12 hours. Extra hours are agreed with the owner.",
    "Rental Term 5": "Days are counted from the pickup date to the return date, and both days count.",
    "Rental Term 6": "The self-drive deposit is paid at pickup and is refunded when the car comes back in good condition.",
    "Rental Term 7": "You pay nothing online. We confirm your booking by phone or WhatsApp, and you pay us directly."
  };

  function cars() {
    return CARS.map(function (l) {
      var f = l.split("|");
      return { id: f[0], name: f[1], category: f[2], seats: +f[3], transmission: f[4], selfPrice: +f[5], driverPrice: +f[6], driverRule: f[7], units: +f[8], deposit: +f[9], popularity: +f[10], description: f[11], photo: "" };
    });
  }

  /* ---------- demo bookings kept in this browser ---------- */
  function mine() { return SW.store.get("demo_bk", []); }
  function status(b) { // Pending, then Confirmed, then Completed, so you can watch tracking change
    if (b.status) return b.status;
    var age = Date.now() - b.created;
    return age < 45000 ? "Pending" : age < 150000 ? "Confirmed" : "Completed";
  }
  function blocks() {
    var t = SW.d.today();
    return [
      { car: "vitz", s: SW.d.add(t, 7), e: SW.d.add(t, 9), status: "Blocked" },
      { car: "civic", s: SW.d.add(t, 8), e: SW.d.add(t, 10), status: "Blocked" },
      { car: "prado", s: SW.d.add(t, 10), e: SW.d.add(t, 12), status: "Blocked" }
    ];
  }
  function counting() {
    var hold = (SW.data ? SW.data.settings.holdHours : 24) * 3600000;
    var list = blocks();
    mine().forEach(function (b) {
      var st = status(b);
      if (st === "Confirmed" || (st === "Pending" && Date.now() - b.created < hold)) list.push({ car: b.car, s: b.start, e: b.end, status: st });
    });
    return list;
  }
  function dayCounts(carId) {
    var m = {};
    counting().forEach(function (b) {
      if (b.car !== carId) return;
      for (var d = b.s; d <= b.e; d = SW.d.add(d, 1)) m[d] = (m[d] || 0) + 1;
    });
    return m;
  }
  function busyMap() {
    var out = {}, today = SW.d.today();
    cars().forEach(function (c) {
      var m = dayCounts(c.id), days = Object.keys(m).filter(function (d) { return m[d] >= c.units && d >= today; }).sort(), r = [];
      days.forEach(function (d) {
        var last = r[r.length - 1];
        if (last && SW.d.add(last[1], 1) === d) last[1] = d; else r.push([d, d]);
      });
      if (r.length) out[c.id] = r;
    });
    return out;
  }
  function stampInfo(phone) {
    var key = SW.phoneDigits(phone), size = SW.data ? SW.data.settings.stampSize : 5, done = 0, used = 0;
    mine().forEach(function (b) {
      if (SW.phoneDigits(b.phone) !== key) return;
      var st = status(b);
      if (st === "Completed") done++;
      if (b.stamp && st !== "Cancelled") used++;
    });
    return { completed: done, size: size, earned: Math.floor(done / size), used: used };
  }

  function later(v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms || 500); }); }

  SW.demo = {
    raw: function () { return { ok: true, cars: cars(), addons: ADDONS, settings: SETTINGS, busy: busyMap() }; },
    busy: function () { return later({ ok: true, busy: busyMap() }, 150); },
    stamps: function (phone) { var s = stampInfo(phone); return later({ ok: true, stamps: s, reward: s.earned > s.used }, 200); },

    book: function (p) {
      var D = SW.d, data = SW.data, set = data.settings, car = data.byId[String(p.car)];
      if (!car) return later({ ok: false, error: "Sorry, that car is no longer available." });
      var days = D.days(p.start, p.end);
      var m = dayCounts(car.id);
      for (var d = p.start; d <= p.end; d = D.add(d, 1)) {
        if ((m[d] || 0) >= car.units) return later({ ok: false, conflict: true, error: "Sorry, someone just booked " + D.fmt(d) + " for this car. Please pick other dates." });
      }
      var addons = (p.addons || []).map(function (n) { return data.addons.filter(function (a) { return a.name === n; })[0]; }).filter(Boolean);
      var st = stampInfo(p.phone), reward = st.earned > st.used;
      var q = SW.price({ car: car, driver: p.driver, trip: p.trip, days: days, addons: addons, pickup: p.pickup, reward: reward, s: set });
      var n = SW.store.get("demo_no", 1000) + 1;
      SW.store.set("demo_no", n);
      var ref = "SW-" + n, list = mine();
      list.push({ ref: ref, car: car.id, carName: car.name, start: p.start, end: p.end, phone: p.phone, created: Date.now(), stamp: reward && q.parts.some(function (x) { return x.label === "Stamp card reward"; }) });
      SW.store.set("demo_bk", list);
      return later({
        ok: true, demo: true, ref: ref, holdHours: set.holdHours, quote: q,
        booking: { carId: car.id, carName: car.name, start: p.start, end: p.end, days: days, driver: p.driver, trip: p.trip, purpose: p.purpose, passengers: p.passengers, pickup: p.pickup, address: p.address || "", time: p.time || "", destination: p.destination || "", addons: addons.map(function (a) { return a.name; }), name: p.name, phone: p.phone, email: p.email || "", notes: p.notes || "" }
      }, 900);
    },

    track: function (phone, ref) {
      var key = SW.phoneDigits(phone), want = String(ref || "").trim().toUpperCase();
      var cutoff = Date.now() - 90 * 86400000;
      var rows = mine().filter(function (b) { return SW.phoneDigits(b.phone) === key && b.created >= cutoff && (!want || b.ref.toUpperCase() === want); });
      if (!rows.length) return later({ ok: false, error: want ? "We could not find a booking with these details. Please check the phone number and booking reference." : "We could not find any bookings for this phone number in the last 90 days. Please check the number, or type your booking reference too." });
      var list = rows.slice().reverse().map(function (b) {
        return { ref: b.ref, carId: b.car, car: b.carName, start: b.start, end: b.end, status: status(b), created: b.created, expired: false };
      });
      return later({ ok: true, mode: want ? "one" : "list", bookings: list, stamps: stampInfo(phone), demo: true }, 400);
    }
  };
})();
