import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { useAuth } from '@/hooks/useAuth'
import {
  PageHeader, EmptyState, LoadingSpinner,
  Modal, Toast, ConfirmModal,
} from '@/components/ui'
import { Link } from 'react-router-dom'

const EIXOS = [
  { key: 'clima',          nome: '1. Clima e Relacionamentos'         },
  { key: 'lideranca',      nome: '2. Liderança e Gestão'              },
  { key: 'carga',          nome: '3. Carga e Organização do Trabalho' },
  { key: 'saude',          nome: '4. Saúde e Bem-Estar'               },
  { key: 'sentido',        nome: '5. Sentido e Valores'               },
  { key: 'comportamentos', nome: '6. Comportamentos Ofensivos'        },
]

// ── Card colapsável de cada eixo ───────────────────────────────────────────
function EixoCard({ eixo, sintese, atencao, onChange, onBlur }) {
  const [aberto, setAberto] = useState(true)
  const [saved, setSaved]   = useState(false)
  const temConteudo = sintese || atencao

  async function handleBlur(campo, valor) {
    await onBlur(eixo.key, campo, valor)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card p-0 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setAberto(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-navy text-sm">{eixo.nome}</span>
          {temConteudo && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary">
              Preenchido
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-success font-semibold">Salvo ✓</span>}
          <span className="text-muted text-sm">{aberto ? '▲' : '▼'}</span>
        </div>
      </button>

      {aberto && (
        <div className="border-t border-border px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="label">Síntese do eixo</label>
            <textarea
              className="input resize-none text-sm" rows={4}
              placeholder="O que foi observado neste eixo durante as entrevistas..."
              value={sintese}
              onChange={e => onChange(eixo.key, 'sintese', e.target.value)}
              onBlur={e => handleBlur('sintese', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pontos de atenção</label>
            <textarea
              className="input resize-none text-sm" rows={4}
              placeholder="O que requer cuidado ou intervenção..."
              value={atencao}
              onChange={e => onChange(eixo.key, 'atencao', e.target.value)}
              onBlur={e => handleBlur('atencao', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal: nova escuta (inclui seletor de setor) ───────────────────────────
function NovaEscutaModal({ setores, onClose, onSalvar }) {
  const [form, setForm] = useState({ setor_id: '', data_entrevista: '', num_participantes: '' })
  const [saving, setSaving] = useState(false)

  const valido = form.setor_id && form.data_entrevista

  async function handleSalvar() {
    if (!valido) return
    setSaving(true)
    await onSalvar(form)
    setSaving(false)
  }

  return (
    <Modal title="Nova Escuta da Equipe" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Setor *</label>
          <select className="input" value={form.setor_id}
            onChange={e => setForm(f => ({ ...f, setor_id: e.target.value }))}>
            <option value="">Selecione o setor...</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Data da Escuta *</label>
          <input type="date" className="input"
            value={form.data_entrevista}
            onChange={e => setForm(f => ({ ...f, data_entrevista: e.target.value }))} />
        </div>
        <div>
          <label className="label">Nº de Participantes</label>
          <input type="number" min={0} className="input" placeholder="Ex: 12"
            value={form.num_participantes}
            onChange={e => setForm(f => ({ ...f, num_participantes: e.target.value }))} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valido || saving} onClick={handleSalvar}>
            {saving ? 'Criando...' : 'Criar e Abrir →'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: editar metadados da escuta ──────────────────────────────────────
function EditarEscutaModal({ inicial, onClose, onSalvar }) {
  const [form, setForm] = useState(inicial)
  const [saving, setSaving] = useState(false)

  async function handleSalvar() {
    if (!form.data_entrevista) return
    setSaving(true)
    await onSalvar(form)
    setSaving(false)
  }

  return (
    <Modal title="Editar Escuta" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Data da Escuta *</label>
          <input type="date" className="input"
            value={form.data_entrevista}
            onChange={e => setForm(f => ({ ...f, data_entrevista: e.target.value }))} />
        </div>
        <div>
          <label className="label">Nº de Participantes</label>
          <input type="number" min={0} className="input" placeholder="Ex: 12"
            value={form.num_participantes}
            onChange={e => setForm(f => ({ ...f, num_participantes: e.target.value }))} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!form.data_entrevista || saving} onClick={handleSalvar}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function EscutaPage() {
  const { empresaAtiva } = useEmpresa()
  const { user } = useAuth()

  const [setores, setSetores]             = useState([])
  const [view, setView]                   = useState('lista')
  const [escutas, setEscutas]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [escutaAtiva, setEscutaAtiva]     = useState(null)
  const [eixos, setEixos]                 = useState({})
  const [sinteseGeral, setSinteseGeral]   = useState('')
  const [observacoes, setObservacoes]     = useState('')
  const [saving, setSaving]               = useState(false)
  const [toast, setToast]                 = useState(null)

  // Carrega setores da empresa
  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); setEscutas([]); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).order('nome')
      .then(({ data }) => setSetores(data ?? []))
  }, [empresaAtiva?.id])

  // Carrega todas as escutas da empresa (via IDs dos setores)
  async function loadEscutas(lista = setores) {
    if (!empresaAtiva || lista.length === 0) { setEscutas([]); return }
    setLoading(true)
    const ids = lista.map(s => s.id)
    const { data, error } = await supabase
      .from('escutas_equipe')
      .select('id, data_entrevista, num_participantes, setor_id, escutas_equipe_eixos(eixo_key, sintese, atencao)')
      .in('setor_id', ids)
      .order('data_entrevista', { ascending: false })
    if (error) showToast('Erro ao carregar escutas.', 'error')
    else setEscutas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadEscutas(setores) }, [setores])

  // ── Cria nova sessão ────────────────────────────────────────────────────
  async function criarEscuta(form) {
    const { data, error } = await supabase
      .from('escutas_equipe')
      .insert({
        setor_id:          form.setor_id,
        consultor_id:      user.id,
        data_entrevista:   form.data_entrevista || null,
        num_participantes: parseInt(form.num_participantes) || null,
      })
      .select()
      .single()
    if (error) { showToast('Erro ao criar escuta.', 'error'); return }
    setShowModal(false)
    await loadEscutas()
    await abrirEscuta(data)
  }

  // ── Abre sessão existente ───────────────────────────────────────────────
  async function abrirEscuta(escuta) {
    setEscutaAtiva(escuta)
    const [{ data: eixosData }, { data: escutaData }] = await Promise.all([
      supabase.from('escutas_equipe_eixos').select('eixo_key, sintese, atencao').eq('escuta_id', escuta.id),
      supabase.from('escutas_equipe').select('sintese_geral, observacoes').eq('id', escuta.id).single(),
    ])
    const mapa = {}
    ;(eixosData ?? []).forEach(r => {
      mapa[r.eixo_key] = { sintese: r.sintese ?? '', atencao: r.atencao ?? '' }
    })
    setEixos(mapa)
    setSinteseGeral(escutaData?.sintese_geral ?? '')
    setObservacoes(escutaData?.observacoes ?? '')
    setView('sessao')
  }

  // ── Edita metadados ─────────────────────────────────────────────────────
  async function editarEscuta(form) {
    const { data, error } = await supabase
      .from('escutas_equipe')
      .update({
        data_entrevista:   form.data_entrevista || null,
        num_participantes: parseInt(form.num_participantes) || null,
      })
      .eq('id', escutaAtiva.id)
      .select()
      .single()
    if (error) { showToast('Erro ao atualizar.', 'error'); return }
    setEscutaAtiva(prev => ({ ...prev, ...data }))
    setShowEditModal(false)
    await loadEscutas()
    showToast('Dados atualizados!', 'success')
  }

  // ── Auto-save blur de eixo ──────────────────────────────────────────────
  async function salvarEixo(eixoKey, campo, novoValor) {
    if (!escutaAtiva) return
    const atual = eixos[eixoKey] ?? { sintese: '', atencao: '' }
    const payload = { ...atual, [campo]: novoValor }
    const { error } = await supabase
      .from('escutas_equipe_eixos')
      .upsert(
        { escuta_id: escutaAtiva.id, eixo_key: eixoKey, sintese: payload.sintese || null, atencao: payload.atencao || null },
        { onConflict: 'escuta_id,eixo_key' }
      )
    if (error) showToast('Erro ao salvar eixo.', 'error')
  }

  // ── Auto-save blur de campo da escuta ───────────────────────────────────
  async function salvarCampoEscuta(campo, valor) {
    if (!escutaAtiva) return
    await supabase.from('escutas_equipe').update({ [campo]: valor || null }).eq('id', escutaAtiva.id)
  }

  // ── Salva tudo ──────────────────────────────────────────────────────────
  async function salvar() {
    if (!escutaAtiva) return
    setSaving(true)
    const eixosPayload = EIXOS.map(e => ({
      escuta_id: escutaAtiva.id,
      eixo_key:  e.key,
      sintese:   eixos[e.key]?.sintese || null,
      atencao:   eixos[e.key]?.atencao || null,
    }))
    await Promise.all([
      supabase.from('escutas_equipe_eixos').upsert(eixosPayload, { onConflict: 'escuta_id,eixo_key' }),
      supabase.from('escutas_equipe').update({ sintese_geral: sinteseGeral || null, observacoes: observacoes || null }).eq('id', escutaAtiva.id),
    ])
    showToast('Escuta salva!', 'success')
    await loadEscutas()
    setSaving(false)
  }

  // ── Exclui sessão ───────────────────────────────────────────────────────
  async function deletarEscuta(escuta) {
    const { error } = await supabase.from('escutas_equipe').delete().eq('id', escuta.id)
    if (error) { showToast('Erro ao excluir.', 'error'); return }
    showToast('Escuta excluída.', 'success')
    setView('lista')
    setEscutaAtiva(null)
    await loadEscutas()
  }

  function showToast(message, type = 'success') { setToast({ message, type }) }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function setorNome(setor_id) {
    return setores.find(s => s.id === setor_id)?.nome ?? '—'
  }

  // ── Sem empresa ─────────────────────────────────────────────────────────
  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior."
      action={<Link to="/setores" className="btn-primary">Ir para Empresas</Link>} />
  )

  const botoesAcao = (
    <div className="flex gap-2">
      <button className="btn-secondary" onClick={() => { setView('lista'); setEscutaAtiva(null) }}>
        Cancelar
      </button>
      <button className="btn-primary" disabled={saving} onClick={salvar}>
        {saving ? 'Salvando...' : '💾 Salvar'}
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ════ LISTA ══════════════════════════════════════════════════════ */}
      {view === 'lista' && (
        <>
          <PageHeader
            title="Escuta da Equipe"
            eyebrow={empresaAtiva.nome}
            subtitle="Registro das sessões de escuta com colaboradores"
            action={
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                + Nova Escuta
              </button>
            }
          />

          {loading && <LoadingSpinner />}

          {!loading && escutas.length === 0 && (
            <EmptyState
              icon="🎙️"
              title="Nenhuma escuta registrada"
              description='Clique em "Nova Escuta" para registrar uma sessão de escuta da equipe.'
              action={
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                  + Nova Escuta
                </button>
              }
            />
          )}

          {!loading && escutas.length > 0 && (
            <div className="flex flex-col gap-2">
              {escutas.map(e => {
                const arr = e.escutas_equipe_eixos ?? []
                const preenchidos = arr.filter(x => x.sintese?.trim() || x.atencao?.trim()).length
                const status =
                  preenchidos === 0 ? { label: 'Em branco',             cls: 'badge-gray'   } :
                  preenchidos < 6   ? { label: `${preenchidos}/6 eixos`, cls: 'badge-yellow' } :
                                      { label: 'Completo ✓',            cls: 'badge-green'  }
                return (
                  <button
                    key={e.id}
                    onClick={() => abrirEscuta(e)}
                    className="card py-3 flex items-center gap-4 text-left hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                  >
                    <span
                      className="text-xs font-mono font-semibold px-2.5 py-1 rounded flex-shrink-0"
                      style={{ background: '#f1f5f9', color: '#64748b' }}
                    >
                      {formatDate(e.data_entrevista)}
                    </span>
                    <div className="w-px h-5 bg-border flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm truncate">{setorNome(e.setor_id)}</p>
                      {e.num_participantes && (
                        <p className="text-xs text-muted truncate">{e.num_participantes} participantes</p>
                      )}
                    </div>
                    <span className={`${status.cls} flex-shrink-0`}>{status.label}</span>
                    <span className="text-muted text-sm flex-shrink-0 group-hover:text-primary transition-colors">→</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ════ SESSÃO ═════════════════════════════════════════════════════ */}
      {view === 'sessao' && escutaAtiva && (
        <>
          <button
            className="btn-secondary text-xs py-1 px-2.5"
            onClick={() => { setView('lista'); setEscutaAtiva(null) }}
          >
            ← Voltar à lista
          </button>

          <PageHeader
            title="Escuta da Equipe"
            eyebrow={empresaAtiva.nome}
            subtitle={setorNome(escutaAtiva.setor_id)}
            action={botoesAcao}
          />

          {/* Cabeçalho da sessão */}
          <div className="card py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div>
                <p className="label">Data</p>
                <p className="font-bold text-navy text-sm">{formatDate(escutaAtiva.data_entrevista)}</p>
              </div>
              {escutaAtiva.num_participantes && (
                <>
                  <div className="w-px h-8 bg-border hidden sm:block" />
                  <div>
                    <p className="label">Participantes</p>
                    <p className="font-bold text-navy text-sm">{escutaAtiva.num_participantes}</p>
                  </div>
                </>
              )}
              <div className="flex-1" />
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#ddeeff', color: '#3a7bd5' }}>
                {setorNome(escutaAtiva.setor_id)}
              </span>
              <button className="btn-edit" title="Editar dados da escuta"
                onClick={() => setShowEditModal(true)}>
                ✏️
              </button>
            </div>
          </div>

          {/* Layout duas colunas */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <div className="w-full lg:w-3/5 space-y-4">
              {EIXOS.map(eixo => (
                <EixoCard
                  key={eixo.key}
                  eixo={eixo}
                  sintese={eixos[eixo.key]?.sintese ?? ''}
                  atencao={eixos[eixo.key]?.atencao ?? ''}
                  onChange={(key, campo, val) =>
                    setEixos(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), [campo]: val } }))
                  }
                  onBlur={salvarEixo}
                />
              ))}
            </div>

            <div className="w-full lg:w-2/5 space-y-4 lg:sticky lg:top-4">
              <div className="card">
                <label className="label font-bold">Síntese Geral</label>
                <p className="text-xs text-muted mb-2">Visão consolidada — aparece no relatório.</p>
                <textarea className="input resize-none text-sm" rows={8}
                  placeholder="Síntese consolidada das percepções coletadas..."
                  value={sinteseGeral}
                  onChange={e => setSinteseGeral(e.target.value)}
                  onBlur={e => salvarCampoEscuta('sintese_geral', e.target.value)} />
              </div>
              <div className="card">
                <label className="label font-bold">Observações do Psicólogo</label>
                <p className="text-xs text-muted mb-2">
                  <strong>Não aparece no relatório.</strong> Uso interno.
                </p>
                <textarea className="input resize-none text-sm" rows={8}
                  placeholder="Anotações pessoais, hipóteses, contexto adicional..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  onBlur={e => salvarCampoEscuta('observacoes', e.target.value)} />
              </div>

              <div className="flex items-center justify-between pb-2">
                <button className="btn-danger text-xs"
                  onClick={() => setConfirmDelete(escutaAtiva)}>
                  🗑 Excluir esta escuta
                </button>
                {botoesAcao}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modais ── */}
      {showModal && (
        <NovaEscutaModal
          setores={setores}
          onClose={() => setShowModal(false)}
          onSalvar={criarEscuta}
        />
      )}

      {showEditModal && escutaAtiva && (
        <EditarEscutaModal
          inicial={{
            data_entrevista:   escutaAtiva.data_entrevista   ?? '',
            num_participantes: escutaAtiva.num_participantes ?? '',
          }}
          onClose={() => setShowEditModal(false)}
          onSalvar={editarEscuta}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir escuta"
          message={`Deseja excluir a escuta de ${formatDate(confirmDelete.data_entrevista)}? Todos os eixos preenchidos também serão removidos.`}
          confirmLabel="Excluir"
          danger
          onConfirm={() => deletarEscuta(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
