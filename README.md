# CivicLens 🛡️
> **AI-Powered Urban Infrastructure Management System**

CivicLens empowers citizens and municipal authorities to report, track, and resolve urban infrastructural damages using computer vision, automated classification, and streamlined municipal workflows.

---

## ✨ Features

- **Dual-Role Authentication:**
  - **Citizen Portal:** Report infrastructural damages with photo evidence, categories, and GPS locations. View personal reported incidents.
  - **Administrator Portal:** Secure oversight dashboard with full municipal authority to review, filter, and modify incident statuses in real time.
- **Incident Lifecycle Management:**
  - Status progression: `REPORTED` ➔ `VERIFIED` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLUTION_SUBMITTED` ➔ `RESOLVED` (or `REJECTED` for false reports).
  - Admins can change status directly from incident cards.
- **Live Performance & Analytics:**
  - Total Incidents Reported
  - Solved & Resolved Rate
  - Turnout of False/Rejected Reports
  - Average Resolution Time calculation
- **Role Permissions & Security:**
  - Token-based JWT Authentication with `bcrypt` password hashing.
  - Citizens can only view and manage their own submissions.
  - Admins cannot submit citizen reports; reserved for citizens only.
  - Strict endpoint authorization (`403 Forbidden` for unauthorized role actions).

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router v7, Lucide Icons, Glassmorphic CSS.
- **Backend:** FastAPI, Python, SQLAlchemy, Alembic, PostgreSQL, JWT (python-jose), Bcrypt.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API will run at `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://localhost:5173`.

### 3. Root Dev Scripts
```bash
npm run dev:backend    # Runs FastAPI backend
npm run dev:frontend   # Runs Vite frontend
```
