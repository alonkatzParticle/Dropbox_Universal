# Dropbox Automation Blurr

This repository contains the fully-configured system capable of intelligently reading and classifying task activity on Monday.com to automatically generate appropriately-named hierarchy structures inside Dropbox. 

The architecture handles everything fully autonomously and was built specifically with **Vercel Serverless** and **Vercel KV Serverless Storage** compatibility out of the box.

## How to Deploy to Vercel

The application seamlessly tracks data locally when running on your personal machine using `.json` files, but running it in production on Vercel requires those files to be injected as Environment Variables so they can instantly bootstrap **Vercel KV** storage!

### Step 1: Upload to GitHub
1. Create a blank private repository on your GitHub account.
2. In your terminal, inside this project directory, run:
   ```bash
   git branch -M main
   git remote add origin https://github.com/your-username/your-new-repo.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log into your Vercel Dashboard.
2. Click **Add New Project** and import the repository you just pushed.
3. Don't hit deploy yet! Skip straight to configuring **Environment Variables**.

### Step 3: Configure Environment Variables
You MUST set the exact underlying keys that power your Monday and Dropbox bridges before the deployment kicks off. 

Add the following environment variables exactly as they are configured in your local `.env`:
- `MONDAY_API_TOKEN` - The long-lived API v2 Token
- `DROPBOX_APP_KEY` - The App Key
- `DROPBOX_APP_SECRET` - The App Secret
- `DROPBOX_REFRESH_TOKEN` - The long-lived, validated Dropbox Refresh Token
- `CRON_SECRET` - A securely generated random secret key string (like `sec_12345`). You will need this to secure the background polling hook against external abuse!

**The Most Critical Setting:**
Because Vercel is stateless and Serverless, the `config.json` rulebook that dictates how you want your hierarchies to look must be provided at boot so Vercel can bake it into its KV system:
- Open your local `config.json` and copy EVERYTHING inside it.
- Add an environment variable named `CONFIG_JSON` and paste the raw massive string into it! 
(*Vercel will ingest this payload on its very first run and permanently save it!*)

### Step 4: Add Vercel KV Storage
For the system to persist which items it has already checked in the background seamlessly, you must provision its data storage:
1. Navigate to the **"Storage"** tab of your Vercel dashboard.
2. Click **Add Database** and spin up a **Vercel KV** (Redis serverless) storage bucket.
3. Once the database finishes creating, just click **Connect** to link it physically to your project. This automatically handles injecting the `KV_REST_API...` environment variables into your deployment behind your back!

You can now hit **Deploy**!

### Step 5: Automating the Cron Loop
Once Vercel finishes deploying the project, the Next.js API is completely accessible, but it's asleep. You have to tell Vercel to ping the script continuously in the background!
The project provides a fully compliant `vercel.json` configuration file at the root.

All you have to do to turn on the background heartbeat is execute your `cron` function on a schedule.

---

### Warning: Secrets Safety
The `.gitignore` inside this repository is strictly configured to protect you. Even when running `git commit -a`, your private `.env` codes, raw `config.json` rulebooks, and temporary `dbx_token.json` session blobs will **never be pushed to GitHub**. 
