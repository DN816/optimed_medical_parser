import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Scan, ArrowRight, Lock, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid credentials or user not found. (Hint: try admin@optimed.com)');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl mb-4 text-blue-600">
            <Scan className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to your organization workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Secure login
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-center text-slate-400 uppercase tracking-wider mb-3">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button onClick={() => setEmail('admin@optimed.com')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 border border-slate-200">
              <span className="font-bold block text-blue-600">Admin</span>
              admin@optimed.com
            </button>
            <button onClick={() => setEmail('reviewer@optimed.com')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 border border-slate-200">
              <span className="font-bold block text-purple-600">Reviewer</span>
              reviewer@optimed.com
            </button>
            <button onClick={() => setEmail('viewer@optimed.com')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 border border-slate-200">
              <span className="font-bold block text-slate-600">Viewer</span>
              viewer@optimed.com
            </button>
            <button onClick={() => setEmail('admin@citypharma.com')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 border border-slate-200">
              <span className="font-bold block text-orange-600">Org 2 Admin</span>
              admin@citypharma.com
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
