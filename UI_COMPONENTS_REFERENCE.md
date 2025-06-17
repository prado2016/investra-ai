# 🎛️ Email Processing UI Components Reference

Quick reference for all email processing components and their integration points in the Investra AI app.

## 📊 Main Dashboard Components

### EmailProcessingStatusDisplay
**File**: `src/components/EmailProcessingStatusDisplay.tsx`
**Purpose**: Real-time IMAP service monitoring and email processing metrics
**Integration**: Add to main dashboard or email management section

**Key Features**:
- IMAP service connection status
- Processing queue display with real-time updates
- Performance metrics (success rate, processing time)
- Service controls (start/stop/restart)
- Auto-refresh functionality

**Usage**:
```tsx
import EmailProcessingStatusDisplay from './components/EmailProcessingStatusDisplay';

<EmailProcessingStatusDisplay 
  onServiceControl={(action) => console.log('Service action:', action)}
  refreshInterval={30000}
/>
```

### ImportStatusNotifications
**File**: `src/components/ImportStatusNotifications.tsx`
**Purpose**: Floating notification panel for real-time import status alerts
**Integration**: Add to app root for global notifications

**Key Features**:
- Real-time notification panel (top-right by default)
- Filtering (all, unread, urgent, by type)
- Sound alerts for urgent notifications
- Quick actions on notifications
- Collapsible/expandable interface

**Usage**:
```tsx
import ImportStatusNotifications from './components/ImportStatusNotifications';

<ImportStatusNotifications
  notifications={notifications}
  settings={{
    enabled: true,
    soundEnabled: true,
    positioning: 'top-right'
  }}
  onNotificationClick={(notification) => handleNotificationClick(notification)}
/>
```

## 🛠️ Management Interface Components

### FailedImportResolutionInterface
**File**: `src/components/FailedImportResolutionInterface.tsx`
**Purpose**: Comprehensive interface for managing and resolving failed email imports
**Integration**: Add to email management or admin section

**Key Features**:
- Advanced filtering (error type, status, priority, search)
- Detailed error analysis with stack traces
- Resolution actions (retry, manual fix, skip, delete)
- Bulk operations support
- Modal detail view with context

**Usage**:
```tsx
import FailedImportResolutionInterface from './components/FailedImportResolutionInterface';

<FailedImportResolutionInterface
  failedImports={failedImports}
  loading={isLoading}
  onResolveImport={handleResolveImport}
  onViewDetails={handleViewDetails}
/>
```

### ManualReviewNotifications
**File**: `src/components/ManualReviewNotifications.tsx`
**Purpose**: Notification system for manual review queue events and assignments
**Integration**: Add to review management section

**Key Features**:
- Review assignment notifications
- SLA deadline tracking
- Escalation alerts
- Reviewer availability status
- Performance metrics integration

**Usage**:
```tsx
import ManualReviewNotifications from './components/ManualReviewNotifications';

<ManualReviewNotifications
  notifications={reviewNotifications}
  reviewers={reviewerStatus}
  onNotificationAction={handleReviewAction}
/>
```

### FailedProcessingAlerts
**File**: `src/components/FailedProcessingAlerts.tsx`
**Purpose**: Advanced alert system for failed processing with escalation tracking
**Integration**: Add to monitoring/admin dashboard

**Key Features**:
- Multi-level escalation system
- Alert rules and automation
- Performance impact assessment
- Resolution tracking and statistics
- Integration with notification channels

**Usage**:
```tsx
import FailedProcessingAlerts from './components/FailedProcessingAlerts';

<FailedProcessingAlerts
  alerts={processingAlerts}
  rules={alertRules}
  onAlertAction={handleAlertAction}
  onRuleUpdate={handleRuleUpdate}
/>
```

## ⚙️ Configuration Components

### NotificationPreferences
**File**: `src/components/NotificationPreferences.tsx`
**Purpose**: Comprehensive notification preferences and channel management
**Integration**: Add to user settings or preferences section

**Key Features**:
- Multi-channel configuration (email, SMS, Slack, webhooks)
- Custom notification rules with conditions
- Delivery scheduling and quiet hours
- Rate limiting and consolidation settings
- Analytics and delivery statistics

**Usage**:
```tsx
import NotificationPreferences from './components/NotificationPreferences';

<NotificationPreferences
  channels={notificationChannels}
  rules={notificationRules}
  onSavePreferences={handleSavePreferences}
  onTestChannel={handleTestChannel}
/>
```

## 🔗 Enhanced Portfolio Components

### PortfolioSelector (Enhanced)
**File**: `src/components/PortfolioSelector.tsx`
**Purpose**: Multi-portfolio selector with email processing integration
**Enhanced Features**: Now includes email processing status per portfolio

### PortfolioTransactionList (Enhanced)
**File**: `src/components/PortfolioTransactionList.tsx`
**Purpose**: Transaction list with email import source tracking
**Enhanced Features**: Shows email import source and processing status

### PortfolioDashboard (Enhanced)
**File**: `src/components/PortfolioDashboard.tsx`
**Purpose**: Main portfolio dashboard with email processing integration
**Enhanced Features**: Includes email processing status and recent import activity

## 📱 Suggested App Layout Integration

### Main Dashboard Layout
```tsx
function Dashboard() {
  return (
    <div className="dashboard">
      {/* Top Section */}
      <div className="dashboard-header">
        <PortfolioSelector />
        <EmailProcessingStatusDisplay />
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        <PortfolioDashboard />
        <PortfolioTransactionList />
      </div>

      {/* Global Notifications */}
      <ImportStatusNotifications />
    </div>
  );
}
```

### Email Management Section
```tsx
function EmailManagement() {
  return (
    <div className="email-management">
      <Tabs>
        <Tab label="Processing Status">
          <EmailProcessingStatusDisplay detailed={true} />
        </Tab>
        
        <Tab label="Failed Imports">
          <FailedImportResolutionInterface />
        </Tab>
        
        <Tab label="Manual Review">
          <ManualReviewNotifications />
        </Tab>
        
        <Tab label="Alerts">
          <FailedProcessingAlerts />
        </Tab>
      </Tabs>
    </div>
  );
}
```

### Settings/Preferences Section
```tsx
function Settings() {
  return (
    <div className="settings">
      <Tabs>
        <Tab label="Notifications">
          <NotificationPreferences />
        </Tab>
        
        <Tab label="Email Processing">
          {/* IMAP configuration, parsing rules, etc. */}
        </Tab>
        
        <Tab label="Portfolio Settings">
          {/* Portfolio-specific email processing settings */}
        </Tab>
      </Tabs>
    </div>
  );
}
```

## 🎨 Styling Notes

All components use:
- **Styled Components** for CSS-in-JS styling
- **Dark theme support** via `[data-theme="dark"]` selectors
- **Responsive design** with mobile-first approach
- **Lucide React icons** for consistent iconography
- **Consistent color palette** matching app theme

## 🔌 Integration Requirements

### Required Hooks
- `useNotifications()` - For toast notifications
- `usePortfolioContext()` - For portfolio state management

### Required Services
- `SupabaseService` - Database operations
- `IMAPEmailProcessor` - Email processing
- `WealthsimpleEmailParser` - Email parsing
- `NotificationService` - Alert delivery

### Required Types
All TypeScript interfaces are defined within each component file for type safety.

## 🚀 Quick Start Integration

1. **Add to routing**: Update your router to include email management routes
2. **Import components**: Add imports to your main components
3. **Configure services**: Set up IMAP and notification services
4. **Add to dashboard**: Integrate status displays into main dashboard
5. **Test thoroughly**: Use the testing guide to verify all functionality

Each component is designed to be self-contained with mock data for easy testing and integration!