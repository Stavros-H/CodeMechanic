'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { useGameStore } from '@/store/useGameStore';
import { Profile } from '@/schemas/projectSchemas';

// ============================================================================
// Auth Callback Page
// Handles the redirect from OAuth providers
// ============================================================================

export default function AuthCallback() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { login, saveGuestDraft, loadGuestDraft } = useGameStore();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        if (!supabase) {
          router.push('/');
          return;
        }

        // Get the session
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          console.error('No session found:', error);
          router.push('/');
          return;
        }

        // Get the user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          router.push('/');
          return;
        }

        // Login the user
        login(profile as Profile);

        // Restore any pending draft from localStorage
        const pendingDraft = localStorage.getItem('pending-draft');
        if (pendingDraft) {
          const draft = JSON.parse(pendingDraft);
          saveGuestDraft(draft);
          localStorage.removeItem('pending-draft');
          
          // Redirect to studio to continue editing
          router.push('/studio/art');
        } else {
          // Redirect to home
          router.push('/');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        router.push('/');
      }
    };

    handleAuth();
  }, [supabase, router, login, saveGuestDraft]);

  return (
    <div className="callback-page">
      <div className="callback-content">
        <div className="spinner" />
        <h2>Authenticating...</h2>
        <p>Please wait while we complete your login.</p>
      </div>
    </div>
  );
}
