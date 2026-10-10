from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class IncidentBase(BaseModel):
    title: str
    description: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentStatusUpdate(BaseModel):
    status: str

class IncidentOut(IncidentBase):
    id: int
    status: str
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IncidentStatsOut(BaseModel):
    total_reported: int
    total_resolved: int
    total_fake: int  # turned out to be fake (status == REJECTED)
    avg_resolution_hours: float
    avg_resolution_formatted: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
