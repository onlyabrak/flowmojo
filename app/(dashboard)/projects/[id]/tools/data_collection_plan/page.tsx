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
import { Trash2, Plus, Save } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface DataCollectionItem {
  data_element: string
  definition: string
  data_type: string
  collection_method: string
  data_source: string
  responsible_person: string
  frequency: string
  sample_size: string
  tools_required: string
}

interface DataCollectionPlanData {
  items: DataCollectionItem[]
}

interface PlanVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function DataCollectionPlanPage() {
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
  const [versions, setVersions] = useState<PlanVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [planData, setPlanData] = useState<DataCollectionPlanData>({
    items: [
      {
        data_element: '',
        definition: '',
        data_type: 'continuous',
        collection_method: '',
        data_source: '',
        responsible_person: '',
        frequency: 'daily',
        sample_size: '',
        tools_required: '',
      },
    ],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadPlan(parseInt(versionParam))
    } else {
      loadPlan()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'data_collection_plan')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadPlan = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'data_collection_plan')

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
        setPlanData(data.data)
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

    const cleanData = {
      items: planData.items.filter((item) => item.data_element.trim() && item.definition.trim()),
    }

    if (cleanData.items.length === 0) {
      setError('Please add at least one data collection item')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'data_collection_plan')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'data_collection_plan',
        tool_name: 'Data Collection Plan',
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
      setError(err.message || 'Failed to save data collection plan')
      setSaving(false)
    }
  }

  const addItem = () => {
    setPlanData((prev) => ({
      items: [
        ...prev.items,
        {
          data_element: '',
          definition: '',
          data_type: 'continuous',
          collection_method: '',
          data_source: '',
          responsible_person: '',
          frequency: 'daily',
          sample_size: '',
          tools_required: '',
        },
      ],
    }))
  }

  const removeItem = (index: number) => {
    setPlanData((prev) => ({
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const updateItem = (index: number, field: keyof DataCollectionItem, value: string) => {
    setPlanData((prev) => ({
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading data collection plan...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="data_collection_plan"
        toolName="Data Collection Plan"
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
                  <Link
                    href={`/projects/${projectId}/tools/data_collection_plan?version=${v.version}`}
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
                Data Collection Plan
                {viewingVersion && <Badge variant="secondary">Viewing v{viewingVersion}</Badge>}
              </CardTitle>
              <CardDescription>
                Plan what, when, where, and how to collect data for analysis
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
            <div className="space-y-4">
              {planData.items.map((item, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Data Element #{index + 1}</CardTitle>
                      {!isViewingOldVersion && planData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`element-${index}`}>Data Element / Metric *</Label>
                        <Input
                          id={`element-${index}`}
                          placeholder="e.g., Cycle Time, Defect Count"
                          value={item.data_element}
                          onChange={(e) => updateItem(index, 'data_element', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`type-${index}`}>Data Type *</Label>
                        <Select
                          value={item.data_type}
                          onValueChange={(value) => updateItem(index, 'data_type', value)}
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="continuous">Continuous (measurable)</SelectItem>
                            <SelectItem value="discrete">Discrete (countable)</SelectItem>
                            <SelectItem value="attribute">Attribute (pass/fail)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`definition-${index}`}>Operational Definition *</Label>
                        <Textarea
                          id={`definition-${index}`}
                          placeholder="Clear definition of what and how to measure"
                          value={item.definition}
                          onChange={(e) => updateItem(index, 'definition', e.target.value)}
                          rows={2}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`method-${index}`}>Collection Method</Label>
                        <Input
                          id={`method-${index}`}
                          placeholder="e.g., Manual observation, System log"
                          value={item.collection_method}
                          onChange={(e) => updateItem(index, 'collection_method', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`source-${index}`}>Data Source</Label>
                        <Input
                          id={`source-${index}`}
                          placeholder="e.g., CRM system, Production database"
                          value={item.data_source}
                          onChange={(e) => updateItem(index, 'data_source', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`responsible-${index}`}>Responsible Person</Label>
                        <Input
                          id={`responsible-${index}`}
                          placeholder="Who will collect this data?"
                          value={item.responsible_person}
                          onChange={(e) => updateItem(index, 'responsible_person', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`frequency-${index}`}>Collection Frequency</Label>
                        <Select
                          value={item.frequency}
                          onValueChange={(value) => updateItem(index, 'frequency', value)}
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sample-${index}`}>Sample Size</Label>
                        <Input
                          id={`sample-${index}`}
                          placeholder="e.g., 100 units, All transactions"
                          value={item.sample_size}
                          onChange={(e) => updateItem(index, 'sample_size', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`tools-${index}`}>Tools/Equipment Required</Label>
                        <Input
                          id={`tools-${index}`}
                          placeholder="e.g., Timer, Measuring tape, Software"
                          value={item.tools_required}
                          onChange={(e) => updateItem(index, 'tools_required', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2 flex-wrap">
                      <Badge
                        className={
                          item.data_type === 'continuous'
                            ? 'bg-blue-100 text-blue-800'
                            : item.data_type === 'discrete'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }
                      >
                        {item.data_type}
                      </Badge>
                      {item.frequency && (
                        <Badge variant="outline" className="capitalize">
                          {item.frequency}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!isViewingOldVersion && (
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Data Element
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
                      : 'Save Plan'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/data_collection_plan`}>
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
