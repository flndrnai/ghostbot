import { auth } from '../../../lib/auth/config.js';
import { getTokenUsageSummary, getUsageByProvider, getDailyUsage } from '../../../lib/db/token-usage.js';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  const summary = getTokenUsageSummary(30);
  const byProvider = getUsageByProvider(30);
  const daily = getDailyUsage(14);

  return Response.json({ summary, byProvider, daily });
}
