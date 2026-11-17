'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useGameStore } from '@/store/useGameStore';
import { CreateProject } from '@/schemas/projectSchemas';

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
  { label: 'Sprite Maker', href: '/art' },
  { label: 'Game Maker', href: '/rules' },
  { label: 'My Projects', href: '/projects' },
];

// ============================================================================
// Components
// ============================================================================

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { createNewProject, setActiveTab } = useGameStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const profileImage = user?.imageUrl ?? null;
  const displayName =
    user?.username ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    'Account';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => signOut({ redirectUrl: '/' });

  // Handle create new project
  const handleCreateNewProject = () => {
    const defaultProject: CreateProject = {
      title: 'Untitled Project',
      description: '',
      genre: 'Platformer',
      author_id: user?.id || null,
      is_published: false,
      is_template: false,
      project_data: {
        sprites: [
          {
            id: 'player_1_default',
            name: 'Player 1',
            role: 'player_1',
            resolution: 32,
            frames: {},
            hitbox: {
              shape: 'rectangle',
              width: 24,
              height: 32,
              offsetX: 0,
              offsetY: 0,
            },
          },
        ],
        level_data: {
          width: 10,
          height: 10,
          tile_size: 32,
          tiles: [],
        },
        mechanics_config: {
          player_1: { speed: 200, jump_force: 300, gravity: 800 },
          player_2: { speed: 200, jump_force: 300, gravity: 800 },
          win_condition: 'reach_goal',
        },
        economy_config: {},
        audio_config: {},
        version: '1.0.0',
      },
    };
    createNewProject(defaultProject);
    setActiveTab('art');
    router.push('/art');
  };

  // Check if link is active
  const isActive = (href: string) => {
    // Handle exact match
    if (pathname === href) return true;
    
    // Handle root path
    if (href === '/' && pathname === '/') return true;
    
    // Handle dynamic routes
    if (href.startsWith('/play/') && pathname.startsWith('/play/')) return true;
    if (href.startsWith('/art') && pathname.startsWith('/art')) return true;
    if (href.startsWith('/rules') && pathname.startsWith('/rules')) return true;
    if (href.startsWith('/studio/') && pathname.startsWith('/studio/')) return true;
    
    return false;
  };

  // Dynamic CTA based on auth state
  const renderCTA = () => {
    if (!isLoaded) {
      return <span className="auth-loading" aria-label="Loading account" />;
    }

    if (isSignedIn) {
      return (
        <>
          <button
            className="btn btn-primary btn-create"
            onClick={handleCreateNewProject}
          >
            <span className="btn-icon">+</span>
            <span>Create New Project</span>
          </button>
          <div className="user-menu">
            <button
              className="user-avatar"
              aria-label="Open account menu"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            >
              {profileImage ? (
                <img src={profileImage} alt="" />
              ) : (
                <span className="avatar-placeholder">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </button>
            {isAccountMenuOpen && (
              <div className="account-menu">
                <span className="account-menu-name">{displayName}</span>
                {user?.primaryEmailAddress?.emailAddress && (
                  <span className="account-menu-email">{user.primaryEmailAddress.emailAddress}</span>
                )}
                <button className="btn btn-small btn-outline" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </>
      );
    }
    
    return (
      <>
        <Link href="/sign-in" className="btn btn-outline">Sign In</Link>
        <Link href="/sign-up" className="btn btn-cta">Sign Up</Link>
      </>
    );
  };

  // Guest Sandbox Mode indicator
  const isInStudio = pathname.startsWith('/studio') || pathname.startsWith('/art') || pathname.startsWith('/rules');
  const showGuestCTA = isLoaded && !isSignedIn && isInStudio;

  return (
    <>
      {/* Navbar */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          {/* Logo */}
          <Link href="/" className="navbar-brand">
            <Image className="logo-image" src="/logo.svg" alt="CodeMechanic" width={204} height={50} priority />
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
            <Link className="btn btn-small btn-outline" href="/sign-up">Sign Up to Save</Link>
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
