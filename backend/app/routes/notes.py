from fastapi import APIRouter, Request, HTTPException, Depends
from ..state_manager import state_manager
from ..models import UserIn, NoteIn
from ..logger import logger

router = APIRouter()

def get_current_user_id(request: Request):
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id

@router.post("/register")
def register(user_in: UserIn, request: Request):
    new_user = state_manager.create_user(user_in.username, user_in.password)
    session_id = request.query_params.get("session_id", "no_session")
    logger.log_action(session_id, "REGISTER", {"userId": new_user["id"]})
    return {"userId": new_user["id"], "username": new_user["username"]}

@router.post("/login")
def login(user_in: UserIn, request: Request):
    user = state_manager.find_user(user_in.username, user_in.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    session_id = request.query_params.get("session_id", "no_session")
    logger.log_action(session_id, "LOGIN", {"userId": user["id"]})
    return {"userId": user["id"]}

@router.post("/notes")
def create_note(note_in: NoteIn, request: Request, user_id: str = Depends(get_current_user_id)):
    new_note = state_manager.create_note(user_id, note_in.title, note_in.content)
    session_id = request.query_params.get("session_id", "no_session")
    logger.log_action(session_id, "CREATE_NOTE", {"noteId": new_note["id"]})
    return new_note

@router.get("/notes")
def list_notes(request: Request, user_id: str = Depends(get_current_user_id)):
    return state_manager.get_notes(user_id)

@router.put("/notes/{note_id}")
def update_note(note_id: str, note_in: NoteIn, request: Request, user_id: str = Depends(get_current_user_id)):
    updated = state_manager.update_note(note_id, user_id, note_in.title, note_in.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Note not found")
    session_id = request.query_params.get("session_id", "no_session")
    logger.log_action(session_id, "UPDATE_NOTE", {"noteId": note_id})
    return updated

@router.delete("/notes/{note_id}")
def delete_note(note_id: str, request: Request, user_id: str = Depends(get_current_user_id)):
    success = state_manager.delete_note(note_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    session_id = request.query_params.get("session_id", "no_session")
    logger.log_action(session_id, "DELETE_NOTE", {"noteId": note_id})
    return {"status": "deleted"}