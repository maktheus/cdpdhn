import { create } from 'zustand';

/** Estado só de interface (não persiste). */
interface UiState {
  openRecordId: string | null;
  setOpenRecord: (id: string | null) => void;
  installPrompt: (Event & { prompt?: () => Promise<void> }) | null;
  setInstallPrompt: (e: UiState['installPrompt']) => void;
}

export const useUi = create<UiState>((set) => ({
  openRecordId: null,
  setOpenRecord: (id) => set({ openRecordId: id }),
  installPrompt: null,
  setInstallPrompt: (e) => set({ installPrompt: e })
}));
