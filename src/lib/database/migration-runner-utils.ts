/**
 * Migration execution utilities continued
 */

/**
 * Load migration SQL content from file
 */
export async function loadMigrationSQL(fileName: string): Promise<string> {
  try {
    // In production, these would be loaded from actual files
    const migrationFiles: Record<string, string> = {
      '000_migration_system.sql': `
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
        
        CREATE TABLE IF NOT EXISTS public.schema_version (
          id INTEGER PRIMARY KEY DEFAULT 1,
          version VARCHAR(20) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT single_version_row CHECK (id = 1)
        );
        
        INSERT INTO public.schema_version (version) 
        VALUES ('1.0.0') 
        ON CONFLICT (id) DO NOTHING;
      `,
      '007_add_email_archiving_columns.sql': `
        -- Add UID column for email tracking (IMAP UID)
        ALTER TABLE public.imap_inbox 
        ADD COLUMN IF NOT EXISTS uid BIGINT;

        -- Add archived status column
        ALTER TABLE public.imap_inbox 
        ADD COLUMN IF NOT EXISTS archived_in_gmail BOOLEAN DEFAULT FALSE;

        -- Add archive folder column  
        ALTER TABLE public.imap_inbox 
        ADD COLUMN IF NOT EXISTS archive_folder VARCHAR(255);

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_imap_inbox_archived 
        ON public.imap_inbox(user_id, archived_in_gmail);

        CREATE INDEX IF NOT EXISTS idx_imap_inbox_uid 
        ON public.imap_inbox(user_id, uid);

        CREATE INDEX IF NOT EXISTS idx_imap_inbox_uid_archived 
        ON public.imap_inbox(user_id, uid, archived_in_gmail);

        -- Set archived_in_gmail to FALSE for all existing records
        UPDATE public.imap_inbox 
        SET archived_in_gmail = FALSE 
        WHERE archived_in_gmail IS NULL;

        -- Add similar columns to imap_processed table if it exists
        DO $$ BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'imap_processed') THEN
                ALTER TABLE public.imap_processed ADD COLUMN IF NOT EXISTS uid BIGINT;
                ALTER TABLE public.imap_processed ADD COLUMN IF NOT EXISTS archived_in_gmail BOOLEAN DEFAULT TRUE;
                ALTER TABLE public.imap_processed ADD COLUMN IF NOT EXISTS archive_folder VARCHAR(255);
                CREATE INDEX IF NOT EXISTS idx_imap_processed_uid ON public.imap_processed(user_id, uid);
                UPDATE public.imap_processed SET archived_in_gmail = TRUE WHERE archived_in_gmail IS NULL;
            END IF;
        END $$;

        -- Add configuration columns to imap_configurations table if it exists
        DO $$ BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'imap_configurations') THEN
                ALTER TABLE public.imap_configurations ADD COLUMN IF NOT EXISTS last_processed_uid BIGINT DEFAULT 0;
                ALTER TABLE public.imap_configurations ADD COLUMN IF NOT EXISTS archive_emails_after_import BOOLEAN DEFAULT TRUE;
                ALTER TABLE public.imap_configurations ADD COLUMN IF NOT EXISTS archive_folder VARCHAR(255) DEFAULT 'Investra/Processed';
            END IF;
        END $$;
      `
    }

    return migrationFiles[fileName] || ''
  } catch (error) {
    console.error(`Failed to load migration file ${fileName}:`, error)
    return ''
  }
}
