# SRCB OMR & Zip-Grading System

<<<<<<< HEAD
cd "omr web/omr_engine"
run this command:
python -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
=======
A modern, high-precision Optical Mark Recognition (OMR) grading system tailored for **St. Rita's College of Balingasag (SRCB)**. It automates answer sheet scanning, instant grading, item analysis, and institutional reporting.
>>>>>>> origin/ian

---

## 🚀 System Architecture

- **Backend**: Python, FastAPI, OpenCV (Image Processing / Hough Transforms / Bubble Detection), SQLite, Pydantic.
- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design System, Lucide Icons, XLSX / Excel Utilities.
- **API Proxy**: Vite dev server proxies `/api/*` directly to `http://127.0.0.1:8000`.

---

## 🔐 Demo User Accounts

All seed accounts are pre-populated in the database and available on the login page:

| Role | Name | Email | Password | Scope & Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Dean** | Dr. Maria Santos | `dean@srcb.edu.ph` | `Dean@2025` | Institution-wide access across all departments |
| **Programme Head** | Prof. Elaine Cruz | `programme-head@srcb.edu.ph` | `Ph@2025` | BSIT Programme analytics & faculty progress |
| **Programme Head** | Prof. Ramon Cruz | `ramon.cruz@srcb.edu.ph` | `Ph@2025` | BSIT Programme analytics & faculty progress |
| **Teacher** | Prof. John Dela Cruz | `teacher@srcb.edu.ph` | `Teacher@2025` | Create exams, upload keys, grade sheets, export reports |
| **Teacher** | Ms. Jenny Garcia | `jenny.garcia@srcb.edu.ph` | `Teacher@2025` | Create exams, upload keys, grade sheets, export reports |
| **Student** | Ana Reyes | `student@srcb.edu.ph` | `Student@2025` | View personal examination records & feedback |
| **Student** | Kenneth Ernest Palicte | `k.palicte@srcb.edu.ph` | `Student@2025` | View personal examination records & feedback |

---

## 📋 Prerequisites

Before installing manually, ensure your environment meets the following requirements:
- **Python 3.9+** (Verify with `python --version` or `python3 --version`)
- **Node.js 18+ & npm** (Verify with `node -v` and `npm -v`)
- **Git** (Verify with `git --version`)

---

## 🛠️ Manual Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/KENZCODZ/SRCB_OMR_Zip_Grading_website.git
cd SRCB_OMR_Zip_Grading_website
```

### 2. Backend Setup (FastAPI & OMR Engine)

1. Open a terminal and navigate to the `omr_engine` directory:
   ```bash
   cd omr_engine
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell / Command Prompt):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Upgrade `pip` and install all required Python packages:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Launch the FastAPI server:
   ```bash
   python main.py
   ```
   > 💡 The FastAPI server will start on **`http://127.0.0.1:8000`**. 
   > The SQLite database (`omr.db`) will auto-initialize with demo user accounts upon startup.
   > You can access interactive API docs (Swagger UI) at **`http://127.0.0.1:8000/docs`**.

### 3. Frontend Setup (React & Vite)

1. Open a **second terminal** window and navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   > 💡 The web application will launch at **`http://localhost:5173`**. Requests to `/api/*` are automatically proxied to the FastAPI backend on port `8000`.

---

## 📁 Directory Structure

```
SRCB_OMR_Zip_Grading_website/
├── omr_engine/                 # Python Backend & Computer Vision Engine
│   ├── main.py                 # FastAPI Application & REST Endpoints
│   ├── omr.py                  # OpenCV Contour & Bubble Recognition Logic
│   ├── database.py             # SQLite Schema & User Authentication
│   ├── coordinates.json        # Calibrated 50-Question Sheet Coordinates
│   ├── test_backend.py         # Backend Unit & Integration Tests
│   └── requirements.txt        # Python Dependencies
├── Frontend/                   # React + TypeScript Frontend App
│   ├── src/
│   │   ├── App.tsx             # Main Dashboard & Tab Navigation Component
│   │   ├── api.ts              # Fetch Services & API Endpoints
│   │   ├── components/         # Reusable UI Components & Cards
│   │   ├── utils/              # Excel / CHED Report Generators
│   │   └── data/               # Mock Data & User Profiles
│   ├── vite.config.ts          # Vite Server Proxy Configuration
│   └── package.json            # Node Dependencies & Scripts
└── README.md                   # Project Documentation
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticates user against SQLite database |
| `GET` | `/api/dashboard/summary` | Fetches system-wide metrics (exams, students, average score) |
| `GET` | `/api/exams` | Lists all active examinations |
| `POST` | `/api/exams` | Creates a new exam with answer keys |
| `DELETE`| `/api/exams/{id}` | Deletes an existing exam record |
| `POST` | `/api/grade` | Uploads an OMR image and grades student bubbles against key |
| `POST` | `/api/extract` | Quick-scans an OMR image to extract filled bubbles without key |
| `GET` | `/api/submissions` | Lists student submission records |

---

## 🧪 Testing

To run the backend unit tests:

```bash
cd omr_engine
python -m unittest test_backend.py
```
