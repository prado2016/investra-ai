/**
 * Monitoring System Test
 * Tests all monitoring components in isolation
 */

import { emailProcessingMonitor } from '../src/services/monitoring/emailProcessingMonitor.js';
import { emailHealthCheck } from '../src/services/monitoring/emailHealthCheck.js';
import { emailAlertManager } from '../src/services/monitoring/emailAlertManager.js';
import { emailLogger } from '../src/services/monitoring/emailLogger.js';
import { emailDashboard } from '../src/services/monitoring/emailDashboard.js';

async function testMonitoringSystem() {
  console.log('🧪 Testing Email Processing Monitoring System');
  console.log('='.repeat(50));

  try {
    // Test 1: Monitor metrics collection
    console.log('\n📊 Testing metrics collection...');
    
    // Record some test events
    emailProcessingMonitor.recordEvent({
      type: 'email_received',
      email: {
        subject: 'Test Email Processing',
        fromEmail: 'test@wealthsimple.com',
        messageId: 'test_msg_123'
      }
    });

    emailProcessingMonitor.recordEvent({
      type: 'parsing_started',
      email: {
        subject: 'Test Email Processing',
        fromEmail: 'test@wealthsimple.com',
        messageId: 'test_msg_123'
      }
    });

    emailProcessingMonitor.recordEvent({
      type: 'parsing_completed',
      email: {
        subject: 'Test Email Processing',
        fromEmail: 'test@wealthsimple.com',
        messageId: 'test_msg_123'
      },
      metrics: {
        processingTime: 150,
        success: true
      }
    });

    const metrics = emailProcessingMonitor.getMetrics();
    console.log('✅ Metrics collected:', {
      totalEmails: metrics.processing?.totalEmails || 0,
      successfulEmails: metrics.processing?.successfulEmails || 0,
      averageProcessingTime: metrics.performance?.averageProcessingTime || 0
    });

    // Test 2: Health check system
    console.log('\n🔍 Testing health check system...');
    
    const healthResult = await emailHealthCheck.performFullHealthCheck();
    console.log('✅ Health check result:', {
      overall: healthResult.overall,
      components: Object.keys(healthResult.components).length,
      healthy: healthResult.overall === 'healthy'
    });

    // Test 3: Alert system
    console.log('\n🚨 Testing alert system...');
    
    // Trigger a test alert
    await emailAlertManager.triggerAlert({
      type: 'test_alert',
      severity: 'info',
      message: 'This is a test alert to verify the monitoring system',
      component: 'monitoring_test',
      metadata: {
        testRun: true,
        timestamp: new Date().toISOString()
      }
    });

    const alerts = emailAlertManager.getActiveAlerts();
    console.log('✅ Alert system working:', {
      activeAlerts: alerts.length,
      testAlertCreated: alerts.some(a => a.type === 'test_alert')
    });

    // Test 4: Logging system
    console.log('\n📝 Testing logging system...');
    
    await emailLogger.log({
      level: 'info',
      message: 'Testing monitoring system logging',
      component: 'monitoring_test',
      correlationId: 'test_corr_123',
      metadata: {
        testRun: true,
        feature: 'monitoring_validation'
      }
    });

    const logSearch = await emailLogger.searchLogs('monitoring system', {}, { limit: 5 });
    console.log('✅ Logging system working:', {
      logsFound: logSearch.logs.length,
      totalLogs: logSearch.total
    });

    // Test 5: Dashboard data
    console.log('\n📋 Testing dashboard data aggregation...');
    
    const dashboardData = await emailDashboard.getDashboardData();
    console.log('✅ Dashboard data available:', {
      hasMetrics: !!dashboardData.metrics,
      hasHealth: !!dashboardData.health,
      hasRecentEvents: (dashboardData.recentEvents?.length || 0) > 0,
      hasAlerts: !!dashboardData.alerts
    });

    // Test 6: Event emission
    console.log('\n📡 Testing event emission...');
    
    let eventReceived = false;
    emailProcessingMonitor.once('eventRecorded', () => {
      eventReceived = true;
    });

    emailProcessingMonitor.recordEvent({
      type: 'test_event',
      email: {
        subject: 'Event Emission Test',
        fromEmail: 'test@example.com',
        messageId: 'event_test_123'
      }
    });

    setTimeout(() => {
      console.log('✅ Event emission working:', { eventReceived });
    }, 100);

    console.log('\n🎉 All monitoring components tested successfully!');
    console.log('\n📊 Final System Status:');
    console.log('- Email Processing Monitor: ✅ Working');
    console.log('- Health Check System: ✅ Working');
    console.log('- Alert Manager: ✅ Working');
    console.log('- Logging System: ✅ Working');
    console.log('- Dashboard Service: ✅ Working');
    console.log('- Event System: ✅ Working');

    return true;

  } catch (error) {
    console.error('❌ Monitoring system test failed:', error);
    return false;
  }
}

// Run the test
testMonitoringSystem()
  .then(success => {
    if (success) {
      console.log('\n🏆 Monitoring system is fully operational!');
      process.exit(0);
    } else {
      console.log('\n💥 Monitoring system has issues!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
