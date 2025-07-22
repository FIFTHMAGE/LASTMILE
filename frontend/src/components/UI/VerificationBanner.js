import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Mail, X } from 'lucide-react';

const VerificationBanner = ({ onDismiss }) => {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Email Verification Required
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>
                  Your email address has not been verified. Some features may be limited until you verify your email.
                </p>
              </div>
              <div className="mt-2">
                <Link
                  to="/resend-verification"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <Mail className="mr-1.5 h-4 w-4" />
                  Resend Verification Email
                </Link>
              </div>
            </div>
            {onDismiss && (
              <button
                type="button"
                className="ml-3 flex-shrink-0 text-yellow-400 hover:text-yellow-500 focus:outline-none"
                onClick={onDismiss}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;