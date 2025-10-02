'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import PhaseManager from '@/components/projects/phase-manager'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [tools, setTools] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
    loadProjectData()
  }, [id])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const loadProjectData = async () => {
    setLoading(true)
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (projectError || !projectData) {
        router.push('/projects')
        return
      }

      const { data: phasesData } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', id)
        .order('phase')

      const { data: toolsData } = await supabase
        .from('tools')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

      const { data: metricsData } = await supabase
        .from('metrics')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

      setProject(projectData)
      setPhases(phasesData || [])
      setTools(toolsData || [])
      setMetrics(metricsData || [])
    } catch (err) {
      console.error('Error loading project:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      define: 'bg-blue-100 text-blue-800',
      measure: 'bg-green-100 text-green-800',
      analyze: 'bg-yellow-100 text-yellow-800',
      improve: 'bg-orange-100 text-orange-800',
      control: 'bg-purple-100 text-purple-800',
    }
    return colors[phase] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className="text-blue-600 hover:underline text-sm mb-2 block">
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-gray-600">{project.description}</p>
        </div>
        <div className="flex gap-2 items-start">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Badge className={getPhaseColor(project.current_phase)}>
                {project.current_phase}
              </Badge>
              <Badge className={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            <Link href={`/projects/${id}/settings`}>
              <Button variant="outline" size="sm" className="w-full">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {project.start_date
                ? new Date(project.start_date).toLocaleDateString()
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Target Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {project.target_completion_date
                ? new Date(project.target_completion_date).toLocaleDateString()
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Days Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {project.target_completion_date
                ? Math.ceil(
                    (new Date(project.target_completion_date).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {(() => {
        const charter = tools?.find((t) => t.tool_type === 'project_charter' && t.status === 'active')
        const charterVersions = tools?.filter((t) => t.tool_type === 'project_charter') || []
        return charter ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Project Charter</CardTitle>
                  <Badge variant="secondary">v{charter.version}</Badge>
                  {charterVersions.length > 1 && (
                    <span className="text-xs text-gray-500">
                      ({charterVersions.length} versions)
                    </span>
                  )}
                </div>
                <Link
                  href={`/projects/${id}/tools/charter`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {charter.data?.problem_statement && (
                <div>
                  <h3 className="font-semibold mb-2">Problem Statement</h3>
                  <p className="text-gray-700">{charter.data.problem_statement}</p>
                </div>
              )}
              {charter.data?.goal_statement && (
                <div>
                  <h3 className="font-semibold mb-2">Goal Statement</h3>
                  <p className="text-gray-700">{charter.data.goal_statement}</p>
                </div>
              )}
              {charter.data?.scope && (
                <div>
                  <h3 className="font-semibold mb-2">Scope</h3>
                  <p className="text-gray-700">{charter.data.scope}</p>
                </div>
              )}
              {charter.data?.business_case && (
                <div>
                  <h3 className="font-semibold mb-2">Business Case</h3>
                  <p className="text-gray-700">{charter.data.business_case}</p>
                </div>
              )}
              {charter.data?.team_members && (
                <div>
                  <h3 className="font-semibold mb-2">Team Members</h3>
                  <p className="text-gray-700 whitespace-pre-line">{charter.data.team_members}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null
      })()}

      <PhaseManager
        projectId={id}
        currentPhase={project.current_phase}
        phases={phases}
        tools={tools}
        metrics={metrics}
        onUpdate={loadProjectData}
      />
    </div>
  )
}
