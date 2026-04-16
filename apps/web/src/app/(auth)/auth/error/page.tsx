export const dynamic = 'force-dynamic';
import Link from 'next/link'
import { AlertTriangle, XCircle } from 'lucide-react'

interface Props {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function AuthErrorPage({ searchParams }: Props) {
  const getParamStr = (val: string | string[] | undefined) => Array.isArray(val) ? val[0] : val
  const errorKey = getParamStr(searchParams?.error) || getParamStr(searchParams?.reason) || 'default'

  const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
    domain: {
      title: 'Domain Mismatch',
      message: 'Only users with @iut-dhaka.edu email addresses can access this portal. Please try signing in with your IUT email.',
    },
    AccessDenied: {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource or your sign-in was rejected.',
    },
    OAuthSignin: {
      title: 'OAuth Error',
      message: 'There was a problem connecting to the OAuth provider. Please try again.',
    },
    OAuthCallback: {
      title: 'OAuth Callback Error',
      message: 'There was a problem during the callback. Please try signing in again.',
    },
    EmailSignInError: {
      title: 'Sign In Error',
      message: 'There was a problem with your sign in. Please check your email and try again.',
    },
    CredentialsSignin: {
      title: 'Invalid Credentials',
      message: 'The email or 2FA code you provided could not be authenticated. Please check and try again.',
    },
    default: {
      title: 'Authentication Error',
      message: 'An unexpected error occurred during authentication. Please try again.',
    },
  }

  const currentError = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* Error Title and Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentError.title}</h1>
          <p className="text-gray-700 mb-6">
            Sorry, there was an issue signing you in. Here's what happened:
          </p>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-800 flex items-start gap-2 text-left">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {currentError.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 flex flex-col">
            <Link
              href="/login"
              className="py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all cursor-pointer inline-block"
            >
              Try Signing In Again
            </Link>
            <Link
              href="/"
              className="py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:-translate-y-0.5 transition-all cursor-pointer inline-block"
            >
              Go Home
            </Link>
          </div>

          {/* Support Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Need help?</strong> Contact the Class Representative (CR) for assistance.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure you're using your official IUT email address (username@iut-dhaka.edu).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
