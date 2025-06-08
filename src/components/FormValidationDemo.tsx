import React from 'react';
import styled from 'styled-components';
import { InputField, SelectField, TextareaField, PasswordField } from './FormFields';
import { useForm } from '../hooks/useForm';

const DemoContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h2`
  color: #1f2937;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const Section = styled.div`
  margin-bottom: 3rem;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h3`
  color: #374151;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${({ variant }) => variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    
    &:hover:not(:disabled) {
      background: #2563eb;
    }
    
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: #6b7280;
    color: white;
    
    &:hover:not(:disabled) {
      background: #4b5563;
    }
  `}
`;

const ValidationInfo = styled.div`
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const ValidationList = styled.ul`
  margin: 0.5rem 0 0 1.5rem;
  color: #0369a1;
  font-size: 0.875rem;
`;

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  country: string;
  age: string;
  website: string;
  bio: string;
  agreeToTerms: boolean;
}

export const FormValidationDemo: React.FC = () => {
  const contactForm = useForm<ContactFormData>({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      country: '',
      age: '',
      website: '',
      bio: '',
      agreeToTerms: false
    },
    validationSchema: {
      firstName: {
        required: 'First name is required',
        minLength: 2,
        maxLength: 50,
        pattern: '^[A-Za-z\\s]+$|Only letters and spaces are allowed'
      },
      lastName: {
        required: 'Last name is required',
        minLength: 2,
        maxLength: 50,
        pattern: '^[A-Za-z\\s]+$|Only letters and spaces are allowed'
      },
      email: {
        required: 'Email address is required',
        email: true
      },
      phone: {
        pattern: '^[\\d\\s\\-\\(\\)\\+]+$|Please enter a valid phone number'
      },
      password: {
        required: 'Password is required',
        minLength: 8,
        custom: (value) => {
          if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            return 'Password must contain uppercase, lowercase, and number';
          }
          return true;
        }
      },
      confirmPassword: {
        required: 'Please confirm your password',
        custom: (value, formData) => {
          if (value !== formData.password) {
            return 'Passwords do not match';
          }
          return true;
        }
      },
      age: {
        number: true,
        min: 13,
        max: 120,
        integer: true
      },
      website: {
        url: 'Please enter a valid URL (include http:// or https://)'
      },
      bio: {
        maxLength: 500
      }
    },
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Form submitted:', values);
      return true;
    }
  });

  const countryOptions = [
    { value: '', label: 'Select a country' },
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'JP', label: 'Japan' },
    { value: 'AU', label: 'Australia' }
  ];

  return (
    <DemoContainer>
      <Title>Form Validation System Demo</Title>
      
      <Section>
        <SectionTitle>Interactive Contact Form</SectionTitle>
        
        <ValidationInfo>
          <strong>Validation Features Demonstrated:</strong>
          <ValidationList>
            <li>Real-time validation on change and blur</li>
            <li>Required field validation with visual indicators</li>
            <li>Email, URL, number, and pattern validation</li>
            <li>Custom validation rules (password strength, confirmation)</li>
            <li>Inline error messages with helpful guidance</li>
            <li>Form submission with loading states</li>
            <li>Character counting and length limits</li>
          </ValidationList>
        </ValidationInfo>

        <FormContainer onSubmit={contactForm.handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <InputField
              label="First Name"
              value={contactForm.values.firstName}
              onChange={(value) => contactForm.setValue('firstName', value)}
              onBlur={() => contactForm.setFieldTouched('firstName')}
              error={contactForm.touched.firstName ? contactForm.errors.firstName?.message : null}
              required
              placeholder="John"
              helpText="2-50 characters, letters only"
            />

            <InputField
              label="Last Name"
              value={contactForm.values.lastName}
              onChange={(value) => contactForm.setValue('lastName', value)}
              onBlur={() => contactForm.setFieldTouched('lastName')}
              error={contactForm.touched.lastName ? contactForm.errors.lastName?.message : null}
              required
              placeholder="Doe"
              helpText="2-50 characters, letters only"
            />
          </div>

          <InputField
            label="Email Address"
            type="email"
            value={contactForm.values.email}
            onChange={(value) => contactForm.setValue('email', value)}
            onBlur={() => contactForm.setFieldTouched('email')}
            error={contactForm.touched.email ? contactForm.errors.email?.message : null}
            required
            placeholder="john.doe@example.com"
            helpText="We'll never share your email address"
          />

          <InputField
            label="Phone Number"
            type="tel"
            value={contactForm.values.phone}
            onChange={(value) => contactForm.setValue('phone', value)}
            onBlur={() => contactForm.setFieldTouched('phone')}
            error={contactForm.touched.phone ? contactForm.errors.phone?.message : null}
            placeholder="+1 (555) 123-4567"
            helpText="Optional - include country code if international"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <PasswordField
              label="Password"
              value={contactForm.values.password}
              onChange={(value) => contactForm.setValue('password', value)}
              onBlur={() => contactForm.setFieldTouched('password')}
              error={contactForm.touched.password ? contactForm.errors.password?.message : null}
              required
              helpText="Min 8 chars, include uppercase, lowercase, number"
            />

            <PasswordField
              label="Confirm Password"
              value={contactForm.values.confirmPassword}
              onChange={(value) => contactForm.setValue('confirmPassword', value)}
              onBlur={() => contactForm.setFieldTouched('confirmPassword')}
              error={contactForm.touched.confirmPassword ? contactForm.errors.confirmPassword?.message : null}
              required
              helpText="Must match your password"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <SelectField
              label="Country"
              value={contactForm.values.country}
              onChange={(value) => contactForm.setValue('country', value)}
              onBlur={() => contactForm.setFieldTouched('country')}
              options={countryOptions}
              placeholder="Select your country"
            />

            <InputField
              label="Age"
              type="number"
              value={contactForm.values.age}
              onChange={(value) => contactForm.setValue('age', value)}
              onBlur={() => contactForm.setFieldTouched('age')}
              error={contactForm.touched.age ? contactForm.errors.age?.message : null}
              placeholder="25"
              min={13}
              max={120}
              helpText="Must be 13-120"
            />
          </div>

          <InputField
            label="Website"
            type="url"
            value={contactForm.values.website}
            onChange={(value) => contactForm.setValue('website', value)}
            onBlur={() => contactForm.setFieldTouched('website')}
            error={contactForm.touched.website ? contactForm.errors.website?.message : null}
            placeholder="https://yourwebsite.com"
            helpText="Optional - include http:// or https://"
          />

          <TextareaField
            label="Bio"
            value={contactForm.values.bio}
            onChange={(value) => contactForm.setValue('bio', value)}
            onBlur={() => contactForm.setFieldTouched('bio')}
            error={contactForm.touched.bio ? contactForm.errors.bio?.message : null}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={500}
            helpText="Brief description about yourself"
          />

          <ButtonGroup>
            <Button 
              type="button" 
              onClick={() => contactForm.reset()}
            >
              Reset Form
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={contactForm.isSubmitting || !contactForm.isValid}
            >
              {contactForm.isSubmitting ? 'Submitting...' : 'Submit Contact Form'}
            </Button>
          </ButtonGroup>
        </FormContainer>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
          <strong>Form State:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem', fontSize: '0.875rem' }}>
            <li>Valid: {contactForm.isValid ? '✅' : '❌'}</li>
            <li>Dirty: {contactForm.isDirty ? '✅' : '❌'}</li>
            <li>Submitting: {contactForm.isSubmitting ? '✅' : '❌'}</li>
            <li>Errors: {Object.values(contactForm.errors).filter(e => e).length}</li>
          </ul>
        </div>
      </Section>
    </DemoContainer>
  );
};

export default FormValidationDemo;
