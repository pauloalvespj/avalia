import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Modal, EmptyState, LoadingSpinner, Toast, ConfirmModal } from '@/components/ui'

const FORM_VAZIO = {
  nome: '', cnpj: '', setor_ramo: '', func_total: '',
  data_inicio: '', responsavel: '', contato: '', demanda: '',
  historico: '', turnover: '', atestados: '', rh: '',
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function EmpresasPage() {
  const { user } = useAuth()
  const { setEmpresaAtiva } = useEmpresa()
  const navigate = useNavigate()

  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editando, setEditando] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast]       = useState(null)
  const [form, setForm]         = useState(FORM_VAZIO)
  const [saving, setSaving]     = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('consultor_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setToast({ message: 'Erro ao carregar: ' + error.message, type: 'error' })
    setEmpresas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function abrirNova() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModal(true)
  }

  function abrirEditar(e) {
    setEditando(e)
    setForm({
      nome:        e.nome        ?? '',
      cnpj:        e.cnpj        ?? '',
      setor_ramo:  e.setor_ramo  ?? '',
      func_total:  e.func_total  ?? '',
      data_inicio: e.data_inicio ?? '',
      responsavel: e.responsavel ?? '',
      contato:     e.contato     ?? '',
      demanda:     e.demanda     ?? '',
      historico:   e.historico   ?? '',
      turnover:    e.turnover    ?? '',
      atestados:   e.atestados   ?? '',
      rh:          e.rh          ?? '',
    })
    setModal(true)
  }

  function fecharModal() {
    setModal(false)
    setEditando(null)
    setForm(FORM_VAZIO)
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)

    const payload = {
      nome:        form.nome.trim(),
      cnpj:        form.cnpj,
      setor_ramo:  form.setor_ramo,
      func_total:  parseInt(form.func_total) || 0,
      data_inicio: form.data_inicio || null,
      responsavel: form.responsavel,
      contato:     form.contato,
      demanda:     form.demanda,
      historico:   form.historico,
      turnover:    form.turnover,
      atestados:   form.atestados,
      rh:          form.rh,
    }

    let error
    if (editando) {
      ;({ error } = await supabase.from('empresas').update(payload).eq('id', editando.id))
    } else {
      const { data: nova, error: errEmpresa } = await supabase
        .from('empresas')
        .insert({ ...payload, consultor_id: user.id })
        .select('id')
        .single()
      error = errEmpresa
      if (!error && nova) {
        // Cria setor "Geral" automaticamente para a nova empresa
        await supabase.from('setores').insert({ empresa_id: nova.id, nome: 'Geral', func_setor: payload.func_total || 0 })
      }
    }

    setSaving(false)
    if (error) { setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' }); return }
    setToast({ message: editando ? 'Empresa atualizada!' : 'Empresa criada com setor "Geral"!', type: 'success' })
    fecharModal()
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('empresas').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro ao remover: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Empresa removida.', type: 'info' })
    load()
  }

  function handleAbrir(empresa) {
    setEmpresaAtiva(empresa)
    navigate('/setores')
  }

  const RH_LABELS = { sim: 'RH Estruturado', parcial: 'RH Parcial', nao: 'Sem RH' }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle="Gerencie as empresas da sua consultoria"
        action={<button className="btn-primary" onClick={abrirNova}>+ Nova Empresa</button>}
      />

      {!empresas.length ? (
        <EmptyState icon="🏢" title="Nenhuma empresa cadastrada"
          description="Crie a primeira empresa para começar."
          action={<button className="btn-primary" onClick={abrirNova}>Criar empresa</button>} />
      ) : (
        <div className="grid gap-3">
          {empresas.map(e => (
            <div key={e.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-navy">{e.nome}</div>
                <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {e.cnpj        && <span>{e.cnpj}</span>}
                  {e.setor_ramo  && <span>{e.setor_ramo}</span>}
                  {e.func_total > 0 && <span>{e.func_total} funcionários</span>}
                  {e.responsavel && <span>Resp: {e.responsavel}</span>}
                  {e.rh          && <span>{RH_LABELS[e.rh]}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => abrirEditar(e)}>
                  Editar
                </button>
                <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleAbrir(e)}>
                  Abrir →
                </button>
                <button
                  className="text-xs px-2 py-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => setDeleting(e)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova / editar */}
      {modal && (
        <Modal
          title={editando ? `Editar — ${editando.nome}` : 'Nova Empresa'}
          onClose={fecharModal}
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <Campo label="Razão Social *">
                <input className="input" placeholder="Nome da empresa"
                  value={form.nome} onChange={f('nome')} autoFocus />
              </Campo>
            </div>

            <Campo label="CNPJ">
              <input className="input" placeholder="00.000.000/0001-00"
                value={form.cnpj} onChange={f('cnpj')} />
            </Campo>

            <Campo label="Ramo de Atividade">
              <input className="input" placeholder="Ex: Varejo, Serviços..."
                value={form.setor_ramo} onChange={f('setor_ramo')} />
            </Campo>

            <Campo label="Nº de Funcionários">
              <input className="input" type="number" placeholder="0"
                value={form.func_total} onChange={f('func_total')} />
            </Campo>

            <Campo label="Data de Início">
              <input className="input" type="date"
                value={form.data_inicio} onChange={f('data_inicio')} />
            </Campo>

            <Campo label="Responsável">
              <input className="input" placeholder="Nome do responsável"
                value={form.responsavel} onChange={f('responsavel')} />
            </Campo>

            <Campo label="Contato">
              <input className="input" placeholder="E-mail ou telefone"
                value={form.contato} onChange={f('contato')} />
            </Campo>

            <Campo label="Taxa de Rotatividade">
              <input className="input" placeholder="Ex: 35%/ano"
                value={form.turnover} onChange={f('turnover')} />
            </Campo>

            <Campo label="Atestados (mês)">
              <input className="input" placeholder="Ex: 12/mês"
                value={form.atestados} onChange={f('atestados')} />
            </Campo>

            <Campo label="RH Estruturado?">
              <select className="input" value={form.rh} onChange={f('rh')}>
                <option value="">— Selecione —</option>
                <option value="sim">Sim</option>
                <option value="parcial">Parcialmente</option>
                <option value="nao">Não</option>
              </select>
            </Campo>

            <div className="col-span-2">
              <Campo label="Principal Queixa / Demanda">
                <textarea className="input" rows={2}
                  placeholder="Descreva a principal demanda ou queixa da empresa..."
                  value={form.demanda} onChange={f('demanda')} />
              </Campo>
            </div>

            <div className="col-span-2">
              <Campo label="Histórico / Contexto">
                <textarea className="input" rows={3}
                  placeholder="Contexto organizacional, histórico relevante..."
                  value={form.historico} onChange={f('historico')} />
              </Campo>
            </div>

            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}
                disabled={saving || !form.nome.trim()}>
                {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Empresa'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal title="Remover empresa" danger
          message={`Tem certeza que deseja remover "${deleting.nome}"? Todos os setores e dados serão apagados.`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(deleting.id)}
          onClose={() => setDeleting(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
