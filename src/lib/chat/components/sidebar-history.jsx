'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Star, Trash2, Pencil, X, Check, ArrowUp } from '../../icons/index.jsx';
import { Sparkles } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from './ui/sidebar.jsx';
import { useChatNav } from './chat-nav-context.jsx';
import { renameChatAction, deleteChatAction, toggleStarAction, exportChatMarkdown, toggleChatMemoryAction } from '../actions.js';

async function handleExport(chatId) {
  try {
    const res = await exportChatMarkdown(chatId);
    if (!res?.content) return;
    const blob = new Blob([res.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename || 'ghostbot-chat.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {}
}

// Re-exported from the central date-format module so the rest of
// the file's references stay unchanged.
import { formatChatTimestamp } from '../../date-format.js';

function groupChatsByTime(chats) {
  const now = Date.now();
  const day = 86400000;
  const groups = { starred: [], today: [], yesterday: [], week: [], older: [] };

  for (const chat of chats) {
    if (chat.starred) {
      groups.starred.push(chat);
      continue;
    }
    const age = now - chat.updatedAt;
    if (age < day) groups.today.push(chat);
    else if (age < day * 2) groups.yesterday.push(chat);
    else if (age < day * 7) groups.week.push(chat);
    else groups.older.push(chat);
  }

  return groups;
}

function ChatItem({ chat, isActive }) {
  const router = useRouter();
  const { open, setOpenMobile, isMobile } = useSidebar();
  const { triggerRefresh } = useChatNav();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  async function handleRename() {
    if (editTitle.trim() && editTitle !== chat.title) {
      await renameChatAction(chat.id, editTitle.trim());
      triggerRefresh();
    }
    setEditing(false);
  }

  async function handleDelete() {
    await deleteChatAction(chat.id);
    triggerRefresh();
    router.push('/');
  }

  async function handleStar() {
    await toggleStarAction(chat.id);
    triggerRefresh();
  }

  async function handleToggleMemory() {
    await toggleChatMemoryAction(chat.id);
    triggerRefresh();
  }

  if (!open) {
    return (
      <SidebarMenuButton
        tooltip={chat.title}
        isActive={isActive}
        onClick={() => {
          router.push(`/chat/${chat.id}`);
          if (isMobile) setOpenMobile(false);
        }}
      >
        <span className="text-xs truncate w-4 text-center">{chat.title.charAt(0)}</span>
      </SidebarMenuButton>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          className="flex-1 bg-input rounded px-2 py-1 text-sm text-foreground outline-none"
          autoFocus
        />
        <button onClick={handleRename} className="p-1 hover:text-primary cursor-pointer">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="p-1 hover:text-muted-foreground cursor-pointer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <SidebarMenuButton
        href={`/chat/${chat.id}`}
        isActive={isActive}
        onClick={() => {
          if (isMobile) setOpenMobile(false);
        }}
        className="!h-auto !py-2"
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-sm leading-tight">{chat.title}</div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
            {formatChatTimestamp(chat.updatedAt)}
          </div>
        </div>
        {chat.starred ? <Star className="h-3 w-3 fill-primary text-primary flex-shrink-0" /> : null}
      </SidebarMenuButton>

      {/* Hover actions */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-sidebar px-1">
        <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-sidebar-accent cursor-pointer" title="Rename">
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <button onClick={handleStar} className="p-1 rounded hover:bg-sidebar-accent cursor-pointer" title="Star">
          <Star className={`h-3 w-3 ${chat.starred ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
        <button
          onClick={handleToggleMemory}
          className="p-1 rounded hover:bg-sidebar-accent cursor-pointer"
          title={chat.memoryEnabled ? 'Memory ON — click to disable for this chat' : 'Memory OFF — click to re-enable'}
        >
          <Sparkles className={`h-3 w-3 ${chat.memoryEnabled ? 'text-primary' : 'text-muted-foreground/40 line-through'}`} />
        </button>
        <button onClick={() => handleExport(chat.id)} className="p-1 rounded hover:bg-sidebar-accent cursor-pointer" title="Export as Markdown">
          <ArrowUp className="h-3 w-3 text-muted-foreground rotate-180" />
        </button>
        <button onClick={handleDelete} className="p-1 rounded hover:bg-destructive/10 cursor-pointer" title="Delete">
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

export function SidebarHistory() {
  const { refreshKey } = useChatNav();
  const { open } = useSidebar();
  const pathname = usePathname();
  const [chats, setChats] = useState([]);
  // Bump every 30s so the relative timestamps (now / X min ago)
  // tick over without needing a full data refetch.
  const [, setNowTick] = useState(0);

  const activeChatId = pathname?.startsWith('/chat/') ? pathname.split('/')[2] : null;

  useEffect(() => {
    fetch('/api/chats')
      .then((r) => r.json())
      .then(setChats)
      .catch(() => {});
  }, [refreshKey]);

  // 30-second tick to live-update relative timestamp labels
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (chats.length === 0) {
    return open ? (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-xs text-muted-foreground/40 leading-relaxed px-2">
          Your conversations will appear here
        </p>
      </div>
    ) : null;
  }

  const groups = groupChatsByTime(chats);
  const sections = [
    { label: 'Starred', items: groups.starred },
    { label: 'Today', items: groups.today },
    { label: 'Yesterday', items: groups.yesterday },
    { label: 'Previous 7 Days', items: groups.week },
    { label: 'Older', items: groups.older },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.label}>
          {open && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
              {section.label}
            </div>
          )}
          <SidebarMenu>
            {section.items.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <ChatItem chat={chat} isActive={chat.id === activeChatId} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      ))}
    </div>
  );
}
