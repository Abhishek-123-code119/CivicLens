from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum
import datetime

class Role(enum.Enum):
    CITIZEN = "CITIZEN"
    MUNICIPAL_OFFICER = "MUNICIPAL_OFFICER"
    FIELD_WORKER = "FIELD_WORKER"
    ADMIN = "ADMIN"

class IncidentStatus(enum.Enum):
    REPORTED = "REPORTED"
    AI_PROCESSING = "AI_PROCESSING"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLUTION_SUBMITTED = "RESOLUTION_SUBMITTED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class Severity(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(Role), default=Role.CITIZEN)
    is_active = Column(Boolean, default=True)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    category = Column(String, index=True)
    ai_severity = Column(Enum(Severity), nullable=True)
    verified_severity = Column(Enum(Severity), nullable=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.REPORTED)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User")
    reports = relationship("Report", back_populates="incident")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    image_path = Column(String, nullable=True)
    description = Column(Text)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="reports")
    user = relationship("User")
