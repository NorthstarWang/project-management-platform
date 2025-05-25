from fastapi import APIRouter, Request, HTTPException
from ..data_manager import data_manager
from ..models import UserIn
from .dependencies import log_action

router = APIRouter(prefix="/api", tags=["authentication"])

@router.post("/register")
def register_user(user_in: UserIn, request: Request):
    """Register a new user"""
    try:
        user = data_manager.user_service.create_user(
            username=user_in.username,
            password=user_in.password,
            email=user_in.email,
            full_name=user_in.full_name,
            role=user_in.role.value
        )
        
        log_action(request, "USER_REGISTER", {
            "userId": user["id"],
            "username": user["username"],
            "role": user["role"]
        })
        
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login_user(user_in: UserIn, request: Request):
    """Login a user"""
    try:
        user = data_manager.user_service.authenticate_user(user_in.username, user_in.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        log_action(request, "USER_LOGIN", {
            "userId": user["id"],
            "username": user["username"]
        })
        return user
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) 