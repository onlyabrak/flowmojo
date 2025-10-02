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
import { Trash2, Plus, Save, ArrowDown, Circle, Square, Diamond } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface ProcessStep {
  step_number: number
  step_type: 'process' | 'decision' | 'start_end' | 'delay'
  step_name: string
  description: string
  responsible_party: string
  duration: string
  notes: string
}

interface ProcessMapData {
  process_name: string
  steps: ProcessStep[]
}

interface MapVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function ProcessMapPage() {
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
  const [versions, setVersions] = useState<MapVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [mapData, setMapData] = useState<ProcessMapData>({
    process_name: '',
    steps: [
      {
        step_number: 1,
        step_type: 'start_end',
        step_name: 'Start',
        description: '',
        responsible_party: '',
        duration: '',
        notes: '',
      },
    ],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadMap(parseInt(versionParam))
    } else {
      loadMap()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'process_map')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadMap = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'process_map')

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
        setMapData(data.data)
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

    if (!mapData.process_name.trim()) {
      setError('Please provide a process name')
      setSaving(false)
      return
    }

    const cleanData = {
      process_name: mapData.process_name,
      steps: mapData.steps.filter((step) => step.step_name.trim()),
    }

    if (cleanData.steps.length === 0) {
      setError('Please add at least one process step')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'process_map')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'process_map',
        tool_name: 'Process Map',
        phase: 'measure',
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
      setError(err.message || 'Failed to save process map')
      setSaving(false)
    }
  }

  const addStep = () => {
    const newStepNumber = Math.max(...mapData.steps.map((s) => s.step_number), 0) + 1
    setMapData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          step_number: newStepNumber,
          step_type: 'process',
          step_name: '',
          description: '',
          responsible_party: '',
          duration: '',
          notes: '',
        },
      ],
    }))
  }

  const removeStep = (index: number) => {
    setMapData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }))
  }

  const updateStep = (index: number, field: keyof ProcessStep, value: string | number) => {
    setMapData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    }))
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'process':
        return <Square className="h-8 w-8 text-blue-600" />
      case 'decision':
        return <Diamond className="h-8 w-8 text-orange-600" />
      case 'start_end':
        return <Circle className="h-8 w-8 text-green-600" />
      case 'delay':
        return <Circle className="h-8 w-8 text-red-600" />
      default:
        return <Square className="h-8 w-8 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">Loading process map...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-4xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="process_map"
        toolName="Process Map"
        phase="measure"
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
                      <div className="text-sm font-medium">{v.version_notes || 'No notes'}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Link href={`/projects/${projectId}/tools/process_map?version=${v.version}`}>
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
                Process Map
                {viewingVersion && <Badge variant="secondary">Viewing v{viewingVersion}</Badge>}
              </CardTitle>
              <CardDescription>Detailed flowchart of the current process</CardDescription>
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
              <Label htmlFor="process_name">Process Name *</Label>
              <Input
                id="process_name"
                placeholder="e.g., Order Fulfillment Process"
                value={mapData.process_name}
                onChange={(e) => setMapData({ ...mapData, process_name: e.target.value })}
                disabled={isViewingOldVersion}
                required
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Process Steps</h3>
              {mapData.steps.map((step, index) => (
                <div key={index}>
                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
                            {getStepIcon(step.step_type)}
                          </div>
                          <span className="text-xs font-semibold text-gray-500">
                            Step {step.step_number}
                          </span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`step-name-${index}`}>Step Name *</Label>
                              <Input
                                id={`step-name-${index}`}
                                placeholder="e.g., Receive Order"
                                value={step.step_name}
                                onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                                disabled={isViewingOldVersion}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`step-type-${index}`}>Step Type *</Label>
                              <Select
                                value={step.step_type}
                                onValueChange={(value) => updateStep(index, 'step_type', value)}
                                disabled={isViewingOldVersion}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="start_end">Start/End</SelectItem>
                                  <SelectItem value="process">Process/Activity</SelectItem>
                                  <SelectItem value="decision">Decision Point</SelectItem>
                                  <SelectItem value="delay">Delay/Wait</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`description-${index}`}>Description</Label>
                            <Textarea
                              id={`description-${index}`}
                              placeholder="What happens in this step?"
                              value={step.description}
                              onChange={(e) => updateStep(index, 'description', e.target.value)}
                              rows={2}
                              disabled={isViewingOldVersion}
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`responsible-${index}`}>Responsible Party</Label>
                              <Input
                                id={`responsible-${index}`}
                                placeholder="Who performs this?"
                                value={step.responsible_party}
                                onChange={(e) =>
                                  updateStep(index, 'responsible_party', e.target.value)
                                }
                                disabled={isViewingOldVersion}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`duration-${index}`}>Duration</Label>
                              <Input
                                id={`duration-${index}`}
                                placeholder="e.g., 5 minutes"
                                value={step.duration}
                                onChange={(e) => updateStep(index, 'duration', e.target.value)}
                                disabled={isViewingOldVersion}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`notes-${index}`}>Notes</Label>
                            <Textarea
                              id={`notes-${index}`}
                              placeholder="Additional details, issues, or observations"
                              value={step.notes}
                              onChange={(e) => updateStep(index, 'notes', e.target.value)}
                              rows={2}
                              disabled={isViewingOldVersion}
                            />
                          </div>
                        </div>

                        {!isViewingOldVersion && mapData.steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {index < mapData.steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isViewingOldVersion && (
              <Button type="button" variant="outline" onClick={addStep} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Process Step
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
                    {saving ? 'Saving...' : versions.length > 0 ? 'Save as New Version' : 'Save Map'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/process_map`}>
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
