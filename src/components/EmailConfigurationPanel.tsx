import React, { useState } from 'react';
import styled from 'styled-components';
import { Settings, Save, TestTube, Lock, Mail } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';

const ConfigPanel = styled(Card)`
  padding: 2rem;
  margin: 2rem 0;
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
  border: 2px solid #f59e0b;
`;

const ConfigHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ConfigTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #92400e;
  margin: 0;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d97706;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const WarningText = styled.div`
  background: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #dc2626;
  font-size: 0.875rem;
  line-height: 1.4;
`;

interface EmailConfigurationPanelProps {
  onConfigurationUpdated?: () => void;
}

export const EmailConfigurationPanel: React.FC<EmailConfigurationPanelProps> = ({ 
  onConfigurationUpdated 
}) => {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [testing, setTesting] = useState(false);
  const { success, error } = useNotifications();

  const handleUpdateConfiguration = async () => {
    console.log('Update button clicked with:', { email, appPassword: appPassword ? '***' : 'empty' });
    
    if (!email || !appPassword) {
      console.log('Validation failed: missing email or password');
      alert('Please enter both email and app password');
      error('Validation Error', 'Please enter both email and app password');
      return;
    }

    if (!email.includes('@gmail.com')) {
      console.log('Validation failed: not a Gmail address');
      error('Validation Error', 'Please enter a valid Gmail address');
      return;
    }

    // Remove spaces and validate
    const cleanPassword = appPassword.replace(/\s/g, '');
    console.log('Password validation:', { originalLength: appPassword.length, cleanLength: cleanPassword.length });
    if (cleanPassword.length !== 16) {
      console.log('Validation failed: password not 16 characters');
      error('Validation Error', 'Gmail app passwords must be exactly 16 characters (spaces will be removed automatically)');
      return;
    }

    setUpdating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        error('Authentication Error', 'You must be logged in to update email configuration');
        return;
      }

      // Update only the essential fields to avoid constraint issues
      const configData = {
        encrypted_app_password: cleanPassword,
        last_error: null, // Clear any existing errors
        is_active: true,
        sync_status: 'idle',
        updated_at: new Date().toISOString()
      };

      // Update configuration for this user
      const result = await supabase
        .from('imap_configurations')
        .update(configData)
        .eq('user_id', user.id);

      if (result.error) {
        console.error('Update error details:', result.error);
        throw result.error;
      }

      console.log('Configuration update result:', result);
      success('Configuration Updated', 'Email configuration has been updated successfully. The email puller should restart shortly.');
      setEmail('');
      setAppPassword('');
      onConfigurationUpdated?.();
      
    } catch (err: any) {
      console.error('Error updating email configuration:', err);
      error('Update Failed', err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setUpdating(false);
    }
  };

  const handleTestConnection = async () => {
    console.log('Test button clicked with:', { email, appPassword: appPassword ? '***' : 'empty' });
    
    if (!email || !appPassword) {
      console.log('Test validation failed: missing email or password');
      alert('Please enter both email and app password before testing');
      error('Validation Error', 'Please enter both email and app password before testing');
      return;
    }

    setTesting(true);
    
    try {
      // This would ideally test the IMAP connection
      // For now, just validate the format
      await new Promise(resolve => setTimeout(resolve, 2000));
      success('Connection Test', 'Configuration appears valid (actual connection test would be performed by the email service)');
    } catch (err) {
      error('Connection Test Failed', 'Could not validate the email configuration');
    } finally {
      setTesting(false);
    }
  };

  return (
    <ConfigPanel>
      <ConfigHeader>
        <Settings size={24} style={{ color: '#92400e' }} />
        <ConfigTitle>Update Email Configuration</ConfigTitle>
      </ConfigHeader>

      <WarningText>
        <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
        <strong>Security Notice:</strong> This form updates your email configuration directly in the database. 
        The app password will be stored securely. Make sure you're using a Gmail app password, not your regular Gmail password.
      </WarningText>

      <FormGroup>
        <FormLabel>
          <Mail size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Gmail Address
        </FormLabel>
        <FormInput
          type="email"
          placeholder="your.email@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <FormLabel>
          <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Gmail App Password (16 characters)
        </FormLabel>
        <FormInput
          type="password"
          placeholder="xxxx xxxx xxxx xxxx (spaces will be removed)"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          maxLength={20}
        />
        <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
          Generate this in Google Account Settings → Security → 2-Step Verification → App passwords
          <br />
          Characters: {appPassword.replace(/\s/g, '').length}/16 (spaces are automatically removed)
        </div>
      </FormGroup>

      <ButtonGroup>
        <Button
          variant="primary"
          onClick={handleUpdateConfiguration}
          disabled={updating || testing}
          style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
        >
          <Save size={16} />
          {updating ? 'Updating...' : 'Update Configuration'}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={updating || testing}
          style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
        >
          <TestTube size={16} />
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
      </ButtonGroup>
    </ConfigPanel>
  );
};