import BuilderContent from './builder-content.jsx';

export const metadata = { title: 'Builder — GhostBot' };

export default async function BuilderPage({ params }) {
  const { planId } = await params;
  return <BuilderContent planId={planId} />;
}
