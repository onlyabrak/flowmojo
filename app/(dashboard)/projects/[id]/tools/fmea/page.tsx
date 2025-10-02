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
import { Trash2, Plus, Save, AlertTriangle } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface FMEAItem {
  process_step: string
  potential_failure: string
  effects: string
  severity: number // 1-10
  causes: string
  occurrence: number // 1-10
  current_controls: string
  detection: number // 1-10
  rpn: number // Severity × Occurrence × Detection
  recommended_actions: string
}

interface FMEAData {
  process_name: string
  items: FMEAItem[]
}

interface FMEAVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function FMEAPage() {
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
  const [versions, setVersions] = useState<FMEAVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [fmeaData, setFmeaData] = useState<FMEAData>({
    process_name: '',
    items: [
      {
        process_step: '',
        potential_failure: '',
        effects: '',
        severity: 1,
        causes: '',
        occurrence: 1,
        current_controls: '',
        detection: 1,
        rpn: 1,
        recommended_actions: '',
      },
    ],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadFMEA(parseInt(versionParam))
    } else {
      loadFMEA()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'fmea')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadFMEA = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'fmea')

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
        setFmeaData(data.data)
        setCurrentVersion(data.version)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateRPN = (severity: number, occurrence: number, detection: number) => {
    return severity * occurrence * detection
  }

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!fmeaData.process_name.trim()) {
      setError('Please provide a process name')
      setSaving(false)
      return
    }

    const cleanData = {
      process_name: fmeaData.process_name,
      items: fmeaData.items.filter(
        (item) => item.process_step.trim() && item.potential_failure.trim()
      ),
    }

    if (cleanData.items.length === 0) {
      setError('Please add at least one failure mode')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'fmea')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'fmea',
        tool_name: 'FMEA',
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
      setError(err.message || 'Failed to save FMEA')
      setSaving(false)
    }
  }

  const addItem = () => {
    setFmeaData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          process_step: '',
          potential_failure: '',
          effects: '',
          severity: 1,
          causes: '',
          occurrence: 1,
          current_controls: '',
          detection: 1,
          rpn: 1,
          recommended_actions: '',
        },
      ],
    }))
  }

  const removeItem = (index: number) => {
    setFmeaData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const updateItem = (index: number, field: keyof FMEAItem, value: string | number) => {
    setFmeaData((prev) => {
      const newItems = prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          // Recalculate RPN when S, O, or D changes
          if (field === 'severity' || field === 'occurrence' || field === 'detection') {
            updated.rpn = calculateRPN(updated.severity, updated.occurrence, updated.detection)
          }
          return updated
        }
        return item
      })
      return { ...prev, items: newItems }
    })
  }

  const getRPNColor = (rpn: number) => {
    if (rpn >= 200) return 'bg-red-100 text-red-800 border-red-300'
    if (rpn >= 100) return 'bg-orange-100 text-orange-800 border-orange-300'
    if (rpn >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading FMEA...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="fmea"
        toolName="FMEA"
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
                  <Link href={`/projects/${projectId}/tools/fmea?version=${v.version}`}>
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
                FMEA (Failure Mode and Effects Analysis)
                {viewingVersion && <Badge variant="secondary">Viewing v{viewingVersion}</Badge>}
              </CardTitle>
              <CardDescription>
                Identify and prioritize potential failures to prevent problems before they occur
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
              <Label htmlFor="process_name">Process Name *</Label>
              <Input
                id="process_name"
                placeholder="e.g., Product Assembly Process"
                value={fmeaData.process_name}
                onChange={(e) => setFmeaData({ ...fmeaData, process_name: e.target.value })}
                disabled={isViewingOldVersion}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Failure Modes</h3>
                <div className="text-xs text-gray-600">
                  RPN = Severity × Occurrence × Detection (Range: 1-1000)
                </div>
              </div>

              {fmeaData.items.map((item, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Failure Mode #{index + 1}</span>
                        <Badge className={`${getRPNColor(item.rpn)} border`}>
                          RPN: {item.rpn}
                          {item.rpn >= 200 && <AlertTriangle className="h-3 w-3 ml-1" />}
                        </Badge>
                      </div>
                      {!isViewingOldVersion && fmeaData.items.length > 1 && (
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
                        <Label htmlFor={`step-${index}`}>Process Step *</Label>
                        <Input
                          id={`step-${index}`}
                          placeholder="e.g., Welding component"
                          value={item.process_step}
                          onChange={(e) => updateItem(index, 'process_step', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`failure-${index}`}>Potential Failure Mode *</Label>
                        <Input
                          id={`failure-${index}`}
                          placeholder="e.g., Weak weld"
                          value={item.potential_failure}
                          onChange={(e) => updateItem(index, 'potential_failure', e.target.value)}
                          disabled={isViewingOldVersion}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`effects-${index}`}>Effects of Failure</Label>
                      <Textarea
                        id={`effects-${index}`}
                        placeholder="What happens if this failure occurs?"
                        value={item.effects}
                        onChange={(e) => updateItem(index, 'effects', e.target.value)}
                        rows={2}
                        disabled={isViewingOldVersion}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`severity-${index}`}>Severity (1-10)</Label>
                        <Select
                          value={item.severity.toString()}
                          onValueChange={(value) =>
                            updateItem(index, 'severity', parseInt(value))
                          }
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} - {num <= 3 ? 'Minor' : num <= 7 ? 'Moderate' : 'Critical'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`occurrence-${index}`}>Occurrence (1-10)</Label>
                        <Select
                          value={item.occurrence.toString()}
                          onValueChange={(value) =>
                            updateItem(index, 'occurrence', parseInt(value))
                          }
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} - {num <= 3 ? 'Rare' : num <= 7 ? 'Occasional' : 'Frequent'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`detection-${index}`}>Detection (1-10)</Label>
                        <Select
                          value={item.detection.toString()}
                          onValueChange={(value) =>
                            updateItem(index, 'detection', parseInt(value))
                          }
                          disabled={isViewingOldVersion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} - {num <= 3 ? 'High' : num <= 7 ? 'Medium' : 'Low'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`causes-${index}`}>Potential Causes</Label>
                      <Textarea
                        id={`causes-${index}`}
                        placeholder="What could cause this failure?"
                        value={item.causes}
                        onChange={(e) => updateItem(index, 'causes', e.target.value)}
                        rows={2}
                        disabled={isViewingOldVersion}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`controls-${index}`}>Current Controls</Label>
                      <Textarea
                        id={`controls-${index}`}
                        placeholder="What controls are currently in place?"
                        value={item.current_controls}
                        onChange={(e) => updateItem(index, 'current_controls', e.target.value)}
                        rows={2}
                        disabled={isViewingOldVersion}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`actions-${index}`}>Recommended Actions</Label>
                      <Textarea
                        id={`actions-${index}`}
                        placeholder="What actions should be taken to reduce risk?"
                        value={item.recommended_actions}
                        onChange={(e) => updateItem(index, 'recommended_actions', e.target.value)}
                        rows={2}
                        disabled={isViewingOldVersion}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!isViewingOldVersion && (
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Failure Mode
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
                    {saving ? 'Saving...' : versions.length > 0 ? 'Save as New Version' : 'Save FMEA'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/fmea`}>
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
