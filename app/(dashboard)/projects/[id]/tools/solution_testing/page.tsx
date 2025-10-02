'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Trash2, Plus, Save, CheckCircle, XCircle } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface TestItem {
  solution_name: string
  test_objective: string
  test_method: string
  start_date: string
  end_date: string
  sample_size: string
  baseline_result: string
  test_result: string
  improvement_percentage: string
  status: 'planned' | 'in_progress' | 'completed' | 'failed'
  findings: string
  next_steps: string
}

interface SolutionTestingData {
  project_objective: string
  tests: TestItem[]
}

export default function SolutionTestingPage() {
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
  const [versions, setVersions] = useState<any[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [testingData, setTestingData] = useState<SolutionTestingData>({
    project_objective: '',
    tests: [
      {
        solution_name: '',
        test_objective: '',
        test_method: '',
        start_date: '',
        end_date: '',
        sample_size: '',
        baseline_result: '',
        test_result: '',
        improvement_percentage: '',
        status: 'planned',
        findings: '',
        next_steps: '',
      },
    ],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadTesting(parseInt(versionParam))
    } else {
      loadTesting()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'solution_testing')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadTesting = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'solution_testing')

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
        setTestingData(data.data)
        setCurrentVersion(data.version)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!testingData.project_objective.trim()) {
      setError('Please provide a project objective')
      setSaving(false)
      return
    }

    const cleanData = {
      project_objective: testingData.project_objective,
      tests: testingData.tests.filter((test) => test.solution_name.trim()),
    }

    if (cleanData.tests.length === 0) {
      setError('Please add at least one solution test')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'solution_testing')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v: any) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'solution_testing',
        tool_name: 'Solution Testing',
        phase: 'improve',
        data: cleanData,
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
      setError(err.message || 'Failed to save solution testing')
      setSaving(false)
    }
  }

  const addTest = () => {
    setTestingData((prev) => ({
      ...prev,
      tests: [
        ...prev.tests,
        {
          solution_name: '',
          test_objective: '',
          test_method: '',
          start_date: '',
          end_date: '',
          sample_size: '',
          baseline_result: '',
          test_result: '',
          improvement_percentage: '',
          status: 'planned',
          findings: '',
          next_steps: '',
        },
      ],
    }))
  }

  const removeTest = (index: number) => {
    setTestingData((prev) => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index),
    }))
  }

  const updateTest = (index: number, field: keyof TestItem, value: string) => {
    setTestingData((prev) => ({
      ...prev,
      tests: prev.tests.map((test, i) => (i === index ? { ...test, [field]: value } : test)),
    }))
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planned: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading solution testing...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="solution_testing"
        toolName="Solution Testing"
        phase="improve"
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
              {versions.map((v: any) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>
                      v{v.version}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">{v.version_notes || 'No notes'}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/projects/${projectId}/tools/solution_testing?version=${v.version}`}
                  >
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
                Solution Testing
                {viewingVersion && <Badge variant="secondary">Viewing v{viewingVersion}</Badge>}
              </CardTitle>
              <CardDescription>
                Pilot test and validate proposed improvements before full implementation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isViewingOldVersion && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <strong>Note:</strong> You are viewing an old version (v{viewingVersion}). To make
              changes, go back to the current version and save a new version.
            </div>
          )}

          <form onSubmit={handleSaveNewVersion} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project_objective">Project Objective *</Label>
              <Textarea
                id="project_objective"
                placeholder="What improvement are you testing?"
                value={testingData.project_objective}
                onChange={(e) =>
                  setTestingData({ ...testingData, project_objective: e.target.value })
                }
                disabled={isViewingOldVersion}
                rows={2}
                required
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Solution Tests</h3>
              {testingData.tests.map((test, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Test #{index + 1}</span>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status.replace('_', ' ')}
                        </Badge>
                        {test.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {test.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      </div>
                      {!isViewingOldVersion && testingData.tests.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTest(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`name-${index}`}>Solution Name *</Label>
                        <Input
                          id={`name-${index}`}
                          placeholder="e.g., New Assembly Process"
                          value={test.solution_name}
                          onChange={(e) => updateTest(index, 'solution_name', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`objective-${index}`}>Test Objective</Label>
                        <Textarea
                          id={`objective-${index}`}
                          placeholder="What are you trying to validate?"
                          value={test.test_objective}
                          onChange={(e) => updateTest(index, 'test_objective', e.target.value)}
                          rows={2}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`method-${index}`}>Test Method</Label>
                        <Textarea
                          id={`method-${index}`}
                          placeholder="How will you test this solution?"
                          value={test.test_method}
                          onChange={(e) => updateTest(index, 'test_method', e.target.value)}
                          rows={2}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`start-${index}`}>Start Date</Label>
                        <Input
                          id={`start-${index}`}
                          type="date"
                          value={test.start_date}
                          onChange={(e) => updateTest(index, 'start_date', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`end-${index}`}>End Date</Label>
                        <Input
                          id={`end-${index}`}
                          type="date"
                          value={test.end_date}
                          onChange={(e) => updateTest(index, 'end_date', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sample-${index}`}>Sample Size</Label>
                        <Input
                          id={`sample-${index}`}
                          placeholder="e.g., 100 units"
                          value={test.sample_size}
                          onChange={(e) => updateTest(index, 'sample_size', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`status-${index}`}>Status</Label>
                        <Select
                          value={test.status}
                          onValueChange={(value) => updateTest(index, 'status', value)}
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`baseline-${index}`}>Baseline Result</Label>
                        <Input
                          id={`baseline-${index}`}
                          placeholder="e.g., 45 minutes"
                          value={test.baseline_result}
                          onChange={(e) => updateTest(index, 'baseline_result', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`result-${index}`}>Test Result</Label>
                        <Input
                          id={`result-${index}`}
                          placeholder="e.g., 30 minutes"
                          value={test.test_result}
                          onChange={(e) => updateTest(index, 'test_result', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`improvement-${index}`}>Improvement %</Label>
                        <Input
                          id={`improvement-${index}`}
                          placeholder="e.g., 33%"
                          value={test.improvement_percentage}
                          onChange={(e) =>
                            updateTest(index, 'improvement_percentage', e.target.value)
                          }
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`findings-${index}`}>Findings</Label>
                        <Textarea
                          id={`findings-${index}`}
                          placeholder="Key observations and results"
                          value={test.findings}
                          onChange={(e) => updateTest(index, 'findings', e.target.value)}
                          rows={3}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`next-${index}`}>Next Steps</Label>
                        <Textarea
                          id={`next-${index}`}
                          placeholder="What should be done based on these results?"
                          value={test.next_steps}
                          onChange={(e) => updateTest(index, 'next_steps', e.target.value)}
                          rows={2}
                          disabled={isViewingOldVersion}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!isViewingOldVersion && (
              <Button type="button" variant="outline" onClick={addTest} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Solution Test
              </Button>
            )}

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
                    {saving
                      ? 'Saving...'
                      : versions.length > 0
                      ? 'Save as New Version'
                      : 'Save Testing'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/solution_testing`}>
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
