from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .routes import synthetic, notes
from .logger import LogMiddleware
from .state_manager import state_manager

app = FastAPI(title="Synthetic Notes App (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach logging middleware
app.middleware("http")(LogMiddleware())

# Routers
app.include_router(synthetic.router, prefix="/_synthetic", tags=["synthetic"])
app.include_router(notes.router, prefix="/api", tags=["notes"])

@app.get("/")
def read_root():
    return {"message": "Notes App Backend is running."}

@app.on_event("startup")
def startup_event():
    state_manager.reset()