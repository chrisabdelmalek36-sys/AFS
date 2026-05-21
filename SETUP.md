# Running AFS Lead Engine on your own computer

Plain-language guide. No technical knowledge needed. Take it slowly,
one step at a time. If anything looks different from what's written
here, stop and ask — don't guess.

---

## Step 0 — Which computer do you have? (2 clicks)

**If you use a Windows PC/laptop:**
1. Click the **Start** button (bottom-left).
2. Type **About your PC** and press Enter. It will say "Windows 11"
   or "Windows 10". → You have **Windows**.

**If you use an Apple Mac:**
1. Click the **Apple logo** (top-left of the screen).
2. Click **About This Mac**. A box appears. → You have a **Mac**.
   - Note the **Chip** or **Processor** line (says "Apple M1/M2/M3"
     or "Intel"). Tell me which.

Tell me "Windows" or "Mac" (and the chip if Mac) and I'll confirm the
exact download link for the next step.

---

## Step 1 — Install Docker Desktop (one-time, ~10 min)

Docker is a free tool that runs the whole system for you so you don't
have to install a database or developer tools by hand.

- **Windows:** download from <https://www.docker.com/products/docker-desktop/>
  → "Download for Windows". Open the downloaded file, click through
  (keep all default options), restart the computer if it asks.
- **Mac:** same page → choose **Apple chip** or **Intel chip** to match
  what you saw in Step 0. Open the downloaded file, drag Docker into
  Applications, open it.

When it's installed, open **Docker Desktop** once and leave it running
(you'll see a small whale icon near the clock). You only do this install
once, ever.

---

## Step 2 — Get this project onto your computer

If a technical person already put the project folder on your computer,
skip to Step 3. Otherwise, the simplest way:

1. Go to the project page on GitHub.
2. Click the green **Code** button → **Download ZIP**.
3. Unzip it (double-click the downloaded file). You now have a folder
   named **Basha** (or similar). Remember where it is (e.g. Desktop).

---

## Step 3 — Start the system (one command)

**Windows:**
1. Open the **Basha** folder.
2. Click once in the address bar at the top, type `cmd`, press Enter.
   A black window opens.
3. Type this and press Enter:

       docker compose up

**Mac:**
1. Open the **Terminal** app (press Cmd+Space, type "Terminal", Enter).
2. Type `cd ` (with a space), then drag the **Basha** folder into the
   window, press Enter.
3. Type this and press Enter:

       docker compose up

The first time, it downloads and prepares everything (5–10 minutes —
this is normal, only the first time). You'll see a lot of text scroll.

**It's ready when you see lines mentioning `Ready` and the leads being
discovered.** Leave this window open while you use the system.

---

## Step 4 — Open the dashboard

Open your web browser (Chrome, Edge, Safari…) and go to:

    http://localhost:3000

You'll see the dashboard with the practice leads, the leads table, and
the map. Click around — it's all real and working.

---

## Stopping and starting again

- **Stop:** click the black/Terminal window and press **Ctrl + C**
  (Windows) or **Cmd + C** (Mac). Or run `docker compose down`.
- **Start again later:** repeat Step 3. It's fast after the first time.
  Your leads are saved and will still be there.

---

## Turning on REAL leads later

By default it shows 21 practice businesses so you can learn the system
with zero cost. When you're ready for real Egyptian leads:

1. Get a Google Maps API key (steps in `lead-engine/README.md`).
2. In the **Basha** folder, make a file named `.env` containing:

       PIPELINE_MODE=live
       GOOGLE_MAPS_API_KEY=your_key_here

3. Stop and start again (Step 3). Real leads will flow in. Your monthly
   budget cap protects you from overspending.

---

## If something goes wrong

Don't troubleshoot alone. Copy the last 10–15 lines of text from the
black/Terminal window, paste them to me, and tell me which step you
were on. I'll tell you exactly what to do.
