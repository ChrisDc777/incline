import { ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { BottomSheet, BottomSheetView, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';

import { Text } from './text';

/**
 * Honest sheet heights for `@expo/ui` native sheets.
 *
 * Android Material ModalBottomSheet only supports content-fit, ~half, and full —
 * not arbitrary Gorhom-style percentages. These modes map to what both platforms
 * can actually do:
 *
 * - `fit` — height follows content (typical Android “different length” sheets)
 * - `half` — ~50% screen. iOS locks to one detent; Android opens at partial but
 *   Material may still allow drag to full
 * - `expandable` — ~50% resting, drag up to full (lists / pickers)
 */
export type SheetMode = 'fit' | 'half' | 'expandable';

function sheetSizing(mode: SheetMode): {
  enableDynamicSizing: boolean;
  snapPoints?: string[];
} {
  if (mode === 'fit') {
    return { enableDynamicSizing: true };
  }

  if (mode === 'half') {
    // Single snap → Android skips partial and opens full. Use two snaps so
    // partial (~50%) is available; iOS can use a true single 50% detent.
    return {
      enableDynamicSizing: false,
      snapPoints: Platform.OS === 'ios' ? ['50%'] : ['50%', '100%'],
    };
  }

  return {
    enableDynamicSizing: false,
    snapPoints: ['50%', '100%'],
  };
}

/**
 * Modal bottom sheet controlled via `open`.
 *
 * Closed sheets use `index={-1}` (native dismissed). Prefer `mode` over fake
 * percent snap lists — see {@link SheetMode}.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  mode = 'fit',
  scroll = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  mode?: SheetMode;
  scroll?: boolean;
  children: ReactNode;
}) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const sizing = sheetSizing(mode);
  const Content = scroll ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheet
      index={open ? 0 : -1}
      snapPoints={sizing.snapPoints}
      enableDynamicSizing={sizing.enableDynamicSizing}
      enablePanDownToClose
      onClose={handleClose}>
      <Content style={{ padding: 20 }}>
        {title ? <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>{title}</Text> : null}
        {children}
      </Content>
    </BottomSheet>
  );
}
