import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { useAuth } from '@/hooks/useAuth'
import {
  PageHeader, EmptyState, LoadingSpinner,
  Modal, Toast, ConfirmModal, AcessoNegado,
} from '@/components/ui'
import { Link } from 'react-router-dom'

const BLOCOS = [
  { num: 1, titulo: 'Percepção Geral do Ambiente de Trabalho' },
  { num: 2, titulo: 'Gestão de Demandas e Carga de Trabalho' },
  { num: 3, titulo: 'Autonomia e Desenvolvimento da Equipe' },
  { num: 4, titulo: 'Relacionamento, Conflitos e Gestão de Pessoas' },
  { num: 5, titulo: 'Cultura, Valores e Reconhecimento' },
  { num: 6, titulo: 'Absenteísmo, Afastamentos e Indicadores' },
  { num: 7, titulo: 'Expectativas e Abertura para Mudança' },
]

// ── Card de cada bloco no roteiro ──────────────────────────────────────────
function BlocoCard({ bloco, texto, onChange, onBlur, readOnly }) {
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    await onBlur(bloco.num, texto)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center
                       text-xs font-black flex-shrink-0"
            style={{ background: '#ddeeff', color: '#3a7bd5' }}
          >
            {bloco.num}
          </span>
          <h3 className="font-bold text-navy text-sm leading-snug">{bloco.titulo}</h3>
        </div>
        {saved && <span className="text-xs text-success font-semibold flex-shrink-0">Salvo ✓</span>}
      </div>
      <textarea
        className="input resize-none text-sm"
        rows={5}
        placeholder="Anote aqui as observações da entrevista..."
        value={texto}
        readOnly={readOnly}
        onChange={e => onChange(bloco.num, e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  )
}

// ── Modal reutilizável: criar ou editar entrevista ─────────────────────────
function EntrevistaModal({ titulo, inicial, labelSalvar, onClose, onSalvar }) {
  const [form, setForm] = useState(
    inicial ?? { data_entrevista: '', nome_gestor: '', cargo: '' }
  )
  const [saving, setSaving] = useState(false)

  const valido = form.data_entrevista && form.nome_gestor.trim()

  async function handleSalvar() {
    if (!valido) return
    setSaving(true)
    await onSalvar(form)
    setSaving(false)
  }

  return (
    <Modal title={titulo} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Data da Entrevista *</label>
          <input
            type="date" className="input"
            value={form.data_entrevista}
            onChange={e => setForm(f => ({ ...f, data_entrevista: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Nome do Gestor / Entrevistado *</label>
          <input
            type="text" className="input" placeholder="Ex: João Silva"
            value={form.nome_gestor}
            onChange={e => setForm(f => ({ ...f, nome_gestor: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Cargo / Função</label>
          <input
            type="text" className="input" placeholder="Ex: Gerente de RH"
            value={form.cargo}
            onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!valido || saving}
            onClick={handleSalvar}
          >
            {saving ? 'Salvando...' : (labelSalvar ?? 'Salvar')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function EscutaGestoresPage() {
  const { empresaAtiva } = useEmpresa()
  const { user, podeEditar, estaOculto } = useAuth()

  const [view, setView] = useState('lista')           // 'lista' | 'roteiro'
  const [entrevistas, setEntrevistas] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [entrevistaAtiva, setEntrevistaAtiva] = useState(null)
  const [respostas, setRespostas] = useState({})      // { bloco_num: texto }
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // ── Carrega lista de entrevistas com contagem de blocos preenchidos ───────
  async function loadEntrevistas() {
    if (!empresaAtiva) return
    setLoading(true)
    const { data, error } = await supabase
      .from('nr1_entrevistas_gestores')
      .select('id, data_entrevista, nome_gestor, cargo, nr1_nr1_entrevistas_gestores_blocos(bloco_num, texto)')
      .eq('empresa_id', empresaAtiva.id)
      .order('data_entrevista', { ascending: false })
    if (error) showToast('Erro ao carregar entrevistas.', 'error')
    else setEntrevistas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadEntrevistas() }, [empresaAtiva?.id])

  // ── Cria nova entrevista e abre o roteiro ────────────────────────────────
  async function criarEntrevista(form) {
    const { data, error } = await supabase
      .from('nr1_entrevistas_gestores')
      .insert({
        empresa_id:      empresaAtiva.id,
        consultor_id:    user.id,
        data_entrevista: form.data_entrevista,
        nome_gestor:     form.nome_gestor.trim(),
        cargo:           form.cargo.trim() || null,
      })
      .select()
      .single()

    if (error) { showToast('Erro ao criar entrevista.', 'error'); return }
    setShowModal(false)
    await loadEntrevistas()
    await abrirRoteiro(data)
  }

  // ── Abre uma entrevista existente (carrega blocos do banco) ──────────────
  async function abrirRoteiro(entrevista) {
    setEntrevistaAtiva(entrevista)
    const { data } = await supabase
      .from('nr1_nr1_entrevistas_gestores_blocos')
      .select('bloco_num, texto')
      .eq('entrevista_id', entrevista.id)
    const mapa = {}
    ;(data ?? []).forEach(r => { mapa[r.bloco_num] = r.texto ?? '' })
    setRespostas(mapa)
    setView('roteiro')
  }

  // ── Edita metadados da entrevista ───────────────────────────────────────
  async function editarEntrevista(form) {
    const { data, error } = await supabase
      .from('nr1_entrevistas_gestores')
      .update({
        data_entrevista: form.data_entrevista,
        nome_gestor:     form.nome_gestor.trim(),
        cargo:           form.cargo.trim() || null,
      })
      .eq('id', entrevistaAtiva.id)
      .select()
      .single()
    if (error) { showToast('Erro ao atualizar entrevista.', 'error'); return }
    setEntrevistaAtiva(data)
    setShowEditModal(false)
    await loadEntrevistas()
    showToast('Dados atualizados!', 'success')
  }

  // ── Salva todos os blocos de uma vez ────────────────────────────────────
  async function salvar() {
    if (!entrevistaAtiva) return
    setSaving(true)
    const payload = BLOCOS.map(b => ({
      entrevista_id: entrevistaAtiva.id,
      bloco_num:     b.num,
      texto:         respostas[b.num] || null,
    }))
    const { error } = await supabase
      .from('nr1_nr1_entrevistas_gestores_blocos')
      .upsert(payload, { onConflict: 'entrevista_id,bloco_num' })
    if (error) showToast('Erro ao salvar. Tente novamente.', 'error')
    else { showToast('Roteiro salvo!', 'success'); await loadEntrevistas() }
    setSaving(false)
  }

  // ── Salva um bloco individual ao perder o foco ───────────────────────────
  async function salvarBloco(blocoNum, texto) {
    if (!entrevistaAtiva) return
    const { error } = await supabase
      .from('nr1_nr1_entrevistas_gestores_blocos')
      .upsert(
        { entrevista_id: entrevistaAtiva.id, bloco_num: blocoNum, texto: texto || null },
        { onConflict: 'entrevista_id,bloco_num' }
      )
    if (error) showToast('Erro ao salvar bloco.', 'error')
  }

  // ── Deleta entrevista (cascata remove os blocos) ─────────────────────────
  async function deletarEntrevista(entrevista) {
    const { error } = await supabase
      .from('nr1_entrevistas_gestores')
      .delete()
      .eq('id', entrevista.id)
    if (error) { showToast('Erro ao excluir entrevista.', 'error'); return }
    showToast('Entrevista excluída.', 'success')
    setView('lista')
    setEntrevistaAtiva(null)
    await loadEntrevistas()
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  // ── Sem empresa selecionada ──────────────────────────────────────────────
  if (estaOculto('escuta_gestores')) return <AcessoNegado />
  if (!empresaAtiva) return (
    <EmptyState
      icon="🏢"
      title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior para acessar as entrevistas."
      action={<Link to="/setores" className="btn-primary">Ir para Empresas</Link>}
    />
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ════ LISTA DE ENTREVISTAS ════════════════════════════════════════ */}
      {view === 'lista' && (
        <>
          <PageHeader
            title="Escuta dos Gestores / RH"
            eyebrow={empresaAtiva.nome}
            subtitle="Registro das entrevistas com gestores e lideranças"
            action={podeEditar('escuta_gestores') ? (
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                + Nova Entrevista
              </button>
            ) : null}
          />

          {loading && <LoadingSpinner />}

          {!loading && entrevistas.length === 0 && (
            <EmptyState
              icon="🎙️"
              title="Nenhuma entrevista registrada"
              description='Clique em "Nova Entrevista" para iniciar o roteiro com um gestor ou responsável de RH.'
              action={podeEditar('escuta_gestores') ? (
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                  + Nova Entrevista
                </button>
              ) : null}
            />
          )}

          {!loading && entrevistas.length > 0 && (
            <div className="flex flex-col gap-2">
              {entrevistas.map(e => {
                const blocos = e.nr1_nr1_entrevistas_gestores_blocos ?? []
                const preenchidos = blocos.filter(b => b.texto?.trim()).length
                const status =
                  preenchidos === 0       ? { label: 'Em branco',     cls: 'badge-gray'   } :
                  preenchidos < 7         ? { label: `${preenchidos}/7 blocos`, cls: 'badge-yellow' } :
                                            { label: 'Completo ✓',    cls: 'badge-green'  }

                return (
                  <button
                    key={e.id}
                    onClick={() => abrirRoteiro(e)}
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
                      <p className="font-bold text-navy text-sm truncate">{e.nome_gestor}</p>
                      {e.cargo && <p className="text-xs text-muted truncate">{e.cargo}</p>}
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

      {/* ════ ROTEIRO ════════════════════════════════════════════════════ */}
      {view === 'roteiro' && entrevistaAtiva && (
        <>
          {/* Voltar */}
          <button
            className="btn-secondary text-xs py-1 px-2.5"
            onClick={() => { setView('lista'); setEntrevistaAtiva(null) }}
          >
            ← Voltar à lista
          </button>

          <PageHeader
            title="Roteiro de Entrevista — 7 Blocos"
            eyebrow={empresaAtiva.nome}
            subtitle="Preencha durante ou após a entrevista. O roteiro guia a conversa."
            action={
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => { setView('lista'); setEntrevistaAtiva(null) }}
                >
                  Cancelar
                </button>
                {podeEditar('escuta_gestores') && (
                  <button className="btn-primary" disabled={saving} onClick={salvar}>
                    {saving ? 'Salvando...' : '💾 Salvar'}
                  </button>
                )}
              </div>
            }
          />

          {/* Cabeçalho da entrevista */}
          <div className="card py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div>
                <p className="label">Data</p>
                <p className="font-bold text-navy text-sm">
                  {formatDate(entrevistaAtiva.data_entrevista)}
                </p>
              </div>
              <div className="w-px h-8 bg-border hidden sm:block" />
              <div>
                <p className="label">Gestor / Entrevistado</p>
                <p className="font-bold text-navy text-sm">{entrevistaAtiva.nome_gestor}</p>
              </div>
              {entrevistaAtiva.cargo && (
                <>
                  <div className="w-px h-8 bg-border hidden sm:block" />
                  <div>
                    <p className="label">Cargo / Função</p>
                    <p className="font-bold text-navy text-sm">{entrevistaAtiva.cargo}</p>
                  </div>
                </>
              )}
              <div className="flex-1" />
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#ddeeff', color: '#3a7bd5' }}
              >
                {empresaAtiva.nome}
              </span>
              {podeEditar('escuta_gestores') && (
                <button
                  className="btn-edit"
                  title="Editar dados da entrevista"
                  onClick={() => setShowEditModal(true)}
                >
                  ✏️
                </button>
              )}
            </div>
          </div>

          {/* Grid 2 colunas — 7 blocos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BLOCOS.map(bloco => (
              <BlocoCard
                key={bloco.num}
                bloco={bloco}
                texto={respostas[bloco.num] ?? ''}
                readOnly={!podeEditar('escuta_gestores')}
                onChange={(num, texto) =>
                  setRespostas(r => ({ ...r, [num]: texto }))
                }
                onBlur={salvarBloco}
              />
            ))}
          </div>

          {/* Rodapé: excluir (esquerda) | cancelar + salvar (direita) */}
          <div className="flex items-center justify-between pt-2 pb-4">
            {podeEditar('escuta_gestores') ? (
              <button
                className="btn-danger text-xs"
                onClick={() => setConfirmDelete(entrevistaAtiva)}
              >
                🗑 Excluir esta entrevista
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => { setView('lista'); setEntrevistaAtiva(null) }}
              >
                Cancelar
              </button>
              {podeEditar('escuta_gestores') && (
                <button
                  className="btn-primary"
                  disabled={saving}
                  onClick={salvar}
                >
                  {saving ? 'Salvando...' : '💾 Salvar'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal: nova entrevista ── */}
      {showModal && (
        <EntrevistaModal
          titulo="Nova Entrevista"
          labelSalvar="Criar e Abrir Roteiro →"
          onClose={() => setShowModal(false)}
          onSalvar={criarEntrevista}
        />
      )}

      {/* ── Modal: editar entrevista ── */}
      {showEditModal && entrevistaAtiva && (
        <EntrevistaModal
          titulo="Editar Entrevista"
          labelSalvar="Salvar alterações"
          inicial={{
            data_entrevista: entrevistaAtiva.data_entrevista,
            nome_gestor:     entrevistaAtiva.nome_gestor,
            cargo:           entrevistaAtiva.cargo ?? '',
          }}
          onClose={() => setShowEditModal(false)}
          onSalvar={editarEntrevista}
        />
      )}

      {/* ── Modal: confirmar exclusão ── */}
      {confirmDelete && (
        <ConfirmModal
          title="Excluir entrevista"
          message={`Deseja excluir a entrevista de "${confirmDelete.nome_gestor}" (${formatDate(confirmDelete.data_entrevista)})? Os blocos preenchidos também serão removidos.`}
          confirmLabel="Excluir"
          danger
          onConfirm={() => deletarEntrevista(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
