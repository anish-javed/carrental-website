/* Drawn pictures: icons, car silhouettes by body type (no brand logos), flowers, gauges. */
(function () {
  var SW = (window.SW = window.SW || {});

  /* ---------- icons (24 x 24, drawn with lines) ---------- */
  var ICONS = {
    seat: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V21M9.6 11l-6-1.5M14.4 11l6-1.5"/>',
    driver: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2.5C5 15.5 8 14 12 14s7 1.5 7 4.5V21M9 14l3 3 3-3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    heart: '<path d="M12 21C5 16 2 12 2 8.5 2 5.8 4 4 6.5 4c2 0 3.8 1 5.500 3 1.700-2 3.500-3 5.500-3C20 4 22 5.800 22 8.500 22 12 19 16 12 21z"/>',
    check: '<path d="M4 12.500l5 5L20 6.500"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.500" cy="8.500" r="1.200"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 22s7-6.500 7-12a7 7 0 0 0-14 0c0 5.500 7 12 7 12z"/><circle cx="12" cy="10" r="2.500"/>',
    phone: '<path d="M5 3h4l2 5-2.500 1.500a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    wa: '<path d="M3 21l1.600-4.800A9 9 0 1 1 8 19.600L3 21z"/><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1.200-1.500-2.200-1.200-1 .9c-1-.4-2-1.400-2.400-2.400l.9-1L10.800 7.500 9 8.500z"/>',
    star: '<path d="M12 3l2.700 5.600 6.100.8-4.500 4.200 1.100 6.100L12 16.800 6.600 19.700l1.100-6.100L3.200 9.400l6.100-.8L12 3z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    compare: '<rect x="3" y="4" width="7" height="16" rx="1.500"/><rect x="14" y="4" width="7" height="16" rx="1.500"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    road: '<path d="M8 3L4 21M16 3l4 18M12 4v3M12 11v3M12 18v3"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1.500"/><path d="M12 9v12M3 13h18M12 9C9 9 7 7 8 5.500S12 5 12 9c0-4 3-4 4-3.500S15 9 12 9z"/>',
    bag: '<rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.500-4M4 4v4h4M4 13a8 8 0 0 0 14.500 4M20 20v-4h-4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
  };
  SW.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------- car silhouettes ---------- */
  // Front of the car is on the right. d = body outline, glass = windows, wheels = x of each wheel, wy = wheel height.
  var SHAPES = {
    hatch: { x0: 20, x1: 222, wy: 76, wheels: [58, 180],
      d: "M20 76 L20 50 Q20 41 30 39 L52 32 L112 29 Q134 29 146 40 L170 54 L210 59 Q222 61 222 70 L222 76 Z",
      glass: ["M58 37 L94 35 L94 51 L52 51 Z", "M100 35 L112 34 Q128 34 138 44 L150 51 L100 51 Z"] },
    sedan: { x0: 14, x1: 228, wy: 76, wheels: [56, 184],
      d: "M14 76 L14 58 Q14 52 24 50 L60 47 Q74 30 100 28 L138 28 Q160 30 174 48 L214 54 Q228 57 228 68 L228 76 Z",
      glass: ["M80 46 Q88 34 102 33 L118 33 L118 47 Z", "M124 33 L137 33 Q151 35 161 47 L124 47 Z"] },
    suv: { x0: 16, x1: 228, wy: 76, wheels: [56, 186],
      d: "M16 76 L16 44 Q16 36 26 34 L56 30 L148 30 Q158 30 166 38 L188 54 L214 58 Q228 60 228 69 L228 76 Z",
      glass: ["M28 39 L52 36 L52 51 L24 51 Z", "M58 36 L96 35 L96 51 L58 51 Z", "M102 35 L146 35 Q154 35 160 42 L172 51 L102 51 Z"] },
    pickup: { x0: 16, x1: 228, wy: 76, wheels: [56, 186],
      d: "M16 76 L16 54 L20 52 L92 52 L92 36 Q92 32 98 32 L134 32 Q148 32 158 42 L180 55 L214 58 Q228 60 228 69 L228 76 Z",
      glass: ["M100 38 L132 37 Q142 38 150 46 L158 52 L100 52 Z"] },
    van: { x0: 14, x1: 228, wy: 76, wheels: [54, 188],
      d: "M14 76 L14 36 Q14 28 24 28 L148 28 Q158 28 166 36 L190 56 L216 59 Q228 61 228 69 L228 76 Z",
      glass: ["M22 34 L56 34 L56 50 L22 50 Z", "M62 34 L96 34 L96 50 L62 50 Z", "M102 34 L136 34 L136 50 L102 50 Z", "M142 34 L150 34 Q155 34 160 40 L174 52 L142 52 Z"] },
    minibus: { x0: 8, x1: 234, wy: 76, wheels: [50, 198],
      d: "M8 76 L8 24 Q8 14 20 14 L172 14 Q184 14 190 24 L206 50 L224 55 Q234 57 234 68 L234 76 Z",
      glass: ["M16 22 L40 22 L40 44 L16 44 Z", "M46 22 L70 22 L70 44 L46 44 Z", "M76 22 L100 22 L100 44 L76 44 Z", "M106 22 L130 22 L130 44 L106 44 Z", "M136 22 L160 22 L160 44 L136 44 Z", "M166 22 L174 22 Q179 22 183 29 L196 46 L166 46 Z"] },
    landcruiser: { x0: 14, x1: 228, wy: 76, wheels: [58, 184],
      d: "M14 76 L14 40 Q14 33 22 32 L44 30 L146 30 Q154 30 160 37 L176 49 L214 52 Q226 54 227 62 L228 76 Z",
      glass: ["M26 37 L54 36 L54 51 L22 51 Z", "M60 36 L98 36 L98 51 L60 51 Z", "M104 36 L145 36 Q151 36 155 41 L168 51 L104 51 Z"],
      extra: '<path d="M40 27.500 H148" stroke="#9aa3ad" stroke-width="2.500" stroke-linecap="round"/><path d="M221 56 L226 58 L227 68 L221 68 Z" fill="#0b1f33" opacity=".7"/><path d="M76 66 H166" stroke="#0b1f33" stroke-opacity=".25" stroke-width="2"/>' },
    fortuner: { x0: 16, x1: 228, wy: 76, wheels: [58, 184],
      d: "M16 76 L16 50 Q16 44 24 41 L58 31 L140 31 Q150 31 156 38 L178 52 L214 56 Q228 58 228 68 L228 76 Z",
      glass: ["M28 43 L56 35 L56 51 L22 51 Z", "M62 34 L98 34 L98 51 L62 51 Z", "M104 34 L138 34 Q146 34 151 40 L166 51 L104 51 Z"],
      extra: '<path d="M62 28.500 H138" stroke="#9aa3ad" stroke-width="2.200" stroke-linecap="round"/><path d="M222 58 L227 60 L228 69 L222 69 Z" fill="#0b1f33" opacity=".7"/>' },
    coaster: { x0: 8, x1: 234, wy: 76, wheels: [52, 196],
      d: "M8 76 L8 22 Q8 12 18 12 L200 12 Q208 12 212 20 L226 50 Q234 52 234 66 L234 76 Z",
      glass: ["M16 22 L40 22 L40 46 L16 46 Z", "M46 22 L70 22 L70 46 L46 46 Z", "M76 22 L100 22 L100 46 L76 46 Z", "M106 22 L130 22 L130 46 L106 46 Z", "M136 22 L160 22 L160 46 L136 46 Z", "M166 22 L190 22 L190 46 L166 46 Z", "M196 20 L203 20 Q206 20 208 25 L218 46 L196 46 Z"],
      extra: '<path d="M8 55 H230" stroke="#0e6b6f" stroke-width="3"/><path d="M228 56 L233 58 L234 68 L228 68 Z" fill="#0b1f33" opacity=".7"/>' },
    coach: { x0: 4, x1: 238, wy: 78, wheels: [44, 84, 198],
      d: "M4 78 L4 22 Q4 10 16 10 L188 10 Q200 10 206 20 L222 48 L232 54 Q238 56 238 68 L238 78 Z",
      glass: ["M12 18 L32 18 L32 38 L12 38 Z", "M38 18 L58 18 L58 38 L38 38 Z", "M64 18 L84 18 L84 38 L64 38 Z", "M90 18 L110 18 L110 38 L90 38 Z", "M116 18 L136 18 L136 38 L116 38 Z", "M142 18 L162 18 L162 38 L142 38 Z", "M168 18 L188 18 L188 38 L168 38 Z", "M194 18 L198 18 Q203 18 206 24 L214 42 L194 42 Z"] }
  };

  // Which drawing to use for a car: from its category, number of seats and name. (No data column needed.)
  SW.bodyOf = function (car) {
    var n = String(car.name || "").toLowerCase(), cat = String(car.category || ""), seats = Number(car.seats) || 4;
    if (/hilux|revo|pickup|dala|vigo/.test(n)) return "pickup";
    if (cat === "Hatchbacks") return "hatch";
    if (cat === "Sedans") return "sedan";
    if (cat === "SUVs & 4x4") return "suv";
    if (cat === "Vans & Family") return seats >= 8 ? "van" : "suv";
    if (cat === "Luxury & Wedding") return /e-class|mercedes|sedan|limo|bentley|rolls/.test(n) ? "sedan" : "suv";
    if (cat === "Commercial & Buses") return seats <= 15 ? "van" : seats <= 30 ? "minibus" : "coach";
    return seats >= 30 ? "coach" : seats >= 12 ? "minibus" : seats >= 8 ? "van" : "sedan";
  };

  var COLORS = ["#0e6b6f", "#e8318a", "#f6a91b", "#1b3a5c", "#1a9a8f", "#c4246f"];
  SW.carColor = function (id) {
    var h = 0, s = String(id || "x");
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  };

  SW.carSvg = function (body, o) {
    o = o || {};
    var s = SHAPES[body] || SHAPES.sedan, col = o.color || "#0e6b6f", acc = o.accent || "#f6a91b", glass = o.glass || "#dff3f1", wy = s.wy;
    var h = '<svg class="car-svg" viewBox="0 0 240 100" role="img" aria-label="' + SW.esc(o.label || "Car") + '" xmlns="http://www.w3.org/2000/svg">';
    h += '<ellipse cx="120" cy="93" rx="106" ry="4" fill="#0b1f33" opacity=".14"/>';
    h += '<path d="' + s.d + '" fill="' + col + '" stroke="#0b1f33" stroke-opacity=".35" stroke-width="1.500" stroke-linejoin="round"/>';
    s.glass.forEach(function (g) { h += '<path d="' + g + '" fill="' + glass + '" opacity=".93" stroke="#0b1f33" stroke-opacity=".25" stroke-width="1" stroke-linejoin="round"/>'; });
    if (s.extra) h += s.extra;
    h += '<path d="M' + (s.x0 + 8) + " " + (wy - 7) + " H" + (s.x1 - 10) + '" stroke="' + acc + '" stroke-width="2.600" stroke-dasharray="1 6" stroke-linecap="round"/>';
    h += '<rect x="' + (s.x1 - 9) + '" y="' + (wy - 17) + '" width="7" height="5" rx="2" fill="#ffe89a" class="hl"/>';
    h += '<rect x="' + (s.x0 + 1) + '" y="' + (wy - 21) + '" width="4" height="8" rx="2" fill="#e8318a"/>';
    s.wheels.forEach(function (x) {
      h += '<circle cx="' + x + '" cy="' + wy + '" r="16.500" fill="#0b1f33"/>';
      h += '<g class="wheel"><circle cx="' + x + '" cy="' + wy + '" r="13" fill="#1c2a38"/><circle cx="' + x + '" cy="' + wy + '" r="6.500" fill="#efe4cf"/>';
      h += '<path d="M' + x + " " + (wy - 6) + " V" + (wy + 6) + " M" + (x - 6) + " " + wy + " H" + (x + 6) + '" stroke="#1c2a38" stroke-width="1.600"/></g>';
    });
    return h + "</svg>";
  };

  /* ---------- flower motif and speedometer ---------- */
  SW.flower = function (c1, c2, size) {
    var p = "";
    for (var i = 0; i < 8; i++) p += '<ellipse cx="0" cy="-7" rx="3.200" ry="6.500" transform="rotate(' + i * 45 + ')"/>';
    return '<svg class="flower" width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="-14 -14 28 28" aria-hidden="true"><g fill="' + (c1 || "#e8318a") + '">' + p + '</g><circle r="4.200" fill="' + (c2 || "#f6a91b") + '"/></svg>';
  };

  // A half-circle gauge. fill = 0..1 is how far the needle swings when it scrolls into view.
  SW.gaugeSvg = function (fill) {
    return '<svg class="gauge-svg" viewBox="0 0 120 70" aria-hidden="true" data-fill="' + (fill == null ? 0.8 : fill) + '">' +
      '<path class="g-track" d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke-width="9" stroke-linecap="round"/>' +
      '<path class="g-arc" d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="157.100" stroke-dashoffset="157.100"/>' +
      '<line class="g-needle" x1="60" y1="62" x2="60" y2="24" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="62" r="5"/></svg>';
  };

  // Picture of a car: the drawing is always there; the photo (if there is one) fades in over it once it has loaded.
  // If the photo fails, it is removed and the drawing stays.
  SW.carArt = function (car) {
    var svg = SW.carSvg(SW.bodyOf(car), { color: SW.carColor(car.id), label: car.name });
    var img = "";
    if (car.photo && /^https?:\/\//i.test(car.photo)) {
      img = '<img class="car-photo" src="' + SW.esc(car.photo) + '" alt="' + SW.esc(car.name) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
    }
    return '<span class="car-pic">' + svg + img + "</span>";
  };
  // load and error do not bubble, so listen in the capture phase.
  document.addEventListener("load", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.classList.contains("car-photo")) t.classList.add("loaded");
  }, true);
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.classList.contains("car-photo") && t.parentNode) t.parentNode.removeChild(t);
  }, true);
})();
