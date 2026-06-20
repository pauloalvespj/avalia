import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/ui'
import { Link, useNavigate } from 'react-router-dom'
import { nivelRisco } from '@/lib/perguntas'

const NIVEL_COLOR = {
  baixo:   { bg: '#dcfce7', text: '#166534', label: 'Baixo'   },
  moderado: { bg: '#fef9c3', text: '#854d0e', label: 'Moderado' },
  alto:    { bg: '#ffedd5', text: '#9a3412', label: 'Alto'    },
  crítico: { bg: '#fee2e2', text: '#991b1b', label: 'Crítico' },
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4 py-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: color + '22' }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black" style={{ color }}>{value ?? '—'}</div>
        <div className="text-xs text-muted font-medium mt-0.5">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user }                          = useAuth()
  const { setEmpresaAtiva, setSetorAtivo } = useEmpresa()
  const navigate                          = useNavigate()

  const [empresas,  setEmpresas]  = useState([])
  const [stats,     setStats]     = useState({})   // { [empresaId]: { setores, respostas, risco } }
  const [totais,    setTotais]    = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)

    const [
      { data: emps },
      { data: setoresAll },
      { data: respostasAll },
      { data: riscosAll },
      { data: acoesAll },
      { data: denAll },
    ] = await Promise.all([
      supabase.from('empresas').select('id, nome, setor_ramo, func_total').order('nome'),
      supabase.from('setores').select('id, empresa_id'),
      supabase.from('nr1_respostas').select('id, setor_id'),
      supabase.from('nr1_riscos').select('setor_id, score'),
      supabase.from('acoes').select('id, status, setor_id'),
      supabase.from('denuncias').select('id, empresa_id, status'),
    ])

    const empresasLista = emps ?? []

    // Mapa setor → empresa
    const setorEmpresa = {}
    for (const s of setoresAll ?? []) setorEmpresa[s.id] = s.empresa_id

    // Stats por empresa
    const s = {}
    for (const e of empresasLista) {
      const setoresEmp    = (setoresAll ?? []).filter(x => x.empresa_id === e.id)
      const setorIdsEmp   = setoresEmp.map(x => x.id)
      const respostasEmp  = (respostasAll ?? []).filter(x => setorIdsEmp.includes(x.setor_id))
      const riscosEmp     = (riscosAll ?? []).filter(x => setorIdsEmp.includes(x.setor_id))
      const acoesEmpAbert = (acoesAll ?? []).filter(x => setorIdsEmp.includes(x.setor_id) && x.status !== 'concluida')
      const denEmp        = (denAll ?? []).filter(x => x.empresa_id === e.id)

      // Risco médio da empresa
      let riscoNivel = null
      if (riscosEmp.length) {
        const media = riscosEmp.reduce((a, b) => a + b.score, 0) / riscosEmp.length
        riscoNivel  = nivelRisco(media)
      }

      s[e.id] = {
        setores:    setoresEmp.length,
        respostas:  respostasEmp.length,
        acoesAbert: acoesEmpAbert.length,
        denPendentes: denEmp.filter(d => d.status === 'recebida').length,
        riscoNivel,
      }
    }

    // Totais globais
    const acoesAbert = (acoesAll ?? []).filter(a => a.status !== 'concluida').length
    const denPend    = (denAll ?? []).filter(d => d.status === 'recebida').length

    setEmpresas(empresasLista)
    setStats(s)
    setTotais({
      empresas:  empresasLista.length,
      setores:   (setoresAll ?? []).length,
      respostas: (respostasAll ?? []).length,
      acoes:     acoesAbert,
      denuncias: denPend,
    })
    setLoading(false)
  }

  function abrirEmpresa(emp) {
    setEmpresaAtiva(emp)
    setSetorAtivo(null)
    navigate('/setores')
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Visão geral de todas as empresas" />

      {/* Cards de totais */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="🏢" label="Empresas"          value={totais?.empresas}  color="#3a7bd5" />
        <StatCard icon="🏬" label="Setores"           value={totais?.setores}   color="#6366f1" />
        <StatCard icon="📋" label="Respostas"          value={totais?.respostas} color="#0891b2" />
        <StatCard icon="🎯" label="Ações em aberto"   value={totais?.acoes}     color="#f97316" />
        <StatCard icon="📢" label="Denúncias novas"   value={totais?.denuncias} color="#dc2626" />
      </div>

      {/* Lista de empresas */}
      {!empresas.length ? (
        <EmptyState
          icon="🏢"
          title="Nenhuma empresa cadastrada"
          description="Cadastre sua primeira empresa para começar."
          action={<Link to="/empresas" className="btn-primary">Cadastrar empresa</Link>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="font-bold text-navy text-sm">Empresas ({empresas.length})</span>
            <Link to="/empresas" className="text-xs text-primary font-semibold hover:underline">
              Gerenciar →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {empresas.map(emp => {
              const st = stats[emp.id] ?? {}
              const nc = NIVEL_COLOR[st.riscoNivel]
              return (
                <div
                  key={emp.id}
                  onClick={() => abrirEmpresa(emp)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-bg cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-lg flex-shrink-0">
                    🏢
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-navy text-sm truncate">{emp.nome}</div>
                    {emp.setor_ramo && <div className="text-xs text-muted truncate">{emp.setor_ramo}</div>}
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted flex-shrink-0">
                    <span title="Setores">🏬 {st.setores ?? 0}</span>
                    <span title="Respostas">📋 {st.respostas ?? 0}</span>
                    {st.acoesAbert > 0 && (
                      <span title="Ações em aberto" style={{ color: '#f97316', fontWeight: 600 }}>
                        🎯 {st.acoesAbert}
                      </span>
                    )}
                    {st.denPendentes > 0 && (
                      <span title="Denúncias pendentes" style={{ color: '#dc2626', fontWeight: 600 }}>
                        📢 {st.denPendentes}
                      </span>
                    )}
                    {nc && (
                      <span className="font-bold px-2 py-0.5 rounded-full text-2xs"
                        style={{ background: nc.bg, color: nc.text }}>
                        {nc.label}
                      </span>
                    )}
                  </div>
                  <span className="text-muted text-sm flex-shrink-0">›</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
