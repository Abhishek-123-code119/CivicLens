from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.db.models import Incident, IncidentStatus, User, Role, Report, Severity
from app.schemas import (
    IncidentOut,
    IncidentStatusUpdate,
    IncidentStatsOut,
    ImageVerificationOut,
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
from app.services.image_recognition import recognizer
import shutil
import os
import uuid

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

@router.post("/incidents/verify-image", response_model=ImageVerificationOut)
def verify_incident_image(
    category: str = Form(...),
    file: UploadFile = File(...)
):
    return ImageVerificationOut(
        is_valid=True,
        category=category,
        detected_type="Uploaded Photo",
        confidence=1.0,
        ai_severity="MEDIUM",
        reason="Photo accepted as report evidence.",
        suggested_category=None
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

    results = []
    for inc in incidents:
        st_val = inc.status.value if hasattr(inc.status, 'value') else str(inc.status)
        sev_val = inc.ai_severity.value if inc.ai_severity and hasattr(inc.ai_severity, 'value') else (str(inc.ai_severity) if inc.ai_severity else None)
        img_val = inc.reports[0].image_path if inc.reports and len(inc.reports) > 0 else None
        
        results.append(IncidentOut(
            id=inc.id,
            title=inc.title,
            description=inc.description,
            category=inc.category,
            latitude=inc.latitude,
            longitude=inc.longitude,
            status=st_val,
            user_id=inc.user_id,
            ai_severity=sev_val,
            image_path=img_val,
            created_at=inc.created_at,
            updated_at=inc.updated_at
        ))
    return results

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
    ai_severity_enum = Severity.MEDIUM
    initial_status = IncidentStatus.REPORTED

    if file:
        file_bytes = file.file.read()
        if len(file_bytes) > 0:
            # Save uploaded image directly
            os.makedirs("uploads", exist_ok=True)
            clean_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
            file_location = f"uploads/{clean_name}"
            with open(file_location, "wb+") as f_out:
                f_out.write(file_bytes)
            image_path = file_location

    db_incident = Incident(
        title=title,
        description=description,
        category=category,
        latitude=latitude,
        longitude=longitude,
        user_id=current_user.id,
        ai_severity=ai_severity_enum,
        status=initial_status
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)

    # Track Report
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
    
    st_val = db_incident.status.value if hasattr(db_incident.status, 'value') else str(db_incident.status)
    sev_val = db_incident.ai_severity.value if db_incident.ai_severity and hasattr(db_incident.ai_severity, 'value') else (str(db_incident.ai_severity) if db_incident.ai_severity else None)

    return IncidentOut(
        id=db_incident.id,
        title=db_incident.title,
        description=db_incident.description,
        category=db_incident.category,
        latitude=db_incident.latitude,
        longitude=db_incident.longitude,
        status=st_val,
        user_id=db_incident.user_id,
        ai_severity=sev_val,
        image_path=image_path,
        created_at=db_incident.created_at,
        updated_at=db_incident.updated_at
    )

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

    st_val = incident.status.value if hasattr(incident.status, 'value') else str(incident.status)
    sev_val = incident.ai_severity.value if incident.ai_severity and hasattr(incident.ai_severity, 'value') else (str(incident.ai_severity) if incident.ai_severity else None)
    img_val = incident.reports[0].image_path if incident.reports and len(incident.reports) > 0 else None

    return IncidentOut(
        id=incident.id,
        title=incident.title,
        description=incident.description,
        category=incident.category,
        latitude=incident.latitude,
        longitude=incident.longitude,
        status=st_val,
        user_id=incident.user_id,
        ai_severity=sev_val,
        image_path=img_val,
        created_at=incident.created_at,
        updated_at=incident.updated_at
    )
