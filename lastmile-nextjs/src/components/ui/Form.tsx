/**
 * Form components for building forms with validation
 */
import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils/cn';

interface FormContextValue {
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

const useFormContext = () => {
  const context = useContext(FormContext);
  return context || {};
};

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  children: React.ReactNode;
}

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  children: React.ReactNode;
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  type?: 'error' | 'help';
}

export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, errors, touched, children, ...props }, ref) => {
    return (
      <FormContext.Provider value={{ errors, touched }}>
        <form
          ref={ref}
          className={cn('space-y-6', className)}
          {...props}
        >
          {children}
        </form>
      </FormContext.Provider>
    );
  }
);

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, name, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-2', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-gray-700',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, type = 'error', ...props }, ref) => {
    const typeClasses = {
      error: 'text-red-600',
      help: 'text-gray-500'
    };

    return (
      <p
        ref={ref}
        className={cn(
          'text-sm',
          typeClasses[type],
          className
        )}
        role={type === 'error' ? 'alert' : undefined}
        {...props}
      >
        {children}
      </p>
    );
  }
);

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-500', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

// Higher-order component for form fields with automatic error handling
export interface FormFieldWrapperProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  name,
  label,
  description,
  required,
  children,
  className
}) => {
  const { errors, touched } = useFormContext();
  const error = errors?.[name];
  const isTouched = touched?.[name];
  const showError = error && isTouched;

  // Clone the child element and add error prop if it accepts one
  const childWithProps = React.cloneElement(children, {
    id: name,
    name,
    error: showError ? error : undefined,
    ...children.props,
  });

  return (
    <FormField name={name} className={className}>
      {label && (
        <FormLabel htmlFor={name} required={required}>
          {label}
        </FormLabel>
      )}
      {description && (
        <FormDescription>{description}</FormDescription>
      )}
      {childWithProps}
      {showError && (
        <FormMessage type="error">{error}</FormMessage>
      )}
    </FormField>
  );
};

Form.displayName = 'Form';
FormField.displayName = 'FormField';
FormLabel.displayName = 'FormLabel';
FormMessage.displayName = 'FormMessage';
FormDescription.displayName = 'FormDescription';
FormFieldWrapper.displayName = 'FormFieldWrapper';

export { 
  Form, 
  FormField, 
  FormLabel, 
  FormMessage, 
  FormDescription, 
  FormFieldWrapper,
  useFormContext 
};