'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // 1. Authenticate credentials with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMessage(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const userEmail = authData.user.email?.toLowerCase();

      // 2. Fetch the user's role from allowed_users table
      const { data: userData } = await supabase
        .from('allowed_users')
        .select('role')
        .eq('email', userEmail)
        .single();

      // 3. Role-based redirection
      if (userData?.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xs border border-slate-200/80 p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-center tracking-tight text-slate-900">
            Welcome Back
          </h2>
          <p className="text-sm text-center text-slate-500 mt-1">
            Log in to access your word processor workspace
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          <span>Don&apos;t have an account? </span>
          <Link href="/signup" className="text-blue-600 hover:underline font-semibold">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
