'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DependencyGraph as DependencyGraphType, CriticalPathResult, BottleneckAnalysis } from '@/types/dependency';
import { dependencyService } from '@/services/dependencyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { GitBranch, AlertTriangle, TrendingUp, Clock, Users } from 'lucide-react';

interface DependencyGraphProps {
  projectId: string;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
  status: string;
  isOnCriticalPath: boolean;
  duration: number;
}

interface GraphEdge {
  id: string;
  from: GraphNode;
  to: GraphNode;
  type: string;
}

export function DependencyGraph({ projectId }: DependencyGraphProps) {
  const [graph, setGraph] = useState<DependencyGraphType | null>(null);
  const [criticalPath, setCriticalPath] = useState<CriticalPathResult | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottleneckAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('graph');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [graphData, pathData, bottleneckData] = await Promise.all([
        dependencyService.getDependencyGraph(projectId),
        dependencyService.getCriticalPath(projectId),
        dependencyService.getDependencyBottlenecks(projectId)
      ]);
      setGraph(graphData);
      setCriticalPath(pathData);
      setBottlenecks(bottleneckData);
    } catch (error) {
      console.error('Error loading dependency data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNodePositions = useCallback((): { nodes: GraphNode[], edges: GraphEdge[] } => {
    if (!graph) return { nodes: [], edges: [] };

    // Simple layout algorithm - arrange nodes in layers based on dependencies
    const layers: Map<string, number> = new Map();
    const nodeMap: Map<string, GraphNode> = new Map();
    
    // Calculate layers using topological sort
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();
    
    // Initialize in-degree
    graph.nodes.forEach(node => {
      inDegree.set(node.id, 0);
    });
    
    graph.edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // Find nodes with no dependencies (layer 0)
    const queue: string[] = [];
    graph.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
        layers.set(node.id, 0);
      }
    });
    
    // Process nodes layer by layer
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentLayer = layers.get(nodeId) || 0;
      
      graph.edges
        .filter(edge => edge.source === nodeId)
        .forEach(edge => {
          const targetDegree = (inDegree.get(edge.target) || 0) - 1;
          inDegree.set(edge.target, targetDegree);
          
          if (targetDegree === 0) {
            queue.push(edge.target);
            layers.set(edge.target, currentLayer + 1);
          }
        });
    }
    
    // Position nodes based on layers
    const layerCounts = new Map<number, number>();
    const maxLayer = Math.max(...Array.from(layers.values()), 0);
    
    // Count nodes in each layer
    layers.forEach((layer) => {
      layerCounts.set(layer, (layerCounts.get(layer) || 0) + 1);
    });
    
    // Calculate positions
    const layerIndices = new Map<number, number>();
    const xSpacing = 200;
    const ySpacing = 100;
    
    graph.nodes.forEach(node => {
      const layer = layers.get(node.id) || 0;
      const layerIndex = layerIndices.get(layer) || 0;
      const layerCount = layerCounts.get(layer) || 1;
      
      const graphNode: GraphNode = {
        id: node.id,
        x: layer * xSpacing + 50,
        y: (layerIndex - (layerCount - 1) / 2) * ySpacing + 300,
        label: node.label,
        status: node.status,
        isOnCriticalPath: criticalPath?.critical_path.includes(node.id) || false,
        duration: node.duration
      };
      
      nodeMap.set(node.id, graphNode);
      layerIndices.set(layer, layerIndex + 1);
    });
    
    // Create edge objects
    const edges: GraphEdge[] = graph.edges.map(edge => ({
      id: edge.id,
      from: nodeMap.get(edge.source)!,
      to: nodeMap.get(edge.target)!,
      type: edge.type
    }));
    
    return { nodes: Array.from(nodeMap.values()), edges };
  }, [graph, criticalPath]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  };

  const renderGraph = () => {
    if (!graph) return null;

    const { nodes, edges } = calculateNodePositions();
    const viewBoxWidth = Math.max(...nodes.map(n => n.x)) + 200;
    const viewBoxHeight = Math.max(...nodes.map(n => n.y)) + 200;

    return (
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-[600px] border rounded-lg bg-gray-50"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#6b7280"
            />
          </marker>
        </defs>

        {/* Render edges */}
        {edges.map(edge => (
          <g key={edge.id}>
            <line
              x1={edge.from.x + 60}
              y1={edge.from.y}
              x2={edge.to.x - 60}
              y2={edge.to.y}
              stroke={edge.from.isOnCriticalPath && edge.to.isOnCriticalPath ? '#ef4444' : '#6b7280'}
              strokeWidth={edge.from.isOnCriticalPath && edge.to.isOnCriticalPath ? 3 : 2}
              markerEnd="url(#arrowhead)"
              strokeDasharray={edge.type === 'start_to_start' ? '5,5' : undefined}
            />
          </g>
        ))}

        {/* Render nodes */}
        {nodes.map(node => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <rect
              x="-60"
              y="-25"
              width="120"
              height="50"
              rx="8"
              fill={getStatusColor(node.status)}
              stroke={node.isOnCriticalPath ? '#ef4444' : 'none'}
              strokeWidth={node.isOnCriticalPath ? 3 : 0}
              className="cursor-pointer transition-all hover:opacity-80"
            />
            <text
              textAnchor="middle"
              y="-5"
              fill="white"
              fontSize="12"
              fontWeight="500"
            >
              {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
            </text>
            <text
              textAnchor="middle"
              y="10"
              fill="white"
              fontSize="10"
              opacity="0.8"
            >
              {node.duration}d
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="150" height="100" fill="white" stroke="#e5e7eb" rx="4" />
          <text x="10" y="20" fontSize="12" fontWeight="600">Legend</text>
          <circle cx="20" cy="40" r="5" fill="#10b981" />
          <text x="35" y="44" fontSize="11">Completed</text>
          <circle cx="20" cy="60" r="5" fill="#3b82f6" />
          <text x="35" y="64" fontSize="11">In Progress</text>
          <circle cx="20" cy="80" r="5" fill="#6b7280" />
          <text x="35" y="84" fontSize="11">Pending</text>
        </g>
      </svg>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading dependency graph...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Dependency Analysis
        </h3>
        <Button onClick={loadData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="graph">Dependency Graph</TabsTrigger>
          <TabsTrigger value="critical-path">Critical Path</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Dependency Graph</CardTitle>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>{graph?.stats.total_tasks} tasks</span>
                <span>{graph?.stats.total_dependencies} dependencies</span>
              </div>
            </CardHeader>
            <CardContent>
              {graph && graph.nodes.length > 0 ? (
                renderGraph()
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No dependencies found in this project.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical-path" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Critical Path Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criticalPath && criticalPath.critical_tasks.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Total Duration</div>
                      <div className="text-2xl font-semibold">{criticalPath.total_duration} days</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Critical Tasks</div>
                      <div className="text-2xl font-semibold">{criticalPath.critical_tasks.length}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Tasks on Critical Path:</h4>
                    {criticalPath.critical_tasks.map((item, index) => (
                      <div key={item.task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{item.task.title}</div>
                            <div className="text-sm text-gray-500">
                              Duration: {item.duration}d • Slack: {item.slack}d
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No critical path found. Tasks may not have dependencies.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Dependency Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bottlenecks && bottlenecks.bottlenecks.length > 0 ? (
                <>
                  {bottlenecks.high_severity_count > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {bottlenecks.high_severity_count} high-severity bottlenecks detected.
                        These tasks are blocking many others and should be prioritized.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    {bottlenecks.bottlenecks.map((bottleneck) => (
                      <Card key={bottleneck.task.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-medium">{bottleneck.task.title}</h5>
                                <Badge
                                  variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {bottleneck.severity}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500 mb-3">
                                Blocking {bottleneck.blocking_count} tasks
                              </div>
                              <div className="space-y-1">
                                {bottleneck.blocked_tasks.slice(0, 3).map(task => (
                                  <div key={task.id} className="text-sm flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    {task.title}
                                  </div>
                                ))}
                                {bottleneck.blocked_tasks.length > 3 && (
                                  <div className="text-sm text-gray-400">
                                    +{bottleneck.blocked_tasks.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {bottleneck.task.status}
                              </Badge>
                              {bottleneck.task.assignee_id && (
                                <div className="mt-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {bottlenecks.recommendations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-sm mb-3">Recommendations:</h4>
                      <ul className="space-y-2">
                        {bottlenecks.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bottlenecks detected. Task dependencies are well-balanced.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}