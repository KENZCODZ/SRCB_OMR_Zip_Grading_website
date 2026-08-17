# SRCB OMR Grading System — Frontend

This is the React + TypeScript frontend for the **SRCB OMR & Zip-Grading System**, built with Vite and vanilla CSS.

## 🚀 Quickstart

1. Install dependencies from this folder:

   ```bash
   npm install
   ```

2. Start the local development server:

   ```bash
   npm run dev
   ```

3. Open the app in your browser at:
   - http://127.0.0.1:5173
   - or http://localhost:5173

> Note: The Vite dev server proxies all `/api` requests to the Python FastAPI backend at http://127.0.0.1:8000. If the backend is not running, the UI will fall back to demo/mock data for some views.

## 🧰 Run the backend

Start the API from the omr_engine folder:

```bash
cd ../omr_engine
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## 🏗️ Build for production

```bash
npm run build
```

For full documentation and system architecture, see the root [README.md](../README.md).
