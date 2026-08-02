import { ReactNode, useRef, useCallback, useEffect } from 'react';
import BottomSheetModal, { BottomSheetView, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';

import { Text } from './text';

export function Sheet({
  open,
  onOpenChange,
  title,
  snapPoints = ['45%', '75%'],
  index = 0,
  scroll = false,
  dynamicSizing = true,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  snapPoints?: (string | number)[];
  index?: number;
  scroll?: boolean;
  dynamicSizing?: boolean;
  children: ReactNode;
}) {
  const sheetRef = useRef<BottomSheetModal>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [open]);

  const Content = scroll ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={index}
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
