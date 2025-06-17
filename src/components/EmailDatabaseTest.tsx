import { useState, useEffect } from 'react'
import EmailConfigurationService from '../services/emailConfigurationService'

/**
 * Email Configuration Database Test Component
 * Tests if the email configuration tables are working properly
 */
export function EmailDatabaseTest() {
  const [testResults, setTestResults] = useState<{
    tablesExist: boolean | null
    error: string | null
    testing: boolean
  }>({
    tablesExist: null,
    error: null,
    testing: false
  })

  const testEmailTables = async () => {
    setTestResults(prev => ({ ...prev, testing: true, error: null }))
    
    try {
      // Test if we can query the email_configurations table
      const result = await EmailConfigurationService.getConfigurations()
      
      if (result.success) {
        setTestResults({
          tablesExist: true,
          error: null,
          testing: false
        })
      } else {
        // Check if error indicates table doesn't exist
        if (result.error?.includes('does not exist')) {
          setTestResults({
            tablesExist: false,
            error: 'Email configuration tables not deployed',
            testing: false
          })
        } else if (result.error?.includes('RLS') || result.error?.includes('policy')) {
          setTestResults({
            tablesExist: true,
            error: 'Tables exist but RLS is working (user not authenticated)',
            testing: false
          })
        } else {
          setTestResults({
            tablesExist: null,
            error: result.error,
            testing: false
          })
        }
      }
    } catch (error) {
      setTestResults({
        tablesExist: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        testing: false
      })
    }
  }

  useEffect(() => {
    testEmailTables()
  }, [])

  return (
    <div className="p-6 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🧪 Email Configuration Database Test
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Tables Status:</span>
          {testResults.testing && (
            <span className="text-blue-600">Testing...</span>
          )}
          {!testResults.testing && testResults.tablesExist === true && (
            <span className="text-green-600 flex items-center gap-1">
              ✅ Tables deployed successfully
            </span>
          )}
          {!testResults.testing && testResults.tablesExist === false && (
            <span className="text-red-600 flex items-center gap-1">
              ❌ Tables not found
            </span>
          )}
          {!testResults.testing && testResults.tablesExist === null && (
            <span className="text-yellow-600 flex items-center gap-1">
              ⚠️ Unable to determine status
            </span>
          )}
        </div>

        {testResults.error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <strong>Details:</strong> {testResults.error}
          </div>
        )}

        <button
          onClick={testEmailTables}
          disabled={testResults.testing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {testResults.testing ? 'Testing...' : 'Retest Tables'}
        </button>

        {testResults.tablesExist === true && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <strong>✅ Success!</strong> Email configuration tables are deployed and working.
            <br />
            <strong>Next steps:</strong>
            <ul className="mt-2 ml-4 list-disc">
              <li>Update EmailConfigurationPanel to use database</li>
              <li>Implement password encryption</li>
              <li>Add IMAP connection testing</li>
              <li>Build email processing service</li>
            </ul>
          </div>
        )}

        {testResults.tablesExist === false && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>❌ Tables Missing!</strong> The email configuration tables need to be deployed.
            <br />
            <strong>Deployment required:</strong>
            <ol className="mt-2 ml-4 list-decimal">
              <li>Open Supabase Dashboard → SQL Editor</li>
              <li>Copy contents of: <code>src/migrations/007_create_email_configuration_tables.sql</code></li>
              <li>Paste into SQL Editor and click "Run"</li>
              <li>Click "Retest Tables" button above</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmailDatabaseTest
