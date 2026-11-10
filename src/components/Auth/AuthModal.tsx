'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SUPABASE_NOT_CONFIGURED_MESSAGE, useSupabaseClient } from '@/hooks/useSupabaseClient';
import { Profile, CreateProject } from '@/schemas/projectSchemas';

// ============================================================================
// Types
// ============================================================================

type AuthMode = 'login' | 'signup' | 'profile';

// ============================================================================
// Constants
// ============================================================================

const PROVIDERS = [
  { id: 'github', name: 'GitHub', icon: 'github' },
  { id: 'google', name: 'Google', icon: 'google' },
  { id: 'discord', name: 'Discord', icon: 'discord' },
] as const;

// ============================================================================
// Components
// ============================================================================

export function AuthModal() {
  const supabase = useSupabaseClient();
  const {
    user,
    isAuthenticated,
    isAuthModalOpen,
    setIsAuthModalOpen,
    login,
    logout,
    setAuthLoading,
    setAuthError,
    saveGuestDraft,
    loadGuestDraft,
    clearGuestDraft,
  } = useGameStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const visibleMode: AuthMode = isAuthenticated ? 'profile' : mode;

  // Close modal
  const closeModal = () => {
    setIsAuthModalOpen(false);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  // Handle OAuth login
  const handleOAuthLogin = async (provider: (typeof PROVIDERS)[number]['id']) => {
    if (!supabase) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save current draft to localStorage before redirecting
      const currentDraft = loadGuestDraft();
      if (currentDraft) {
        localStorage.setItem('pending-draft', JSON.stringify(currentDraft));
      }

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else if (data.url) {
        window.location.assign(data.url);
      }
    } catch (err) {
      setError('Failed to authenticate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else if (data.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          login(profile as Profile);
          closeModal();
          
          // Restore any pending draft
          const pendingDraft = localStorage.getItem('pending-draft');
          if (pendingDraft) {
            const draft = JSON.parse(pendingDraft) as CreateProject;
            saveGuestDraft(draft);
            localStorage.removeItem('pending-draft');
          }
        }
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email/password signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (authError) {
        setError(authError.message);
      } else if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            avatar_url: null,
          });

        if (profileError) {
          setError(profileError.message);
        } else {
          setSuccess('Account created! Please check your email to verify.');
          setMode('login');
          setEmail('');
          setPassword('');
          setUsername('');
        }
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (!supabase) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      logout();
      closeModal();
    } catch (err) {
      setError('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between login and signup
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  // OAuth Icon Component
  const OAuthIcon = ({ provider }: { provider: string }) => {
    const icons: Record<string, JSX.Element> = {
      github: (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
          />
        </svg>
      ),
      google: (
        <svg viewBox="0 0 24 24" width="20" height="20">
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
      ),
      discord: (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362.772 1.362a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
          />
        </svg>
      ),
    };

    return icons[provider] || <span className="oauth-icon">{provider}</span>;
  };

  // Render login form
  const renderLoginForm = () => (
    <form onSubmit={handleEmailLogin} className="auth-form">
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={toggleMode}
      >
        Don&apos;t have an account? Sign Up
      </button>
    </form>
  );

  // Render signup form
  const renderSignupForm = () => (
    <form onSubmit={handleEmailSignup} className="auth-form">
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your-username"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={toggleMode}
      >
        Already have an account? Sign In
      </button>
    </form>
  );

  // Render profile view
  const renderProfileView = () => (
    <div className="profile-view">
      <div className="profile-avatar">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="Profile" />
        ) : (
          <span className="avatar-placeholder">
            {user?.username?.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="profile-info">
        <h3>{user?.username}</h3>
        <p className="user-id">{user?.id}</p>
      </div>
      <button
        className="btn btn-danger btn-block"
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );

  // Don't render if modal is closed
  if (!isAuthModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {visibleMode === 'login' && 'Sign In'}
            {visibleMode === 'signup' && 'Create Account'}
            {visibleMode === 'profile' && 'Your Profile'}
          </h2>
          <button className="modal-close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="alert alert-success">
              <span className="alert-icon">✓</span>
              <span>{success}</span>
            </div>
          )}

          {/* OAuth Providers */}
          <div className="oauth-group">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                className="oauth-btn"
                onClick={() => handleOAuthLogin(provider.id)}
                disabled={isLoading}
              >
                <OAuthIcon provider={provider.id} />
                <span>Continue with {provider.name}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="divider">
            <span>or</span>
          </div>

          {/* Email/Password Forms */}
          {visibleMode === 'login' && renderLoginForm()}
          {visibleMode === 'signup' && renderSignupForm()}
          {visibleMode === 'profile' && renderProfileView()}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
