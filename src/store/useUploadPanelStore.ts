import { create } from "zustand";

interface UploadPanelState {
  isOpen: boolean;
  pinned: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  togglePin: () => void;
}

export const useUploadPanelStore = create<UploadPanelState>((set) => ({
  isOpen: false,
  pinned: false,
  open: () => set({ isOpen: true }),
  close: () =>
    set({
      isOpen: false,
      pinned: false,
    }),
  toggle: () => set((s: UploadPanelState) => ({ isOpen: !s.isOpen })),
  togglePin: () =>
    set((s: UploadPanelState) => ({
      pinned: !s.pinned,
      isOpen: !s.pinned || s.isOpen,
    })),
}));
