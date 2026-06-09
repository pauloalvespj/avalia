import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { EmptyState, LoadingSpinner, Toast, Modal, PageHeader } from '@/components/ui'

const CAT_COLOR = {
  'Assédio moral':                 { bg: '#fee2e2', color: '#991b1b' },
  'Assédio sexual':                { bg: '#fce7f3', color: '#9d174d' },
  'Discriminação':                 { bg: '#fef3c7', color: '#92400e' },
  'Violência no trabalho':         { bg: '#fee2e2', color: '#7f1d1d' },
  'Desvio de conduta':             { bg: '#fef9c3', color: '#854d0e' },
  'Conflito de interesses':        { bg: '#e0f2fe', color: '#075985' },
  'Irregularidade administrativa': { bg: '#f3e8ff', color: '#6b21a8' },
  'Outro':                         { bg: '#f1f5f9', color: '#475569' },
}

const STATUS = {
  recebida:   { bg: '#f1f5f9', color: '#475569', label: 'Recebida'   },
  em_analise: { bg: '#fef9c3', color: '#854d0e', label: 'Em análise' },
  concluida:  { bg: '#dcfce7', color: '#166534', label: 'Concluída'  },
  arquivada:  { bg: '#fee2e2', color: '#991b1b', label: 'Arquivada'  },
}

function Badge({ text, bg, color }) {
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function DetailRow({ label, value }) {
  if (!value && value !== false) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#1a2e4a' }}>{String(value)}</span>
    </div>
  )
}

function DetalheModal({ denuncia, onClose, onSalvar, onExcluir }) {
  const [obs, setObs]             = useState(denuncia.observacoes_internas ?? '')
  const [status, setStatus]       = useState(denuncia.status ?? 'recebida')
  const [saving, setSaving]       = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSalvar(denuncia.id, { observacoes_internas: obs, status })
    setSaving(false)
    onClose()
  }

  const cat = CAT_COLOR[denuncia.categoria] ?? CAT_COLOR['Outro']
  const st  = STATUS[denuncia.status] ?? STATUS.recebida

  return (
    <Modal title={`Denúncia ${denuncia.protocolo}`} onClose={onClose} size="lg">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <Badge text={denuncia.categoria} bg={cat.bg} color={cat.color} />
        <Badge text={st.label} bg={st.bg} color={st.color} />
        {denuncia.envolve_lideranca && <Badge text="⚠️ Envolve liderança" bg="#fef3c7" color="#92400e" />}
        {denuncia.quer_contato && <Badge text="📬 Quer contato" bg="#e0f2fe" color="#075985" />}
      </div>

      <DetailRow label="Protocolo" value={denuncia.protocolo} />
      <DetailRow label="Recebida em" value={new Date(denuncia.created_at).toLocaleString('pt-BR')} />
      <DetailRow label="Categoria" value={denuncia.categoria} />
      <DetailRow label="Descrição" value={denuncia.descricao} />
      <DetailRow label="Quando ocorreu" value={denuncia.quando_ocorreu} />
      <DetailRow label="Frequência" value={denuncia.frequencia} />
      <DetailRow label="Envolve liderança" value={denuncia.envolve_lideranca ? 'Sim' : 'Não'} />
      <DetailRow label="Tem testemunha" value={denuncia.tem_testemunha ? 'Sim' : 'Não'} />
      <DetailRow label="Contexto adicional" value={denuncia.contexto} />
      <DetailRow label="Quer contato" value={denuncia.quer_contato ? 'Sim' : 'Não'} />
      {denuncia.quer_contato && <DetailRow label="Como contatar" value={denuncia.como_contato} />}

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(STATUS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Observações internas</label>
          <textarea
            className="input"
            style={{ minHeight: 100, resize: 'vertical' }}
            placeholder="Anotações internas sobre a apuração (não visíveis ao denunciante)..."
            value={obs}
            onChange={e => setObs(e.target.value)}
          />
        </div>

        {confirmar ? (
          <div style={{ background: '#fee2e2', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>Excluir permanentemente?</span>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={() => setConfirmar(false)}>Não</button>
              <button className="btn-danger text-xs" onClick={() => onExcluir(denuncia.id)}>Sim, excluir</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 justify-between">
            <button className="btn-danger text-xs" onClick={() => setConfirmar(true)}>🗑 Excluir</button>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function DenunciasEmpresaPage() {
  const { empresaId } = useParams()
  const navigate      = useNavigate()

  const [empresa,     setEmpresa]     = useState(null)
  const [todasEmpresas, setTodasEmpresas] = useState([])
  const [denuncias,   setDenuncias]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [busca,       setBusca]       = useState('')
  const [selecionada, setSelecionada] = useState(null)
  const [linkAberto,  setLinkAberto]  = useState(false)
  const [copiado,     setCopiado]     = useState(false)
  const [toast,       setToast]       = useState(null)

  const link = empresa ? `${window.location.origin}/canal?emp=${empresa.id}` : ''

  async function load() {
    setLoading(true)
    const [{ data: emp }, { data: dens, error }, { data: emps }] = await Promise.all([
      supabase.from('empresas').select('id, nome, setor_ramo').eq('id', empresaId).single(),
      supabase.from('denuncias').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
      supabase.from('empresas').select('id, nome').order('nome'),
    ])
    if (error) setToast({ message: 'Erro ao carregar denúncias: ' + error.message, type: 'error' })
    setEmpresa(emp ?? null)
    setDenuncias(dens ?? [])
    setTodasEmpresas(emps ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [empresaId])

  async function copiarLink() {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function handleSalvar(id, campos) {
    const { error } = await supabase.from('denuncias').update(campos).eq('id', id)
    if (error) { setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Alterações salvas.', type: 'success' })
    load()
  }

  async function handleExcluir(id) {
    const { error } = await supabase.from('denuncias').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro ao excluir: ' + error.message, type: 'error' }); return }
    setSelecionada(null)
    setToast({ message: 'Denúncia excluída.', type: 'info' })
    load()
  }

  const filtradas = denuncias.filter(d =>
    busca.trim() === '' || d.protocolo?.toLowerCase().includes(busca.toLowerCase())
  )

  const contagem = {
    recebida:   denuncias.filter(d => d.status === 'recebida').length,
    em_analise: denuncias.filter(d => d.status === 'em_analise').length,
    concluida:  denuncias.filter(d => d.status === 'concluida').length,
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => navigate('/denuncias')}
          className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
        >
          ← Voltar
        </button>
        {todasEmpresas.length > 1 && (
          <select
            className="input text-sm flex-1 min-w-0 max-w-xs"
            value={empresaId}
            onChange={e => navigate(`/denuncias/${e.target.value}`)}
          >
            {todasEmpresas.map(e => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        )}
      </div>

      <PageHeader
        title={`📢 ${empresa?.nome ?? 'Denúncias'}`}
        subtitle={empresa?.setor_ramo ?? 'Canal de Denúncias'}
        action={
          <button
            onClick={() => { setLinkAberto(true); setCopiado(false) }}
            className="text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0 transition-colors"
            style={{ background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
          >
            🔗 Link do Canal
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Recebidas',  key: 'recebida',   icon: '📥', bg: '#f1f5f9', color: '#475569' },
          { label: 'Em análise', key: 'em_analise',  icon: '🔍', bg: '#fef9c3', color: '#854d0e' },
          { label: 'Concluídas', key: 'concluida',   icon: '✅', bg: '#dcfce7', color: '#166534' },
        ].map(({ label, key, icon, bg, color }) => (
          <div key={key} className="card flex flex-col sm:flex-row items-center gap-2 py-3 text-center sm:text-left">
            <div style={{ width: 36, height: 36, background: bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{contagem[key]}</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            className="input w-full sm:w-72"
            placeholder="Buscar por protocolo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingSpinner message="Carregando denúncias..." />
        ) : !filtradas.length ? (
          <EmptyState
            icon="📭"
            title={busca ? 'Nenhum resultado encontrado' : 'Nenhuma denúncia registrada'}
            description={busca ? 'Tente outro protocolo.' : 'Quando colaboradores enviarem denúncias, elas aparecerão aqui.'}
          />
        ) : (
          <div className="space-y-2">
            {filtradas.map(d => {
              const cat = CAT_COLOR[d.categoria] ?? CAT_COLOR['Outro']
              const st  = STATUS[d.status] ?? STATUS.recebida
              return (
                <div
                  key={d.id}
                  onClick={() => setSelecionada(d)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white cursor-pointer hover:bg-bg transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-navy font-mono">{d.protocolo}</span>
                      {d.envolve_lideranca && <span title="Envolve liderança">⚠️</span>}
                      {d.quer_contato      && <span title="Quer contato">📬</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge text={d.categoria} bg={cat.bg} color={cat.color} />
                      <Badge text={st.label}    bg={st.bg}  color={st.color}  />
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(d.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className="text-muted text-sm flex-shrink-0">›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selecionada && (
        <DetalheModal
          denuncia={selecionada}
          onClose={() => setSelecionada(null)}
          onSalvar={handleSalvar}
          onExcluir={handleExcluir}
        />
      )}

      {linkAberto && empresa && (
        <Modal title="📢 Canal de Denúncias" onClose={() => setLinkAberto(false)} size="sm">
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">
              Compartilhe este link para que colaboradores de <strong className="text-navy">{empresa.nome}</strong> possam registrar denúncias de forma <strong>100% anônima</strong>.
            </p>
            <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
              <span className="text-xs text-navy break-all flex-1 text-left font-mono">{link}</span>
              <button onClick={copiarLink} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
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
            <button className="btn-secondary w-full" onClick={() => setLinkAberto(false)}>Fechar</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
