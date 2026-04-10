# Universal Links + share landing page (website)

You deploy the **marketing site** from GitHub (e.g. **Focushift-website**). This folder in the **FocuShift app monorepo** is the **source of truth** for a few files you must place at the **root** of that site (same level as `index.html`).

## What you get

1. **Apple Universal Links** — iOS can open the app for `https://focusshift.app/s/...`
2. **Share landing page** — If someone opens the link in a desktop browser (or Safari before the app opens), they see a short “shared audio” page instead of your broken homepage layout.

---

## Easiest way (script)

1. On your Mac, open **Terminal**.
2. Clone or locate your website folder (e.g. `~/Desktop/Focushift-website`).
3. Run (fix the path to match **your** website folder):

```bash
cd /Users/trevoratkin/Desktop/FocuShift/website
chmod +x copy-these-files-to-your-site-repo.sh
./copy-these-files-to-your-site-repo.sh /path/to/Focushift-website
```

4. The script prints the exact `git` commands. Run them in your website repo folder, then wait for Cloudflare Pages to deploy (~1–2 minutes).

---

## Manual way (same result)

From **this** folder `FocuShift/website/`, copy these into **the root of your website repo**:

| File | Purpose |
|------|---------|
| `.well-known/apple-app-site-association` | Apple verification for `/s/*` and `/share/*` |
| `_headers` | Sets correct `Content-Type` for the file above (Cloudflare Pages) |
| `_redirects` | Rewrites `/s/*` to the share landing HTML (so the URL stays `/s/your-token`) |
| `share-link-fallback.html` | The actual “someone shared audio” page |

**Important:** `apple-app-site-association` must have **no** `.json` extension.

### Folder layout on the website repo

```
Focushift-website/
  index.html
  styles.css
  ...
  _headers
  _redirects
  share-link-fallback.html
  .well-known/
    apple-app-site-association
```

### Git (website repo)

```bash
cd /path/to/Focushift-website
git add .well-known/apple-app-site-association _headers _redirects share-link-fallback.html
git commit -m "Add share link landing page and /s/* rewrite for Universal Links"
git push
```

---

## If you already have a `_redirects` file

Cloudflare only uses **one** `_redirects` at the site root. Open your existing file and **add this line** (if it’s not there yet):

```text
/s/* /share-link-fallback.html 200
```

The `200` means “serve that file but keep `/s/...` in the address bar.”

---

## Check it worked

After deploy:

1. **AASA (Apple):**

```bash
curl -sI "https://focusshift.app/.well-known/apple-app-site-association"
```

Expect **HTTP 200** and `Content-Type` containing **`application/json`**.

2. **Share page (browser):** open something like:

`https://focusshift.app/s/test-token`

You should see **“Someone shared Focus Shift audio with you”** — not the long marketing homepage.

---

## Xcode (separate from website)

The app needs Associated Domains, e.g. `applinks:focusshift.app` (already in the FocuShift project when sharing is enabled).

---

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| 404 on AASA | `.well-known` not at site root; wrong Pages output directory |
| Wrong Content-Type on AASA | `_headers` missing or not at repo root |
| `/s/xxx` still shows homepage | `_redirects` not deployed; merge the `/s/*` line; redeploy |
| App still opens Safari only | Check Associated Domains; open link from Notes/Messages on **iPhone** |

**Team ID** `A88DZ5BB6U` and **bundle ID** `com.trevoratkin.FocuShift` must match `apple-app-site-association` if you change them in Xcode.
