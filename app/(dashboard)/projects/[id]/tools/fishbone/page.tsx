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
import { Trash2, Plus, Save } from 'lucide-react'
import ToolHeader from '@/components/tools/tool-header'

interface Cause {
  cause: string
  subcauses: string[]
}

interface FishboneData {
  problem_statement: string
  categories: {
    people: Cause[]
    process: Cause[]
    equipment: Cause[]
    materials: Cause[]
    environment: Cause[]
    measurement: Cause[]
  }
}

interface FishboneVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

type CategoryKey = keyof FishboneData['categories']

export default function FishbonePage() {
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
  const [versions, setVersions] = useState<FishboneVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [fishboneData, setFishboneData] = useState<FishboneData>({
    problem_statement: '',
    categories: {
      people: [],
      process: [],
      equipment: [],
      materials: [],
      environment: [],
      measurement: [],
    },
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadFishbone(parseInt(versionParam))
    } else {
      loadFishbone()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'fishbone')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadFishbone = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'fishbone')

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
        setFishboneData(data.data)
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

    if (!fishboneData.problem_statement.trim()) {
      setError('Please provide a problem statement')
      setSaving(false)
      return
    }

    try {
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'fishbone')
        .eq('status', 'active')

      const newVersion = Math.max(...versions.map((v) => v.version), 0) + 1
      const { error } = await supabase.from('tools').insert({
        project_id: projectId,
        tool_type: 'fishbone',
        tool_name: 'Fishbone Diagram',
        phase: 'analyze',
        data: fishboneData,
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
      setError(err.message || 'Failed to save fishbone diagram')
      setSaving(false)
    }
  }

  const addCause = (category: CategoryKey) => {
    setFishboneData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: [...prev.categories[category], { cause: '', subcauses: [] }],
      },
    }))
  }

  const removeCause = (category: CategoryKey, index: number) => {
    setFishboneData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category].filter((_, i) => i !== index),
      },
    }))
  }

  const updateCause = (category: CategoryKey, index: number, value: string) => {
    setFishboneData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category].map((item, i) =>
          i === index ? { ...item, cause: value } : item
        ),
      },
    }))
  }

  const addSubcause = (category: CategoryKey, causeIndex: number) => {
    setFishboneData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category].map((item, i) =>
          i === causeIndex ? { ...item, subcauses: [...item.subcauses, ''] } : item
        ),
      },
    }))
  }

  const removeSubcause = (category: CategoryKey, causeIndex: number, subcauseIndex: number) => {
    setFishboneData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category].map((item, i) =>
          i === causeIndex
            ? { ...item, subcauses: item.subcauses.filter((_, si) => si !== subcauseIndex) }
            : item
        ),
      },
    }))
  }

  const updateSubcause = (
    category: CategoryKey,
    causeIndex: number,
    subcauseIndex: number,
    value: string
  ) => {
    setFishboneData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: prev.categories[category].map((item, i) =>
          i === causeIndex
            ? {
                ...item,
                subcauses: item.subcauses.map((sc, si) => (si === subcauseIndex ? value : sc)),
              }
            : item
        ),
      },
    }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading fishbone diagram...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  const categories = [
    { key: 'people' as CategoryKey, label: 'People', color: 'bg-blue-100 text-blue-800' },
    { key: 'process' as CategoryKey, label: 'Process', color: 'bg-green-100 text-green-800' },
    { key: 'equipment' as CategoryKey, label: 'Equipment', color: 'bg-purple-100 text-purple-800' },
    { key: 'materials' as CategoryKey, label: 'Materials', color: 'bg-orange-100 text-orange-800' },
    {
      key: 'environment' as CategoryKey,
      label: 'Environment',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      key: 'measurement' as CategoryKey,
      label: 'Measurement',
      color: 'bg-pink-100 text-pink-800',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="fishbone"
        toolName="Fishbone Diagram"
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
                  <Link href={`/projects/${projectId}/tools/fishbone?version=${v.version}`}>
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
                Fishbone Diagram (Ishikawa)
                {viewingVersion && <Badge variant="secondary">Viewing v{viewingVersion}</Badge>}
              </CardTitle>
              <CardDescription>
                Identify root causes using the 6M framework (People, Process, Equipment, Materials,
                Environment, Measurement)
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
            {/* Problem Statement */}
            <div className="space-y-2">
              <Label htmlFor="problem_statement">Problem Statement (Effect) *</Label>
              <Input
                id="problem_statement"
                placeholder="What problem are you analyzing?"
                value={fishboneData.problem_statement}
                onChange={(e) =>
                  setFishboneData({ ...fishboneData, problem_statement: e.target.value })
                }
                disabled={isViewingOldVersion}
                required
              />
              <p className="text-xs text-gray-500">
                This is the "head" of the fishbone - the problem you're trying to solve
              </p>
            </div>

            {/* Categories (6M) */}
            <div className="space-y-4">
              <h3 className="font-semibold">Root Cause Categories (6M)</h3>
              {categories.map((category) => (
                <Card key={category.key} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={category.color}>{category.label}</Badge>
                        <span className="text-sm text-gray-600">
                          {fishboneData.categories[category.key].length} causes
                        </span>
                      </div>
                      {!isViewingOldVersion && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addCause(category.key)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Cause
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fishboneData.categories[category.key].length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No causes added yet. Click "Add Cause" to start.
                      </p>
                    ) : (
                      fishboneData.categories[category.key].map((cause, causeIndex) => (
                        <div key={causeIndex} className="p-3 border rounded bg-gray-50 space-y-3">
                          <div className="flex items-start gap-2">
                            <Input
                              placeholder="Main cause"
                              value={cause.cause}
                              onChange={(e) =>
                                updateCause(category.key, causeIndex, e.target.value)
                              }
                              disabled={isViewingOldVersion}
                              className="flex-1"
                            />
                            {!isViewingOldVersion && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCause(category.key, causeIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>

                          {/* Subcauses */}
                          {cause.subcauses.length > 0 && (
                            <div className="ml-4 space-y-2">
                              {cause.subcauses.map((subcause, subcauseIndex) => (
                                <div key={subcauseIndex} className="flex items-center gap-2">
                                  <span className="text-gray-400">└</span>
                                  <Input
                                    placeholder="Sub-cause"
                                    value={subcause}
                                    onChange={(e) =>
                                      updateSubcause(
                                        category.key,
                                        causeIndex,
                                        subcauseIndex,
                                        e.target.value
                                      )
                                    }
                                    disabled={isViewingOldVersion}
                                    className="flex-1 text-sm"
                                  />
                                  {!isViewingOldVersion && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        removeSubcause(category.key, causeIndex, subcauseIndex)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!isViewingOldVersion && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addSubcause(category.key, causeIndex)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Sub-cause
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
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
                    {saving
                      ? 'Saving...'
                      : versions.length > 0
                      ? 'Save as New Version'
                      : 'Save Fishbone'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/fishbone`}>
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
