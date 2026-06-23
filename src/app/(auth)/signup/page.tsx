'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';
import { Check, X } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { signup, loading } = useAuth();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Username Availability Checker
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    if (username.length < 3 || username.length > 32) {
      setUsernameStatus('invalid');
      setUsernameMessage('Length must be between 3 and 32 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Lowercase letters, numbers, and underscores only');
      return;
    }

    setUsernameStatus('checking');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setUsernameStatus('taken');
          setUsernameMessage('Username taken');
        } else {
          setUsernameStatus('available');
          setUsernameMessage('Username available');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [username]);

  // Password Strength Meter
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    setPasswordStrength(strength);
  }, [password]);

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 1:
        return 'bg-danger';
      case 2:
        return 'bg-warning';
      case 3:
        return 'bg-accent/70';
      case 4:
        return 'bg-success';
      default:
        return 'bg-border';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !displayName || !username) {
      setError('Please fill in all required fields');
      return;
    }

    if (usernameStatus === 'checking') {
      setError('Still checking username availability — please wait a moment');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('That username is already taken — please choose another');
      return;
    }

    if (usernameStatus === 'invalid') {
      setError(usernameMessage || 'Username is invalid');
      return;
    }

    if (usernameStatus === 'idle' || usernameStatus !== 'available') {
      // Trigger the check manually by re-setting username
      setError('Please type your username to check availability');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength < 2) {
      setError('Password is too weak');
      return;
    }

    try {
      await signup(email, password, displayName, username.toLowerCase(), phone);
    } catch (err: any) {
      console.error('Signup error:', err);
      const errorMsg = typeof err === 'string' 
        ? err 
        : err.message || (err.error_description) || JSON.stringify(err) || 'Failed to create account';
      setError(errorMsg);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[400px] flex flex-col items-center py-6"
    >
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
        Create an account
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        Sign up to start sharing moments in SparkChat
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-3.5">
        {error && (
          <div className="text-danger text-sm font-medium bg-danger/10 border border-danger/20 rounded-md p-3 text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Display name *
          </label>
          <input
            type="text"
            value={displayName}
            disabled={loading}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-text-secondary">
              Username *
            </label>
            {usernameStatus !== 'idle' && (
              <span
                className={`text-2xs font-semibold flex items-center gap-1 ${
                  usernameStatus === 'available'
                    ? 'text-success'
                    : usernameStatus === 'checking'
                    ? 'text-text-secondary'
                    : 'text-danger'
                }`}
              >
                {usernameStatus === 'checking' && <Spinner size="sm" />}
                {usernameStatus === 'available' && <Check size={12} />}
                {usernameStatus === 'taken' && <X size={12} />}
                {usernameStatus === 'invalid' && <X size={12} />}
                {usernameMessage}
              </span>
            )}
          </div>
          <input
            type="text"
            value={username}
            disabled={loading}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
            className="w-full px-4 py-2.5 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="johndoe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Email address *
          </label>
          <input
            type="email"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="john@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Phone number (optional)
          </label>
          <input
            type="tel"
            value={phone}
            disabled={loading}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="+1 555 123 4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Password *
          </label>
          <input
            type="password"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="••••••••"
            required
          />
          {/* Password strength indicators */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-4 gap-1 h-1.5">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={`h-full rounded-full transition-colors ${
                      index <= passwordStrength ? getStrengthColor() : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <span className="text-2xs text-text-secondary">
                {passwordStrength === 1 && 'Weak password'}
                {passwordStrength === 2 && 'Fair password'}
                {passwordStrength === 3 && 'Strong password'}
                {passwordStrength === 4 && 'Excellent password'}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Confirm password *
          </label>
          <input
            type="password"
            value={confirmPassword}
            disabled={loading}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-input border border-border text-text-primary placeholder-text-placeholder focus:outline-none focus:border-accent transition-colors disabled:opacity-50 text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold transition-colors flex items-center justify-center text-sm shadow-sm disabled:opacity-50"
        >
          {loading ? <Spinner size="sm" className="mr-2 border-t-white" /> : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
