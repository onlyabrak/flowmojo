/**
 * Lean Six Sigma Tool Configuration
 * Defines all available tools for each DMAIC phase
 */

export type DMAICPhase = 'define' | 'measure' | 'analyze' | 'improve' | 'control'

export interface ToolDefinition {
  type: string
  name: string
  description: string
  phase: DMAICPhase
}

export const PHASE_TOOLS: Record<DMAICPhase, ToolDefinition[]> = {
  define: [
    {
      type: 'charter',
      name: 'Project Charter',
      description: 'Define the problem, goals, scope, and business case',
      phase: 'define',
    },
    {
      type: 'sipoc',
      name: 'SIPOC Diagram',
      description: 'High-level process map: Suppliers, Inputs, Process, Outputs, Customers',
      phase: 'define',
    },
    {
      type: 'voc',
      name: 'Voice of Customer',
      description: 'Capture and analyze customer requirements and feedback',
      phase: 'define',
    },
  ],
  measure: [
    {
      type: 'data_collection_plan',
      name: 'Data Collection Plan',
      description: 'Plan what, when, where, and how to collect data',
      phase: 'measure',
    },
    {
      type: 'process_map',
      name: 'Process Map',
      description: 'Detailed flowchart of the current process',
      phase: 'measure',
    },
    {
      type: 'baseline_metrics',
      name: 'Baseline Metrics',
      description: 'Establish current performance levels',
      phase: 'measure',
    },
  ],
  analyze: [
    {
      type: 'fishbone',
      name: 'Fishbone Diagram',
      description: 'Identify root causes using cause-and-effect analysis',
      phase: 'analyze',
    },
    {
      type: 'pareto',
      name: 'Pareto Chart',
      description: '80/20 analysis to identify vital few causes',
      phase: 'analyze',
    },
    {
      type: 'statistical_analysis',
      name: 'Statistical Analysis',
      description: 'Hypothesis testing and correlation analysis',
      phase: 'analyze',
    },
  ],
  improve: [
    {
      type: 'fmea',
      name: 'FMEA',
      description: 'Failure Mode and Effects Analysis to assess risks',
      phase: 'improve',
    },
    {
      type: 'solution_testing',
      name: 'Solution Testing',
      description: 'Pilot test and validate proposed improvements',
      phase: 'improve',
    },
    {
      type: 'implementation_plan',
      name: 'Implementation Plan',
      description: 'Detailed plan for rolling out improvements',
      phase: 'improve',
    },
  ],
  control: [
    {
      type: 'control_chart',
      name: 'Control Chart',
      description: 'Monitor process stability over time',
      phase: 'control',
    },
    {
      type: 'sop',
      name: 'Standard Operating Procedure',
      description: 'Document standardized work procedures',
      phase: 'control',
    },
    {
      type: 'sustainability_plan',
      name: 'Sustainability Plan',
      description: 'Ensure improvements are sustained long-term',
      phase: 'control',
    },
  ],
}

export const PHASE_LABELS: Record<DMAICPhase, string> = {
  define: 'Define',
  measure: 'Measure',
  analyze: 'Analyze',
  improve: 'Improve',
  control: 'Control',
}

export const PHASE_COLORS: Record<DMAICPhase, string> = {
  define: 'bg-blue-100 text-blue-800',
  measure: 'bg-green-100 text-green-800',
  analyze: 'bg-yellow-100 text-yellow-800',
  improve: 'bg-orange-100 text-orange-800',
  control: 'bg-purple-100 text-purple-800',
}

/**
 * Get all tools for a specific phase
 */
export function getToolsForPhase(phase: DMAICPhase): ToolDefinition[] {
  return PHASE_TOOLS[phase] || []
}

/**
 * Get tool definition by type
 */
export function getToolByType(toolType: string): ToolDefinition | undefined {
  for (const phase in PHASE_TOOLS) {
    const tool = PHASE_TOOLS[phase as DMAICPhase].find(t => t.type === toolType)
    if (tool) return tool
  }
  return undefined
}

/**
 * Get all available tool types
 */
export function getAllToolTypes(): string[] {
  return Object.values(PHASE_TOOLS)
    .flat()
    .map(tool => tool.type)
}
