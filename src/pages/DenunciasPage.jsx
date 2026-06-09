import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { EmptyState, LoadingSpinner, Toast, Modal, PageHeader } from '@/components/ui'

function Badge({ text, bg, color }) {
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function LinkModal({ empresa, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const link = `${window.location.origin}/canal?emp=${empresa.id}`

  async function copiar() {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <Modal title="📢 Link do Canal de Denúncias" onClose={onClose} size="sm">
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted">
          Compartilhe este link para que colaboradores de <strong className="text-navy">{empresa.nome}</strong> possam registrar denúncias de forma <strong>100% anônima</strong>.
        </p>
        <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
          <span className="text-xs text-navy break-all flex-1 text-left font-mono">{link}</span>
          <button onClick={copiar} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
            {copiado ? '✅ Copiado!' : 'Copiar'}
          </button>
        </div>
        <div className="flex justify-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`}
            alt="QR Code Canal de Denúncias"
            width={200} height={200}
            className="rounded-xl border border-border"
          />
        </div>
        <p className="text-xs text-muted">O link não expira. As denúncias são acessíveis apenas pelo consultor.</p>
        <button className="btn-secondary w-full" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  )
}

function EmpresaRow({ empresa, denuncias, onVerEmpresa }) {
  const [linkOpen, setLinkOpen] = useState(false)

  const total      = denuncias.length
  const recebidas  = denuncias.filter(d => d.status === 'recebida').length
  const emAnalise  = denuncias.filter(d => d.status === 'em_analise').length
  const concluidas = denuncias.filter(d => d.status === 'concluida').length

  return (
    <div className="card mb-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-navy text-sm">{empresa.nome}</span>
            {empresa.setor_ramo && <span className="text-xs text-muted">— {empresa.setor_ramo}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {total === 0 && <span className="text-xs text-muted">Nenhuma denúncia registrada</span>}
            {recebidas  > 0 && <Badge text={`${recebidas} recebida${recebidas > 1 ? 's' : ''}`}    bg="#f1f5f9" color="#475569" />}
            {emAnalise  > 0 && <Badge text={`${emAnalise} em análise`}                              bg="#fef9c3" color="#854d0e" />}
            {concluidas > 0 && <Badge text={`${concluidas} concluída${concluidas > 1 ? 's' : ''}`}  bg="#dcfce7" color="#166534" />}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setLinkOpen(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
          >
            🔗 Link
          </button>
          <button className="btn-secondary text-xs" onClick={() => onVerEmpresa(empresa.id)}>
            {total > 0 ? `Ver ${total} denúncia${total > 1 ? 's' : ''}` : 'Abrir canal'}
          </button>
        </div>
      </div>

      {linkOpen && <LinkModal empresa={empresa} onClose={() => setLinkOpen(false)} />}
    </div>
  )
}

export default function DenunciasPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [empresas,  setEmpresas]  = useState([])
  const [denuncias, setDenuncias] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const [{ data: emps, error: e1 }, { data: dens, error: e2 }] = await Promise.all([
      supabase.from('empresas').select('id, nome, setor_ramo').order('nome'),
      supabase.from('denuncias').select('id, empresa_id, status').order('created_at', { ascending: false }),
    ])
    if (e1 || e2) setToast({ message: 'Erro ao carregar dados.', type: 'error' })
    setEmpresas(emps ?? [])
    setDenuncias(dens ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const totalDenuncias  = denuncias.length
  const totalRecebidas  = denuncias.filter(d => d.status === 'recebida').length
  const totalEmAnalise  = denuncias.filter(d => d.status === 'em_analise').length
  const empresasComDen  = empresas.filter(e => denuncias.some(d => d.empresa_id === e.id)).length

  return (
    <div>
      <PageHeader
        title="📢 Canal de Denúncias"
        subtitle="Dashboard geral — todas as empresas"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Empresas com canal', value: empresas.length,   icon: '🏢', bg: '#e0f2fe', color: '#075985' },
          { label: 'Total denúncias',    value: totalDenuncias,    icon: '📋', bg: '#f3e8ff', color: '#6b21a8' },
          { label: 'Recebidas',          value: totalRecebidas,    icon: '📥', bg: '#f1f5f9', color: '#475569' },
          { label: 'Em análise',         value: totalEmAnalise,    icon: '🔍', bg: '#fef9c3', color: '#854d0e' },
        ].map(({ label, value, icon, bg, color }) => (
          <div key={label} className="card flex items-center gap-3 py-3">
            <div style={{ width: 36, height: 36, background: bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Carregando empresas..." />
      ) : !empresas.length ? (
        <EmptyState
          icon="🏢"
          title="Nenhuma empresa cadastrada"
          description="Cadastre empresas para gerar os links do canal de denúncias."
        />
      ) : (
        <>
          <div className="mb-3">
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1a2e4a' }}>
              {empresas.length} empresa{empresas.length > 1 ? 's' : ''}
              {empresasComDen > 0 && ` · ${empresasComDen} com denúncia${empresasComDen > 1 ? 's' : ''}`}
            </h2>
          </div>
          {empresas.map(emp => (
            <EmpresaRow
              key={emp.id}
              empresa={emp}
              denuncias={denuncias.filter(d => d.empresa_id === emp.id)}
              onVerEmpresa={id => navigate(`/denuncias/${id}`)}
            />
          ))}
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
