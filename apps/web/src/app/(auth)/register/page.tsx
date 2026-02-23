'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { signUpWithEmail, signInWithGoogle } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getPostAuthRedirect = () => {
    const tier = searchParams.get('tier');
    const ai = searchParams.get('ai');
    const period = searchParams.get('period');
    if (tier && period) {
      return `/checkout?tier=${tier}&ai=${ai || 'false'}&period=${period}`;
    }
    return '/photos';
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.met);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setIsSubmitting(true);
    setError('');

    try {
      await signUpWithEmail(email, password, name);
      router.push(getPostAuthRedirect());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await signInWithGoogle();
      router.push(getPostAuthRedirect());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="MyPhoto.my.id"
              width={300}
              height={90}
              className="h-20 w-auto"
              priority
            />
          </Link>
          <h1 className="mt-6 text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Start with 10GB free storage
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm dark:bg-gray-800">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-10"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${req.met ? '' : 'opacity-0'}`} />
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-gray-300"
                required
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-500 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-500 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500">or</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <button
            onClick={handleGoogleRegister}
            disabled={isSubmitting}
            className="btn-secondary w-full"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
