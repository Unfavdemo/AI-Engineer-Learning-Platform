import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../components/App'
import '../components/styles/globals.css'

// Apply dark mode preference immediately on page load (before React mounts)
// This prevents flash of wrong theme
const savedDarkMode = localStorage.getItem('darkMode');
const shouldUseDarkMode = savedDarkMode !== null ? savedDarkMode === 'true' : true;
if (shouldUseDarkMode) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Intercept console errors to suppress browser extension errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(' ').toLowerCase();
  // Suppress browser extension errors
  if (
    errorMessage.includes('message channel') ||
    errorMessage.includes('extension context invalidated') ||
    errorMessage.includes('listener indicated an asynchronous response') ||
    errorMessage.includes('channel closed') ||
    errorMessage.includes('before a response was received') ||
    errorMessage.includes('response by returning true') ||
    (errorMessage.includes('listener') && errorMessage.includes('asynchronous') && errorMessage.includes('response'))
  ) {
    // Silently ignore
    return;
  }
  // Log other errors normally
  originalConsoleError.apply(console, args);
};

// Handle unhandled promise rejections to prevent console errors from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  const errorString = String(errorMessage).toLowerCase();
  
  // Ignore errors from browser extensions (these often cause the message channel error)
  // Check for various patterns that indicate browser extension errors
  if (
    errorString.includes('message channel') ||
    errorString.includes('extension context invalidated') ||
    errorString.includes('receiving end does not exist') ||
    errorString.includes('message port closed') ||
    errorString.includes('listener indicated an asynchronous response') ||
    errorString.includes('channel closed') ||
    errorString.includes('async response') ||
    errorString.includes('before a response was received') ||
    errorString.includes('response by returning true') ||
    // Check the error type as well
    (event.reason?.name === 'Error' && errorString.includes('channel')) ||
    // Check if it's specifically the async response error
    (errorString.includes('listener') && errorString.includes('asynchronous') && errorString.includes('response'))
  ) {
    // Prevent the error from being logged to console
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  
  // Log other unhandled rejections for debugging (but not in production)
  if (import.meta.env.DEV || process.env.NODE_ENV === 'development') {
    // Only log if it's not a network error that we're already handling
    if (!errorString.includes('network error') && !errorString.includes('connection refused')) {
      console.warn('Unhandled promise rejection:', event.reason);
    }
  }
});

// Also handle general errors from browser extensions
window.addEventListener('error', (event) => {
  const errorMessage = event.message || event.error?.message || '';
  const errorString = String(errorMessage).toLowerCase();
  
  // Suppress browser extension errors
  if (
    errorString.includes('message channel') ||
    errorString.includes('extension context invalidated') ||
    errorString.includes('listener indicated an asynchronous response') ||
    errorString.includes('channel closed') ||
    errorString.includes('async response') ||
    errorString.includes('before a response was received') ||
    errorString.includes('response by returning true') ||
    (errorString.includes('listener') && errorString.includes('asynchronous') && errorString.includes('response'))
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
  
  // Allow other errors to be handled normally
  return true;
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        // Suppress browser extension errors from React Query
        const errorMessage = error?.message || error?.toString() || '';
        const errorString = String(errorMessage).toLowerCase();
        if (
          errorString.includes('message channel') ||
          errorString.includes('extension context invalidated') ||
          errorString.includes('listener indicated an asynchronous response') ||
          errorString.includes('channel closed') ||
          errorString.includes('before a response was received') ||
          errorString.includes('response by returning true') ||
          (errorString.includes('listener') && errorString.includes('asynchronous') && errorString.includes('response'))
        ) {
          // Silently ignore extension errors
          return;
        }
        // Log other errors only in development
        if (import.meta.env.DEV) {
          console.error('React Query error:', error);
        }
      },
    },
    mutations: {
      onError: (error) => {
        // Suppress browser extension errors from React Query mutations
        const errorMessage = error?.message || error?.toString() || '';
        const errorString = String(errorMessage).toLowerCase();
        if (
          errorString.includes('message channel') ||
          errorString.includes('extension context invalidated') ||
          errorString.includes('listener indicated an asynchronous response') ||
          errorString.includes('channel closed') ||
          errorString.includes('before a response was received') ||
          errorString.includes('response by returning true') ||
          (errorString.includes('listener') && errorString.includes('asynchronous') && errorString.includes('response'))
        ) {
          // Silently ignore extension errors
          return;
        }
        // Log other errors only in development
        if (import.meta.env.DEV) {
          console.error('React Query mutation error:', error);
        }
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
