# Step-by-step: Firebase + Firestore + deploy (Focus Shift web)

Your live site is **https://focusshift.app** (spelling: **focus** + **shift** — two s’s in “focus”).

Use this checklist in order. Pause after each **big step** and test if noted.

---

## Part A — Firebase: add a Web app and copy config

**Goal:** Get the `firebaseConfig` object into `website/js/firebase-config.js`.

1. Open **https://console.firebase.google.com** in your browser.
2. Click the **Focus Shift** project (the **same** project the iOS app uses — if you’re unsure, the **project ID** in Xcode / `GoogleService-Info.plist` should match).
3. Click the **gear icon** next to “Project Overview” → **Project settings**.
4. Scroll to **Your apps**. You should see the **iOS** app already. Click **Add app** → choose **Web** (`</>` icon).
5. **App nickname:** e.g. `focusshift-web` → **Register app** (you can skip Hosting for now if it asks).
6. Firebase shows **“Add Firebase SDK”** with a code snippet. Find the **`firebaseConfig`** object (it has `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
7. On your Mac, open this file in Cursor (or any editor):

   **`/Users/trevoratkin/Desktop/FocuShift/website/js/firebase-config.js`**

8. Replace the **placeholder** values so it looks like Firebase’s snippet, but assigned to **`window.fsFirebaseConfig`**. Example shape:

   ```javascript
   window.fsFirebaseConfig = {
     apiKey: "…real value…",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "…",
     appId: "1:…:web:…"
   };
   ```

9. **Save** the file.

**Check:** The strings `REPLACE_WITH_` should no longer appear in that file.

---

## Part B — Firebase: turn on Email/Password and Google

**Goal:** Same sign-in methods you want on the web.

1. In Firebase Console, left sidebar → **Build** → **Authentication**.
2. Open the **Sign-in method** tab.
3. **Email/Password**  
   - Click it → set **Enable** → **Save**.
4. **Google**  
   - Click **Google** → toggle **Enable** → choose a **Project support email** (your email is fine) → **Save**.  
   - If Google asks you to configure **OAuth consent screen**, follow the prompts in **Google Cloud Console** (Firebase often opens this for you). For internal testing, “Testing” mode is OK until you publish the app.

**Check:** Both providers show as **Enabled** on the Sign-in method list.

---

## Part B2 — Apple Sign In (one Firebase Services ID — iOS wins)

**Important:** Firebase Authentication allows **only one** Apple **Services ID** per project. That value must match the **`aud`** claim in Apple’s ID token:

| Platform | Token audience | Firebase Services ID must be |
|----------|----------------|------------------------------|
| **iOS app** (native Sign in with Apple) | `com.trevoratkin.FocuShift` (bundle ID) | **`com.trevoratkin.FocuShift`** |
| **Web** (OAuth popup) | `com.trevoratkin.FocuShift.firebase` (web Services ID) | Conflicts with iOS — see below |

**Use this in Firebase Console → Authentication → Apple:**

| Field | Value |
|-------|--------|
| **Services ID** | **`com.trevoratkin.FocuShift`** (bundle ID — **not** `.firebase`) |
| **Team ID** | `A88DZ5BB6U` |
| **Key ID** | Your Sign in with Apple key |
| **Private key** | Same `.p8` file as before |

If Services ID is set to `com.trevoratkin.FocuShift.firebase`, **iOS Apple Sign In fails** (error 17004 / invalid credential). If you changed it for web, **change it back** to the bundle ID above.

### Apple Developer (keep web Services ID for later)

You can still create/configure the **web** Services ID (`com.trevoratkin.FocuShift.firebase`) with Return URL  
`https://focushift-eeb60.firebaseapp.com/__/auth/handler` — but **do not** put that ID in Firebase until Firebase supports multiple audiences (or you drop native iOS Apple).

### Web sign-in today

Because of the single-ID limit, **Continue with Apple on the web is disabled** in the login UI. On the web use:

- **Email/password** or **Google**
- Same account as iOS (your admin, Stripe plan, and library follow that uid)

Use **Sign in with Apple on the iOS app** for Apple login. Linking Apple from the web app is also disabled for the same reason.

**Check:** iOS Apple Sign In works after Firebase Services ID = `com.trevoratkin.FocuShift`. Web `/login/` shows email + Google (no Apple button).

---

## Part C — Firebase: authorized domains (fixes “popup blocked / unauthorized domain”)

**Goal:** Allow sign-in from your real site and from your computer.

1. Still under **Authentication**, open the **Settings** tab (sometimes at the top of the Auth section).
2. Scroll to **Authorized domains**.
3. You should already see **`localhost`** and your **`*.firebaseapp.com`** host. **Add** these if missing:
   - **`focusshift.app`**
   - **`www.focusshift.app`** (add if you use www in the browser)
4. **Preview URLs (Cloudflare):** When you use a preview link later, it will look like `something.pages.dev`. Firebase **does not** support wildcards like `*.pages.dev` in one line — **add each exact preview hostname** the first time Google shows an error for it, **or** test only on `focusshift.app` until previews are set up.

**Check:** Domains list includes at least **`focusshift.app`** and **`localhost`**.

---

## Part D — Deploy Firestore security rules (parent repo)

**Goal:** Deploy the updated `firestore.rules` from the **FocuShift** folder (not only `website/`), so `isAdmin` can’t be self-granted from any client.

1. Open **Terminal**.
2. If you’ve never used Firebase CLI on this Mac:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. Go to the **iOS monorepo root** (where `firestore.rules` lives):

   ```bash
   cd /Users/trevoratkin/Desktop/FocuShift
   ```

4. If this folder isn’t linked to Firebase yet, run once (pick your project in the browser):

   ```bash
   firebase use --add
   ```

5. Deploy **only** Firestore rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

6. Wait for **“Deploy complete”**.

**Check:** Firebase Console → **Firestore** → **Rules** → revision timestamp updated.

**Giving someone admin:** In Firestore, document **`users/{theirUid}`** → field **`isAdmin`** = **`true`** (boolean). Only do this for trusted people.

---

## Part E — Deploy the website (nested `website/` repo)

**Goal:** Push `website/` to GitHub so Cloudflare Pages rebuilds **focusshift.app**.

1. Terminal:

   ```bash
   cd /Users/trevoratkin/Desktop/FocuShift/website
   git pull --rebase origin main
   git status
   ```

2. You should see **`js/firebase-config.js`** (and any other edits) as modified. **Do not commit** real secrets to a **public** repo if you’re uncomfortable — for Firebase **Web API keys** it’s normal they’re in client code; still use a **private** GitHub repo if you want extra caution.

3. Commit and push:

   ```bash
   git add -A
   git status
   git commit -m "Add web login and Firebase config"
   git push origin main
   ```

4. Wait **1–3 minutes**, then open **https://focusshift.app/login/** in a **private window** and try **Sign in** / **Google**.

Full copy-paste flow is also in **`DEPLOY_CHEATSHEET.md`**.

**Check:** Login page loads without the yellow “Firebase Web config is not set” banner (that banner means Part A isn’t finished).

---

## Part F — Cloudflare Pages: optional staging branch (recommended)

**Goal:** Test changes on a **preview URL** before they hit `main` / **focusshift.app**.

1. Open **Cloudflare Dashboard** → **Workers & Pages** → your **Focus Shift** Pages project (the one connected to **Focushift-website**).
2. **Settings** → **Builds & deployments** (names vary) → find **Preview deployments** / **Branch preview** controls.
3. In Terminal, from **`website/`**:

   ```bash
   git checkout -b web-staging
   git push -u origin web-staging
   ```

4. In Cloudflare, confirm **preview** builds for `web-staging` and copy the **`*.pages.dev`** URL Cloudflare gives you.
5. Add that **exact** hostname under Firebase **Authorized domains** (Part C) if Google sign-in complains.

**Check:** Pushing to `web-staging` updates the preview URL; merging to `main` updates **focusshift.app**.

---

## If something fails

| Symptom | What to try |
|--------|----------------|
| Yellow banner on `/login/` | `firebase-config.js` still has `REPLACE_` or wrong project. |
| Google: **unauthorized domain** | Part C — add the **exact** host from the address bar. |
| **Permission denied** in browser console on Firestore | Rules not deployed (Part D) or user not signed in. |
| Email sign-in works on iOS but not web | Wrong Firebase **project** in `firebase-config.js` or provider not enabled (Part B). |
| Apple: **operation-not-allowed** | Enable Apple in Firebase (Part B2). |
| Apple iOS: **17004** / invalid credential | Firebase Services ID must be **`com.trevoratkin.FocuShift`**, not `.firebase`. |
| Apple web popup fails | Expected while Firebase allows only one Services ID; use email/Google on web. |
| Apple: **account exists with different credential** | User already signed up with email/Google; sign in that way first (same email). |
| `firebase deploy` errors | Run from **`/Users/trevoratkin/Desktop/FocuShift`**, not `website/`. |

---

## Quick reference — your paths

| What | Path |
|------|------|
| Firebase config (edit this) | `/Users/trevoratkin/Desktop/FocuShift/website/js/firebase-config.js` |
| Firestore rules (deploy from parent) | `/Users/trevoratkin/Desktop/FocuShift/firestore.rules` |
| Website git repo | `/Users/trevoratkin/Desktop/FocuShift/website/` |
| Deploy commands | `website/DEPLOY_CHEATSHEET.md` |

When a step blocks you, note **which part (A–F)** and the **exact error message** (or a screenshot) and we can fix the next decision together.
