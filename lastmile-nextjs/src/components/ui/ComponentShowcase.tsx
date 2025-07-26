/**
 * Component showcase for testing and documentation
 * This file demonstrates all UI components and their variants
 */
'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Select,
  Modal,
  Badge,
  LoadingSpinner,
  StatusBadge,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Progress,
  Skeleton
} from './index';

export const ComponentShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">UI Component Showcase</h1>
        <p className="text-gray-600">A comprehensive overview of all available UI components</p>
      </div>

      {/* Buttons */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Buttons</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button leftIcon={<span>👍</span>}>With Left Icon</Button>
            <Button rightIcon={<span>→</span>}>With Right Icon</Button>
          </div>
        </div>
      </section>

      {/* Inputs */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Input
            label="Basic Input"
            placeholder="Enter text..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            label="Input with Error"
            placeholder="Enter text..."
            error="This field is required"
          />
          <Input
            label="Input with Helper Text"
            placeholder="Enter text..."
            helperText="This is helper text"
          />
          <Input
            label="Input with Icons"
            placeholder="Search..."
            leftIcon={<span>🔍</span>}
            rightIcon={<span>✕</span>}
          />
        </div>
      </section>

      {/* Select */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Select</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Select
            label="Basic Select"
            placeholder="Choose an option..."
            options={selectOptions}
            value={selectValue}
            onChange={setSelectValue}
          />
          <Select
            label="Select with Error"
            placeholder="Choose an option..."
            options={selectOptions}
            error="Please select an option"
          />
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>This is a default card with basic styling</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content goes here.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
              <CardDescription>This card has a thicker border</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content goes here.</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>This card has a shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content goes here.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Badges</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="secondary">Secondary</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>
        </div>
      </section>

      {/* Status Badges */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Status Badges</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delivery Status</h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="pending" type="delivery" />
              <StatusBadge status="accepted" type="delivery" />
              <StatusBadge status="picked_up" type="delivery" />
              <StatusBadge status="in_transit" type="delivery" />
              <StatusBadge status="delivered" type="delivery" />
              <StatusBadge status="completed" type="delivery" />
              <StatusBadge status="cancelled" type="delivery" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Status</h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="pending" type="payment" />
              <StatusBadge status="processing" type="payment" />
              <StatusBadge status="completed" type="payment" />
              <StatusBadge status="failed" type="payment" />
              <StatusBadge status="cancelled" type="payment" />
              <StatusBadge status="refunded" type="payment" />
            </div>
          </div>
        </div>
      </section>

      {/* Avatars */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Avatars</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar size="xs" fallback="JD" />
            <Avatar size="sm" fallback="JD" />
            <Avatar size="md" fallback="JD" />
            <Avatar size="lg" fallback="JD" />
            <Avatar size="xl" fallback="JD" />
          </div>
          <div className="flex items-center gap-4">
            <Avatar shape="circle" fallback="JD" />
            <Avatar shape="square" fallback="JD" />
          </div>
        </div>
      </section>

      {/* Loading Spinners */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loading Spinners</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-8">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
            <LoadingSpinner size="xl" />
          </div>
          <div className="flex items-center gap-8">
            <LoadingSpinner color="primary" text="Loading..." />
            <LoadingSpinner color="secondary" text="Processing..." />
          </div>
        </div>
      </section>

      {/* Progress */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Progress</h2>
        <div className="space-y-4 max-w-md">
          <Progress value={25} showLabel label="Upload Progress" />
          <Progress value={50} variant="success" showLabel />
          <Progress value={75} variant="warning" showLabel />
          <Progress value={90} variant="error" showLabel />
        </div>
      </section>

      {/* Tabs */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Tabs</h2>
        <Tabs defaultValue="tab1" className="max-w-md">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Card>
              <CardContent className="pt-6">
                <p>Content for Tab 1</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab2">
            <Card>
              <CardContent className="pt-6">
                <p>Content for Tab 2</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab3">
            <Card>
              <CardContent className="pt-6">
                <p>Content for Tab 3</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Skeletons */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Skeletons</h2>
        <div className="space-y-4 max-w-md">
          <Skeleton variant="text" lines={3} />
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" />
            <div className="flex-1">
              <Skeleton variant="text" />
              <Skeleton variant="text" width="60%" />
            </div>
          </div>
          <Skeleton variant="rectangular" height="200px" />
        </div>
      </section>

      {/* Modal */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modal</h2>
        <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
        
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Example Modal"
          description="This is an example modal dialog"
        >
          <div className="space-y-4">
            <p>This is the modal content. You can put any content here.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </section>
    </div>
  );
};