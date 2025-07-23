import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, LoadingSpinner } from '../../components/UI';
import { CheckCircle, XCircle } from 'lucide-react';
import { authAPI } from '../../services/api';

const VerifyEmailPage = () => {
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setVerifying(false);
      setError('Invalid verification link. Please request a new one.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        console.log('Verification response:', response);
        
        if (response.data && response.data.success) {
          if (response.data.alreadyVerified) {
            setAlreadyVerified(true);
          }
          setSuccess(true);
        } else {
          throw new Error('Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setError(
          error.response?.data?.message || 
          'Verification failed. The link may have expired.'
        );
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [location]);

  const handleResendVerification = () => {
    navigate('/resend-verification');
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Email Verification</h1>
        
        {verifying ? (
          <div className="flex flex-col items-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-green-700 mb-2">
              {alreadyVerified ? 'Email Already Verified!' : 'Email Verified!'}
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {alreadyVerified 
                ? 'Your email has already been verified. You can now log in to your account.'
                : 'Your email has been successfully verified. You can now log in to your account.'}
            </p>
            <Button onClick={handleGoToLogin} className="w-full">
              Go to Login
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Verification Failed</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <Button onClick={handleResendVerification} className="w-full">
              Request New Verification Link
            </Button>
            <button 
              onClick={handleGoToLogin} 
              className="mt-4 text-blue-600 hover:text-blue-800 underline"
            >
              Back to Login
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VerifyEmailPage;