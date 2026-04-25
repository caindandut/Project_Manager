import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Bug, Circle, LayoutDashboard, Plus, Search, Settings, Users } from 'lucide-react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-14 items-center px-6 gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">PM Tool</span>
          </div>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tasks..." className="pl-9 h-9" />
            </div>
          </div>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>PM</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tasks', value: 42, color: 'text-primary' },
            { label: 'In Progress', value: 7, color: 'text-yellow-500' },
            { label: 'Completed', value: 28, color: 'text-green-500' },
            { label: 'Team Members', value: 5, color: 'text-blue-500' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Kanban Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Setup CI/CD Pipeline</CardTitle>
                  <Badge variant="default">In Progress</Badge>
                </div>
                <CardDescription>DevOps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span>Medium Priority</span>
                </div>
                <div className="flex items-center justify-between">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">JD</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Due Apr 30</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Design System Update</CardTitle>
                  <Badge variant="secondary">Todo</Badge>
                </div>
                <CardDescription>Frontend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                  <span>High Priority</span>
                </div>
                <div className="flex items-center justify-between">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">AL</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Due May 5</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Fix Auth Bug</CardTitle>
                  <Badge variant="destructive">
                    <Bug className="h-3 w-3 mr-1" />
                    Bug
                  </Badge>
                </div>
                <CardDescription>Backend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="h-3 w-3 fill-orange-500 text-orange-500" />
                  <span>Critical</span>
                </div>
                <div className="flex items-center justify-between">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">MK</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Due Apr 28</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Interactive Demo */}
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui Component Test</CardTitle>
            <CardDescription>
              Testing Button, Input, Label, Badge, Avatar, and Separator components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name</Label>
              <Input id="task-name" placeholder="Enter task name..." />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>

            <Separator />

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Counter:</span>
              <Button variant="outline" size="sm" onClick={() => setCount((c) => c - 1)}>
                -
              </Button>
              <span className="text-xl font-mono font-bold min-w-[40px] text-center">{count}</span>
              <Button variant="default" size="sm" onClick={() => setCount((c) => c + 1)}>
                +
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Team members:</span>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-blue-500 text-white">A</AvatarFallback>
              </Avatar>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-green-500 text-white">B</AvatarFallback>
              </Avatar>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-purple-500 text-white">C</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
