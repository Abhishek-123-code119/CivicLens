from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.db.models import Incident, IncidentStatus, User, Role, Report
from app.schemas import (
    IncidentOut,
    IncidentStatusUpdate,
    IncidentStatsOut,
    UserLogin,
    UserRegister,
    UserOut,
    TokenOut
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin
)
import shutil
import os

router = APIRouter()

# ----------------- AUTH ENDPOINTS -----------------

@router.post("/auth/login", response_model=TokenOut)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email = login_data.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive",
        )
    
    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    access_token = create_access_token(data={"sub": user.email, "role": role_str, "id": user.id})
    
    user_out = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=role_str,
        is_active=user.is_active
    )
    return TokenOut(access_token=access_token, user=user_out)

@router.post("/auth/register", response_model=TokenOut)
def register(register_data: UserRegister, db: Session = Depends(get_db)):
    email = register_data.email.strip().lower()
    existing_user = db.query(User).filter(User.email.ilike(email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )
    
    hashed_pwd = hash_password(register_data.password)
    new_user = User(
        email=email,
        hashed_password=hashed_pwd,
        full_name=register_data.full_name or email.split("@")[0],
        role=Role.CITIZEN,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    role_str = new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
    access_token = create_access_token(data={"sub": new_user.email, "role": role_str, "id": new_user.id})
    user_out = UserOut(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=role_str,
        is_active=new_user.is_active
    )
    return TokenOut(access_token=access_token, user=user_out)

@router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=role_str,
        is_active=current_user.is_active
    )

# ----------------- INCIDENT ENDPOINTS -----------------

@router.get("/incidents/stats", response_model=IncidentStatsOut)
def get_incident_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_str == "ADMIN" or current_user.role == Role.ADMIN:
        incidents = db.query(Incident).all()
    else:
        incidents = db.query(Incident).filter(Incident.user_id == current_user.id).all()

    total_reported = len(incidents)
    total_resolved = sum(
        1 for i in incidents if (i.status.name if hasattr(i.status, 'name') else str(i.status)) == "RESOLVED"
    )
    total_fake = sum(
        1 for i in incidents if (i.status.name if hasattr(i.status, 'name') else str(i.status)) == "REJECTED"
    )

    resolved_list = [
        i for i in incidents
        if (i.status.name if hasattr(i.status, 'name') else str(i.status)) == "RESOLVED"
        and i.updated_at and i.created_at
    ]

    if resolved_list:
        durations = [(i.updated_at - i.created_at).total_seconds() / 3600.0 for i in resolved_list]
        durations = [max(d, 0.5) for d in durations]
        avg_hours = sum(durations) / len(durations)
        if avg_hours < 1:
            avg_formatted = f"{int(avg_hours * 60)} mins"
        elif avg_hours < 24:
            avg_formatted = f"{avg_hours:.1f} hrs"
        else:
            avg_formatted = f"{avg_hours / 24.0:.1f} days"
    else:
        avg_hours = 0.0
        avg_formatted = "N/A"

    return IncidentStatsOut(
        total_reported=total_reported,
        total_resolved=total_resolved,
        total_fake=total_fake,
        avg_resolution_hours=round(avg_hours, 2),
        avg_resolution_formatted=avg_formatted
    )

@router.get("/incidents/", response_model=List[IncidentOut])
def read_incidents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_str == "ADMIN" or current_user.role == Role.ADMIN:
        incidents = db.query(Incident).order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()
    else:
        incidents = db.query(Incident).filter(Incident.user_id == current_user.id).order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()

    for inc in incidents:
        if hasattr(inc.status, 'value'):
            inc.status = inc.status.value
    return incidents

@router.post("/incidents/", response_model=IncidentOut)
def create_incident(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Admins should not be able to report incidents
    role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_str == "ADMIN" or current_user.role == Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot report incidents. Incident reporting is strictly reserved for citizens."
        )

    image_path = None
    if file:
        os.makedirs("uploads", exist_ok=True)
        file_location = f"uploads/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        image_path = file_location

    db_incident = Incident(
        title=title,
        description=description,
        category=category,
        latitude=latitude,
        longitude=longitude,
        user_id=current_user.id,
        status=IncidentStatus.REPORTED
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)

    # Also track Report
    report = Report(
        incident_id=db_incident.id,
        user_id=current_user.id,
        image_path=image_path,
        description=description,
        latitude=latitude,
        longitude=longitude
    )
    db.add(report)
    db.commit()
    
    if hasattr(db_incident.status, 'value'):
        db_incident.status = db_incident.status.value

    return db_incident

@router.patch("/incidents/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(
    incident_id: int,
    status_update: IncidentStatusUpdate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found"
        )

    target_status = status_update.status.upper()
    valid_statuses = [s.name for s in IncidentStatus]
    if target_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_update.status}'. Valid options are: {', '.join(valid_statuses)}"
        )

    incident.status = IncidentStatus[target_status]
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)

    if hasattr(incident.status, 'value'):
        incident.status = incident.status.value

    return incident
