from fastapi import APIRouter, Request, HTTPException
from ..data_manager import data_manager
from ..models import UserIn, LoginRequest
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
            "text": f"User {user['username']} registered with role {user['role']}",
            "userId": user["id"],
            "username": user["username"],
            "role": user["role"]
        })
        
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/login")
def login_user(login_request: LoginRequest, request: Request):
    """Login a user"""
    try:
        # Validate credentials are not empty
        if not login_request.username.strip() or not login_request.password.strip():
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        user = data_manager.user_service.authenticate_user(
            login_request.username.strip(), 
            login_request.password.strip()
        )
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        log_action(request, "USER_LOGIN", {  
            "text": f"User {user['username']} logged in",
            "userId": user["id"],
            "username": user["username"]
        })
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log unexpected errors but don't expose internal details
        print(f"Login error for user {login_request.username}: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed") 