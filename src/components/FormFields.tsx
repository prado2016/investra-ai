import React from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

// Base field interface
interface BaseFieldProps {
  label?: string;
  error?: string | null;
  success?: string | null;
  helpText?: string;
  required?: boolean;
  className?: string;
}

// Input field props
interface InputFieldProps extends BaseFieldProps {
  id?: string;
  name?: string;
  type?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'date' | 'textarea';
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number;
  autoComplete?: string;
  maxLength?: number;
  tabIndex?: number;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  name,
  label,
  error,
  success,
  helpText,
  required,
  className,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  disabled,
  min,
  max,
  step,
  autoComplete,
  maxLength,
  tabIndex
}) => {
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  return (
    <div className={`field-container ${className || ''}`}>
      {label && (
        <label 
          htmlFor={id}
          className={`field-label ${required ? 'required' : ''} ${hasError ? 'error' : ''}`}
        >
          {label}
        </label>
      )}
      
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        maxLength={maxLength}
        tabIndex={tabIndex}
        className={`form-input ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${label}-error` : 
          hasSuccess ? `${label}-success` : 
          helpText ? `${label}-help` : undefined
        }
      />
      
      {hasError && (
        <div id={`${label}-error`} className="error-message" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {hasSuccess && (
        <div id={`${label}-success`} className="success-message">
          <CheckCircle size={16} />
          {success}
        </div>
      )}
      
      {helpText && !hasError && !hasSuccess && (
        <div id={`${label}-help`} className="help-text">
          {helpText}
        </div>
      )}
    </div>
  );
};

// Password field
interface PasswordFieldProps extends Omit<InputFieldProps, 'type'> {
  showToggle?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  showToggle = true,
  className,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const hasError = !!props.error;
  const hasSuccess = !!props.success && !hasError;

  return (
    <div className={`field-container ${className || ''}`}>
      {props.label && (
        <label 
          className={`field-label ${props.required ? 'required' : ''} ${hasError ? 'error' : ''}`}
        >
          {props.label}
        </label>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
          placeholder={props.placeholder}
          disabled={props.disabled}
          autoComplete={props.autoComplete}
          maxLength={props.maxLength}
          className={`form-input ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
          style={{ paddingRight: showToggle ? '3rem' : undefined }}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${props.label}-error` : 
            hasSuccess ? `${props.label}-success` : 
            props.helpText ? `${props.label}-help` : undefined
          }
        />
        
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="btn btn-ghost password-toggle-btn" /* MODIFIED: Removed inline styles, added new class */
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      
      {hasError && (
        <div id={`${props.label}-error`} className="error-message" role="alert">
          <AlertCircle size={16} />
          {props.error}
        </div>
      )}
      
      {hasSuccess && (
        <div id={`${props.label}-success`} className="success-message">
          <CheckCircle size={16} />
          {props.success}
        </div>
      )}
      
      {props.helpText && !hasError && !hasSuccess && (
        <div id={`${props.label}-help`} className="help-text">
          {props.helpText}
        </div>
      )}
    </div>
  );
};

// Select field props
interface SelectFieldProps extends BaseFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  name,
  label,
  error,
  success,
  helpText,
  required,
  className,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled
}) => {
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  return (
    <div className={`field-container ${className || ''}`}>
      {label && (
        <label 
          htmlFor={id}
          className={`field-label ${required ? 'required' : ''} ${hasError ? 'error' : ''}`}
        >
          {label}
        </label>
      )}
      
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className={`form-select ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${label}-error` : 
          hasSuccess ? `${label}-success` : 
          helpText ? `${label}-help` : undefined
        }
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {hasError && (
        <div id={`${label}-error`} className="error-message" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {hasSuccess && (
        <div id={`${label}-success`} className="success-message">
          <CheckCircle size={16} />
          {success}
        </div>
      )}
      
      {helpText && !hasError && !hasSuccess && (
        <div id={`${label}-help`} className="help-text">
          {helpText}
        </div>
      )}
    </div>
  );
};

// Textarea field props
interface TextareaFieldProps extends BaseFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  id,
  name,
  label,
  error,
  success,
  helpText,
  required,
  className,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  rows = 4,
  maxLength
}) => {
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;
  const charCount = value.length;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;

  return (
    <div className={`field-container ${className || ''}`}>
      {label && (
        <label 
          htmlFor={id}
          className={`field-label ${required ? 'required' : ''} ${hasError ? 'error' : ''}`}
        >
          {label}
        </label>
      )}
      
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`form-textarea ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${label}-error` : 
          hasSuccess ? `${label}-success` : 
          helpText ? `${label}-help` : undefined
        }
      />
      
      {maxLength && (
        <div 
          style={{ 
            fontSize: 'var(--text-xs)', 
            color: isNearLimit ? 'var(--color-danger-600)' : 'var(--text-muted)',
            textAlign: 'right',
            marginTop: 'var(--space-1)'
          }}
        >
          {charCount}/{maxLength}
        </div>
      )}
      
      {hasError && (
        <div id={`${label}-error`} className="error-message" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {hasSuccess && (
        <div id={`${label}-success`} className="success-message">
          <CheckCircle size={16} />
          {success}
        </div>
      )}
      
      {helpText && !hasError && !hasSuccess && (
        <div id={`${label}-help`} className="help-text">
          {helpText}
        </div>
      )}
    </div>
  );
};

export default InputField;
