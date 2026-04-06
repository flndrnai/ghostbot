'use client';

import { motion } from 'motion/react';
import {
  ArrowUp as ArrowUpBase,
  ArrowLeft as ArrowLeftBase,
  Check as CheckBase,
  CheckCircle as CheckCircleBase,
  ChevronDown as ChevronDownBase,
  ChevronRight as ChevronRightBase,
  Clock as ClockBase,
  Eye as EyeBase,
  EyeOff as EyeOffBase,
  Loader2 as Loader2Base,
  LogOut as LogOutBase,
  MessageSquare as MessageSquareBase,
  Moon as MoonBase,
  Pencil as PencilBase,
  Plus as PlusBase,
  RefreshCw as RefreshCwBase,
  Settings as SettingsBase,
  Square as SquareBase,
  Star as StarBase,
  Sun as SunBase,
  Timer as TimerBase,
  Trash2 as Trash2Base,
  Wrench as WrenchBase,
  X as XBase,
  XCircle as XCircleBase,
} from 'lucide-react';
import { forwardRef } from 'react';

const spring = { type: 'spring', stiffness: 400, damping: 17 };

/**
 * Creates an animated icon component.
 *
 * Supports TWO hover modes:
 * 1. Direct hover on the icon itself (default)
 * 2. Parent-controlled via `isHovered` prop — when you want the BUTTON hover
 *    to trigger the icon animation, pass isHovered from the parent's state.
 *
 * Example (parent-controlled):
 *   const [hovered, setHovered] = useState(false);
 *   <button onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
 *     <Plus className="h-4 w-4" isHovered={hovered} />
 *     New Chat
 *   </button>
 */
function animated(Icon, hoverStyle = {}) {
  const AnimatedIcon = forwardRef(function AnimatedIcon(
    { className, size, isHovered, ...props },
    ref,
  ) {
    return (
      <motion.span
        ref={ref}
        className="inline-flex items-center justify-center"
        initial={false}
        animate={isHovered ? hoverStyle : { x: 0, y: 0, scale: 1, rotate: 0 }}
        whileHover={isHovered === undefined ? hoverStyle : undefined}
        transition={spring}
        {...props}
      >
        <Icon className={className} size={size} />
      </motion.span>
    );
  });
  AnimatedIcon.displayName = (Icon.displayName || Icon.name || 'Icon') + 'Animated';
  return AnimatedIcon;
}

// Navigation & Action icons
export const ArrowUp = animated(ArrowUpBase, { y: -2 });
export const ArrowLeft = animated(ArrowLeftBase, { x: -3 });
export const Check = animated(CheckBase, { scale: 1.15 });
export const CheckCircle = animated(CheckCircleBase, { scale: 1.1 });
export const ChevronDown = animated(ChevronDownBase, { y: 2 });
export const ChevronRight = animated(ChevronRightBase, { x: 2 });
export const Clock = animated(ClockBase, { scale: 1.1 });
export const Eye = animated(EyeBase, { scale: 1.1 });
export const EyeOff = animated(EyeOffBase, { scale: 1.1 });
export const LogOut = animated(LogOutBase, { x: 3 });
export const MessageSquare = animated(MessageSquareBase, { scale: 1.1 });
export const Moon = animated(MoonBase, { rotate: -20 });
export const Pencil = animated(PencilBase, { rotate: -15 });
export const Plus = animated(PlusBase, { rotate: 90 });
export const RefreshCw = animated(RefreshCwBase, { rotate: 180 });
export const Settings = animated(SettingsBase, { rotate: 60 });
export const Square = animated(SquareBase, { scale: 0.9 });
export const Star = animated(StarBase, { scale: 1.2, rotate: 15 });
export const Sun = animated(SunBase, { rotate: 45 });
export const Timer = animated(TimerBase, { scale: 1.1 });
export const Trash2 = animated(Trash2Base, { y: 2 });
export const Wrench = animated(WrenchBase, { rotate: -20 });
export const X = animated(XBase, { rotate: 90 });
export const XCircle = animated(XCircleBase, { scale: 1.1 });

// Loader with continuous spin (always animates)
export const Loader2 = forwardRef(function Loader2({ className, size, ...props }, ref) {
  return (
    <motion.span
      ref={ref}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="inline-flex items-center justify-center"
      {...props}
    >
      <Loader2Base className={className} size={size} />
    </motion.span>
  );
});
Loader2.displayName = 'Loader2';

// Re-export brand/special icons directly from lucide-react
export { Bot, Box, Cpu, Github, HardDrive, Webhook, Zap, Sparkles } from 'lucide-react';
