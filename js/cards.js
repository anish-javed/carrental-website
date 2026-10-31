/* Car cards shared by Home, Our Fleet and Find My Car. */
(function () {
  var SW = (window.SW = window.SW || {});

  SW.specList = function (car) {
    var drv = car.driverRule === "Required" ? "Driver included" : car.modes.length > 1 ? "Self-drive or driver" : car.modes[0];
    return '<li>' + SW.icon("seat") + car.seats + " seats</li><li>" + SW.icon("gear") + SW.esc(car.transmission || "-") + "</li><li>" + SW.icon("wheel") + drv + "</li>";
  };

  SW.priceBlock = function (car) {
    var h = '<div class="prices">';
    if (car.modes.indexOf("Self-drive") > -1) h += "<div><small>Self-drive</small><b>" + SW.money(car.selfPrice) + "</b><span>/day</span></div>";
    if (car.modes.indexOf("With driver") > -1) h += "<div><small>With driver</small><b>" + SW.money(car.driverPrice) + "</b><span>/day</span></div>";
    return h + "</div>";
  };

  /*
    o.query   extra text for the Book link, like "&start=2026-11-05&end=2026-11-07"
    o.avail   false hides the "Available today" label
    o.compare true adds a Compare tick box
    o.reason  a short line shown on the card (used by the quiz)
    o.rank    a number badge (used by the quiz)
  */
  SW.carCard = function (car, o) {
    o = o || {};
    var av = o.avail === false ? null : SW.availLabel(car), fav = SW.fav.has(car.id);
    var h = '<article class="car-card reveal" data-id="' + SW.esc(car.id) + '" data-tilt="1">';
    h += '<div class="car-art" style="--c:' + SW.carColor(car.id) + '"><a class="art-link" href="book.html?car=' + encodeURIComponent(car.id) + (o.query || "") + '" tabindex="-1" aria-hidden="true">' + SW.carArt(car) + "</a>";
    if (o.rank) h += '<span class="rank">' + o.rank + "</span>";
    if (av) h += '<span class="avail ' + av.state + '"><i></i>' + SW.esc(av.text) + "</span>";
    h += '<button type="button" class="fav' + (fav ? " on" : "") + '" data-fav="1" aria-pressed="' + fav + '" aria-label="Save ' + SW.esc(car.name) + ' to favourites">' + SW.icon("heart") + "</button></div>";
    h += '<div class="car-body"><span class="chip">' + SW.esc(car.category) + "</span><h3>" + SW.esc(car.name) + "</h3>";
    h += '<ul class="specs">' + SW.specList(car) + "</ul>";
    if (o.reason) h += '<p class="reason">' + SW.icon("check", "ic-s") + " " + SW.esc(o.reason) + "</p>";
    else if (car.description) h += '<p class="desc">' + SW.esc(car.description) + "</p>";
    h += SW.priceBlock(car);
    if (car.driverRule === "Required") h += '<p class="note-small">This vehicle is rented with a professional driver only.</p>';
    h += '<div class="card-actions"><a class="btn btn-primary" href="book.html?car=' + encodeURIComponent(car.id) + (o.query || "") + '">Book this ' + SW.icon("arrow", "ic-s") + "</a>";
    if (o.compare) h += '<label class="cmp"><input type="checkbox" data-cmp="1"' + (o.compareOn ? " checked" : "") + "><span>Compare</span></label>";
    return h + "</div></div></article>";
  };

  // Heart buttons: saved in this browser. onChange is called after a click.
  SW.bindFav = function (container, onChange) {
    container.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-fav]") : null;
      if (!b) return;
      var id = b.closest(".car-card").getAttribute("data-id"), on = SW.fav.toggle(id);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      SW.toast(on ? "Saved to your favourites" : "Removed from favourites", 1600);
      if (onChange) onChange(id, on);
    });
  };
})();
