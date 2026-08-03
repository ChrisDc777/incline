import { ReactNode, useRef, useCallback, useEffect } from 'react';
import BottomSheetModal, { BottomSheetView, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';

import { Text } from './text';

export function Sheet({
  open,
  onOpenChange,
  title,
  snapPoints = ['45%', '75%'],
  scroll = false,
  dynamicSizing = true,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  snapPoints?: (string | number)[];
  scroll?: boolean;
  dynamicSizing?: boolean;
  children: ReactNode;
}) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const wasOpenRef = useRef(open);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    // Only act on real toggles — never fire present()/dismiss() on the initial
    // mount (the sheet starts closed). Doing so on mount is what caused the
    // "opens then immediately closes" flash when a screen with sheets loaded.
    const prev = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open === prev) return;

    // Defer to the next frame: @expo/ui's BottomSheetModal forwards the ref
    // through a nested component, and calling present()/dismiss() synchronously
    // here can fire its internal setIsOpen before the inner component commits
    // ("can't perform a React state update on a component that hasn't mounted").
    const frame = requestAnimationFrame(() => {
      if (open) {
        sheetRef.current?.present();
      } else {
        sheetRef.current?.dismiss();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const Content = scroll ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={dynamicSizing}
      enablePanDownToClose
      onClose={handleClose}>
      <Content style={{ padding: 20 }}>
        {title ? <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>{title}</Text> : null}
        {children}
      </Content>
    </BottomSheetModal>
  );
}
