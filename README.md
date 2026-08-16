# Terminal 1 — Start the Python Backend (FastAPI)

```powershell
cd omr_engine
.\.venv\Scripts\python.exe main.py
```

*(If you ever need to install/update dependencies without activating the venv:)*
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

→ Backend running at: **http://localhost:8000** (API Docs: **http://localhost:8000/docs**)

---

### Database Configuration (MySQL via SQLAlchemy)

The backend uses MySQL with automatic database/table creation and connection pooling via SQLAlchemy.

To configure your MySQL server credentials (e.g. Laragon or standalone MySQL), edit `omr_engine/.env`:

```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=aeroomr_db
```

---

# Terminal 2 — Start the Frontend (Vite React + Camera Scanner)

```powershell
cd Frontend
npm install
npm run dev
```

→ Web App running at: **http://localhost:5173** (auto-proxies API calls to :8000)
