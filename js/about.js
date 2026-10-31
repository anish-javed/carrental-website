/* About & Contact page */
(function () {
  var SW = window.SW, $ = SW.$, esc = SW.esc;

  SW.boot(function (data) {
    var s = data.settings;

    $("#contact").innerHTML =
      "<li>" + SW.icon("phone") + "<div><b>Phone</b><a href=\"tel:" + esc(s.phone.replace(/[^\d+]/g, "")) + "\">" + esc(s.phone) + "</a></div></li>" +
      "<li>" + SW.icon("wa") + "<div><b>WhatsApp</b><span>+" + esc(s.whatsapp) + "</span></div></li>" +
      "<li>" + SW.icon("pin") + "<div><b>Our office</b><span>" + esc(s.address) + "</span></div></li>" +
      "<li>" + SW.icon("clock") + "<div><b>Opening hours</b><span>" + s.hours.map(esc).join("<br>") + "</span></div></li>";
    $("#c-wa").href = SW.waLink("Salaam! I have a question about renting a car.");
    $("#c-wa").innerHTML = SW.icon("wa") + " Message us on WhatsApp";
    $("#c-call").href = "tel:" + s.phone.replace(/[^\d+]/g, "");
    $("#c-call").innerHTML = SW.icon("phone") + " Call us";

    var faq = [
      ["How do I book a car?", "Open Book a Car, choose your car and your dates on the calendar, fill in your details and press Send my booking. Then tap the WhatsApp button so we have your details right away."],
      ["Do I pay anything online?", "No. You pay nothing on the website. We call or WhatsApp you to confirm, and you pay us directly."],
      ["How long are my dates held?", "Your dates are held for " + s.holdHours + " hours while we confirm. If we cannot reach you in that time, the dates are released for other customers."],
      ["How are the rental days counted?", "From the pickup date to the return date, and both days count. For example, 5 Nov to 7 Nov is 3 days."],
      ["Self-drive or with driver?", "Many small cars and sedans can be self-drive or with a driver. Bigger cars, luxury cars, vans and buses are rented with a professional driver only. The booking page shows which options each car has."],
      ["What do I need to bring for pickup?", "Your original CNIC. For a self-drive rental, also your original driving licence. We only look at them and never ask for the numbers online."],
      ["What is the self-drive deposit?", "A refundable amount paid at pickup. You get it back when the car returns in good condition. It is not part of the rental price."],
      ["Are fuel and tolls included?", "No. Fuel and motorway tolls are not included in the price."],
      ["What does outstation mean?", "A trip to another city. With a driver, outstation trips add " + s.outPct + "% to the daily price. Driver night halt can be added for nights away."],
      ["Can you deliver the car to me?", "Yes. Choose Deliver to me when you book. The delivery fee is " + SW.money(s.deliveryFee) + "."],
      ["What is the stamp card?", "Every completed rental gives you a stamp. After " + s.stampSize + " stamps your next booking gets " + s.stampPct + "% extra off. You can see your card on the Track Booking page."],
      ["How do I change or cancel a booking?", "Call or WhatsApp us with your booking reference. You can use Track Booking to check the latest status at any time."]
    ];
    $("#faq").innerHTML = faq.map(function (f, i) {
      return '<details class="reveal"' + (i === 0 ? " open" : "") + "><summary>" + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>";
    }).join("");

    var terms = s.terms.length ? s.terms : [
      "Please bring your original CNIC to pickup. For self-drive, also bring your original driving licence.",
      "Fuel and motorway tolls are not included.",
      "Kilometre limit: 250 km per day. Extra kilometres are charged per km.",
      "With a driver, one rental day means 12 hours."
    ];
    $("#terms").innerHTML = terms.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  });
})();
