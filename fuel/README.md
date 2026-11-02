# IFTA fuel log

A small fuel-purchase log for about five drivers. Drivers save stops from a phone. The office reviews gallons and dollars by state and by quarter, then downloads an Excel file for IFTA.

It lives on the existing Focus Shift site. Nothing else on the site changes.

| Who | URL |
| --- | --- |
| Drivers | https://focusshift.app/fuel |
| Office | https://focusshift.app/fuel/admin |
| Setup check | https://focusshift.app/fuel/api/health |

The same paths work on the `*.pages.dev` hostname this project already uses. Add `/fuel` to the end of that hostname.

## Why this is a path, not a subdomain

The live site is one Cloudflare Pages project. GitHub pushes of this repo publish it. A name like `fuel.focusshift.app` would need a new DNS record and a second project or a Worker route, and it would not follow that same push.

`/fuel` is published with the rest of the site. The installable phone app is limited to `/fuel/`, so adding it to a home screen does not take over focusshift.app. No DNS change is required.

## How this deploys

This repository is already connected to **Cloudflare Pages**. There is no GitHub Action and no build step.

- Production branch: `main`
- Build command: none. Leave it that way.
- Build output: the repository root (`/`), the folder that contains `index.html`. Leave it that way.
- Pushing `main` publishes the static files and the Pages Functions in `functions/`.

`_routes.json` tells Pages to run a Function only for `/fuel/api/*`. The marketing pages, audio, and images stay static. They do not count against the Functions request allowance, and a problem in the fuel log cannot replace those pages.

This folder does **not** add a `wrangler.toml`. On a Pages project that is already configured in the dashboard, that file becomes the source of truth and can override the build settings. A missing database id in that file can fail the deployment of the whole site. Create the database and the photo bucket in the dashboard instead, using the steps below.

Merging the pull request is what publishes the app. The live site does not change until `main` updates.

## What you do in the Cloudflare dashboard

Do this once, on the Cloudflare account that already hosts focusshift.app. The names below have to match exactly. Pages only attaches a binding to deployments that happen **after** you save it. Either finish these steps and then merge, or merge first and then use **Retry deployment** on the latest production deployment.

### 1. Create the database

1. In the Cloudflare dashboard, go to **Storage & databases → D1 SQL database** (older dashboards: **Workers & Pages → D1**).
2. **Create** a database named `fuel-log`.
3. You do not need to paste any SQL. The app creates its tables the first time a driver saves a stop or someone opens the office page.

### 2. Create the receipt-photo bucket

1. Go to **R2 Object Storage**.
2. **Create bucket** named `fuel-receipts`.
3. Leave the bucket **private**. Do not turn on the public `r2.dev` URL. Drivers and the office open photos only through the signed-in admin page.

Receipt photos are optional. If you skip this step, fuel stops still save. The driver sees a note that the photo was not stored. You can add the bucket later and retry a deployment; new photos will start saving. Photos from before the bucket existed are not backfilled.

R2’s free allowance includes storage and has no egress fee, which is what makes receipt photos practical here. Five drivers will not get near that allowance.

### 3. Attach both to the Pages project

1. Go to **Workers & Pages** and open the project that serves **focusshift.app**. Do not create a new project.
2. Open **Settings → Bindings**.
3. Select the **Production** tab.
4. **Add → D1 database**.
   - Variable name: `DB`
   - D1 database: `fuel-log`
5. **Add → R2 bucket**.
   - Variable name: `RECEIPTS`
   - R2 bucket: `fuel-receipts`
6. Save.

Preview deployments (pull requests and the `web-staging` branch) have their own bindings. Add them on the **Preview** tab only if you want a preview URL to save real stops. Prefer a second database, `fuel-log-preview`, so practice entries stay out of the office log. The production site does not read preview bindings.

### 4. Set the office password

1. In the same Pages project, open **Settings → Variables and Secrets**.
2. Stay on **Production**.
3. **Add**.
   - Name: `FUEL_ADMIN_PASSWORD`
   - Value: a password you choose. Store it in a password manager. This is the only office password; it is not a personal account for each driver.
4. Select **Encrypt**, then **Save**. Encrypt keeps it as a secret. Do not leave it as a plain text variable.

Optional, same screen, also encrypted:

| Name | When to set it |
| --- | --- |
| `FUEL_DRIVER_PIN` | Recommended. The driver form is on a public website. Without this, anyone who can open `/fuel` can add a fuel stop. They still cannot see the list, the photos, or the spreadsheet. With this set, the form asks for the PIN. Phones remember it after the first entry. |
| `FUEL_SESSION_SECRET` | Optional. A long random string (`openssl rand -base64 32`). It signs the office sign-in cookie. If you skip it, the admin password is used for that signature. Changing the admin password then signs everyone out, which is fine. |

Add the same secrets on the **Preview** tab only if you want to sign in on a preview URL.

### 5. Publish the bindings

Bindings and secrets apply to the next deployment, not to one that already finished.

- If you have not merged yet: merge the pull request to `main` and wait a couple of minutes.
- If `main` already deployed before you saved the bindings: open the Pages project → **Deployments** → the latest **Production** deployment → **Retry deployment**.

Do not change the build command or the output directory.

### 6. Check that it worked

Open https://focusshift.app/fuel/api/health

You want:

```json
{
  "ok": true,
  "database": true,
  "receipts": true,
  "admin_password": true,
  "driver_pin": true
}
```

`driver_pin` is `false` until you set `FUEL_DRIVER_PIN`. `receipts` is `false` until the R2 binding exists. The driver form still works in those cases.

Then open https://focusshift.app/fuel/admin and sign in. The first sign-in creates the tables.

Under **Settings → Runtime → Fail open / closed**, leave **Fail open** if that control is shown. The fuel API is the only part that uses Functions. Fail open means the marketing site keeps loading if the daily Functions allowance is ever used up.

## What drivers do

1. Open https://focusshift.app/fuel on the phone.
2. Optional: browser menu → **Add to Home Screen**. The icon opens the fuel form, not the Focus Shift marketing site.
3. Date defaults to today. Pick the state, or tap **Use current location**. Location is sent only to fill in the state. It is not stored.
4. Enter the station, gallons, total price, truck, and name. A receipt photo is optional (camera or library).
5. Save.

The phone remembers the last driver, truck, and PIN. It also keeps a short list of names you have used.

### Offline

If the phone has no signal, **Save** keeps the stop on that phone, including the photo. The next time that phone opens `/fuel` while online, the stop is sent. Closing the app does not upload by itself; someone has to open the fuel page once the phone is back online.

Offline open works after the page has been loaded once online, and it is more reliable from the home-screen icon than from a fresh browser tab. iPhone can eventually drop a saved page. The queued stop itself stays on the phone until it sends or the browser data for this site is cleared.

A stop that the server rejects (a bad date, for example) is dropped from the queue and the reason is shown. A wrong PIN is kept until the PIN on the form is corrected and **Send now** is tapped.

## What the office sees

https://focusshift.app/fuel/admin asks for `FUEL_ADMIN_PASSWORD`. The sign-in lasts 7 days in that browser. Eight wrong attempts from the same network lock sign-in for 15 minutes.

After sign-in:

- Entries, with filters for state, year, quarter, and driver.
- Total gallons and dollars. The state table and the quarter table follow those filters. Clear the filters for the whole log. Quarters are calendar quarters (Q1 is January–March), which is the IFTA period.
- **Download Excel (.xlsx)** uses the same filters. The file has three sheets: **Entries**, **By State**, and **By Quarter**.
- Receipt photos open from the list. They are not public.
- **Delete** removes a bad stop and its photo. There is no edit. Delete it and have the driver enter it again.

This is a log for preparing IFTA. It does not file a return or calculate tax rates.

## If something looks wrong

| Health field | What to fix |
| --- | --- |
| `database: false` | Production binding `DB` is missing. Add it, then retry the deployment. |
| `receipts: false` | Production binding `RECEIPTS` is missing. Entries still save. |
| `admin_password: false` | `FUEL_ADMIN_PASSWORD` is missing or was not encrypted on Production. Add it, then retry the deployment. |
| Admin says the password is not set | Same as `admin_password: false`, or you are on a preview URL whose Preview bindings were not set. |
| Old form on a phone | Hard-refresh, or remove the home-screen icon and add it again. |

The marketing site, `/login`, `/privacy`, `/terms`, `/support`, and `/s/...` share this Pages project and are unchanged.

## Fallback SQL

You do not need to run this. It is the same table the app creates on its own, if you want to look in the D1 console.

```sql
CREATE TABLE IF NOT EXISTS fuel_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT UNIQUE,
  purchase_date TEXT NOT NULL,
  state TEXT NOT NULL,
  station_name TEXT NOT NULL,
  gallons REAL NOT NULL,
  total_price REAL NOT NULL,
  truck_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  receipt_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Local check

From this repository, with [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed:

```bash
npx wrangler pages dev . \
  --d1 DB \
  --r2 RECEIPTS \
  --binding FUEL_ADMIN_PASSWORD=local-dev-pass \
  --binding FUEL_DRIVER_PIN=2468 \
  --port 8788
```

That database and bucket exist only on your machine. The command does not change Cloudflare. Open http://127.0.0.1:8788/fuel and http://127.0.0.1:8788/fuel/admin .
