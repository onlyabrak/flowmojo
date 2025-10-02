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
import { Trash2, Plus, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface MetricItem {
  metric_name: string
  baseline_value: string
  target_value: string
  unit: string
  measurement_method: string
  frequency: string
  notes: string
}

interface BaselineMetricsData {
  metrics: MetricItem[]
}

interface MetricsVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function BaselineMetricsPage() {
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
  const [versions, setVersions] = useState<MetricsVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [metricsData, setMetricsData] = useState<BaselineMetricsData>({
    metrics: [
      {
        metric_name: '',
        baseline_value: '',
        target_value: '',
        unit: '',
        measurement_method: '',
        frequency: 'daily',
        notes: '',
      },
    ],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadMetrics(parseInt(versionParam))
    } else {
      loadMetrics()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'baseline_metrics')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadMetrics = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'baseline_metrics')

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
        setMetricsData(data.data)
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
      metrics: metricsData.metrics.filter(
        (item) => item.metric_name.trim() && item.baseline_value.trim()
      ),
    }

    if (cleanData.metrics.length === 0) {
      setError('Please add at least one metric')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'baseline_metrics')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'baseline_metrics',
        tool_name: 'Baseline Metrics',
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
      setError(err.message || 'Failed to save metrics')
      setSaving(false)
    }
  }

  const addMetric = () => {
    setMetricsData((prev) => ({
      metrics: [
        ...prev.metrics,
        {
          metric_name: '',
          baseline_value: '',
          target_value: '',
          unit: '',
          measurement_method: '',
          frequency: 'daily',
          notes: '',
        },
      ],
    }))
  }

  const removeMetric = (index: number) => {
    setMetricsData((prev) => ({
      metrics: prev.metrics.filter((_, i) => i !== index),
    }))
  }

  const updateMetric = (index: number, field: keyof MetricItem, value: string) => {
    setMetricsData((prev) => ({
      metrics: prev.metrics.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const getImprovementDirection = (baseline: string, target: string) => {
    const baseNum = parseFloat(baseline)
    const targetNum = parseFloat(target)
    if (isNaN(baseNum) || isNaN(targetNum)) return null
    if (targetNum > baseNum) return 'up'
    if (targetNum < baseNum) return 'down'
    return 'same'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading baseline metrics...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="baseline_metrics"
        toolName="Baseline Metrics"
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
                      <div className="text-sm font-medium">
                        {v.version_notes || 'No notes'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Link href={`/projects/${projectId}/tools/baseline_metrics?version=${v.version}`}>
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
                Baseline Metrics
                {viewingVersion && (
                  <Badge variant="secondary">Viewing v{viewingVersion}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Establish current performance levels and improvement targets
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
            <div className="space-y-4">
              {metricsData.metrics.map((metric, index) => {
                const direction = getImprovementDirection(metric.baseline_value, metric.target_value)
                return (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Metric #{index + 1}</CardTitle>
                        {!isViewingOldVersion && metricsData.metrics.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMetric(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`name-${index}`}>Metric Name *</Label>
                          <Input
                            id={`name-${index}`}
                            placeholder="e.g., Cycle Time, Defect Rate, Customer Satisfaction"
                            value={metric.metric_name}
                            onChange={(e) => updateMetric(index, 'metric_name', e.target.value)}
                            disabled={isViewingOldVersion}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`baseline-${index}`}>Baseline Value *</Label>
                          <Input
                            id={`baseline-${index}`}
                            placeholder="Current performance"
                            value={metric.baseline_value}
                            onChange={(e) => updateMetric(index, 'baseline_value', e.target.value)}
                            disabled={isViewingOldVersion}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`target-${index}`}>Target Value</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`target-${index}`}
                              placeholder="Goal performance"
                              value={metric.target_value}
                              onChange={(e) => updateMetric(index, 'target_value', e.target.value)}
                              disabled={isViewingOldVersion}
                            />
                            {direction && (
                              <div className="flex items-center">
                                {direction === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
                                {direction === 'down' && <TrendingDown className="h-5 w-5 text-red-600" />}
                                {direction === 'same' && <Minus className="h-5 w-5 text-gray-600" />}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`unit-${index}`}>Unit of Measure *</Label>
                          <Input
                            id={`unit-${index}`}
                            placeholder="e.g., hours, %, count"
                            value={metric.unit}
                            onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                            disabled={isViewingOldVersion}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`frequency-${index}`}>Measurement Frequency</Label>
                          <Select
                            value={metric.frequency}
                            onValueChange={(value) => updateMetric(index, 'frequency', value)}
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
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`method-${index}`}>Measurement Method</Label>
                          <Input
                            id={`method-${index}`}
                            placeholder="How will you measure this?"
                            value={metric.measurement_method}
                            onChange={(e) => updateMetric(index, 'measurement_method', e.target.value)}
                            disabled={isViewingOldVersion}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`notes-${index}`}>Notes</Label>
                          <Textarea
                            id={`notes-${index}`}
                            placeholder="Additional context or important details"
                            value={metric.notes}
                            onChange={(e) => updateMetric(index, 'notes', e.target.value)}
                            rows={2}
                            disabled={isViewingOldVersion}
                          />
                        </div>
                      </div>

                      {metric.baseline_value && metric.target_value && metric.unit && (
                        <div className="pt-2 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Current:</span>
                            <Badge variant="outline">{metric.baseline_value} {metric.unit}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Target:</span>
                            <Badge variant="outline">{metric.target_value} {metric.unit}</Badge>
                          </div>
                          {direction !== 'same' && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Improvement:</span>
                              <Badge className={direction === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {Math.abs(parseFloat(metric.target_value) - parseFloat(metric.baseline_value)).toFixed(2)} {metric.unit}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {!isViewingOldVersion && (
              <Button type="button" variant="outline" onClick={addMetric} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
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
                    {saving ? 'Saving...' : versions.length > 0 ? 'Save as New Version' : 'Save Metrics'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/baseline_metrics`}>
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
