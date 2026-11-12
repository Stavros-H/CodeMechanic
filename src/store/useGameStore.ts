import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, CreateProject, Profile } from '@/schemas/projectSchemas';

// ============================================================================
// Types
// ============================================================================

type AuthState = {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

type GameState = {
  currentProject: Project | null;
  isDirty: boolean;
  activeTab: 'art' | 'rules' | 'play' | 'hub' | 'explore';
  activeEntityId: string | null;
  remixSourceId: string | null; // Track which project was remixed
};

type UIState = {
  isSaveModalOpen: boolean;
  isRemixModalOpen: boolean;
};

type ActionTypes = {
  // Project actions
  setCurrentProject: (project: Project | null) => void;
  createNewProject: (project: CreateProject) => void;
  updateProject: (updates: Partial<Project>) => void;
  clearProject: () => void;
  
  // Dirty state
  setIsDirty: (isDirty: boolean) => void;
  markClean: () => void;
  
  // Tab navigation
  setActiveTab: (tab: GameState['activeTab']) => void;
  
  // Entity selection
  setActiveEntityId: (entityId: string | null) => void;
  
  // Remix tracking
  setRemixSourceId: (sourceId: string | null) => void;
  
  // Auth actions
  setAuthState: (state: Partial<AuthState>) => void;
  login: (user: Profile) => void;
  logout: () => void;
  setAuthLoading: (isLoading: boolean) => void;
  setAuthError: (error: string | null) => void;
  
  // UI actions
  setIsSaveModalOpen: (isOpen: boolean) => void;
  setIsRemixModalOpen: (isOpen: boolean) => void;
  
  // Navigation guard
  checkUnsavedChanges: () => boolean;
  
  // Guest draft persistence
  saveGuestDraft: (draft: CreateProject) => void;
  loadGuestDraft: () => CreateProject | null;
  clearGuestDraft: () => void;
  
  // Remix engine
  remixProject: (sourceProject: Project) => void;
  commitRemix: () => void;
  cancelRemix: () => void;
};

type GameStore = GameState & UIState & AuthState & ActionTypes;

// ============================================================================
// Initial State
// ============================================================================

const initialGameState: GameState = {
  currentProject: null,
  isDirty: false,
  activeTab: 'hub',
  activeEntityId: null,
  remixSourceId: null,
};

const initialUIState: UIState = {
  isSaveModalOpen: false,
  isRemixModalOpen: false,
};

const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ============================================================================
// Guest Draft Storage Key
// ============================================================================

const GUEST_DRAFT_KEY = 'codemechanic-guest-draft';

// ============================================================================
// Store Definition
// ============================================================================

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialGameState,
      ...initialUIState,
      ...initialAuthState,

      // ========================================================================
      // Project Actions
      // ========================================================================

      setCurrentProject: (project) => {
        set({ currentProject: project, isDirty: false });
      },

      createNewProject: (project) => {
        set({
          currentProject: { ...project } as Project,
          isDirty: true,
          activeTab: 'art',
          remixSourceId: null,
        });
      },

      updateProject: (updates) => {
        const current = get().currentProject;
        if (current) {
          set({
            currentProject: { ...current, ...updates },
            isDirty: true,
          });
        }
      },

      clearProject: () => {
        set({
          currentProject: null,
          isDirty: false,
          activeEntityId: null,
          remixSourceId: null,
        });
      },

      // ========================================================================
      // Dirty State Management
      // ========================================================================

      setIsDirty: (isDirty) => {
        set({ isDirty });
      },

      markClean: () => {
        set({ isDirty: false });
      },

      // ========================================================================
      // Tab Navigation
      // ========================================================================

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      // ========================================================================
      // Entity Selection
      // ========================================================================

      setActiveEntityId: (entityId) => {
        set({ activeEntityId: entityId });
      },

      // ========================================================================
      // Remix Tracking
      // ========================================================================

      setRemixSourceId: (sourceId) => {
        set({ remixSourceId: sourceId });
      },

      // ========================================================================
      // Auth Actions
      // ========================================================================

      setAuthState: (state) => {
        set((prev) => ({ ...prev, ...state }));
      },

      login: (user) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      setAuthLoading: (isLoading) => {
        set({ isLoading });
      },

      setAuthError: (error) => {
        set({ error });
      },

      // ========================================================================
      // UI Actions
      // ========================================================================

      setIsSaveModalOpen: (isOpen) => {
        set({ isSaveModalOpen: isOpen });
      },

      setIsRemixModalOpen: (isOpen) => {
        set({ isRemixModalOpen: isOpen });
      },

      // ========================================================================
      // Navigation Guard
      // ========================================================================

      checkUnsavedChanges: () => {
        return get().isDirty;
      },

      // ========================================================================
      // Guest Draft Persistence
      // ========================================================================

      saveGuestDraft: (draft) => {
        localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
      },

      loadGuestDraft: () => {
        const draft = localStorage.getItem(GUEST_DRAFT_KEY);
        return draft ? JSON.parse(draft) : null;
      },

      clearGuestDraft: () => {
        localStorage.removeItem(GUEST_DRAFT_KEY);
      },

      // ========================================================================
      // Remix Engine (Write-on-Save)
      // ========================================================================

      remixProject: (sourceProject) => {
        const { id, author_id, created_at, updated_at, play_count, like_count, ...rest } = sourceProject;
        
        // Create a new client-side UUID for the remix
        const remixId = crypto.randomUUID();
        
        // Clone the project into Zustand state WITHOUT database write
        const remixedProject: Project = {
          ...rest,
          id: remixId,
          title: `${rest.title} (Remix)`,
          author_id: null, // Will be set on save
          remixed_from_id: id,
          is_published: false,
          is_template: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          play_count: 0,
          like_count: 0,
        };

        set({
          currentProject: remixedProject,
          isDirty: true,
          activeTab: 'art',
          remixSourceId: id,
        });
      },

      commitRemix: () => {
        // Mark as clean after successful save to database
        set({ isDirty: false, remixSourceId: null });
      },

      cancelRemix: () => {
        // Discard remix and return to original state
        set({
          currentProject: null,
          isDirty: false,
          remixSourceId: null,
          activeTab: 'hub',
        });
      },
    }),
    {
      name: 'game-store',
      partialize: (state) => ({
        // Only persist guest draft and remix state to localStorage
        currentProject: state.currentProject,
        isDirty: state.isDirty,
        activeTab: state.activeTab,
        activeEntityId: state.activeEntityId,
        remixSourceId: state.remixSourceId,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCurrentProject = () => useGameStore((state) => state.currentProject);
export const useIsDirty = () => useGameStore((state) => state.isDirty);
export const useActiveTab = () => useGameStore((state) => state.activeTab);
export const useActiveEntityId = () => useGameStore((state) => state.activeEntityId);
export const useRemixSourceId = () => useGameStore((state) => state.remixSourceId);
export const useAuthState = () => useGameStore((state) => state);
export const useIsAuthenticated = () => useGameStore((state) => state.isAuthenticated);
export const useUser = () => useGameStore((state) => state.user);

// ============================================================================
// Export
// ============================================================================

export type { GameStore, AuthState, GameState, UIState };
