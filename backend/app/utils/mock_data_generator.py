import uuid
import random
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

def generate_mock_data(data_manager, seed: Optional[str] = None):
    """Generate comprehensive mock data for the project management platform"""
    if seed:
        random.seed(seed)
    
    # Generate users
    users_data = [
        # Admin
        {"username": "admin_alice", "password": "admin123", "email": "alice@techcorp.com", 
         "full_name": "Alice Chen", "role": "admin"},
        
        # Managers
        {"username": "manager_david", "password": "manager123", "email": "david@techcorp.com", 
         "full_name": "David Rodriguez", "role": "manager"},
        {"username": "manager_sarah", "password": "manager123", "email": "sarah@techcorp.com", 
         "full_name": "Sarah Johnson", "role": "manager"},
        {"username": "manager_james", "password": "manager123", "email": "james@techcorp.com", 
         "full_name": "James Wilson", "role": "manager"},
        
        # Frontend Team Members
        {"username": "frontend_emma", "password": "dev123", "email": "emma@techcorp.com", 
         "full_name": "Emma Thompson", "role": "member"},
        {"username": "frontend_alex", "password": "dev123", "email": "alex@techcorp.com", 
         "full_name": "Alex Kim", "role": "member"},
        {"username": "frontend_maya", "password": "dev123", "email": "maya@techcorp.com", 
         "full_name": "Maya Patel", "role": "member"},
        {"username": "frontend_lucas", "password": "dev123", "email": "lucas@techcorp.com", 
         "full_name": "Lucas Brown", "role": "member"},
        
        # Backend Team Members
        {"username": "backend_mike", "password": "dev123", "email": "mike@techcorp.com", 
         "full_name": "Mike Anderson", "role": "member"},
        {"username": "backend_lisa", "password": "dev123", "email": "lisa@techcorp.com", 
         "full_name": "Lisa Garcia", "role": "member"},
        {"username": "backend_tom", "password": "dev123", "email": "tom@techcorp.com", 
         "full_name": "Tom Davis", "role": "member"},
        {"username": "backend_nina", "password": "dev123", "email": "nina@techcorp.com", 
         "full_name": "Nina Kowalski", "role": "member"},
        {"username": "backend_raj", "password": "dev123", "email": "raj@techcorp.com", 
         "full_name": "Raj Sharma", "role": "member"},
        
        # Mobile Team Members
        {"username": "mobile_carlos", "password": "dev123", "email": "carlos@techcorp.com", 
         "full_name": "Carlos Martinez", "role": "member"},
        {"username": "mobile_zoe", "password": "dev123", "email": "zoe@techcorp.com", 
         "full_name": "Zoe Taylor", "role": "member"},
        {"username": "mobile_kevin", "password": "dev123", "email": "kevin@techcorp.com", 
         "full_name": "Kevin Lee", "role": "member"},
        {"username": "mobile_sofia", "password": "dev123", "email": "sofia@techcorp.com", 
         "full_name": "Sofia Rossi", "role": "member"},
    ]
    
    # Create users and store mapping
    user_map = {}
    for user_data in users_data:
        user_id = str(uuid.uuid4())
        user_map[user_data["username"]] = user_id
        
        data_manager.users.append({
            "id": user_id,
            "username": user_data["username"],
            "password": user_data["password"],
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "created_at": time.time() - random.randint(86400 * 30, 86400 * 90)
        })
    
    # Generate teams
    teams_data = [
        {"name": "Frontend Development Team", "description": "Responsible for user interface and user experience development"},
        {"name": "Backend Development Team", "description": "Handles server-side logic, APIs, and database management"},
        {"name": "Mobile Development Team", "description": "Develops iOS and Android mobile applications"}
    ]
    
    team_ids = []
    for team_data in teams_data:
        team_id = str(uuid.uuid4())
        team_ids.append(team_id)
        
        data_manager.teams.append({
            "id": team_id,
            "name": team_data["name"],
            "description": team_data["description"],
            "created_at": time.time() - random.randint(86400 * 60, 86400 * 120)
        })
    
    # Generate team memberships
    team_assignments = [
        # Frontend Team
        (user_map["admin_alice"], team_ids[0], "admin"),
        (user_map["manager_david"], team_ids[0], "manager"),
        (user_map["frontend_emma"], team_ids[0], "member"),
        (user_map["frontend_alex"], team_ids[0], "member"),
        (user_map["frontend_maya"], team_ids[0], "member"),
        (user_map["frontend_lucas"], team_ids[0], "member"),
        
        # Backend Team
        (user_map["admin_alice"], team_ids[1], "admin"),
        (user_map["manager_sarah"], team_ids[1], "manager"),
        (user_map["backend_mike"], team_ids[1], "member"),
        (user_map["backend_lisa"], team_ids[1], "member"),
        (user_map["backend_tom"], team_ids[1], "member"),
        (user_map["backend_nina"], team_ids[1], "member"),
        (user_map["backend_raj"], team_ids[1], "member"),
        
        # Mobile Team
        (user_map["admin_alice"], team_ids[2], "admin"),
        (user_map["manager_james"], team_ids[2], "manager"),
        (user_map["mobile_carlos"], team_ids[2], "member"),
        (user_map["mobile_zoe"], team_ids[2], "member"),
        (user_map["mobile_kevin"], team_ids[2], "member"),
        (user_map["mobile_sofia"], team_ids[2], "member"),
    ]
    
    for user_id, team_id, role in team_assignments:
        data_manager.team_memberships.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "team_id": team_id,
            "role": role,
            "joined_at": time.time() - random.randint(86400 * 30, 86400 * 90)
        })
    
    # Generate projects
    projects_data = [
        {
            "name": "Nexus",
            "description": "Next-gen e-commerce platform with AI-powered recommendations",
            "team_id": team_ids[0],  # Frontend team
            "manager_id": user_map["manager_david"],
            "icon": "shopping-cart",
            "days_ago": 45  # Created 45 days ago
        },
        {
            "name": "Forge", 
            "description": "Modern API gateway with GraphQL and microservices architecture",
            "team_id": team_ids[1],  # Backend team
            "manager_id": user_map["manager_sarah"],
            "icon": "server",
            "days_ago": 30  # Created 30 days ago
        },
        {
            "name": "Pulse",
            "description": "Cross-platform mobile app for real-time user engagement",
            "team_id": team_ids[2],  # Mobile team
            "manager_id": user_map["manager_james"],
            "icon": "smartphone",
            "days_ago": 60  # Created 60 days ago
        }
    ]
    
    project_ids = []
    for project_data in projects_data:
        project_id = str(uuid.uuid4())
        project_ids.append(project_id)
        
        # Calculate creation time based on days_ago
        created_at = time.time() - (project_data["days_ago"] * 86400)
        
        data_manager.projects.append({
            "id": project_id,
            "name": project_data["name"],
            "description": project_data["description"],
            "team_id": project_data["team_id"],
            "created_by": user_map["admin_alice"],
            "created_at": created_at,
            "icon": project_data["icon"]
        })
        
        # Assign manager to project
        data_manager.project_assignments.append({
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "manager_id": project_data["manager_id"],
            "assigned_by": user_map["admin_alice"],
            "assigned_at": time.time() - random.randint(86400 * 40, 86400 * 80)
        })
    
    # Generate boards for each project
    boards_data = [
        # Nexus project boards
        {"name": "UI", "description": "User interface and experience design", "project_idx": 0, "icon": "palette", "days_after_project": 3},
        {"name": "Core", "description": "React components and core functionality", "project_idx": 0, "icon": "code", "days_after_project": 7},
        {"name": "QA", "description": "Quality assurance and user testing", "project_idx": 0, "icon": "users", "days_after_project": 14},
        {"name": "Perf", "description": "Performance optimization and monitoring", "project_idx": 0, "icon": "zap", "days_after_project": 21},
        
        # Forge project boards
        {"name": "Arch", "description": "System architecture and planning", "project_idx": 1, "icon": "layout", "days_after_project": 2},
        {"name": "API", "description": "REST and GraphQL endpoint development", "project_idx": 1, "icon": "api", "days_after_project": 5},
        {"name": "Data", "description": "Database design and data migration", "project_idx": 1, "icon": "database", "days_after_project": 10},
        {"name": "Shield", "description": "Security implementation and auditing", "project_idx": 1, "icon": "shield", "days_after_project": 15},
        {"name": "Docs", "description": "API documentation and developer guides", "project_idx": 1, "icon": "book", "days_after_project": 20},
        
        # Pulse project boards
        {"name": "iOS", "description": "Native iOS application development", "project_idx": 2, "icon": "apple", "days_after_project": 5},
        {"name": "Android", "description": "Native Android application development", "project_idx": 2, "icon": "android", "days_after_project": 8},
        {"name": "Shared", "description": "Cross-platform shared components", "project_idx": 2, "icon": "layers", "days_after_project": 12},
        {"name": "Deploy", "description": "App store deployment and distribution", "project_idx": 2, "icon": "store", "days_after_project": 25},
        {"name": "Beta", "description": "Beta testing and user feedback", "project_idx": 2, "icon": "test-tube", "days_after_project": 30},
    ]
    
    board_ids = []
    for board_data in boards_data:
        board_id = str(uuid.uuid4())
        board_ids.append(board_id)
        
        # Calculate board creation time relative to project creation
        project_created_at = time.time() - (projects_data[board_data["project_idx"]]["days_ago"] * 86400)
        board_created_at = project_created_at + (board_data["days_after_project"] * 86400)
        
        data_manager.boards.append({
            "id": board_id,
            "name": board_data["name"],
            "description": board_data["description"],
            "project_id": project_ids[board_data["project_idx"]],
            "created_by": user_map["admin_alice"],
            "created_at": board_created_at,
            "icon": board_data["icon"]
        })
    
    # Generate lists for each board
    standard_lists = ["Backlog", "To Do", "In Progress", "Review", "Done"]
    list_ids = []
    
    for board_id in board_ids:
        for position, list_name in enumerate(standard_lists):
            list_id = str(uuid.uuid4())
            list_ids.append(list_id)
            
            data_manager.lists.append({
                "id": list_id,
                "name": list_name,
                "board_id": board_id,
                "position": position,
                "created_at": time.time() - random.randint(86400 * 25, 86400 * 50)
            })
    
    # Generate board memberships (enroll team members in relevant boards)
    frontend_users = [user_map["frontend_emma"], user_map["frontend_alex"], user_map["frontend_maya"], user_map["frontend_lucas"]]
    backend_users = [user_map["backend_mike"], user_map["backend_lisa"], user_map["backend_tom"], user_map["backend_nina"], user_map["backend_raj"]]
    mobile_users = [user_map["mobile_carlos"], user_map["mobile_zoe"], user_map["mobile_kevin"], user_map["mobile_sofia"]]
    
    # Enroll users in boards (first 4 boards = frontend, next 5 = backend, last 5 = mobile)
    for i, board_id in enumerate(board_ids):
        if i < 4:  # Frontend boards
            users_to_enroll = frontend_users + [user_map["manager_david"]]
        elif i < 9:  # Backend boards
            users_to_enroll = backend_users + [user_map["manager_sarah"]]
        else:  # Mobile boards
            users_to_enroll = mobile_users + [user_map["manager_james"]]
        
        for user_id in users_to_enroll:
            data_manager.board_memberships.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "board_id": board_id,
                "enrolled_by": user_map["admin_alice"],
                "enrolled_at": time.time() - random.randint(86400 * 20, 86400 * 40)
            })
    
    # Generate tasks with realistic distribution
    task_templates = [
        # Frontend tasks
        {"title": "Design homepage wireframes", "description": "Create wireframes for the new homepage layout", "priority": "high"},
        {"title": "Implement responsive navigation", "description": "Build mobile-friendly navigation component", "priority": "medium"},
        {"title": "Create product card component", "description": "Reusable product display component", "priority": "medium"},
        {"title": "Setup CSS framework", "description": "Configure Tailwind CSS for the project", "priority": "high"},
        {"title": "User authentication UI", "description": "Login and registration forms", "priority": "high"},
        {"title": "Shopping cart interface", "description": "Interactive shopping cart with animations", "priority": "medium"},
        {"title": "Payment form validation", "description": "Client-side form validation for payments", "priority": "high"},
        
        # Backend tasks
        {"title": "Design database schema", "description": "Plan the new database structure", "priority": "high"},
        {"title": "Implement user authentication API", "description": "JWT-based authentication system", "priority": "high"},
        {"title": "Create product catalog API", "description": "CRUD operations for products", "priority": "medium"},
        {"title": "Setup API rate limiting", "description": "Implement rate limiting middleware", "priority": "medium"},
        {"title": "Payment gateway integration", "description": "Integrate Stripe payment processing", "priority": "high"},
        {"title": "Database migration scripts", "description": "Scripts to migrate existing data", "priority": "high"},
        {"title": "API documentation", "description": "OpenAPI/Swagger documentation", "priority": "low"},
        
        # Mobile tasks
        {"title": "Setup React Native project", "description": "Initialize mobile app project structure", "priority": "high"},
        {"title": "Implement push notifications", "description": "Firebase push notification system", "priority": "medium"},
        {"title": "Create user profile screen", "description": "User profile management interface", "priority": "medium"},
        {"title": "Product browsing interface", "description": "Mobile product catalog interface", "priority": "high"},
        {"title": "Offline data synchronization", "description": "Handle offline/online data sync", "priority": "medium"},
        {"title": "App store assets", "description": "Screenshots and store descriptions", "priority": "low"},
        {"title": "Beta testing setup", "description": "TestFlight and Play Console setup", "priority": "low"},
    ]
    
    statuses = ["todo", "in_progress", "review", "done"]
    priorities = ["low", "medium", "high"]
    
    task_ids = []
    for i, board_id in enumerate(board_ids):
        # Get lists for this board
        board_lists = [l for l in data_manager.lists if l["board_id"] == board_id]
        
        # Determine team users for this board
        if i < 4:  # Frontend boards
            team_users = frontend_users
        elif i < 9:  # Backend boards  
            team_users = backend_users
        else:  # Mobile boards
            team_users = mobile_users
        
        # Create 3-8 tasks per board
        num_tasks = random.randint(3, 8)
        for task_num in range(num_tasks):
            task_id = str(uuid.uuid4())
            task_ids.append(task_id)
            
            # Pick a random task template
            template = random.choice(task_templates)
            
            # Assign to random list (weighted towards earlier lists)
            list_weights = [0.3, 0.3, 0.25, 0.1, 0.05]
            chosen_list = random.choices(board_lists, weights=list_weights[:len(board_lists)])[0]
            
            # Assign to random team member
            assignee = random.choice(team_users) if random.random() > 0.2 else None
            
            # Create due date (some tasks have due dates)
            due_date = None
            if random.random() > 0.6:
                due_date = datetime.now() + timedelta(days=random.randint(1, 30))
                due_date = due_date.isoformat()
            
            # Determine task type based on title content
            task_type = "task"  # default
            title_lower = template["title"].lower()
            if "bug" in title_lower or "fix" in title_lower:
                task_type = "bug"
            elif "design" in title_lower or "wireframe" in title_lower:
                task_type = "feature"
            elif "research" in title_lower or "plan" in title_lower:
                task_type = "research"
            elif "documentation" in title_lower or "api doc" in title_lower:
                task_type = "task"
            else:
                # Random selection with weights
                task_type = random.choices(
                    ["feature", "bug", "task", "research", "fix"],
                    weights=[0.3, 0.2, 0.3, 0.1, 0.1]
                )[0]
            
            data_manager.tasks.append({
                "id": task_id,
                "title": template["title"],
                "description": template["description"],
                "list_id": chosen_list["id"],
                "assignee_id": assignee,
                "priority": template["priority"],
                "status": random.choice(statuses),
                "task_type": task_type,
                "due_date": due_date,
                "position": task_num,
                "created_by": random.choice(team_users),
                "created_at": time.time() - random.randint(86400 * 1, 86400 * 30),
                "archived": False
            })
    
    # Generate task activities
    activity_types = ["created", "assigned", "moved", "status_changed", "priority_changed", "commented", "updated"]
    
    for task in data_manager.tasks:
        # Always create a "created" activity
        data_manager.task_activities.append({
            "id": str(uuid.uuid4()),
            "task_id": task["id"],
            "user_id": task["created_by"],
            "activity_type": "created",
            "description": f"Created task '{task['title']}'",
            "old_value": None,
            "new_value": None,
            "created_at": task["created_at"]
        })
        
        # Add 1-4 additional activities per task
        num_activities = random.randint(1, 4)
        for _ in range(num_activities):
            activity_type = random.choice(activity_types[1:])  # Skip "created"
            
            # Get team users for this task's board
            task_list = next(l for l in data_manager.lists if l["id"] == task["list_id"])
            board = next(b for b in data_manager.boards if b["id"] == task_list["board_id"])
            board_memberships = [m for m in data_manager.board_memberships if m["board_id"] == board["id"]]
            possible_users = [m["user_id"] for m in board_memberships]
            
            data_manager.task_activities.append({
                "id": str(uuid.uuid4()),
                "task_id": task["id"],
                "user_id": random.choice(possible_users),
                "activity_type": activity_type,
                "description": f"Task {activity_type.replace('_', ' ')}",
                "old_value": "old_value" if activity_type in ["moved", "status_changed", "priority_changed"] else None,
                "new_value": "new_value" if activity_type in ["moved", "status_changed", "priority_changed"] else None,
                "created_at": task["created_at"] + random.randint(3600, 86400 * 20)
            })
    
    # Generate comments with threading
    comment_templates = [
        "Great work on this! Looking forward to seeing the results.",
        "I have some concerns about the approach. Can we discuss?",
        "This is ready for review. Please take a look when you have time.",
        "I've made the requested changes. Let me know if you need anything else.",
        "Could you provide more details about the requirements?",
        "This looks good to me. Approved!",
        "I found a bug in the implementation. See attached screenshot.",
        "Thanks for the feedback. I'll address these issues.",
        "This is blocked by another task. Moving to waiting.",
        "Excellent solution! This will work perfectly."
    ]
    
    comment_ids = []
    for task in data_manager.tasks[:30]:  # Add comments to first 30 tasks
        # Get team users for this task's board
        task_list = next(l for l in data_manager.lists if l["id"] == task["list_id"])
        board = next(b for b in data_manager.boards if b["id"] == task_list["board_id"])
        board_memberships = [m for m in data_manager.board_memberships if m["board_id"] == board["id"]]
        possible_users = [m["user_id"] for m in board_memberships]
        
        # Add 1-3 comments per task
        num_comments = random.randint(1, 3)
        task_comment_ids = []
        
        for comment_num in range(num_comments):
            comment_id = str(uuid.uuid4())
            comment_ids.append(comment_id)
            task_comment_ids.append(comment_id)
            
            data_manager.comments.append({
                "id": comment_id,
                "content": random.choice(comment_templates),
                "task_id": task["id"],
                "author_id": random.choice(possible_users),
                "parent_comment_id": None,
                "created_at": task["created_at"] + random.randint(3600, 86400 * 25)
            })
        
        # Add some threaded replies (30% chance per comment)
        for comment_id in task_comment_ids:
            if random.random() < 0.3:
                reply_id = str(uuid.uuid4())
                data_manager.comments.append({
                    "id": reply_id,
                    "content": random.choice(comment_templates),
                    "task_id": task["id"],
                    "author_id": random.choice(possible_users),
                    "parent_comment_id": comment_id,
                    "created_at": time.time() - random.randint(3600, 86400 * 20)
                })
    
    # Generate comprehensive notifications based on actual user access
    notification_templates = [
        ("task_assigned", "New Task Assigned", "You have been assigned to task '{task_title}'"),
        ("task_updated", "Task Updated", "Task '{task_title}' has been updated"),
        ("task_commented", "New Comment", "Someone commented on task '{task_title}'"),
        ("task_moved", "Task Moved", "Task '{task_title}' was moved to a different list"),
        ("board_enrolled", "Board Access Granted", "You have been enrolled in board '{board_name}'"),
        ("project_assigned", "Project Assigned", "You have been assigned to manage project '{project_name}'")
    ]
    
    # Create notifications for various actions - ONLY for content users actually have access to
    for user_id in user_map.values():
        # Get user's accessible content
        user_board_memberships = [m for m in data_manager.board_memberships if m["user_id"] == user_id]
        user_board_ids = [m["board_id"] for m in user_board_memberships]
        
        # Get tasks from boards the user is enrolled in
        user_accessible_tasks = [t for t in data_manager.tasks 
                               if any(l["board_id"] in user_board_ids 
                                    for l in data_manager.lists 
                                    if l["id"] == t["list_id"])]
        
        # Get boards the user is enrolled in
        user_accessible_boards = [b for b in data_manager.boards if b["id"] in user_board_ids]
        
        # Get projects the user is assigned to or manages
        user_project_assignments = [p for p in data_manager.project_assignments if p["manager_id"] == user_id]
        user_accessible_project_ids = [p["project_id"] for p in user_project_assignments]
        
        # Also include projects from teams the user is in
        user_team_memberships = [tm for tm in data_manager.team_memberships if tm["user_id"] == user_id]
        user_team_ids = [tm["team_id"] for tm in user_team_memberships]
        team_projects = [p for p in data_manager.projects if p["team_id"] in user_team_ids]
        for project in team_projects:
            if project["id"] not in user_accessible_project_ids:
                user_accessible_project_ids.append(project["id"])
        
        user_accessible_projects = [p for p in data_manager.projects if p["id"] in user_accessible_project_ids]
        
        # Skip users with no accessible content
        if not user_accessible_tasks and not user_accessible_boards and not user_accessible_projects:
            continue
        
        # Create 3-8 notifications per user based on their accessible content
        num_notifications = random.randint(3, 8)
        for _ in range(num_notifications):
            notif_type, title_template, message_template = random.choice(notification_templates)
            
            # Customize based on notification type and user's accessible content
            if notif_type in ["task_assigned", "task_updated", "task_commented", "task_moved"]:
                if not user_accessible_tasks:
                    continue  # Skip if user has no accessible tasks
                
                task = random.choice(user_accessible_tasks)
                title = title_template
                message = message_template.format(task_title=task["title"])
                related_task_id = task["id"]
                related_board_id = None
                related_project_id = None
                
            elif notif_type == "board_enrolled":
                if not user_accessible_boards:
                    continue  # Skip if user has no accessible boards
                
                board = random.choice(user_accessible_boards)
                title = title_template
                message = message_template.format(board_name=board["name"])
                related_task_id = None
                related_board_id = board["id"]
                related_project_id = None
                
            elif notif_type == "project_assigned":
                if not user_accessible_projects:
                    continue  # Skip if user has no accessible projects
                
                project = random.choice(user_accessible_projects)
                title = title_template
                message = message_template.format(project_name=project["name"])
                related_task_id = None
                related_board_id = None
                related_project_id = project["id"]
            else:
                continue  # Skip unknown notification types
            
            data_manager.notifications.append({
                "id": str(uuid.uuid4()),
                "recipient_id": user_id,
                "type": notif_type,
                "title": title,
                "message": message,
                "related_task_id": related_task_id,
                "related_board_id": related_board_id,
                "related_project_id": related_project_id,
                "read": random.choice([True, False]),
                "created_at": time.time() - random.randint(3600, 86400 * 7)
            }) 