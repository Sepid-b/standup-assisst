# 📋 Standup Tab — Teams App

A Microsoft Teams tab for Sepideh & Maria. Live status, NWG hours tracker, blockers and handover docs — no standup needed.

---

## 🚀 Run locally (first time)

```bash
# 1. Install everything
npm install          # installs concurrently
npm run install:all  # installs backend + frontend dependencies

# 2. Start both servers
npm run dev
```

This starts:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:5173

Open http://localhost:5173 in your browser and you'll see the app.

---

## 📦 Deploy to Vercel (to use inside Teams)

### Frontend
1. Push this repo to GitHub
2. Go to vercel.com → New Project → import your repo
3. Set **Root Directory** to `frontend`
4. Deploy — you'll get a URL like `https://standup-xyz.vercel.app`

### Backend
1. Go to railway.app or render.com → New Web Service
2. Point to the `backend` folder
3. Set start command: `node server.js`
4. Deploy — you'll get a URL like `https://standup-api.railway.app`

### Connect them
In `frontend/vite.config.js`, update the proxy target to your Railway backend URL for production. Or set `VITE_API_URL` in Vercel's environment variables.

---

## 🏗 Install in Microsoft Teams

1. **Update `manifest/manifest.json`** — replace all instances of `your-app-url.vercel.app` with your actual Vercel URL
2. **Add icons** — put two PNG files in `manifest/`:
   - `icon-color.png` — 192×192px, full color (use Teams purple #6264A7)
   - `icon-outline.png` — 32×32px, white outline on transparent
3. **Zip the manifest folder**: select `manifest.json` + both icons → compress to `standup.zip`
4. **Upload to Teams**:
   - Open Teams → Apps (left sidebar) → Manage your apps
   - Click **Upload an app** → Upload a custom app
   - Select your `standup.zip`
5. **Add to your chat with Maria**:
   - Open your chat with Maria
   - Click **+** next to the tab bar at the top
   - Find "Standup" → Add
   - Done ✅ — the tab appears for both of you

---

## 🗂 Project structure

```
standup-app/
├── backend/
│   ├── server.js     ← Express API
│   ├── data.json     ← Auto-created on first run (your data lives here)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         ← Shell + header + view toggle
│   │   ├── MentorView.jsx  ← Maria's read-only view
│   │   ├── MyView.jsx      ← Sepideh's editable view
│   │   └── api.js          ← API calls
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── manifest/
│   └── manifest.json ← Teams app config
└── package.json      ← Root scripts
```

---

## ✨ Features

- **Maria's view** — read-only: current projects, status, blockers, NWG progress, handover docs, note
- **My view** — editable: quick status chips, add/remove projects, NWG time logging (+30m/+1h/+2h/custom), blocker chips, task checklist, note to Maria
- **Live sync** — mentor view auto-refreshes every 15 seconds
- **Persistent data** — all changes saved to `data.json` on the backend
- **Fluent UI** — built with Microsoft's official Teams design system (@fluentui/react-components v9)
