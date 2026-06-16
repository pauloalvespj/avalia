import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { PageHeader, EmptyState, LoadingSpinner } from '@/components/ui'
import { Link } from 'react-router-dom'

const EIXOS = [
  { key: 'clima',          nome: '1. Clima e Relacionamentos' },
  { key: 'lideranca',      nome: '2. Liderança e Gestão' },
  { key: 'carga',          nome: '3. Carga e Organização do Trabalho' },
  { key: 'saude',          nome: '4. Saúde e Bem-Estar' },
  { key: 'sentido',        nome: '5. Sentido e Valores' },
  { key: 'comportamentos', nome: '6. Comportamentos Ofensivos' },
]

const FORM_VAZIO = {
  num_participantes: '',
  data_entrevista:   '',
  clima_sintese: '', clima_atencao: '',
  lideranca_sintese: '', lideranca_atencao: '',
  carga_sintese: '', carga_atencao: '',
  saude_sintese: '', saude_atencao: '',
  sentido_sintese: '', sentido_atencao: '',
  comportamentos_sintese: '', comportamentos_atencao: '',
  sintese_geral: '',
  observacoes:   '',
}

function EixoCard({ eixo, form, onChange, isSaved }) {
  const [aberto, setAberto] = useState(true)
  const sintese = form[`${eixo.key}_sintese`]
  const atencao = form[`${eixo.key}_atencao`]
  const temConteudo = sintese || atencao

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
          {isSaved && <span className="text-xs text-success font-semibold">Salvo ✓</span>}
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
              onChange={e => onChange(`${eixo.key}_sintese`, e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pontos de atenção</label>
            <textarea
              className="input resize-none text-sm" rows={4}
              placeholder="O que requer cuidado ou intervenção..."
              value={atencao}
              onChange={e => onChange(`${eixo.key}_atencao`, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function EscutaPage() {
  const { empresaAtiva } = useEmpresa()
  const [setores, setSetores] = useState([])
  const [setorId, setSetorId] = useState(null)

  const [form, setForm]       = useState(FORM_VAZIO)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Carrega setores e pré-seleciona se houver apenas um
  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); setSetorId(null); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).order('nome')
      .then(({ data }) => {
        const lista = data ?? []
        setSetores(lista)
        if (lista.length === 1) setSetorId(lista[0].id)
      })
  }, [empresaAtiva?.id])

  const load = useCallback(async () => {
    if (!setorId) return
    setLoading(true)
    const { data } = await supabase
      .from('escuta').select('*').eq('setor_id', setorId).maybeSingle()
    setForm(data ? { ...FORM_VAZIO, ...Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? ''])
    )} : FORM_VAZIO)
    setLoading(false)
  }, [setorId])

  useEffect(() => { load() }, [load])

  function handleChange(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function handleSetorChange(id) {
    setSetorId(id || null)
    setForm(FORM_VAZIO)
  }

  async function salvar() {
    if (!setorId) return
    setSaving(true)
    await persistir(form)
    setSaving(false)
  }

  async function persistir(novoForm) {
    if (!setorId) return
    const payload = {
      setor_id:               setorId,
      num_participantes:      parseInt(novoForm.num_participantes) || null,
      data_entrevista:        novoForm.data_entrevista || null,
      clima_sintese:          novoForm.clima_sintese           || null,
      clima_atencao:          novoForm.clima_atencao           || null,
      lideranca_sintese:      novoForm.lideranca_sintese       || null,
      lideranca_atencao:      novoForm.lideranca_atencao       || null,
      carga_sintese:          novoForm.carga_sintese           || null,
      carga_atencao:          novoForm.carga_atencao           || null,
      saude_sintese:          novoForm.saude_sintese           || null,
      saude_atencao:          novoForm.saude_atencao           || null,
      sentido_sintese:        novoForm.sentido_sintese         || null,
      sentido_atencao:        novoForm.sentido_atencao         || null,
      comportamentos_sintese: novoForm.comportamentos_sintese  || null,
      comportamentos_atencao: novoForm.comportamentos_atencao  || null,
      sintese_geral:          novoForm.sintese_geral           || null,
      observacoes:            novoForm.observacoes             || null,
      updated_at:             new Date().toISOString(),
    }
    await supabase.from('escuta').upsert(payload, { onConflict: 'setor_id' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior."
      action={<Link to="/setores" className="btn-primary">Ir para Empresas</Link>} />
  )

  const setorNome = setores.find(s => s.id === setorId)?.nome

  return (
    <div className="space-y-4">
      <PageHeader
        title="Escuta da Equipe"
        subtitle={setorNome ? `${empresaAtiva.nome} · ${setorNome}` : empresaAtiva.nome}
        action={
          setorId ? (
            <div className="flex gap-2 items-center">
              {saved && <span className="text-xs text-success font-semibold">Salvo ✓</span>}
              <button className="btn-secondary" onClick={() => { load() }}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={salvar}>
                {saving ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          ) : null
        }
      />

      {/* Seletor de setor */}
      {setores.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-navy whitespace-nowrap">Setor:</label>
          <select className="input py-2 text-sm w-auto" value={setorId ?? ''}
            onChange={e => handleSetorChange(e.target.value)}>
            <option value="">Selecione...</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {!loading && !setorId && (
        <div className="card text-center py-10 text-muted text-sm">
          Selecione um setor acima para registrar a escuta.
        </div>
      )}

      {!loading && setorId && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Coluna esquerda 3/5 — cabeçalho + eixos ── */}
          <div className="w-full lg:w-3/5 space-y-4">

            <div className="card">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nº de participantes entrevistados</label>
                  <input type="number" min={0} className="input" placeholder="Ex: 12"
                    value={form.num_participantes}
                    onChange={e => handleChange('num_participantes', e.target.value)} />
                </div>
                <div>
                  <label className="label">Data das entrevistas</label>
                  <input type="date" className="input"
                    value={form.data_entrevista}
                    onChange={e => handleChange('data_entrevista', e.target.value)} />
                </div>
              </div>
            </div>

            {EIXOS.map(eixo => (
              <EixoCard
                key={eixo.key}
                eixo={eixo}
                form={form}
                onChange={handleChange}
                isSaved={saved}
              />
            ))}
          </div>

          {/* ── Coluna direita 2/5 — síntese geral + observações ── */}
          <div className="w-full lg:w-2/5 space-y-4 lg:sticky lg:top-4">
            <div className="card">
              <label className="label font-bold">Síntese Geral</label>
              <p className="text-xs text-muted mb-2">Visão consolidada — aparece no relatório.</p>
              <textarea className="input resize-none text-sm" rows={8}
                placeholder="Síntese consolidada das percepções coletadas nas entrevistas..."
                value={form.sintese_geral}
                onChange={e => handleChange('sintese_geral', e.target.value)} />
            </div>
            <div className="card">
              <label className="label font-bold">Observações do Psicólogo</label>
              <p className="text-xs text-muted mb-2"><strong>Não aparece no relatório.</strong> Uso interno.</p>
              <textarea className="input resize-none text-sm" rows={8}
                placeholder="Anotações pessoais, hipóteses, contexto adicional..."
                value={form.observacoes}
                onChange={e => handleChange('observacoes', e.target.value)} />
            </div>

            {/* Rodapé */}
            <div className="flex justify-end gap-2 pb-2">
              <button className="btn-secondary" onClick={() => load()}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={salvar}>
                {saving ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
