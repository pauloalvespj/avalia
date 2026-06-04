import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Modal, EmptyState, LoadingSpinner, Toast, ConfirmModal } from '@/components/ui'
import { useNavigate } from 'react-router-dom'

const RH_LABEL = { sim: 'Sim', parcial: 'Parcialmente', nao: 'Não' }

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-semibold text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-navy">{value}</span>
    </div>
  )
}

export default function SetoresPage() {
  const { empresaAtiva, setorAtivo, setSetorAtivo } = useEmpresa()
  const navigate = useNavigate()

  const [setores, setSetores]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState(false)
  const [editando, setEditando] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm]         = useState({ nome: '', func_setor: '' })
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [linkAberto, setLinkAberto] = useState(false)
  const [copiado, setCopiado]       = useState(false)

  const linkEmpresa = empresaAtiva
    ? `${window.location.origin}/questionario?empresa=${empresaAtiva.id}`
    : ''

  async function copiarLink() {
    await navigator.clipboard.writeText(linkEmpresa)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function load() {
    if (!empresaAtiva) return
    setLoading(true)
    const { data, error } = await supabase
      .from('setores')
      .select('*')
      .eq('empresa_id', empresaAtiva.id)
      .order('nome')
    if (error) setToast({ message: 'Erro ao carregar setores: ' + error.message, type: 'error' })
    setSetores(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [empresaAtiva])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', func_setor: '', ativo: true })
    setModal(true)
  }

  function abrirEditar(s) {
    setEditando(s)
    setForm({ nome: s.nome, func_setor: s.func_setor ?? '', ativo: s.ativo !== false })
    setModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = {
      nome:       form.nome.trim(),
      func_setor: parseInt(form.func_setor) || 0,
      ativo:      form.ativo,
    }
    let error
    if (editando) {
      ;({ error } = await supabase.from('setores').update(payload).eq('id', editando.id))
    } else {
      ;({ error } = await supabase.from('setores').insert({ ...payload, empresa_id: empresaAtiva.id }))
    }
    setSaving(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editando ? 'Setor atualizado!' : 'Setor criado!', type: 'success' })
    setModal(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('setores').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    if (setorAtivo?.id === id) setSetorAtivo(null)
    setToast({ message: 'Setor removido.', type: 'info' })
    load()
  }

  function selecionarSetor(s) {
    setSetorAtivo(s)
    setToast({ message: `Setor ativo: ${s.nome}`, type: 'success' })
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior para ver seus dados e setores." />
  )

  const e = empresaAtiva

  return (
    <div>
      <PageHeader
        title={e.nome}
        subtitle="Dados da empresa e setores"
        action={<button className="btn-secondary" onClick={() => navigate('/empresas')}>← Empresas</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Dados da empresa ── */}
        <div className="card">
          <div className="card-title">📝 Dados da Empresa</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="col-span-2">
              <InfoRow label="Razão Social" value={e.nome} />
            </div>
            <InfoRow label="CNPJ"               value={e.cnpj} />
            <InfoRow label="Ramo de Atividade"  value={e.setor_ramo} />
            <InfoRow label="Nº de Funcionários" value={e.func_total ? `${e.func_total} funcionários` : null} />
            <InfoRow label="Data de Início"     value={e.data_inicio ? new Date(e.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
            <InfoRow label="Responsável"        value={e.responsavel} />
            <InfoRow label="Contato"            value={e.contato} />
            <InfoRow label="Rotatividade"       value={e.turnover} />
            <InfoRow label="Atestados/mês"      value={e.atestados} />
            <InfoRow label="RH Estruturado"     value={RH_LABEL[e.rh]} />
            {e.demanda && (
              <div className="col-span-2">
                <InfoRow label="Principal Demanda" value={e.demanda} />
              </div>
            )}
            {e.historico && (
              <div className="col-span-2">
                <InfoRow label="Histórico / Contexto" value={e.historico} />
              </div>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-border-light flex flex-wrap gap-2">
            <button className="btn-primary px-4 py-2"
              onClick={() => { setLinkAberto(true); setCopiado(false) }}>
              🔗 Link do Questionário
            </button>
            <button className="btn-secondary text-xs" onClick={() => navigate('/empresas')}>
              ✏️ Editar dados da empresa
            </button>
          </div>
        </div>

        {/* ── Setores ── */}
        <div className="card">
          <div className="card-title justify-between">
            <span>🏬 Setores</span>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={abrirNovo}>
              + Novo Setor
            </button>
          </div>

          {loading ? <LoadingSpinner message="Carregando setores..." /> :
           !setores.length ? (
            <EmptyState icon="🏬" title="Nenhum setor cadastrado"
              description="Crie o primeiro setor para gerar o link do questionário."
              action={<button className="btn-primary" onClick={abrirNovo}>+ Novo Setor</button>} />
          ) : (
            <div className="space-y-2">
              {setores.map(s => {
                const isAtivo = setorAtivo?.id === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => selecionarSetor(s)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all"
                    style={{
                      borderColor: isAtivo ? '#3a7bd5' : '#e8ecf4',
                      background:  isAtivo ? '#ddeeff' : '#ffffff',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-navy">{s.nome}</span>
                        {isAtivo && (
                          <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ background: '#3a7bd5' }}>
                            Ativo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {s.func_setor ? `${s.func_setor} funcionários` : 'Funcionários não informados'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={ev => ev.stopPropagation()}>
                      <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => abrirEditar(s)}>
                        ✏️ Editar
                      </button>
                      <button className="btn-danger text-xs px-3 py-1.5" onClick={() => setDeleting(s)}>
                        🗑 Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {linkAberto && (
        <Modal title="🔗 Link do Questionário" onClose={() => setLinkAberto(false)} size="sm">
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">
              Compartilhe este link com os colaboradores de <strong className="text-navy">{empresaAtiva.nome}</strong>.
              Ao abrir, cada pessoa escolhe o próprio setor antes de responder.
            </p>

            <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
              <span className="text-xs text-navy break-all flex-1 text-left font-mono">{linkEmpresa}</span>
              <button onClick={copiarLink} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
                {copiado ? '✅ Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkEmpresa)}`}
                alt="QR Code"
                width={200}
                height={200}
                className="rounded-xl border border-border"
              />
            </div>

            <p className="text-xs text-muted">
              O link não expira e não requer login.
            </p>

            <button className="btn-secondary w-full" onClick={() => setLinkAberto(false)}>Fechar</button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={editando ? 'Editar Setor' : 'Novo Setor'} onClose={() => setModal(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome do Setor *</label>
              <input className="input" placeholder="Ex: Produção, Vendas, RH..."
                value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Nº de Funcionários no Setor</label>
              <input className="input" type="number" placeholder="0"
                value={form.func_setor} onChange={e => setForm(f => ({ ...f, func_setor: e.target.value }))} />
            </div>
            {editando && (
              <div>
                <label className="label">Status</label>
                <select className="input"
                  value={form.ativo ? 'ativo' : 'inativo'}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'ativo' }))}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}
                disabled={saving || !form.nome.trim()}>
                {saving ? 'Salvando...' : editando ? 'Salvar' : 'Criar Setor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal title="Remover setor" danger
          message={`Remover "${deleting.nome}"? Todas as respostas e dados do setor serão apagados.`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(deleting.id)}
          onClose={() => setDeleting(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
