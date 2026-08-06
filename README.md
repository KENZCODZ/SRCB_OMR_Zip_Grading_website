# Terminal 1 — Start the backend (serves both API and frontend)

cd "omr_engine"
run this command:
python main.py

# → http://localhost:8000

# Terminal 2 — Start Vite dev server for hot-reload during development

cd "Frontend"
run this command:
npm run dev

# → http://localhost:5173 (auto-proxies API calls to :8000)

