from typing import Dict, Any, List, Optional
import uuid
import random
import time

class StateManager:
    def __init__(self):
        self.users: List[Dict[str, Any]] = []
        self.notes: List[Dict[str, Any]] = []

    def reset(self, seed: Optional[str] = None):
        self.users = []
        self.notes = []
        if seed:
            random.seed(seed)

        default_user_id = str(uuid.uuid4())
        self.users.append({
            "id": default_user_id,
            "username": "testuser",
            "password": "testpass"
        })
        self.notes.append({
            "id": str(uuid.uuid4()),
            "owner_id": default_user_id,
            "title": "Seeded Note",
            "content": "Hello from seeded data",
            "created_at": time.time()
        })

    def augment_state(self, data: Dict[str, Any]):
        if "users" in data and isinstance(data["users"], list):
            self.users.extend(data["users"])
        if "notes" in data and isinstance(data["notes"], list):
            self.notes.extend(data["notes"])

    def set_state(self, data: Dict[str, Any]):
        self.users = data.get("users", [])
        self.notes = data.get("notes", [])

    def get_full_state(self):
        return {"users": self.users, "notes": self.notes}

    def create_user(self, username: str, password: str) -> Dict[str, Any]:
        user = {"id": str(uuid.uuid4()), "username": username, "password": password}
        self.users.append(user)
        return user

    def find_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        for u in self.users:
            if u["username"] == username and u["password"] == password:
                return u
        return None

    def get_notes(self, owner_id: str) -> List[Dict[str, Any]]:
        return [n for n in self.notes if n["owner_id"] == owner_id]

    def create_note(self, owner_id: str, title: str, content: str) -> Dict[str, Any]:
        note = {"id": str(uuid.uuid4()), "owner_id": owner_id,
                "title": title, "content": content, "created_at": time.time()}
        self.notes.append(note)
        return note

    def update_note(self, note_id: str, owner_id: str, title: str, content: str) -> Optional[Dict[str, Any]]:
        for note in self.notes:
            if note["id"] == note_id and note["owner_id"] == owner_id:
                note["title"] = title
                note["content"] = content
                return note
        return None

    def delete_note(self, note_id: str, owner_id: str) -> bool:
        for i, note in enumerate(self.notes):
            if note["id"] == note_id and note["owner_id"] == owner_id:
                del self.notes[i]
                return True
        return False

state_manager = StateManager()