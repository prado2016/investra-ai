import React from 'react'
import SampleDataGenerator from '../../utils/sampleDataGenerator'
import { useNotifications } from '../../contexts/NotificationContext'

const SampleDataControl: React.FC = () => {
  const { success, info } = useNotifications()

  const generateSampleData = () => {
    try {
      const result = SampleDataGenerator.generateSampleData({
        portfolioCount: 2,
        positionCount: 6,
        transactionCount: 12
      })
      
      success(
        'Sample Data Generated!', 
        `Created ${result.portfolios} portfolios, ${result.positions} positions, ${result.transactions} transactions`
      )
    } catch (error) {
      console.error('Failed to generate sample data:', error)
    }
  }

  const clearSampleData = () => {
    try {
      SampleDataGenerator.clearSampleData()
      info('Sample Data Cleared', 'All localStorage data has been cleared')
    } catch (error) {
      console.error('Failed to clear sample data:', error)
    }
  }

  return (
    <div style={{ 
      padding: '15px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f0f8ff'
    }}>
      <h4>🧪 Sample Data Generator</h4>
      <p>Generate sample data in localStorage to test migration functionality</p>
      
      <button
        onClick={generateSampleData}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }}
      >
        Generate Sample Data
      </button>

      <button
        onClick={clearSampleData}
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Clear Sample Data
      </button>

      <div style={{ 
        marginTop: '10px', 
        fontSize: '0.9em', 
        color: '#666' 
      }}>
        This will create sample portfolios, positions, and transactions in your browser's localStorage 
        that you can then migrate to Supabase for testing.
      </div>
    </div>
  )
}

export default SampleDataControl
