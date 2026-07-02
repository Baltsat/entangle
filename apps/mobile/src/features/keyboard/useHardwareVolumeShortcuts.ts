import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { VolumeManager } from "react-native-volume-manager";

import { PROTOCOL_VERSION } from "@entangle/protocol";
import type { KeyCode } from "@entangle/protocol";

import { sendMessage } from "@/net/send";

const CENTER_VOLUME = 0.5;
const MIN_DELTA = 0.015;
const RESET_WINDOW_MS = 280;

export function useHardwareVolumeShortcuts(enabled: boolean) {
  const resettingUntilRef = useRef(0);
  const lastVolumeRef = useRef<number | null>(null);
  const activeRef = useRef(AppState.currentState === "active");

  useEffect(() => {
    if (Platform.OS !== "ios" || !enabled) return;

    let mounted = true;
    let listener: { remove: () => void } | null = null;

    const centerVolume = async () => {
      resettingUntilRef.current = Date.now() + RESET_WINDOW_MS;
      await VolumeManager.setVolume(CENTER_VOLUME, { showUI: false });
      lastVolumeRef.current = CENTER_VOLUME;
    };

    const safeCenterVolume = () => {
      centerVolume().catch(() => undefined);
    };

    const sendKeyTap = (code: KeyCode) => {
      sendMessage({
        v: PROTOCOL_VERSION,
        t: "k.key",
        code,
        phase: "tap",
        mods: 0,
      });
      void Haptics.selectionAsync();
    };

    const start = async () => {
      await VolumeManager.enable(true, true);
      await VolumeManager.setActive(true, true);
      await VolumeManager.showNativeVolumeUI({ enabled: false });
      const { volume } = await VolumeManager.getVolume();
      lastVolumeRef.current = volume;
      await centerVolume();

      if (!mounted) return;
      listener = VolumeManager.addVolumeListener(({ volume: nextVolume }) => {
        if (Date.now() < resettingUntilRef.current) {
          lastVolumeRef.current = nextVolume;
          return;
        }

        if (!activeRef.current) {
          lastVolumeRef.current = nextVolume;
          return;
        }

        const lastVolume = lastVolumeRef.current;
        lastVolumeRef.current = nextVolume;
        if (
          lastVolume == null ||
          Math.abs(nextVolume - lastVolume) < MIN_DELTA
        ) {
          return;
        }

        sendKeyTap(nextVolume < lastVolume ? "Fn" : "Return");
        void centerVolume();
      });
    };

    const appStateListener = AppState.addEventListener("change", (state) => {
      activeRef.current = state === "active";
      if (state === "active") {
        safeCenterVolume();
      }
    });

    start().catch(() => {
      listener?.remove();
      appStateListener.remove();
    });

    return () => {
      mounted = false;
      listener?.remove();
      appStateListener.remove();
      try {
        void VolumeManager.showNativeVolumeUI({ enabled: true });
        void VolumeManager.setActive(false, true);
        void VolumeManager.enable(false, true);
      } catch {}
    };
  }, [enabled]);
}
