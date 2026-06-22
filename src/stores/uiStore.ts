import { create } from 'zustand';

type RightPanelType = 'user_info' | 'group_info' | null;

interface UIState {
  rightPanelOpen: boolean;
  rightPanelType: RightPanelType;
  activeModals: Record<string, boolean>;
  isMobileView: boolean;
  isSidebarVisible: boolean; // Relevant on mobile to decide if sidebar or chat is shown
  searchQuery: string;

  setRightPanel: (open: boolean, type?: RightPanelType) => void;
  setModal: (modalName: string, isOpen: boolean) => void;
  setIsMobileView: (isMobile: boolean) => void;
  setIsSidebarVisible: (isVisible: boolean) => void;
  setSearchQuery: (query: string) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  rightPanelOpen: false,
  rightPanelType: null,
  activeModals: {},
  isMobileView: false,
  isSidebarVisible: true,
  searchQuery: '',

  setRightPanel: (open, type = null) =>
    set({ rightPanelOpen: open, rightPanelType: open ? type : null }),
  setModal: (modalName, isOpen) =>
    set((state) => ({
      activeModals: { ...state.activeModals, [modalName]: isOpen },
    })),
  setIsMobileView: (isMobile) => set({ isMobileView: isMobile }),
  setIsSidebarVisible: (isVisible) => set({ isSidebarVisible: isVisible }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  closeAllModals: () => set({ activeModals: {} }),
}));
