-- Migration Runner: Apply All Schema Updates Safely
-- Task 3: Create Database Migration Scripts
-- Date: 2025-06-06

-- =====================================================
-- MIGRATION TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  migration_file VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  schema_version VARCHAR(20)
);

-- =====================================================
-- CURRENT SCHEMA VERSION
-- =====================================================
-- Track the current schema version
CREATE TABLE IF NOT EXISTS public.schema_version (
  id INTEGER PRIMARY KEY DEFAULT 1,
  version VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT single_version_row CHECK (id = 1)
);

-- Insert initial version if not exists
INSERT INTO public.schema_version (version) 
VALUES ('1.0.0') 
ON CONFLICT (id) DO NOTHING;
