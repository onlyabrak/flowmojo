import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Projects</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projects?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>Currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {projects?.filter((p) => p.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Projects</CardTitle>
            <CardDescription>Successfully finished</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {projects?.filter((p) => p.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Your latest Lean Six Sigma projects</CardDescription>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{project.title}</h3>
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium capitalize">{project.current_phase}</div>
                      <div className="text-xs text-gray-500 capitalize">{project.status}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No projects yet. Create your first Lean Six Sigma project to get started.</p>
              <Button asChild className="mt-4">
                <Link href="/projects/new">Create Your First Project</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
