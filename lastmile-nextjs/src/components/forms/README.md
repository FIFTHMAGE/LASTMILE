# Form Components

A comprehensive collection of TypeScript form components built with React Hook Form and Zod validation for the LastMile delivery platform.

## Overview

The form system provides:
- **React Hook Form** integration for performant form handling
- **Zod schema validation** with TypeScript support
- **Real-time validation** with user-friendly error messages
- **Accessibility** compliance with proper ARIA labels
- **Loading states** and error handling
- **Responsive design** that works across devices
- **Type safety** throughout the entire form workflow

## Core Technologies

### React Hook Form
- Minimal re-renders for better performance
- Built-in validation support
- Easy integration with validation libraries
- Excellent TypeScript support

### Zod Validation
- Schema-based validation with TypeScript inference
- Composable and reusable validation schemas
- Custom error messages
- Complex validation rules support

## Available Forms

### Authentication Forms

#### EnhancedLoginForm
Enhanced login form with improved UX and validation.

```tsx
import { EnhancedLoginForm } from '@/components/forms';

<EnhancedLoginForm
  onSuccess={() => console.log('Login successful')}
  redirectTo="/dashboard"
  className="max-w-md"
/>
```

**Features:**
- Email and password validation
- Show/hide password toggle
- Remember me option
- Server error handling
- Loading states

#### EnhancedBusinessRegistrationForm
Comprehensive business registration with multi-step validation.

```tsx
import { EnhancedBusinessRegistrationForm } from '@/components/forms';

<EnhancedBusinessRegistrationForm
  onSuccess={() => console.log('Registration successful')}
  className="max-w-2xl"
/>
```

**Features:**
- Business information collection
- Contact and address validation
- Password strength requirements
- Terms and conditions acceptance
- Multi-section organization

#### ForgotPasswordForm
Password reset request form with email validation.

```tsx
import { ForgotPasswordForm } from '@/components/forms';

<ForgotPasswordForm
  onSuccess={() => console.log('Reset email sent')}
  className="max-w-md"
/>
```

**Features:**
- Email validation
- Success state with instructions
- Resend functionality
- Error handling

#### ResetPasswordForm
Password reset form with strength validation.

```tsx
import { ResetPasswordForm } from '@/components/forms';

<ResetPasswordForm
  token="reset-token-from-url"
  onSuccess={() => console.log('Password reset')}
  className="max-w-md"
/>
```

**Features:**
- Password strength validation
- Confirm password matching
- Show/hide password toggles
- Password requirements display

### Business Forms

#### OfferCreationForm
Comprehensive form for creating delivery requests.

```tsx
import { OfferCreationForm } from '@/components/forms';

<OfferCreationForm
  onSuccess={(offerId) => console.log('Offer created:', offerId)}
  className="max-w-3xl"
/>
```

**Features:**
- Package information and requirements
- Pickup and delivery addresses
- Contact information validation
- Timing and pricing options
- Special requirements (signature, ID, fragile)
- Temperature requirements for food items

## Validation Schemas

All forms use Zod schemas for validation located in `/lib/validation/schemas.ts`:

### Available Schemas

```typescript
// Authentication
loginSchema
businessRegistrationSchema
riderRegistrationSchema
forgotPasswordSchema
resetPasswordSchema
changePasswordSchema

// Business Operations
offerCreationSchema
businessProfileSchema
riderProfileSchema

// Utility
contactFormSchema
emailVerificationSchema
```

### Schema Features

- **Email validation** with proper format checking
- **Password strength** requirements (8+ chars, uppercase, lowercase, number, special char)
- **Phone number** validation with flexible formats
- **Address validation** with required fields
- **Custom error messages** for better UX
- **Conditional validation** based on form state

## Custom Hooks

### useFormValidation
Custom hook for enhanced form validation with Zod.

```tsx
import { useFormValidation } from '@/hooks/useFormValidation';
import { loginSchema } from '@/lib/validation/schemas';

const MyForm = () => {
  const { validate, errors, isValidating } = useFormValidation({
    schema: loginSchema,
    onValidationSuccess: (data) => console.log('Valid:', data),
    onValidationError: (errors) => console.log('Errors:', errors),
  });

  const handleSubmit = async (formData) => {
    const result = await validate(formData);
    if (result.isValid) {
      // Submit form
    }
  };
};
```

### useRealtimeValidation
Hook for real-time form validation as user types.

```tsx
import { useRealtimeValidation } from '@/hooks/useFormValidation';

const MyForm = () => {
  const {
    data,
    setValue,
    setTouched,
    validateAll,
    errors,
    hasError,
  } = useRealtimeValidation(loginSchema);

  return (
    <form>
      <input
        value={data.email || ''}
        onChange={(e) => setValue('email', e.target.value)}
        onBlur={() => setTouched('email')}
      />
      {hasError('email') && <span>{errors.email}</span>}
    </form>
  );
};
```

### useAsyncFormSubmission
Hook for handling async form submission with validation.

```tsx
import { useAsyncFormSubmission } from '@/hooks/useFormValidation';

const MyForm = () => {
  const {
    handleSubmit,
    isSubmitting,
    submitError,
    errors,
  } = useAsyncFormSubmission({
    schema: loginSchema,
    onSubmit: async (data) => {
      await api.login(data);
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(formData);
    }}>
      {/* Form fields */}
    </form>
  );
};
```

## Form Components Structure

### Form Wrapper Components
All forms use consistent wrapper components from `/components/ui/Form.tsx`:

- **Form** - Main form wrapper with error context
- **FormField** - Individual field wrapper
- **FormLabel** - Accessible form labels
- **FormMessage** - Error message display
- **FormDescription** - Help text display
- **FormFieldWrapper** - Complete field with label, input, and error

### Example Usage

```tsx
import { Form, FormField, FormLabel, FormMessage } from '@/components/ui/Form';

<Form errors={errors} touched={touched}>
  <FormField name="email">
    <FormLabel required>Email</FormLabel>
    <Input {...register('email')} />
    <FormMessage>{errors.email?.message}</FormMessage>
  </FormField>
</Form>
```

## Validation Examples

### Email Validation
```typescript
// Valid emails
"user@example.com"
"test.email+tag@domain.co.uk"

// Invalid emails
"invalid-email"
"@example.com"
"user@"
```

### Password Validation
```typescript
// Valid passwords
"MyPassword123!"
"SecurePass1@"

// Invalid passwords
"password"        // No uppercase, number, or special char
"PASSWORD123"     // No lowercase
"MyPassword"      // No number or special char
"Pass1!"          // Too short (less than 8 chars)
```

### Phone Validation
```typescript
// Valid phone numbers
"+1 (555) 123-4567"
"555-123-4567"
"5551234567"
"+1-555-123-4567"

// Invalid phone numbers
"123"             // Too short
"abc-def-ghij"    // Contains letters
```

## Error Handling

### Client-side Validation
- Real-time validation as user types
- Field-level error messages
- Form-level error summary
- Accessibility-compliant error announcements

### Server-side Error Handling
- API error message display
- Network error handling
- Retry mechanisms
- User-friendly error messages

### Example Error Display

```tsx
// Field-level errors
{errors.email && (
  <FormMessage type="error">
    {errors.email.message}
  </FormMessage>
)}

// Server errors
{serverError && (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <div className="text-sm text-red-600">{serverError}</div>
  </div>
)}
```

## Accessibility Features

- **ARIA labels** for all form controls
- **Error announcements** for screen readers
- **Focus management** for better keyboard navigation
- **High contrast** error states
- **Semantic HTML** structure
- **Keyboard navigation** support

## Responsive Design

All forms are designed to work across different screen sizes:

- **Mobile-first** approach
- **Flexible layouts** that adapt to screen size
- **Touch-friendly** input controls
- **Readable text** at all sizes
- **Proper spacing** for touch targets

## Testing

Visit `/forms-test` to test all form components with:
- Live validation examples
- Error state demonstrations
- Loading state previews
- Accessibility testing
- Responsive design testing

## Best Practices

### Form Design
- Keep forms as short as possible
- Group related fields together
- Use clear, descriptive labels
- Provide helpful error messages
- Show validation feedback immediately

### Validation
- Validate on blur for better UX
- Show success states when appropriate
- Use progressive enhancement
- Provide clear error recovery paths
- Test with real user data

### Performance
- Use React Hook Form for minimal re-renders
- Debounce expensive validations
- Lazy load complex form sections
- Optimize bundle size with code splitting

### Security
- Validate all data on both client and server
- Sanitize user input
- Use HTTPS for all form submissions
- Implement CSRF protection
- Follow OWASP guidelines

## Integration with Authentication

Forms integrate seamlessly with the authentication system:

```tsx
import { useAuth } from '@/hooks/useAuth';
import { EnhancedLoginForm } from '@/components/forms';

const LoginPage = () => {
  const { login } = useAuth();

  return (
    <EnhancedLoginForm
      onSuccess={() => {
        // User will be redirected automatically by auth system
      }}
    />
  );
};
```

## Future Enhancements

- Multi-step form wizard component
- File upload with drag-and-drop
- Auto-save functionality
- Form analytics and tracking
- A/B testing support
- Internationalization (i18n)
- Advanced validation rules
- Form templates and presets