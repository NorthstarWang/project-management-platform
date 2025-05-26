'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
  Avatar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Switch,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Separator,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  ScrollArea,
  TaskCard,
} from '@/components/ui';

export function ComponentShowcase() {
  const [progress, setProgress] = useState(33);
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [selectValue, setSelectValue] = useState('');
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-primary p-8 space-y-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-primary">UI Component Showcase</h1>
            <p className="text-lg text-secondary">
              Comprehensive demonstration of all UI components with theme integration
            </p>
          </div>

          {/* Breadcrumb */}
          <Card>
            <CardHeader>
              <CardTitle>Breadcrumb Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Showcase</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </CardContent>
          </Card>

          {/* Buttons and Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons & Badges</CardTitle>
              <CardDescription>Various button styles and badge variants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
              
              <Separator />
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="todo">Todo</Badge>
                <Badge variant="progress">In Progress</Badge>
                <Badge variant="review">Review</Badge>
                <Badge variant="done">Done</Badge>
                <Badge variant="low">Low Priority</Badge>
                <Badge variant="medium">Medium Priority</Badge>
                <Badge variant="high">High Priority</Badge>
                <Badge variant="urgent">Urgent</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Form Components */}
          <Card>
            <CardHeader>
              <CardTitle>Form Components</CardTitle>
              <CardDescription>Input fields, selects, and form controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="select">Select Option</Label>
                  <Select value={selectValue} onValueChange={setSelectValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="notifications"
                    checked={switchValue}
                    onCheckedChange={setSwitchValue}
                  />
                  <Label htmlFor="notifications">Enable notifications</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={checkboxValue}
                    onCheckedChange={(checked) => setCheckboxValue(checked === true)}
                  />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>

                <div className="space-y-2">
                  <Label>Radio Group</Label>
                  <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option1" id="r1" />
                      <Label htmlFor="r1">Option 1</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option2" id="r2" />
                      <Label htmlFor="r2">Option 2</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Slider: {sliderValue[0]}</Label>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress and Avatars */}
          <Card>
            <CardHeader>
              <CardTitle>Progress & Avatars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Progress: {progress}%</Label>
                  <Button
                    size="sm"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    +10%
                  </Button>
                </div>
                <Progress value={progress} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Avatar Examples</Label>
                <div className="flex items-center space-x-2">
                  <Avatar name="John Doe" />
                  <Avatar name="Jane Smith" status="online" />
                  <Avatar name="Bob Johnson" status="away" />
                  <Avatar name="Alice Brown" status="busy" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Tabs Component</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tab1" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="mt-4">
                  <p className="text-secondary">Content for Tab 1</p>
                </TabsContent>
                <TabsContent value="tab2" className="mt-4">
                  <p className="text-secondary">Content for Tab 2</p>
                </TabsContent>
                <TabsContent value="tab3" className="mt-4">
                  <p className="text-secondary">Content for Tab 3</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Accordion */}
          <Card>
            <CardHeader>
              <CardTitle>Accordion Component</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is it accessible?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Is it styled?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It comes with default styles that match the other components.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Is it animated?</AccordionTrigger>
                  <AccordionContent>
                                         Yes. It&apos;s animated by default, but you can disable it if you prefer.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Dialogs and Tooltips */}
          <Card>
            <CardHeader>
              <CardTitle>Dialogs & Tooltips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog Title</DialogTitle>
                      <DialogDescription>
                        This is a dialog description. You can put any content here.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-secondary">Dialog content goes here.</p>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Item</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the item.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is a tooltip</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Task Card Example */}
          <Card>
            <CardHeader>
              <CardTitle>Task Card Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TaskCard
                  id="task-1"
                  title="Implement user authentication"
                  description="Add login and registration functionality with proper validation"
                  status="progress"
                  priority="high"
                  assignee={{
                    id: "user-1",
                    name: "John Doe",
                  }}
                  dueDate="2024-02-15T10:00:00Z"
                  commentsCount={3}
                  attachmentsCount={1}
                  tags={["frontend", "auth", "urgent"]}
                />
                
                <TaskCard
                  id="task-2"
                  title="Design system documentation"
                  description="Create comprehensive documentation for the design system"
                  status="todo"
                  priority="medium"
                  assignee={{
                    id: "user-2",
                    name: "Jane Smith",
                  }}
                  commentsCount={0}
                  tags={["documentation", "design"]}
                  compact
                />
              </div>
            </CardContent>
          </Card>

          {/* Scroll Area */}
          <Card>
            <CardHeader>
              <CardTitle>Scroll Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32 w-full rounded border border-secondary p-4">
                <div className="space-y-2">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="text-sm text-secondary">
                      Scrollable item {i + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
} 