'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { Profile } from '@/schemas/projectSchemas';

// ============================================================================
// Types
// ============================================================================

type NavLink = {
  label: string;
  href: string;
  icon?: JSX.Element;
};

// ============================================================================
// Constants
// ============================================================================

const NAV_LINKS: NavLink[] = [
  { label: 'Arcade Hub', href: '/' },
  { label: 'Explore Directory', href: '/explore' },
  { label: 'My Projects', href: '/projects' },
];

// ============================================================================
// Components
// ============================================================================

export function Navbar() {
  const pathname = usePathname();
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
  } = useGameStore();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load profile image
  useEffect(() => {
    if (user?.avatar_url) {
      setProfileImage(user.avatar_url);
    }
  }, [user]);

  // Handle login
  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setAuthError('Failed to authenticate. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
      logout();
    } catch (err) {
      setAuthError('Failed to logout. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Check if link is active
  const isActive = (href: string) => {
    // Handle exact match
    if (pathname === href) return true;
    
    // Handle root path
    if (href === '/' && pathname === '/') return true;
    
    // Handle dynamic routes
    if (href.startsWith('/play/') && pathname.startsWith('/play/')) return true;
    if (href.startsWith('/studio/') && pathname.startsWith('/studio/')) return true;
    
    return false;
  };

  // Dynamic CTA based on auth state
  const renderCTA = () => {
    if (isAuthenticated) {
      return (
        <>
          <Link
            href="/studio/art"
            className="btn btn-primary btn-create"
          >
            <span className="btn-icon">+</span>
            <span>Create New Project</span>
          </Link>
          <div className="user-menu">
            <button className="user-avatar" onClick={() => setIsAuthModalOpen(true)}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" />
              ) : (
                <span className="avatar-placeholder">{user?.username?.charAt(0).toUpperCase()}</span>
              )}
            </button>
          </div>
        </>
      );
    }
    
    // Guest mode - show Sign Up to Save CTA
    return (
      <button
        className="btn btn-cta"
        onClick={handleLogin}
        disabled={false}
      >
        <span>Sign Up to Save</span>
      </button>
    );
  };

  // Guest Sandbox Mode indicator
  const isInStudio = pathname.startsWith('/studio');
  const showGuestCTA = !isAuthenticated && isInStudio;

  return (
    <>
      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Account</h2>
              <button
                className="modal-close"
                onClick={() => setIsAuthModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {isAuthenticated ? (
                <>
                  <div className="user-info">
                    {profileImage && (
                      <img src={profileImage} alt="Profile" className="user-avatar-large" />
                    )}
                    <div className="user-details">
                      <h3>{user?.username}</h3>
                      <p>{user?.id}</p>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <p>Sign in to save your projects and access all features.</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleLogin}
                  >
                    Sign In with GitHub
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          {/* Logo */}
          <Link href="/" className="navbar-brand">
            <span className="logo-icon">
              <span className="logo-square logo-square-1" />
              <span className="logo-square logo-square-2" />
              <span className="logo-square logo-square-3" />
              <span className="logo-square logo-square-4" />
            </span>
            <span className="logo-text">CodeMechanic</span>
          </Link>

          {/* Navigation Links */}
          <div className="navbar-links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
              >
                {link.icon && <span className="nav-icon">{link.icon}</span>}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="navbar-cta">
            {renderCTA()}
          </div>
        </div>

        {/* Guest Sandbox Mode indicator */}
        {showGuestCTA && (
          <div className="guest-banner">
            <span className="guest-icon">👤</span>
            <span>Guest Sandbox Mode</span>
            <button className="btn btn-small btn-outline" onClick={handleLogin}>
              Sign Up to Save
            </button>
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
