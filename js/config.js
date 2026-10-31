/*
  Safar Wheels settings you may change.

  SCRIPT_URL: paste your Google Apps Script web app link here (it ends with /exec).
              While it is empty, the website shows a built-in DEMO fleet and keeps demo bookings
              only in your own browser, so you can look around. See SETUP-GOOGLE-SHEET.md.
*/
window.SW_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycby8KOBB_V1t9RkQlJ-W87useabFEV82RXEr3YJJLWFk34It6N7W_vAoqQMfRAAaeOBXew/exec",

  // How long the browser keeps the cars, add-ons and settings before asking the sheet again (minutes).
  // Availability (busy dates) is NEVER kept: it is asked fresh every time.
  CACHE_MINUTES: 5,

  // Shown in the footer on every page.
  DEMO_LINE: "Safar Wheels is a demo website. It is not a real company and no real bookings are taken."
};
