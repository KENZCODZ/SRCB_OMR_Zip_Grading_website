# Terminal 1 — Start the backend (serves both API and frontend)

cd "omr_engine"
run this command:
<<<<<<< HEAD
=======

python -3 -m venv .venv

.venv\Scripts\Activate.ps1

pip install -r requirements.txt

>>>>>>> e52d0b93957fbb063785c6a7e52c7625e9c0216b
python main.py

# → http://localhost:8000

# Terminal 2 — Start Vite dev server for hot-reload during development

cd "Frontend"
run this command:
npm install 

npm run dev

# → http://localhost:5173 (auto-proxies API calls to :8000)

