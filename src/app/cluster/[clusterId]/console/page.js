'use client';

import { useParams, useRouter } from 'next/navigation';
import { ClusterConsole } from '../../../../lib/cluster/components/cluster-console.jsx';
import { ArrowLeft } from '../../../../lib/icons/index.jsx';

export default function ClusterConsolePage() {
  const { clusterId } = useParams();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push(`/cluster/${clusterId}`)} className="p-2 rounded-lg hover:bg-muted cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cluster Console</h1>
            <p className="text-sm text-muted-foreground">Live container status and logs</p>
          </div>
        </div>

        <ClusterConsole clusterId={clusterId} />
      </div>
    </div>
  );
}
