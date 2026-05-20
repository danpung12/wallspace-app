import { create } from 'zustand';

type AuthFlowState = {
  authHydrationPending: boolean;
  navTransitionPending: boolean;
  setAuthHydrationPending: (v: boolean) => void;
  setNavTransitionPending: (v: boolean) => void;
};

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  authHydrationPending: false,
  navTransitionPending: false,
  setAuthHydrationPending: (v) => set({ authHydrationPending: v }),
  setNavTransitionPending: (v) => set({ navTransitionPending: v }),
}));
