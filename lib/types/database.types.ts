export type DMAICPhase = 'define' | 'measure' | 'analyze' | 'improve' | 'control'

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export type ToolType =
  | 'sipoc'
  | 'voc'
  | 'fishbone'
  | 'pareto'
  | 'fmea'
  | 'vsm'
  | 'control_chart'
  | 'process_map'
  | 'histogram'
  | 'scatter_plot'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  title: string
  description: string | null
  problem_statement: string | null
  goal_statement: string | null
  scope: string | null
  current_phase: DMAICPhase
  status: ProjectStatus
  owner_id: string
  start_date: string | null
  target_completion_date: string | null
  actual_completion_date: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  joined_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  phase: DMAICPhase
  status: string
  start_date: string | null
  completion_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Tool {
  id: string
  project_id: string
  tool_type: ToolType
  tool_name: string
  phase: DMAICPhase
  data: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  project_id: string
  metric_name: string
  metric_type: string | null
  value: number | null
  unit: string | null
  measurement_date: string | null
  phase: DMAICPhase | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Dataset {
  id: string
  project_id: string
  name: string
  description: string | null
  data: Record<string, any> | null
  created_at: string
  updated_at: string
}
