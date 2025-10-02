-- Add version number and status to tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Add index for faster version queries
CREATE INDEX IF NOT EXISTS idx_tools_project_type_version
  ON tools(project_id, tool_type, version DESC);

-- Add constraint to ensure version is positive
ALTER TABLE tools ADD CONSTRAINT tools_version_positive CHECK (version > 0);

-- Comment on columns
COMMENT ON COLUMN tools.version IS 'Version number for tracking changes over time';
COMMENT ON COLUMN tools.status IS 'Status: active, archived, draft';
COMMENT ON COLUMN tools.version_notes IS 'Notes about what changed in this version';
