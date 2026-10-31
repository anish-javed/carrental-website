# Safar Wheels: how to run it from a Google Sheet

You do **not** need to write code. You change your cars, prices and bookings in a Google Sheet. The website reads the sheet.

This takes about 10 minutes the first time.

---

## Part 1: Set up the sheet (one time)

1. Go to **sheets.google.com** and make a **new blank spreadsheet**. Name it `Safar Wheels`.
2. Click **Extensions > Apps Script**. A new page opens.
3. Delete everything in the code box.
4. Open the file `google-apps-script.gs` (it is in this folder). Copy **all** of it. Paste it into the code box.
5. Click the **Save** button (the little disk).
6. At the top, next to the Run button, choose the function called **setup**. Click **Run**.
7. Google asks for permission. Click **Review permissions**, choose your Google account, click **Advanced**, then **Go to project (unsafe)**, then **Allow**.
   This is your own script, so it is safe. It needs permission to edit your sheet and to email you when a booking comes in.
8. When it finishes, go back to your spreadsheet. You will see 4 tabs: **Cars**, **Bookings**, **Add-ons**, **Settings**. They are filled with sample data.

## Part 2: Put the sheet on the internet (one time)

1. In the Apps Script page, click **Deploy > New deployment**.
2. Click the little gear and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**. Copy the **Web app URL** (it ends with `/exec`).
5. Open the file `js/config.js` on the website. Paste the link between the quotes:

   ```js
   SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
6. Save the file. Open `index.html`. The website now shows the cars from your sheet.

> **Important:** if you ever change the script code later, click **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**. The link stays the same.

> While `SCRIPT_URL` is empty, the website shows a **demo fleet** and keeps demo bookings only in your own browser. That is good for looking around.

---

## The 4 tabs

### Cars tab: your vehicles
One row per car type. These are the columns:

| Column | What to type |
|---|---|
| **Car ID** | A short code with no spaces, like `alto` or `coaster22`. **Never change it after bookings exist.** |
| **Name** | The name customers see. |
| **Category** | Pick from the list: Hatchbacks, Sedans, SUVs & 4x4, Vans & Family, Luxury & Wedding, Commercial & Buses. |
| **Seats** | Number of seats. |
| **Transmission** | Manual or Automatic. |
| **Self-drive Rs/day** | Price per day if the customer drives. **Leave empty** if a driver is required. |
| **With-driver Rs/day** | Price per day with a driver. |
| **Driver Rule** | **Optional** = customer chooses self-drive or with driver. **Required** = with driver only. |
| **Units** | How many of this car you own (1, 2, 3...). |
| **Deposit Rs** | Refundable deposit paid at pickup. Self-drive only. |
| **Description** | One or two short lines. |
| **Photo URL** | A link to a photo (see "Photos" below). Empty = the website draws a car picture. |
| **Active** | **Yes** = shown. **No** = hidden from the website. |
| **Popularity** | A number. Bigger = shown earlier when sorted by "Most popular". |

**To add a car:** type a new row under the last one.
**To change a price:** change the number. The website updates in a minute or two.
**To hide a car for a while:** set Active to **No**.

### Bookings tab: every booking
The website adds a new row for each booking, with Status **Pending**. You never need to type a booking row, except to **Block** dates (see below).

### Add-ons tab: extras
| Column | What to type |
|---|---|
| **Name** | For example Child seat. |
| **Price** | Rupees. |
| **Charged** | **Per day**, **Per night** or **One time**. |
| **Applies To** | Car categories, separated by commas. Also you can write `All`, `With driver` and `Outstation`. Example: `All, With driver, Outstation` = every with-driver trip to another city. |
| **Active** | Yes or No. |

### Settings tab: numbers and texts
Change the **Value** column only. Leave the **Setting** names as they are.

| Setting | What it does |
|---|---|
| Phone | Shown on the website. Put your real number here. |
| WhatsApp Number | **Your** WhatsApp number: numbers only, with country code, no plus. Example: `923001234567`. Customers send their booking details here. |
| Address, Opening Hours | Shown on the website. |
| Online Booking Discount % | Discount for booking on the website. |
| Long Rental Discount 3-6 Days %, 7+ Days % | Discount for longer rentals. |
| Stamp Card Size, Stamp Reward Discount % | After this many completed rentals, the next booking gets the reward. |
| Max Total Discount % | All discounts are added up but never go above this. |
| Outstation Extra % | Added to the with-driver price for trips to another city. |
| Delivery Fee | Charged when the customer wants the car delivered. |
| Hold Hours for Pending | A new (Pending) booking holds the dates this long. |
| Max Rental Days | Longest rental in one booking. |
| Max Days Ahead | How far ahead a customer can book. |
| Accepting Bookings | Set to **No** to stop new online bookings. |
| Rental Term 1, 2, 3 ... | The rental terms shown on the About page. Add more rows (Rental Term 8, 9...) if you want. |

---

## Every day: how to handle bookings

When a customer books, you get an **email** with all the details. The subject starts with `NEW BOOKING SW-1001`. The customer also sends you a ready-written **WhatsApp** message.

1. **Call or WhatsApp the customer.** Agree on the details and how they will pay you.
2. Open the **Bookings** tab. Find the row (the newest are at the bottom).
3. Change **Status** using the dropdown:

| Status | When to use it | Does it block the dates? |
|---|---|---|
| **Pending** | New booking, waiting for you. | Yes, but only for the "Hold Hours". After that the dates are free again by themselves. |
| **Confirmed** | You agreed with the customer. | Yes. |
| **Completed** | The trip is finished. The customer earns a **stamp**. | No. |
| **Cancelled** | The booking will not happen. | No. The dates are free again. |
| **Blocked** | You block the car yourself (see below). | Yes. |

The customer sees the new status on the **Track Booking** page.

### How to block dates (workshop, service, family use)
1. Go to the **Bookings** tab. Type in the next empty row:
   - **Status:** Blocked
   - **Car ID:** the car's code, for example `civic`
   - **Start Date** and **End Date:** like `2026-11-05` (year-month-day). Both days are blocked.
2. Save. Those days turn grey on the website calendar.
3. To open the dates again, **delete the row** or change the Status to Cancelled.

The sheet comes with 3 sample Blocked rows. Delete them when you do not need them.

### How the calendar decides if a day is taken
- Each day, count the bookings that cover it: **Pending (not older than the Hold Hours), Confirmed and Blocked**.
- If that number is **the same as or more than the car's Units**, the day is taken.
- Example: you own 2 Corolla Altis. One booking: the day is still free. Two bookings: the day is taken.
- Cancelled and Completed bookings never block.
- The website checks again at the very moment of booking. If someone just took the dates, the customer sees a friendly message and nearby free dates.

---

## Photos

1. Upload your car photo somewhere that gives you a **direct picture link**. For example your own website, or a free photo site.
2. The link should open **only the picture** in the browser (usually it ends in `.jpg`, `.jpeg`, `.png` or `.webp`).
3. Copy the link and paste it into the **Photo URL** column of that car.
4. Wide photos (landscape, about 16:10) look best.
5. If the link is wrong or empty, the website shows a drawn car picture instead. Nothing breaks.

---

## The golden rules

1. **Never move columns.** Do not insert, delete or reorder columns in any tab. The script finds information by column. You can add rows freely.
2. **Never rename the tabs** or the headings in row 1.
3. **Never change a Car ID** after that car has bookings. Old bookings would no longer find the car.
4. Do not type in the grey/frozen heading row.
5. To make a car unavailable for good, set **Active = No** instead of deleting the row.

---

## Good to know

- **Customers pay nothing online.** You confirm, then you collect payment yourself.
- **Prices are protected.** The website sends only the customer's choices. The script works out all prices again from your sheet. Nobody can change a price by editing the website.
- **Privacy.** The public part of the web app only shares car details, add-ons, settings and busy date ranges. It never shares names, phones, emails or booking details. The Track Booking page shows a customer **only** their own booking reference, car, dates and status, and only after they type their phone number.
- **Email.** The booking email goes to the Google account that owns the script. No email address is written in any file.
- **Changes appear within about 1 to 5 minutes** on the website, because it keeps cars and settings in memory for a short time. Busy dates are never kept: they are always fresh.
- **Times** are saved in two ways: Pakistan time for you to read, and UTC milliseconds (the exact moment) for the computer. Do not edit the UTC column.
- This website is a **demo**. The phone number `0300 0000000` is a placeholder. Replace it in the **Settings** tab.
