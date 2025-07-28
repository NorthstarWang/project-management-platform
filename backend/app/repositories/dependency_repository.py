"""
Dependency & Workflow Repository

This module handles data persistence for task dependencies and workflows.
"""

from typing import List, Optional, Dict, Any, Set
from datetime import datetime
import uuid


class DependencyRepository:
    """Repository for managing task dependencies and workflows"""
    
    def __init__(self):
        # In-memory storage
        self.task_dependencies: Dict[str, Dict[str, Any]] = {}
        self.workflow_templates: Dict[str, Dict[str, Any]] = {}
        self.workflow_instances: Dict[str, Dict[str, Any]] = {}
        self.workflow_steps: Dict[str, Dict[str, Any]] = {}
        self.step_executions: Dict[str, Dict[str, Any]] = {}
    
    # Task Dependency Methods
    
    def create_dependency(self, dependency_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task dependency"""
        dependency_id = str(uuid.uuid4())
        dependency = {
            "id": dependency_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            **dependency_data
        }
        self.task_dependencies[dependency_id] = dependency
        return dependency
    
    def get_dependency(self, dependency_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific dependency by ID"""
        return self.task_dependencies.get(dependency_id)
    
    def get_task_dependencies(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all dependencies for a task (tasks this task depends on)"""
        return [
            dep for dep in self.task_dependencies.values()
            if dep["task_id"] == task_id
        ]
    
    def get_task_dependents(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all tasks that depend on this task"""
        return [
            dep for dep in self.task_dependencies.values()
            if dep["depends_on_id"] == task_id
        ]
    
    def delete_dependency(self, dependency_id: str) -> bool:
        """Delete a task dependency"""
        if dependency_id in self.task_dependencies:
            del self.task_dependencies[dependency_id]
            return True
        return False
    
    def get_all_project_dependencies(self, project_id: str, task_ids: Set[str]) -> List[Dict[str, Any]]:
        """Get all dependencies for tasks in a project"""
        return [
            dep for dep in self.task_dependencies.values()
            if dep["task_id"] in task_ids or dep["depends_on_id"] in task_ids
        ]
    
    def dependency_exists(self, task_id: str, depends_on_id: str) -> bool:
        """Check if a dependency already exists between two tasks"""
        return any(
            dep["task_id"] == task_id and dep["depends_on_id"] == depends_on_id
            for dep in self.task_dependencies.values()
        )
    
    # Workflow Template Methods
    
    def create_workflow_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new workflow template"""
        template_id = str(uuid.uuid4())
        template = {
            "id": template_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_active": True,
            **template_data
        }
        self.workflow_templates[template_id] = template
        return template
    
    def get_workflow_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific workflow template"""
        return self.workflow_templates.get(template_id)
    
    def get_workflow_templates(self, board_id: Optional[str] = None, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get workflow templates with optional filters"""
        templates = list(self.workflow_templates.values())
        
        if board_id is not None:
            templates = [t for t in templates if t.get("board_id") == board_id]
        
        if is_active is not None:
            templates = [t for t in templates if t.get("is_active") == is_active]
        
        return templates
    
    def update_workflow_template(self, template_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a workflow template"""
        if template_id in self.workflow_templates:
            template = self.workflow_templates[template_id]
            template.update(updates)
            template["updated_at"] = datetime.utcnow().isoformat()
            return template
        return None
    
    def delete_workflow_template(self, template_id: str) -> bool:
        """Delete a workflow template"""
        if template_id in self.workflow_templates:
            del self.workflow_templates[template_id]
            # Also delete associated steps
            step_ids = [
                step_id for step_id, step in self.workflow_steps.items()
                if step.get("template_id") == template_id
            ]
            for step_id in step_ids:
                del self.workflow_steps[step_id]
            return True
        return False
    
    # Workflow Step Methods
    
    def create_workflow_step(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a workflow step"""
        step_id = str(uuid.uuid4())
        step = {
            "id": step_id,
            "created_at": datetime.utcnow().isoformat(),
            **step_data
        }
        self.workflow_steps[step_id] = step
        return step
    
    def get_workflow_steps(self, template_id: str) -> List[Dict[str, Any]]:
        """Get all steps for a workflow template"""
        steps = [
            step for step in self.workflow_steps.values()
            if step.get("template_id") == template_id
        ]
        return sorted(steps, key=lambda x: x.get("order", 0))
    
    # Workflow Instance Methods
    
    def create_workflow_instance(self, instance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new workflow instance"""
        instance_id = str(uuid.uuid4())
        instance = {
            "id": instance_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "status": "pending",
            **instance_data
        }
        self.workflow_instances[instance_id] = instance
        return instance
    
    def get_workflow_instance(self, instance_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific workflow instance"""
        return self.workflow_instances.get(instance_id)
    
    def get_workflow_instances(self, template_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get workflow instances with optional filters"""
        instances = list(self.workflow_instances.values())
        
        if template_id is not None:
            instances = [i for i in instances if i.get("template_id") == template_id]
        
        if status is not None:
            instances = [i for i in instances if i.get("status") == status]
        
        return instances
    
    def update_workflow_instance(self, instance_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a workflow instance"""
        if instance_id in self.workflow_instances:
            instance = self.workflow_instances[instance_id]
            instance.update(updates)
            instance["updated_at"] = datetime.utcnow().isoformat()
            return instance
        return None
    
    # Step Execution Methods
    
    def create_step_execution(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a step execution record"""
        execution_id = str(uuid.uuid4())
        execution = {
            "id": execution_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "pending",
            **execution_data
        }
        self.step_executions[execution_id] = execution
        return execution
    
    def get_step_executions(self, instance_id: str) -> List[Dict[str, Any]]:
        """Get all step executions for a workflow instance"""
        executions = [
            exec for exec in self.step_executions.values()
            if exec.get("instance_id") == instance_id
        ]
        return sorted(executions, key=lambda x: x.get("created_at", ""))
    
    def update_step_execution(self, execution_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a step execution"""
        if execution_id in self.step_executions:
            execution = self.step_executions[execution_id]
            execution.update(updates)
            if "completed_at" not in execution and updates.get("status") in ["completed", "failed"]:
                execution["completed_at"] = datetime.utcnow().isoformat()
            return execution
        return None
    
    def get_active_workflow_instances_for_task(self, task_id: str) -> List[Dict[str, Any]]:
        """Get active workflow instances that involve a specific task"""
        return [
            instance for instance in self.workflow_instances.values()
            if instance.get("trigger_task_id") == task_id and instance.get("status") in ["pending", "in_progress"]
        ]