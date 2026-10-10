export interface NavItem {
  to: string
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { to: "/library", label: "Game Library", icon: "Swords" },
  { to: "/progress", label: "Progress", icon: "TrendingUp" },
  { to: "/settings", label: "Settings", icon: "Settings" },
]
