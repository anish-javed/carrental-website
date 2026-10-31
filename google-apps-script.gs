/**
 * Safar Wheels - Google Apps Script (the "brain" between the website and the Google Sheet)
 *
 * HOW TO USE (details are in SETUP-GOOGLE-SHEET.md):
 *   1. In your Google Sheet: Extensions > Apps Script. Paste this whole file.
 *   2. Run the function  setup  once. It builds all the tabs and fills sample cars.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *   4. Copy the web app link into js/config.js on the website.
 *
 * WHAT IT DOES
 *   doGet  : sends cars, add-ons, settings and BUSY DATES to the website (JSON). Never any customer details.
 *            Also answers "track booking" questions (ref, car, dates and status only) and stamp card counts.
 *   doPost : receives a booking, RECALCULATES every price and checks the dates from the sheet
 *            (it never trusts prices, dates or availability sent by the browser), checks again
 *            inside a lock so two people can never take the same car, saves a "Pending" row,
 *            emails the owner and sends back the booking reference and the real totals.
 *
 * NEVER MOVE OR RENAME COLUMNS. The code reads them by position (Bookings) or by heading (Cars, Add-ons).
 */

var TZ = 'Asia/Karachi'; // Pakistan time, used only for DISPLAY. Booking times are stored as UTC milliseconds.

var TAB = { CARS: 'Cars', BOOKINGS: 'Bookings', ADDONS: 'Add-ons', SETTINGS: 'Settings' };

var CATEGORIES = ['Hatchbacks', 'Sedans', 'SUVs & 4x4', 'Vans & Family', 'Luxury & Wedding', 'Commercial & Buses'];
var STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Blocked'];
var PURPOSES = ['Wedding', 'Tour/Trip', 'Airport', 'Business', 'Family visit', 'Other'];
var TRIPS = ['Within Lahore', 'Outstation'];
var PICKUPS = ['Our office', 'Deliver to me'];

var CAR_HEADERS = ['Car ID', 'Name', 'Category', 'Seats', 'Transmission', 'Self-drive Rs/day', 'With-driver Rs/day', 'Driver Rule', 'Units', 'Deposit Rs', 'Description', 'Photo URL', 'Active', 'Popularity'];
var ADDON_HEADERS = ['Name', 'Price', 'Charged', 'Applies To', 'Active'];
var SETTING_HEADERS = ['Setting', 'Value', 'What it does'];
var BOOKING_HEADERS = ['Booking Ref', 'Status', 'Created (Pakistan time)', 'Created (UTC ms)', 'Customer Name', 'Phone', 'Email', 'Car ID', 'Car Name', 'Driver', 'Start Date', 'End Date', 'Days', 'Trip Type', 'Purpose', 'Passengers', 'Pickup', 'Pickup Area/Address', 'Pickup Time', 'Destination', 'Add-ons', 'Subtotal', 'Discounts', 'Total', 'Notes', 'Discount Details'];
// Column positions in the Bookings tab (0 = first column). Please do not move these columns.
var BC = { REF: 0, STATUS: 1, TIME: 2, MS: 3, NAME: 4, PHONE: 5, EMAIL: 6, CAR: 7, CARNAME: 8, DRIVER: 9, START: 10, END: 11, DAYS: 12, TRIP: 13, PURPOSE: 14, PAX: 15, PICKUP: 16, ADDRESS: 17, PTIME: 18, DEST: 19, ADDONS: 20, SUB: 21, DISC: 22, TOTAL: 23, NOTES: 24, DETAILS: 25 };

// id | name | category | seats | transmission | self-drive/day | with-driver/day | driver rule | units | deposit | popularity | description
var CAR_DATA = [
  'alto|Suzuki Alto 660cc|Hatchbacks|4|Manual|3000|4000|Optional|2|20000|75|Small, light on fuel and easy to park in the old city.',
  'wagonr|Suzuki Wagon R|Hatchbacks|4|Manual|3500|4500|Optional|2|25000|55|Tall seats, good boot space and very easy to drive.',
  'cultus|Suzuki Cultus|Hatchbacks|4|Manual|4000|5000|Optional|2|30000|60|A comfortable all-round city car with cold AC.',
  'vitz|Toyota Vitz|Hatchbacks|4|Automatic|4500|5500|Optional|1|35000|50|Small automatic that is smooth in Lahore traffic.',
  'yaris|Toyota Yaris|Sedans|5|Automatic|5500|6500|Optional|2|40000|66|Modern sedan with a quiet cabin and good mileage.',
  'city|Honda City|Sedans|5|Automatic|6000|7000|Optional|2|45000|90|Roomy back seat, smooth ride. Great for airport trips.',
  'altis|Toyota Corolla Altis|Sedans|5|Automatic|6500|7500|Optional|2|50000|95|Our favourite for business trips and family visits.',
  'civic|Honda Civic|Sedans|5|Automatic|0|9500|Required|1|0|76|Sporty and stylish. Rented with a professional driver only.',
  'grande|Toyota Corolla Altis Grande|Sedans|5|Automatic|0|10000|Required|1|0|70|Top model with leather seats. Driver included.',
  'sportage|Kia Sportage|SUVs & 4x4|5|Automatic|0|11000|Required|1|0|78|Stylish SUV with a high seat and a big boot.',
  'revo|Toyota Hilux Revo|SUVs & 4x4|5|Automatic|0|13500|Required|2|0|72|Strong 4x4 double cabin for the motorway, the north and rough roads.',
  'fortuner|Toyota Fortuner|SUVs & 4x4|7|Automatic|0|16000|Required|2|0|88|Seven seats and plenty of power for long family tours.',
  'karvaan|Changan Karvaan|Vans & Family|8|Manual|0|8000|Required|1|0|62|Value van for families and small groups.',
  'brv|Honda BRV|Vans & Family|7|Automatic|0|9000|Required|1|0|58|Seven-seater with an easy automatic drive.',
  'starex|Hyundai Grand Starex|Vans & Family|11|Automatic|0|11000|Required|1|0|64|Comfortable 11-seater for weddings and group trips.',
  'prado|Toyota Prado|Luxury & Wedding|7|Automatic|0|24000|Required|1|0|82|Premium SUV for weddings, VIP guests and long journeys.',
  'eclass|Mercedes E-Class|Luxury & Wedding|4|Automatic|0|32000|Required|1|0|68|A classic wedding car with a professional driver.',
  'v8|Toyota Land Cruiser V8|Luxury & Wedding|7|Automatic|0|35000|Required|1|0|74|The top choice for grand arrivals and VIP travel.',
  'hiace|Toyota Hiace Grand Cabin|Commercial & Buses|14|Manual|0|13500|Required|3|0|85|14 seats with high roof. Popular for tours and events.',
  'coaster22|Toyota Coaster 22 Seater|Commercial & Buses|22|Manual|0|24000|Required|2|0|80|Mid-size bus for baraats, trips and company outings.',
  'coaster29|Toyota Coaster 29 Seater|Commercial & Buses|29|Manual|0|28000|Required|1|0|52|Extra seats for bigger groups.',
  'minibus35|Mini Bus 35 Seater|Commercial & Buses|35|Manual|0|32000|Required|1|0|48|Big group transport with AC and reclining seats.',
  'coach49|Luxury Coach 49 Seater|Commercial & Buses|49|Manual|0|45000|Required|1|0|45|Full-size coach for long trips and large events.'
];

var ADDON_ROWS = [
  ['Wedding flower decoration', 8000, 'One time', 'Luxury & Wedding, Sedans, SUVs & 4x4', 'Yes'],
  ['Child seat', 300, 'Per day', 'Hatchbacks, Sedans, SUVs & 4x4, Vans & Family', 'Yes'],
  ['Driver night halt', 2000, 'Per night', 'All, With driver, Outstation', 'Yes'],
  ['Microphone and sound system', 3000, 'One time', 'Commercial & Buses', 'Yes']
];

// The three numbers on the home page. Leave a Value empty to hide that number on the website.
var STAT_ROWS = [
  ['Stat Trips', 2500, 'Home page: number of trips completed (shown as 2500+). Leave empty to hide it.'],
  ['Stat Happy Customers %', 98, 'Home page: percent of happy customers (numbers only). Leave empty to hide it.'],
  ['Stat Years', 12, 'Home page: years on the road (numbers only). Leave empty to hide it.']
];

var SETTING_ROWS = [
  ['Company Name', 'Safar Wheels', 'The name shown on the website.'],
  ['Phone', '0300 0000000', 'Phone number shown on the website. Replace it with your real number.'],
  ['WhatsApp Number', '923000000000', 'YOUR WhatsApp number, numbers only, with country code (92 for Pakistan, no plus, no zero). Customers send their booking details here.'],
  ['Address', 'Demo Plaza, Main Boulevard, Lahore', 'Your office address (also the pickup place).'],
  ['Opening Hours', 'Every day: 8 am - 10 pm', 'Opening hours. Use a semicolon (;) to write more than one line.'],
  ['Online Booking Discount %', 5, 'Discount for booking on the website (percent).'],
  ['Long Rental Discount 3-6 Days %', 5, 'Extra discount when the rental is 3 to 6 days (percent).'],
  ['Long Rental Discount 7+ Days %', 10, 'Extra discount when the rental is 7 days or more (percent).'],
  ['Stamp Card Size', 5, 'How many completed rentals fill the stamp card. After that, the next booking gets the reward.'],
  ['Stamp Reward Discount %', 10, 'Discount for a full stamp card (percent).'],
  ['Max Total Discount %', 20, 'The online, long-rental and stamp discounts are added together but never go above this percent.'],
  ['Outstation Extra %', 15, 'Added to the WITH-DRIVER daily price when the trip is to another city (percent).'],
  ['Delivery Fee', 1000, 'Charged when the customer wants the car delivered (rupees).'],
  ['Hold Hours for Pending', 24, 'A Pending booking holds the dates this many hours. After that the dates are free again by themselves.'],
  ['Max Rental Days', 30, 'The longest rental allowed in one booking.'],
  ['Max Days Ahead', 180, 'How far ahead customers can pick a pickup date.'],
  ['Accepting Bookings', 'Yes', 'Set to No to stop new online bookings (for example during a holiday).'],
  ['Rental Term 1', 'Documents at pickup: please bring your original CNIC. For a self-drive rental, also bring your original driving licence. We only look at them.', 'Shown on the About page. Add more rows named Rental Term 8, 9 ... if you need them.'],
  ['Rental Term 2', 'Fuel and motorway tolls are not included in the price.', ''],
  ['Rental Term 3', 'Kilometre limit: 250 km per day. After that, extra kilometres are charged at Rs 40 per km.', ''],
  ['Rental Term 4', 'With a driver, one rental day means 12 hours. Extra hours are agreed with the owner.', ''],
  ['Rental Term 5', 'Days are counted from the pickup date to the return date, and both days count.', ''],
  ['Rental Term 6', 'The self-drive deposit is paid at pickup and is refunded when the car comes back in good condition.', ''],
  ['Rental Term 7', 'You pay nothing online. We confirm your booking by phone or WhatsApp, and you pay us directly.', '']
].concat(STAT_ROWS);

/* ======================================================================
   SETUP  (run once; safe to run again, it never deletes your data)
   ====================================================================== */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Safar Wheels').addItem('Set up / repair the sheet tabs', 'setup').addToUi();
  } catch (e) { /* not opened from a sheet */ }
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupCars_(ss);
  setupBookings_(ss);
  setupAddons_(ss);
  setupSettings_(ss);
  ss.getSheets().forEach(function (sh) {
    if (/^(Sheet1|Sheet 1)$/i.test(sh.getName()) && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  ss.setActiveSheet(ss.getSheetByName(TAB.CARS));
  CacheService.getScriptCache().remove('base_v2');
  var msg = 'Done! Your tabs are ready: Cars, Bookings, Add-ons and Settings.\n\nNext step: Deploy > New deployment > Web app.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

function getOrCreate_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensureRows_(sh, rows) { if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows()); }
function ensureCols_(sh, cols) { if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns()); }
function writeHeaders_(sh, headers) {
  ensureCols_(sh, headers.length);
  var r = sh.getRange(1, 1, 1, headers.length);
  r.setValues([headers]).setFontWeight('bold').setFontColor('#fff6e5').setBackground('#0b4f56').setVerticalAlignment('middle').setWrap(true);
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 40);
}
function listRule_(values, allowInvalid) {
  return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(!!allowInvalid).build();
}
function numRule_(help) {
  return SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).setHelpText(help).build();
}

function setupCars_(ss) {
  var sh = getOrCreate_(ss, TAB.CARS);
  var fresh = sh.getLastRow() < 2;
  writeHeaders_(sh, CAR_HEADERS);
  if (fresh) {
    var rows = CAR_DATA.map(function (line) {
      var f = line.split('|');
      return [f[0], f[1], f[2], Number(f[3]), f[4], Number(f[5]) || '', Number(f[6]) || '', f[7], Number(f[8]), Number(f[9]) || '', f[11], '', 'Yes', Number(f[10])];
    });
    sh.getRange(2, 1, rows.length, CAR_HEADERS.length).setValues(rows);
  }
  ensureRows_(sh, 301);
  sh.getRange(2, 1, 300, 2).setNumberFormat('@');                       // Car ID, Name stay plain text
  sh.getRange(2, 12, 300, 1).setNumberFormat('@');                      // Photo links stay plain text
  sh.getRange(2, 3, 300, 1).setDataValidation(listRule_(CATEGORIES, true));
  sh.getRange(2, 4, 300, 1).setDataValidation(numRule_('Number of seats.'));
  sh.getRange(2, 6, 300, 2).setDataValidation(numRule_('Rupees per day, numbers only. Leave Self-drive empty if a driver is required.'));
  sh.getRange(2, 8, 300, 1).setDataValidation(listRule_(['Optional', 'Required'], false));
  sh.getRange(2, 9, 300, 1).setDataValidation(numRule_('How many of this car you own (1, 2, 3 ...).'));
  sh.getRange(2, 10, 300, 1).setDataValidation(numRule_('Refundable deposit in rupees, for self-drive only.'));
  sh.getRange(2, 13, 300, 1).setDataValidation(listRule_(['Yes', 'No'], false));
  sh.getRange(2, 14, 300, 1).setDataValidation(numRule_('A number. Bigger = shown higher when sorted by popular.'));
  [90, 230, 150, 60, 110, 110, 110, 100, 60, 90, 380, 260, 70, 90].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 11, 300, 1).setWrap(true);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$M2="No"').setBackground('#f9d6d0').setRanges([sh.getRange('A2:N301')]).build()
  ]);
  sh.getRange(1, 1).setNote('A short unique code like alto or coaster22. NEVER change it after bookings exist for this car.');
  sh.getRange(1, 8).setNote('Optional = customer chooses self-drive or with driver. Required = with driver only.');
  sh.getRange(1, 9).setNote('How many of this car you own. A day is full only when this many bookings cover it.');
}

function setupBookings_(ss) {
  var sh = getOrCreate_(ss, TAB.BOOKINGS);
  var fresh = sh.getLastRow() < 2;
  writeHeaders_(sh, BOOKING_HEADERS);
  ensureRows_(sh, 5001);
  var numCols = [BC.MS, BC.DAYS, BC.PAX];
  var moneyCols = [BC.SUB, BC.DISC, BC.TOTAL];
  for (var c = 0; c < BOOKING_HEADERS.length; c++) {
    var fmt = numCols.indexOf(c) > -1 ? '0' : moneyCols.indexOf(c) > -1 ? '#,##0' : '@';
    sh.getRange(2, c + 1, 5000, 1).setNumberFormat(fmt);
  }
  sh.getRange(2, BC.STATUS + 1, 5000, 1).setDataValidation(listRule_(STATUSES, false)); // the Status dropdown
  [100, 100, 160, 130, 160, 120, 180, 90, 190, 100, 100, 100, 55, 120, 110, 90, 120, 230, 90, 140, 260, 90, 90, 100, 240, 260].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  var rng = sh.getRange('B2:B5001');
  function rule(text, bg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setRanges([rng]).build(); }
  sh.setConditionalFormatRules([rule('Pending', '#fff0cf'), rule('Confirmed', '#d9f0dc'), rule('Completed', '#dbeafe'), rule('Cancelled', '#f9d6d0'), rule('Blocked', '#e2e2e2')]);
  sh.getRange(1, BC.MS + 1).setNote('Time the booking arrived, in UTC milliseconds. This is the true time (it never changes with time zones). The Pakistan time next to it is for reading.');
  sh.getRange(1, BC.START + 1).setNote('Type dates like 2026-11-05 (year-month-day).');
  sh.getRange(1, BC.STATUS + 1).setNote('Pending = waiting for you. Confirmed = you agreed. Completed = trip finished (earns a stamp). Cancelled = free the dates. Blocked = you block the car yourself (workshop etc.): fill Car ID, Start Date, End Date.');

  if (fresh) { // three sample Blocked rows next week, so the calendar shows taken days
    var today = todayPK_(), now = Date.now();
    var blocks = [['vitz', 'Toyota Vitz', 7, 9], ['civic', 'Honda Civic', 8, 10], ['prado', 'Toyota Prado', 10, 12]];
    blocks.forEach(function (b, i) {
      var row = new Array(BOOKING_HEADERS.length);
      for (var k = 0; k < row.length; k++) row[k] = '';
      row[BC.REF] = 'BLOCK-' + (i + 1);
      row[BC.STATUS] = 'Blocked';
      row[BC.TIME] = Utilities.formatDate(new Date(now), TZ, 'dd MMM yyyy, hh:mm a');
      row[BC.MS] = now;
      row[BC.NAME] = 'Workshop service (sample)';
      row[BC.CAR] = b[0];
      row[BC.CARNAME] = b[1];
      row[BC.START] = addDays_(today, b[2]);
      row[BC.END] = addDays_(today, b[3]);
      row[BC.DAYS] = b[3] - b[2] + 1;
      row[BC.NOTES] = 'Sample block. Delete this row to free the dates.';
      sh.getRange(2 + i, 1, 1, BOOKING_HEADERS.length).setValues([row]);
    });
  }
}

function setupAddons_(ss) {
  var sh = getOrCreate_(ss, TAB.ADDONS);
  var fresh = sh.getLastRow() < 2;
  writeHeaders_(sh, ADDON_HEADERS);
  if (fresh) sh.getRange(2, 1, ADDON_ROWS.length, ADDON_HEADERS.length).setValues(ADDON_ROWS);
  ensureRows_(sh, 101);
  sh.getRange(2, 2, 100, 1).setDataValidation(numRule_('Price in rupees.'));
  sh.getRange(2, 3, 100, 1).setDataValidation(listRule_(['Per day', 'One time', 'Per night'], false));
  sh.getRange(2, 5, 100, 1).setDataValidation(listRule_(['Yes', 'No'], false));
  [260, 90, 100, 420, 70].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(1, 4).setNote('Car categories, separated by commas. You can also write: All, With driver, Outstation. Example: All, With driver, Outstation = every with-driver outstation trip.');
}

function setupSettings_(ss) {
  var sh = getOrCreate_(ss, TAB.SETTINGS);
  writeHeaders_(sh, SETTING_HEADERS);
  sh.getRange(2, 2, 200, 1).setNumberFormat('@'); // keep phone numbers like 0300... as typed
  var existing = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { existing[norm_(r[0])] = true; });
  var add = SETTING_ROWS.filter(function (r) { return !existing[norm_(r[0])]; });
  if (add.length) {
    var start = sh.getLastRow() + 1;
    sh.getRange(start, 2, add.length, 1).setNumberFormat('@');
    sh.getRange(start, 1, add.length, 3).setValues(add.map(function (r) { return [r[0], String(r[1]), r[2]]; })); // only adds settings that are missing
  }
  [230, 420, 520].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 2, 200, 2).setWrap(true);
  var vals = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  for (var i = 0; i < vals.length; i++) if (norm_(vals[i][0]) === 'acceptingbookings') sh.getRange(i + 2, 2).setDataValidation(listRule_(['Yes', 'No'], false));
}

// Run this once on a sheet you already have: it adds the three Stat rows to the Settings tab.
// It never changes or removes any other row.
function addStatSettings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB.SETTINGS);
  if (!sh) { setup(); return; }
  var existing = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { existing[norm_(r[0])] = true; });
  var add = STAT_ROWS.filter(function (r) { return !existing[norm_(r[0])]; });
  if (add.length) {
    var start = sh.getLastRow() + 1;
    sh.getRange(start, 2, add.length, 1).setNumberFormat('@');
    sh.getRange(start, 1, add.length, 3).setValues(add.map(function (r) { return [r[0], String(r[1]), r[2]]; }));
  }
  CacheService.getScriptCache().remove('base_v2');
  var msg = add.length ? 'Added ' + add.length + ' new row(s) to the Settings tab. Nothing else was changed.' : 'The Stat rows are already in the Settings tab. Nothing was changed.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

/* ======================================================================
   SMALL HELPERS
   ====================================================================== */

function norm_(k) { return String(k == null ? '' : k).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function yes_(v) { return ['yes', 'y', 'true', '1'].indexOf(String(v).trim().toLowerCase()) > -1; }
function num_(v, d) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? d : n; }
function digits_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function fail_(msg, extra) { var o = { ok: false, error: msg }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o; }
// Plain text only: no control characters, and nothing that a spreadsheet could read as a formula (= + - @ at the start).
function safeText_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[=+\-@]+/, '').trim().slice(0, max);
}
function money_(n) { return 'Rs ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function pad2_(n) { n = Number(n); return n < 10 ? '0' + n : String(n); }
function todayPK_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function dayNum_(ymd) { var p = ymd.split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
function ymdOf_(n) { return Utilities.formatDate(new Date(n * 86400000), 'UTC', 'yyyy-MM-dd'); }
function addDays_(ymd, n) { return ymdOf_(dayNum_(ymd) + n); }
function validDate_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  return d.getUTCFullYear() === +p[0] && d.getUTCMonth() === +p[1] - 1 && d.getUTCDate() === +p[2];
}
// A date cell can be text like 2026-11-05, text like 5/11/2026 (day first), or a real date. Anything else -> empty.
function dateKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) { var a = s.slice(0, 10).split('-'); var k = a[0] + '-' + pad2_(a[1].replace(/\D/g, '')) + '-' + pad2_(a[2].replace(/\D/g, '')); return validDate_(k) ? k : ''; }
  var m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
  if (m) { var k2 = m[3] + '-' + pad2_(m[2]) + '-' + pad2_(m[1]); return validDate_(k2) ? k2 : ''; }
  return '';
}
function fmtDay_(ymd) { var p = ymd.split('-'); return +p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+p[1] - 1]; }
function dateLabel_(a, b) { // 5-7 Nov | 28 Oct - 2 Nov | 5 Nov
  if (!b || a === b) return fmtDay_(a);
  var p = a.split('-'), q = b.split('-');
  if (p[0] === q[0] && p[1] === q[1]) return +p[2] + '-' + fmtDay_(b);
  return fmtDay_(a) + ' - ' + fmtDay_(b);
}
function clockText_(hhmm) {
  var m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return '';
  var h = Number(m[1]);
  return (h % 12 || 12) + ':' + m[2] + (h >= 12 ? ' pm' : ' am');
}
function normPhone_(v) {
  var d = digits_(v);
  if (/^92/.test(d) && d.length >= 12) d = '0' + d.slice(2);
  else if (/^3/.test(d) && d.length === 10) d = '0' + d;
  return d;
}

// Reads a tab into a list of objects. Keys are the column headings in lower case.
function readTable_(sh) {
  if (!sh) return [];
  var last = sh.getLastRow(), cols = sh.getLastColumn();
  if (last < 2 || cols < 1) return [];
  var vals = sh.getRange(1, 1, last, cols).getValues();
  var head = vals[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var o = {};
    for (var j = 0; j < head.length; j++) if (head[j]) o[head[j]] = vals[i][j];
    out.push(o);
  }
  return out;
}

/* ======================================================================
   READING THE SHEET
   ====================================================================== */

function getCars_(includeInactive) {
  var out = [], seen = {};
  readTable_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.CARS)).forEach(function (r) {
    var id = String(r['car id'] || '').trim().toLowerCase(), name = String(r['name'] || '').trim();
    if (!id || !name || seen[id]) return;
    var active = String(r['active']).trim() === '' ? true : yes_(r['active']);
    if (!active && !includeInactive) return;
    var car = {
      id: id, name: name, category: String(r['category'] || 'Other').trim(),
      seats: Math.max(1, Math.floor(num_(r['seats'], 4))), transmission: String(r['transmission'] || '').trim(),
      selfPrice: Math.max(0, num_(r['self-drive rs/day'], 0)), driverPrice: Math.max(0, num_(r['with-driver rs/day'], 0)),
      driverRule: String(r['driver rule'] || '').trim().toLowerCase() === 'required' ? 'Required' : 'Optional',
      units: Math.max(1, Math.floor(num_(r['units'], 1))), deposit: Math.max(0, num_(r['deposit rs'], 0)),
      description: String(r['description'] || '').trim(), photo: String(r['photo url'] || '').trim(), popularity: num_(r['popularity'], 0)
    };
    if (modesOf_(car).length === 0) return; // a car without a price cannot be rented
    seen[id] = true;
    out.push(car);
  });
  return out;
}

function getAddons_() {
  var out = [];
  readTable_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.ADDONS)).forEach(function (r) {
    var name = String(r['name'] || '').trim();
    if (!name) return;
    var active = String(r['active']).trim() === '' ? true : yes_(r['active']);
    if (!active) return;
    out.push({
      name: name, price: Math.max(0, num_(r['price'], 0)), charged: String(r['charged'] || 'One time').trim(),
      appliesTo: String(r['applies to'] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean)
    });
  });
  return out;
}

// The settings exactly as typed in the sheet: { "Delivery Fee": "1000", ... }
function getSettingsRaw_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.SETTINGS), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    var k = String(r[0]).trim();
    if (k) out[k] = r[1];
  });
  return out;
}

// Settings with simple names, used by the booking code. The website reads the same names.
function getSettings_() {
  var m = {};
  var raw = getSettingsRaw_();
  Object.keys(raw).forEach(function (k) { m[norm_(k)] = raw[k]; });
  function s(k, d) { var v = m[k]; return v === undefined || String(v).trim() === '' ? d : String(v).trim(); }
  var wa = digits_(s('whatsappnumber', '923000000000'));
  if (wa.charAt(0) === '0') wa = '92' + wa.slice(1);
  return {
    name: s('companyname', 'Safar Wheels'), phone: s('phone', '0300 0000000'), whatsapp: wa,
    onlinePct: Math.max(0, num_(s('onlinebookingdiscount', '5'), 5)),
    long36: Math.max(0, num_(s('longrentaldiscount36days', '5'), 5)),
    long7: Math.max(0, num_(s('longrentaldiscount7days', '10'), 10)),
    stampSize: Math.max(1, Math.floor(num_(s('stampcardsize', '5'), 5))),
    stampPct: Math.max(0, num_(s('stamprewarddiscount', '10'), 10)),
    maxPct: Math.max(0, Math.min(100, num_(s('maxtotaldiscount', '20'), 20))),
    outPct: Math.max(0, num_(s('outstationextra', '15'), 15)),
    deliveryFee: Math.max(0, num_(s('deliveryfee', '1000'), 1000)),
    holdHours: Math.max(1, num_(s('holdhoursforpending', '24'), 24)),
    maxDays: Math.max(1, Math.floor(num_(s('maxrentaldays', '30'), 30))),
    maxAhead: Math.max(1, Math.floor(num_(s('maxdaysahead', '180'), 180))),
    accepting: yes_(s('acceptingbookings', 'Yes'))
  };
}

function getBookingRows_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.BOOKINGS);
  if (!sh || sh.getLastRow() < 2) return [];
  var n = BOOKING_HEADERS.length, cols = Math.min(n, sh.getMaxColumns());
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, cols).getValues();
  vals.forEach(function (r) { while (r.length < n) r.push(''); });
  return vals;
}

/* ======================================================================
   AVAILABILITY  (the one place that decides if a day is taken)
   A booking counts only if it is Blocked, Confirmed, or Pending that is younger than Hold Hours.
   Cancelled and Completed never count. A day is TAKEN for a car when the number of counting
   bookings on that day is equal to or more than the car's Units.
   ====================================================================== */

function countingList_(rows, holdHours, nowMs) {
  var out = [], holdMs = holdHours * 3600000;
  rows.forEach(function (r) {
    var st = String(r[BC.STATUS]).trim().toLowerCase();
    var car = String(r[BC.CAR]).trim().toLowerCase();
    if (!car) return;
    var s = dateKey_(r[BC.START]), e = dateKey_(r[BC.END]) || s;
    if (!s) return;
    if (e < s) { var t = s; s = e; e = t; }
    var counts = false;
    if (st === 'blocked' || st === 'confirmed') counts = true;
    else if (st === 'pending') { var ms = Number(r[BC.MS]); counts = !ms || (nowMs - ms) < holdMs; }
    if (counts) out.push({ car: car, sn: dayNum_(s), en: dayNum_(e) });
  });
  return out;
}

// { carId: [["2026-11-05","2026-11-07"], ...] }  only days that are FULL. Nothing about customers.
function busyMap_(list, cars, set) {
  var today = dayNum_(todayPK_()), maxDay = today + set.maxAhead + set.maxDays + 1, byCar = {}, out = {};
  list.forEach(function (b) { (byCar[b.car] = byCar[b.car] || []).push(b); });
  cars.forEach(function (c) {
    var bl = byCar[c.id];
    if (!bl) return;
    var counts = {};
    bl.forEach(function (b) {
      var a = Math.max(b.sn, today), z = Math.min(b.en, maxDay);
      for (var d = a; d <= z; d++) counts[d] = (counts[d] || 0) + 1;
    });
    var days = Object.keys(counts).map(Number).filter(function (d) { return counts[d] >= c.units; }).sort(function (x, y) { return x - y; });
    var ranges = [];
    days.forEach(function (d) {
      var last = ranges[ranges.length - 1];
      if (last && last[1] === d - 1) last[1] = d; else ranges.push([d, d]);
    });
    if (ranges.length) out[c.id] = ranges.map(function (r) { return [ymdOf_(r[0]), ymdOf_(r[1])]; });
  });
  return out;
}

// The first full day inside start..end for this car, or '' when the whole range is free.
function firstFullDay_(list, car, start, end) {
  var bl = list.filter(function (b) { return b.car === car.id; });
  if (!bl.length) return '';
  for (var d = dayNum_(start), z = dayNum_(end); d <= z; d++) {
    var n = 0;
    for (var i = 0; i < bl.length; i++) if (bl[i].sn <= d && bl[i].en >= d) n++;
    if (n >= car.units) return ymdOf_(d);
  }
  return '';
}

/* ======================================================================
   PRICE  (the same formula as js/pricing.js; this one is the one that counts)
   ====================================================================== */

function modesOf_(car) {
  var m = [];
  if (car.driverRule !== 'Required' && car.selfPrice > 0) m.push('Self-drive');
  if (car.driverPrice > 0) m.push('With driver');
  return m;
}
function addonCharge_(a) { var c = String(a.charged).toLowerCase(); return /night/.test(c) ? 'night' : /day/.test(c) ? 'day' : 'one'; }
function addonApplies_(a, car, driver, trip) {
  var list = a.appliesTo.map(function (x) { return x.toLowerCase(); });
  if (!list.length) return true;
  if (list.indexOf('with driver') > -1 && driver !== 'With driver') return false;
  if (list.indexOf('outstation') > -1 && trip !== 'Outstation') return false;
  var cats = list.filter(function (x) { return x !== 'all' && x !== 'with driver' && x !== 'outstation'; });
  if (!cats.length) return true;
  return cats.indexOf(String(car.category).toLowerCase()) > -1;
}
function addonAmount_(a, days) {
  var k = addonCharge_(a);
  return k === 'day' ? a.price * days : k === 'night' ? a.price * Math.max(0, days - 1) : a.price;
}

// p = { driver, trip, days, pickup, reward }
function quote_(car, addons, set, p) {
  var withDriver = p.driver === 'With driver';
  var daily = withDriver ? car.driverPrice : car.selfPrice;
  var outPerDay = (p.trip === 'Outstation' && withDriver) ? Math.round(daily * set.outPct / 100) : 0;
  var q = {
    days: p.days, driver: p.driver, trip: p.trip, rentalDaily: daily, baseTotal: daily * p.days,
    outPct: set.outPct, outPerDay: outPerDay, outTotal: outPerDay * p.days, addons: [], addonsTotal: 0,
    delivery: p.pickup === 'Deliver to me' ? set.deliveryFee : 0
  };
  addons.forEach(function (a) {
    var amt = addonAmount_(a, p.days);
    q.addons.push({ name: a.name, amount: amt });
    q.addonsTotal += amt;
  });
  q.subtotal = q.baseTotal + q.outTotal + q.addonsTotal + q.delivery;
  q.parts = [];
  if (set.onlinePct > 0) q.parts.push({ label: 'Online booking discount', pct: set.onlinePct });
  var lng = p.days >= 7 ? set.long7 : p.days >= 3 ? set.long36 : 0;
  if (lng > 0) q.parts.push({ label: p.days >= 7 ? 'Long rental discount (7+ days)' : 'Long rental discount (3-6 days)', pct: lng });
  if (p.reward && set.stampPct > 0) q.parts.push({ label: 'Stamp card reward', pct: set.stampPct });
  q.rawPct = q.parts.reduce(function (t, x) { return t + x.pct; }, 0);
  q.pct = Math.min(q.rawPct, set.maxPct);
  q.capped = q.rawPct > set.maxPct;
  q.discount = Math.round(q.subtotal * q.pct / 100);
  q.total = q.subtotal - q.discount;
  q.deposit = p.driver === 'Self-drive' ? car.deposit : 0;
  return q;
}

// Stamp card: completed rentals by phone, and how many rewards were already used.
function stampInfo_(rows, tail, size) {
  var done = 0, used = 0;
  rows.forEach(function (r) {
    if (digits_(r[BC.PHONE]).slice(-10) !== tail) return;
    var st = String(r[BC.STATUS]).trim().toLowerCase();
    if (st === 'completed') done++;
    if (st !== 'cancelled' && String(r[BC.DETAILS]).indexOf('Stamp card') > -1) used++;
  });
  return { completed: done, size: size, earned: Math.floor(done / size), used: used };
}

/* ======================================================================
   doGet  -  cars, add-ons, settings, busy dates, tracking, stamps
   ====================================================================== */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = String(p.action || 'all').toLowerCase();
    if (action === 'all') return json_(allData_());
    if (action === 'busy') return json_({ ok: true, busy: currentBusy_(), serverTime: Date.now() });
    if (action === 'track') return json_(trackBooking_(p.phone, p.ref));
    if (action === 'stamps') return json_(stampsFor_(p.phone));
    return json_(fail_('Unknown request.'));
  } catch (err) {
    console.error(err);
    return json_(fail_('Something went wrong. Please try again.'));
  }
}

// Cars + add-ons + settings are kept for 60 seconds so the site stays quick. Busy dates are NEVER kept.
function baseData_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('base_v2');
  if (hit) { try { return JSON.parse(hit); } catch (x) { /* rebuild */ } }
  var base = { cars: getCars_(false), addons: getAddons_(), settings: getSettingsRaw_() };
  try { var s = JSON.stringify(base); if (s.length < 90000) cache.put('base_v2', s, 60); } catch (x) { /* too big or cache busy: fine */ }
  return base;
}
function currentBusy_() {
  var set = getSettings_();
  return busyMap_(countingList_(getBookingRows_(), set.holdHours, Date.now()), getCars_(false), set);
}
function allData_() {
  var b = baseData_();
  return { ok: true, cars: b.cars, addons: b.addons, settings: b.settings, busy: currentBusy_(), serverTime: Date.now() };
}

function stampsFor_(phone) {
  var cache = CacheService.getScriptCache(), ph = normPhone_(phone);
  if (ph.length < 10) return fail_('Please type a valid phone number.');
  var n = Number(cache.get('stp_all') || 0);
  if (n >= 300) return fail_('Too many requests. Please try again in a few minutes.');
  try { cache.put('stp_all', String(n + 1), 600); } catch (x) { /* ignore */ }
  var set = getSettings_(), s = stampInfo_(getBookingRows_(), ph.slice(-10), set.stampSize);
  return { ok: true, stamps: s, reward: s.earned > s.used };
}

/**
 * Track a booking. The visitor must give the PHONE number. The booking reference is optional.
 *   phone only      -> that phone's bookings from the last 90 days (newest first): ref, car, dates and status ONLY.
 *   phone + ref     -> that one booking.
 * Names, addresses, prices and notes are NEVER returned. Wrong tries are limited per phone number.
 */
function trackBooking_(phone, ref) {
  var cache = CacheService.getScriptCache(), ph = normPhone_(phone);
  if (ph.length < 10) return fail_('Please type the phone number you used when booking.');
  var tail = ph.slice(-10);
  var want = String(ref || '').toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 14);
  if (want && want.indexOf('-') === -1) want = want.replace(/^([A-Z]+)(\d+)$/, '$1-$2');

  var key = 'trk_p_' + tail, all = 'trk_all';
  var fails = Number(cache.get(key) || 0), allFails = Number(cache.get(all) || 0);
  if (fails >= 5 || allFails >= 150) return fail_('Too many tries. Please wait 15 minutes, or call us.');

  var set = getSettings_(), now = Date.now(), cutoff = now - 90 * 86400000, found = [];
  var rows = getBookingRows_();
  for (var i = rows.length - 1; i >= 0; i--) { // newest rows are at the bottom
    var r = rows[i];
    if (digits_(r[BC.PHONE]).slice(-10) !== tail) continue;
    var st = String(r[BC.STATUS]).trim().toLowerCase();
    var label = st === 'pending' ? 'Pending' : st === 'confirmed' ? 'Confirmed' : st === 'completed' ? 'Completed' : st === 'cancelled' ? 'Cancelled' : '';
    if (!label) continue;
    var refText = String(r[BC.REF]).trim();
    if (want && refText.toUpperCase() !== want) continue;
    var ms = Number(r[BC.MS]) || 0, start = dateKey_(r[BC.START]), end = dateKey_(r[BC.END]) || start;
    if (!want) {
      var when = ms || (start ? dayNum_(start) * 86400000 : 0);
      if (!when || when < cutoff) continue;
    }
    found.push({
      ref: refText, carId: String(r[BC.CAR]).trim().toLowerCase(), car: String(r[BC.CARNAME]).trim(), start: start, end: end,
      status: label, created: ms, expired: label === 'Pending' && ms > 0 && (now - ms) >= set.holdHours * 3600000
    });
    if (found.length >= 30 || want) break;
  }
  if (found.length) {
    try { cache.remove(key); } catch (x) { /* ignore */ }
    return { ok: true, mode: want ? 'one' : 'list', bookings: found, stamps: stampInfo_(rows, tail, set.stampSize) };
  }
  try { cache.put(key, String(fails + 1), 900); cache.put(all, String(allFails + 1), 600); } catch (x) { /* ignore */ }
  return fail_(want ? 'We could not find a booking with these details. Please check the phone number and booking reference.'
                    : 'We could not find any bookings for this phone number in the last 90 days. Please check the number, or type your booking reference too.');
}

/* ======================================================================
   doPost  -  place a booking
   ====================================================================== */

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    if (!raw || raw.length > 20000) return json_(fail_('Sorry, we could not read your booking.'));
    var data;
    try { data = JSON.parse(raw); } catch (x) { return json_(fail_('Sorry, we could not read your booking.')); }
    return json_(placeBooking_(data || {}));
  } catch (err) {
    console.error(err);
    return json_(fail_('Sorry, something went wrong on our side. Please try again, or call us.'));
  }
}

function placeBooking_(d) {
  var cache = CacheService.getScriptCache();

  // 1. Spam checks: hidden honeypot field, and a form that was filled in impossibly fast.
  if (String(d.hp || '').trim() !== '' || !(Number(d.elapsed) >= 4000)) return fail_('Sorry, we could not send this booking. Please try again.');
  var rate = Number(cache.get('bk_rate') || 0);
  if (rate >= 60) return fail_('We are very busy right now. Please try again in a few minutes.');

  var set = getSettings_();
  if (!set.accepting) return fail_('We are not taking online bookings right now. Please call us on ' + set.phone + '.');

  // 2. Customer details
  var name = safeText_(d.name, 60);
  if (name.length < 2) return fail_('Please type your name.');
  var ph = normPhone_(d.phone);
  if (!/^03\d{9}$/.test(ph)) return fail_('Please type a mobile number like 0300-1234567.');
  var phone = ph.slice(0, 4) + '-' + ph.slice(4), tail = ph.slice(-10);
  var phoneKey = 'bk_p_' + ph;
  if (Number(cache.get(phoneKey) || 0) >= 3) return fail_('Too many bookings from this number just now. Please call us on ' + set.phone + '.');
  var email = safeText_(d.email, 80);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail_('That email address does not look right.');
  if (d.confirmed !== true) return fail_('Please tick the box to confirm you will show your documents at pickup.');

  // 3. The car: everything about it comes from the sheet
  var carId = String(d.car || '').trim().toLowerCase(), car = null;
  getCars_(false).forEach(function (c) { if (c.id === carId) car = c; });
  if (!car) return fail_('Sorry, that car is not available any more. Please choose another one.');

  var modes = modesOf_(car);
  var driver = String(d.driver || '');
  if (modes.indexOf(driver) === -1) return fail_(car.driverRule === 'Required' ? 'This vehicle is rented with a professional driver only.' : 'Please choose a driver option.');
  var trip = String(d.trip || '');
  if (TRIPS.indexOf(trip) === -1) return fail_('Please choose Within Lahore or Outstation.');
  var purpose = String(d.purpose || '');
  if (PURPOSES.indexOf(purpose) === -1) return fail_('Please choose the purpose of your trip.');
  var pax = Math.floor(Number(d.passengers));
  if (!(pax >= 1)) return fail_('Please enter the number of passengers.');
  if (pax > car.seats) return fail_('This car has only ' + car.seats + ' seats. Please choose a bigger car or fewer passengers.');
  var pickup = String(d.pickup || '');
  if (PICKUPS.indexOf(pickup) === -1) return fail_('Please choose where we meet you.');
  var address = '';
  if (pickup === 'Deliver to me') {
    address = safeText_(d.address, 250);
    if (address.length < 8) return fail_('Please type your pickup area and address.');
  }
  var ptime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.time || '')) ? String(d.time) : '';
  var destination = '';
  if (trip === 'Outstation') {
    destination = safeText_(d.destination, 80);
    if (destination.length < 2) return fail_('Please type the city you are going to.');
  }
  var notes = safeText_(d.notes, 300);

  // 4. Dates (checked against the clock in Pakistan, not the browser)
  var today = todayPK_(), start = String(d.start || ''), end = String(d.end || '');
  if (!validDate_(start) || !validDate_(end)) return fail_('Please pick your pickup day and return day.');
  if (start < today) return fail_('That pickup date has passed. Please pick another day.');
  if (end < start) return fail_('The return day cannot be before the pickup day.');
  var days = dayNum_(end) - dayNum_(start) + 1;   // both days count
  if (days > set.maxDays) return fail_('You can rent for up to ' + set.maxDays + ' days at a time.');
  if (start > addDays_(today, set.maxAhead)) return fail_('Please pick a pickup date within the next ' + set.maxAhead + ' days.');

  // 5. Add-ons: looked up by name in the sheet, and only if they are allowed for this car and trip
  var wanted = Array.isArray(d.addons) ? d.addons.slice(0, 12) : [];
  var allAddons = getAddons_(), chosen = [], seen = {};
  for (var i = 0; i < wanted.length; i++) {
    var nm = String(wanted[i] || '').trim().toLowerCase();
    if (!nm || seen[nm]) continue;
    seen[nm] = true;
    var a = null;
    allAddons.forEach(function (x) { if (x.name.toLowerCase() === nm) a = x; });
    if (!a) return fail_('One of the extras is not available any more. Please check your extras and try again.');
    if (!addonApplies_(a, car, driver, trip)) return fail_(a.name + ' is not available for this car or trip.');
    if (addonCharge_(a) === 'night' && days < 2) return fail_(a.name + ' needs at least 2 days.');
    chosen.push(a);
  }

  // 6. Save the booking. One at a time, and checked AGAIN here, so two people can never take the same car.
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return fail_('We are very busy right now. Please try again in a moment.'); }
  var ref, q, nowMs = Date.now(), details, reward;
  try {
    var rows = getBookingRows_();
    var list = countingList_(rows, set.holdHours, nowMs);
    var taken = firstFullDay_(list, car, start, end);
    if (taken) return fail_('Sorry, someone just booked ' + fmtDay_(taken) + ' for the ' + car.name + '. Please pick other dates.', { conflict: true, takenDay: taken });

    // the same phone asking twice for the same car and overlapping dates
    var sn = dayNum_(start), en = dayNum_(end), dup = '';
    rows.forEach(function (r) {
      if (digits_(r[BC.PHONE]).slice(-10) !== tail || String(r[BC.CAR]).trim().toLowerCase() !== car.id) return;
      var st = String(r[BC.STATUS]).trim().toLowerCase(), ms = Number(r[BC.MS]);
      var live = st === 'confirmed' || (st === 'pending' && (!ms || nowMs - ms < set.holdHours * 3600000));
      var rs = dateKey_(r[BC.START]), re = dateKey_(r[BC.END]) || rs;
      if (live && rs && dayNum_(rs) <= en && dayNum_(re) >= sn) dup = String(r[BC.REF]);
    });
    if (dup) return fail_('You already have a booking (' + dup + ') for this car on these dates. You can follow it on the Track Booking page.');

    var stamps = stampInfo_(rows, tail, set.stampSize);
    reward = stamps.earned > stamps.used;
    q = quote_(car, chosen, set, { driver: driver, trip: trip, days: days, pickup: pickup, reward: reward });

    var maxNo = 1000;
    rows.forEach(function (r) { var m = /^SW-(\d+)$/i.exec(String(r[BC.REF]).trim()); if (m) maxNo = Math.max(maxNo, Number(m[1])); });
    ref = 'SW-' + (maxNo + 1);

    details = q.parts.map(function (x) { return x.label + ' ' + x.pct + '%'; }).join('; ') + (q.capped ? ' (limited to ' + q.pct + '%)' : '');
    var addonText = q.addons.map(function (x) { return x.name + ' ' + money_(x.amount); }).join(', ');
    var row = new Array(BOOKING_HEADERS.length);
    row[BC.REF] = ref; row[BC.STATUS] = 'Pending';
    row[BC.TIME] = Utilities.formatDate(new Date(nowMs), TZ, 'dd MMM yyyy, hh:mm a');
    row[BC.MS] = nowMs; row[BC.NAME] = name; row[BC.PHONE] = phone; row[BC.EMAIL] = email;
    row[BC.CAR] = car.id; row[BC.CARNAME] = car.name; row[BC.DRIVER] = driver; row[BC.START] = start; row[BC.END] = end; row[BC.DAYS] = days;
    row[BC.TRIP] = trip; row[BC.PURPOSE] = purpose; row[BC.PAX] = pax; row[BC.PICKUP] = pickup; row[BC.ADDRESS] = address;
    row[BC.PTIME] = clockText_(ptime); row[BC.DEST] = destination; row[BC.ADDONS] = addonText;
    row[BC.SUB] = q.subtotal; row[BC.DISC] = q.discount; row[BC.TOTAL] = q.total; row[BC.NOTES] = notes; row[BC.DETAILS] = details;

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.BOOKINGS) || (setupBookings_(SpreadsheetApp.getActiveSpreadsheet()), SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.BOOKINGS));
    ensureCols_(sh, BOOKING_HEADERS.length);
    var last = sh.getLastRow();
    var rng = sh.getRange(last + 1, 1, 1, BOOKING_HEADERS.length);
    var numCols = [BC.MS, BC.DAYS, BC.PAX], moneyCols = [BC.SUB, BC.DISC, BC.TOTAL];
    rng.setNumberFormats([row.map(function (v, c) { return numCols.indexOf(c) > -1 ? '0' : moneyCols.indexOf(c) > -1 ? '#,##0' : '@'; })]); // text cells can never become formulas
    rng.setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  try {
    cache.put('bk_rate', String(rate + 1), 600);
    cache.put(phoneKey, String(Number(cache.get(phoneKey) || 0) + 1), 3600);
  } catch (x) { /* ignore */ }

  // 7. Email the owner (the account that owns this script; no address is written in the code)
  try {
    var to = Session.getEffectiveUser().getEmail();
    if (to) {
      var dl = dateLabel_(start, end);
      MailApp.sendEmail({
        to: to,
        name: set.name + ' website',
        subject: 'NEW BOOKING ' + ref + ' - ' + car.name + ', ' + dl + ' (' + driver.toLowerCase() + ')',
        body: 'New website booking ' + ref + '.\n\n' +
          'Name: ' + name + '\nPhone: ' + phone + '\nEmail: ' + (email || '-') + '\n\n' +
          'Car: ' + car.name + '\nDates: ' + fmtDay_(start) + ' ' + start.slice(0, 4) + ' to ' + fmtDay_(end) + ' ' + end.slice(0, 4) + ' (' + days + ' days, both days count)\n' +
          'Driver: ' + driver + '\nTrip: ' + trip + (destination ? ' to ' + destination : '') + '\nPurpose: ' + purpose + '\nPassengers: ' + pax + ' (car has ' + car.seats + ' seats)\n' +
          'Pickup: ' + pickup + (address ? ' - ' + address : '') + '\nPickup time: ' + (clockText_(ptime) || 'not given') + '\n' +
          'Add-ons: ' + (q.addons.length ? q.addons.map(function (x) { return x.name + ' ' + money_(x.amount); }).join(', ') : 'none') + '\n\n' +
          days + ' day(s) x ' + money_(q.rentalDaily) + ' = ' + money_(q.baseTotal) + '\n' +
          (q.outPerDay ? 'Outstation extra ' + q.outPct + '%: ' + money_(q.outTotal) + '\n' : '') +
          (q.addonsTotal ? 'Add-ons: ' + money_(q.addonsTotal) + '\n' : '') +
          (q.delivery ? 'Delivery fee: ' + money_(q.delivery) + '\n' : '') +
          'Subtotal: ' + money_(q.subtotal) + '\n' +
          'Discounts (' + q.pct + '%): -' + money_(q.discount) + (details ? ' [' + details + ']' : '') + '\n' +
          'TOTAL: ' + money_(q.total) + '\n' +
          (q.deposit ? 'Self-drive deposit to collect at pickup (refundable): ' + money_(q.deposit) + '\n' : '') +
          (notes ? '\nNotes: ' + notes + '\n' : '') +
          '\nThe dates are held for ' + set.holdHours + ' hours.\n\n' +
          'Contact the customer, then set Status to Confirmed\n\n' +
          'Open the Bookings tab: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      });
    }
  } catch (err) {
    console.warn('Booking saved, but the email could not be sent: ' + err); // the booking is safe in the sheet
  }

  // 8. The real numbers go back to the website
  return {
    ok: true, ref: ref, holdHours: set.holdHours, quote: q,
    booking: {
      carId: car.id, carName: car.name, start: start, end: end, days: days, driver: driver, trip: trip, purpose: purpose, passengers: pax,
      pickup: pickup, address: address, time: ptime, destination: destination, addons: q.addons.map(function (x) { return x.name; }),
      name: name, phone: phone, email: email, notes: notes
    }
  };
}
