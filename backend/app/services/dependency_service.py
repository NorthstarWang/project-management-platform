"""
Dependency & Workflow Service

This module provides business logic for managing task dependencies,
workflows, and automated task progression.
"""

from typing import List, Optional, Dict, Any, Set, Tuple
from datetime import datetime, timedelta
import uuid
from collections import defaultdict, deque


class DependencyService:
    """Service for managing task dependencies and workflows"""
    
    def __init__(self, dependency_repository, task_repository, project_repository, board_repository):
        self.dependency_repo = dependency_repository
        self.task_repo = task_repository
        self.project_repo = project_repository
        self.board_repo = board_repository
    
    # Task Dependency Methods
    
    def create_dependency(self, task_id: str, depends_on_id: str, dependency_type: str = "finish_to_start", lag_time: int = 0) -> Dict[str, Any]:
        """Create a dependency between tasks"""
        # Validate tasks exist
        task = self.task_repo.find_by_id(task_id)
        depends_on = self.task_repo.find_by_id(depends_on_id)
        
        if not task or not depends_on:
            raise ValueError("One or both tasks not found")
        
        # Check if tasks are in the same project
        if task.get("project_id") != depends_on.get("project_id"):
            raise ValueError("Tasks must be in the same project")
        
        # Check for existing dependency
        if self.dependency_repo.dependency_exists(task_id, depends_on_id):
            raise ValueError("Dependency already exists")
        
        # Check for circular dependencies
        if self._would_create_cycle(task_id, depends_on_id):
            raise ValueError("This dependency would create a circular reference")
        
        # Create the dependency
        dependency_data = {
            "task_id": task_id,
            "depends_on_id": depends_on_id,
            "dependency_type": dependency_type,
            "lag_time": lag_time
        }
        
        return self.dependency_repo.create_dependency(dependency_data)
    
    def get_task_dependencies(self, task_id: str) -> List[Dict[str, Any]]:
        """Get direct dependencies for a task"""
        return self.dependency_repo.get_task_dependencies(task_id)
    
    def get_task_dependents(self, task_id: str) -> List[Dict[str, Any]]:
        """Get tasks that depend on this task"""
        return self.dependency_repo.get_task_dependents(task_id)
    
    def get_all_dependencies(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all dependencies (including transitive) for a task"""
        all_deps = []
        visited = set()
        queue = deque([task_id])
        
        while queue:
            current_id = queue.popleft()
            if current_id in visited:
                continue
            
            visited.add(current_id)
            deps = self.get_task_dependencies(current_id)
            all_deps.extend(deps)
            
            for dep in deps:
                queue.append(dep["depends_on_id"])
        
        return all_deps
    
    def delete_dependency(self, dependency_id: str) -> bool:
        """Delete a task dependency"""
        return self.dependency_repo.delete_dependency(dependency_id)
    
    def validate_dependencies(self, task_id: str) -> Dict[str, Any]:
        """Validate dependencies for a task"""
        task = self.task_repo.find_by_id(task_id)
        if not task:
            return {"is_valid": False, "errors": ["Task not found"]}
        
        dependencies = self.get_task_dependencies(task_id)
        errors = []
        warnings = []
        
        for dep in dependencies:
            dep_task = self.task_repo.find_by_id(dep["depends_on_id"])
            if not dep_task:
                errors.append(f"Dependency task {dep['depends_on_id']} not found")
                continue
            
            # Check dependency type constraints
            if dep["dependency_type"] == "finish_to_start":
                if dep_task.get("status") != "completed" and task.get("status") == "in_progress":
                    warnings.append(f"Task depends on {dep_task.get('title')} which is not completed")
            
            elif dep["dependency_type"] == "start_to_start":
                if dep_task.get("status") == "pending" and task.get("status") == "in_progress":
                    warnings.append(f"Task should start with {dep_task.get('title')} which hasn't started")
        
        # Check for circular dependencies
        if self._has_circular_dependency(task_id):
            errors.append("Circular dependency detected")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "can_start": self.can_task_start(task_id),
            "blocking_tasks": self.get_blocking_tasks(task_id)
        }
    
    def can_task_start(self, task_id: str) -> bool:
        """Check if a task can start based on its dependencies"""
        dependencies = self.get_task_dependencies(task_id)
        
        for dep in dependencies:
            dep_task = self.task_repo.find_by_id(dep["depends_on_id"])
            if not dep_task:
                return False
            
            if dep["dependency_type"] == "finish_to_start":
                if dep_task.get("status") != "completed":
                    return False
            elif dep["dependency_type"] == "start_to_start":
                if dep_task.get("status") == "pending":
                    return False
            elif dep["dependency_type"] == "finish_to_finish":
                # Can start but can't finish until dependency finishes
                pass
            elif dep["dependency_type"] == "start_to_finish":
                # Rare type - dependent task can't finish until this starts
                pass
        
        return True
    
    def get_blocking_tasks(self, task_id: str) -> List[Dict[str, Any]]:
        """Get tasks that are blocking this task from starting"""
        blocking = []
        dependencies = self.get_task_dependencies(task_id)
        
        for dep in dependencies:
            dep_task = self.task_repo.find_by_id(dep["depends_on_id"])
            if dep_task and dep["dependency_type"] == "finish_to_start" and dep_task.get("status") != "completed":
                blocking.append(dep_task)
        
        return blocking
    
    def calculate_critical_path(self, project_id: str) -> Dict[str, Any]:
        """Calculate critical path for a project"""
        # Get all project tasks
        project_tasks = self.task_repo.get_by_project(project_id)
        if not project_tasks:
            return {"critical_path": [], "total_duration": 0, "critical_tasks": []}
        
        task_ids = {task["id"] for task in project_tasks}
        dependencies = self.dependency_repo.get_all_project_dependencies(project_id, task_ids)
        
        # Build adjacency lists
        successors = defaultdict(list)
        predecessors = defaultdict(list)
        
        for dep in dependencies:
            if dep["dependency_type"] == "finish_to_start":  # Simplify to F2S for critical path
                successors[dep["depends_on_id"]].append(dep["task_id"])
                predecessors[dep["task_id"]].append(dep["depends_on_id"])
        
        # Find tasks with no predecessors (start nodes)
        start_tasks = [task["id"] for task in project_tasks if task["id"] not in predecessors]
        
        # Calculate earliest start times (forward pass)
        earliest_start = {}
        earliest_finish = {}
        task_durations = {task["id"]: self._estimate_task_duration(task) for task in project_tasks}
        
        # Topological sort
        visited = set()
        topo_order = []
        
        def visit(task_id):
            if task_id in visited:
                return
            visited.add(task_id)
            for pred in predecessors[task_id]:
                visit(pred)
            topo_order.append(task_id)
        
        for task in project_tasks:
            visit(task["id"])
        
        # Forward pass
        for task_id in topo_order:
            if task_id in start_tasks:
                earliest_start[task_id] = 0
            else:
                earliest_start[task_id] = max(
                    earliest_finish.get(pred, 0) for pred in predecessors[task_id]
                )
            earliest_finish[task_id] = earliest_start[task_id] + task_durations[task_id]
        
        # Find end tasks and project duration
        end_tasks = [task["id"] for task in project_tasks if task["id"] not in successors]
        project_duration = max(earliest_finish.get(task_id, 0) for task_id in end_tasks) if end_tasks else 0
        
        # Backward pass
        latest_finish = {}
        latest_start = {}
        
        for task_id in reversed(topo_order):
            if task_id in end_tasks:
                latest_finish[task_id] = project_duration
            else:
                latest_finish[task_id] = min(
                    latest_start.get(succ, project_duration) for succ in successors[task_id]
                )
            latest_start[task_id] = latest_finish[task_id] - task_durations[task_id]
        
        # Calculate slack and identify critical tasks
        critical_tasks = []
        task_slack = {}
        
        for task in project_tasks:
            task_id = task["id"]
            slack = latest_start.get(task_id, 0) - earliest_start.get(task_id, 0)
            task_slack[task_id] = slack
            
            if slack == 0:
                critical_tasks.append({
                    "task": task,
                    "earliest_start": earliest_start.get(task_id, 0),
                    "latest_start": latest_start.get(task_id, 0),
                    "duration": task_durations[task_id],
                    "slack": slack
                })
        
        # Build critical path
        critical_path = []
        if critical_tasks:
            # Sort critical tasks by earliest start time
            critical_tasks.sort(key=lambda x: x["earliest_start"])
            critical_path = [ct["task"]["id"] for ct in critical_tasks]
        
        return {
            "critical_path": critical_path,
            "total_duration": project_duration,
            "critical_tasks": critical_tasks,
            "all_tasks_slack": task_slack
        }
    
    def get_dependency_graph(self, project_id: str) -> Dict[str, Any]:
        """Get dependency graph visualization data"""
        project_tasks = self.task_repo.get_by_project(project_id)
        task_ids = {task["id"] for task in project_tasks}
        dependencies = self.dependency_repo.get_all_project_dependencies(project_id, task_ids)
        
        # Build nodes
        nodes = []
        for task in project_tasks:
            nodes.append({
                "id": task["id"],
                "label": task["title"],
                "status": task.get("status", "pending"),
                "assignee": task.get("assignee_id"),
                "duration": self._estimate_task_duration(task)
            })
        
        # Build edges
        edges = []
        for dep in dependencies:
            edges.append({
                "id": dep["id"],
                "source": dep["depends_on_id"],
                "target": dep["task_id"],
                "type": dep["dependency_type"],
                "lag": dep.get("lag_time", 0)
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_tasks": len(nodes),
                "total_dependencies": len(edges),
                "dependency_types": self._count_dependency_types(dependencies)
            }
        }
    
    # Workflow Methods
    
    def create_workflow_template(self, name: str, description: str, board_id: str, steps: List[Dict[str, Any]], triggers: List[str]) -> Dict[str, Any]:
        """Create a workflow template"""
        # Validate board exists
        board = self.board_repo.get_board(board_id)
        if not board:
            raise ValueError("Board not found")
        
        # Create template
        template_data = {
            "name": name,
            "description": description,
            "board_id": board_id,
            "triggers": triggers
        }
        
        template = self.dependency_repo.create_workflow_template(template_data)
        
        # Create steps
        for i, step_data in enumerate(steps):
            step = {
                "template_id": template["id"],
                "name": step_data["name"],
                "description": step_data.get("description", ""),
                "action_type": step_data["action_type"],
                "action_config": step_data.get("action_config", {}),
                "conditions": step_data.get("conditions", []),
                "order": i
            }
            self.dependency_repo.create_workflow_step(step)
        
        return template
    
    def get_workflow_templates(self, board_id: Optional[str] = None, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get workflow templates"""
        templates = self.dependency_repo.get_workflow_templates(board_id, is_active)
        
        # Enrich with step count
        for template in templates:
            steps = self.dependency_repo.get_workflow_steps(template["id"])
            template["step_count"] = len(steps)
        
        return templates
    
    def get_workflow_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific workflow template with steps"""
        template = self.dependency_repo.get_workflow_template(template_id)
        if template:
            template["steps"] = self.dependency_repo.get_workflow_steps(template_id)
        return template
    
    def update_workflow_template(self, template_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a workflow template"""
        return self.dependency_repo.update_workflow_template(template_id, updates)
    
    def delete_workflow_template(self, template_id: str) -> bool:
        """Delete a workflow template"""
        return self.dependency_repo.delete_workflow_template(template_id)
    
    def trigger_workflow(self, template_id: str, trigger_task_id: str, triggered_by: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Trigger a workflow instance"""
        # Validate template
        template = self.get_workflow_template(template_id)
        if not template:
            raise ValueError("Workflow template not found")
        
        # Validate trigger task
        task = self.task_repo.find_by_id(trigger_task_id)
        if not task:
            raise ValueError("Trigger task not found")
        
        # Check if workflow should trigger based on conditions
        if not self._should_trigger_workflow(template, task):
            raise ValueError("Workflow conditions not met")
        
        # Create instance
        instance_data = {
            "template_id": template_id,
            "trigger_task_id": trigger_task_id,
            "triggered_by": triggered_by,
            "variables": variables or {},
            "context": {
                "task": task,
                "project_id": task.get("project_id"),
                "board_id": task.get("board_id")
            }
        }
        
        instance = self.dependency_repo.create_workflow_instance(instance_data)
        
        # Create initial step executions
        steps = template["steps"]
        if steps:
            first_step = steps[0]
            self._create_step_execution(instance["id"], first_step)
        
        # Update instance status
        self.dependency_repo.update_workflow_instance(instance["id"], {"status": "in_progress"})
        
        return instance
    
    def get_workflow_instances(self, template_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get workflow instances"""
        return self.dependency_repo.get_workflow_instances(template_id, status)
    
    def get_workflow_instance(self, instance_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific workflow instance"""
        instance = self.dependency_repo.get_workflow_instance(instance_id)
        if instance:
            instance["executions"] = self.dependency_repo.get_step_executions(instance_id)
        return instance
    
    def advance_workflow(self, instance_id: str, completed_step_id: str) -> bool:
        """Advance workflow to next step"""
        instance = self.get_workflow_instance(instance_id)
        if not instance:
            return False
        
        # Mark current step as completed
        executions = instance["executions"]
        current_exec = next((e for e in executions if e["step_id"] == completed_step_id and e["status"] == "in_progress"), None)
        
        if not current_exec:
            return False
        
        self.dependency_repo.update_step_execution(current_exec["id"], {"status": "completed"})
        
        # Get template and steps
        template = self.get_workflow_template(instance["template_id"])
        if not template:
            return False
        
        steps = template["steps"]
        current_step_index = next((i for i, s in enumerate(steps) if s["id"] == completed_step_id), -1)
        
        # Check if there are more steps
        if current_step_index < len(steps) - 1:
            next_step = steps[current_step_index + 1]
            self._create_step_execution(instance_id, next_step)
        else:
            # Workflow completed
            self.dependency_repo.update_workflow_instance(instance_id, {
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat()
            })
        
        return True
    
    def cancel_workflow(self, instance_id: str, reason: str) -> bool:
        """Cancel a workflow instance"""
        instance = self.dependency_repo.get_workflow_instance(instance_id)
        if not instance or instance.get("status") not in ["pending", "in_progress"]:
            return False
        
        # Update instance
        self.dependency_repo.update_workflow_instance(instance_id, {
            "status": "cancelled",
            "cancelled_at": datetime.utcnow().isoformat(),
            "cancellation_reason": reason
        })
        
        # Cancel pending executions
        executions = self.dependency_repo.get_step_executions(instance_id)
        for exec in executions:
            if exec["status"] in ["pending", "in_progress"]:
                self.dependency_repo.update_step_execution(exec["id"], {"status": "cancelled"})
        
        return True
    
    def get_workflow_progress(self, instance_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow progress"""
        instance = self.get_workflow_instance(instance_id)
        if not instance:
            return None
        
        template = self.get_workflow_template(instance["template_id"])
        if not template:
            return None
        
        total_steps = len(template["steps"])
        completed_steps = len([e for e in instance["executions"] if e["status"] == "completed"])
        
        current_step = next((e for e in instance["executions"] if e["status"] == "in_progress"), None)
        
        return {
            "instance_id": instance_id,
            "status": instance["status"],
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "progress_percentage": (completed_steps / total_steps * 100) if total_steps > 0 else 0,
            "current_step": current_step,
            "created_at": instance["created_at"],
            "completed_at": instance.get("completed_at")
        }
    
    def get_workflow_analytics(self, template_id: str) -> Dict[str, Any]:
        """Get workflow performance analytics"""
        instances = self.dependency_repo.get_workflow_instances(template_id)
        
        if not instances:
            return {
                "template_id": template_id,
                "total_instances": 0,
                "completion_rate": 0,
                "average_duration": 0,
                "status_breakdown": {}
            }
        
        # Calculate metrics
        total = len(instances)
        completed = len([i for i in instances if i["status"] == "completed"])
        cancelled = len([i for i in instances if i["status"] == "cancelled"])
        in_progress = len([i for i in instances if i["status"] == "in_progress"])
        
        # Calculate average duration for completed workflows
        durations = []
        for instance in instances:
            if instance["status"] == "completed" and instance.get("completed_at"):
                start = datetime.fromisoformat(instance["created_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(instance["completed_at"].replace("Z", "+00:00"))
                duration = (end - start).total_seconds() / 3600  # Hours
                durations.append(duration)
        
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        return {
            "template_id": template_id,
            "total_instances": total,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
            "average_duration_hours": avg_duration,
            "status_breakdown": {
                "completed": completed,
                "cancelled": cancelled,
                "in_progress": in_progress
            },
            "recent_instances": instances[:10]  # Last 10 instances
        }
    
    def identify_bottlenecks(self, project_id: str) -> Dict[str, Any]:
        """Identify dependency bottlenecks in a project"""
        project_tasks = self.task_repo.get_by_project(project_id)
        task_ids = {task["id"] for task in project_tasks}
        dependencies = self.dependency_repo.get_all_project_dependencies(project_id, task_ids)
        
        # Count dependencies per task
        dependency_count = defaultdict(int)
        dependent_count = defaultdict(int)
        
        for dep in dependencies:
            dependency_count[dep["task_id"]] += 1
            dependent_count[dep["depends_on_id"]] += 1
        
        # Identify bottlenecks
        bottlenecks = []
        
        for task in project_tasks:
            task_id = task["id"]
            blocking_count = dependent_count[task_id]
            
            if blocking_count >= 3:  # Task blocks 3 or more other tasks
                bottlenecks.append({
                    "task": task,
                    "blocking_count": blocking_count,
                    "blocked_tasks": [
                        self.task_repo.find_by_id(dep["task_id"])
                        for dep in dependencies
                        if dep["depends_on_id"] == task_id
                    ],
                    "severity": "high" if blocking_count >= 5 else "medium"
                })
        
        # Sort by blocking count
        bottlenecks.sort(key=lambda x: x["blocking_count"], reverse=True)
        
        return {
            "project_id": project_id,
            "bottlenecks": bottlenecks,
            "total_dependencies": len(dependencies),
            "high_severity_count": len([b for b in bottlenecks if b["severity"] == "high"]),
            "recommendations": self._generate_bottleneck_recommendations(bottlenecks)
        }
    
    # Helper Methods
    
    def _would_create_cycle(self, task_id: str, depends_on_id: str) -> bool:
        """Check if adding a dependency would create a cycle"""
        visited = set()
        
        def has_path(from_id: str, to_id: str) -> bool:
            if from_id == to_id:
                return True
            if from_id in visited:
                return False
            
            visited.add(from_id)
            deps = self.get_task_dependencies(from_id)
            
            for dep in deps:
                if has_path(dep["depends_on_id"], to_id):
                    return True
            
            return False
        
        return has_path(depends_on_id, task_id)
    
    def _has_circular_dependency(self, task_id: str) -> bool:
        """Check if a task is part of a circular dependency"""
        visited = set()
        rec_stack = set()
        
        def is_cyclic(current_id: str) -> bool:
            visited.add(current_id)
            rec_stack.add(current_id)
            
            deps = self.get_task_dependencies(current_id)
            for dep in deps:
                dep_id = dep["depends_on_id"]
                if dep_id not in visited:
                    if is_cyclic(dep_id):
                        return True
                elif dep_id in rec_stack:
                    return True
            
            rec_stack.remove(current_id)
            return False
        
        return is_cyclic(task_id)
    
    def _estimate_task_duration(self, task: Dict[str, Any]) -> int:
        """Estimate task duration in days"""
        # Simple estimation based on task properties
        # In real implementation, this could use historical data
        if task.get("estimated_hours"):
            return max(1, task["estimated_hours"] // 8)  # Convert hours to days
        
        # Default estimates based on priority
        priority = task.get("priority", "medium")
        if priority == "high":
            return 3
        elif priority == "low":
            return 1
        else:
            return 2
    
    def _count_dependency_types(self, dependencies: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count occurrences of each dependency type"""
        counts = defaultdict(int)
        for dep in dependencies:
            counts[dep["dependency_type"]] += 1
        return dict(counts)
    
    def _should_trigger_workflow(self, template: Dict[str, Any], task: Dict[str, Any]) -> bool:
        """Check if workflow should trigger based on task state"""
        triggers = template.get("triggers", [])
        
        # Simple trigger evaluation
        if "task_completed" in triggers and task.get("status") == "completed":
            return True
        if "task_created" in triggers and task.get("status") == "pending":
            return True
        if "task_moved" in triggers:
            # Would need to track state changes for this
            return True
        
        return False
    
    def _create_step_execution(self, instance_id: str, step: Dict[str, Any]) -> Dict[str, Any]:
        """Create a step execution record"""
        execution_data = {
            "instance_id": instance_id,
            "step_id": step["id"],
            "step_name": step["name"],
            "status": "in_progress"
        }
        
        return self.dependency_repo.create_step_execution(execution_data)
    
    def _generate_bottleneck_recommendations(self, bottlenecks: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations for addressing bottlenecks"""
        recommendations = []
        
        if not bottlenecks:
            recommendations.append("No significant bottlenecks detected.")
            return recommendations
        
        # High severity bottlenecks
        high_severity = [b for b in bottlenecks if b["severity"] == "high"]
        if high_severity:
            recommendations.append(
                f"Consider breaking down {len(high_severity)} high-severity bottleneck tasks "
                "into smaller, parallel subtasks."
            )
        
        # Tasks blocking many others
        max_blocking = max(b["blocking_count"] for b in bottlenecks) if bottlenecks else 0
        if max_blocking >= 5:
            recommendations.append(
                "Some tasks block 5+ other tasks. Consider prioritizing these tasks "
                "or assigning additional resources."
            )
        
        # General recommendation
        recommendations.append(
            "Review task dependencies to identify opportunities for parallel execution."
        )
        
        return recommendations