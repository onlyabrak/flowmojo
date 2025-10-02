'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { CheckCircle2, Circle, PlayCircle, Plus } from 'lucide-react'
import { DMAICPhase, PHASE_LABELS, PHASE_COLORS, getToolsForPhase } from '@/lib/constants/tools'
import Link from 'next/link'

interface PhaseData {
  id?: string
  phase: string
  status: string
  start_date?: string
  completion_date?: string
  notes?: string
}

interface PhaseManagerProps {
  projectId: string
  currentPhase: string
  phases: PhaseData[]
  tools: any[]
  metrics: any[]
  onUpdate: () => void
}

const PHASE_ORDER: DMAICPhase[] = ['define', 'measure', 'analyze', 'improve', 'control']

const PHASE_DESCRIPTIONS: Record<DMAICPhase, string> = {
  define: 'Define the problem, goals, and scope',
  measure: 'Collect data and establish baseline metrics',
  analyze: 'Identify root causes of the problem',
  improve: 'Develop and implement solutions',
  control: 'Sustain improvements and monitor results',
}

export default function PhaseManager({ projectId, currentPhase, phases, tools, metrics, onUpdate }: PhaseManagerProps) {
  const [selectedPhase, setSelectedPhase] = useState<DMAICPhase | null>(null)
  const [action, setAction] = useState<'start' | 'complete' | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const getPhaseData = (phase: DMAICPhase) => {
    return phases.find((p) => p.phase === phase)
  }

  const getPhaseStatus = (phase: DMAICPhase): 'not_started' | 'in_progress' | 'completed' => {
    const phaseData = getPhaseData(phase)
    if (!phaseData) return 'not_started'
    return phaseData.status as any
  }

  const canStartPhase = (phase: DMAICPhase): boolean => {
    const currentIndex = PHASE_ORDER.indexOf(phase)
    if (currentIndex === 0) return true // Can always start Define

    // Check if previous phase is completed
    const previousPhase = PHASE_ORDER[currentIndex - 1]
    const previousStatus = getPhaseStatus(previousPhase)
    return previousStatus === 'completed'
  }

  const canCompletePhase = (phase: DMAICPhase): boolean => {
    const status = getPhaseStatus(phase)
    return status === 'in_progress'
  }

  const handleOpenDialog = (phase: DMAICPhase, actionType: 'start' | 'complete') => {
    setSelectedPhase(phase)
    setAction(actionType)
    const phaseData = getPhaseData(phase)
    setNotes(phaseData?.notes || '')
  }

  const handleCloseDialog = () => {
    setSelectedPhase(null)
    setAction(null)
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!selectedPhase || !action) return

    setLoading(true)
    try {
      const phaseData = getPhaseData(selectedPhase)

      if (action === 'start') {
        // Start phase: create or update phase record
        if (phaseData?.id) {
          await supabase
            .from('project_phases')
            .update({
              status: 'in_progress',
              start_date: new Date().toISOString().split('T')[0],
              notes,
            })
            .eq('id', phaseData.id)
        } else {
          await supabase.from('project_phases').insert({
            project_id: projectId,
            phase: selectedPhase,
            status: 'in_progress',
            start_date: new Date().toISOString().split('T')[0],
            notes,
          })
        }

        // Update project's current phase
        await supabase
          .from('projects')
          .update({ current_phase: selectedPhase })
          .eq('id', projectId)
      } else if (action === 'complete') {
        // Complete phase
        if (phaseData?.id) {
          await supabase
            .from('project_phases')
            .update({
              status: 'completed',
              completion_date: new Date().toISOString().split('T')[0],
              notes,
            })
            .eq('id', phaseData.id)
        }

        // Advance to next phase if not the last one
        const currentIndex = PHASE_ORDER.indexOf(selectedPhase)
        if (currentIndex < PHASE_ORDER.length - 1) {
          const nextPhase = PHASE_ORDER[currentIndex + 1]
          await supabase
            .from('projects')
            .update({ current_phase: nextPhase })
            .eq('id', projectId)
        }
      }

      onUpdate()
      handleCloseDialog()
    } catch (error) {
      console.error('Error updating phase:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (phase: DMAICPhase) => {
    const status = getPhaseStatus(phase)
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <>
      <div className="space-y-4">
        <Accordion type="multiple" defaultValue={[currentPhase]} className="space-y-4">
          {PHASE_ORDER.map((phase) => {
            const phaseData = getPhaseData(phase)
            const status = getPhaseStatus(phase)
            const isCurrentPhase = currentPhase === phase
            const phaseTools = getToolsForPhase(phase)
            const activeTools = tools?.filter((t) => t.phase === phase && t.status === 'active') || []
            const phaseMetrics = metrics?.filter((m) => m.phase === phase) || []

            return (
              <AccordionItem
                key={phase}
                value={phase}
                className={`border rounded-lg ${
                  isCurrentPhase ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <AccordionTrigger className="flex-1 py-0 hover:no-underline">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        {getStatusIcon(phase)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={PHASE_COLORS[phase]}>
                              {PHASE_LABELS[phase]}
                            </Badge>
                            {isCurrentPhase && (
                              <Badge variant="outline" className="text-xs">
                                Current
                              </Badge>
                            )}
                            {status === 'completed' && phaseData?.completion_date && (
                              <span className="text-xs text-gray-500">
                                ✓ Completed {new Date(phaseData.completion_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {PHASE_DESCRIPTIONS[phase]}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <div className="flex items-center gap-2">
                      {status === 'not_started' && canStartPhase(phase) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(phase, 'start')}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}

                      {status === 'in_progress' && canCompletePhase(phase) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenDialog(phase, 'complete')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-4 pt-4">
                    {/* Phase Notes */}
                    {phaseData?.notes && (
                      <div className="p-3 bg-gray-50 rounded border">
                        <p className="text-sm font-medium text-gray-700 mb-1">Phase Notes:</p>
                        <p className="text-sm text-gray-600">{phaseData.notes}</p>
                      </div>
                    )}

                    {/* Tools Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Tools</h3>
                        <div className="flex gap-2">
                          {phaseTools.map((tool) => (
                            <Link
                              key={tool.type}
                              href={`/projects/${projectId}/tools/${tool.type}`}
                            >
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                {tool.name}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {activeTools.length > 0 ? (
                        <div className="space-y-2">
                          {activeTools.map((tool) => {
                            const toolVersions = tools.filter(
                              (t) => t.tool_type === tool.tool_type && t.phase === tool.phase
                            )
                            return (
                              <Link
                                key={tool.id}
                                href={`/projects/${projectId}/tools/${tool.tool_type}`}
                                className="block p-3 border rounded hover:bg-gray-50 transition"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{tool.tool_name}</div>
                                    <div className="text-sm text-gray-600 capitalize">
                                      {tool.tool_type.replace('_', ' ')}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">v{tool.version}</span>
                                    {toolVersions.length > 1 && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {toolVersions.length} versions
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No tools added yet</p>
                      )}
                    </div>

                    {/* Metrics Section */}
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900">Metrics</h3>
                      {phaseMetrics.length > 0 ? (
                        <div className="space-y-2">
                          {phaseMetrics.map((metric) => (
                            <div key={metric.id} className="p-3 border rounded flex justify-between">
                              <div>
                                <div className="font-medium">{metric.metric_name}</div>
                                <div className="text-sm text-gray-600 capitalize">
                                  {metric.metric_type}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {metric.value} {metric.unit}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No metrics tracked yet</p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Dialog for Start/Complete Phase */}
      <Dialog open={!!selectedPhase} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'start' ? 'Start' : 'Complete'} {selectedPhase && PHASE_LABELS[selectedPhase]} Phase
            </DialogTitle>
            <DialogDescription>
              {action === 'start'
                ? 'Begin working on this phase. The project will advance to this phase.'
                : 'Mark this phase as complete and advance to the next phase.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={
                  action === 'start'
                    ? 'Add any notes about starting this phase...'
                    : 'Add completion notes, key learnings, or outcomes...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : action === 'start' ? 'Start Phase' : 'Complete Phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
