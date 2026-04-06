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

// Wrap a lucide icon with motion hover animation
function animated(Icon, hoverAnimation = {}) {
  const AnimatedIcon = forwardRef(function AnimatedIcon({ className, size, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverAnimation}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="inline-flex"
        {...props}
      >
        <Icon className={className} size={size} />
      </motion.div>
    );
  });
  AnimatedIcon.displayName = Icon.displayName || 'AnimatedIcon';
  return AnimatedIcon;
}

// Tap scale animation (for buttons)
const tap = { scale: 0.92 };
const hover = { scale: 1.1 };
const rotate = { rotate: 90 };
const spin = { rotate: 180 };

// Navigation & Action icons — with hover animations
export const ArrowUp = animated(ArrowUpBase, { y: -2 });
export const ArrowLeft = animated(ArrowLeftBase, { x: -2 });
export const Check = animated(CheckBase, { scale: 1.2 });
export const CheckCircle = animated(CheckCircleBase, { scale: 1.1 });
export const ChevronDown = animated(ChevronDownBase, { y: 1 });
export const ChevronRight = animated(ChevronRightBase, { x: 1 });
export const Clock = animated(ClockBase, hover);
export const Eye = animated(EyeBase, hover);
export const EyeOff = animated(EyeOffBase, hover);
export const LogOut = animated(LogOutBase, { x: 2 });
export const MessageSquare = animated(MessageSquareBase, hover);
export const Moon = animated(MoonBase, { rotate: -15 });
export const Pencil = animated(PencilBase, { rotate: -12 });
export const Plus = animated(PlusBase, { rotate: 90 });
export const RefreshCw = animated(RefreshCwBase, spin);
export const Settings = animated(SettingsBase, { rotate: 45 });
export const Square = animated(SquareBase, tap);
export const Star = animated(StarBase, { scale: 1.2 });
export const Sun = animated(SunBase, { rotate: 30 });
export const Timer = animated(TimerBase, hover);
export const Trash2 = animated(Trash2Base, { y: 1 });
export const Wrench = animated(WrenchBase, { rotate: -15 });
export const X = animated(XBase, { rotate: 90 });
export const XCircle = animated(XCircleBase, hover);

// Loader with continuous spin
export const Loader2 = forwardRef(function Loader2({ className, size, ...props }, ref) {
  return (
    <motion.div
      ref={ref}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="inline-flex"
      {...props}
    >
      <Loader2Base className={className} size={size} />
    </motion.div>
  );
});
Loader2.displayName = 'Loader2';

// Re-export brand/special icons directly from lucide-react (no animation needed)
export { Bot, Box, Cpu, Github, HardDrive, Webhook, Zap, Sparkles } from 'lucide-react';
