"""
Service layer for Dependency & Workflow Management System

This module implements business logic for managing task dependencies, recurring tasks,
workflows, automation rules, and templates. It handles validation, permission checks,
and complex operations.
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
import uuid
from collections import defaultdict
import json

from ..models.dependency_workflow_models import (
    # Dependencies
    TaskDependency, DependencyGraph, DependencyType, DependencyValidationResult,
    CreateDependencyRequest,
    
    # Recurring Tasks
    RecurringTask, RecurrencePattern, RecurrenceFrequency, WeekDay, MonthlyRecurrenceType,
    CreateRecurringTaskRequest, RecurrencePreviewResult,
    PreviewRecurrenceRequest,
    
    # Workflows
    WorkflowDefinition, WorkflowState, WorkflowTransition, WorkflowInstance,
    TransitionCondition, WorkflowStateType, WorkflowAnalyticsResult,
    CreateWorkflowRequest, WorkflowTransitionRequest,
    
    # Automation
    AutomationRule, AutomationLog, AutomationTrigger, AutomationAction,
    AutomationTriggerType, AutomationActionType, AutomationAnalyticsResult,
    CreateAutomationRequest, TestAutomationRequest,
    
    # Templates
    TemplateDefinition, TemplateUsage, TemplateType,
    CreateTemplateRequest, ApplyTemplateRequest
)

from ..repositories.dependency_workflow_repository import DependencyWorkflowRepository
from ..repositories.task_repository import TaskRepository
from ..repositories.project_repository import ProjectRepository
from ..repositories.user_repository import UserRepository


class DependencyWorkflowService:
    """Service for managing dependencies, workflows, automation, and templates"""
    
    def __init__(self, 
                 repo: DependencyWorkflowRepository,
                 task_repo: TaskRepository,
                 project_repo: ProjectRepository,
                 user_repo: UserRepository):
        self.repo = repo
        self.task_repo = task_repo
        self.project_repo = project_repo
        self.user_repo = user_repo
    
    # Dependency Management
    
    def create_dependency(self, user_id: str, request: CreateDependencyRequest) -> TaskDependency:
        """Create a new task dependency with validation"""
        # Validate tasks exist
        source_task = self.task_repo.get_task(request.source_task_id)
        target_task = self.task_repo.get_task(request.target_task_id)
        
        if not source_task or not target_task:
            raise ValueError("One or both tasks not found")
        
        # Ensure tasks are in the same project
        if source_task.project_id != target_task.project_id:
            raise ValueError("Dependencies can only be created between tasks in the same project")
        
        # Check permissions
        if not self._can_modify_task(user_id, source_task.project_id):
            raise PermissionError("You don't have permission to modify tasks in this project")
        
        # Validate no duplicate dependency
        existing_deps = self.repo.get_dependencies_for_task(request.source_task_id)
        for dep in existing_deps:
            if (dep.target_task_id == request.target_task_id and 
                dep.dependency_type == request.dependency_type):
                raise ValueError("This dependency already exists")
        
        # Create dependency
        dependency = TaskDependency(
            source_task_id=request.source_task_id,
            target_task_id=request.target_task_id,
            dependency_type=request.dependency_type,
            lag_days=request.lag_days,
            notes=request.notes,
            created_by=user_id
        )
        
        # Save dependency
        created_dep = self.repo.create_dependency(dependency, source_task.project_id)
        
        # Validate no circular dependencies
        validation = self.validate_dependencies(source_task.project_id)
        if validation.has_cycles:
            # Rollback
            self.repo.delete_dependency(created_dep.id)
            raise ValueError("This dependency would create a circular reference")
        
        # Update task dates if needed
        if request.dependency_type in [DependencyType.BLOCKS, DependencyType.BLOCKED_BY]:
            self._cascade_date_updates(source_task.project_id)
        
        return created_dep
    
    def validate_dependencies(self, project_id: str) -> DependencyValidationResult:
        """Validate dependencies for a project"""
        cycles = self.repo.find_circular_dependencies(project_id)
        dependencies = self.repo.get_project_dependencies(project_id)
        
        warnings = []
        
        # Check for long dependency chains
        chains = self._find_dependency_chains(project_id)
        for chain in chains:
            if len(chain) > 10:
                warnings.append(f"Long dependency chain detected with {len(chain)} tasks")
        
        # Check for tasks with many dependencies
        dep_counts = defaultdict(int)
        for dep in dependencies:
            dep_counts[dep.source_task_id] += 1
            dep_counts[dep.target_task_id] += 1
        
        for task_id, count in dep_counts.items():
            if count > 5:
                warnings.append(f"Task {task_id} has {count} dependencies")
        
        return DependencyValidationResult(
            is_valid=len(cycles) == 0,
            has_cycles=len(cycles) > 0,
            cycle_tasks=cycles[0] if cycles else None,
            warnings=warnings,
            impact_analysis={
                "total_dependencies": len(dependencies),
                "tasks_with_dependencies": len(dep_counts),
                "longest_chain": max(len(chain) for chain in chains) if chains else 0
            }
        )
    
    def get_dependency_graph(self, project_id: str, user_id: str) -> DependencyGraph:
        """Get dependency graph for visualization"""
        # Check permissions
        if not self._can_view_project(user_id, project_id):
            raise PermissionError("You don't have permission to view this project")
        
        # Create or get cached graph
        graph = self.repo.create_dependency_graph(project_id)
        
        # Enhance nodes with task data
        tasks = {}
        for node in graph.nodes:
            task = self.task_repo.get_task(node["id"])
            if task:
                node.update({
                    "title": task.title,
                    "status": task.status,
                    "assignee_id": task.assignee_id,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "priority": task.priority
                })
                tasks[task.id] = task
        
        # Calculate task durations for critical path
        task_durations = {}
        for task_id, task in tasks.items():
            # Simple duration calculation based on task complexity
            if task.due_date and task.created_at:
                duration = (task.due_date - task.created_at.date()).days
            else:
                duration = 1  # Default duration
            task_durations[task_id] = max(1, duration)
        
        # Calculate critical path
        if task_durations:
            critical_analysis = self.repo.calculate_critical_path(project_id, task_durations)
            graph.critical_paths = [critical_analysis.critical_tasks]
            
            # Add slack information to nodes
            for node in graph.nodes:
                task_id = node["id"]
                if task_id in critical_analysis.slack_by_task:
                    node["slack_days"] = critical_analysis.slack_by_task[task_id]
                    node["is_critical"] = task_id in critical_analysis.critical_tasks
        
        return graph
    
    def delete_dependency(self, user_id: str, dependency_id: str) -> bool:
        """Delete a dependency"""
        dependency = self.repo.get_dependency(dependency_id)
        if not dependency:
            raise ValueError("Dependency not found")
        
        # Get task to check project
        task = self.task_repo.get_task(dependency.source_task_id)
        if not task:
            raise ValueError("Associated task not found")
        
        # Check permissions
        if not self._can_modify_task(user_id, task.project_id):
            raise PermissionError("You don't have permission to modify this dependency")
        
        # Delete dependency
        success = self.repo.delete_dependency(dependency_id)
        
        # Update dates if needed
        if success and dependency.dependency_type in [DependencyType.BLOCKS, DependencyType.BLOCKED_BY]:
            self._cascade_date_updates(task.project_id)
        
        return success
    
    def _find_dependency_chains(self, project_id: str) -> List[List[str]]:
        """Find all dependency chains in a project"""
        dependencies = self.repo.get_project_dependencies(project_id)
        
        # Build adjacency list
        graph = defaultdict(list)
        in_degree = defaultdict(int)
        
        for dep in dependencies:
            if dep.dependency_type == DependencyType.BLOCKED_BY:
                graph[dep.source_task_id].append(dep.target_task_id)
                in_degree[dep.target_task_id] += 1
        
        # Find all chains starting from tasks with no dependencies
        chains = []
        
        def dfs(task_id: str, current_chain: List[str]):
            current_chain.append(task_id)
            
            if task_id not in graph or not graph[task_id]:
                # End of chain
                if len(current_chain) > 1:
                    chains.append(current_chain.copy())
            else:
                for next_task in graph[task_id]:
                    dfs(next_task, current_chain)
            
            current_chain.pop()
        
        # Start DFS from all root tasks
        all_tasks = set(graph.keys()) | set(in_degree.keys())
        root_tasks = [task for task in all_tasks if in_degree[task] == 0]
        
        for root in root_tasks:
            dfs(root, [])
        
        return chains
    
    def _cascade_date_updates(self, project_id: str):
        """Update task dates based on dependencies"""
        # Get all project tasks and dependencies
        dependencies = self.repo.get_project_dependencies(project_id)
        
        # Build dependency graph
        blocked_by = defaultdict(list)
        blocks = defaultdict(list)
        
        for dep in dependencies:
            if dep.dependency_type == DependencyType.BLOCKED_BY:
                blocked_by[dep.target_task_id].append((dep.source_task_id, dep.lag_days))
                blocks[dep.source_task_id].append((dep.target_task_id, dep.lag_days))
        
        # Update dates for dependent tasks
        # This is a simplified implementation - in production, this would be more sophisticated
        updated_tasks = set()
        
        for task_id, blockers in blocked_by.items():
            task = self.task_repo.get_task(task_id)
            if not task:
                continue
            
            # Find the latest blocker end date
            latest_date = None
            
            for blocker_id, lag_days in blockers:
                blocker = self.task_repo.get_task(blocker_id)
                if blocker and blocker.due_date:
                    blocker_end = blocker.due_date + timedelta(days=lag_days)
                    if not latest_date or blocker_end > latest_date:
                        latest_date = blocker_end
            
            # Update task start date if needed
            if latest_date and task.due_date and latest_date > task.due_date:
                # Adjust task dates
                duration = (task.due_date - task.created_at.date()).days
                new_due_date = latest_date + timedelta(days=duration)
                
                # Update task (simplified - would use proper update method)
                task.due_date = new_due_date
                updated_tasks.add(task_id)
    
    # Recurring Task Management
    
    def create_recurring_task(self, user_id: str, 
                            request: CreateRecurringTaskRequest) -> RecurringTask:
        """Create a new recurring task"""
        # Validate template task exists
        template_task = self.task_repo.get_task(request.template_task_id)
        if not template_task:
            raise ValueError("Template task not found")
        
        # Check permissions
        if not self._can_modify_task(user_id, request.project_id):
            raise PermissionError("You don't have permission to create recurring tasks in this project")
        
        # Create recurrence pattern
        pattern = self.repo.create_recurrence_pattern(request.recurrence_pattern)
        
        # Calculate next occurrence
        next_occurrence = self._calculate_next_occurrence(pattern, datetime.utcnow())
        
        # Create recurring task
        recurring_task = RecurringTask(
            template_task_id=request.template_task_id,
            project_id=request.project_id,
            board_id=request.board_id,
            list_id=request.list_id,
            recurrence_pattern_id=pattern.id,
            title_template=request.title_template,
            description_template=request.description_template,
            assignee_id=request.assignee_id,
            priority=request.priority,
            tags=request.tags,
            custom_fields=request.custom_fields,
            auto_create_days_ahead=request.auto_create_days_ahead,
            skip_weekends=request.skip_weekends,
            adjust_due_date=request.adjust_due_date,
            next_occurrence=next_occurrence,
            created_by=user_id
        )
        
        return self.repo.create_recurring_task(recurring_task)
    
    def preview_recurrence(self, request: PreviewRecurrenceRequest) -> RecurrencePreviewResult:
        """Preview recurring task instances"""
        pattern = request.recurrence_pattern
        instances = []
        excluded_dates = []
        
        current_date = datetime.combine(request.start_date, datetime.min.time())
        count = 0
        
        while count < request.preview_count:
            # Check end conditions
            if pattern.end_type == "date" and pattern.end_date:
                if current_date.date() > pattern.end_date:
                    break
            elif pattern.end_type == "count" and pattern.end_count:
                if count >= pattern.end_count:
                    break
            
            # Calculate next occurrence
            next_date = self._calculate_next_occurrence(pattern, current_date)
            if not next_date:
                break
            
            # Check exclusions
            if next_date.date() in pattern.excluded_dates:
                excluded_dates.append(next_date.date())
            elif pattern.exclude_holidays and self._is_holiday(next_date.date()):
                excluded_dates.append(next_date.date())
            else:
                # Add instance
                instances.append({
                    "date": next_date,
                    "day_of_week": next_date.strftime("%A"),
                    "is_weekend": next_date.weekday() >= 5
                })
                count += 1
            
            # Move to next potential date
            current_date = next_date + timedelta(days=1)
            
            # Safety check to prevent infinite loops
            if (current_date - datetime.combine(request.start_date, datetime.min.time())).days > 365 * 5:
                break
        
        # Generate pattern description
        description = self._generate_pattern_description(pattern)
        
        return RecurrencePreviewResult(
            instances=instances,
            excluded_dates=excluded_dates,
            pattern_description=description,
            next_occurrence=instances[0]["date"] if instances else None,
            end_date=pattern.end_date,
            total_instances=pattern.end_count if pattern.end_type == "count" else None
        )
    
    def process_recurring_tasks(self) -> List[str]:
        """Process active recurring tasks and create instances as needed"""
        created_task_ids = []
        active_tasks = self.repo.get_active_recurring_tasks()
        
        for recurring_task in active_tasks:
            # Get recurrence pattern
            pattern = self.repo.recurrence_patterns.get(recurring_task.recurrence_pattern_id)
            if not pattern:
                continue
            
            # Check if we need to create new instances
            create_until = datetime.utcnow() + timedelta(days=recurring_task.auto_create_days_ahead)
            
            while True:
                # Check if next occurrence is within create window
                if not recurring_task.next_occurrence or recurring_task.next_occurrence > create_until:
                    break
                
                # Check end conditions
                if pattern.end_type == "date" and pattern.end_date:
                    if recurring_task.next_occurrence.date() > pattern.end_date:
                        # Deactivate recurring task
                        self.repo.update_recurring_task(recurring_task.id, {"is_active": False})
                        break
                elif pattern.end_type == "count" and pattern.end_count:
                    if len(recurring_task.created_instances) >= pattern.end_count:
                        # Deactivate recurring task
                        self.repo.update_recurring_task(recurring_task.id, {"is_active": False})
                        break
                
                # Create task instance
                try:
                    task_id = self._create_task_instance(recurring_task, recurring_task.next_occurrence)
                    created_task_ids.append(task_id)
                    
                    # Update recurring task
                    next_occurrence = self._calculate_next_occurrence(
                        pattern, 
                        recurring_task.next_occurrence + timedelta(days=1)
                    )
                    
                    updates = {
                        "created_instances": recurring_task.created_instances + [task_id],
                        "last_created": datetime.utcnow(),
                        "next_occurrence": next_occurrence
                    }
                    
                    self.repo.update_recurring_task(recurring_task.id, updates)
                    
                    # Update local copy
                    recurring_task.created_instances.append(task_id)
                    recurring_task.next_occurrence = next_occurrence
                    
                except Exception as e:
                    print(f"Failed to create recurring task instance: {e}")
                    # Move to next occurrence anyway
                    next_occurrence = self._calculate_next_occurrence(
                        pattern,
                        recurring_task.next_occurrence + timedelta(days=1)
                    )
                    self.repo.update_recurring_task(
                        recurring_task.id, 
                        {"next_occurrence": next_occurrence}
                    )
                    break
        
        return created_task_ids
    
    def _calculate_next_occurrence(self, pattern: RecurrencePattern, 
                                 after_date: datetime) -> Optional[datetime]:
        """Calculate next occurrence based on pattern"""
        current = after_date
        
        # Apply preferred time if set
        if pattern.preferred_time:
            current = current.replace(
                hour=pattern.preferred_time.hour,
                minute=pattern.preferred_time.minute,
                second=0,
                microsecond=0
            )
        
        if pattern.frequency == RecurrenceFrequency.DAILY:
            while True:
                # Check if business days only
                if pattern.business_days_only and current.weekday() >= 5:
                    current += timedelta(days=1)
                    continue
                
                # Check interval
                days_diff = (current - after_date).days
                if days_diff % pattern.interval == 0 and current > after_date:
                    return current
                
                current += timedelta(days=1)
                
                # Safety check
                if (current - after_date).days > 365:
                    return None
        
        elif pattern.frequency == RecurrenceFrequency.WEEKLY:
            if not pattern.week_days:
                return None
            
            week_day_nums = [self._weekday_to_num(wd) for wd in pattern.week_days]
            
            while True:
                if current.weekday() in week_day_nums:
                    # Check interval (weeks since start)
                    weeks_diff = (current - after_date).days // 7
                    if weeks_diff % pattern.interval == 0 and current > after_date:
                        return current
                
                current += timedelta(days=1)
                
                # Safety check
                if (current - after_date).days > 365:
                    return None
        
        elif pattern.frequency == RecurrenceFrequency.MONTHLY:
            while True:
                if pattern.monthly_type == MonthlyRecurrenceType.DATE:
                    # Specific date of month
                    if pattern.month_day:
                        try:
                            target_date = current.replace(day=pattern.month_day)
                            if target_date > after_date:
                                # Check interval
                                months_diff = (target_date.year - after_date.year) * 12 + \
                                            (target_date.month - after_date.month)
                                if months_diff % pattern.interval == 0:
                                    return target_date
                        except ValueError:
                            # Invalid day for this month, skip
                            pass
                
                elif pattern.monthly_type == MonthlyRecurrenceType.DAY:
                    # Specific day pattern (e.g., 2nd Tuesday)
                    if pattern.month_week and pattern.month_weekday:
                        target_date = self._find_nth_weekday(
                            current.year, current.month,
                            pattern.month_week,
                            self._weekday_to_num(pattern.month_weekday)
                        )
                        if target_date and target_date > after_date:
                            return datetime.combine(target_date, current.time())
                
                # Move to next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1, day=1)
                else:
                    current = current.replace(month=current.month + 1, day=1)
                
                # Safety check
                if (current - after_date).days > 365 * 2:
                    return None
        
        elif pattern.frequency == RecurrenceFrequency.YEARLY:
            if pattern.yearly_month and pattern.yearly_day:
                while True:
                    try:
                        target_date = current.replace(
                            month=pattern.yearly_month,
                            day=pattern.yearly_day
                        )
                        if target_date > after_date:
                            return target_date
                    except ValueError:
                        # Invalid date, skip
                        pass
                    
                    current = current.replace(year=current.year + 1)
                    
                    # Safety check
                    if (current - after_date).days > 365 * 10:
                        return None
        
        return None
    
    def _create_task_instance(self, recurring_task: RecurringTask, 
                            scheduled_date: datetime) -> str:
        """Create a task instance from recurring task template"""
        # Get template task
        template = self.task_repo.get_task(recurring_task.template_task_id)
        if not template:
            raise ValueError("Template task not found")
        
        # Process title template
        title = self._process_template_string(
            recurring_task.title_template,
            {"date": scheduled_date, "count": len(recurring_task.created_instances) + 1}
        )
        
        # Process description template
        description = None
        if recurring_task.description_template:
            description = self._process_template_string(
                recurring_task.description_template,
                {"date": scheduled_date, "count": len(recurring_task.created_instances) + 1}
            )
        
        # Calculate due date
        due_date = scheduled_date.date()
        if recurring_task.adjust_due_date and template.due_date:
            # Adjust based on original template duration
            original_duration = (template.due_date - template.created_at.date()).days
            due_date = scheduled_date.date() + timedelta(days=original_duration)
        
        # Create task (simplified - would use proper task creation)
        task_data = {
            "title": title,
            "description": description or template.description,
            "list_id": recurring_task.list_id,
            "assignee_id": recurring_task.assignee_id or template.assignee_id,
            "priority": recurring_task.priority,
            "due_date": due_date,
            "tags": recurring_task.tags or template.tags,
            "recurring_task_id": recurring_task.id
        }
        
        # Create task (this would call the actual task service)
        task_id = str(uuid.uuid4())  # Placeholder
        
        return task_id
    
    # Workflow Management
    
    def create_workflow(self, user_id: str, request: CreateWorkflowRequest) -> WorkflowDefinition:
        """Create a new workflow definition"""
        # Check permissions (simplified)
        user = self.user_repo.get_user(user_id)
        if not user or user.role not in ["admin", "manager"]:
            raise PermissionError("Only admins and managers can create workflows")
        
        # Create workflow definition
        workflow = WorkflowDefinition(
            name=request.name,
            description=request.description,
            entity_type=request.entity_type,
            allow_parallel_states=request.allow_parallel_states,
            track_time_in_states=request.track_time_in_states,
            enforce_transitions=request.enforce_transitions,
            created_by=user_id
        )
        
        created_workflow = self.repo.create_workflow(workflow)
        
        # Create states
        initial_state_id = None
        for i, state_data in enumerate(request.states):
            state = WorkflowState(
                workflow_id=created_workflow.id,
                name=state_data.name,
                display_name=state_data.display_name,
                state_type=state_data.state_type,
                color=state_data.color,
                icon=state_data.icon,
                description=state_data.description,
                is_initial=state_data.is_initial,
                is_final=state_data.is_final,
                required_fields=state_data.required_fields,
                required_approvals=state_data.required_approvals,
                approval_users=state_data.approval_users,
                approval_roles=state_data.approval_roles,
                entry_actions=state_data.entry_actions,
                exit_actions=state_data.exit_actions,
                sla_hours=state_data.sla_hours,
                escalation_user_id=state_data.escalation_user_id,
                position=i
            )
            
            created_state = self.repo.create_workflow_state(state)
            
            if state.is_initial:
                initial_state_id = created_state.id
        
        # Create transitions
        for transition_data in request.transitions:
            transition = WorkflowTransition(
                workflow_id=created_workflow.id,
                from_state_id=transition_data.from_state_id,
                to_state_id=transition_data.to_state_id,
                name=transition_data.name,
                conditions=transition_data.conditions,
                condition_logic=transition_data.condition_logic,
                allowed_users=transition_data.allowed_users,
                allowed_roles=transition_data.allowed_roles,
                allow_all=transition_data.allow_all,
                automation_rules=transition_data.automation_rules,
                update_fields=transition_data.update_fields,
                button_label=transition_data.button_label,
                confirmation_required=transition_data.confirmation_required,
                confirmation_message=transition_data.confirmation_message,
                comment_required=transition_data.comment_required,
                priority=transition_data.priority
            )
            
            self.repo.create_workflow_transition(transition)
        
        return created_workflow
    
    def apply_workflow_to_entity(self, workflow_id: str, entity_type: str, 
                               entity_id: str, user_id: str) -> WorkflowInstance:
        """Apply a workflow to an entity"""
        # Get workflow
        workflow = self.repo.get_workflow(workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        # Validate entity type
        if workflow.entity_type != entity_type:
            raise ValueError(f"Workflow is for {workflow.entity_type}, not {entity_type}")
        
        # Check if entity already has a workflow
        existing = self.repo.get_workflow_instance(entity_type, entity_id)
        if existing:
            raise ValueError("Entity already has a workflow applied")
        
        # Get initial state
        states = self.repo.get_workflow_states(workflow_id)
        initial_state = next((s for s in states if s.is_initial), None)
        if not initial_state:
            raise ValueError("Workflow has no initial state")
        
        # Create instance
        instance = WorkflowInstance(
            workflow_id=workflow_id,
            entity_type=entity_type,
            entity_id=entity_id,
            current_state_id=initial_state.id,
            active_states=[initial_state.id] if workflow.allow_parallel_states else []
        )
        
        # Add to state history
        instance.state_history.append({
            "state_id": initial_state.id,
            "entered_at": instance.started_at,
            "entered_by": user_id
        })
        
        return self.repo.create_workflow_instance(instance)
    
    def transition_workflow(self, user_id: str, 
                          request: WorkflowTransitionRequest) -> WorkflowInstance:
        """Transition workflow to a new state"""
        # Get workflow instance
        instance = self.repo.get_workflow_instance(request.entity_type, request.entity_id)
        if not instance:
            raise ValueError("No workflow instance found for this entity")
        
        # Get workflow
        workflow = self.repo.get_workflow(instance.workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        # Get valid transitions
        valid_transitions = self.repo.get_valid_transitions(
            instance.workflow_id, 
            instance.current_state_id
        )
        
        # Find matching transition
        transition = None
        for trans in valid_transitions:
            if trans.to_state_id == request.to_state_id:
                # Check permissions
                if not trans.allow_all:
                    if user_id not in trans.allowed_users:
                        user = self.user_repo.get_user(user_id)
                        if not user or user.role not in trans.allowed_roles:
                            continue
                
                # Check conditions
                if self._evaluate_transition_conditions(trans, request.entity_type, 
                                                      request.entity_id, request.field_updates):
                    transition = trans
                    break
        
        if not transition:
            raise ValueError("No valid transition to the requested state")
        
        # Check comment requirement
        if transition.comment_required and not request.comment:
            raise ValueError("This transition requires a comment")
        
        # Get states
        from_state = self.repo.workflow_states.get(instance.current_state_id)
        to_state = self.repo.workflow_states.get(request.to_state_id)
        
        if not from_state or not to_state:
            raise ValueError("Invalid state configuration")
        
        # Update time in state
        if workflow.track_time_in_states:
            time_in_state = (datetime.utcnow() - instance.started_at).total_seconds() / 60
            instance.time_in_states[instance.current_state_id] = \
                instance.time_in_states.get(instance.current_state_id, 0) + time_in_state
        
        # Execute exit actions
        if from_state.exit_actions:
            self._execute_workflow_actions(from_state.exit_actions, request.entity_type, 
                                         request.entity_id, user_id)
        
        # Update instance
        updates = {
            "current_state_id": request.to_state_id,
            "previous_state_id": instance.current_state_id,
            "total_transitions": instance.total_transitions + 1
        }
        
        # Handle parallel states
        if workflow.allow_parallel_states:
            if to_state.state_type == WorkflowStateType.PARALLEL:
                updates["active_states"] = instance.active_states + [request.to_state_id]
            else:
                updates["active_states"] = [request.to_state_id]
        
        # Check if completed
        if to_state.is_final:
            updates["is_completed"] = True
            updates["completed_at"] = datetime.utcnow()
        
        # Update instance
        updated_instance = self.repo.update_workflow_instance(instance.id, updates)
        
        # Add to history
        updated_instance.state_history.append({
            "state_id": request.to_state_id,
            "entered_at": datetime.utcnow(),
            "entered_by": user_id,
            "from_state_id": instance.current_state_id,
            "comment": request.comment
        })
        
        updated_instance.transition_history.append({
            "transition_id": transition.id,
            "from_state_id": instance.current_state_id,
            "to_state_id": request.to_state_id,
            "transitioned_at": datetime.utcnow(),
            "transitioned_by": user_id,
            "comment": request.comment
        })
        
        # Execute entry actions
        if to_state.entry_actions:
            self._execute_workflow_actions(to_state.entry_actions, request.entity_type,
                                         request.entity_id, user_id)
        
        # Execute transition actions
        if transition.automation_rules:
            self._execute_workflow_actions(transition.automation_rules, request.entity_type,
                                         request.entity_id, user_id)
        
        # Apply field updates
        if transition.update_fields or request.field_updates:
            all_updates = {**transition.update_fields, **request.field_updates}
            self._apply_field_updates(request.entity_type, request.entity_id, all_updates)
        
        return updated_instance
    
    def get_workflow_analytics(self, workflow_id: str, 
                             start_date: datetime, 
                             end_date: datetime) -> WorkflowAnalyticsResult:
        """Get analytics for workflow performance"""
        # Get workflow
        workflow = self.repo.get_workflow(workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        # Get instances in period
        all_instances = [instance for instance in self.repo.workflow_instances.values()
                        if instance.workflow_id == workflow_id and
                        instance.started_at >= start_date and
                        instance.started_at <= end_date]
        
        # Calculate state metrics
        state_times = defaultdict(list)
        state_visits = defaultdict(int)
        
        for instance in all_instances:
            for state_id, time_minutes in instance.time_in_states.items():
                state_times[state_id].append(time_minutes)
                state_visits[state_id] += 1
        
        # Calculate average times
        average_time_in_states = {}
        for state_id, times in state_times.items():
            average_time_in_states[state_id] = sum(times) / len(times) if times else 0
        
        # Find bottlenecks (states with highest average time)
        bottleneck_states = sorted(
            average_time_in_states.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]
        
        # Calculate transition metrics
        transition_counts = defaultdict(int)
        transition_times = defaultdict(list)
        
        for instance in all_instances:
            for i in range(len(instance.transition_history) - 1):
                trans = instance.transition_history[i]
                next_trans = instance.transition_history[i + 1]
                
                transition_id = trans["transition_id"]
                transition_counts[transition_id] += 1
                
                # Calculate time between transitions
                time_diff = (next_trans["transitioned_at"] - trans["transitioned_at"]).total_seconds() / 60
                transition_times[transition_id].append(time_diff)
        
        # Calculate average transition times
        average_transition_times = {}
        for trans_id, times in transition_times.items():
            average_transition_times[trans_id] = sum(times) / len(times) if times else 0
        
        # Calculate overall metrics
        completed_instances = [i for i in all_instances if i.is_completed]
        
        completion_rate = len(completed_instances) / len(all_instances) if all_instances else 0
        
        completion_times = []
        for instance in completed_instances:
            if instance.completed_at:
                completion_time = (instance.completed_at - instance.started_at).total_seconds() / 60
                completion_times.append(completion_time)
        
        average_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        # Calculate SLA metrics
        states = self.repo.get_workflow_states(workflow_id)
        sla_violations = []
        
        for instance in all_instances:
            for state_history in instance.state_history:
                state = next((s for s in states if s.id == state_history["state_id"]), None)
                if state and state.sla_hours:
                    time_in_state = instance.time_in_states.get(state.id, 0)
                    if time_in_state > state.sla_hours * 60:
                        sla_violations.append({
                            "instance_id": instance.id,
                            "state_id": state.id,
                            "sla_hours": state.sla_hours,
                            "actual_hours": time_in_state / 60,
                            "entity_id": instance.entity_id
                        })
        
        sla_compliance_rate = 1 - (len(sla_violations) / len(all_instances)) if all_instances else 1
        
        return WorkflowAnalyticsResult(
            workflow_id=workflow_id,
            period_start=start_date,
            period_end=end_date,
            average_time_in_states=average_time_in_states,
            state_visit_counts=dict(state_visits),
            bottleneck_states=[s[0] for s in bottleneck_states],
            transition_counts=dict(transition_counts),
            average_transition_times=average_transition_times,
            most_used_transitions=sorted(transition_counts.keys(), 
                                        key=lambda x: transition_counts[x], 
                                        reverse=True)[:5],
            average_completion_time=average_completion_time,
            completion_rate=completion_rate,
            abandonment_rate=1 - completion_rate,
            sla_compliance_rate=sla_compliance_rate,
            sla_violations=sla_violations
        )
    
    # Automation Management
    
    def create_automation_rule(self, user_id: str, 
                             request: CreateAutomationRequest) -> AutomationRule:
        """Create a new automation rule"""
        # Check permissions
        user = self.user_repo.get_user(user_id)
        if not user or user.role not in ["admin", "manager"]:
            raise PermissionError("Only admins and managers can create automation rules")
        
        # Create rule
        rule = AutomationRule(
            name=request.name,
            description=request.description,
            triggers=request.triggers,
            trigger_logic=request.trigger_logic,
            conditions=request.conditions,
            condition_logic=request.condition_logic,
            actions=request.actions,
            project_ids=request.project_ids,
            board_ids=request.board_ids,
            applies_to_subtasks=request.applies_to_subtasks,
            max_executions_per_day=request.max_executions_per_day,
            created_by=user_id
        )
        
        return self.repo.create_automation_rule(rule)
    
    def test_automation_rule(self, user_id: str, rule_id: str,
                           request: TestAutomationRequest) -> Dict[str, Any]:
        """Test an automation rule"""
        # Get rule
        rule = self.repo.get_automation_rule(rule_id)
        if not rule:
            raise ValueError("Automation rule not found")
        
        # Check permissions
        if rule.created_by != user_id:
            user = self.user_repo.get_user(user_id)
            if not user or user.role != "admin":
                raise PermissionError("You can only test your own rules")
        
        # Simulate trigger evaluation
        trigger_matched = self._evaluate_triggers(rule.triggers, request.trigger_data)
        
        # Simulate condition evaluation
        conditions_met = True
        if rule.conditions:
            conditions_met = self._evaluate_conditions(
                rule.conditions, 
                rule.condition_logic,
                request.entity_type,
                request.entity_id
            )
        
        # Simulate actions (dry run)
        simulated_actions = []
        if trigger_matched and conditions_met:
            for action in rule.actions:
                simulated_actions.append({
                    "action_type": action.action_type,
                    "would_execute": True,
                    "details": self._simulate_action(action, request.entity_type, request.entity_id)
                })
        
        # Record test result
        test_result = {
            "rule_id": rule_id,
            "trigger_matched": trigger_matched,
            "conditions_met": conditions_met,
            "would_execute": trigger_matched and conditions_met,
            "simulated_actions": simulated_actions,
            "test_data": request.trigger_data,
            "tested_at": datetime.utcnow().isoformat()
        }
        
        # Update rule test results
        rule.test_results.append(test_result)
        
        return test_result
    
    def execute_automation_rules(self, trigger_type: AutomationTriggerType,
                               entity_type: str, entity_id: str,
                               trigger_data: Dict[str, Any]) -> List[str]:
        """Execute automation rules for a trigger"""
        executed_rule_ids = []
        
        # Get applicable rules
        rules = self.repo.get_rules_by_trigger(trigger_type)
        
        for rule in rules:
            # Check if rule applies to this entity
            if not self._rule_applies_to_entity(rule, entity_type, entity_id):
                continue
            
            # Check execution limits
            if rule.max_executions_per_day:
                today_executions = len([
                    log for log in self.repo.get_automation_logs(rule.id)
                    if log.triggered_at.date() == datetime.utcnow().date()
                ])
                if today_executions >= rule.max_executions_per_day:
                    continue
            
            # Create log entry
            log = AutomationLog(
                rule_id=rule.id,
                rule_name=rule.name,
                trigger_type=trigger_type,
                entity_type=entity_type,
                entity_id=entity_id,
                status="pending",
                trigger_data=trigger_data
            )
            
            self.repo.create_automation_log(log)
            
            try:
                # Evaluate triggers
                if not self._evaluate_triggers(rule.triggers, trigger_data):
                    log.status = "skipped"
                    continue
                
                # Evaluate conditions
                if rule.conditions:
                    if not self._evaluate_conditions(rule.conditions, rule.condition_logic,
                                                   entity_type, entity_id):
                        log.status = "skipped"
                        continue
                
                # Execute actions
                log.status = "running"
                log.executed_at = datetime.utcnow()
                
                for action in rule.actions:
                    try:
                        change = self._execute_action(action, entity_type, entity_id)
                        log.actions_executed.append(action.action_type)
                        log.changes.append(change)
                    except Exception as e:
                        if rule.stop_on_error:
                            raise
                        else:
                            log.error_message = str(e)
                
                log.status = "success"
                log.completed_at = datetime.utcnow()
                executed_rule_ids.append(rule.id)
                
                # Update rule execution count
                rule.execution_count += 1
                rule.last_execution = datetime.utcnow()
                
            except Exception as e:
                log.status = "failed"
                log.error_message = str(e)
                log.completed_at = datetime.utcnow()
        
        return executed_rule_ids
    
    def get_automation_analytics(self, rule_id: str,
                               start_date: datetime,
                               end_date: datetime) -> AutomationAnalyticsResult:
        """Get analytics for automation rule performance"""
        # Get rule
        rule = self.repo.get_automation_rule(rule_id)
        if not rule:
            raise ValueError("Automation rule not found")
        
        # Get logs in period
        all_logs = self.repo.get_automation_logs(rule_id, limit=10000)
        period_logs = [log for log in all_logs
                      if log.triggered_at >= start_date and log.triggered_at <= end_date]
        
        # Calculate execution metrics
        total_executions = len(period_logs)
        successful_executions = len([log for log in period_logs if log.status == "success"])
        failed_executions = len([log for log in period_logs if log.status == "failed"])
        skipped_executions = len([log for log in period_logs if log.status == "skipped"])
        
        # Calculate performance metrics
        execution_times = []
        for log in period_logs:
            if log.executed_at and log.completed_at:
                exec_time = (log.completed_at - log.executed_at).total_seconds()
                execution_times.append(exec_time)
        
        avg_execution_time = sum(execution_times) / len(execution_times) if execution_times else 0
        max_execution_time = max(execution_times) if execution_times else 0
        min_execution_time = min(execution_times) if execution_times else 0
        
        # Calculate impact metrics
        affected_entities = set()
        total_changes = 0
        
        for log in period_logs:
            if log.status == "success":
                affected_entities.add(f"{log.entity_type}:{log.entity_id}")
                total_changes += len(log.changes)
        
        # Analyze triggers and actions
        trigger_counts = defaultdict(int)
        action_counts = defaultdict(int)
        
        for log in period_logs:
            trigger_counts[log.trigger_type] += 1
            for action in log.actions_executed:
                action_counts[action] += 1
        
        # Analyze errors
        error_counts = defaultdict(int)
        for log in period_logs:
            if log.error_message:
                # Simple error categorization
                if "permission" in log.error_message.lower():
                    error_counts["Permission errors"] += 1
                elif "not found" in log.error_message.lower():
                    error_counts["Not found errors"] += 1
                elif "validation" in log.error_message.lower():
                    error_counts["Validation errors"] += 1
                else:
                    error_counts["Other errors"] += 1
        
        # Generate optimization suggestions
        suggestions = []
        
        if failed_executions > total_executions * 0.1:
            suggestions.append("High failure rate - review error logs and conditions")
        
        if avg_execution_time > 5:
            suggestions.append("Long execution time - consider optimizing actions")
        
        if skipped_executions > total_executions * 0.5:
            suggestions.append("Many skipped executions - review trigger conditions")
        
        return AutomationAnalyticsResult(
            rule_id=rule_id,
            period_start=start_date,
            period_end=end_date,
            total_executions=total_executions,
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            skipped_executions=skipped_executions,
            average_execution_time=avg_execution_time,
            max_execution_time=max_execution_time,
            min_execution_time=min_execution_time,
            entities_affected=len(affected_entities),
            changes_made=total_changes,
            most_common_triggers=[{"trigger": k, "count": v} 
                                for k, v in sorted(trigger_counts.items(), 
                                                 key=lambda x: x[1], 
                                                 reverse=True)[:5]],
            most_common_actions=[{"action": k, "count": v}
                               for k, v in sorted(action_counts.items(),
                                                key=lambda x: x[1],
                                                reverse=True)[:5]],
            error_rate=failed_executions / total_executions if total_executions else 0,
            common_errors=[{"error": k, "count": v} for k, v in error_counts.items()],
            optimization_suggestions=suggestions
        )
    
    # Template Management
    
    def create_template(self, user_id: str, request: CreateTemplateRequest) -> TemplateDefinition:
        """Create a new template"""
        # Create template
        template = TemplateDefinition(
            name=request.name,
            description=request.description,
            template_type=request.template_type,
            category=request.category,
            tags=request.tags,
            content=request.content,
            variables=request.variables,
            is_public=request.is_public,
            created_by=user_id
        )
        
        return self.repo.create_template(template)
    
    def apply_template(self, user_id: str, request: ApplyTemplateRequest) -> Dict[str, Any]:
        """Apply a template to create entities"""
        # Get template
        template = self.repo.get_template(request.template_id)
        if not template:
            raise ValueError("Template not found")
        
        # Check access
        if not template.is_public and template.created_by != user_id:
            if user_id not in template.shared_with_users:
                raise PermissionError("You don't have access to this template")
        
        # Validate variables
        for variable in template.variables:
            if variable.required and variable.name not in request.variable_values:
                raise ValueError(f"Required variable '{variable.name}' not provided")
        
        # Process template content
        processed_content = self._process_template_content(
            template.content,
            request.variable_values
        )
        
        # Create entities based on template type
        created_entities = {}
        
        if template.template_type == TemplateType.PROJECT:
            # Create project structure
            project_data = processed_content.get("project", {})
            # Would create project here
            created_entities["project"] = {"id": str(uuid.uuid4()), **project_data}
            
            # Create boards if defined
            for board_data in processed_content.get("boards", []):
                # Would create board here
                board_id = str(uuid.uuid4())
                created_entities.setdefault("boards", []).append({"id": board_id, **board_data})
                
                # Create lists if defined
                for list_data in board_data.get("lists", []):
                    # Would create list here
                    list_id = str(uuid.uuid4())
                    created_entities.setdefault("lists", []).append({"id": list_id, **list_data})
        
        elif template.template_type == TemplateType.TASK:
            # Create tasks
            for task_data in processed_content.get("tasks", []):
                # Would create task here
                task_id = str(uuid.uuid4())
                created_entities.setdefault("tasks", []).append({"id": task_id, **task_data})
        
        elif template.template_type == TemplateType.WORKFLOW:
            # Create workflow
            workflow_data = processed_content.get("workflow", {})
            # Would create workflow here
            created_entities["workflow"] = {"id": str(uuid.uuid4()), **workflow_data}
        
        elif template.template_type == TemplateType.AUTOMATION:
            # Create automation rules
            for rule_data in processed_content.get("rules", []):
                # Would create rule here
                rule_id = str(uuid.uuid4())
                created_entities.setdefault("rules", []).append({"id": rule_id, **rule_data})
        
        # Record usage
        usage = TemplateUsage(
            template_id=request.template_id,
            template_version=template.version,
            used_by=user_id,
            variable_values=request.variable_values,
            created_entity_type=template.template_type,
            created_entity_id=json.dumps(created_entities)  # Store as JSON
        )
        
        self.repo.create_template_usage(usage)
        
        return {
            "template_id": request.template_id,
            "template_name": template.name,
            "created_entities": created_entities,
            "usage_id": usage.id
        }
    
    def search_templates(self, query: str, template_type: Optional[TemplateType] = None,
                        category: Optional[str] = None, 
                        user_id: Optional[str] = None) -> List[TemplateDefinition]:
        """Search for templates"""
        # Get all matching templates
        templates = self.repo.search_templates(query, template_type, category)
        
        # Filter by access
        if user_id:
            accessible_templates = []
            for template in templates:
                if (template.is_public or 
                    template.created_by == user_id or
                    user_id in template.shared_with_users):
                    accessible_templates.append(template)
            return accessible_templates
        else:
            # Return only public templates
            return [t for t in templates if t.is_public]
    
    # Helper Methods
    
    def _can_view_project(self, user_id: str, project_id: str) -> bool:
        """Check if user can view a project"""
        # Simplified permission check
        project = self.project_repo.get_project(project_id)
        if not project:
            return False
        
        # Check if user is team member
        # This would be more sophisticated in production
        return True
    
    def _can_modify_task(self, user_id: str, project_id: str) -> bool:
        """Check if user can modify tasks in a project"""
        # Simplified permission check
        user = self.user_repo.get_user(user_id)
        if not user:
            return False
        
        if user.role in ["admin", "manager"]:
            return True
        
        # Check project membership
        project = self.project_repo.get_project(project_id)
        if not project:
            return False
        
        # This would check actual project membership in production
        return True
    
    def _weekday_to_num(self, weekday: WeekDay) -> int:
        """Convert WeekDay enum to number (0=Monday)"""
        weekday_map = {
            WeekDay.MONDAY: 0,
            WeekDay.TUESDAY: 1,
            WeekDay.WEDNESDAY: 2,
            WeekDay.THURSDAY: 3,
            WeekDay.FRIDAY: 4,
            WeekDay.SATURDAY: 5,
            WeekDay.SUNDAY: 6
        }
        return weekday_map[weekday]
    
    def _find_nth_weekday(self, year: int, month: int, nth: int, weekday: int) -> Optional[date]:
        """Find the nth occurrence of a weekday in a month"""
        # Find first occurrence
        first_day = date(year, month, 1)
        first_weekday = first_day.weekday()
        
        # Calculate days until target weekday
        days_until = (weekday - first_weekday) % 7
        first_occurrence = first_day + timedelta(days=days_until)
        
        # Calculate nth occurrence
        target_date = first_occurrence + timedelta(weeks=nth - 1)
        
        # Check if still in same month
        if target_date.month == month:
            return target_date
        return None
    
    def _is_holiday(self, check_date: date) -> bool:
        """Check if date is a holiday (mocked)"""
        # This would integrate with a holiday calendar in production
        # For now, just check major US holidays
        holidays = [
            date(check_date.year, 1, 1),  # New Year's Day
            date(check_date.year, 7, 4),  # Independence Day
            date(check_date.year, 12, 25)  # Christmas
        ]
        return check_date in holidays
    
    def _process_template_string(self, template: str, variables: Dict[str, Any]) -> str:
        """Process a template string with variables"""
        # Simple variable substitution
        result = template
        
        for key, value in variables.items():
            if isinstance(value, datetime):
                value_str = value.strftime("%Y-%m-%d")
            elif isinstance(value, date):
                value_str = value.strftime("%Y-%m-%d")
            else:
                value_str = str(value)
            
            result = result.replace(f"{{{key}}}", value_str)
        
        return result
    
    def _process_template_content(self, content: Dict[str, Any], 
                                variables: Dict[str, Any]) -> Dict[str, Any]:
        """Process template content with variables"""
        # Deep copy content
        import copy
        processed = copy.deepcopy(content)
        
        # Recursively process strings
        def process_value(value):
            if isinstance(value, str):
                return self._process_template_string(value, variables)
            elif isinstance(value, dict):
                return {k: process_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [process_value(item) for item in value]
            else:
                return value
        
        return process_value(processed)
    
    def _generate_pattern_description(self, pattern: RecurrencePattern) -> str:
        """Generate human-readable description of recurrence pattern"""
        parts = []
        
        # Frequency
        if pattern.frequency == RecurrenceFrequency.DAILY:
            if pattern.interval == 1:
                parts.append("Daily")
            else:
                parts.append(f"Every {pattern.interval} days")
            
            if pattern.business_days_only:
                parts.append("(business days only)")
        
        elif pattern.frequency == RecurrenceFrequency.WEEKLY:
            if pattern.interval == 1:
                parts.append("Weekly")
            else:
                parts.append(f"Every {pattern.interval} weeks")
            
            if pattern.week_days:
                days = [wd.value.capitalize() for wd in pattern.week_days]
                parts.append(f"on {', '.join(days)}")
        
        elif pattern.frequency == RecurrenceFrequency.MONTHLY:
            if pattern.interval == 1:
                parts.append("Monthly")
            else:
                parts.append(f"Every {pattern.interval} months")
            
            if pattern.monthly_type == MonthlyRecurrenceType.DATE:
                parts.append(f"on day {pattern.month_day}")
            elif pattern.month_weekday:
                parts.append(f"on the {pattern.month_week} {pattern.month_weekday.value}")
        
        elif pattern.frequency == RecurrenceFrequency.YEARLY:
            parts.append("Yearly")
            if pattern.yearly_month and pattern.yearly_day:
                month_names = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ]
                parts.append(f"on {month_names[pattern.yearly_month - 1]} {pattern.yearly_day}")
        
        # End condition
        if pattern.end_type == "date" and pattern.end_date:
            parts.append(f"until {pattern.end_date}")
        elif pattern.end_type == "count" and pattern.end_count:
            parts.append(f"for {pattern.end_count} occurrences")
        
        return " ".join(parts)
    
    def _evaluate_triggers(self, triggers: List[AutomationTrigger], 
                         trigger_data: Dict[str, Any]) -> bool:
        """Evaluate if triggers match the event"""
        # This is simplified - would be more sophisticated in production
        for trigger in triggers:
            if trigger.trigger_type == trigger_data.get("trigger_type"):
                # Check additional trigger conditions
                if trigger.field_name and trigger.field_name != trigger_data.get("field_name"):
                    continue
                
                if trigger.from_status and trigger.from_status != trigger_data.get("from_status"):
                    continue
                
                if trigger.to_status and trigger.to_status != trigger_data.get("to_status"):
                    continue
                
                return True
        
        return False
    
    def _evaluate_conditions(self, conditions: List[TransitionCondition],
                           logic: str, entity_type: str, entity_id: str) -> bool:
        """Evaluate workflow/automation conditions"""
        # This is simplified - would fetch actual entity data in production
        results = []
        
        for condition in conditions:
            # Mock evaluation
            result = True  # Would evaluate actual condition
            results.append(result)
        
        if logic == "AND":
            return all(results)
        else:  # OR
            return any(results) if results else True
    
    def _evaluate_transition_conditions(self, transition: WorkflowTransition,
                                      entity_type: str, entity_id: str,
                                      field_updates: Dict[str, Any]) -> bool:
        """Evaluate if transition conditions are met"""
        return self._evaluate_conditions(transition.conditions, transition.condition_logic,
                                       entity_type, entity_id)
    
    def _execute_workflow_actions(self, action_ids: List[str], 
                                entity_type: str, entity_id: str, user_id: str):
        """Execute workflow state actions"""
        # This would trigger automation rules in production
        for action_id in action_ids:
            # Mock execution
            pass
    
    def _apply_field_updates(self, entity_type: str, entity_id: str, 
                           updates: Dict[str, Any]):
        """Apply field updates to an entity"""
        # This would update the actual entity in production
        pass
    
    def _rule_applies_to_entity(self, rule: AutomationRule, 
                              entity_type: str, entity_id: str) -> bool:
        """Check if automation rule applies to an entity"""
        # Check entity type
        if entity_type == "task":
            task = self.task_repo.get_task(entity_id)
            if not task:
                return False
            
            # Check project filter
            if rule.project_ids and task.project_id not in rule.project_ids:
                return False
            
            # Check board filter
            if rule.board_ids:
                # Would check task's board
                pass
        
        return True
    
    def _execute_action(self, action: AutomationAction, 
                      entity_type: str, entity_id: str) -> Dict[str, Any]:
        """Execute an automation action"""
        # This is a simplified mock - would perform actual actions in production
        change = {
            "action_type": action.action_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if action.action_type == AutomationActionType.UPDATE_FIELD:
            change["field"] = action.field_name
            change["value"] = action.field_value
        
        elif action.action_type == AutomationActionType.CHANGE_STATUS:
            change["new_status"] = action.new_status
        
        elif action.action_type == AutomationActionType.ASSIGN_USER:
            change["assigned_to"] = action.assign_to_user_id
        
        # Would perform actual action here
        
        return change
    
    def _simulate_action(self, action: AutomationAction,
                       entity_type: str, entity_id: str) -> Dict[str, Any]:
        """Simulate an automation action for testing"""
        return {
            "action": action.action_type,
            "would_update": {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "changes": self._execute_action(action, entity_type, entity_id)
            }
        }