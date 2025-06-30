import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  Settings, 
  Mail, 
  Clock, 
  Database, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Save
} from 'lucide-react';

interface SystemConfig {
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  is_encrypted: boolean;
}

interface ConfigFormData {
  // Email Settings
  sync_interval_minutes: number;
  max_emails_per_sync: number;
  enable_scheduler: boolean;
  archive_after_sync: boolean;
  processed_folder_name: string;
  
  // Logging Settings
  enable_logging: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  
  // Monitoring Settings
  sync_request_poll_interval: number;
  cleanup_old_requests_days: number;
  
  // IMAP Settings
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
}

const defaultConfig: ConfigFormData = {
  sync_interval_minutes: 30,
  max_emails_per_sync: 50,
  enable_scheduler: true,
  archive_after_sync: true,
  processed_folder_name: 'Investra/Processed',
  enable_logging: true,
  log_level: 'info',
  sync_request_poll_interval: 10,
  cleanup_old_requests_days: 7,
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  imap_secure: true,
};

export function SystemConfigPanel() {
  const [config, setConfig] = useState<ConfigFormData>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load configuration from database
  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value, config_type, description, is_encrypted');

      if (error) throw error;

      const configMap = new Map<string, any>();
      data?.forEach(item => {
        let value: any = item.config_value;
        
        // Convert data types
        switch (item.config_type) {
          case 'number':
            value = parseFloat(value);
            break;
          case 'boolean':
            value = value.toLowerCase() === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch {
              console.warn(`Invalid JSON in config ${item.config_key}`);
            }
            break;
        }
        
        configMap.set(item.config_key, value);
      });

      // Update form data with loaded config
      setConfig({
        sync_interval_minutes: configMap.get('sync_interval_minutes') || defaultConfig.sync_interval_minutes,
        max_emails_per_sync: configMap.get('max_emails_per_sync') || defaultConfig.max_emails_per_sync,
        enable_scheduler: configMap.get('enable_scheduler') ?? defaultConfig.enable_scheduler,
        archive_after_sync: configMap.get('archive_after_sync') ?? defaultConfig.archive_after_sync,
        processed_folder_name: configMap.get('processed_folder_name') || defaultConfig.processed_folder_name,
        enable_logging: configMap.get('enable_logging') ?? defaultConfig.enable_logging,
        log_level: configMap.get('log_level') || defaultConfig.log_level,
        sync_request_poll_interval: configMap.get('sync_request_poll_interval') || defaultConfig.sync_request_poll_interval,
        cleanup_old_requests_days: configMap.get('cleanup_old_requests_days') || defaultConfig.cleanup_old_requests_days,
        imap_host: configMap.get('imap_host') || defaultConfig.imap_host,
        imap_port: configMap.get('imap_port') || defaultConfig.imap_port,
        imap_secure: configMap.get('imap_secure') ?? defaultConfig.imap_secure,
      });

      setLastUpdated(new Date().toLocaleString());
      setMessage({ type: 'success', text: 'Configuration loaded successfully' });

    } catch (error) {
      console.error('Error loading system configuration:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  // Save configuration to database
  const saveConfig = async () => {
    setSaving(true);
    try {
      const configUpdates = [
        { key: 'sync_interval_minutes', value: config.sync_interval_minutes, type: 'number' },
        { key: 'max_emails_per_sync', value: config.max_emails_per_sync, type: 'number' },
        { key: 'enable_scheduler', value: config.enable_scheduler, type: 'boolean' },
        { key: 'archive_after_sync', value: config.archive_after_sync, type: 'boolean' },
        { key: 'processed_folder_name', value: config.processed_folder_name, type: 'string' },
        { key: 'enable_logging', value: config.enable_logging, type: 'boolean' },
        { key: 'log_level', value: config.log_level, type: 'string' },
        { key: 'sync_request_poll_interval', value: config.sync_request_poll_interval, type: 'number' },
        { key: 'cleanup_old_requests_days', value: config.cleanup_old_requests_days, type: 'number' },
        { key: 'imap_host', value: config.imap_host, type: 'string' },
        { key: 'imap_port', value: config.imap_port, type: 'number' },
        { key: 'imap_secure', value: config.imap_secure, type: 'boolean' },
      ];

      // Update each configuration item
      for (const update of configUpdates) {
        const { error } = await supabase
          .from('system_config')
          .upsert({
            config_key: update.key,
            config_value: update.value.toString(),
            config_type: update.type,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Configuration saved successfully! Email-puller will use new settings.' });
      setLastUpdated(new Date().toLocaleString());

    } catch (error) {
      console.error('Error saving system configuration:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  // Load config on component mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (key: keyof ConfigFormData, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Email-Puller System Configuration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <Badge variant="secondary" className="text-xs">
                Last updated: {lastUpdated}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadConfig}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure email-puller system settings. Changes take effect immediately for new operations.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_emails_per_sync">Max Emails Per Sync</Label>
                <Input
                  id="max_emails_per_sync"
                  type="number"
                  min="1"
                  max="200"
                  value={config.max_emails_per_sync}
                  onChange={(e) => handleInputChange('max_emails_per_sync', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of emails to process in a single sync operation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processed_folder_name">Processed Folder Name</Label>
                <Input
                  id="processed_folder_name"
                  value={config.processed_folder_name}
                  onChange={(e) => handleInputChange('processed_folder_name', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Gmail folder name for processed emails
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="archive_after_sync">Archive After Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Move emails to processed table after syncing
                  </p>
                </div>
                <Switch
                  id="archive_after_sync"
                  checked={config.archive_after_sync}
                  onCheckedChange={(checked) => handleInputChange('archive_after_sync', checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">IMAP Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imap_host">IMAP Host</Label>
                  <Input
                    id="imap_host"
                    value={config.imap_host}
                    onChange={(e) => handleInputChange('imap_host', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imap_port">IMAP Port</Label>
                  <Input
                    id="imap_port"
                    type="number"
                    min="1"
                    max="65535"
                    value={config.imap_port}
                    onChange={(e) => handleInputChange('imap_port', parseInt(e.target.value))}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="imap_secure">Secure Connection</Label>
                    <p className="text-xs text-muted-foreground">Use SSL/TLS</p>
                  </div>
                  <Switch
                    id="imap_secure"
                    checked={config.imap_secure}
                    onCheckedChange={(checked) => handleInputChange('imap_secure', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sync_interval_minutes">Sync Interval (Minutes)</Label>
                <Input
                  id="sync_interval_minutes"
                  type="number"
                  min="5"
                  max="1440"
                  value={config.sync_interval_minutes}
                  onChange={(e) => handleInputChange('sync_interval_minutes', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  How often to automatically sync emails (5-1440 minutes)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync_request_poll_interval">Manual Sync Check (Seconds)</Label>
                <Input
                  id="sync_request_poll_interval"
                  type="number"
                  min="5"
                  max="300"
                  value={config.sync_request_poll_interval}
                  onChange={(e) => handleInputChange('sync_request_poll_interval', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  How often to check for manual sync requests
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_scheduler">Enable Automatic Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync emails at regular intervals
                  </p>
                </div>
                <Switch
                  id="enable_scheduler"
                  checked={config.enable_scheduler}
                  onCheckedChange={(checked) => handleInputChange('enable_scheduler', checked)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cleanup_old_requests_days">Cleanup Old Requests (Days)</Label>
                <Input
                  id="cleanup_old_requests_days"
                  type="number"
                  min="1"
                  max="90"
                  value={config.cleanup_old_requests_days}
                  onChange={(e) => handleInputChange('cleanup_old_requests_days', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  How long to keep old sync requests in database
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="log_level">Log Level</Label>
                <Select
                  value={config.log_level}
                  onValueChange={(value) => handleInputChange('log_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug (Verbose)</SelectItem>
                    <SelectItem value="info">Info (Normal)</SelectItem>
                    <SelectItem value="warn">Warning (Less Verbose)</SelectItem>
                    <SelectItem value="error">Error (Minimal)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Level of detail for email-puller logs
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_logging">Enable Detailed Logging</Label>
                  <p className="text-xs text-muted-foreground">
                    Log detailed information about email processing
                  </p>
                </div>
                <Switch
                  id="enable_logging"
                  checked={config.enable_logging}
                  onCheckedChange={(checked) => handleInputChange('enable_logging', checked)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Security settings are automatically managed. Email passwords are encrypted using auto-generated keys.
                Advanced security settings will be available in future updates.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Current Security Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Gmail app passwords encrypted in database</li>
                  <li>• Auto-generated encryption keys</li>
                  <li>• Row-level security (RLS) enabled</li>
                  <li>• Secure database connections</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Changes take effect immediately for new operations
          </div>
          <Button onClick={saveConfig} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}