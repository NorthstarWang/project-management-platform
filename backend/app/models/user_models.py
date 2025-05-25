from pydantic import BaseModel
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"

class UserIn(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    role: UserRole = UserRole.MEMBER 