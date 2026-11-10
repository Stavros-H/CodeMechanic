import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import type { MouseEvent } from 'react';

/**
 * Hook to guard against unsaved changes when navigating away
 * Shows a confirmation modal if there are unsaved changes
 */
export function useUnsavedChangesGuard() {
  const router = useRouter();
  const { isDirty, setIsSaveModalOpen, markClean, clearProject } = useGameStore();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const guardNavigation = (url: string) => {
    if (!useGameStore.getState().isDirty) {
      router.push(url);
      return;
    }

    sessionStorage.setItem('pendingNavigation', url);
    setIsSaveModalOpen(true);
    window.scrollTo(0, 0);
  };

  const handleNavigationClick = (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin) return;

    const url = `${destination.pathname}${destination.search}${destination.hash}`;
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;

    if (useGameStore.getState().isDirty) {
      event.preventDefault();
      guardNavigation(url);
    }
  };

  /**
   * Continue navigation after user decision
   * @param shouldSave - Whether to save changes before navigating
   */
  const continueNavigation = (shouldSave: boolean) => {
    const pendingUrl = sessionStorage.getItem('pendingNavigation');
    
    if (shouldSave) {
      // Mark as clean (actual save would be handled by parent component)
      markClean();
    } else {
      // Discard changes
      clearProject();
    }
    
    // Clear the pending navigation
    sessionStorage.removeItem('pendingNavigation');
    
    // Continue to the intended URL
    if (pendingUrl) {
      router.push(pendingUrl);
    }
  };

  return { continueNavigation, guardNavigation, handleNavigationClick };
}

/**
 * Use for imperative navigation from buttons so it follows the same dirty-state guard.
 */
export function useGuardedNavigation() {
  const router = useRouter();
  const setIsSaveModalOpen = useGameStore((state) => state.setIsSaveModalOpen);

  const navigateTo = (url: string) => {
    if (!useGameStore.getState().isDirty) {
      router.push(url);
      return;
    }

    sessionStorage.setItem('pendingNavigation', url);
    setIsSaveModalOpen(true);
    window.scrollTo(0, 0);
  };

  return { navigateTo };
}
