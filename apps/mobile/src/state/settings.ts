import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { KeyCode } from '@entangle/protocol';

export type VolumeShortcutAction = 'off' | KeyCode;

interface SettingsState {
  pointerSensitivity: number;
  naturalScroll: boolean;
  volumeDownAction: VolumeShortcutAction;
  volumeUpAction: VolumeShortcutAction;
  volumeHaptics: boolean;
  setPointerSensitivity: (value: number) => void;
  setNaturalScroll: (value: boolean) => void;
  setVolumeDownAction: (value: VolumeShortcutAction) => void;
  setVolumeUpAction: (value: VolumeShortcutAction) => void;
  setVolumeHaptics: (value: boolean) => void;
}

export const usePointerSensitivityRef = { current: 1.5 };
export const useNaturalScrollRef = { current: true };

function syncRefs(state: Pick<SettingsState, 'pointerSensitivity' | 'naturalScroll'>) {
  usePointerSensitivityRef.current = state.pointerSensitivity;
  useNaturalScrollRef.current = state.naturalScroll;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      pointerSensitivity: 1.5,
      naturalScroll: true,
      volumeDownAction: 'Fn',
      volumeUpAction: 'Return',
      volumeHaptics: true,
      setPointerSensitivity: (value) => {
        usePointerSensitivityRef.current = value;
        set({ pointerSensitivity: value });
      },
      setNaturalScroll: (value) => {
        useNaturalScrollRef.current = value;
        set({ naturalScroll: value });
      },
      setVolumeDownAction: (value) => set({ volumeDownAction: value }),
      setVolumeUpAction: (value) => set({ volumeUpAction: value }),
      setVolumeHaptics: (value) => set({ volumeHaptics: value }),
    }),
    {
      name: 'entangle.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pointerSensitivity: state.pointerSensitivity,
        naturalScroll: state.naturalScroll,
        volumeDownAction: state.volumeDownAction,
        volumeUpAction: state.volumeUpAction,
        volumeHaptics: state.volumeHaptics,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncRefs(state);
        }
      },
    },
  ),
);
