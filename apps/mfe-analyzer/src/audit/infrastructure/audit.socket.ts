import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuditStatus, CheckResultDto } from '@auditflow/types';

export interface AuditSocketState {
  status: AuditStatus;
  percent: number;
  currentUrl: string;
  liveChecks: CheckResultDto[];
}

const SOCKET_URL = 'http://localhost:4000';

export function useAuditSocket(auditId: string | null): AuditSocketState {
  const [state, setState] = useState<AuditSocketState>({
    status: 'PENDING',
    percent: 0,
    currentUrl: '',
    liveChecks: [],
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!auditId) return;
    const token = localStorage.getItem('accessToken');
    const socket = io(`${SOCKET_URL}/audits`, {
      path: '/socket.io',
      auth: { token: token ? `Bearer ${token}` : '' },
    });
    socketRef.current = socket;

    socket.on(`audit.${auditId}.status`, ({ status }: { status: AuditStatus }) => {
      setState((s) => ({ ...s, status }));
    });
    socket.on(`audit.${auditId}.progress`, ({ percent, currentUrl }: { percent: number; currentUrl: string }) => {
      setState((s) => ({ ...s, percent, currentUrl }));
    });
    socket.on(`audit.${auditId}.check`, (check: CheckResultDto) => {
      setState((s) => ({ ...s, liveChecks: [check, ...s.liveChecks].slice(0, 50) }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auditId]);

  return state;
}
