from pydantic import BaseModel, Field, EmailStr
from enum import Enum
from typing import Optional, List
from datetime import datetime

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"

class TeamRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"

class TeamInfo(BaseModel):
    """Team information with user's role"""
    id: str
    name: str
    description: str
    user_role: TeamRole
    joined_at: Optional[float] = None
    created_at: Optional[float] = None

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username must not be empty")
    password: str = Field(..., min_length=1, description="Password must not be empty")

class UserIn(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    role: UserRole = UserRole.MEMBER

class UserProfileUpdate(BaseModel):
    """Model for updating user profile information"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None

class UserProfile(BaseModel):
    """Complete user profile model"""
    id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    bio: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    teams: Optional[List[TeamInfo]] = [] 