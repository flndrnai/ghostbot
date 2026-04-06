'use client';

import { useState, useEffect, useRef } from 'react';
import { Box } from '../../icons/index.jsx';

export function ClusterConsole({ clusterId }) {
  const [roles, setRoles] = useState({});
  const [connected, setConnected] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const eventSource = new EventSource(`/stream/cluster/${clusterId}/logs`);

    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data);
        setRoles(data.roles || {});
        setConnected(true);
      } catch {}
    });

    eventSource.addEventListener('ping', () => {
      setConnected(true);
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => eventSource.close();
  }, [clusterId]);

  const totalContainers = Object.values(roles).reduce(
    (sum, r) => sum + (r.containers?.length || 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
        <div className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-foreground">
          {connected ? `${totalContainers} container(s) running` : 'Disconnected'}
        </span>
      </div>

      {/* Container cards per role */}
      {Object.entries(roles).map(([roleId, roleData]) => (
        <div key={roleId} className="space-y-2">
          {(roleData.containers || []).map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
              <div className={`h-2 w-2 rounded-full ${c.state === 'running' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <Box className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.status || c.state}</p>
              </div>
            </div>
          ))}
        </div>
      ))}

      {totalContainers === 0 && connected && (
        <div className="text-center py-8 text-muted-foreground">
          <Box className="h-6 w-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No containers running</p>
          <p className="text-xs opacity-50">Trigger a role to see containers here</p>
        </div>
      )}
    </div>
  );
}
