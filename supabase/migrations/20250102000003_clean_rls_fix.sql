-- This migration properly fixes RLS without disabling security
-- It only drops and recreates policies, keeping RLS enabled throughout

-- Drop all existing policies (from previous migrations)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on projects
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON projects';
    END LOOP;

    -- Drop all policies on project_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON project_members';
    END LOOP;

    -- Drop all policies on project_phases
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_phases') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON project_phases';
    END LOOP;

    -- Drop all policies on tools
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tools') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON tools';
    END LOOP;

    -- Drop all policies on metrics
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'metrics') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON metrics';
    END LOOP;

    -- Drop all policies on datasets
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'datasets') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON datasets';
    END LOOP;
END $$;

-- Create new simple policies (NO circular dependencies)

-- PROJECTS: Only check owner_id (no project_members reference)
CREATE POLICY "projects_select_owner" ON projects FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE USING (owner_id = auth.uid());

-- PROJECT_MEMBERS: Only check projects.owner_id (no recursive project_members check)
CREATE POLICY "members_select_owner" ON project_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "members_select_self" ON project_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "members_insert" ON project_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "members_update" ON project_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "members_delete" ON project_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));

-- PROJECT_PHASES: Only owner access
CREATE POLICY "phases_select" ON project_phases FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "phases_insert" ON project_phases FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "phases_update" ON project_phases FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "phases_delete" ON project_phases FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));

-- TOOLS: Only owner access
CREATE POLICY "tools_select" ON tools FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "tools_insert" ON tools FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "tools_update" ON tools FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "tools_delete" ON tools FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));

-- METRICS: Only owner access
CREATE POLICY "metrics_select" ON metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "metrics_insert" ON metrics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "metrics_update" ON metrics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "metrics_delete" ON metrics FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));

-- DATASETS: Only owner access
CREATE POLICY "datasets_select" ON datasets FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "datasets_insert" ON datasets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "datasets_update" ON datasets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
CREATE POLICY "datasets_delete" ON datasets FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()));
