'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Save } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface CharterVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function ProjectCharterPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const versionParam = searchParams.get('version')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentVersion, setCurrentVersion] = useState<number>(1)
  const [versions, setVersions] = useState<CharterVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    problem_statement: '',
    goal_statement: '',
    scope: '',
    business_case: '',
    team_members: '',
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadCharter(parseInt(versionParam))
    } else {
      loadCharter()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'project_charter')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadCharter = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'project_charter')

      if (version) {
        query = query.eq('version', version)
        setViewingVersion(version)
      } else {
        query = query.eq('status', 'active').order('version', { ascending: false }).limit(1)
        setViewingVersion(null)
      }

      const { data, error } = await query.maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (data?.data) {
        setFormData(data.data)
        setCurrentVersion(data.version)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Mark all existing active versions as archived
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'project_charter')
        .eq('status', 'active')

      // Create new version
      const newVersion = Math.max(...versions.map(v => v.version), 0) + 1
      const { error } = await supabase
        .from('tools')
        .insert({
          project_id: projectId,
          tool_type: 'project_charter',
          tool_name: 'Project Charter',
          phase: 'define',
          data: formData,
          version: newVersion,
          status: 'active',
          version_notes: versionNotes || null,
        })

      if (error) throw error

      setVersionNotes('')
      await loadVersions()
      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save charter')
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">Loading charter...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-4xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="charter"
        toolName="Project Charter"
        phase="define"
        currentVersion={currentVersion}
        versionsCount={versions.length}
        onShowVersions={() => setShowVersions(!showVersions)}
      />

      {showVersions && versions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Version History</CardTitle>
            <CardDescription>View and restore previous versions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>
                      v{v.version}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">
                        {v.version_notes || 'No notes'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Link href={`/projects/${projectId}/tools/charter?version=${v.version}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Project Charter
                {viewingVersion && (
                  <Badge variant="secondary">Viewing v{viewingVersion}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Define the problem, goals, scope, and business case for this project
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isViewingOldVersion && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <strong>Note:</strong> You are viewing an old version (v{viewingVersion}).
              To make changes, go back to the current version and save a new version.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="problem_statement">Problem Statement *</Label>
              <Textarea
                id="problem_statement"
                placeholder="What problem are you trying to solve? Include current state and impact."
                value={formData.problem_statement}
                onChange={(e) => handleChange('problem_statement', e.target.value)}
                rows={5}
                required
                disabled={isViewingOldVersion}
              />
              <p className="text-xs text-gray-500">
                Describe the current problem, its impact on the business, and why it needs to be solved.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal_statement">Goal Statement *</Label>
              <Textarea
                id="goal_statement"
                placeholder="What do you want to achieve? Be specific and measurable."
                value={formData.goal_statement}
                onChange={(e) => handleChange('goal_statement', e.target.value)}
                rows={5}
                required
                disabled={isViewingOldVersion}
              />
              <p className="text-xs text-gray-500">
                Define your target improvement with specific, measurable goals (e.g., "Reduce wait time by 30% from 10 minutes to 7 minutes").
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope *</Label>
              <Textarea
                id="scope"
                placeholder="What is included and excluded from this project?"
                value={formData.scope}
                onChange={(e) => handleChange('scope', e.target.value)}
                rows={5}
                required
                disabled={isViewingOldVersion}
              />
              <p className="text-xs text-gray-500">
                Define boundaries: what processes, departments, or areas are in scope and out of scope.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_case">Business Case</Label>
              <Textarea
                id="business_case"
                placeholder="Why is this project important? What are the expected benefits?"
                value={formData.business_case}
                onChange={(e) => handleChange('business_case', e.target.value)}
                rows={4}
                disabled={isViewingOldVersion}
              />
              <p className="text-xs text-gray-500">
                Explain the business justification, expected ROI, or strategic alignment.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_members">Team Members & Roles</Label>
              <Textarea
                id="team_members"
                placeholder="List team members and their roles (e.g., Project Lead: John Doe, Data Analyst: Jane Smith)"
                value={formData.team_members}
                onChange={(e) => handleChange('team_members', e.target.value)}
                rows={4}
                disabled={isViewingOldVersion}
              />
            </div>

            {!isViewingOldVersion && (
              <div className="space-y-2">
                <Label htmlFor="version_notes">Version Notes (Optional)</Label>
                <Textarea
                  id="version_notes"
                  placeholder="What changed in this version?"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              {!isViewingOldVersion ? (
                <>
                  <Button type="submit" disabled={saving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : versions.length > 0 ? 'Save as New Version' : 'Save Charter'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/charter`}>
                    Return to Current Version
                  </Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
