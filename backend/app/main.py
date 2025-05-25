from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .routes import synthetic, projects
from .logger import LogMiddleware
from .data_manager import data_manager

app = FastAPI(title="Project Management Platform (FastAPI)")

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
app.include_router(projects.router, prefix="/api", tags=["projects"])

@app.get("/")
def read_root():
    return {"message": "Project Management Platform Backend is running."}

@app.on_event("startup")
def startup_event():
    data_manager.reset()