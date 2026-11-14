/**
 * Keyboard inset that works with Android edge-to-edge (where the window no longer resizes for
 * the keyboard) and with the native tab bar under the screen.
 *
 * It measures where the screen's root view ends on the display and where the keyboard starts,
 * and returns the overlap. Pad the bottom of the screen by that amount and the input bar sits
 * right on top of the keyboard on both platforms.
 */
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type View } from 'react-native';

type ViewRef = ComponentRef<typeof View>;

export function useKeyboardInset() {
  const ref = useRef<ViewRef>(null);
  const [inset, setInset] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbTop = e.endCoordinates.screenY;
      setOpen(true);
      ref.current?.measureInWindow((_x, y, _w, h) => {
        // Root bottom below the keyboard top = the part the keyboard hides.
        const overlap = y + h - kbTop;
        setInset(Math.max(0, overlap > 0 ? overlap : 0));
      });
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      setOpen(false);
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { ref, inset, open };
}
