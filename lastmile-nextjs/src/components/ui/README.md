# UI Component Library

A comprehensive TypeScript-based UI component library built for the LastMile delivery platform using React, Next.js, and Tailwind CSS.

## Components Overview

### Core Components

#### Button
A versatile button component with multiple variants, sizes, and states.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `leftIcon`, `rightIcon`: React.ReactNode
- `fullWidth`: boolean

#### Input
A flexible input component with label, error states, and icon support.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  placeholder="Enter your email"
  error="Invalid email"
  leftIcon={<EmailIcon />}
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `leftIcon`, `rightIcon`: React.ReactNode
- `fullWidth`: boolean

#### Select
A dropdown select component with customizable options.

```tsx
import { Select } from '@/components/ui';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' }
];

<Select
  label="Choose option"
  options={options}
  onChange={(value) => console.log(value)}
/>
```

#### Card
A flexible card component with header, content, and footer sections.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

**Variants:**
- `default`: Basic border
- `outlined`: Thicker border
- `elevated`: Shadow effect

#### Modal
A modal dialog component with customizable size and behavior.

```tsx
import { Modal } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"
>
  Modal content
</Modal>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `closeOnOverlayClick`: boolean
- `closeOnEscape`: boolean
- `showCloseButton`: boolean

### Specialized Components

#### StatusBadge
A badge component specifically designed for delivery and payment statuses.

```tsx
import { StatusBadge } from '@/components/ui';

<StatusBadge status="in_transit" type="delivery" />
<StatusBadge status="completed" type="payment" />
```

**Delivery Statuses:**
- `pending`, `accepted`, `picked_up`, `in_transit`, `delivered`, `completed`, `cancelled`

**Payment Statuses:**
- `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded`

#### Avatar
A user avatar component with fallback initials.

```tsx
import { Avatar } from '@/components/ui';

<Avatar
  src="/user-photo.jpg"
  alt="User Name"
  size="md"
  fallback="John Doe"
  shape="circle"
/>
```

#### Badge
A general-purpose badge component for labels and indicators.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="md">
  Active
</Badge>
```

**Variants:**
- `default`, `success`, `warning`, `error`, `info`, `secondary`

#### LoadingSpinner
An animated loading spinner with customizable size and color.

```tsx
import { LoadingSpinner } from '@/components/ui';

<LoadingSpinner size="md" color="primary" text="Loading..." />
```

#### Progress
A progress bar component for showing completion status.

```tsx
import { Progress } from '@/components/ui';

<Progress
  value={75}
  max={100}
  variant="success"
  showLabel
  label="Upload Progress"
/>
```

#### Tabs
A tab component for organizing content into sections.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

#### Skeleton
A skeleton loading component for placeholder content.

```tsx
import { Skeleton } from '@/components/ui';

<Skeleton variant="text" lines={3} />
<Skeleton variant="circular" />
<Skeleton variant="rectangular" height="200px" />
```

#### Toast
A toast notification component (used with ToastProvider).

```tsx
import { useToastContext } from '@/components/providers/ToastProvider';

const { toast } = useToastContext();

toast.success('Operation completed successfully!');
toast.error('Something went wrong');
```

### Form Components

#### Form
A form wrapper with error handling context.

```tsx
import { Form, FormFieldWrapper, Input } from '@/components/ui';

<Form errors={errors} touched={touched}>
  <FormFieldWrapper
    name="email"
    label="Email Address"
    required
    description="We'll never share your email"
  >
    <Input placeholder="Enter email" />
  </FormFieldWrapper>
</Form>
```

## Usage Patterns

### Basic Form Example

```tsx
import { useState } from 'react';
import { Form, FormFieldWrapper, Input, Select, Button } from '@/components/ui';

const MyForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  return (
    <Form errors={errors} touched={touched}>
      <FormFieldWrapper name="name" label="Full Name" required>
        <Input placeholder="Enter your name" />
      </FormFieldWrapper>
      
      <FormFieldWrapper name="role" label="Role">
        <Select
          options={[
            { value: 'business', label: 'Business' },
            { value: 'rider', label: 'Rider' }
          ]}
          placeholder="Select role"
        />
      </FormFieldWrapper>
      
      <Button type="submit" fullWidth>
        Submit
      </Button>
    </Form>
  );
};
```

### Toast Notifications

```tsx
import { ToastProvider, useToastContext } from '@/components/providers/ToastProvider';

// Wrap your app with ToastProvider
<ToastProvider position="top-right">
  <App />
</ToastProvider>

// Use in components
const MyComponent = () => {
  const { toast } = useToastContext();
  
  const handleSuccess = () => {
    toast.success('Order created successfully!');
  };
  
  const handleError = () => {
    toast.error('Failed to create order', {
      duration: 8000,
      title: 'Error'
    });
  };
};
```

### Status Display

```tsx
import { StatusBadge, Card, CardContent } from '@/components/ui';

const OrderCard = ({ order }) => (
  <Card>
    <CardContent>
      <div className="flex justify-between items-center">
        <h3>Order #{order.id}</h3>
        <StatusBadge status={order.status} type="delivery" />
      </div>
    </CardContent>
  </Card>
);
```

## Styling

All components use Tailwind CSS for styling and support the `className` prop for custom styling. The components are designed to be consistent with the LastMile platform's design system.

### Color Scheme
- Primary: Blue (`blue-600`)
- Success: Green (`green-600`)
- Warning: Yellow (`yellow-600`)
- Error: Red (`red-600`)
- Info: Blue (`blue-600`)
- Secondary: Purple (`purple-600`)

### Responsive Design
Components are built with responsive design in mind and work well across different screen sizes.

## Accessibility

All components follow accessibility best practices:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Testing

Visit `/components` to see a comprehensive showcase of all components with their various states and configurations.

## Dependencies

- React 19+
- Next.js 15+
- Tailwind CSS 4+
- clsx (for conditional classes)
- tailwind-merge (for class merging)