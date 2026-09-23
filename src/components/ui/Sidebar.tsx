import { NavLink } from 'react-router-dom'
import clsx from '../../lib/clsx'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/clientes', label: 'Clientes & Pets', icon: 'users' },
  { to: '/financeiro', label: 'Financeiro', icon: 'card' },
  { to: '/estoque', label: 'Estoque', icon: 'box' },
  { to: '/relatorios', label: 'Relatórios', icon: 'bars' },
  { to: '/configuracoes', label: 'Configurações', icon: 'gear' },
] as const

const ICONS: Record<string, JSX.Element> = {
  home: (
    <>
      <path d="M3 12l9-9 9 9" />
      <path d="M9 21V12h6v9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" />
      <circle cx="17.5" cy="9.5" r="2.3" />
      <path d="M15.3 20c0-2.2 1-4 2.7-4.6" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  box: (
    <>
      <path d="M20.5 7.3l-8.5-4.8-8.5 4.8v9.4l8.5 4.8 8.5-4.8V7.3z" />
      <path d="M3.5 7.3l8.5 4.8 8.5-4.8M12 12.1V21" />
    </>
  ),
  bars: (
    <>
      <path d="M4 20V11M11 20V4M18 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3.3M12 18.2v3.3M2.5 12h3.3M18.2 12h3.3M5.3 5.3l2.3 2.3M16.4 16.4l2.3 2.3M5.3 18.7l2.3-2.3M16.4 7.6l2.3-2.3" />
    </>
  ),
}

export function Sidebar() {
  return (
    <div className="flex w-[216px] shrink-0 flex-col gap-1 bg-card p-[14px] pt-6">
      <div className="flex items-center gap-[10px] px-2 pb-[22px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue to-blue-dark text-[14px] font-extrabold text-white">
          K
        </div>
        <div className="text-[15px] font-extrabold">Gestão Kibanho</div>
      </div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-[10px] rounded-xl px-[14px] py-[10px] text-[13px] font-bold',
              isActive
                ? 'bg-gradient-to-br from-blue-tint to-blue-tint2 text-blue-dark'
                : 'text-text-light hover:bg-[#f7f4ee]'
            )
          }
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONS[item.icon]}
          </svg>
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
