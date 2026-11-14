/**
 * Keyboard inset that works with Android edge-to-edge (where the window no longer resizes for
 * the keyboard) and with the native tab bar under the screen.
 *
 * It measures where the screen's root view ends on the display and where the keyboard starts,
 * and returns the overlap. Pad the bottom of the screen by that amount and the input bar sits
 * right on top of the keyboard on both platforms.
 *
 * iOS also listens for frame changes (QuickType bar, emoji or another keyboard language), so
 * the input bar follows the keyboard when its height changes while it is open.
 */
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Keyboard, type KeyboardEvent, Platform, type View } from 'react-native';

type ViewRef = ComponentRef<typeof View>;

export function useKeyboardInset() {
  const ref = useRef<ViewRef>(null);
  const [inset, setInset] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const measure = (e: KeyboardEvent) => {
      const kbTop = e.endCoordinates.screenY;
      setOpen(true);
      ref.current?.measureInWindow((_x, y, _w, h) => {
        // Root bottom below the keyboard top = the part the keyboard hides.
        setInset(Math.max(0, y + h - kbTop));
      });
    };
    const subs = [
      Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboardDidShow', measure),
      Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboardDidHide', () => {
        setOpen(false);
        setInset(0);
      }),
    ];
    if (isIOS) {
      subs.push(
        Keyboard.addListener('keyboardWillChangeFrame', (e) => {
          // A frame change that moves the keyboard off screen is a hide; the hide event handles it.
          if (e.endCoordinates.height > 0 && Keyboard.isVisible()) measure(e);
        }),
      );
    }
    return () => subs.forEach((sub) => sub.remove());
  }, []);

  return { ref, inset, open };
}
