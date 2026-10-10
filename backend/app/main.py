from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import User, Role
from app.core.security import hash_password

def init_default_users():
    db = SessionLocal()
    try:
        # Check and seed admin
        admin = db.query(User).filter(User.email == "admin@civiclens.gov").first()
        if not admin:
            admin = User(
                email="admin@civiclens.gov",
                hashed_password=hash_password("Admin@CivicLens2026"),
                full_name="System Administrator",
                role=Role.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("[INFO] Seeded default Admin user: admin@civiclens.gov")

        # Check and seed demo citizen
        citizen = db.query(User).filter(User.email == "citizen@civiclens.org").first()
        if not citizen:
            citizen = User(
                email="citizen@civiclens.org",
                hashed_password=hash_password("Citizen@2026"),
                full_name="Alex Citizen",
                role=Role.CITIZEN,
                is_active=True
            )
            db.add(citizen)
            print("[INFO] Seeded default Citizen user: citizen@civiclens.org")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[WARN] Failed to initialize default users: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_default_users()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import router as api_router

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(api_router, prefix="/api/v1")
