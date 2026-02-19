# Deploy FocuShift Landing Page to Cloudflare Pages

This guide walks you through deploying the landing page to focushift.app using Cloudflare Pages.

---

## Before You Start

- **Domain:** focushift.app (you have this in Cloudflare)
- **Hosting:** Cloudflare Pages (free tier)
- **Account:** Cloudflare account, GitHub account

---

## Option A: Deploy via GitHub (Recommended — you learn the flow)

### 1. Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name it something like `focushift-website` (or `focushift-landing`)
3. Choose **Public**
4. Do **not** initialize with a README (the `website/` folder already has files)
5. Click **Create repository**

### 2. Push the website files to GitHub

Open Terminal and run:

```bash
cd /Users/trevoratkin/Desktop/FocuShift

# Create a new git repo in the website folder (or use the parent — see below)
cd website
git init
git add .
git commit -m "Initial landing page"

# Add your GitHub repo as remote (replace YOUR_USERNAME and YOUR_REPO with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/focushift-website.git

# Push (main branch)
git branch -M main
git push -u origin main
```

**Alternative:** If you prefer to keep the site in a subfolder of your main FocuShift project, you can:

1. Initialize git in `/Users/trevoratkin/Desktop/FocuShift` (if not already)
2. Push the whole project
3. In Cloudflare Pages, set the **Root directory** to `website`

### 3. Connect Cloudflare Pages to GitHub

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the left sidebar, click **Workers & Pages**
3. Click **Create application** → **Pages** → **Connect to Git**
4. Click **Connect GitHub** and authorize Cloudflare
5. Select your repository (e.g. `focushift-website`)
6. Configure the build:
   - **Project name:** `focushift` (or any name you like)
   - **Production branch:** `main`
   - **Build settings:**
     - **Framework preset:** None
     - **Build command:** (leave empty)
     - **Build output directory:** `/` (if your repo root is the website) or `/website` if you're deploying from the full project with root set to `website`)

7. Click **Save and Deploy**

### 4. Add your custom domain (focushift.app)

1. After the first deploy finishes, open your Pages project
2. Go to **Custom domains**
3. Click **Set up a custom domain**
4. Enter `focushift.app` and `www.focushift.app`
5. Cloudflare will add DNS records automatically (since your domain is already in Cloudflare)

---

## Option B: Deploy via Direct Upload (No GitHub)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **Create application** → **Pages** → **Upload assets**
3. Name the project `focushift`
4. Drag and drop the contents of the `website/` folder:
   - `index.html`
   - `styles.css`
   - `script.js`
5. Click **Deploy site**
6. In the project, go to **Custom domains** and add `focushift.app`

---

## After Deployment

### Update the TestFlight link

1. Get your TestFlight public link from App Store Connect (TestFlight → Your App → Public Link)
2. In `index.html`, replace `YOUR_INVITE_CODE` with your actual invite code in both button URLs
3. Or replace the full URL:  
   `https://testflight.apple.com/join/YOUR_INVITE_CODE`  
   with your real TestFlight link
4. Redeploy (push to GitHub if using Option A, or upload the updated files if using Option B)

---

## Quick Test Locally

To preview the site before deploying:

```bash
cd /Users/trevoratkin/Desktop/FocuShift/website
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.
