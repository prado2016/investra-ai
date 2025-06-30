import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SystemConfigPanel } from '@/components/SystemConfigPanel';
import { EmailConfigurationPanel } from '@/components/EmailConfigurationPanel';
import { 
  Settings, 
  Mail, 
  User, 
  Shield, 
  Bell, 
  Palette,
  Database,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('email');

  const settingsTabs = [
    {
      id: 'email',
      label: 'Email Configuration',
      icon: Mail,
      description: 'Configure your Gmail settings for email importing',
      component: <EmailConfigurationPanel />
    },
    {
      id: 'system',
      label: 'System Configuration',
      icon: Server,
      description: 'Configure email-puller system settings',
      badge: 'Admin',
      component: <SystemConfigPanel />
    },
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: User,
      description: 'Manage your account and personal preferences',
      component: <ProfileSettingsPanel />
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Configure email and system notifications',
      component: <NotificationSettingsPanel />
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Manage security settings and authentication',
      component: <SecuritySettingsPanel />
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: Palette,
      description: 'Customize the interface theme and layout',
      component: <AppearanceSettingsPanel />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage your account settings, email configuration, and system preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-6 bg-transparent h-auto p-0">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-2 py-4 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-5 w-5" />
                    <span className="font-medium hidden sm:inline">{tab.label}</span>
                    {tab.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground hidden md:block text-center">
                    {tab.description}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {settingsTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {tab.component}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

// Placeholder components for other settings panels
function ProfileSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Profile settings panel coming soon...</p>
      </CardContent>
    </Card>
  );
}

function NotificationSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Notification settings panel coming soon...</p>
      </CardContent>
    </Card>
  );
}

function SecuritySettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Security settings panel coming soon...</p>
      </CardContent>
    </Card>
  );
}

function AppearanceSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Appearance settings panel coming soon...</p>
      </CardContent>
    </Card>
  );
}