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

interface VOCItem {
  customer_segment: string
  need: string
  pain_point: string
  current_state: string
  desired_state: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface VOCData {
  items: VOCItem[]
}

interface VOCVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function VOCPage() {
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
  const [versions, setVersions] = useState<VOCVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [vocData, setVocData] = useState<VOCData>({
    items: [
      {
        customer_segment: '',
        need: '',
        pain_point: '',
        current_state: '',
        desired_state: '',
        priority: 'medium',
      },
    ],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadVOC(parseInt(versionParam))
    } else {
      loadVOC()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'voc')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadVOC = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'voc')

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
        setVocData(data.data)
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
      items: vocData.items.filter(
        (item) =>
          item.customer_segment.trim() ||
          item.need.trim() ||
          item.pain_point.trim() ||
          item.current_state.trim() ||
          item.desired_state.trim()
      ),
    }

    if (cleanData.items.length === 0) {
      setError('Please add at least one Voice of Customer item')
      setSaving(false)
      return
    }

    try {
      // Mark all existing active versions as archived
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'voc')
        .eq('status', 'active')

      // Create new version
      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'voc',
        tool_name: 'Voice of Customer',
        phase: 'define',
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
      setError(err.message || 'Failed to save VOC')
      setSaving(false)
    }
  }

  const addItem = () => {
    setVocData((prev) => ({
      items: [
        ...prev.items,
        {
          customer_segment: '',
          need: '',
          pain_point: '',
          current_state: '',
          desired_state: '',
          priority: 'medium',
        },
      ],
    }))
  }

  const removeItem = (index: number) => {
    setVocData((prev) => ({
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const updateItem = (index: number, field: keyof VOCItem, value: string) => {
    setVocData((prev) => ({
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading Voice of Customer...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="voc"
        toolName="Voice of Customer"
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
                  <Link href={`/projects/${projectId}/tools/voc?version=${v.version}`}>
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
                Voice of Customer
                {viewingVersion && (
                  <Badge variant="secondary">Viewing v{viewingVersion}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Capture customer needs, pain points, and requirements
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

          <form onSubmit={handleSaveNewVersion} className="space-y-6">
            {/* VOC Items */}
            <div className="space-y-4">
              {vocData.items.map((item, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Customer Voice #{index + 1}</CardTitle>
                      {!isViewingOldVersion && vocData.items.length > 1 && (
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
                        <Label htmlFor={`segment-${index}`}>Customer Segment *</Label>
                        <Input
                          id={`segment-${index}`}
                          placeholder="e.g., Enterprise Customers, End Users"
                          value={item.customer_segment}
                          onChange={(e) =>
                            updateItem(index, 'customer_segment', e.target.value)
                          }
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`priority-${index}`}>Priority *</Label>
                        <Select
                          value={item.priority}
                          onValueChange={(value) =>
                            updateItem(index, 'priority', value)
                          }
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`need-${index}`}>Customer Need/Requirement *</Label>
                      <Textarea
                        id={`need-${index}`}
                        placeholder="What does the customer need or want?"
                        value={item.need}
                        onChange={(e) => updateItem(index, 'need', e.target.value)}
                        rows={2}
                        disabled={isViewingOldVersion}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`pain-${index}`}>Pain Point</Label>
                      <Textarea
                        id={`pain-${index}`}
                        placeholder="What problem or frustration does the customer experience?"
                        value={item.pain_point}
                        onChange={(e) => updateItem(index, 'pain_point', e.target.value)}
                        rows={2}
                        disabled={isViewingOldVersion}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`current-${index}`}>Current State</Label>
                        <Textarea
                          id={`current-${index}`}
                          placeholder="How is it done today?"
                          value={item.current_state}
                          onChange={(e) =>
                            updateItem(index, 'current_state', e.target.value)
                          }
                          rows={2}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`desired-${index}`}>Desired State</Label>
                        <Textarea
                          id={`desired-${index}`}
                          placeholder="What would the ideal solution look like?"
                          value={item.desired_state}
                          onChange={(e) =>
                            updateItem(index, 'desired_state', e.target.value)
                          }
                          rows={2}
                          disabled={isViewingOldVersion}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority.toUpperCase()} Priority
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!isViewingOldVersion && (
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer Voice
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
                    {saving ? 'Saving...' : versions.length > 0 ? 'Save as New Version' : 'Save VOC'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/voc`}>
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
