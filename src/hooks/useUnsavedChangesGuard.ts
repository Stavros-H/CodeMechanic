import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';

/**
 * Hook to guard against unsaved changes when navigating away
 * Shows a confirmation modal if there are unsaved changes
 */
export function useUnsavedChangesGuard() {
  const router = useRouter();
  const { isDirty, setIsSaveModalOpen, markClean, clearProject } = useGameStore();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (isDirty) {
        // Show save modal and prevent navigation
        setIsSaveModalOpen(true);
        
        // Store the intended navigation URL
        sessionStorage.setItem('pendingNavigation', url);
        
        // Prevent the route change
        router.events.emit('routeChangeError');
        
        // Scroll to top of modal
        window.scrollTo(0, 0);
        
        return false;
      }
      return true;
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Listen for route changes
    router.events.on('routeChangeStart', handleRouteChange);
    
    // Listen for browser close/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, router, setIsSaveModalOpen]);

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

  return { continueNavigation };
}
