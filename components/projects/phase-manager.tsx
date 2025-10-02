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
import { CheckCircle2, Circle, PlayCircle, XCircle } from 'lucide-react'
import { DMAICPhase, PHASE_LABELS, PHASE_COLORS } from '@/lib/constants/tools'

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

export default function PhaseManager({ projectId, currentPhase, phases, onUpdate }: PhaseManagerProps) {
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
      <Card>
        <CardHeader>
          <CardTitle>DMAIC Phase Progress</CardTitle>
          <CardDescription>Track and manage progress through each phase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PHASE_ORDER.map((phase) => {
              const phaseData = getPhaseData(phase)
              const status = getPhaseStatus(phase)
              const isCurrentPhase = currentPhase === phase

              return (
                <div
                  key={phase}
                  className={`p-4 border rounded-lg ${
                    isCurrentPhase ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(phase)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={PHASE_COLORS[phase]}>
                            {PHASE_LABELS[phase]}
                          </Badge>
                          {isCurrentPhase && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {PHASE_DESCRIPTIONS[phase]}
                        </p>
                        {phaseData?.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {phaseData.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'not_started' && canStartPhase(phase) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(phase, 'start')}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start Phase
                        </Button>
                      )}

                      {status === 'in_progress' && canCompletePhase(phase) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenDialog(phase, 'complete')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete Phase
                        </Button>
                      )}

                      {status === 'completed' && phaseData?.completion_date && (
                        <div className="text-sm text-gray-500">
                          Completed: {new Date(phaseData.completion_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {phaseData?.start_date && status !== 'completed' && (
                    <div className="mt-2 text-xs text-gray-500">
                      Started: {new Date(phaseData.start_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
