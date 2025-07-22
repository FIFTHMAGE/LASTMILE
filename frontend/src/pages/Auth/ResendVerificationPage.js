import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../../components/UI';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../../services/api';

const ResendVerificationPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await authAPI.resendVerification(email);
      
      setSuccess(true);
    } catch (error) {
      console.error('Resend verification error:', error);
      setError(
        error.response?.data?.message || 
        'Failed to send verification email. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Resend Verification Email</h1>
        
        {success ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-green-700 mb-2">Email Sent!</h2>
            <p className="text-gray-600 text-center mb-6">
              If your email exists in our system, a verification link has been sent.
              Please check your inbox and spam folder.
            </p>
            <Button onClick={handleGoToLogin} className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Enter your email address below and we'll send you a new verification link.
              </p>
              
              {error && (
                <div className="flex items-center p-3 mb-4 bg-red-50 text-red-700 rounded-md">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>{error}</span>
                </div>
              )}
              
              <Input
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                icon={<Mail className="w-5 h-5 text-gray-400" />}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Verification Link'}
            </Button>
            
            <div className="mt-4 text-center">
              <button 
                type="button"
                onClick={handleGoToLogin} 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ResendVerificationPage;