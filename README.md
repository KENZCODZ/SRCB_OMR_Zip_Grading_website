# Terminal 1 — Start the Python Backend (FastAPI)

```powershell
cd omr_engine
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
*(Or without activating: `.\.venv\Scripts\python.exe main.py`)*

→ Backend running at: **http://localhost:8000** (API Docs: **http://localhost:8000/docs**)

---

# Terminal 2 — Start the Frontend (Vite React + Camera Scanner)

```powershell
cd Frontend
npm install
npm run dev
```

→ Web App running at: **http://localhost:5173** (auto-proxies API calls to :8000)

