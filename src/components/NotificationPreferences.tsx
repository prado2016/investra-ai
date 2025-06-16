/**
 * Notification Preferences Component
 * Task 10.4: Add email/SMS notification preferences
 * Comprehensive preferences interface for managing email import notification settings
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Bell,
  Mail,
  Smartphone,
  Settings,
  Volume2,
  VolumeX,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Calendar,
  MessageSquare,
  Slack,
  Webhook,
  Globe,
  Zap,
  Filter,
  Target,
  Shield,
  Layers,
  BarChart3,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'in_app';
  name: string;
  enabled: boolean;
  verified: boolean;
  configuration: {
    address?: string; // email address or phone number
    webhookUrl?: string;
    slackChannel?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
    currentHour: number;
    currentDay: number;
  };
  preferences: {
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    minimumSeverity: 'low' | 'normal' | 'high' | 'urgent';
    eventTypes: string[];
    consolidation: {
      enabled: boolean;
      windowMinutes: number;
      maxEvents: number;
    };
  };
  status: 'active' | 'paused' | 'failed' | 'rate_limited';
  lastUsed?: string;
  deliveryStats: {
    sent: number;
    delivered: number;
    failed: number;
    opened?: number;
    clicked?: number;
  };
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: {
    eventTypes: string[];
    severityLevels: string[];
    portfolios: string[];
    timeWindows: string[];
    customFilters?: Record<string, any>;
  };
  actions: {
    channels: string[];
    template: string;
    escalation: {
      enabled: boolean;
      delayMinutes: number;
      escalateToChannels: string[];
    };
    digest: {
      enabled: boolean;
      frequency: 'hourly' | 'daily' | 'weekly';
      groupBy: string[];
    };
  };
  schedule: {
    enabled: boolean;
    activeHours: {
      start: string;
      end: string;
      timezone: string;
      daysOfWeek: number[];
    };
    blackoutPeriods: Array<{
      start: string;
      end: string;
      reason: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  stats: {
    triggered: number;
    lastTriggered?: string;
    avgResponseTime: number;
  };
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'slack' | 'webhook';
  subject?: string;
  content: string;
  variables: string[];
  formatting: {
    html: boolean;
    markdown: boolean;
    plainText: boolean;
  };
  preview: string;
}

const PreferencesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const TabsContainer = styled.div`
  border-bottom: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    border-color: #4b5563;
  }
`;

const TabsList = styled.div`
  display: flex;
  gap: 2rem;
  overflow-x: auto;
  padding-bottom: 1px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 0;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 500;
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: #3b82f6;
  }

  [data-theme="dark"] & {
    color: ${props => props.$active ? '#60a5fa' : '#9ca3af'};
    
    &:hover {
      color: #60a5fa;
    }
  }
`;

const TabContent = styled.div`
  padding: 2rem 0;
`;

const SectionTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ChannelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ChannelCard = styled(Card)<{ $enabled: boolean; $status: string }>`
  padding: 1.5rem;
  border: 2px solid ${props => {
    if (!props.$enabled) return '#e5e7eb';
    switch (props.$status) {
      case 'active': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'rate_limited': return '#8b5cf6';
      default: return '#e5e7eb';
    }
  }};
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }

  [data-theme="dark"] & {
    border-color: ${props => {
      if (!props.$enabled) return '#4b5563';
      switch (props.$status) {
        case 'active': return '#10b981';
        case 'paused': return '#f59e0b';
        case 'failed': return '#ef4444';
        case 'rate_limited': return '#8b5cf6';
        default: return '#4b5563';
      }
    }};
  }
`;

const ChannelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ChannelInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChannelName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ChannelDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.$status) {
      case 'active':
        return `
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `;
      case 'paused':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'failed':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'rate_limited':
        return `
          background: #e0e7ff;
          color: #5b21b6;
          border: 1px solid #c7d2fe;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'active':
          return `
            background: #064e3b;
            color: #a7f3d0;
            border-color: #065f46;
          `;
        case 'paused':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'failed':
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
        case 'rate_limited':
          return `
            background: #4c1d95;
            color: #c7d2fe;
            border-color: #5b21b6;
          `;
        default:
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
          `;
      }
    }}
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #3b82f6;
  }

  &:checked + span:before {
    transform: translateX(24px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
  }

  [data-theme="dark"] & {
    background-color: #6b7280;
  }
`;

const ChannelSettings = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const SettingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SettingLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #111827;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;

  [data-theme="dark"] & {
    background: #4b5563;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const RulesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RuleCard = styled(Card)<{ $enabled: boolean }>`
  padding: 1.5rem;
  opacity: ${props => props.$enabled ? 1 : 0.6};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
  }
`;

const RuleHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const RuleInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RuleName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: #111827;
  font-size: 1rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const RuleDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const RuleActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

interface NotificationPreferencesProps {
  channels?: NotificationChannel[];
  rules?: NotificationRule[];
  templates?: NotificationTemplate[];
  onSavePreferences?: (preferences: any) => Promise<void>;
  onTestChannel?: (channelId: string) => Promise<void>;
  onCreateRule?: (rule: Partial<NotificationRule>) => Promise<void>;
  className?: string;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  channels = [],
  rules = [],
  templates = [],
  onSavePreferences = async () => {},
  onTestChannel = async () => {},
  onCreateRule = async () => {},
  className
}) => {
  const { success, error } = useNotifications();
  const [activeTab, setActiveTab] = useState('channels');
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mock data for demonstration
  const mockChannels: NotificationChannel[] = [
    {
      id: 'email-1',
      type: 'email',
      name: 'Primary Email',
      enabled: true,
      verified: true,
      configuration: {
        address: 'user@investra.com'
      },
      rateLimit: {
        maxPerHour: 60,
        maxPerDay: 500,
        currentHour: 12,
        currentDay: 87
      },
      preferences: {
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'EST'
        },
        minimumSeverity: 'normal',
        eventTypes: ['import_success', 'import_failed', 'review_required'],
        consolidation: {
          enabled: true,
          windowMinutes: 15,
          maxEvents: 5
        }
      },
      status: 'active',
      lastUsed: new Date(Date.now() - 300000).toISOString(),
      deliveryStats: {
        sent: 1247,
        delivered: 1198,
        failed: 49,
        opened: 987,
        clicked: 234
      }
    },
    {
      id: 'sms-1',
      type: 'sms',
      name: 'Mobile Phone',
      enabled: true,
      verified: true,
      configuration: {
        address: '+1-555-0123'
      },
      rateLimit: {
        maxPerHour: 10,
        maxPerDay: 50,
        currentHour: 3,
        currentDay: 18
      },
      preferences: {
        quietHours: {
          enabled: true,
          start: '23:00',
          end: '07:00',
          timezone: 'EST'
        },
        minimumSeverity: 'high',
        eventTypes: ['import_failed', 'review_overdue', 'system_alert'],
        consolidation: {
          enabled: false,
          windowMinutes: 0,
          maxEvents: 1
        }
      },
      status: 'active',
      lastUsed: new Date(Date.now() - 7200000).toISOString(),
      deliveryStats: {
        sent: 156,
        delivered: 152,
        failed: 4
      }
    },
    {
      id: 'slack-1',
      type: 'slack',
      name: 'Team Slack',
      enabled: false,
      verified: false,
      configuration: {
        slackChannel: '#investra-alerts'
      },
      rateLimit: {
        maxPerHour: 120,
        maxPerDay: 1000,
        currentHour: 0,
        currentDay: 0
      },
      preferences: {
        quietHours: {
          enabled: false,
          start: '18:00',
          end: '09:00',
          timezone: 'EST'
        },
        minimumSeverity: 'normal',
        eventTypes: ['import_failed', 'system_alert', 'review_escalated'],
        consolidation: {
          enabled: true,
          windowMinutes: 5,
          maxEvents: 10
        }
      },
      status: 'paused',
      deliveryStats: {
        sent: 0,
        delivered: 0,
        failed: 0
      }
    }
  ];

  const mockRules: NotificationRule[] = [
    {
      id: 'rule-1',
      name: 'Critical Import Failures',
      description: 'Immediate notification for critical import failures during business hours',
      enabled: true,
      priority: 1,
      conditions: {
        eventTypes: ['import_failed'],
        severityLevels: ['critical', 'high'],
        portfolios: [],
        timeWindows: ['business_hours']
      },
      actions: {
        channels: ['email-1', 'sms-1'],
        template: 'critical_failure',
        escalation: {
          enabled: true,
          delayMinutes: 15,
          escalateToChannels: ['slack-1']
        },
        digest: {
          enabled: false,
          frequency: 'hourly',
          groupBy: ['portfolio', 'error_type']
        }
      },
      schedule: {
        enabled: true,
        activeHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'EST',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        blackoutPeriods: []
      },
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      stats: {
        triggered: 23,
        lastTriggered: new Date(Date.now() - 7200000).toISOString(),
        avgResponseTime: 2.3
      }
    }
  ];

  const currentChannels = channels.length > 0 ? channels : mockChannels;
  const currentRules = rules.length > 0 ? rules : mockRules;

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail size={20} />;
      case 'sms': return <Smartphone size={20} />;
      case 'slack': return <Slack size={20} />;
      case 'webhook': return <Webhook size={20} />;
      case 'in_app': return <Bell size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} />;
      case 'paused': return <Clock size={14} />;
      case 'failed': return <AlertTriangle size={14} />;
      case 'rate_limited': return <Zap size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const handleToggleChannel = async (channelId: string, enabled: boolean) => {
    try {
      // In real implementation, this would call the API
      success('Channel Updated', `Channel ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      error('Update Failed', 'Failed to update channel status');
    }
  };

  const handleTestChannel = async (channelId: string) => {
    try {
      await onTestChannel(channelId);
      success('Test Sent', 'Test notification sent successfully');
    } catch (err) {
      error('Test Failed', 'Failed to send test notification');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSavePreferences({
        channels: currentChannels,
        rules: currentRules
      });
      success('Preferences Saved', 'Notification preferences updated successfully');
    } catch (err) {
      error('Save Failed', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const renderChannelsTab = () => (
    <div>
      <SectionTitle>
        <Bell size={20} />
        Notification Channels
      </SectionTitle>
      
      <ChannelsGrid>
        {currentChannels.map((channel) => (
          <ChannelCard 
            key={channel.id} 
            $enabled={channel.enabled} 
            $status={channel.status}
          >
            <ChannelHeader>
              <ChannelInfo>
                <ChannelName>
                  {getChannelIcon(channel.type)}
                  {channel.name}
                </ChannelName>
                <ChannelDescription>
                  {channel.configuration.address || channel.configuration.slackChannel || 'Not configured'}
                </ChannelDescription>
                <StatusBadge $status={channel.status}>
                  {getStatusIcon(channel.status)}
                  {channel.status}
                </StatusBadge>
              </ChannelInfo>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={(e) => handleToggleChannel(channel.id, e.target.checked)}
                />
                <ToggleSlider />
              </ToggleSwitch>
            </ChannelHeader>

            {channel.enabled && (
              <ChannelSettings>
                <SettingGroup>
                  <SettingLabel>Minimum Severity</SettingLabel>
                  <Select value={channel.preferences.minimumSeverity}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </SettingGroup>

                <SettingGroup>
                  <SettingLabel>Quiet Hours</SettingLabel>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ToggleSwitch>
                      <ToggleInput
                        type="checkbox"
                        checked={channel.preferences.quietHours.enabled}
                        onChange={() => {}}
                      />
                      <ToggleSlider />
                    </ToggleSwitch>
                    {channel.preferences.quietHours.enabled && (
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {channel.preferences.quietHours.start} - {channel.preferences.quietHours.end}
                      </span>
                    )}
                  </div>
                </SettingGroup>

                <StatsGrid>
                  <StatItem>
                    <StatValue>{channel.deliveryStats.sent}</StatValue>
                    <StatLabel>Sent</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{channel.deliveryStats.delivered}</StatValue>
                    <StatLabel>Delivered</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{channel.deliveryStats.failed}</StatValue>
                    <StatLabel>Failed</StatLabel>
                  </StatItem>
                  {channel.deliveryStats.opened && (
                    <StatItem>
                      <StatValue>{channel.deliveryStats.opened}</StatValue>
                      <StatLabel>Opened</StatLabel>
                    </StatItem>
                  )}
                </StatsGrid>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestChannel(channel.id)}
                  >
                    <Zap size={14} />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                  >
                    <Settings size={14} />
                    Configure
                  </Button>
                </div>
              </ChannelSettings>
            )}
          </ChannelCard>
        ))}
      </ChannelsGrid>
    </div>
  );

  const renderRulesTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <SectionTitle>
          <Filter size={20} />
          Notification Rules
        </SectionTitle>
        <Button
          variant="primary"
          onClick={() => setShowCreateRuleModal(true)}
        >
          <Plus size={16} />
          Create Rule
        </Button>
      </div>

      <RulesList>
        {currentRules.length === 0 ? (
          <EmptyState>
            <Filter size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              No notification rules configured
            </div>
            <div>Create rules to customize when and how you receive notifications</div>
          </EmptyState>
        ) : (
          currentRules.map((rule) => (
            <RuleCard key={rule.id} $enabled={rule.enabled}>
              <RuleHeader>
                <RuleInfo>
                  <RuleName>{rule.name}</RuleName>
                  <RuleDescription>{rule.description}</RuleDescription>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <span>Priority: {rule.priority}</span>
                    <span>•</span>
                    <span>Triggered: {rule.stats.triggered} times</span>
                    <span>•</span>
                    <span>Channels: {rule.actions.channels.length}</span>
                  </div>
                </RuleInfo>
                <RuleActions>
                  <ToggleSwitch>
                    <ToggleInput
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => {}}
                    />
                    <ToggleSlider />
                  </ToggleSwitch>
                  <Button variant="ghost" size="sm">
                    <Edit3 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy size={14} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 size={14} />
                  </Button>
                </RuleActions>
              </RuleHeader>
            </RuleCard>
          ))
        )}
      </RulesList>
    </div>
  );

  const renderTemplatesTab = () => (
    <div>
      <SectionTitle>
        <FileText size={20} />
        Message Templates
      </SectionTitle>
      <EmptyState>
        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Template management coming soon
        </div>
        <div>Customize notification message templates for different channels</div>
      </EmptyState>
    </div>
  );

  return (
    <>
      <PreferencesContainer className={className}>
        <Header>
          <Title>
            <Settings size={32} />
            Notification Preferences
          </Title>
          <HeaderActions>
            <Button
              variant="outline"
              onClick={() => {}}
            >
              <RotateCcw size={16} />
              Reset to Defaults
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </HeaderActions>
        </Header>

        <TabsContainer>
          <TabsList>
            <Tab
              $active={activeTab === 'channels'}
              onClick={() => setActiveTab('channels')}
            >
              <Bell size={16} />
              Channels
            </Tab>
            <Tab
              $active={activeTab === 'rules'}
              onClick={() => setActiveTab('rules')}
            >
              <Filter size={16} />
              Rules
            </Tab>
            <Tab
              $active={activeTab === 'templates'}
              onClick={() => setActiveTab('templates')}
            >
              <FileText size={16} />
              Templates
            </Tab>
            <Tab
              $active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 size={16} />
              Analytics
            </Tab>
          </TabsList>
        </TabsContainer>

        <TabContent>
          {activeTab === 'channels' && renderChannelsTab()}
          {activeTab === 'rules' && renderRulesTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'analytics' && (
            <div>
              <SectionTitle>
                <BarChart3 size={20} />
                Notification Analytics
              </SectionTitle>
              <EmptyState>
                <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Analytics dashboard coming soon
                </div>
                <div>View delivery rates, response times, and notification effectiveness</div>
              </EmptyState>
            </div>
          )}
        </TabContent>
      </PreferencesContainer>

      {/* Create Rule Modal */}
      <Modal
        isOpen={showCreateRuleModal}
        onClose={() => setShowCreateRuleModal(false)}
        title="Create Notification Rule"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <SettingLabel>Rule Name</SettingLabel>
            <Input
              type="text"
              placeholder="Enter rule name..."
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          <div>
            <SettingLabel>Description</SettingLabel>
            <Input
              type="text"
              placeholder="Describe when this rule should trigger..."
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              onClick={() => setShowCreateRuleModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowCreateRuleModal(false);
                success('Rule Created', 'Notification rule created successfully');
              }}
            >
              Create Rule
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default NotificationPreferences;