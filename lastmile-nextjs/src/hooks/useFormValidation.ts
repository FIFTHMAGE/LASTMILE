/**
 * Custom hook for form validation with enhanced error handling
 */
import { useState, useCallback } from 'react';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  fieldErrors: Record<string, string[]>;
}

export interface UseFormValidationOptions<T> {
  schema: ZodSchema<T>;
  onValidationSuccess?: (data: T) => void;
  onValidationError?: (errors: Record<string, string>) => void;
}

export function useFormValidation<T>({
  schema,
  onValidationSuccess,
  onValidationError,
}: UseFormValidationOptions<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(
    async (data: unknown): Promise<ValidationResult> => {
      setIsValidating(true);
      
      try {
        const validatedData = schema.parse(data);
        
        setErrors({});
        
        if (onValidationSuccess) {
          onValidationSuccess(validatedData);
        }
        
        return {
          isValid: true,
          errors: {},
          fieldErrors: {},
        };
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldErrors: Record<string, string[]> = {};
          const flatErrors: Record<string, string> = {};
          
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            
            if (!fieldErrors[path]) {
              fieldErrors[path] = [];
            }
            
            fieldErrors[path].push(err.message);
            flatErrors[path] = err.message; // Use first error for flat structure
          });
          
          setErrors(flatErrors);
          
          if (onValidationError) {
            onValidationError(flatErrors);
          }
          
          return {
            isValid: false,
            errors: flatErrors,
            fieldErrors,
          };
        }
        
        // Handle non-Zod errors
        const genericError = { general: 'Validation failed' };
        setErrors(genericError);
        
        if (onValidationError) {
          onValidationError(genericError);
        }
        
        return {
          isValid: false,
          errors: genericError,
          fieldErrors: {},
        };
      } finally {
        setIsValidating(false);
      }
    },
    [schema, onValidationSuccess, onValidationError]
  );

  const validateField = useCallback(
    async (fieldName: string, value: unknown): Promise<boolean> => {
      try {
        // Create a partial schema for single field validation
        const fieldSchema = schema.pick({ [fieldName]: true } as any);
        fieldSchema.parse({ [fieldName]: value });
        
        // Clear error for this field
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
        
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldError = error.errors.find(err => err.path.includes(fieldName));
          if (fieldError) {
            setErrors(prev => ({
              ...prev,
              [fieldName]: fieldError.message,
            }));
          }
        }
        
        return false;
      }
    },
    [schema]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const hasError = useCallback((fieldName: string): boolean => {
    return !!errors[fieldName];
  }, [errors]);

  const getError = useCallback((fieldName: string): string | undefined => {
    return errors[fieldName];
  }, [errors]);

  return {
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasError,
    getError,
    errors,
    isValidating,
  };
}

/**
 * Hook for real-time form validation
 */
export function useRealtimeValidation<T>(schema: ZodSchema<T>) {
  const [data, setData] = useState<Partial<T>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const validation = useFormValidation({ schema });

  const setValue = useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Validate field if it has been touched
    if (touched[field as string]) {
      validation.validateField(field as string, value);
    }
  }, [touched, validation]);

  const setTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field as string]: true }));
  }, []);

  const validateAll = useCallback(() => {
    return validation.validate(data);
  }, [data, validation]);

  return {
    data,
    setValue,
    setTouched,
    validateAll,
    ...validation,
  };
}

/**
 * Hook for async form submission with validation
 */
export function useAsyncFormSubmission<T>({
  schema,
  onSubmit,
}: {
  schema: ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  const validation = useFormValidation({ schema });

  const handleSubmit = useCallback(
    async (data: unknown) => {
      setSubmitError('');
      setIsSubmitting(true);
      
      try {
        const result = await validation.validate(data);
        
        if (!result.isValid) {
          return result;
        }
        
        await onSubmit(data as T);
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Submission failed';
        setSubmitError(errorMessage);
        
        return {
          isValid: false,
          errors: { submit: errorMessage },
          fieldErrors: {},
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [validation, onSubmit]
  );

  return {
    handleSubmit,
    isSubmitting,
    submitError,
    setSubmitError,
    ...validation,
  };
}