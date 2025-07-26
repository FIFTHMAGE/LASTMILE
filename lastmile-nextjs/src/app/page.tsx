/**
 * Home page
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/layout';
import { Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TruckIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect authenticated users to their dashboard
  React.useEffect(() => {
    if (user) {
      const dashboardPath = user.role === 'business' 
        ? '/dashboard/business' 
        : user.role === 'rider'
          ? '/dashboard/rider'
          : '/dashboard/admin';
      router.push(dashboardPath);
    }
  }, [user, router]);

  const features = [
    {
      icon: <TruckIcon className="h-8 w-8 text-blue-600" />,
      title: 'Fast Delivery',
      description: 'Get your packages delivered quickly with our network of reliable riders.'
    },
    {
      icon: <ClockIcon className="h-8 w-8 text-green-600" />,
      title: 'Real-time Tracking',
      description: 'Track your deliveries in real-time from pickup to delivery.'
    },
    {
      icon: <ShieldCheckIcon className="h-8 w-8 text-purple-600" />,
      title: 'Secure & Reliable',
      description: 'Your packages are safe with our verified and insured riders.'
    },
    {
      icon: <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />,
      title: 'Competitive Pricing',
      description: 'Transparent pricing with no hidden fees. Pay only for what you need.'
    }
  ];

  const businessBenefits = [
    'Expand your delivery reach',
    'Reduce operational costs',
    'Improve customer satisfaction',
    'Real-time order tracking',
    'Flexible delivery options',
    'Dedicated support team'
  ];

  const riderBenefits = [
    'Flexible working hours',
    'Competitive earnings',
    'Weekly payouts',
    'Insurance coverage',
    'Easy-to-use app',
    'Growing network'
  ];

  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Fast, Reliable
              <span className="text-blue-600 block">Last-Mile Delivery</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect businesses with local riders for efficient, cost-effective delivery solutions. 
              Join thousands of satisfied customers who trust us with their deliveries.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => router.push('/register/business')}
                className="text-lg px-8 py-4"
              >
                Start as Business
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => router.push('/register/rider')}
                className="text-lg px-8 py-4"
              >
                Become a Rider
                <TruckIcon className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose LastMile Delivery?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We provide the tools and network you need for successful deliveries
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to get your deliveries moving
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Create Your Request
              </h3>
              <p className="text-gray-600">
                Enter pickup and delivery details, package information, and preferred timing.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Get Matched
              </h3>
              <p className="text-gray-600">
                Our system matches you with the best available rider in your area.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Track & Deliver
              </h3>
              <p className="text-gray-600">
                Monitor your delivery in real-time until it reaches its destination.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Businesses Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Perfect for Businesses
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Scale your delivery operations with our reliable network of professional riders.
              </p>
              
              <div className="space-y-4 mb-8">
                {businessBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg"
                onClick={() => router.push('/register/business')}
              >
                Get Started as Business
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
              <div className="text-center">
                <UserGroupIcon className="h-16 w-16 text-blue-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Join 1000+ Businesses
                </h3>
                <p className="text-gray-600 mb-6">
                  Already using our platform to streamline their delivery operations
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">99%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">24/7</div>
                    <div className="text-sm text-gray-600">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Riders Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 order-2 lg:order-1">
              <div className="text-center">
                <TruckIcon className="h-16 w-16 text-green-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Earn on Your Schedule
                </h3>
                <p className="text-gray-600 mb-6">
                  Join our growing network of riders and start earning today
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-600">$25</div>
                    <div className="text-sm text-gray-600">Avg per Hour</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">500+</div>
                    <div className="text-sm text-gray-600">Active Riders</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Become a Rider
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Turn your vehicle into a source of income with flexible delivery opportunities.
              </p>
              
              <div className="space-y-4 mb-8">
                {riderBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg"
                onClick={() => router.push('/register/rider')}
              >
                Start Earning Today
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses and riders who trust LastMile Delivery for their logistics needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="outline"
              onClick={() => router.push('/register/business')}
              className="bg-white text-blue-600 hover:bg-gray-50 border-white"
            >
              Register as Business
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => router.push('/register/rider')}
              className="bg-white text-blue-600 hover:bg-gray-50 border-white"
            >
              Become a Rider
            </Button>
          </div>
          <div className="mt-8">
            <p className="text-blue-100 text-sm">
              Already have an account?{' '}
              <button 
                onClick={() => router.push('/login')}
                className="text-white underline hover:no-underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}