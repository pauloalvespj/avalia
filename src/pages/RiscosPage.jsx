import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { nivelRisco } from '@/lib/perguntas'
import { PageHeader, EmptyState, LoadingSpinner, Toast } from '@/components/ui'
import { SetorSelect } from '@/components/ui/SetorSelect'

const DOMINIOS = [
  {
    id: 'D1', nome: 'Exigências do Trabalho', cor: '#c94040',
    sfs: [
      { sf: 'sf1',  nome: 'Exigências quantitativas' },
      { sf: 'sf2',  nome: 'Ritmo de trabalho' },
      { sf: 'sf3',  nome: 'Exigências cognitivas' },
      { sf: 'sf4',  nome: 'Exigências emocionais' },
    ],
  },
  {
    id: 'D2', nome: 'Organização e Conteúdo', cor: '#d08030',
    sfs: [
      { sf: 'sf5',  nome: 'Influência no trabalho' },
      { sf: 'sf6',  nome: 'Possibilidades de desenvolvimento' },
      { sf: 'sf7',  nome: 'Previsibilidade' },
      { sf: 'sf8',  nome: 'Transparência do papel laboral' },
    ],
  },
  {
    id: 'D3', nome: 'Relações Sociais e Liderança', cor: '#2d8a5e',
    sfs: [
      { sf: 'sf9',  nome: 'Recompensas' },
      { sf: 'sf10', nome: 'Apoio social de superiores' },
      { sf: 'sf11', nome: 'Comunidade social no trabalho' },
      { sf: 'sf12', nome: 'Qualidade da liderança' },
      { sf: 'sf13', nome: 'Confiança vertical' },
      { sf: 'sf14', nome: 'Justiça e respeito' },
    ],
  },
  {
    id: 'D4', nome: 'Valores no Trabalho', cor: '#3a7bd5',
    sfs: [
      { sf: 'sf15', nome: 'Auto-eficácia' },
      { sf: 'sf16', nome: 'Significado do trabalho' },
      { sf: 'sf17', nome: 'Compromisso' },
      { sf: 'sf18', nome: 'Satisfação no trabalho' },
    ],
  },
  {
    id: 'D5', nome: 'Saúde e Bem-Estar', cor: '#7a4db0',
    sfs: [
      { sf: 'sf19', nome: 'Insegurança laboral' },
      { sf: 'sf20', nome: 'Saúde geral' },
      { sf: 'sf21', nome: 'Conflito trabalho/família' },
      { sf: 'sf22', nome: 'Problemas em dormir' },
      { sf: 'sf23', nome: 'Burnout' },
      { sf: 'sf24', nome: 'Stress' },
      { sf: 'sf25', nome: 'Sintomas depressivos' },
    ],
  },
  {
    id: 'D6', nome: 'Comportamentos Ofensivos', cor: '#8a1a1a',
    sfs: [
      { sf: 'sf26', nome: 'Insultos e provocações verbais' },
      { sf: 'sf27', nome: 'Assédio sexual' },
      { sf: 'sf28', nome: 'Ameaças e violência física' },
    ],
  },
]

const NIVEL_STYLE = {
  baixo:   { bg: '#dcfce7', color: '#166534', label: 'Baixo' },
  médio:   { bg: '#fef9c3', color: '#854d0e', label: 'Médio' },
  alto:    { bg: '#ffedd5', color: '#9a3412', label: 'Alto' },
  crítico: { bg: '#fee2e2', color: '#991b1b', label: 'Crítico' },
}

function NivelBadge({ score }) {
  if (score == null) return null
  const nivel = nivelRisco(score)
  const { bg, color, label } = NIVEL_STYLE[nivel]
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {label}
    </span>
  )
}

function ScoreButtons({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className="w-7 h-7 rounded-lg text-xs font-bold transition-all border"
          style={value === n
            ? { background: '#1a2e4a', color: '#fff', borderColor: '#1a2e4a' }
            : { background: '#f4f6fa', color: '#64748b', borderColor: '#e2e8f0' }}>
          {n}
        </button>
      ))}
    </div>
  )
}

export default function RiscosPage() {
  const { empresaAtiva } = useEmpresa()

  const [setores, setSetores]             = useState([])
  const [setorId, setSetorId]             = useState(null)
  const [scores, setScores]               = useState({})
  const [outrosSetores, setOutrosSetores] = useState({})
  const [loading, setLoading]             = useState(false)
  const [collapsed, setCollapsed]         = useState({})
  const [toast, setToast]                 = useState(null)
  const debounceRef                       = useRef({})

  // Carrega setores da empresa
  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); setSetorId(null); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).order('nome')
      .then(({ data }) => {
        const lista = data ?? []
        setSetores(lista)
        if (lista.length && !setorId) setSetorId(lista[0].id)
      })
  }, [empresaAtiva])

  const load = useCallback(async () => {
    if (!setorId) return
    setLoading(true)
    const { data } = await supabase
      .from('riscos')
      .select('fator, score, evidencias')
      .eq('setor_id', setorId)
    const mapa = {}
    for (const r of data ?? []) mapa[r.fator] = { score: r.score, evidencias: r.evidencias ?? '' }
    setScores(mapa)
    setLoading(false)
  }, [setorId])

  const loadOutros = useCallback(async () => {
    if (!empresaAtiva || !setorId) return
    const { data: setoresEmpresa } = await supabase
      .from('setores').select('id, nome')
      .eq('empresa_id', empresaAtiva.id).neq('id', setorId)
    if (!setoresEmpresa?.length) return
    const ids = setoresEmpresa.map(s => s.id)
    const { data: riscos } = await supabase
      .from('riscos').select('setor_id, fator, score')
      .in('setor_id', ids).gte('score', 3)
    const mapa = {}
    for (const r of riscos ?? []) {
      const nome = setoresEmpresa.find(s => s.id === r.setor_id)?.nome
      if (!nome) continue
      if (!mapa[r.fator]) mapa[r.fator] = []
      if (!mapa[r.fator].includes(nome)) mapa[r.fator].push(nome)
    }
    setOutrosSetores(mapa)
  }, [empresaAtiva, setorId])

  useEffect(() => { load(); loadOutros() }, [load, loadOutros])

  function handleScoreChange(sf, score) {
    const ev = scores[sf]?.evidencias ?? ''
    setScores(prev => ({ ...prev, [sf]: { score, evidencias: ev } }))
    agendarSave(sf, score, ev)
  }

  function handleEvidenciasChange(sf, evidencias) {
    const sc = scores[sf]?.score ?? null
    setScores(prev => ({ ...prev, [sf]: { score: sc, evidencias } }))
    agendarSave(sf, sc, evidencias)
  }

  function agendarSave(sf, score, evidencias) {
    if (debounceRef.current[sf]) clearTimeout(debounceRef.current[sf])
    debounceRef.current[sf] = setTimeout(() => persistir(sf, score, evidencias), 1000)
  }

  async function persistir(sf, score, evidencias) {
    if (!setorId || score == null) return
    const { error } = await supabase.from('riscos').upsert(
      { setor_id: setorId, fator: sf, score, nivel: nivelRisco(score), evidencias: evidencias ?? '' },
      { onConflict: 'setor_id,fator' }
    )
    if (error) setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
  }

  function toggleDominio(id) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Nenhuma empresa selecionada"
      description="Selecione uma empresa no menu superior." />
  )

  if (loading) return <LoadingSpinner />

  const nomeSetor = setores.find(s => s.id === setorId)?.nome ?? 'Todos os setores'

  if (!setorId) return (
    <div>
      <SetorSelect setores={setores} setorId={setorId} onChange={id => { setSetorId(id); setScores({}) }} />
      <div className="card text-center py-10 text-muted text-sm">Selecione um setor acima para ver os riscos.</div>
    </div>
  )

  return (
    <div>
      <SetorSelect setores={setores} setorId={setorId} onChange={id => { setSetorId(id); setScores({}) }} />
      <PageHeader
        title="Riscos Psicossociais"
        subtitle={`${nomeSetor} · COPSOQ II — 6 domínios, 28 subescalas`}
      />

      <div className="space-y-3">
        {DOMINIOS.map(dominio => {
          const isOpen = !collapsed[dominio.id]
          const vals   = dominio.sfs.map(s => scores[s.sf]?.score).filter(v => v != null)
          const media  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null

          return (
            <div key={dominio.id} className="card p-0 overflow-hidden">

              <button
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => toggleDominio(dominio.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dominio.cor }} />
                  <span className="font-bold text-navy text-sm">{dominio.nome}</span>
                  <span className="text-xs text-muted">{dominio.sfs.length} subescalas</span>
                </div>
                <div className="flex items-center gap-3">
                  {media != null && <NivelBadge score={media} />}
                  <span className="text-muted text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {dominio.sfs.map(({ sf, nome }) => {
                    const score      = scores[sf]?.score ?? null
                    const evidencias = scores[sf]?.evidencias ?? ''
                    const tambemEm   = outrosSetores[sf] ?? []

                    return (
                      <div key={sf} className="px-5 py-4 space-y-3">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-muted">{sf}</span>
                              <span className="text-sm font-semibold text-navy">{nome}</span>
                              {score != null && <NivelBadge score={score} />}
                            </div>
                            {tambemEm.length > 0 && (
                              <p className="mt-1 text-xs text-muted">
                                Também em:{' '}
                                {tambemEm.map((s, i) => (
                                  <span key={s} className="font-semibold text-navy">
                                    {s}{i < tambemEm.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                          <ScoreButtons value={score} onChange={v => handleScoreChange(sf, v)} />
                        </div>

                        <textarea
                          className="input text-xs py-2 resize-none"
                          rows={2}
                          placeholder="Evidências observadas (opcional)..."
                          value={evidencias}
                          onChange={e => handleEvidenciasChange(sf, e.target.value)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
