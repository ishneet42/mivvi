# Deploying Mivvi

Goal: a public HTTPS URL (`mivvi.vercel.app` or similar) that your user-study
friends can open on their phones, sign in, and actually use.

**Stack:** Vercel (web) + Neon (Postgres + pgvector) + Render (FastAPI parser).
All free tier. **~30 minutes** end-to-end if everything goes smoothly.

---

## 0. Prereqs

Accounts you'll need (free, 1 min each):
- **GitHub** — you have one
- **Vercel** → https://vercel.com/signup (sign in with GitHub)
- **Neon** → https://console.neon.tech (sign in with GitHub)
- **Render** → https://dashboard.render.com (sign in with GitHub)
- **Clerk** — already configured

Keep these tabs open.

---

## 1. Push Mivvi to GitHub (5 min)

The existing `apps/web/` has spliit's upstream git history inside it. We
flatten it into a single repo owned by you.

```bash
cd ~/Desktop/snap-split

# Remove the nested spliit git repo so this becomes one monorepo
rm -rf apps/web/.git

# Initialize fresh at the root
git init
git add .
git status           # sanity: check no .env / container.env is staged
git commit -m "Initial Mivvi monorepo"
```

Create a new **private** repo on GitHub called `mivvi`, then:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/mivvi.git
git push -u origin main
```

---

## 2. Create the Neon database (3 min)

1. Go to **https://console.neon.tech** → **Create project**
2. Name: `mivvi`, region closest to you, Postgres version 16
3. On the dashboard, go to **Extensions** (left sidebar) → enable **pgvector**
4. Back on the dashboard, click **Connection Details** → copy two URLs:
   - **Pooled connection** (looks like `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`)
   - **Direct connection** (same but without `-pooler`)

You'll paste these into Vercel's env vars in a moment. Keep them handy.

---

## 3. Deploy the parser to Render (6 min)

1. Go to **https://dashboard.render.com** → **New +** → **Web Service**
2. **Connect** your GitHub repo `mivvi`
3. Settings:
   - **Name:** `mivvi-parser`
   - **Region:** same as Neon
   - **Branch:** `main`
   - **Root Directory:** `services/parser`
   - **Runtime:** **Docker** (Render will use the Dockerfile you already have)
   - **Instance type:** **Free**
4. **Environment Variables** (click "Advanced" → "Add Environment Variable"):
   - `OPENAI_API_KEY` = your real OpenAI key (starts with `sk-proj-...`)
   - `PARSER_MODEL` = `gpt-4o`
5. Click **Create Web Service** → wait ~3 min for first build
6. When it's live, copy the public URL (looks like `https://mivvi-parser.onrender.com`)

**Verify:**
```bash
curl https://mivvi-parser.onrender.com/health
# → {"ok":true,"model":"gpt-4o"}
```

---

## 4. Deploy the web app to Vercel (8 min)

1. Go to **https://vercel.com/new** → **Import Git Repository** → pick `mivvi`
2. Settings:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `apps/web` (click "Edit" to set this)
   - **Build Command:** leave default (`next build`)
   - **Install Command:** leave default (`npm install` — our `postinstall`
     hook runs `prisma migrate deploy` automatically, applying every
     migration to Neon)
3. **Environment Variables** — add each of these before clicking Deploy:

   ```
   POSTGRES_PRISMA_URL         = <Neon pooled URL>
   POSTGRES_URL_NON_POOLING    = <Neon direct URL>

   OPENAI_API_KEY              = <your OpenAI key>
   MIVVI_PARSER_URL            = https://mivvi-parser.onrender.com

   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  = pk_test_c3F1YXJlLXBvbGVjYXQtNDIuY2xlcmsuYWNjb3VudHMuZGV2JA
   CLERK_SECRET_KEY                    = <your Clerk sk_test_... from clerk.dev>
   NEXT_PUBLIC_CLERK_SIGN_IN_URL       = /sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL       = /sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL = /groups
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL = /groups

   NEXT_PUBLIC_BASE_URL        = https://mivvi.vercel.app
   MIVVI_EVAL_TOKEN            = <any random 48-char hex; optional for prod>
   ```

4. Click **Deploy** → wait ~2 min for first build.
   - If the build fails on migrations, see **Troubleshooting** below.

5. When live, copy the assigned domain (e.g. `mivvi-abc123.vercel.app`).
   Go to **Settings → Domains** and optionally assign a cleaner subdomain.

---

## 5. Tell Clerk about the new domain (2 min)

Your Clerk app is currently a dev instance. You need to either:

**Option A (quickest, for demo/user study):** Dev instance accepts any host.
Nothing to change. Users will see a small Clerk "Development mode" banner.

**Option B (polished, takes ~5 extra min):** Create a production Clerk instance.
1. Go to https://dashboard.clerk.com → your app → **Deploy**
2. **Add domain**: paste your Vercel URL
3. Clerk will generate **production** keys — replace Vercel's
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` with the
   new `pk_live_...` / `sk_live_...` values
4. Redeploy (Vercel auto-redeploys on env change)

For the user study, **Option A is fine.**

---

## 6. Smoke test (3 min)

1. Open your Vercel URL in an **incognito window**
2. Landing page shows → click **Start splitting**
3. Sign up with Google (or email) → redirects to `/groups`
4. Create a group → verify Members tab shows you as OWNER with your emoji avatar
5. Click **Scan** tab → grant camera permission → point at a real receipt →
   verify you see parsed items and can assign them
6. Click **Finalize** → verify the expense appears on the Expenses tab

If any step fails, see **Troubleshooting**.

---

## 7. Test multi-user (5 min)

This is the test that matters for the user study:

1. Back in the group → **Members** tab → **Create invite link**
2. Copy the link, open in a **different incognito window** (or a different
   device, or send to your phone)
3. Sign up as a second Google account
4. Pick a participant, accept → second user is in the group
5. Have user #2 add an expense
6. Return to user #1's window, refresh Expenses → their expense should appear

If this works, you can run the user study for real. Send the invite link to
friends via text or WhatsApp.

---

## Troubleshooting

### Vercel build fails during `prisma migrate deploy`

Usually means Neon isn't reachable or pgvector isn't enabled.
- Confirm both URLs in Vercel env match what Neon shows under Connection Details
- Confirm pgvector is enabled on Neon (dashboard → Extensions → `vector` should show ✓)
- Re-run the deploy from Vercel (**Deployments → ⋯ → Redeploy**)

### "Publishable key not valid" on the live site

You forgot to set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or set it to a dummy
value. Go to Vercel → Settings → Environment Variables → verify the real
pk_test (or pk_live) value is there, then redeploy.

### Camera doesn't work on your phone

`getUserMedia` requires HTTPS. Vercel auto-serves HTTPS, so the deployed
version should work. If you land on a `/sign-in` redirect loop first, make
sure you're tapping the scan tab after sign-in.

### Receipt upload fails with 500 / network error

Parser is either asleep (Render free tier spins down after 15 min idle) or
OPENAI_API_KEY isn't set on Render. Cold start takes ~30s on first request.
Hit `https://mivvi-parser.onrender.com/health` in a browser to wake it up.

### Images (avatars) don't load in prod

Clerk's CDN is already allowlisted in `next.config.mjs`. If you added other
image hosts, add them there.

---

## Cost expectations

- **Vercel free** (Hobby): unlimited for personal use, 100 GB bandwidth/mo
- **Neon free**: 512 MB storage, plenty for a class project
- **Render free**: 750 hr/mo (parser will spin down when idle)
- **OpenAI**: $0.001–$0.01 per receipt + $0.0008 per agent turn. $5 lasts
  hundreds of demos. Already accounted for by your topped-up account.

**Total ongoing cost: $0** (OpenAI charges are usage-based and already covered).

---

## What to share with user-study friends

Once deployed, send each friend:

```
Hey, I built this for a class project — Mivvi, an AI bill splitter.
Try it next time we split something:

→ https://mivvi.vercel.app

Sign in with Google, then snap a receipt.
Would love your feedback — even a 30-second reaction.
```

Then send them the invite link to a group you've created for the dinner.

---

## After deploy: what to tell me

Once you're live, come back and say "deployed" with the URL. I'll:
- Help you write the Application Document (12 sections per rubric)
- Script the 5-min demo video
- Outline the pitch deck
- Plan the dinner user study
