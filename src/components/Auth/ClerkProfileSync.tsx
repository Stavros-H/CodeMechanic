'use client';

import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useGameStore } from '@/store/useGameStore';

export function ClerkProfileSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const hasUser = Boolean(user);
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const username = (
    user?.username ||
    user?.fullName ||
    email.split('@')[0] ||
    userId ||
    'Player'
  ).slice(0, 50);
  const avatarUrl = user?.imageUrl || undefined;
  const login = useGameStore((state) => state.login);
  const logout = useGameStore((state) => state.logout);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !hasUser || !userId) {
      if (useGameStore.getState().isAuthenticated) logout();
      return;
    }

    login({
      id: userId,
      username,
      avatar_url: avatarUrl,
    });

    void fetch('/api/profile', { method: 'POST' }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        console.error(
          'Unable to sync the CodeMechanic profile.',
          result?.error ?? response.statusText,
        );
      }
    }).catch((error: unknown) => {
      console.error('Unable to reach the CodeMechanic profile service.', error);
    });
  }, [
    isLoaded,
    isSignedIn,
    hasUser,
    userId,
    user?.id,
    user?.username,
    user?.fullName,
    user?.imageUrl,
    user?.primaryEmailAddress?.emailAddress,
    username,
    avatarUrl,
    email,
    login,
    logout,
  ]);

  return null;
}
