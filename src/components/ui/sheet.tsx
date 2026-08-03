import { ReactNode, useCallback } from 'react';
import { BottomSheet, BottomSheetView, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';

import { Text } from './text';

/**
 * Modal bottom sheet controlled declaratively via `open`.
 *
 * Closed sheets render `index={-1}`, which the native sheet treats as fully
 * dismissed (renders nothing), so only the sheet that is actually open can
 * ever be visible — there is no imperative present()/dismiss() bookkeeping
 * that could open several sheets at once.
 */
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
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const Content = scroll ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheet
      index={open ? 0 : -1}
      snapPoints={snapPoints}
      enableDynamicSizing={dynamicSizing}
      enablePanDownToClose
      onClose={handleClose}>
      <Content style={{ padding: 20 }}>
        {title ? <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>{title}</Text> : null}
        {children}
      </Content>
    </BottomSheet>
  );
}
