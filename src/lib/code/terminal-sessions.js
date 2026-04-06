/**
 * In-memory terminal session registry.
 * Tracks extra terminal tabs per workspace (primary tab is always port 7681).
 */

if (!globalThis.__terminalSessions) {
  globalThis.__terminalSessions = new Map();
}

const sessions = globalThis.__terminalSessions;

export function addSession(workspaceId, sessionId, { port, label = 'Shell' }) {
  if (!sessions.has(workspaceId)) {
    sessions.set(workspaceId, new Map());
  }
  sessions.get(workspaceId).set(sessionId, {
    port,
    label,
    createdAt: Date.now(),
  });
}

export function getSession(workspaceId, sessionId) {
  return sessions.get(workspaceId)?.get(sessionId) || null;
}

export function getSessions(workspaceId) {
  const map = sessions.get(workspaceId);
  if (!map) return [];
  return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
}

export function removeSession(workspaceId, sessionId) {
  sessions.get(workspaceId)?.delete(sessionId);
}

export function clearWorkspaceSessions(workspaceId) {
  sessions.delete(workspaceId);
}

let nextPort = 7682;
export function getNextPort() {
  return nextPort++;
}
