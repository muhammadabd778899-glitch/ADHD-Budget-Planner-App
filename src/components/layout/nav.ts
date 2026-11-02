import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Today',
    items: [{ to: '/', label: 'Today', icon: 'home', end: true }],
  },
  {
    label: 'Plan',
    items: [
      { to: '/income', label: 'Paydays', icon: 'calendar' },
      { to: '/bills', label: 'Bills', icon: 'receipt' },
    ],
  },
  {
    label: 'Track',
    items: [
      { to: '/spending', label: 'Spending', icon: 'wallet' },
      { to: '/debt', label: 'Debt', icon: 'card' },
      { to: '/savings', label: 'Savings', icon: 'piggy' },
    ],
  },
  {
    label: 'Review',
    items: [{ to: '/reports', label: 'Reports', icon: 'chart' }],
  },
];

export const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Today', icon: 'home', end: true },
  { to: '/bills', label: 'Bills', icon: 'receipt' },
  { to: '/spending', label: 'Spending', icon: 'wallet' },
];

export const MORE_NAV: NavItem[] = [
  { to: '/income', label: 'Paydays', icon: 'calendar' },
  { to: '/debt', label: 'Debt', icon: 'card' },
  { to: '/savings', label: 'Savings', icon: 'piggy' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/help', label: 'How Tide works', icon: 'help' },
];
