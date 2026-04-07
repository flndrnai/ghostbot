'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Star, Trash2, Pencil, X, Check } from '../../icons/index.jsx';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from './ui/sidebar.jsx';
import { useChatNav } from './chat-nav-context.jsx';
import { renameChatAction, deleteChatAction, toggleStarAction } from '../actions.js';

function formatChatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  const day = d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  return `${day} · ${time}`;
}

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
        <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-sidebar-accent cursor-pointer">
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <button onClick={handleStar} className="p-1 rounded hover:bg-sidebar-accent cursor-pointer">
          <Star className={`h-3 w-3 ${chat.starred ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
        <button onClick={handleDelete} className="p-1 rounded hover:bg-destructive/10 cursor-pointer">
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

  const activeChatId = pathname?.startsWith('/chat/') ? pathname.split('/')[2] : null;

  useEffect(() => {
    fetch('/api/chats')
      .then((r) => r.json())
      .then(setChats)
      .catch(() => {});
  }, [refreshKey]);

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
