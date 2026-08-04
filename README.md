# Terminal 1 — Start the backend (serves both API and frontend)

cd "omr web/omr_engine"
run this command:
python -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py

# → http://localhost:8000

2

# Terminal 2 — Start Vite dev server for hot-reload during development

cd "omr web/Frontend"
run this command:
npm run dev

# → http://localhost:5173 (auto-proxies API calls to :8000)
