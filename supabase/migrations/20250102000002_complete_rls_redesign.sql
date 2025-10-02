-- Disable RLS temporarily to clean up
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases DISABLE ROW LEVEL SECURITY;
ALTER TABLE tools DISABLE ROW LEVEL SECURITY;
ALTER TABLE metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE datasets DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects where they are members" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;

DROP POLICY IF EXISTS "Users can view project members for owned or member projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can insert members" ON project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON project_members;

DROP POLICY IF EXISTS "Users can view phases for their projects" ON project_phases;
DROP POLICY IF EXISTS "Project owners and members can insert phases" ON project_phases;
DROP POLICY IF EXISTS "Project owners and members can update phases" ON project_phases;
DROP POLICY IF EXISTS "Project owners can delete phases" ON project_phases;

DROP POLICY IF EXISTS "Users can view tools for their projects" ON tools;
DROP POLICY IF EXISTS "Project owners and members can insert tools" ON tools;
DROP POLICY IF EXISTS "Project owners and members can update tools" ON tools;
DROP POLICY IF EXISTS "Project owners can delete tools" ON tools;

DROP POLICY IF EXISTS "Users can view metrics for their projects" ON metrics;
DROP POLICY IF EXISTS "Project owners and members can insert metrics" ON metrics;
DROP POLICY IF EXISTS "Project owners and members can update metrics" ON metrics;
DROP POLICY IF EXISTS "Project owners can delete metrics" ON metrics;

DROP POLICY IF EXISTS "Users can view datasets for their projects" ON datasets;
DROP POLICY IF EXISTS "Project owners and members can insert datasets" ON datasets;
DROP POLICY IF EXISTS "Project owners and members can update datasets" ON datasets;
DROP POLICY IF EXISTS "Project owners can delete datasets" ON datasets;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS TABLE - Base policies (NO references to project_members)
-- ============================================================================

-- Users can only see their own projects (owner)
CREATE POLICY "select_own_projects"
  ON projects FOR SELECT
  USING (owner_id = auth.uid());

-- Users can create projects (must be owner)
CREATE POLICY "insert_projects"
  ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owners can update their projects
CREATE POLICY "update_own_projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owners can delete their projects
CREATE POLICY "delete_own_projects"
  ON projects FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- PROJECT_MEMBERS TABLE - Simple policies (only references projects.owner_id)
-- ============================================================================

-- Users can see members of projects they own
CREATE POLICY "select_members_as_owner"
  ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can see their own membership records
CREATE POLICY "select_own_membership"
  ON project_members FOR SELECT
  USING (user_id = auth.uid());

-- Project owners can add members
CREATE POLICY "insert_members"
  ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can update member roles
CREATE POLICY "update_members"
  ON project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Project owners can remove members
CREATE POLICY "delete_members"
  ON project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- PROJECT_PHASES TABLE - Only owner access (simplified)
-- ============================================================================

CREATE POLICY "select_phases"
  ON project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_phases"
  ON project_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_phases"
  ON project_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_phases"
  ON project_phases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- TOOLS TABLE - Only owner access (simplified)
-- ============================================================================

CREATE POLICY "select_tools"
  ON tools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tools.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_tools"
  ON tools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tools.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_tools"
  ON tools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tools.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_tools"
  ON tools FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tools.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- METRICS TABLE - Only owner access (simplified)
-- ============================================================================

CREATE POLICY "select_metrics"
  ON metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = metrics.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_metrics"
  ON metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = metrics.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_metrics"
  ON metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = metrics.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_metrics"
  ON metrics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = metrics.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- DATASETS TABLE - Only owner access (simplified)
-- ============================================================================

CREATE POLICY "select_datasets"
  ON datasets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = datasets.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_datasets"
  ON datasets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = datasets.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_datasets"
  ON datasets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = datasets.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_datasets"
  ON datasets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = datasets.project_id
      AND projects.owner_id = auth.uid()
    )
  );
