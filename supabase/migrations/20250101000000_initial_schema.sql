-- Create enum for DMAIC phases
CREATE TYPE dmaic_phase AS ENUM ('define', 'measure', 'analyze', 'improve', 'control');

-- Create enum for project status
CREATE TYPE project_status AS ENUM ('draft', 'active', 'on_hold', 'completed', 'cancelled');

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  problem_statement TEXT,
  goal_statement TEXT,
  scope TEXT,
  current_phase dmaic_phase DEFAULT 'define',
  status project_status DEFAULT 'draft',
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_members table (many-to-many)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create project_phases table (tracks phase-specific data)
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  phase dmaic_phase NOT NULL,
  status TEXT DEFAULT 'not_started',
  start_date DATE,
  completion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, phase)
);

-- Create tools table (to track which tools are used in projects)
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  tool_type TEXT NOT NULL, -- 'sipoc', 'fishbone', 'pareto', 'fmea', 'vsm', etc.
  tool_name TEXT NOT NULL,
  phase dmaic_phase NOT NULL,
  data JSONB, -- Store tool-specific data as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create metrics table
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT, -- 'baseline', 'target', 'actual'
  value NUMERIC,
  unit TEXT,
  measurement_date DATE,
  phase dmaic_phase,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create datasets table (for importing measurement data)
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB, -- Store CSV/tabular data as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for project_members
CREATE POLICY "Users can view project members for their projects"
  ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage members"
  ON project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- RLS Policies for project_phases, tools, metrics, datasets
CREATE POLICY "Users can view data for their projects"
  ON project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

CREATE POLICY "Project members can manage phase data"
  ON project_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

-- Similar policies for tools
CREATE POLICY "Users can view tools for their projects"
  ON tools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tools.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

CREATE POLICY "Project members can manage tools"
  ON tools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tools.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

-- Similar policies for metrics
CREATE POLICY "Users can view metrics for their projects"
  ON metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = metrics.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

CREATE POLICY "Project members can manage metrics"
  ON metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = metrics.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

-- Similar policies for datasets
CREATE POLICY "Users can view datasets for their projects"
  ON datasets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = datasets.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

CREATE POLICY "Project members can manage datasets"
  ON datasets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = datasets.project_id
      AND (projects.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()))
    )
  );

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at BEFORE UPDATE ON metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
