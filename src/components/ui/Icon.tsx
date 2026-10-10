// Every icon referenced by name anywhere in game content, achievements,
// or nav config (src/lib/gameRegistry.ts, achievements.ts, nav.ts, and
// the inline icon="..." props across features/) must be explicitly
// imported here. A plain `import * as Icons from "lucide-react"` would
// defeat tree-shaking and pull the entire icon set into the bundle --
// this explicit map keeps the "resolve an icon by a data-driven string"
// contract while only shipping the icons the app actually uses.
import type { LucideIcon, LucideProps } from "lucide-react"
import {
  Binary,
  Bot,
  Boxes,
  Braces,
  BrainCircuit,
  CalendarCheck,
  CalendarHeart,
  Cloud,
  Coffee,
  Component,
  Container,
  Cpu,
  Crown,
  Database,
  FileCode2,
  FileType2,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  GitBranch,
  GitMerge,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Network,
  Radio,
  Rocket,
  SearchX,
  Settings,
  Share2,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Target,
  Terminal,
  TestTube2,
  TrendingUp,
  Wifi,
  Workflow,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  Binary,
  Bot,
  Boxes,
  Braces,
  BrainCircuit,
  CalendarCheck,
  CalendarHeart,
  Cloud,
  Coffee,
  Component,
  Container,
  Cpu,
  Crown,
  Database,
  FileCode2,
  FileType2,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  GitBranch,
  GitMerge,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Network,
  Radio,
  Rocket,
  SearchX,
  Settings,
  Share2,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Target,
  Terminal,
  TestTube2,
  TrendingUp,
  Wifi,
  Workflow,
}

interface IconProps extends LucideProps {
  name: string
}

export function Icon({ name, ...props }: IconProps) {
  const Cmp = ICONS[name] ?? Sparkles
  return <Cmp {...props} />
}
