# ─────────────────────────────────────────
#  STANDUP APP — FULL SETUP & RUN
#  Paste these one by one into Cursor terminal
# ─────────────────────────────────────────

# 1. Go to your Downloads folder (or wherever you saved the zip)
cd ~/Downloads

# 2. Unzip the project
unzip standup-app.zip

# 3. Enter the project folder
cd standup-app

# 4. Install root dependencies (concurrently)
npm install

# 5. Install backend dependencies
npm run install:backend

# 6. Install frontend dependencies
npm run install:frontend

# 7. Run everything 🚀
npm run dev

# ─────────────────────────────────────────
# After step 7, open your browser and go to:
#   http://localhost:5173
# ─────────────────────────────────────────
