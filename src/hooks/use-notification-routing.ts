import { useEffect, useRef } from 'react';

import { getNotifications } from '@/lib/notifications/core';
import { navigateFromNotificationData } from '@/lib/notifications/deep-link';
import { isNotificationPayload } from '@/lib/notifications/types';

/**
 * Handle taps on local (and later remote) notifications via typed payloads.
 * Cold start: consume last response once. Warm: listen for responses.
 */
export function useNotificationRouting() {
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    const mod = getNotifications();
    if (!mod) return;

    const handleResponse = (response: {
      notification: { request: { identifier: string; content: { data?: unknown } } };
    } | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponseId.current === id) return;
      handledResponseId.current = id;
      const data = response.notification.request.content.data;
      if (isNotificationPayload(data)) {
        navigateFromNotificationData(data);
      }
    };

    handleResponse(mod.getLastNotificationResponse());

    const sub = mod.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });
    return () => sub.remove();
  }, []);
}
