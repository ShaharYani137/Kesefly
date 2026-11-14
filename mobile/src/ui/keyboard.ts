/**
 * Keyboard inset that works with Android edge-to-edge (where the window no longer resizes for
 * the keyboard) and with the native tab bar under the screen.
 *
 * It measures where the screen's root view ends on the display and where the keyboard starts,
 * and returns the overlap. Pad the bottom of the screen by that amount and the input bar sits
 * right on top of the keyboard on both platforms.
 *
 * The root must end at the visible bottom of the screen (above a tab bar). On iOS the native
 * tab bar overlays the screen, so screens inside tabs pad the bottom safe-area edge first.
 * iOS: the padding change follows the keyboard animation (LayoutAnimation, same duration).
 * iOS also re-measures on frame changes (QuickType bar, emoji keyboard).
 */
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Keyboard, type KeyboardEvent, LayoutAnimation, Platform, type View } from 'react-native';

type ViewRef = ComponentRef<typeof View>;

export function useKeyboardInset() {
  const ref = useRef<ViewRef>(null);
  const [inset, setInset] = useState(0);
  const [open, setOpen] = useState(false);
  // Set by show / hide: a measure that lands after the keyboard closed is ignored.
  const visible = useRef(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animate = (e: KeyboardEvent) => {
      if (Platform.OS === 'ios' && e.duration) {
        LayoutAnimation.configureNext({ duration: e.duration, update: { type: LayoutAnimation.Types.keyboard } });
      }
    };
    const measure = (e: KeyboardEvent) => {
      const kbTop = e.endCoordinates.screenY;
      ref.current?.measureInWindow((_x, y, _w, h) => {
        if (!visible.current) return;
        // Root bottom below the keyboard top = the part the keyboard hides.
        const overlap = y + h - kbTop;
        animate(e);
        setInset(Math.max(0, overlap));
      });
    };
    const show = Keyboard.addListener(showEvt, (e) => {
      visible.current = true;
      setOpen(true);
      measure(e);
    });
    const change = Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillChangeFrame', (e) => visible.current && measure(e)) : null;
    const hide = Keyboard.addListener(hideEvt, (e) => {
      visible.current = false;
      animate(e);
      setOpen(false);
      setInset(0);
    });
    return () => {
      show.remove();
      change?.remove();
      hide.remove();
    };
  }, []);

  return { ref, inset, open };
}
