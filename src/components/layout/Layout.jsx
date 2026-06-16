import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresa } from '@/hooks/useEmpresa'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    label: 'Avaliação',
    items: [
      { to: '/setores',         icon: '🏬', label: 'Sobre a Empresa'  },
      { to: '/admin/perguntas', icon: '📝', label: 'Perguntas'        },
      { to: '/respostas',       icon: '📋', label: 'Respostas'        },
      { to: '/riscos',          icon: '⚠️',  label: 'Riscos'          },
      { to: '/escuta-gestores', icon: '🧑‍💼', label: 'Escuta Gestores/RH' },
      { to: '/escuta-equipe',   icon: '🎙️', label: 'Escuta da Equipe'    },
      { to: '/diagnostico',     icon: '🔬', label: 'Diagnóstico'      },
      { to: '/plano-acao',      icon: '🎯', label: 'Plano de Ação'    },
      { to: '/okrs',            icon: '📈', label: 'OKRs e KPIs'      },
      { to: '/checklist',       icon: '✅', label: 'Checklist'        },
      { to: '/relatorio',       icon: '📄', label: 'Relatório'        },
    ],
  },
]

const NAV_ADMIN = [
  { to: '/empresas',            icon: '🏢', label: 'Empresas'      },
  { to: '/admin/configuracoes', icon: '⚙️', label: 'Configurações' },
  { to: '/admin/usuarios',      icon: '👥', label: 'Usuários'      },
]

// Pill dropdown — só empresa agora
function EmpresaPill() {
  const { user }                   = useAuth()
  const { empresaAtiva, setEmpresaAtiva } = useEmpresa()
  const [empresas, setEmpresas]    = useState([])
  const [open, setOpen]            = useState(false)
  const ref                        = useRef(null)

  useEffect(() => {
    if (!user) return
    supabase.from('empresas').select('id, nome, setor_ramo').order('nome')
      .then(({ data }) => setEmpresas(data ?? []))
  }, [user])

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const label = empresaAtiva?.nome ?? 'Selecionar empresa'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs cursor-pointer transition-colors"
        style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
      >
        <span className="text-white/60">🏢</span>
        <span className="font-semibold max-w-[120px] sm:max-w-[180px] truncate">{label}</span>
        <span className="text-white/40 text-2xs">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-border rounded-[10px] shadow-lg z-50 overflow-hidden py-1">
          {!empresas.length ? (
            <div className="px-4 py-3 text-xs text-muted">Nenhuma empresa cadastrada</div>
          ) : empresas.map(e => (
            <button key={e.id}
              onClick={() => { setEmpresaAtiva(e); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg transition-colors flex items-center justify-between gap-2"
              style={{ color: e.id === empresaAtiva?.id ? '#3a7bd5' : '#1a2e4a', background: e.id === empresaAtiva?.id ? '#ddeeff' : undefined }}
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">{e.nome}</div>
                {e.setor_ramo && <div className="text-xs text-muted">{e.setor_ramo}</div>}
              </div>
              {e.id === empresaAtiva?.id && <span className="text-primary text-xs flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NavItem({ item, onClick }) {
  return (
    <NavLink to={item.to} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-l-[3px]
         ${isActive ? 'border-[#5a96e8] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`
      }
      style={({ isActive }) => isActive ? { background: 'rgba(58,123,213,0.20)' } : undefined}
    >
      <span className="w-[18px] text-center text-base">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { user, signOut, isAdmin, perfil } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    function handle(e) { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Fecha sidebar ao redimensionar para desktop
  useEffect(() => {
    function onResize() { if (window.innerWidth >= 1024) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── TOPBAR ── */}
      <header
        className="flex items-center gap-2 px-3 sm:px-4 h-14 flex-shrink-0 z-50"
        style={{ background: '#1a2e4a', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
      >
        {/* Hamburger — mobile only, primeiro item */}
        <button
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white text-lg flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Menu"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center">
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>AVALIARY</span>
          <div style={{ width: '70%', height: 2, background: '#F5A623', borderRadius: 1, marginTop: 3 }} />
        </div>

        {/* Separador */}
        <div className="w-px h-5 bg-white/20 hidden sm:block" />

        {/* Pill empresa */}
        <EmpresaPill />

        <div className="flex-1" />

        {/* Dropdown do usuário */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center justify-center w-8 h-8 rounded-full font-black text-sm flex-shrink-0 transition-colors"
            style={{ background: '#F5A623', color: '#1a2e4a' }}
          >
            {(perfil?.nome || user?.email || '?')[0].toUpperCase()}
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-56 bg-white border border-border rounded-[10px] shadow-lg z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-bold text-navy truncate">{perfil?.nome || 'Consultor'}</p>
                <p className="text-xs text-muted truncate mt-0.5">{user?.email}</p>
              </div>
              <NavLink to="/perfil"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy hover:bg-bg transition-colors"
              >
                <span>👤</span> Meu Perfil
              </NavLink>
              <div className="border-t border-border" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
              >
                <span>🚪</span> Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── BANNER SENHA PROVISÓRIA ── */}
      {perfil?.senha_provisoria && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 flex-shrink-0"
          style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0">🔑</span>
            <p className="text-sm font-medium" style={{ color: '#92400e' }}>
              Você está usando uma senha provisória — recomendamos alterá-la agora.
            </p>
          </div>
          <Link to="/perfil"
            className="text-xs font-bold flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#f59e0b', color: '#fff' }}
          >
            Alterar senha →
          </Link>
        </div>
      )}

      {/* ── LAYOUT ABAIXO DO TOPBAR ── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            style={{ top: 56 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside
          className={`
            fixed lg:static
            top-14 bottom-0 left-0
            lg:top-auto lg:bottom-auto
            z-30 flex flex-col w-[240px] lg:w-[220px] flex-shrink-0
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          `}
          style={{ background: '#243c5c' }}
        >
          <nav className="flex-1 overflow-y-auto py-3">
            {NAV.map(group => (
              <div key={group.label}>
                <div className="px-4 pt-3 pb-1 text-2xs font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {group.label}
                </div>
                {group.items.map(item => (
                  <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
                ))}
              </div>
            ))}

            {/* Administração — Canal de Denúncias visível a todos; demais itens só para admins */}
            <div>
              <div className="px-4 pt-3 pb-1 text-2xs font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                Administração
              </div>
              <NavItem item={{ to: '/denuncias', icon: '📢', label: 'Canal de Denúncias' }} onClick={() => setSidebarOpen(false)} />
              {(isAdmin || !perfil) && NAV_ADMIN.map(item => (
                <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>

          </nav>
        </aside>

        {/* ── CONTEÚDO ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0" style={{ background: '#f4f6fa' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
