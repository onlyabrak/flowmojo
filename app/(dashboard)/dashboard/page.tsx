import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { LayoutDashboard, CheckCircle2, PlayCircle, Clock, TrendingUp } from 'lucide-react'
import { PHASE_COLORS, PHASE_LABELS } from '@/lib/constants/tools'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's projects with phases
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch project phases for additional insights
  const { data: phases } = await supabase
    .from('project_phases')
    .select('*')

  // Calculate statistics
  const activeProjects = projects?.filter((p) => p.status === 'active') || []
  const completedProjects = projects?.filter((p) => p.status === 'completed') || []
  const onHoldProjects = projects?.filter((p) => p.status === 'on_hold') || []

  // Phase distribution
  const phaseDistribution = {
    define: projects?.filter((p) => p.current_phase === 'define').length || 0,
    measure: projects?.filter((p) => p.current_phase === 'measure').length || 0,
    analyze: projects?.filter((p) => p.current_phase === 'analyze').length || 0,
    improve: projects?.filter((p) => p.current_phase === 'improve').length || 0,
    control: projects?.filter((p) => p.current_phase === 'control').length || 0,
  }

  // Projects with upcoming deadlines (within 30 days)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const upcomingDeadlines = projects?.filter((p) => {
    if (!p.target_completion_date || p.status === 'completed') return false
    const deadline = new Date(p.target_completion_date)
    return deadline > now && deadline <= thirtyDaysFromNow
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.email}</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">Create Project</Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects?.length || 0}</div>
            <p className="text-xs text-gray-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-gray-600 mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects.length}</div>
            <p className="text-xs text-gray-600 mt-1">Successfully finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines.length}</div>
            <p className="text-xs text-gray-600 mt-1">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Phase Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>DMAIC Phase Distribution</CardTitle>
          <CardDescription>Projects by current phase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(phaseDistribution).map(([phase, count]) => (
              <div key={phase} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={PHASE_COLORS[phase as keyof typeof PHASE_COLORS]}>
                    {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${projects && projects.length > 0 ? (count / projects.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Projects due in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.map((project) => {
                const daysRemaining = Math.ceil(
                  (new Date(project.target_completion_date!).getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition"
                  >
                    <div>
                      <div className="font-medium">{project.title}</div>
                      <div className="text-sm text-gray-600">
                        Due {new Date(project.target_completion_date!).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        daysRemaining <= 7
                          ? 'border-red-500 text-red-700'
                          : daysRemaining <= 14
                          ? 'border-orange-500 text-orange-700'
                          : 'border-yellow-500 text-yellow-700'
                      }
                    >
                      {daysRemaining} days
                    </Badge>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest Lean Six Sigma projects</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{project.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {project.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={PHASE_COLORS[project.current_phase as keyof typeof PHASE_COLORS]}
                        >
                          {PHASE_LABELS[project.current_phase as keyof typeof PHASE_LABELS]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            project.status === 'active'
                              ? 'border-green-500 text-green-700'
                              : project.status === 'completed'
                              ? 'border-blue-500 text-blue-700'
                              : 'border-gray-500 text-gray-700'
                          }
                        >
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {project.target_completion_date && project.status !== 'completed' && (
                      <div className="text-right text-sm">
                        <div className="text-gray-500">Target</div>
                        <div className="font-medium">
                          {new Date(project.target_completion_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2">No projects yet</p>
              <p className="text-sm mb-6">
                Create your first Lean Six Sigma project to get started with continuous improvement.
              </p>
              <Button asChild>
                <Link href="/projects/new">Create Your First Project</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
