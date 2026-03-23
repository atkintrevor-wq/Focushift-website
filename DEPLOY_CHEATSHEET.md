# Focus Shift website — deploy cheat sheet (copy/paste)

You only need this when you want **focusshift.app** to show your latest edits.

---

## What’s going on (one picture)

| What | Where it lives |
|------|----------------|
| **The live website** | **GitHub** repo **`Focushift-website`**, branch **`main`** → **Cloudflare Pages** → **https://focusshift.app** |
| **The files you edit** | On your Mac: **`/Users/trevoratkin/Desktop/FocuShift/website/`** (this folder **is** that Git repo) |
| **The iOS app** | The rest of the **FocuShift** project — different repo, **does not** update the public site by itself |

So: **website changes = edit here → commit + push from this `website` folder.** Pushing the big FocuShift app repo does **not** deploy the marketing site unless you’ve set something special up (you haven’t).

---

## Every time you change the site (normal)

1. Save your files in Cursor (`index.html`, `styles.css`, `images/`, etc.).

2. Open **Terminal** and paste this whole block (you can change the message in quotes):

```bash
cd /Users/trevoratkin/Desktop/FocuShift/website
git pull --rebase origin main
git add -A
git status
git commit -m "Update website"
git push origin main
```

3. Wait **1–3 minutes**, then open **https://focusshift.app** and **hard refresh** (or use a private window).

**Why `git pull` first?** So if you edited on GitHub or another computer, you don’t get “push rejected.”

---

## If `git push` says rejected / “fetch first” / “non-fast-forward”

Something new is on GitHub that your Mac doesn’t have. Paste:

```bash
cd /Users/trevoratkin/Desktop/FocuShift/website
git pull --rebase origin main
```

- If it finishes **without** the word **CONFLICT**: run the **commit + push** lines again from the block above (`git add -A` … `git push`).
- If it says **CONFLICT** or asks you to fix files: stop and paste the **full Terminal output** into Cursor so we can fix it together.

---

## Optional: fix the “repository moved” message

GitHub may show the repo name with a capital **F**. One-time:

```bash
cd /Users/trevoratkin/Desktop/FocuShift/website
git remote set-url origin https://github.com/atkintrevor-wq/Focushift-website.git
```

---

## Don’t use the old “copy to Desktop” flow

Unless you **know** you keep a second clone on the Desktop, treat **`FocuShift/website`** as the only place you commit from. That avoids two copies getting out of sync.

---

## For the AI assistant in Cursor

When helping with the **public site**, assume:

- Source of truth for deploy is **`/Users/trevoratkin/Desktop/FocuShift/website`** → remote **`origin`** = **`https://github.com/atkintrevor-wq/Focushift-website.git`** (or **`Focushift-website.git`**), branch **`main`**.
- After editing `website/*`, give the user the **copy/paste block** from this file (pull → add → commit → push).

Project rule file: **`.cursor/rules/website-deploy.mdc`**.
