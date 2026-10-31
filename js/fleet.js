/* Our Fleet page: category tabs, search, filters, sort, favourites, compare */
(function () {
  var SW = window.SW, D = SW.d;

  SW.boot(function (data) {
    var cat = "All", compare = [], MAX_CMP = 3;
    var want = SW.param("cat");
    if (want && data.categories.indexOf(want) > -1) cat = want;

    var grid = SW.$("#grid"), tabs = SW.$("#tabs"), q = SW.$("#q");
    var fSeats = SW.$("#f-seats"), fDriver = SW.$("#f-driver"), fPrice = SW.$("#f-price"), fSort = SW.$("#f-sort"), fFav = SW.$("#f-fav");

    function renderTabs() {
      var all = [["All", data.cars.length]].concat(data.categories.map(function (c) { return [c, data.counts[c]]; }));
      tabs.innerHTML = all.map(function (t) {
        return '<button type="button" role="tab" class="tab' + (t[0] === cat ? " on" : "") + '" data-cat="' + SW.esc(t[0]) + '" aria-selected="' + (t[0] === cat) + '">' + SW.esc(t[0]) + " <small>" + t[1] + "</small></button>";
      }).join("");
      var on = SW.$(".tab.on", tabs);
      if (on && on.scrollIntoView) { // keep the chosen tab in view on phones, without moving the page
        var left = on.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2;
        tabs.scrollLeft = Math.max(0, left);
      }
    }
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest(".tab");
      if (!b) return;
      cat = b.getAttribute("data-cat");
      renderTabs(); render();
    });

    function passes(c) {
      if (cat !== "All" && c.category !== cat) return false;
      var t = q.value.trim().toLowerCase();
      if (t && (c.name + " " + c.category + " " + c.description + " " + c.transmission).toLowerCase().indexOf(t) === -1) return false;
      if (fSeats.value) { var r = fSeats.value.split("-"); if (c.seats < +r[0] || c.seats > +r[1]) return false; }
      if (fDriver.value === "self" && c.modes.indexOf("Self-drive") === -1) return false;
      if (fDriver.value === "driver" && c.modes.indexOf("Self-drive") > -1) return false;
      if (fPrice.value) {
        if (fPrice.value === "999999") { if (c.minPrice < 20000) return false; }
        else if (c.minPrice > +fPrice.value) return false;
      }
      if (fFav.checked && !SW.fav.has(c.id)) return false;
      return true;
    }

    function render() {
      var list = data.cars.filter(passes);
      var s = fSort.value;
      list.sort(function (a, b) {
        if (s === "low") return a.minPrice - b.minPrice;
        if (s === "high") return b.minPrice - a.minPrice;
        if (s === "seats") return b.seats - a.seats;
        return b.popularity - a.popularity;
      });
      SW.$("#count").textContent = list.length ? list.length + (list.length === 1 ? " vehicle" : " vehicles") + (data.busyOk ? "" : " (we could not check today's bookings, so the availability labels may be out of date)") : "";
      grid.innerHTML = list.length ? list.map(function (c) { return SW.carCard(c, { compare: true, compareOn: compare.indexOf(c.id) > -1 }); }).join("") :
        '<div class="card empty"><h3>No cars match</h3><p>Try a different category, or press Reset to clear the filters.</p></div>';
      SW.observe(grid);
    }

    [fSeats, fDriver, fPrice, fSort, fFav].forEach(function (el) { el.addEventListener("change", render); });
    var timer;
    q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(render, 160); });
    SW.$("#f-reset").addEventListener("click", function () {
      q.value = ""; fSeats.value = ""; fDriver.value = ""; fPrice.value = ""; fSort.value = "pop"; fFav.checked = false; cat = "All";
      renderTabs(); render();
    });

    SW.tilt(grid);
    SW.bindFav(grid, function () { if (fFav.checked) render(); });

    /* ---------- compare ---------- */
    grid.addEventListener("change", function (e) {
      var box = e.target.closest ? e.target.closest("[data-cmp]") : null;
      if (!box) return;
      var id = box.closest(".car-card").getAttribute("data-id"), i = compare.indexOf(id);
      if (box.checked) {
        if (compare.length >= MAX_CMP) { box.checked = false; SW.toast("You can compare up to " + MAX_CMP + " cars. Remove one first."); return; }
        if (i === -1) compare.push(id);
      } else if (i > -1) compare.splice(i, 1);
      bar();
    });
    function bar() {
      var el = SW.$("#cmp-bar");
      el.hidden = compare.length === 0;
      SW.$("#cmp-chips").innerHTML = compare.map(function (id) {
        return '<span class="chip pink">' + SW.esc(data.byId[id].name) + ' <button type="button" data-rm="' + SW.esc(id) + '" aria-label="Remove">' + SW.icon("close", "ic-s") + "</button></span>";
      }).join("") + '<span class="muted small"> ' + compare.length + " of " + MAX_CMP + "</span>";
      if (compare.length < 2) SW.$("#cmp-panel").hidden = true;
      SW.$("#cmp-go").disabled = compare.length < 2;
    }
    SW.$("#cmp-chips").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]");
      if (!b) return;
      var i = compare.indexOf(b.getAttribute("data-rm"));
      if (i > -1) compare.splice(i, 1);
      bar(); render();
    });
    SW.$("#cmp-clear").addEventListener("click", function () { compare = []; bar(); render(); SW.$("#cmp-panel").hidden = true; });
    SW.$("#cmp-go").addEventListener("click", function () {
      var cars = compare.map(function (id) { return data.byId[id]; });
      var panel = SW.$("#cmp-panel");
      var minP = Math.min.apply(null, cars.map(function (c) { return c.minPrice; })), maxS = Math.max.apply(null, cars.map(function (c) { return c.seats; }));
      function row(label, fn) { return "<tr><th scope=\"row\">" + label + "</th>" + cars.map(function (c) { return "<td>" + fn(c) + "</td>"; }).join("") + "</tr>"; }
      panel.innerHTML = '<div class="sec-head"><h2>Side by side</h2><button type="button" class="btn btn-ghost btn-sm" id="cmp-close">Close</button></div><div class="table-scroll"><table class="cmp-table">' +
        '<thead><tr><th></th>' + cars.map(function (c) { return '<th scope="col"><div class="cmp-art">' + SW.carArt(c) + "</div>" + SW.esc(c.name) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        row("Category", function (c) { return SW.esc(c.category); }) +
        row("Seats", function (c) { return '<span class="' + (c.seats === maxS ? "best" : "") + '">' + c.seats + "</span>"; }) +
        row("Gearbox", function (c) { return SW.esc(c.transmission || "-"); }) +
        row("Self-drive per day", function (c) { return c.modes.indexOf("Self-drive") > -1 ? '<span class="' + (c.minPrice === c.selfPrice && c.minPrice === minP ? "best" : "") + '">' + SW.money(c.selfPrice) + "</span>" : "Not offered"; }) +
        row("With driver per day", function (c) { return c.modes.indexOf("With driver") > -1 ? '<span class="' + (c.minPrice === c.driverPrice && c.minPrice === minP ? "best" : "") + '">' + SW.money(c.driverPrice) + "</span>" : "Not offered"; }) +
        row("Driver", function (c) { return c.driverRule === "Required" ? "Driver included (required)" : "Your choice"; }) +
        row("Self-drive deposit", function (c) { return c.modes.indexOf("Self-drive") > -1 ? SW.money(c.deposit) + " (refundable)" : "-"; }) +
        row("Availability", function (c) { var a = SW.availLabel(c); return '<span class="avail ' + a.state + '"><i></i>' + SW.esc(a.text) + "</span>"; }) +
        row("", function (c) { return '<a class="btn btn-primary btn-sm" href="book.html?car=' + encodeURIComponent(c.id) + '">Book this</a>'; }) +
        "</tbody></table></div>";
      panel.hidden = false;
      SW.$("#cmp-close").addEventListener("click", function () { panel.hidden = true; });
      panel.scrollIntoView({ behavior: SW.reduce ? "auto" : "smooth", block: "start" });
    });

    renderTabs();
    render();
    bar();

    // Refresh the availability labels when the visitor comes back to this tab.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") SW.busy().then(render, function () { /* keep what we have */ });
    });
  });
})();
