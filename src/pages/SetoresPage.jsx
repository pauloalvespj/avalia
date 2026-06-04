import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, Modal, EmptyState, LoadingSpinner, Toast, ConfirmModal } from '@/components/ui'
import { useNavigate } from 'react-router-dom'

const RH_LABEL = { sim: 'Sim', parcial: 'Parcialmente', nao: 'Não' }

const FUNC_FORM_VAZIO = {
  nome: '', cargo: '', email: '', cpf: '',
  setor_id: '', data_admissao: '', ativo: true,
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-semibold text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-navy">{value}</span>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function SetoresPage() {
  const { empresaAtiva, setorAtivo, setSetorAtivo } = useEmpresa()
  const navigate = useNavigate()

  // ── Setores ──────────────────────────────────────────────────────────────────
  const [setores, setSetores]     = useState([])
  const [loadingSet, setLoadingSet] = useState(false)
  const [modalSet, setModalSet]   = useState(false)
  const [editandoSet, setEditandoSet] = useState(null)
  const [deletingSet, setDeletingSet] = useState(null)
  const [formSet, setFormSet]     = useState({ nome: '', func_setor: '' })
  const [savingSet, setSavingSet] = useState(false)

  // ── Funcionários ──────────────────────────────────────────────────────────────
  const [funcs, setFuncs]           = useState([])
  const [loadingFunc, setLoadingFunc] = useState(false)
  const [modalFunc, setModalFunc]   = useState(false)
  const [editandoFunc, setEditandoFunc] = useState(null)
  const [deletingFunc, setDeletingFunc] = useState(null)
  const [formFunc, setFormFunc]     = useState(FUNC_FORM_VAZIO)
  const [savingFunc, setSavingFunc] = useState(false)
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [busca, setBusca]           = useState('')

  const [toast, setToast] = useState(null)

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function loadSetores() {
    if (!empresaAtiva) return
    setLoadingSet(true)
    const { data, error } = await supabase
      .from('setores').select('*').eq('empresa_id', empresaAtiva.id).order('nome')
    if (error) setToast({ message: 'Erro ao carregar setores: ' + error.message, type: 'error' })
    setSetores(data ?? [])
    setLoadingSet(false)
  }

  async function loadFuncs() {
    if (!empresaAtiva) return
    setLoadingFunc(true)
    const { data, error } = await supabase
      .from('funcionarios').select('*').eq('empresa_id', empresaAtiva.id).order('nome')
    if (error) setToast({ message: 'Erro ao carregar funcionários: ' + error.message, type: 'error' })
    setFuncs(data ?? [])
    setLoadingFunc(false)
  }

  useEffect(() => { loadSetores(); loadFuncs() }, [empresaAtiva])

  // ── CRUD Setores ──────────────────────────────────────────────────────────────

  function abrirNovoSet() {
    setEditandoSet(null)
    setFormSet({ nome: '', func_setor: '', ativo: true })
    setModalSet(true)
  }

  function abrirEditarSet(s) {
    setEditandoSet(s)
    setFormSet({ nome: s.nome, func_setor: s.func_setor ?? '', ativo: s.ativo !== false })
    setModalSet(true)
  }

  async function handleSaveSet() {
    if (!formSet.nome.trim()) return
    setSavingSet(true)
    const payload = { nome: formSet.nome.trim(), func_setor: parseInt(formSet.func_setor) || 0, ativo: formSet.ativo }
    let error
    if (editandoSet) {
      ;({ error } = await supabase.from('setores').update(payload).eq('id', editandoSet.id))
    } else {
      ;({ error } = await supabase.from('setores').insert({ ...payload, empresa_id: empresaAtiva.id }))
    }
    setSavingSet(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editandoSet ? 'Setor atualizado!' : 'Setor criado!', type: 'success' })
    setModalSet(false)
    loadSetores()
  }

  async function handleDeleteSet(id) {
    const { error } = await supabase.from('setores').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    if (setorAtivo?.id === id) setSetorAtivo(null)
    setToast({ message: 'Setor removido.', type: 'info' })
    loadSetores()
  }

  function selecionarSetor(s) {
    setSetorAtivo(s)
    setToast({ message: `Setor ativo: ${s.nome}`, type: 'success' })
  }

  // ── CRUD Funcionários ─────────────────────────────────────────────────────────

  function abrirNovoFunc() {
    setEditandoFunc(null)
    setFormFunc(FUNC_FORM_VAZIO)
    setModalFunc(true)
  }

  function abrirEditarFunc(f) {
    setEditandoFunc(f)
    setFormFunc({
      nome:          f.nome          ?? '',
      cargo:         f.cargo         ?? '',
      email:         f.email         ?? '',
      cpf:           f.cpf           ?? '',
      setor_id:      f.setor_id      ?? '',
      data_admissao: f.data_admissao ?? '',
      ativo:         f.ativo !== false,
    })
    setModalFunc(true)
  }

  async function handleSaveFunc() {
    if (!formFunc.nome.trim()) return
    setSavingFunc(true)
    const payload = {
      nome:          formFunc.nome.trim(),
      cargo:         formFunc.cargo.trim() || null,
      email:         formFunc.email.trim() || null,
      cpf:           formFunc.cpf.trim() || null,
      setor_id:      formFunc.setor_id || null,
      data_admissao: formFunc.data_admissao || null,
      ativo:         formFunc.ativo,
    }
    let error
    if (editandoFunc) {
      ;({ error } = await supabase.from('funcionarios').update(payload).eq('id', editandoFunc.id))
    } else {
      ;({ error } = await supabase.from('funcionarios').insert({ ...payload, empresa_id: empresaAtiva.id }))
    }
    setSavingFunc(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: editandoFunc ? 'Funcionário atualizado!' : 'Funcionário cadastrado!', type: 'success' })
    setModalFunc(false)
    loadFuncs()
  }

  async function handleDeleteFunc(id) {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Funcionário removido.', type: 'info' })
    loadFuncs()
  }

  // ── Derivados ─────────────────────────────────────────────────────────────────

  const ff = k => e => setFormFunc(p => ({ ...p, [k]: e.target.value }))

  const funcsFiltradas = funcs.filter(f => {
    const porSetor = filtroSetor === 'todos' || f.setor_id === filtroSetor
    const porBusca = busca.trim() === '' ||
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (f.cargo ?? '').toLowerCase().includes(busca.toLowerCase())
    return porSetor && porBusca
  })

  const nomeSetor = id => setores.find(s => s.id === id)?.nome ?? '—'

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior para ver seus dados e setores." />
  )

  const e = empresaAtiva

  return (
    <div className="space-y-5">
      <PageHeader
        title={e.nome}
        subtitle="Dados da empresa, setores e funcionários"
        action={<button className="btn-secondary" onClick={() => navigate('/empresas')}>← Empresas</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Dados da empresa ── */}
        <div className="card">
          <div className="card-title">📝 Dados da Empresa</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="col-span-2"><InfoRow label="Razão Social" value={e.nome} /></div>
            <InfoRow label="CNPJ"               value={e.cnpj} />
            <InfoRow label="Ramo de Atividade"  value={e.setor_ramo} />
            <InfoRow label="Nº de Funcionários" value={e.func_total ? `${e.func_total} funcionários` : null} />
            <InfoRow label="Data de Início"     value={e.data_inicio ? new Date(e.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
            <InfoRow label="Responsável"        value={e.responsavel} />
            <InfoRow label="Contato"            value={e.contato} />
            <InfoRow label="Rotatividade"       value={e.turnover} />
            <InfoRow label="Atestados/mês"      value={e.atestados} />
            <InfoRow label="RH Estruturado"     value={RH_LABEL[e.rh]} />
            {e.demanda && <div className="col-span-2"><InfoRow label="Principal Demanda" value={e.demanda} /></div>}
            {e.historico && <div className="col-span-2"><InfoRow label="Histórico / Contexto" value={e.historico} /></div>}
          </div>
          <div className="mt-5 pt-4 border-t border-border-light flex flex-wrap gap-2">
            <button className="btn-secondary text-xs" onClick={() => navigate('/empresas')}>
              ✏️ Editar dados da empresa
            </button>
          </div>
        </div>

        {/* ── Setores ── */}
        <div className="card">
          <div className="card-title justify-between">
            <span>🏬 Setores</span>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={abrirNovoSet}>+ Novo Setor</button>
          </div>

          {loadingSet ? <LoadingSpinner /> : !setores.length ? (
            <EmptyState icon="🏬" title="Nenhum setor cadastrado"
              description="Crie o primeiro setor para gerar o link do questionário."
              action={<button className="btn-primary" onClick={abrirNovoSet}>+ Novo Setor</button>} />
          ) : (
            <div className="space-y-2">
              {setores.map(s => {
                const isAtivo = setorAtivo?.id === s.id
                return (
                  <div key={s.id} onClick={() => selecionarSetor(s)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all"
                    style={{ borderColor: isAtivo ? '#3a7bd5' : '#e8ecf4', background: isAtivo ? '#ddeeff' : '#ffffff' }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-navy">{s.nome}</span>
                        {isAtivo && <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#3a7bd5' }}>Ativo</span>}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {s.func_setor ? `${s.func_setor} funcionários` : 'Funcionários não informados'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={ev => ev.stopPropagation()}>
                      <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => abrirEditarSet(s)}>✏️ Editar</button>
                      <button className="btn-danger text-xs px-3 py-1.5" onClick={() => setDeletingSet(s)}>🗑 Excluir</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Funcionários ── */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="card-title mb-0">👤 Funcionários</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input className="input py-1.5 text-sm" placeholder="Buscar nome ou cargo..."
              value={busca} onChange={e => setBusca(e.target.value)} style={{ width: 200 }} />
            <select className="input py-1.5 text-sm w-auto" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
              <option value="todos">Todos os setores</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={abrirNovoFunc}>+ Novo</button>
          </div>
        </div>

        {loadingFunc ? <LoadingSpinner /> : !funcsFiltradas.length ? (
          <EmptyState icon="👤"
            title={funcs.length ? 'Nenhum resultado' : 'Nenhum funcionário cadastrado'}
            description={funcs.length ? 'Tente outro filtro ou busca.' : 'Cadastre os funcionários da empresa.'}
            action={!funcs.length ? <button className="btn-primary" onClick={abrirNovoFunc}>+ Novo Funcionário</button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  {['Nome', 'Cargo', 'Setor', 'Admissão', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funcsFiltradas.map(f => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-navy">{f.nome}</div>
                      {f.email && <div className="text-xs text-muted">{f.email}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{f.cargo || '—'}</td>
                    <td className="px-3 py-2.5 text-muted">{f.setor_id ? nomeSetor(f.setor_id) : '—'}</td>
                    <td className="px-3 py-2.5 text-muted whitespace-nowrap">
                      {f.data_admissao ? new Date(f.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={f.ativo !== false
                          ? { background: '#dcfce7', color: '#166534' }
                          : { background: '#f1f5f9', color: '#64748b' }}>
                        {f.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button className="btn-secondary text-xs px-2.5 py-1" onClick={() => abrirEditarFunc(f)}>✏️</button>
                        <button className="text-xs px-2 py-1 text-danger hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => setDeletingFunc(f)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-2 pb-1 px-3 text-xs text-muted border-t border-border">
              {funcsFiltradas.length} funcionário{funcsFiltradas.length !== 1 ? 's' : ''}
              {filtroSetor !== 'todos' && ` · ${nomeSetor(filtroSetor)}`}
              {busca && ` · busca: "${busca}"`}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Setor ── */}
      {modalSet && (
        <Modal title={editandoSet ? 'Editar Setor' : 'Novo Setor'} onClose={() => setModalSet(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome do Setor *</label>
              <input className="input" placeholder="Ex: Produção, Vendas, RH..."
                value={formSet.nome} onChange={e => setFormSet(f => ({ ...f, nome: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Nº de Funcionários no Setor</label>
              <input className="input" type="number" placeholder="0"
                value={formSet.func_setor} onChange={e => setFormSet(f => ({ ...f, func_setor: e.target.value }))} />
            </div>
            {editandoSet && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={formSet.ativo ? 'ativo' : 'inativo'}
                  onChange={e => setFormSet(f => ({ ...f, ativo: e.target.value === 'ativo' }))}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button className="btn-secondary" onClick={() => setModalSet(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveSet} disabled={savingSet || !formSet.nome.trim()}>
                {savingSet ? 'Salvando...' : editandoSet ? 'Salvar' : 'Criar Setor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Funcionário ── */}
      {modalFunc && (
        <Modal title={editandoFunc ? `Editar — ${editandoFunc.nome}` : 'Novo Funcionário'} onClose={() => setModalFunc(false)} size="md">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Campo label="Nome completo *">
                <input className="input" placeholder="Nome do funcionário"
                  value={formFunc.nome} onChange={ff('nome')} autoFocus />
              </Campo>
            </div>
            <Campo label="Cargo / Função">
              <input className="input" placeholder="Ex: Operador, Analista..."
                value={formFunc.cargo} onChange={ff('cargo')} />
            </Campo>
            <Campo label="Setor">
              <select className="input" value={formFunc.setor_id} onChange={ff('setor_id')}>
                <option value="">— Sem setor —</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </Campo>
            <Campo label="E-mail">
              <input className="input" type="email" placeholder="email@empresa.com"
                value={formFunc.email} onChange={ff('email')} />
            </Campo>
            <Campo label="CPF">
              <input className="input" placeholder="000.000.000-00"
                value={formFunc.cpf} onChange={ff('cpf')} />
            </Campo>
            <Campo label="Data de Admissão">
              <input className="input" type="date"
                value={formFunc.data_admissao} onChange={ff('data_admissao')} />
            </Campo>
            <Campo label="Status">
              <select className="input" value={formFunc.ativo ? 'ativo' : 'inativo'}
                onChange={e => setFormFunc(p => ({ ...p, ativo: e.target.value === 'ativo' }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </Campo>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-border">
              <button className="btn-secondary" onClick={() => setModalFunc(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveFunc} disabled={savingFunc || !formFunc.nome.trim()}>
                {savingFunc ? 'Salvando...' : editandoFunc ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletingSet && (
        <ConfirmModal title="Remover setor" danger
          message={`Remover "${deletingSet.nome}"? Todas as respostas e dados do setor serão apagados.`}
          confirmLabel="Remover"
          onConfirm={() => handleDeleteSet(deletingSet.id)}
          onClose={() => setDeletingSet(null)} />
      )}

      {deletingFunc && (
        <ConfirmModal title="Remover funcionário" danger
          message={`Remover "${deletingFunc.nome}" do cadastro?`}
          confirmLabel="Remover"
          onConfirm={() => handleDeleteFunc(deletingFunc.id)}
          onClose={() => setDeletingFunc(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
