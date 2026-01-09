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
      // Log full error for debugging
      console.error('Login error details:', {
        error: err,
        message: err.message,
        response: err.response,
        responseData: err.response?.data,
        status: err.response?.status,
        code: err.code,
      });
      
      // Extract error message from various possible error formats
      let errorMessage = 'An error occurred. Please try again.';
      
      // Handle timeout and network errors first
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.';
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.response) {
        // Server responded with an error
        const data = err.response.data;
        const status = err.response.status;
        
        if (status === 500) {
          errorMessage = 'Server error. The server encountered an unexpected error. Please try again later.';
        } else if (status === 503) {
          errorMessage = 'Service unavailable. The server is temporarily unavailable. Please try again later.';
        } else if (status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (status === 400) {
          errorMessage = 'Invalid request. Please check your input and try again.';
        }
        
        // Try to extract a more specific error message
        if (data) {
          // Handle string responses
          if (typeof data === 'string' && data.length > 1) {
            errorMessage = data;
          } 
          // Handle object responses
          else if (typeof data === 'object') {
            // Check for nested error object
            if (data.error) {
              if (typeof data.error === 'string' && data.error.length > 1) {
                errorMessage = data.error;
              } else if (data.error?.message && typeof data.error.message === 'string' && data.error.message.length > 1) {
                errorMessage = data.error.message;
              } else if (data.error?.code) {
                // If error is an object with code, use a more descriptive message
                errorMessage = `Server error (${data.error.code}). Please try again later.`;
              }
            }
            // Check for top-level message
            else if (data.message && typeof data.message === 'string' && data.message.length > 1) {
              errorMessage = data.message;
            }
            // Check for details array (from Zod validation)
            else if (data.details && Array.isArray(data.details) && data.details.length > 0) {
              const firstDetail = data.details[0];
              if (firstDetail.message) {
                errorMessage = firstDetail.message;
              }
            }
          }
        }
      } else if (err.message && err.message.length > 1) {
        // Only use err.message if it's meaningful (more than 1 character)
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
              autoComplete="email"
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
              autoComplete={isLogin ? "current-password" : "new-password"}
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
