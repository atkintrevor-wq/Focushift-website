# Push this website to your GitHub Pages repo

Your **live site** is usually deployed from a **separate** GitHub repository (e.g. `Focushift-website`), not from this iOS monorepo. These files live here so you have a single place to edit; copy them into that repo and push.

## One-time: clone your website repo (if you don’t have it yet)

Replace the URL if your repo name or account is different:

```bash
cd ~/Desktop
git clone https://github.com/atkintrevor-wq/Focushift-website.git
```

If the folder already exists, skip `git clone` and just `cd` into it.

---

## Every time you update the site from this project

**1. Copy files** (overwrites matching files in the website repo):

```bash
# Adjust the destination if your clone lives somewhere else
cp -R /Users/trevoratkin/Desktop/FocuShift/website/* ~/Desktop/Focushift-website/
```

**2. Commit and push:**

```bash
cd ~/Desktop/Focushift-website
git add -A
git status
git commit -m "Focus Shift branding, focusshift.app canonical, updated landing copy"
git push origin main
```

Cloudflare Pages will rebuild from `main` automatically (usually 1–3 minutes).

---

## After you push

1. Open **https://focusshift.app** and hard-refresh (or use a private window).
2. In **index.html**, set the real **TestFlight** link on the primary button (replace `https://testflight.apple.com/`).

---

## If you don’t use `~/Desktop/Focushift-website`

Find your clone:

```bash
mdfind -name Focushift-website 2>/dev/null
```

Then change the `cp` and `cd` paths in the steps above to match.
