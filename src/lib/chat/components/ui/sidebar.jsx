'use client';

import { createContext, useContext, useState, useCallback, useEffect, Children, cloneElement, isValidElement } from 'react';
import { cn } from '../../../utils.js';
import { Sheet } from './sheet.jsx';

const SIDEBAR_WIDTH = '18rem';
const SIDEBAR_WIDTH_COLLAPSED = '3.5rem';
const MOBILE_BREAKPOINT = 768;

const SidebarContext = createContext({
  open: true,
  setOpen: () => {},
  isMobile: false,
  openMobile: false,
  setOpenMobile: () => {},
  toggleSidebar: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((v) => !v);
    } else {
      setOpen((v) => !v);
    }
  }, [isMobile]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }}>
      <div
        className="flex min-h-screen w-full"
        style={{
          '--sidebar-width': SIDEBAR_WIDTH,
          '--sidebar-width-collapsed': SIDEBAR_WIDTH_COLLAPSED,
        }}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children, className }) {
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground safe-top">
          {children}
        </div>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        'hidden md:block flex-shrink-0 transition-[width] duration-300 ease-out',
        open ? 'w-[var(--sidebar-width)]' : 'w-[var(--sidebar-width-collapsed)]',
      )}
    >
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar text-sidebar-foreground',
          'border-r border-sidebar-border transition-[width] duration-300 ease-out',
          open ? 'w-[var(--sidebar-width)]' : 'w-[var(--sidebar-width-collapsed)]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function SidebarHeader({ className, ...props }) {
  return <div className={cn('flex items-center gap-3 px-4 py-5', className)} {...props} />;
}

export function SidebarContent({ className, ...props }) {
  return <div className={cn('flex-1 overflow-y-auto px-3 py-2', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }) {
  return <div className={cn('px-3 py-3', className)} {...props} />;
}

export function SidebarMenu({ className, ...props }) {
  return <ul className={cn('flex flex-col gap-1', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }) {
  return <li className={cn('', className)} {...props} />;
}

// Recursively walk a child tree (descending into fragments and any
// element with its own children) cloning every element whose type
// has a displayName ending in 'Animated' so it receives isHovered.
function injectHoverProp(node, hovered) {
  if (Array.isArray(node)) return node.map((c) => injectHoverProp(c, hovered));
  if (!isValidElement(node)) return node;
  // Animated leaf: inject the prop directly
  if (node.type?.displayName?.endsWith('Animated')) {
    return cloneElement(node, { isHovered: hovered });
  }
  // Fragment or any element with its own children — recurse
  const childChildren = node.props?.children;
  if (childChildren !== undefined && childChildren !== null) {
    const newChildren = injectHoverProp(childChildren, hovered);
    if (newChildren !== childChildren) {
      return cloneElement(node, undefined, newChildren);
    }
  }
  return node;
}

export function SidebarMenuButton({ children, isActive, className, tooltip, onClick, href, ...props }) {
  const { open } = useSidebar();
  const [hovered, setHovered] = useState(false);

  // Clone children to pass isHovered prop to animated icons,
  // descending into fragments so nested icons (e.g. inside an
  // {open && (<>...</>)} block) still pick up the hover state.
  const enhancedChildren = injectHoverProp(children, hovered);

  const classes = cn(
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
    'hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
    'active:scale-[0.98] cursor-pointer',
    isActive && 'bg-primary/10 text-primary font-medium border-l-2 border-primary',
    !open && 'justify-center px-0',
    className,
  );

  // If href is provided, render as a real anchor tag for guaranteed navigation
  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={classes}
        title={!open ? tooltip : undefined}
        {...props}
      >
        {enhancedChildren}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={classes}
      title={!open ? tooltip : undefined}
      {...props}
    >
      {enhancedChildren}
    </button>
  );
}

export function SidebarInset({ className, children }) {
  return (
    <main className={cn('flex flex-1 flex-col min-w-0', className)}>
      {children}
    </main>
  );
}

export function SidebarTrigger({ className }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-lg',
        'hover:bg-sidebar-accent/70 transition-colors duration-200 cursor-pointer',
        className,
      )}
      aria-label="Toggle sidebar"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="3" y1="4.5" x2="15" y2="4.5" />
        <line x1="3" y1="9" x2="15" y2="9" />
        <line x1="3" y1="13.5" x2="15" y2="13.5" />
      </svg>
    </button>
  );
}

export function SidebarGroup({ children, className }) {
  return <div className={cn('py-3', className)}>{children}</div>;
}

export function SidebarGroupLabel({ children, className }) {
  const { open } = useSidebar();
  if (!open) return null;
  return (
    <div className={cn('px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60', className)}>
      {children}
    </div>
  );
}
