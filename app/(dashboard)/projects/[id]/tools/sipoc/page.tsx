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

interface SIPOCData {
  suppliers: string[]
  inputs: string[]
  process: string[]
  outputs: string[]
  customers: string[]
}

interface SIPOCVersion {
  id: string
  version: number
  created_at: string
  version_notes: string | null
  status: string
}

export default function SIPOCPage() {
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
  const [versions, setVersions] = useState<SIPOCVersion[]>([])
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<number | null>(null)

  const [sipocData, setSipocData] = useState<SIPOCData>({
    suppliers: [''],
    inputs: [''],
    process: [''],
    outputs: [''],
    customers: [''],
  })

  useEffect(() => {
    loadVersions()
    if (versionParam) {
      loadSIPOC(parseInt(versionParam))
    } else {
      loadSIPOC()
    }
  }, [versionParam])

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, version, created_at, version_notes, status')
        .eq('project_id', projectId)
        .eq('tool_type', 'sipoc')
        .order('version', { ascending: false })

      if (error) throw error
      setVersions(data || [])
    } catch (err: any) {
      console.error('Error loading versions:', err)
    }
  }

  const loadSIPOC = async (version?: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('tools')
        .select('*')
        .eq('project_id', projectId)
        .eq('tool_type', 'sipoc')

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
        setSipocData(data.data)
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
      suppliers: sipocData.suppliers.filter(s => s.trim()),
      inputs: sipocData.inputs.filter(s => s.trim()),
      process: sipocData.process.filter(s => s.trim()),
      outputs: sipocData.outputs.filter(s => s.trim()),
      customers: sipocData.customers.filter(s => s.trim()),
    }

    try {
      // Mark all existing active versions as archived
      await supabase
        .from('tools')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .eq('tool_type', 'sipoc')
        .eq('status', 'active')

      // Create new version
      const newVersion = Math.max(...versions.map(v => v.version), 0) + 1
      const { error } = await supabase
        .from('tools')
        .insert({
          project_id: projectId,
          tool_type: 'sipoc',
          tool_name: 'SIPOC Diagram',
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
      setError(err.message || 'Failed to save SIPOC')
      setSaving(false)
    }
  }

  const addItem = (category: keyof SIPOCData) => {
    setSipocData(prev => ({
      ...prev,
      [category]: [...prev[category], ''],
    }))
  }

  const removeItem = (category: keyof SIPOCData, index: number) => {
    setSipocData(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }))
  }

  const updateItem = (category: keyof SIPOCData, index: number, value: string) => {
    setSipocData(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) => (i === index ? value : item)),
    }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">Loading SIPOC...</div>
      </div>
    )
  }

  const isViewingOldVersion = viewingVersion !== null && viewingVersion < currentVersion

  return (
    <div className="max-w-6xl mx-auto">
      <ToolHeader
        projectId={projectId}
        toolType="sipoc"
        toolName="SIPOC Diagram"
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
                  <Link href={`/projects/${projectId}/tools/sipoc?version=${v.version}`}>
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
                SIPOC Diagram
                {viewingVersion && (
                  <Badge variant="secondary">Viewing v{viewingVersion}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Suppliers, Inputs, Process, Outputs, Customers - High-level process map
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
            {/* Suppliers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Suppliers</Label>
                {!isViewingOldVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem('suppliers')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Supplier
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Who provides inputs to your process?
              </p>
              {sipocData.suppliers.map((supplier, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={supplier}
                    onChange={(e) => updateItem('suppliers', index, e.target.value)}
                    placeholder="e.g., Customer Service Department"
                    disabled={isViewingOldVersion}
                  />
                  {!isViewingOldVersion && sipocData.suppliers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('suppliers', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Inputs</Label>
                {!isViewingOldVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem('inputs')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Input
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                What materials, information, or resources are needed?
              </p>
              {sipocData.inputs.map((input, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => updateItem('inputs', index, e.target.value)}
                    placeholder="e.g., Customer Request"
                    disabled={isViewingOldVersion}
                  />
                  {!isViewingOldVersion && sipocData.inputs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('inputs', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Process */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Process</Label>
                {!isViewingOldVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem('process')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Process Step
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                What are the high-level steps? (5-7 major activities)
              </p>
              {sipocData.process.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex items-center justify-center w-8 h-10 text-sm font-semibold text-gray-500">
                    {index + 1}.
                  </div>
                  <Input
                    value={step}
                    onChange={(e) => updateItem('process', index, e.target.value)}
                    placeholder="e.g., Receive Request"
                    disabled={isViewingOldVersion}
                  />
                  {!isViewingOldVersion && sipocData.process.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('process', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Outputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Outputs</Label>
                {!isViewingOldVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem('outputs')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Output
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                What does the process produce?
              </p>
              {sipocData.outputs.map((output, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={output}
                    onChange={(e) => updateItem('outputs', index, e.target.value)}
                    placeholder="e.g., Completed Order"
                    disabled={isViewingOldVersion}
                  />
                  {!isViewingOldVersion && sipocData.outputs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('outputs', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Customers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Customers</Label>
                {!isViewingOldVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem('customers')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Customer
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Who receives the outputs?
              </p>
              {sipocData.customers.map((customer, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={customer}
                    onChange={(e) => updateItem('customers', index, e.target.value)}
                    placeholder="e.g., End Customer"
                    disabled={isViewingOldVersion}
                  />
                  {!isViewingOldVersion && sipocData.customers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem('customers', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
                    {saving ? 'Saving...' : versions.length > 0 ? 'Save as New Version' : 'Save SIPOC'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/${projectId}`}>Cancel</Link>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" asChild className="flex-1">
                  <Link href={`/projects/${projectId}/tools/sipoc`}>
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
