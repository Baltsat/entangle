import { forwardRef, useRef, useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import { ModFlags, PROTOCOL_VERSION } from "@entangle/protocol";
import type { KeyCode } from "@entangle/protocol";

import { sendMessage } from "@/net/send";

export interface HiddenInputHandle {
  focus: () => void;
  blur: () => void;
}

export const HiddenInput = forwardRef<
  TextInput,
  { onFocusChange?: (focused: boolean) => void; inputAccessoryViewID?: string }
>(({ onFocusChange, inputAccessoryViewID }, ref) => {
  const [buffer, setBuffer] = useState("");
  const lastRef = useRef("");

  const handleChangeText = (next: string) => {
    const previous = lastRef.current;
    if (next.length > previous.length && next.startsWith(previous)) {
      const added = next.slice(previous.length);
      sendAddedText(added);
    } else if (next.length < previous.length && previous.startsWith(next)) {
      const removed = previous.length - next.length;
      for (let i = 0; i < removed; i += 1) {
        sendMessage({
          v: PROTOCOL_VERSION,
          t: "k.key",
          code: "Backspace",
          phase: "tap",
          mods: ModFlags.None,
        });
      }
    } else {
      const common = commonPrefixLength(previous, next);
      const removed = previous.length - common;
      for (let i = 0; i < removed; i += 1) {
        sendMessage({
          v: PROTOCOL_VERSION,
          t: "k.key",
          code: "Backspace",
          phase: "tap",
          mods: ModFlags.None,
        });
      }
      const added = next.slice(common);
      if (added) {
        sendAddedText(added);
      }
    }
    lastRef.current = next;
    setBuffer(next);
  };

  return (
    <TextInput
      ref={ref}
      value={buffer}
      onChangeText={handleChangeText}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
      multiline
      caretHidden
      style={styles.hidden}
      keyboardAppearance="dark"
      inputAccessoryViewID={inputAccessoryViewID}
    />
  );
});
HiddenInput.displayName = "HiddenInput";

function sendAddedText(text: string) {
  let chunkStart = 0;
  for (let idx = 0; idx < text.length; idx += 1) {
    if (text[idx] !== "\n") continue;
    if (chunkStart < idx) {
      sendMessage({
        v: PROTOCOL_VERSION,
        t: "k.text",
        text: text.slice(chunkStart, idx),
      });
    }
    sendKeyTap("Return");
    chunkStart = idx + 1;
  }
  if (chunkStart < text.length) {
    sendMessage({
      v: PROTOCOL_VERSION,
      t: "k.text",
      text: text.slice(chunkStart),
    });
  }
}

function sendKeyTap(code: KeyCode) {
  sendMessage({
    v: PROTOCOL_VERSION,
    t: "k.key",
    code,
    phase: "tap",
    mods: ModFlags.None,
  });
}

function commonPrefixLength(a: string, b: string) {
  const limit = Math.min(a.length, b.length);
  let idx = 0;
  while (idx < limit && a.charCodeAt(idx) === b.charCodeAt(idx)) {
    idx += 1;
  }
  return idx;
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1,
    left: 0,
    top: 0,
  },
});
