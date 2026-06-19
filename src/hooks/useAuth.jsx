import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil,  setPerfil]  = useState(null)

  async function fetchPerfil(userId) {
    if (!userId) { setPerfil(null); return }
    const { data } = await supabase
      .from('perfis')
      .select('*, perfil_acesso:perfis_acesso(*)')
      .eq('id', userId)
      .maybeSingle()
    setPerfil(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      fetchPerfil(data.session?.user?.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      fetchPerfil(s?.user?.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const res = await supabase.auth.signInWithPassword({ email, password })
    if (res.data?.session) fetchPerfil(res.data.session.user.id)
    return res
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const refreshPerfil = () => fetchPerfil(session?.user?.id)

  // ── Helpers de permissão ─────────────────────────────────────────────────────
  const isAdmin      = perfil?.role === 'admin'
  const perfilAcesso = perfil?.perfil_acesso ?? null

  function _nivel(modulo) {
    if (isAdmin || !perfilAcesso) return 'editar'
    return perfilAcesso.permissoes?.modulos?.[modulo] ?? 'editar'
  }

  function podeEditar(modulo) { return _nivel(modulo) === 'editar' }
  function podeVer(modulo)    { const n = _nivel(modulo); return n === 'ver' || n === 'editar' }
  function estaOculto(modulo) { return _nivel(modulo) === 'oculto' }

  const escopo = isAdmin ? 'todas' : (perfilAcesso?.permissoes?.escopo ?? 'proprias')

  return (
    <AuthContext.Provider value={{
      session,
      user:    session?.user ?? null,
      perfil,
      perfilAcesso,
      role:    perfil?.role ?? 'consultor',
      isAdmin,
      escopo,
      podeEditar,
      podeVer,
      estaOculto,
      signIn,
      signOut,
      refreshPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
