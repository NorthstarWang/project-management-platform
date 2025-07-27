import uuid
import random
import time
from datetime import datetime, timedelta, date
from typing import Optional

def generate_mock_data(data_manager, seed: Optional[str] = None):
    """Generate comprehensive mock data for the project management platform"""
    if seed:
        random.seed(seed)
    
    # Generate users - Only admin and member roles now, managers are team-specific
    users_data = [
        # Admin
        {"username": "admin_alice", "password": "admin123", "email": "alice@techcorp.com", 
         "full_name": "Alice Chen", "role": "admin"},
        
        # Regular members who will become managers of specific teams
        {"username": "david_rodriguez", "password": "member123", "email": "david@techcorp.com", 
         "full_name": "David Rodriguez", "role": "member"},
        {"username": "sarah_johnson", "password": "member123", "email": "sarah@techcorp.com", 
         "full_name": "Sarah Johnson", "role": "member"},
        {"username": "james_wilson", "password": "member123", "email": "james@techcorp.com", 
         "full_name": "James Wilson", "role": "member"},
        
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
    
    # Generate team memberships with dynamic manager roles
    team_assignments = [
        # Frontend Team - David Rodriguez as manager
        (user_map["admin_alice"], team_ids[0], "admin"),
        (user_map["david_rodriguez"], team_ids[0], "manager"),  # Now team-specific manager
        (user_map["frontend_emma"], team_ids[0], "member"),
        (user_map["frontend_alex"], team_ids[0], "member"),
        (user_map["frontend_maya"], team_ids[0], "member"),
        (user_map["frontend_lucas"], team_ids[0], "member"),
        
        # Backend Team - Sarah Johnson as manager
        (user_map["admin_alice"], team_ids[1], "admin"),
        (user_map["sarah_johnson"], team_ids[1], "manager"),  # Now team-specific manager
        (user_map["backend_mike"], team_ids[1], "member"),
        (user_map["backend_lisa"], team_ids[1], "member"),
        (user_map["backend_tom"], team_ids[1], "member"),
        (user_map["backend_nina"], team_ids[1], "member"),
        (user_map["backend_raj"], team_ids[1], "member"),
        
        # Mobile Team - James Wilson as manager
        (user_map["admin_alice"], team_ids[2], "admin"),
        (user_map["james_wilson"], team_ids[2], "manager"),  # Now team-specific manager
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
            "manager_id": user_map["david_rodriguez"],  # Team manager
            "icon": "shopping-cart",
            "days_ago": 45  # Created 45 days ago
        },
        {
            "name": "Forge", 
            "description": "Modern API gateway with GraphQL and microservices architecture",
            "team_id": team_ids[1],  # Backend team
            "manager_id": user_map["sarah_johnson"],  # Team manager
            "icon": "server",
            "days_ago": 30  # Created 30 days ago
        },
        {
            "name": "Pulse",
            "description": "Cross-platform mobile app for real-time user engagement",
            "team_id": team_ids[2],  # Mobile team
            "manager_id": user_map["james_wilson"],  # Team manager
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

    # Generate some sample team creation requests
    sample_creation_requests = [
        {
            "id": str(uuid.uuid4()),
            "requester_id": user_map["frontend_emma"],
            "team_name": "DevOps Team",
            "team_description": "Infrastructure and deployment automation",
            "message": "We need a dedicated team for DevOps and CI/CD processes",
            "status": "pending",
            "created_at": time.time() - random.randint(86400 * 1, 86400 * 7)
        },
        {
            "id": str(uuid.uuid4()),
            "requester_id": user_map["backend_mike"],
            "team_name": "QA Team",
            "team_description": "Quality assurance and testing",
            "message": "Separate QA team would improve our testing processes",
            "status": "pending",
            "created_at": time.time() - random.randint(86400 * 2, 86400 * 5)
        }
    ]
    
    for request_data in sample_creation_requests:
        data_manager.team_creation_requests.append(request_data)
    
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
            users_to_enroll = frontend_users + [user_map["david_rodriguez"]]
        elif i < 9:  # Backend boards
            users_to_enroll = backend_users + [user_map["sarah_johnson"]]
        else:  # Mobile boards
            users_to_enroll = mobile_users + [user_map["james_wilson"]]
        
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
            if random.random() > 0.3:  # 70% of tasks have due dates
                # Spread due dates across past 60 days and future 90 days
                days_offset = random.randint(-60, 90)
                due_date = datetime.now() + timedelta(days=days_offset)
                # Convert to Unix timestamp (seconds since epoch)
                due_date = due_date.timestamp()
            
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
            task_list = next(lst for lst in data_manager.lists if lst["id"] == task["list_id"])
            board = next(brd for brd in data_manager.boards if brd["id"] == task_list["board_id"])
            board_memberships = [mem for mem in data_manager.board_memberships if mem["board_id"] == board["id"]]
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
        task_list = next(lst for lst in data_manager.lists if lst["id"] == task["list_id"])
        board = next(brd for brd in data_manager.boards if brd["id"] == task_list["board_id"])
        board_memberships = [mem for mem in data_manager.board_memberships if mem["board_id"] == board["id"]]
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
                               if any(lst["board_id"] in user_board_ids 
                                    for lst in data_manager.lists 
                                    if lst["id"] == t["list_id"])]
        
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
    
    # Generate messaging data
    print("Generating messaging data...")
    
    # Create team conversations for each team
    for team in data_manager.teams:
        conversation = data_manager.message_repository.create_conversation(
            conversation_type="team",
            name=f"{team['name']} Team Chat",
            team_id=team["id"]
        )
        
        # Add all team members as participants
        team_members = [m for m in data_manager.team_memberships if m["team_id"] == team["id"]]
        for membership in team_members:
            data_manager.message_repository.add_participant(conversation["id"], membership["user_id"])
        
        # Generate some team messages
        team_messages = [
            "Hey team, let's discuss our sprint goals for this week.",
            "Great work on the latest release everyone!",
            "Don't forget about our standup meeting at 10 AM.",
            "I've updated the documentation for the new features.",
            "Can someone review my latest PR?",
            "The deployment went smoothly. All systems are operational.",
            "Let's schedule a retrospective for Friday.",
            "I'm working on the bug fixes for the reported issues.",
            "Has anyone experienced issues with the test environment?",
            "Remember to update your task statuses before EOD."
        ]
        
        # Generate messages for the past week
        for i in range(random.randint(15, 30)):
            sender = random.choice([m["user_id"] for m in team_members])
            message_content = random.choice(team_messages)
            timestamp = datetime.utcnow() - timedelta(hours=random.randint(1, 168))
            
            message = data_manager.message_repository.create_message(
                conversation_id=conversation["id"],
                sender_id=sender,
                content=message_content
            )
            # Adjust timestamp
            message["created_at"] = timestamp.isoformat()
            
            # Mark as read for some users
            for membership in team_members:
                if random.random() < 0.7:  # 70% chance of being read
                    data_manager.message_repository.mark_message_read(message["id"], membership["user_id"])
    
    # Create some private conversations
    private_conversation_pairs = [
        # David (Frontend Manager) chatting with team members
        ("david_rodriguez", "frontend_emma"),
        ("david_rodriguez", "frontend_alex"),
        
        # Sarah (Backend Manager) chatting with team members
        ("sarah_johnson", "backend_mike"),
        ("sarah_johnson", "backend_lisa"),
        
        # Cross-team conversations
        ("david_rodriguez", "sarah_johnson"),
        ("frontend_emma", "backend_mike"),
        ("mobile_carlos", "backend_raj"),
        
        # Admin conversations
        ("admin_alice", "david_rodriguez"),
        ("admin_alice", "sarah_johnson"),
    ]
    
    private_messages = [
        "Hey, do you have a moment to discuss the new feature?",
        "Sure, what's on your mind?",
        "I think we need to refactor this component.",
        "Good catch! Let's pair program on it tomorrow.",
        "Can you help me understand this code?",
        "Of course! Let me walk you through it.",
        "The client loved the demo!",
        "That's fantastic news!",
        "I'm stuck on this bug, any ideas?",
        "Let me take a look and get back to you.",
        "Thanks for your help earlier!",
        "No problem, happy to help anytime!",
        "Are you free for a quick call?",
        "Give me 5 minutes and I'll be ready.",
        "Great work on the presentation!",
        "Thanks! Your feedback really helped.",
    ]
    
    for user1_username, user2_username in private_conversation_pairs:
        user1 = next((u for u in data_manager.users if u["username"] == user1_username), None)
        user2 = next((u for u in data_manager.users if u["username"] == user2_username), None)
        
        if user1 and user2:
            # Create private conversation
            conversation = data_manager.message_repository.create_conversation(
                conversation_type="private",
                participant_ids=[user1["id"], user2["id"]]
            )
            
            # Generate conversation history
            for i in range(random.randint(4, 12)):
                sender = random.choice([user1["id"], user2["id"]])
                message_content = private_messages[i % len(private_messages)]
                timestamp = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
                
                message = data_manager.message_repository.create_message(
                    conversation_id=conversation["id"],
                    sender_id=sender,
                    content=message_content
                )
                # Adjust timestamp
                message["created_at"] = timestamp.isoformat()
                
                # Mark as read for both participants (most private messages are read)
                if random.random() < 0.9:  # 90% chance of being read
                    data_manager.message_repository.mark_message_read(message["id"], user1["id"])
                    data_manager.message_repository.mark_message_read(message["id"], user2["id"])
    
    print(f"Generated {len(data_manager.message_repository.conversations)} conversations")
    print(f"Generated {len(data_manager.message_repository.messages)} messages")
    
    # Create project_map
    project_map = {project["id"]: project for project in data_manager.projects}
    
    # Generate custom fields
    generate_custom_fields(data_manager, user_map, project_map, task_ids)
    
    # Generate time tracking data
    generate_time_tracking_data(data_manager, user_map, project_map, task_ids)

def generate_custom_fields(data_manager, user_map, project_map, task_ids):
    """Generate mock custom fields for various entities"""
    from ..models.custom_field_models import EntityType, FieldType, CustomFieldIn, FieldConfiguration, FieldOption
    
    # Create custom fields for projects
    project_fields = [
        {
            "name": "Project Budget",
            "field_type": FieldType.CURRENCY,
            "entity_type": EntityType.PROJECT,
            "description": "Total budget allocated for the project",
            "required": False,
            "configuration": {"prefix": "$", "decimal_places": 2}
        },
        {
            "name": "Project Status",
            "field_type": FieldType.SELECT,
            "entity_type": EntityType.PROJECT,
            "description": "Current project status",
            "required": True,
            "configuration": {
                "options": [
                    {"value": "planning", "label": "Planning", "color": "#3B82F6"},
                    {"value": "active", "label": "Active", "color": "#10B981"},
                    {"value": "on_hold", "label": "On Hold", "color": "#F59E0B"},
                    {"value": "completed", "label": "Completed", "color": "#6B7280"}
                ]
            }
        },
        {
            "name": "Client Name",
            "field_type": FieldType.TEXT,
            "entity_type": EntityType.PROJECT,
            "description": "Name of the client",
            "required": False,
            "configuration": {"max_length": 100}
        },
        {
            "name": "Project Tags",
            "field_type": FieldType.TAGS,
            "entity_type": EntityType.PROJECT,
            "description": "Tags for categorizing the project",
            "required": False,
            "configuration": {}
        }
    ]
    
    # Create custom fields for tasks
    task_fields = [
        {
            "name": "Story Points",
            "field_type": FieldType.NUMBER,
            "entity_type": EntityType.TASK,
            "description": "Estimated story points for the task",
            "required": False,
            "configuration": {},
            "validation_rules": {"min_value": 1, "max_value": 21}
        },
        {
            "name": "Sprint",
            "field_type": FieldType.SELECT,
            "entity_type": EntityType.TASK,
            "description": "Sprint assignment",
            "required": False,
            "configuration": {
                "options": [
                    {"value": "sprint_1", "label": "Sprint 1", "color": "#8B5CF6"},
                    {"value": "sprint_2", "label": "Sprint 2", "color": "#EC4899"},
                    {"value": "sprint_3", "label": "Sprint 3", "color": "#14B8A6"},
                    {"value": "backlog", "label": "Backlog", "color": "#6B7280"}
                ]
            }
        },
        {
            "name": "Complexity",
            "field_type": FieldType.RATING,
            "entity_type": EntityType.TASK,
            "description": "Task complexity rating",
            "required": False,
            "configuration": {},
            "validation_rules": {"max_value": 5}
        },
        {
            "name": "Blocked",
            "field_type": FieldType.CHECKBOX,
            "entity_type": EntityType.TASK,
            "description": "Is this task blocked?",
            "required": False,
            "configuration": {}
        },
        {
            "name": "Blocker Description",
            "field_type": FieldType.TEXT,
            "entity_type": EntityType.TASK,
            "description": "Description of what's blocking the task",
            "required": False,
            "configuration": {"max_length": 500}
        }
    ]
    
    # Create custom fields for boards
    board_fields = [
        {
            "name": "Board Type",
            "field_type": FieldType.SELECT,
            "entity_type": EntityType.BOARD,
            "description": "Type of board",
            "required": True,
            "configuration": {
                "options": [
                    {"value": "kanban", "label": "Kanban", "color": "#3B82F6"},
                    {"value": "scrum", "label": "Scrum", "color": "#10B981"},
                    {"value": "custom", "label": "Custom", "color": "#6B7280"}
                ]
            }
        },
        {
            "name": "Sprint Duration",
            "field_type": FieldType.NUMBER,
            "entity_type": EntityType.BOARD,
            "description": "Sprint duration in days",
            "required": False,
            "configuration": {"suffix": " days"},
            "validation_rules": {"min_value": 7, "max_value": 30}
        }
    ]
    
    # Create field definitions
    admin_id = user_map["admin_alice"]
    
    # Project fields
    for field_data_orig in project_fields:
        field_data = field_data_orig.copy()
        # Convert configuration dict to FieldConfiguration object
        config_data = field_data.pop("configuration", {})
        if "options" in config_data:
            config_data["options"] = [FieldOption(**opt) for opt in config_data["options"]]
        configuration = FieldConfiguration(**config_data)
        
        # Extract validation rules if present
        validation_rules = field_data.pop("validation_rules", {})
        
        # Create CustomFieldIn object
        field_in = CustomFieldIn(
            **field_data,
            configuration=configuration,
            validation_rules=validation_rules
        )
        
        field = data_manager.custom_field_service.create_field(field_in, admin_id)
        
        # Set values for some projects
        for project_id, project in project_map.items():
            if field.name == "Project Budget" and random.random() < 0.7:
                value = random.randint(10000, 500000)
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.PROJECT, project_id, value, admin_id
                )
            elif field.name == "Project Status":
                value = random.choice(["planning", "active", "on_hold", "completed"])
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.PROJECT, project_id, value, admin_id
                )
            elif field.name == "Client Name" and random.random() < 0.5:
                clients = ["Acme Corp", "TechStart Inc", "Global Systems", "Digital Solutions"]
                value = random.choice(clients)
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.PROJECT, project_id, value, admin_id
                )
            elif field.name == "Project Tags" and random.random() < 0.8:
                all_tags = ["urgent", "high-priority", "client-facing", "internal", "research", "maintenance"]
                value = random.sample(all_tags, random.randint(1, 3))
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.PROJECT, project_id, value, admin_id
                )
    
    # Task fields
    for field_data_orig in task_fields:
        field_data = field_data_orig.copy()
        # Convert configuration dict to FieldConfiguration object
        config_data = field_data.pop("configuration", {})
        if "options" in config_data:
            config_data["options"] = [FieldOption(**opt) for opt in config_data["options"]]
        configuration = FieldConfiguration(**config_data)
        
        # Extract validation rules if present
        validation_rules = field_data.pop("validation_rules", {})
        
        # Create CustomFieldIn object
        field_in = CustomFieldIn(
            **field_data,
            configuration=configuration,
            validation_rules=validation_rules
        )
        
        field = data_manager.custom_field_service.create_field(field_in, admin_id)
        
        # Set values for some tasks
        for task_id in random.sample(task_ids, min(len(task_ids) // 2, 50)):
            if field.name == "Story Points" and random.random() < 0.6:
                value = random.choice([1, 2, 3, 5, 8, 13])
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.TASK, task_id, value, admin_id
                )
            elif field.name == "Sprint" and random.random() < 0.7:
                value = random.choice(["sprint_1", "sprint_2", "sprint_3", "backlog"])
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.TASK, task_id, value, admin_id
                )
            elif field.name == "Complexity" and random.random() < 0.5:
                value = random.randint(1, 5)
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.TASK, task_id, value, admin_id
                )
            elif field.name == "Blocked" and random.random() < 0.1:
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.TASK, task_id, True, admin_id
                )
            elif field.name == "Blocker Description":
                # Only set if task is blocked
                blocked_field = next((f for f in data_manager.custom_field_repository.custom_field_definitions.values() 
                                    if f.name == "Blocked"), None)
                if blocked_field:
                    blocked_value = data_manager.custom_field_repository.get_field_value(
                        blocked_field.id, EntityType.TASK, task_id
                    )
                    if blocked_value and blocked_value.value:
                        blockers = [
                            "Waiting for API documentation",
                            "Dependency on another team",
                            "Requires design approval",
                            "Technical limitation discovered"
                        ]
                        data_manager.custom_field_service.set_field_value(
                            field.id, EntityType.TASK, task_id, random.choice(blockers), admin_id
                        )
    
    # Board fields
    for field_data_orig in board_fields:
        field_data = field_data_orig.copy()
        # Convert configuration dict to FieldConfiguration object
        config_data = field_data.pop("configuration", {})
        if "options" in config_data:
            config_data["options"] = [FieldOption(**opt) for opt in config_data["options"]]
        configuration = FieldConfiguration(**config_data)
        
        # Extract validation rules if present
        validation_rules = field_data.pop("validation_rules", {})
        
        # Create CustomFieldIn object
        field_in = CustomFieldIn(
            **field_data,
            configuration=configuration,
            validation_rules=validation_rules
        )
        
        field = data_manager.custom_field_service.create_field(field_in, admin_id)
        
        # Set values for all boards
        for board in data_manager.boards:
            if field.name == "Board Type":
                value = random.choice(["kanban", "scrum", "custom"])
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.BOARD, board["id"], value, admin_id
                )
            elif field.name == "Sprint Duration" and random.random() < 0.6:
                value = random.choice([7, 14, 21, 30])
                data_manager.custom_field_service.set_field_value(
                    field.id, EntityType.BOARD, board["id"], value, admin_id
                )
    
    # Create a template
    template_fields = [
        {
            "name": "Department",
            "field_type": "select",
            "entity_type": "task",
            "required": True,
            "configuration": {
                "options": [
                    {"value": "engineering", "label": "Engineering", "color": "#3B82F6"},
                    {"value": "design", "label": "Design", "color": "#EC4899"},
                    {"value": "qa", "label": "QA", "color": "#10B981"}
                ]
            }
        },
        {
            "name": "Estimated Hours",
            "field_type": "number",
            "entity_type": "task",
            "required": False,
            "configuration": {"suffix": " hours"},
            "validation_rules": {"min_value": 0, "max_value": 100}
        }
    ]
    
    from ..models.custom_field_models import FieldTemplateIn
    
    template_in = FieldTemplateIn(
        name="Software Development Template",
        description="Standard fields for software development tasks",
        entity_type=EntityType.TASK,
        category="it",
        fields=template_fields,
        is_public=True
    )
    
    data_manager.custom_field_service.create_template(template_in, admin_id)
    
    print(f"Generated {len(list(data_manager.custom_field_repository.custom_field_definitions.values()))} custom field definitions")
    print(f"Generated {len(list(data_manager.custom_field_repository.custom_field_values.values()))} custom field values")
    print(f"Generated {len(list(data_manager.custom_field_repository.field_templates.values()))} field templates")


def generate_time_tracking_data(data_manager, user_map, project_map, task_ids):
    """Generate mock time tracking data for various entities"""
    from datetime import datetime, timedelta, time
    from ..models.time_tracking_models import (
        TimeEntry, TaskEstimate, TaskProgress, WorkPattern,
        SprintBurndown, TeamVelocity, TimeTrackingAlert, TimeSheet,
        ProjectTimebudget, TimeTrackingSettings,
        TimeEntryStatus, ProgressMetricType, EstimateUnit,
        WorkPatternType, TimeTrackingMode, AlertType
    )
    
    print("\nGenerating time tracking data...")
    
    # Create work patterns for users
    work_patterns = [
        ("admin_alice", WorkPatternType.FLEXIBLE, 8, 18, [1,2,3,4,5]),
        ("david_rodriguez", WorkPatternType.STANDARD, 9, 17, [1,2,3,4,5]),
        ("sarah_johnson", WorkPatternType.STANDARD, 9, 17, [1,2,3,4,5]),
        ("frontend_emma", WorkPatternType.FLEXIBLE, 10, 18, [1,2,3,4,5]),
        ("backend_mike", WorkPatternType.STANDARD, 9, 17, [1,2,3,4,5]),
        ("mobile_carlos", WorkPatternType.SHIFT, 14, 22, [1,2,3,4,5])
    ]
    
    for username, pattern_type, start_hour, end_hour, working_days in work_patterns:
        if username in user_map:
            pattern = WorkPattern(
                user_id=user_map[username],
                pattern_type=pattern_type,
                timezone="UTC",
                working_days=working_days,
                start_time=time(start_hour, 0),
                end_time=time(end_hour, 0),
                break_duration_minutes=60
            )
            data_manager.time_tracking_repository.create_work_pattern(pattern)
    
    # Create time entries for the past 30 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Sample users and tasks
    active_users = ["frontend_emma", "backend_mike", "mobile_carlos", "sarah_johnson"]
    active_user_ids = [user_map[u] for u in active_users if u in user_map]
    sample_tasks = random.sample(task_ids, min(len(task_ids), 20))
    
    # Generate time entries
    for day_offset in range(30):
        current_date = start_date + timedelta(days=day_offset)
        
        # Skip weekends
        if current_date.weekday() >= 5:
            continue
        
        # Each user logs 2-4 entries per day
        for user_id in active_user_ids:
            num_entries = random.randint(2, 4)
            
            for _ in range(num_entries):
                # Random start time between 8 AM and 4 PM
                hour = random.randint(8, 16)
                minute = random.choice([0, 15, 30, 45])
                start_time = current_date.replace(hour=hour, minute=minute)
                
                # Duration between 30 minutes and 3 hours
                duration = random.randint(30, 180)
                end_time = start_time + timedelta(minutes=duration)
                
                # Create time entry
                task_id = random.choice(sample_tasks) if random.random() < 0.8 else None
                project_id = random.choice(list(project_map.keys())) if random.random() < 0.9 else None
                
                descriptions = [
                    "Code review and feedback",
                    "Feature implementation",
                    "Bug fixing",
                    "Documentation update",
                    "Team meeting",
                    "Sprint planning",
                    "Testing and QA",
                    "Deployment preparation",
                    "Research and investigation",
                    "Client communication"
                ]
                
                entry = TimeEntry(
                    user_id=user_id,
                    task_id=task_id,
                    project_id=project_id,
                    description=random.choice(descriptions),
                    start_time=start_time,
                    end_time=end_time,
                    billable=random.random() < 0.7,
                    status=TimeEntryStatus.APPROVED if day_offset > 7 else TimeEntryStatus.SUBMITTED,
                    tags=["development"] if task_id else ["meeting"],
                    rate_per_hour=random.choice([50, 75, 100, 125]) if random.random() < 0.5 else None
                )
                
                data_manager.time_tracking_repository.create_time_entry(entry)
    
    # Create task estimates
    estimate_units = [EstimateUnit.HOURS, EstimateUnit.DAYS, EstimateUnit.STORY_POINTS]
    
    for task_id in random.sample(task_ids, min(len(task_ids) // 3, 30)):
        estimate = TaskEstimate(
            task_id=task_id,
            estimated_value=random.choice([2, 4, 8, 16, 24, 40]) if random.random() < 0.5 else random.randint(1, 8),
            estimate_unit=random.choice(estimate_units),
            confidence_level=random.randint(60, 95),
            estimated_by=random.choice(active_user_ids),
            notes="Initial estimate based on requirements"
        )
        data_manager.time_tracking_repository.create_task_estimate(estimate)
    
    # Create task progress entries
    for task_id in random.sample(task_ids, min(len(task_ids) // 4, 20)):
        progress = TaskProgress(
            task_id=task_id,
            metric_type=ProgressMetricType.PERCENTAGE,
            current_value=random.randint(0, 100),
            target_value=100,
            updated_by=random.choice(active_user_ids),
            notes="Progress update"
        )
        data_manager.time_tracking_repository.create_task_progress(progress)
    
    # Create project budgets
    for project_id, project in project_map.items():
        if random.random() < 0.7:
            budget = ProjectTimebudget(
                project_id=project_id,
                total_hours_budget=random.choice([100, 200, 500, 1000, 2000]),
                billable_hours_budget=random.choice([80, 160, 400, 800, 1600]),
                hours_used=random.randint(0, 200),
                billable_hours_used=random.randint(0, 150),
                budget_alert_threshold=80.0,
                cost_budget=random.choice([10000, 25000, 50000, 100000]) if random.random() < 0.5 else None
            )
            data_manager.time_tracking_repository.create_project_timebudget(budget)
    
    # Create time tracking settings for some users
    for username in ["admin_alice", "david_rodriguez"]:
        if username in user_map:
            settings = TimeTrackingSettings(
                entity_type="user",
                entity_id=user_map[username],
                tracking_mode=TimeTrackingMode.MANUAL,
                require_task_association=True,
                require_description=True,
                minimum_entry_duration=15,
                rounding_interval=15,
                reminder_enabled=True,
                reminder_interval=120
            )
            data_manager.time_tracking_repository.create_settings(settings)
    
    # Create some alerts
    alert_types = [
        (AlertType.OVERTIME, "You've exceeded 8 hours today", "high"),
        (AlertType.DEADLINE_APPROACHING, "Sprint deadline in 2 days", "medium"),
        (AlertType.BUDGET_EXCEEDED, "Project budget at 85%", "high")
    ]
    
    for alert_type, message, severity in alert_types:
        if random.random() < 0.5:
            alert = TimeTrackingAlert(
                alert_type=alert_type,
                severity=severity,
                user_id=random.choice(active_user_ids) if alert_type == AlertType.OVERTIME else None,
                project_id=random.choice(list(project_map.keys())) if alert_type == AlertType.BUDGET_EXCEEDED else None,
                title=f"{alert_type.value.replace('_', ' ').title()} Alert",
                message=message
            )
            data_manager.time_tracking_repository.create_alert(alert)
    
    # Create a sample sprint burndown
    if project_map:
        project_id = random.choice(list(project_map.keys()))
        burndown = SprintBurndown(
            sprint_id=f"sprint_{random.randint(1, 5)}",
            project_id=project_id,
            burndown_type="sprint",
            start_date=date.today() - timedelta(days=14),
            end_date=date.today() + timedelta(days=7),
            total_points=100.0
        )
        
        # Add some data points
        for i in range(5):
            burndown.add_data_point(
                date.today() - timedelta(days=14-i*3),
                100 - (i * 20),
                i * 20
            )
        
        data_manager.time_tracking_repository.create_sprint_burndown(burndown)
    
    # Create team velocity entries
    team_ids = [team["id"] for team in data_manager.teams[:2]]
    for team_id in team_ids:
        for i in range(3):
            velocity = TeamVelocity(
                team_id=team_id,
                period="sprint",
                period_start=date.today() - timedelta(days=30*(i+1)),
                period_end=date.today() - timedelta(days=30*i),
                planned_points=random.randint(80, 120),
                completed_points=random.randint(60, 100),
                team_size=random.randint(4, 8),
                available_hours=random.randint(500, 800)
            )
            data_manager.time_tracking_repository.create_team_velocity(velocity)
    
    # Create a few timesheets
    for user_id in active_user_ids[:2]:
        # Current period
        timesheet = TimeSheet(
            user_id=user_id,
            period_start=date.today() - timedelta(days=7),
            period_end=date.today(),
            status=TimeEntryStatus.DRAFT
        )
        
        # Calculate totals from actual entries
        entries = data_manager.time_tracking_repository.get_user_time_entries(
            user_id, timesheet.period_start, timesheet.period_end
        )
        
        total_hours = sum(e.duration_minutes or 0 for e in entries) / 60
        billable_hours = sum((e.duration_minutes or 0) for e in entries if e.billable) / 60
        
        timesheet.total_hours = total_hours
        timesheet.billable_hours = billable_hours
        timesheet.non_billable_hours = total_hours - billable_hours
        timesheet.entries = [e.id for e in entries]
        
        data_manager.time_tracking_repository.create_timesheet(timesheet)
    
    print(f"Generated {len(data_manager.time_tracking_repository.time_entries)} time entries")
    print(f"Generated {len(data_manager.time_tracking_repository.task_estimates)} task estimates")
    print(f"Generated {len(data_manager.time_tracking_repository.task_progress)} task progress entries")
    print(f"Generated {len(data_manager.time_tracking_repository.work_patterns)} work patterns")
    print(f"Generated {len(data_manager.time_tracking_repository.project_timebudgets)} project budgets")
    print(f"Generated {len(data_manager.time_tracking_repository.time_tracking_alerts)} alerts") 