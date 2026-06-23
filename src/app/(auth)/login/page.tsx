'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const searchParams = useSearchParams();
  const showConfirmBanner = searchParams.get('confirm') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast('Forgot password functionality is coming soon!', {
      icon: '⚡',
      style: {
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[400px] flex flex-col items-center"
    >
      {/* Small logo mark */}
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 mb-4 text-accent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-1">
        Welcome back
      </h2>
      <p className="text-text-secondary text-sm mb-8">
        Log in to continue to SparkChat
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {showConfirmBanner && (
          <div className="text-success text-sm font-medium bg-success/10 border border-success/20 rounded-md p-3 text-center">
            ✅ Account created! Please check your email and click the confirmation link before logging in.
          </div>
        )}
        {error && (
          <div className="text-danger text-sm font-medium bg-danger/10 border border-danger/20 rounded-md p-3 text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Email address
          </label>
          <input
            type="email"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-text-secondary">
              Password
            </label>
            <a
              href="#"
              onClick={handleForgotPassword}
              className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <input
            type="password"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-md bg-accent hover:bg-accent-hover active:bg-accent-pressed text-white font-semibold transition-colors flex items-center justify-center text-sm shadow-sm"
        >
          {loading ? <Spinner size="sm" className="mr-2 border-t-white" /> : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[400px] flex flex-col items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
