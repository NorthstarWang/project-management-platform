"""
Repository for Dependency & Workflow Management System

This module implements in-memory storage and retrieval for all dependency and workflow
related entities including task dependencies, recurring tasks, workflows, automation
rules, and templates.
"""

from typing import List, Dict, Optional, Set, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque

from ..models.dependency_workflow_models import (
    # Dependencies
    TaskDependency, DependencyChain, DependencyGraph, CriticalPathAnalysis,
    DependencyType, RecurringTask, RecurrencePattern, RecurringException,
    RecurrenceFrequency, WorkflowDefinition, WorkflowState, WorkflowTransition, WorkflowInstance,
    AutomationRule, AutomationLog, AutomationTriggerType, TemplateDefinition, TemplateUsage, TemplateType
)


class DependencyWorkflowRepository:
    """Repository for managing dependency and workflow data"""
    
    def __init__(self):
        # Dependency storage
        self.task_dependencies: Dict[str, TaskDependency] = {}
        self.dependency_chains: Dict[str, DependencyChain] = {}
        self.dependency_graphs: Dict[str, DependencyGraph] = {}
        self.critical_path_analyses: Dict[str, CriticalPathAnalysis] = {}
        
        # Indexes for dependencies
        self.deps_by_source: Dict[str, List[str]] = defaultdict(list)
        self.deps_by_target: Dict[str, List[str]] = defaultdict(list)
        self.deps_by_project: Dict[str, List[str]] = defaultdict(list)
        
        # Recurring task storage
        self.recurring_tasks: Dict[str, RecurringTask] = {}
        self.recurrence_patterns: Dict[str, RecurrencePattern] = {}
        self.recurring_exceptions: Dict[str, RecurringException] = {}
        
        # Indexes for recurring tasks
        self.recurring_by_project: Dict[str, List[str]] = defaultdict(list)
        self.recurring_by_board: Dict[str, List[str]] = defaultdict(list)
        self.active_recurring: Set[str] = set()
        
        # Workflow storage
        self.workflow_definitions: Dict[str, WorkflowDefinition] = {}
        self.workflow_states: Dict[str, WorkflowState] = {}
        self.workflow_transitions: Dict[str, WorkflowTransition] = {}
        self.workflow_instances: Dict[str, WorkflowInstance] = {}
        
        # Indexes for workflows
        self.workflows_by_type: Dict[str, List[str]] = defaultdict(list)
        self.states_by_workflow: Dict[str, List[str]] = defaultdict(list)
        self.transitions_by_workflow: Dict[str, List[str]] = defaultdict(list)
        self.instances_by_entity: Dict[str, str] = {}  # entity_id -> instance_id
        
        # Automation storage
        self.automation_rules: Dict[str, AutomationRule] = {}
        self.automation_logs: Dict[str, AutomationLog] = {}
        
        # Indexes for automation
        self.rules_by_project: Dict[str, List[str]] = defaultdict(list)
        self.rules_by_trigger: Dict[AutomationTriggerType, List[str]] = defaultdict(list)
        self.active_rules: Set[str] = set()
        self.logs_by_rule: Dict[str, List[str]] = defaultdict(list)
        
        # Template storage
        self.template_definitions: Dict[str, TemplateDefinition] = {}
        self.template_usages: Dict[str, TemplateUsage] = {}
        
        # Indexes for templates
        self.templates_by_type: Dict[TemplateType, List[str]] = defaultdict(list)
        self.templates_by_category: Dict[str, List[str]] = defaultdict(list)
        self.public_templates: Set[str] = set()
        self.usage_by_template: Dict[str, List[str]] = defaultdict(list)
    
    # Dependency Methods
    
    def create_dependency(self, dependency: TaskDependency, project_id: str) -> TaskDependency:
        """Create a new task dependency"""
        self.task_dependencies[dependency.id] = dependency
        self.deps_by_source[dependency.source_task_id].append(dependency.id)
        self.deps_by_target[dependency.target_task_id].append(dependency.id)
        self.deps_by_project[project_id].append(dependency.id)
        return dependency
    
    def get_dependency(self, dependency_id: str) -> Optional[TaskDependency]:
        """Get a dependency by ID"""
        return self.task_dependencies.get(dependency_id)
    
    def get_dependencies_for_task(self, task_id: str, 
                                 direction: Optional[str] = None) -> List[TaskDependency]:
        """Get all dependencies for a task"""
        dep_ids = set()
        
        if direction in (None, "source"):
            dep_ids.update(self.deps_by_source.get(task_id, []))
        
        if direction in (None, "target"):
            dep_ids.update(self.deps_by_target.get(task_id, []))
        
        return [self.task_dependencies[dep_id] for dep_id in dep_ids 
                if dep_id in self.task_dependencies]
    
    def get_project_dependencies(self, project_id: str) -> List[TaskDependency]:
        """Get all dependencies for a project"""
        dep_ids = self.deps_by_project.get(project_id, [])
        return [self.task_dependencies[dep_id] for dep_id in dep_ids 
                if dep_id in self.task_dependencies]
    
    def delete_dependency(self, dependency_id: str) -> bool:
        """Delete a dependency"""
        dependency = self.task_dependencies.get(dependency_id)
        if not dependency:
            return False
        
        # Remove from indexes
        self.deps_by_source[dependency.source_task_id].remove(dependency_id)
        self.deps_by_target[dependency.target_task_id].remove(dependency_id)
        
        # Remove from storage
        del self.task_dependencies[dependency_id]
        return True
    
    def find_circular_dependencies(self, project_id: str) -> List[List[str]]:
        """Find circular dependencies in a project"""
        # Build adjacency list
        graph = defaultdict(list)
        dependencies = self.get_project_dependencies(project_id)
        
        for dep in dependencies:
            if dep.dependency_type in [DependencyType.BLOCKS, DependencyType.BLOCKED_BY]:
                graph[dep.source_task_id].append(dep.target_task_id)
        
        # DFS to find cycles
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(node: str, path: List[str]) -> None:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in graph[node]:
                if neighbor not in visited:
                    dfs(neighbor, path.copy())
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
            
            rec_stack.remove(node)
        
        # Check all nodes
        for node in graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def calculate_critical_path(self, project_id: str, 
                               task_durations: Dict[str, int]) -> CriticalPathAnalysis:
        """Calculate critical path for a project"""
        dependencies = self.get_project_dependencies(project_id)
        
        # Build graph
        predecessors = defaultdict(list)
        successors = defaultdict(list)
        all_tasks = set()
        
        for dep in dependencies:
            if dep.dependency_type == DependencyType.BLOCKED_BY:
                predecessors[dep.target_task_id].append(
                    (dep.source_task_id, dep.lag_days)
                )
                successors[dep.source_task_id].append(
                    (dep.target_task_id, dep.lag_days)
                )
                all_tasks.add(dep.source_task_id)
                all_tasks.add(dep.target_task_id)
        
        # Add tasks without dependencies
        for task_id in task_durations:
            all_tasks.add(task_id)
        
        # Forward pass - calculate earliest times
        earliest_start = {}
        earliest_finish = {}
        
        # Topological sort
        in_degree = defaultdict(int)
        for task in all_tasks:
            in_degree[task] = len(predecessors[task])
        
        queue = deque([task for task in all_tasks if in_degree[task] == 0])
        base_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        while queue:
            task = queue.popleft()
            
            # Calculate earliest start
            if task not in predecessors:
                earliest_start[task] = base_date
            else:
                max_finish = base_date
                for pred_task, lag in predecessors[task]:
                    if pred_task in earliest_finish:
                        finish_with_lag = earliest_finish[pred_task] + timedelta(days=lag)
                        max_finish = max(max_finish, finish_with_lag)
                earliest_start[task] = max_finish
            
            # Calculate earliest finish
            duration = task_durations.get(task, 1)
            earliest_finish[task] = earliest_start[task] + timedelta(days=duration)
            
            # Update successors
            for succ_task, _ in successors[task]:
                in_degree[succ_task] -= 1
                if in_degree[succ_task] == 0:
                    queue.append(succ_task)
        
        # Find project end date
        project_end = max(earliest_finish.values()) if earliest_finish else base_date
        
        # Backward pass - calculate latest times
        latest_start = {}
        latest_finish = {}
        
        # Start from tasks with no successors
        out_degree = defaultdict(int)
        for task in all_tasks:
            out_degree[task] = len(successors[task])
        
        queue = deque([task for task in all_tasks if out_degree[task] == 0])
        
        while queue:
            task = queue.popleft()
            
            # Calculate latest finish
            if task not in successors:
                latest_finish[task] = project_end
            else:
                min_start = project_end
                for succ_task, lag in successors[task]:
                    if succ_task in latest_start:
                        start_minus_lag = latest_start[succ_task] - timedelta(days=lag)
                        min_start = min(min_start, start_minus_lag)
                latest_finish[task] = min_start
            
            # Calculate latest start
            duration = task_durations.get(task, 1)
            latest_start[task] = latest_finish[task] - timedelta(days=duration)
            
            # Update predecessors
            for pred_task, _ in predecessors[task]:
                out_degree[pred_task] -= 1
                if out_degree[pred_task] == 0:
                    queue.append(pred_task)
        
        # Calculate slack and identify critical tasks
        slack_by_task = {}
        critical_tasks = []
        
        for task in all_tasks:
            if task in earliest_start and task in latest_start:
                slack = (latest_start[task] - earliest_start[task]).days
                slack_by_task[task] = slack
                if slack == 0:
                    critical_tasks.append(task)
        
        # Create analysis result
        analysis = CriticalPathAnalysis(
            project_id=project_id,
            critical_tasks=critical_tasks,
            project_duration_days=(project_end - base_date).days,
            slack_by_task=slack_by_task,
            earliest_start_dates=earliest_start,
            latest_start_dates=latest_start,
            earliest_finish_dates=earliest_finish,
            latest_finish_dates=latest_finish
        )
        
        self.critical_path_analyses[project_id] = analysis
        return analysis
    
    def create_dependency_graph(self, project_id: str) -> DependencyGraph:
        """Create a dependency graph for visualization"""
        dependencies = self.get_project_dependencies(project_id)
        
        # Create nodes and edges
        nodes = []
        edges = []
        task_ids = set()
        
        for dep in dependencies:
            task_ids.add(dep.source_task_id)
            task_ids.add(dep.target_task_id)
            
            edges.append({
                "id": dep.id,
                "source": dep.source_task_id,
                "target": dep.target_task_id,
                "type": dep.dependency_type,
                "lag_days": dep.lag_days
            })
        
        # Create nodes for all tasks
        for task_id in task_ids:
            nodes.append({
                "id": task_id,
                "type": "task"
            })
        
        # Check for cycles
        cycles = self.find_circular_dependencies(project_id)
        
        # Get critical paths if available
        critical_paths = []
        if project_id in self.critical_path_analyses:
            analysis = self.critical_path_analyses[project_id]
            critical_paths.append(analysis.critical_tasks)
        
        graph = DependencyGraph(
            project_id=project_id,
            nodes=nodes,
            edges=edges,
            critical_paths=critical_paths,
            has_cycles=len(cycles) > 0,
            cycle_details=cycles,
            stats={
                "total_tasks": len(task_ids),
                "total_dependencies": len(dependencies),
                "cycle_count": len(cycles)
            }
        )
        
        self.dependency_graphs[project_id] = graph
        return graph
    
    # Recurring Task Methods
    
    def create_recurring_task(self, task: RecurringTask) -> RecurringTask:
        """Create a new recurring task"""
        self.recurring_tasks[task.id] = task
        self.recurring_by_project[task.project_id].append(task.id)
        self.recurring_by_board[task.board_id].append(task.id)
        
        if task.is_active:
            self.active_recurring.add(task.id)
        
        return task
    
    def create_recurrence_pattern(self, pattern: RecurrencePattern) -> RecurrencePattern:
        """Create a new recurrence pattern"""
        self.recurrence_patterns[pattern.id] = pattern
        return pattern
    
    def get_recurring_task(self, task_id: str) -> Optional[RecurringTask]:
        """Get a recurring task by ID"""
        return self.recurring_tasks.get(task_id)
    
    def get_active_recurring_tasks(self) -> List[RecurringTask]:
        """Get all active recurring tasks"""
        return [self.recurring_tasks[task_id] for task_id in self.active_recurring
                if task_id in self.recurring_tasks]
    
    def get_project_recurring_tasks(self, project_id: str) -> List[RecurringTask]:
        """Get all recurring tasks for a project"""
        task_ids = self.recurring_by_project.get(project_id, [])
        return [self.recurring_tasks[task_id] for task_id in task_ids
                if task_id in self.recurring_tasks]
    
    def update_recurring_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[RecurringTask]:
        """Update a recurring task"""
        task = self.recurring_tasks.get(task_id)
        if not task:
            return None
        
        # Update fields
        for key, value in updates.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        task.updated_at = datetime.utcnow()
        
        # Update active status
        if "is_active" in updates:
            if updates["is_active"]:
                self.active_recurring.add(task_id)
            else:
                self.active_recurring.discard(task_id)
        
        return task
    
    def add_recurring_exception(self, exception: RecurringException) -> RecurringException:
        """Add an exception for a recurring task"""
        self.recurring_exceptions[exception.id] = exception
        return exception
    
    def get_recurring_exceptions(self, recurring_task_id: str) -> List[RecurringException]:
        """Get all exceptions for a recurring task"""
        return [exc for exc in self.recurring_exceptions.values()
                if exc.recurring_task_id == recurring_task_id]
    
    # Workflow Methods
    
    def create_workflow(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        """Create a new workflow definition"""
        self.workflow_definitions[workflow.id] = workflow
        self.workflows_by_type[workflow.entity_type].append(workflow.id)
        return workflow
    
    def create_workflow_state(self, state: WorkflowState) -> WorkflowState:
        """Create a workflow state"""
        self.workflow_states[state.id] = state
        self.states_by_workflow[state.workflow_id].append(state.id)
        return state
    
    def create_workflow_transition(self, transition: WorkflowTransition) -> WorkflowTransition:
        """Create a workflow transition"""
        self.workflow_transitions[transition.id] = transition
        self.transitions_by_workflow[transition.workflow_id].append(transition.id)
        return transition
    
    def get_workflow(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get a workflow by ID"""
        return self.workflow_definitions.get(workflow_id)
    
    def get_workflow_states(self, workflow_id: str) -> List[WorkflowState]:
        """Get all states for a workflow"""
        state_ids = self.states_by_workflow.get(workflow_id, [])
        return [self.workflow_states[state_id] for state_id in state_ids
                if state_id in self.workflow_states]
    
    def get_workflow_transitions(self, workflow_id: str) -> List[WorkflowTransition]:
        """Get all transitions for a workflow"""
        transition_ids = self.transitions_by_workflow.get(workflow_id, [])
        return [self.workflow_transitions[trans_id] for trans_id in transition_ids
                if trans_id in self.workflow_transitions]
    
    def get_workflows_by_type(self, entity_type: str) -> List[WorkflowDefinition]:
        """Get all workflows for an entity type"""
        workflow_ids = self.workflows_by_type.get(entity_type, [])
        return [self.workflow_definitions[wf_id] for wf_id in workflow_ids
                if wf_id in self.workflow_definitions]
    
    def create_workflow_instance(self, instance: WorkflowInstance) -> WorkflowInstance:
        """Create a workflow instance"""
        self.workflow_instances[instance.id] = instance
        
        # Map entity to instance
        entity_key = f"{instance.entity_type}:{instance.entity_id}"
        self.instances_by_entity[entity_key] = instance.id
        
        return instance
    
    def get_workflow_instance(self, entity_type: str, entity_id: str) -> Optional[WorkflowInstance]:
        """Get workflow instance for an entity"""
        entity_key = f"{entity_type}:{entity_id}"
        instance_id = self.instances_by_entity.get(entity_key)
        
        if instance_id:
            return self.workflow_instances.get(instance_id)
        return None
    
    def update_workflow_instance(self, instance_id: str, 
                               updates: Dict[str, Any]) -> Optional[WorkflowInstance]:
        """Update a workflow instance"""
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return None
        
        # Update fields
        for key, value in updates.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        return instance
    
    def get_valid_transitions(self, workflow_id: str, 
                            from_state_id: str) -> List[WorkflowTransition]:
        """Get valid transitions from a state"""
        transitions = self.get_workflow_transitions(workflow_id)
        return [trans for trans in transitions
                if trans.from_state_id == from_state_id and trans.is_active]
    
    # Automation Methods
    
    def create_automation_rule(self, rule: AutomationRule) -> AutomationRule:
        """Create a new automation rule"""
        self.automation_rules[rule.id] = rule
        
        # Index by project
        for project_id in rule.project_ids:
            self.rules_by_project[project_id].append(rule.id)
        
        # Index by trigger type
        for trigger in rule.triggers:
            self.rules_by_trigger[trigger.trigger_type].append(rule.id)
        
        if rule.is_active:
            self.active_rules.add(rule.id)
        
        return rule
    
    def get_automation_rule(self, rule_id: str) -> Optional[AutomationRule]:
        """Get an automation rule by ID"""
        return self.automation_rules.get(rule_id)
    
    def get_active_automation_rules(self) -> List[AutomationRule]:
        """Get all active automation rules"""
        return [self.automation_rules[rule_id] for rule_id in self.active_rules
                if rule_id in self.automation_rules]
    
    def get_rules_by_trigger(self, trigger_type: AutomationTriggerType) -> List[AutomationRule]:
        """Get automation rules by trigger type"""
        rule_ids = self.rules_by_trigger.get(trigger_type, [])
        return [self.automation_rules[rule_id] for rule_id in rule_ids
                if rule_id in self.automation_rules and rule_id in self.active_rules]
    
    def get_project_automation_rules(self, project_id: str) -> List[AutomationRule]:
        """Get automation rules for a project"""
        rule_ids = self.rules_by_project.get(project_id, [])
        
        # Also get rules without specific project assignment
        global_rules = [rule for rule in self.automation_rules.values()
                       if not rule.project_ids]
        
        project_rules = [self.automation_rules[rule_id] for rule_id in rule_ids
                        if rule_id in self.automation_rules]
        
        return project_rules + global_rules
    
    def update_automation_rule(self, rule_id: str, 
                             updates: Dict[str, Any]) -> Optional[AutomationRule]:
        """Update an automation rule"""
        rule = self.automation_rules.get(rule_id)
        if not rule:
            return None
        
        # Update fields
        for key, value in updates.items():
            if hasattr(rule, key):
                setattr(rule, key, value)
        
        rule.updated_at = datetime.utcnow()
        
        # Update active status
        if "is_active" in updates:
            if updates["is_active"]:
                self.active_rules.add(rule_id)
            else:
                self.active_rules.discard(rule_id)
        
        return rule
    
    def create_automation_log(self, log: AutomationLog) -> AutomationLog:
        """Create an automation execution log"""
        self.automation_logs[log.id] = log
        self.logs_by_rule[log.rule_id].append(log.id)
        return log
    
    def get_automation_logs(self, rule_id: Optional[str] = None,
                          limit: int = 100) -> List[AutomationLog]:
        """Get automation logs"""
        if rule_id:
            log_ids = self.logs_by_rule.get(rule_id, [])
            logs = [self.automation_logs[log_id] for log_id in log_ids
                   if log_id in self.automation_logs]
        else:
            logs = list(self.automation_logs.values())
        
        # Sort by triggered_at descending
        logs.sort(key=lambda x: x.triggered_at, reverse=True)
        
        return logs[:limit]
    
    # Template Methods
    
    def create_template(self, template: TemplateDefinition) -> TemplateDefinition:
        """Create a new template"""
        self.template_definitions[template.id] = template
        self.templates_by_type[template.template_type].append(template.id)
        
        if template.category:
            self.templates_by_category[template.category].append(template.id)
        
        if template.is_public:
            self.public_templates.add(template.id)
        
        return template
    
    def get_template(self, template_id: str) -> Optional[TemplateDefinition]:
        """Get a template by ID"""
        return self.template_definitions.get(template_id)
    
    def get_templates_by_type(self, template_type: TemplateType,
                            include_private: bool = False) -> List[TemplateDefinition]:
        """Get templates by type"""
        template_ids = self.templates_by_type.get(template_type, [])
        templates = []
        
        for template_id in template_ids:
            template = self.template_definitions.get(template_id)
            if template and (template.is_public or include_private):
                templates.append(template)
        
        return templates
    
    def search_templates(self, query: str, template_type: Optional[TemplateType] = None,
                        category: Optional[str] = None) -> List[TemplateDefinition]:
        """Search templates by name, description, or tags"""
        results = []
        query_lower = query.lower()
        
        for template in self.template_definitions.values():
            # Filter by type if specified
            if template_type and template.template_type != template_type:
                continue
            
            # Filter by category if specified
            if category and template.category != category:
                continue
            
            # Search in name, description, and tags
            if (query_lower in template.name.lower() or
                (template.description and query_lower in template.description.lower()) or
                any(query_lower in tag.lower() for tag in template.tags)):
                results.append(template)
        
        # Sort by usage count
        results.sort(key=lambda x: x.usage_count, reverse=True)
        
        return results
    
    def update_template(self, template_id: str, 
                       updates: Dict[str, Any]) -> Optional[TemplateDefinition]:
        """Update a template"""
        template = self.template_definitions.get(template_id)
        if not template:
            return None
        
        # Update fields
        for key, value in updates.items():
            if hasattr(template, key):
                setattr(template, key, value)
        
        template.updated_at = datetime.utcnow()
        template.version += 1
        
        # Update public status
        if "is_public" in updates:
            if updates["is_public"]:
                self.public_templates.add(template_id)
            else:
                self.public_templates.discard(template_id)
        
        return template
    
    def create_template_usage(self, usage: TemplateUsage) -> TemplateUsage:
        """Record template usage"""
        self.template_usages[usage.id] = usage
        self.usage_by_template[usage.template_id].append(usage.id)
        
        # Update template usage count
        template = self.template_definitions.get(usage.template_id)
        if template:
            template.usage_count += 1
            template.last_used = usage.used_at
        
        return usage
    
    def get_template_usages(self, template_id: str, limit: int = 50) -> List[TemplateUsage]:
        """Get usage history for a template"""
        usage_ids = self.usage_by_template.get(template_id, [])
        usages = [self.template_usages[usage_id] for usage_id in usage_ids
                 if usage_id in self.template_usages]
        
        # Sort by used_at descending
        usages.sort(key=lambda x: x.used_at, reverse=True)
        
        return usages[:limit]
    
    # Utility Methods
    
    def get_stats(self) -> Dict[str, Any]:
        """Get repository statistics"""
        return {
            "dependencies": {
                "total": len(self.task_dependencies),
                "by_type": {
                    dep_type: len([d for d in self.task_dependencies.values() 
                                 if d.dependency_type == dep_type])
                    for dep_type in DependencyType
                },
                "projects_with_deps": len(self.deps_by_project),
                "circular_dependencies": sum(
                    len(self.find_circular_dependencies(proj_id)) > 0
                    for proj_id in self.deps_by_project
                )
            },
            "recurring_tasks": {
                "total": len(self.recurring_tasks),
                "active": len(self.active_recurring),
                "by_frequency": {
                    freq: len([t for t in self.recurring_tasks.values()
                             if t.id in self.recurrence_patterns and
                             self.recurrence_patterns[t.recurrence_pattern_id].frequency == freq])
                    for freq in RecurrenceFrequency
                }
            },
            "workflows": {
                "definitions": len(self.workflow_definitions),
                "states": len(self.workflow_states),
                "transitions": len(self.workflow_transitions),
                "instances": len(self.workflow_instances),
                "active_instances": len([i for i in self.workflow_instances.values()
                                       if not i.is_completed])
            },
            "automation": {
                "rules": len(self.automation_rules),
                "active_rules": len(self.active_rules),
                "logs": len(self.automation_logs),
                "by_trigger": {
                    trigger: len(rules)
                    for trigger, rules in self.rules_by_trigger.items()
                }
            },
            "templates": {
                "total": len(self.template_definitions),
                "public": len(self.public_templates),
                "by_type": {
                    template_type: len(templates)
                    for template_type, templates in self.templates_by_type.items()
                },
                "total_usage": len(self.template_usages)
            }
        }