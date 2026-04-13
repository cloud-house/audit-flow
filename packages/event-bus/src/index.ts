/**
 * Lightweight browser Event Bus for cross-MFE communication.
 * Uses window.CustomEvent — no shared state, no Redux.
 *
 * Usage:
 *   emit({ type: 'auditflow:navigate', payload: { route: '/reports/123' } })
 *   const unsub = on('auditflow:navigate', ({ route }) => router.push(route))
 *   unsub() // cleanup
 */

export type AuditFlowEvent =
  | { type: 'auditflow:navigate'; payload: { route: string } }
  | { type: 'auditflow:project-selected'; payload: { projectId: string } }
  | { type: 'auditflow:audit-started'; payload: { auditId: string; projectId: string } }
  | { type: 'auditflow:audit-completed'; payload: { auditId: string; projectId: string } };

export function emit(event: AuditFlowEvent): void {
  window.dispatchEvent(new CustomEvent(event.type, { detail: event.payload, bubbles: true }));
}

export function on<T extends AuditFlowEvent['type']>(
  type: T,
  handler: (payload: Extract<AuditFlowEvent, { type: T }>['payload']) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}
