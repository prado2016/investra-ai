import { useState, useCallback, useMemo } from 'react';
import { useNotify } from './useNotify';

export interface ValidationRule<T = unknown> {
  required?: boolean | string;
  min?: number | string;
  max?: number | string;
  minLength?: number | string;
  maxLength?: number | string;
  pattern?: RegExp | string;
  custom?: (value: T, formData: Record<string, unknown>) => string | boolean;
  email?: boolean | string;
  number?: boolean | string;
  integer?: boolean | string;
  positive?: boolean | string;
  url?: boolean | string;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface FieldError {
  message: string;
  type: string;
}

export interface FormState<T = Record<string, unknown>> {
  values: T;
  errors: Record<keyof T, FieldError | null>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: ValidationSchema;
  onSubmit?: (values: T) => Promise<boolean> | boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showNotifications?: boolean;
}

const defaultValidationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  number: 'Please enter a valid number',
  integer: 'Please enter a whole number',
  positive: 'Please enter a positive number',
  url: 'Please enter a valid URL',
  min: (min: number) => `Value must be at least ${min}`,
  max: (max: number) => `Value must be no more than ${max}`,
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  pattern: 'Invalid format'
};

export const useForm = <T extends Record<string, unknown>>(options: UseFormOptions<T>) => {
  const { 
    initialValues, 
    validationSchema = {}, 
    onSubmit,
    validateOnChange = true,
    validateOnBlur = true,
    showNotifications = true
  } = options;

  const notify = useNotify();

  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {} as Record<keyof T, FieldError | null>,
    touched: {} as Record<keyof T, boolean>,
    isSubmitting: false,
    isValid: true,
    isDirty: false
  });

  const validateField = useCallback((name: keyof T, value: T[keyof T], allValues: T): FieldError | null => {
    const rules = validationSchema[name as string];
    if (!rules) return null;

    // Required validation
    if (rules.required) {
      const isEmpty = value === null || value === undefined || value === '' || 
                     (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        return {
          type: 'required',
          message: typeof rules.required === 'string' ? rules.required : defaultValidationMessages.required
        };
      }
    }

    // Skip other validations if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Email validation
    if (rules.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return {
          type: 'email',
          message: typeof rules.email === 'string' ? rules.email : defaultValidationMessages.email
        };
      }
    }

    // Number validation
    if (rules.number) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return {
          type: 'number',
          message: typeof rules.number === 'string' ? rules.number : defaultValidationMessages.number
        };
      }
    }

    // Integer validation
    if (rules.integer) {
      const numValue = Number(value);
      if (isNaN(numValue) || !Number.isInteger(numValue)) {
        return {
          type: 'integer',
          message: typeof rules.integer === 'string' ? rules.integer : defaultValidationMessages.integer
        };
      }
    }

    // Positive number validation
    if (rules.positive) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue <= 0) {
        return {
          type: 'positive',
          message: typeof rules.positive === 'string' ? rules.positive : defaultValidationMessages.positive
        };
      }
    }

    // URL validation
    if (rules.url) {
      try {
        new URL(value);
      } catch {
        return {
          type: 'url',
          message: typeof rules.url === 'string' ? rules.url : defaultValidationMessages.url
        };
      }
    }

    // Min/Max for numbers
    if (rules.min !== undefined) {
      const numValue = Number(value);
      const minValue = Number(rules.min);
      if (!isNaN(numValue) && !isNaN(minValue) && numValue < minValue) {
        return {
          type: 'min',
          message: typeof rules.min === 'string' ? rules.min : defaultValidationMessages.min(minValue)
        };
      }
    }

    if (rules.max !== undefined) {
      const numValue = Number(value);
      const maxValue = Number(rules.max);
      if (!isNaN(numValue) && !isNaN(maxValue) && numValue > maxValue) {
        return {
          type: 'max',
          message: typeof rules.max === 'string' ? rules.max : defaultValidationMessages.max(maxValue)
        };
      }
    }

    // Min/Max length for strings
    if (rules.minLength !== undefined) {
      const minLength = Number(rules.minLength);
      if (typeof value === 'string' && value.length < minLength) {
        return {
          type: 'minLength',
          message: typeof rules.minLength === 'string' ? rules.minLength : defaultValidationMessages.minLength(minLength)
        };
      }
    }

    if (rules.maxLength !== undefined) {
      const maxLength = Number(rules.maxLength);
      if (typeof value === 'string' && value.length > maxLength) {
        return {
          type: 'maxLength',
          message: typeof rules.maxLength === 'string' ? rules.maxLength : defaultValidationMessages.maxLength(maxLength)
        };
      }
    }

    // Pattern validation
    if (rules.pattern) {
      const pattern = rules.pattern instanceof RegExp ? rules.pattern : new RegExp(rules.pattern);
      if (typeof value === 'string' && !pattern.test(value)) {
        return {
          type: 'pattern',
          message: typeof rules.pattern === 'string' && rules.pattern.includes('|') 
            ? rules.pattern.split('|')[1] || defaultValidationMessages.pattern
            : defaultValidationMessages.pattern
        };
      }
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value, allValues);
      if (typeof result === 'string') {
        return {
          type: 'custom',
          message: result
        };
      } else if (result === false) {
        return {
          type: 'custom',
          message: 'Invalid value'
        };
      }
    }

    return null;
  }, [validationSchema]);

  const validateForm = useCallback((values: T): Record<keyof T, FieldError | null> => {
    const errors = {} as Record<keyof T, FieldError | null>;
    
    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName as keyof T, values[fieldName as keyof T], values);
      errors[fieldName as keyof T] = error;
    });

    return errors;
  }, [validateField, validationSchema]);

  const isFormValid = useMemo(() => {
    return Object.values(state.errors).every(error => error === null);
  }, [state.errors]);

  const setValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setState(prev => {
      const newValues = { ...prev.values, [name]: value };
      const newErrors = { ...prev.errors };
      const newTouched = { ...prev.touched, [name]: true };

      if (validateOnChange) {
        newErrors[name] = validateField(name, value, newValues);
      }

      return {
        ...prev,
        values: newValues,
        errors: newErrors,
        touched: newTouched,
        isDirty: true,
        isValid: Object.values(newErrors).every(error => error === null)
      };
    });
  }, [validateField, validateOnChange]);

  const setFieldTouched = useCallback((name: keyof T, touched: boolean = true) => {
    setState(prev => {
      const newTouched = { ...prev.touched, [name]: touched };
      const newErrors = { ...prev.errors };

      if (validateOnBlur && touched) {
        newErrors[name] = validateField(name, prev.values[name], prev.values);
      }

      return {
        ...prev,
        touched: newTouched,
        errors: newErrors,
        isValid: Object.values(newErrors).every(error => error === null)
      };
    });
  }, [validateField, validateOnBlur]);

  const setFieldError = useCallback((name: keyof T, error: FieldError | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [name]: error },
      isValid: Object.values({ ...prev.errors, [name]: error }).every(err => err === null)
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {} as Record<keyof T, FieldError | null>,
      isValid: true
    }));
  }, []);

  const reset = useCallback((newInitialValues?: T) => {
    setState({
      values: newInitialValues || initialValues,
      errors: {} as Record<keyof T, FieldError | null>,
      touched: {} as Record<keyof T, boolean>,
      isSubmitting: false,
      isValid: true,
      isDirty: false
    });
  }, [initialValues]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validate all fields
    const errors = validateForm(state.values);
    setState(prev => ({
      ...prev,
      errors,
      touched: Object.keys(prev.values).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {} as Record<keyof T, boolean>),
      isValid: Object.values(errors).every(error => error === null)
    }));

    const hasErrors = Object.values(errors).some(error => error !== null);
    
    if (hasErrors) {
      if (showNotifications) {
        notify.formError('Please correct the errors below and try again');
      }
      return false;
    }

    if (onSubmit) {
      setState(prev => ({ ...prev, isSubmitting: true }));
      
      try {
        const result = await onSubmit(state.values);
        return result;
      } catch (error) {
        if (showNotifications) {
          notify.apiError(error, 'Failed to submit form');
        }
        return false;
      } finally {
        setState(prev => ({ ...prev, isSubmitting: false }));
      }
    }

    return true;
  }, [state.values, validateForm, onSubmit, showNotifications, notify]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValid: isFormValid,
    isDirty: state.isDirty,
    setValue,
    setFieldTouched,
    setFieldError,
    clearErrors,
    reset,
    handleSubmit,
    validateField: (name: keyof T, value?: T[keyof T]) => 
      validateField(name, value !== undefined ? value : state.values[name], state.values)
  };
};

export default useForm;
