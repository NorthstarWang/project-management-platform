from pydantic import BaseModel

class UserIn(BaseModel):
    username: str
    password: str

class NoteIn(BaseModel):
    title: str
    content: str