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
import Link from 'next/link'
import { Trash2, Plus, Save, TrendingUp } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface ParetoItem {
  category: string
  frequency: number
  description: string
}

interface ParetoData {
  analysis_title: string
  items: ParetoItem[]
}

interface ParetoVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function ParetoPage() {
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
  const [versions, setVersions] = useState<ParetoVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [paretoData, setParetoData] = useState<ParetoData>({
    analysis_title: '',
    items: [{ category: '', frequency: 0, description: '' }],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadPareto(parseInt(versionParam))
    } else {
      loadPareto()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'pareto')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadPareto = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'pareto')

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
        setParetoData(data.data)
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

    if (!paretoData.analysis_title.trim()) {
      setError('Please provide an analysis title')
      setSaving(false)
      return
    }

    const cleanData = {
      analysis_title: paretoData.analysis_title,
      items: paretoData.items.filter((item) => item.category.trim() && item.frequency > 0),
    }

    if (cleanData.items.length === 0) {
      setError('Please add at least one category with frequency')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'pareto')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'pareto',
        tool_name: 'Pareto Chart',
        phase: 'analyze',
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
      setError(err.message || 'Failed to save Pareto chart')
      setSaving(false)
    }
  }

  const addItem = () => {
    setParetoData((prev) => ({
      ...prev,
      items: [...prev.items, { category: '', frequency: 0, description: '' }],
    }))
  }

  const removeItem = (index: number) => {
    setParetoData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const updateItem = (index: number, field: keyof ParetoItem, value: string | number) => {
    setParetoData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const calculateStatistics = () => {
    const sortedItems = [...paretoData.items]
      .filter((item) => item.category.trim() && item.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency)

    const totalFrequency = sortedItems.reduce((sum, item) => sum + item.frequency, 0)

    let cumulativePercentage = 0
    const itemsWithStats = sortedItems.map((item) => {
      const percentage = (item.frequency / totalFrequency) * 100
      cumulativePercentage += percentage
      return {
        ...item,
        percentage: percentage.toFixed(1),
        cumulativePercentage: cumulativePercentage.toFixed(1),
        isVitalFew: cumulativePercentage <= 80,
      }
    })

    return { itemsWithStats, totalFrequency }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading Pareto chart...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion
  const { itemsWithStats, totalFrequency } = calculateStatistics()

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="pareto"
        toolName="Pareto Chart"
        phase="analyze"
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
                  <Link href={`/projects/${projectId}/tools/pareto?version=${v.version}`}>
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
                Pareto Chart (80/20 Analysis)
                {viewingVersion && <Badge variant="secondary">Viewing v{viewingVersion}</Badge>}
              </CardTitle>
              <CardDescription>
                Identify the vital few causes that contribute to 80% of problems
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
              <Label htmlFor="analysis_title">Analysis Title *</Label>
              <Input
                id="analysis_title"
                placeholder="e.g., Defect Types Analysis, Customer Complaints"
                value={paretoData.analysis_title}
                onChange={(e) =>
                  setParetoData({ ...paretoData, analysis_title: e.target.value })
                }
                disabled={isViewingOldVersion}
                required
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Categories and Frequencies</h3>
              {paretoData.items.map((item, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-semibold text-gray-600">
                        {index + 1}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`category-${index}`}>Category *</Label>
                            <Input
                              id={`category-${index}`}
                              placeholder="e.g., Defect Type, Complaint Category"
                              value={item.category}
                              onChange={(e) => updateItem(index, 'category', e.target.value)}
                              disabled={isViewingOldVersion}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`frequency-${index}`}>Frequency (Count) *</Label>
                            <Input
                              id={`frequency-${index}`}
                              type="number"
                              min="0"
                              placeholder="Number of occurrences"
                              value={item.frequency || ''}
                              onChange={(e) =>
                                updateItem(index, 'frequency', parseInt(e.target.value) || 0)
                              }
                              disabled={isViewingOldVersion}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`description-${index}`}>Description</Label>
                          <Textarea
                            id={`description-${index}`}
                            placeholder="Additional details about this category"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            rows={2}
                            disabled={isViewingOldVersion}
                          />
                        </div>
                      </div>

                      {!isViewingOldVersion && paretoData.items.length > 1 && (
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
                  </CardContent>
                </Card>
              ))}
            </div>

            {!isViewingOldVersion && (
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}

            {/* Pareto Analysis Results */}
            {itemsWithStats.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Pareto Analysis Results
                  </CardTitle>
                  <CardDescription>
                    Categories sorted by frequency with cumulative percentages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold border-b pb-2">
                      <span className="flex-1">Category</span>
                      <span className="w-20 text-right">Count</span>
                      <span className="w-20 text-right">%</span>
                      <span className="w-24 text-right">Cumulative</span>
                      <span className="w-24 text-right">80/20</span>
                    </div>
                    {itemsWithStats.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between text-sm p-2 rounded ${
                          item.isVitalFew ? 'bg-green-100 font-medium' : 'bg-white'
                        }`}
                      >
                        <span className="flex-1 truncate">{item.category}</span>
                        <span className="w-20 text-right">{item.frequency}</span>
                        <span className="w-20 text-right">{item.percentage}%</span>
                        <span className="w-24 text-right">{item.cumulativePercentage}%</span>
                        <span className="w-24 text-right">
                          {item.isVitalFew && (
                            <Badge className="bg-green-600 text-white text-xs">Vital Few</Badge>
                          )}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm font-bold border-t pt-2">
                      <span className="flex-1">Total</span>
                      <span className="w-20 text-right">{totalFrequency}</span>
                      <span className="w-20 text-right">100%</span>
                      <span className="w-24 text-right"></span>
                      <span className="w-24 text-right"></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      : 'Save Pareto'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/pareto`}>
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
