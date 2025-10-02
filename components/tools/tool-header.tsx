'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronRight, History, Menu } from 'lucide-react'
import { DMAICPhase, getToolsForPhase, PHASE_LABELS } from '@/lib/constants/tools'

interface ToolHeaderProps {
  projectId: string
  toolType: string
  toolName: string
  phase: DMAICPhase
  currentVersion?: number
  versionsCount?: number
  onShowVersions?: () => void
}

export default function ToolHeader({
  projectId,
  toolType,
  toolName,
  phase,
  currentVersion,
  versionsCount = 0,
  onShowVersions,
}: ToolHeaderProps) {
  const [project, setProject] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', projectId)
        .single()

      if (data) setProject(data)
    } catch (err) {
      console.error('Error loading project:', err)
    }
  }

  const phaseTools = getToolsForPhase(phase)
  const currentTool = phaseTools.find(t => t.type === toolType)
  const phaseLabel = PHASE_LABELS[phase]

  return (
    <div className="mb-6 space-y-4">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/projects" className="hover:text-blue-600 transition">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-blue-600 transition max-w-[200px] truncate"
        >
          {project?.title || 'Loading...'}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{toolName}</span>
      </nav>

      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{toolName}</h1>
          {currentVersion && (
            <Badge variant="secondary" className="text-sm">
              v{currentVersion}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tool Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{phaseLabel} Tools</span>
                <span className="sm:hidden">Tools</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{phaseLabel} Phase Tools</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {phaseTools.map((tool) => (
                <DropdownMenuItem
                  key={tool.type}
                  asChild
                  className={currentTool?.type === tool.type ? 'bg-blue-50 text-blue-700' : ''}
                >
                  <Link href={`/projects/${projectId}/tools/${tool.type}`}>{tool.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Version History */}
          {versionsCount > 0 && onShowVersions && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowVersions}
            >
              <History className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">History</span>
              <Badge variant="secondary" className="ml-2">
                {versionsCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
