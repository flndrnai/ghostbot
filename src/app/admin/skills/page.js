import { AdminNav } from '../admin-nav.jsx';
import SkillsContent from './skills-content.jsx';

export const metadata = { title: 'Skills — GhostBot Admin' };

export default function SkillsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card/30">
        <AdminNav />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <SkillsContent />
      </div>
    </div>
  );
}
