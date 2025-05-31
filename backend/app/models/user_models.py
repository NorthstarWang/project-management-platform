from pydantic import BaseModel, Field
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username must not be empty")
    password: str = Field(..., min_length=1, description="Password must not be empty")

class UserIn(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    role: UserRole = UserRole.MEMBER 