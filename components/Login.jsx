import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/lib/auth';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(() => {
    // Load saved email if "remember me" was used
    const savedEmail = localStorage.getItem('rememberedEmail');
    return savedEmail || '';
  });
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    // Check if remember me was previously set
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password, rememberMe);
      } else {
        await register(email, password, name, rememberMe);
      }
      
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate('/home');
    } catch (err) {
      // Extract error message from various possible error formats
      let errorMessage = 'An error occurred';
      
      if (err.response?.data) {
        // Handle different error response formats
        if (typeof err.response.data.error === 'string') {
          errorMessage = err.response.data.error;
        } else if (err.response.data.error?.message) {
          errorMessage = err.response.data.error.message;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#252525] rounded-lg p-8 border border-[#2A2A2A]" role="main" aria-label={isLogin ? "Login" : "Sign up"}>
        <h1 className="text-2xl font-semibold text-[#E0E0E0] mb-2">
          {isLogin ? 'Login' : 'Sign Up'}
        </h1>
        <p className="text-[#888888] mb-6">
          {isLogin ? 'Welcome back!' : 'Create your account'}
        </p>

        {error && (
          <div 
            className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm text-[#E0E0E0] mb-2">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:border-[#0070F3]"
                placeholder="Your name"
                aria-required="true"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm text-[#E0E0E0] mb-2">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:border-[#0070F3]"
              placeholder="you@example.com"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-[#E0E0E0] mb-2">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:border-[#0070F3]"
              placeholder="••••••••"
              aria-required="true"
              aria-describedby="password-requirements"
            />
            <p id="password-requirements" className="sr-only">Password must be at least 6 characters long</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A2A2A] text-[#0070F3] focus:ring-2 focus:ring-[#0070F3] bg-[#1E1E1E]"
              aria-label="Remember me on this device"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-[#E0E0E0] cursor-pointer">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md w-full focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525]"
            aria-label={loading ? 'Please wait...' : isLogin ? 'Login to your account' : 'Sign up for a new account'}
            aria-busy={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="btn btn-link btn-sm focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525]"
            aria-label={isLogin ? "Switch to sign up form" : "Switch to login form"}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
