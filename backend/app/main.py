from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .routes import synthetic, auth, users, tasks, projects, boards, comments, notifications, search, debug, teams
from .logger import LogMiddleware
from .data_manager import data_manager
import os

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

# Routers - Modular approach
app.include_router(synthetic.router, prefix="/_synthetic", tags=["synthetic"])
app.include_router(auth.router, tags=["authentication"])
app.include_router(users.router, tags=["users"])
app.include_router(projects.router, tags=["projects"])
app.include_router(boards.router, tags=["boards"])
app.include_router(tasks.router, tags=["tasks"])
app.include_router(comments.router, tags=["comments"])
app.include_router(notifications.router, tags=["notifications"])
app.include_router(search.router, tags=["search"])
app.include_router(debug.router, tags=["debug"])
app.include_router(teams.router, tags=["teams"])

@app.get("/")
def read_root():
    return {"message": "Project Management Platform Backend is running."}

@app.on_event("startup")
def startup_event():
    """Initialize the application with mock data based on configuration"""
    # Check environment variable for reset behavior
    always_reset = os.getenv("ALWAYS_RESET_DATA", "false").lower() == "true"
    
    if always_reset:
        print("🔄 ALWAYS_RESET_DATA=true. Regenerating mock data...")
        data_manager.reset()
        print(f"✅ Mock data generated: {len(data_manager.users)} users, {len(data_manager.projects)} projects, {len(data_manager.tasks)} tasks")
    elif len(data_manager.users) == 0:
        print("🔄 Database is empty. Generating initial mock data...")
        data_manager.reset()
        print(f"✅ Mock data generated: {len(data_manager.users)} users, {len(data_manager.projects)} projects, {len(data_manager.tasks)} tasks")
    else:
        print(f"📊 Database already contains data: {len(data_manager.users)} users, {len(data_manager.projects)} projects, {len(data_manager.tasks)} tasks")
        print("🔄 Preserving existing data. Use /_synthetic/reset to regenerate mock data if needed.")
        print("💡 Set ALWAYS_RESET_DATA=true to always regenerate data on startup.")