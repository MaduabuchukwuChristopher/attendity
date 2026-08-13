import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';
import { io } from 'socket.io-client';
import { socketUrl } from '../api/client.js';
import { useAuthStore } from '../store/auth-store.js';

const attendanceEvents = [
  'attendance:session-created',
  'attendance:session-closed',
  'attendance:qr-updated',
  'attendance:checked-in',
] as const;
const eventEvents = [
  'event:updated',
  'event:published',
  'event:cancelled',
  'event:attendance-opened',
  'event:attendance-closed',
  'event:attendance-recorded',
  'event:report-updated',
] as const;

export function RealtimeProvider({ children }: PropsWithChildren) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return undefined;
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    const refreshAttendance = () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
      void queryClient.invalidateQueries({ queryKey: ['clearance'] });
    };
    attendanceEvents.forEach((event) => socket.on(event, refreshAttendance));
    socket.on('analytics:updated', refreshAttendance);
    socket.on('clearance:updated', refreshAttendance);
    const refreshEvents = () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
    };
    eventEvents.forEach((event) => socket.on(event, refreshEvents));
    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
    };
    socket.on('notification:sent', refreshNotifications);
    const refreshAnnouncements = () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      refreshNotifications();
    };
    socket.on('announcement:published', refreshAnnouncements);
    socket.on('announcement:acknowledged', refreshAnnouncements);
    socket.on('announcement:cancelled', refreshAnnouncements);
    return () => {
      attendanceEvents.forEach((event) => socket.off(event, refreshAttendance));
      socket.off('analytics:updated', refreshAttendance);
      socket.off('clearance:updated', refreshAttendance);
      eventEvents.forEach((event) => socket.off(event, refreshEvents));
      socket.off('notification:sent', refreshNotifications);
      socket.off('announcement:published', refreshAnnouncements);
      socket.off('announcement:acknowledged', refreshAnnouncements);
      socket.off('announcement:cancelled', refreshAnnouncements);
      socket.disconnect();
    };
  }, [accessToken, queryClient]);

  return children;
}
