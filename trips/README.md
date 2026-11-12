# Trip log

A private trip log for Trevor. It lives on the existing Focus Shift site at `/trips`. The fuel log and the marketing pages are unchanged.

| Page | URL |
| --- | --- |
| Log a trip | https://focusshift.app/trips |
| History | https://focusshift.app/trips/history |
| Reconcile | https://focusshift.app/trips/reconcile |
| Setup check | https://focusshift.app/trips/api/health |

The same paths work on the `*.pages.dev` hostname. Add `/trips` to the end of that hostname.

## How this deploys

This repository is already connected to **Cloudflare Pages**. There is no build step.

- Production branch: `main`
- Build command: none
- Build output: the repository root

`_routes.json` runs a Function for `/fuel/api/*` and `/trips/api/*`. Everything else stays static.

Do not add a `wrangler.toml`. On this Pages project that file becomes the source of truth and can override the dashboard build settings.

Merging the pull request is what publishes the app.

## What you do in the Cloudflare dashboard

Do this once, on the account that already hosts focusshift.app. Pages only attaches a secret to deployments that happen **after** you save it. Either finish this and then merge, or merge first and then **Retry deployment** on the latest production deployment.

### 1. Use the database that is already connected

The trip log uses the existing D1 binding named `DB` (the same binding as the fuel log). Do not create a second database and do not rename the binding.

The first signed-in request creates new tables: `trips`, `trip_settings`, `paystubs`, `paystub_lines`, and `trips_auth_attempts`. It does not change the fuel tables.

### 2. Set the password

1. Open the Pages project that serves **focusshift.app**.
2. **Settings → Variables and Secrets**. Stay on **Production**.
3. **Add**.
   - Name: `TRIPS_PASSWORD`
   - Value: a password you choose. Store it in a password manager.
4. Select **Encrypt**, then **Save**.

Optional, same screen, also encrypted:

| Name | When to set it |
| --- | --- |
| `TRIPS_SESSION_SECRET` | A long random string (`openssl rand -base64 32`). It signs the sign-in cookie. If you skip it, `TRIPS_PASSWORD` signs the cookie. Changing the password then signs the phone out. |

Add the same secret on the **Preview** tab only if you want to sign in on a preview URL. Point preview at a separate D1 database if you do not want practice trips in the real log. The production site does not read preview bindings.

### 3. Publish

- If you have not merged yet: merge, then wait a couple of minutes.
- If `main` already deployed before you saved the secret: **Deployments** → latest **Production** deployment → **Retry deployment**.

### 4. Check that it worked

Open https://focusshift.app/trips/api/health

You want:

```json
{
  "ok": true,
  "service": "trips-log",
  "database": true,
  "password": true
}
```

`database` is true when the `DB` binding is present. `password` is true when `TRIPS_PASSWORD` is set.

## Load numbers and pay months

Work weeks run Monday through Sunday. A week belongs to the pay month of its Sunday. The week of Oct 26–Nov 1, 2026 counts in November because Sunday is Nov 1.

Load numbers are **not** calculated from the calendar. Weeks off are skipped, so the number goes up only when a week is actually worked. TA-6036 is Sep 14–20. The next worked week is TA-6037, Sep 28–Oct 4. There is no number for Sep 21–27.

When you log a trip:

- If that Monday–Sunday week already has a load number, the form reuses it.
- If it is a new week, the form suggests the most recent load number plus 1. Change it before saving when the week should use a different number.

The week of Nov 9–15, 2026 is TA-6043. After the seeded TA-6042 week, a new trip that week suggests TA-6043.

A paystub dates each week by the Monday after the week ends. Oct 5 is TA-6037.

## Pay rates

Sunrise is $240 and about 260 miles. MTV/SH is $260 and about 300 miles, plus $60 load/unload per MTV/SH run. Three MTV/SH runs are $780 gross plus $180 load/unload.

Those rates are stored and can be edited on the Reconcile page. Weeks and pay months show the expected gross from the rates. An MTV/SH run can also include a stop at Sunrise; the checkbox is only shown for MTV/SH and does not change the rate.

## Reconcile

The Reconcile page compares each load number with the paystub:

| Flag | Meaning |
| --- | --- |
| Match | Paid gross plus load/unload equals the expected total |
| Missing | Trips exist and that load number is not on a paystub |
| Short | The paystub total is below the expected total |
| Extra | The paystub total is above the expected total, or the line has no trips |

Miles are shown beside the money. A mile or two of difference, such as 1041 against about 1040, does not change the flag.

## What you do on the phone

1. Open https://focusshift.app/trips and sign in. The phone remembers the sign-in for 90 days.
2. Optional: browser menu → **Add to Home Screen**. The icon opens the trip form, not the marketing site.
3. Date defaults to today. Tap **Sunrise** or **MTV/SH**. For MTV/SH, check **also went to Sunrise** when that stop happened.
4. Confirm the load number, add notes or a pay amount if you want, and tap **Log trip**.
5. Recent trips are grouped by week. **Edit** and **Delete** are on each trip. Paid, disputed, or unpaid is set from History.

### Offline

If the phone has no signal, **Log trip** keeps a new trip on that phone. The next time that phone opens `/trips` while online and signed in, the trip is sent. Edits and deletes need a connection.

## Load the trips from the notes

This is safe to run more than once. Trips it already inserted are left alone, including edits. A date that already has a trip is skipped. The October paystub is inserted only if that pay month does not already have one.

From a terminal, after `TRIPS_PASSWORD` is set and the site has been redeployed:

```bash
curl -sS -X POST https://focusshift.app/trips/api/seed \
  -H "Authorization: Bearer YOUR_TRIPS_PASSWORD"
```

Or sign in on the phone, open **History**, and tap **Add trips from notes**.

The seed is:

- TA-6034: Sep 1 and 2 MTV/SH, Sep 5 and 6 Sunrise
- TA-6035: Sep 9, 10, and 12 Sunrise
- TA-6036: Sep 14 MTV/SH, Sep 16, 17, 19, and 20 Sunrise
- TA-6037: Sep 30, Oct 1, and Oct 4 Sunrise, marked paid
- TA-6038: Oct 5, 8, 10, and 11 Sunrise, marked paid
- TA-6039: Oct 14 Sunrise, marked paid
- TA-6040: Oct 20, 21, and 25 MTV/SH, marked paid
- TA-6041: Oct 27, Oct 29, and Nov 1 Sunrise
- TA-6042: Nov 2 and 3 Sunrise, Nov 7 MTV/SH

The October paystub is marked paid, net $2,856.60:

| Stub date | Load | Miles | Gross | Load/unload |
| --- | --- | --- | --- | --- |
| 2026-10-05 | TA-6037 | 780 | $720 | $0 |
| 2026-10-12 | TA-6038 | 1041 | $960 | $0 |
| 2026-10-19 | TA-6039 | 260 | $240 | $0 |
| 2026-10-26 | TA-6040 | 903 | $780 | $180 |

Plus 3 vacation days at $720.

## Scripts

Every API except health and login accepts the sign-in cookie or:

```http
Authorization: Bearer YOUR_TRIPS_PASSWORD
```

A wrong bearer token is rejected even if the browser is also signed in.

```bash
curl -sS -H "Authorization: Bearer YOUR_TRIPS_PASSWORD" \
  "https://focusshift.app/trips/api/trips?month=2026-10"

curl -sS -X PATCH \
  -H "Authorization: Bearer YOUR_TRIPS_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"paid_status":"paid"}' \
  https://focusshift.app/trips/api/trips/1
```

`paid_status` is `unpaid`, `paid`, or `disputed`.

`GET /trips/api/trips` also accepts `from` and `to` as `YYYY-MM-DD`. `month` filters by pay month, not by the calendar month of the trip date.

`GET /trips/api/suggest?date=YYYY-MM-DD` returns the load number the form would prefill.

`GET /trips/api/export?format=xlsx` and `format=csv` download the log. Excel has sheets for trips, weeks, pay months, the paystub, and reconcile.

`PUT /trips/api/settings` changes the five rates. `GET` and `POST /trips/api/paystubs`, and `PUT` and `DELETE /trips/api/paystubs/:id`, store paystubs. `GET /trips/api/reconcile?month=YYYY-MM` returns the flags.

## Local check

From this repository, with Wrangler installed:

```bash
npx wrangler pages dev . \
  --d1 DB \
  --binding TRIPS_PASSWORD=local-dev-pass \
  --port 8788
```

That database exists only on your machine. Open http://127.0.0.1:8788/trips .

Then:

```bash
curl -sS -X POST http://127.0.0.1:8788/trips/api/seed \
  -H "Authorization: Bearer local-dev-pass"
```

## If something looks wrong

| Health field | What to fix |
| --- | --- |
| `database: false` | Production binding `DB` is missing. Add the existing D1 database as `DB`, then retry the deployment. |
| `password: false` | `TRIPS_PASSWORD` is missing or was not encrypted on Production. Add it, then retry the deployment. |
| Old form on a phone | Hard-refresh, or remove the home-screen icon and add it again. |
