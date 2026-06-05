import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'
import { nivelRisco } from '@/lib/perguntas'
import { EmptyState, LoadingSpinner, Toast, Modal } from '@/components/ui'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DOMINIOS = [
  { id:'D1', nome:'Exigências do Trabalho',      cor:'#c94040', sfs:['sf1','sf2','sf3','sf4'] },
  { id:'D2', nome:'Organização e Conteúdo',       cor:'#d08030', sfs:['sf5','sf6','sf7','sf8'] },
  { id:'D3', nome:'Relações Sociais e Liderança', cor:'#2d8a5e', sfs:['sf9','sf10','sf11','sf12','sf13','sf14'] },
  { id:'D4', nome:'Valores no Trabalho',          cor:'#3a7bd5', sfs:['sf15','sf16','sf17','sf18'] },
  { id:'D5', nome:'Saúde e Bem-Estar',            cor:'#7a4db0', sfs:['sf19','sf20','sf21','sf22','sf23','sf24','sf25'] },
  { id:'D6', nome:'Comportamentos Ofensivos',     cor:'#8a1a1a', sfs:['sf26','sf27','sf28'] },
]

const SF_NOME = {
  sf1:'Exigências quantitativas',sf2:'Ritmo de trabalho',sf3:'Exigências cognitivas',sf4:'Exigências emocionais',
  sf5:'Influência no trabalho',sf6:'Possibilidades de desenvolvimento',sf7:'Previsibilidade',sf8:'Transparência do papel laboral',
  sf9:'Recompensas',sf10:'Apoio social de superiores',sf11:'Comunidade social no trabalho',sf12:'Qualidade da liderança',
  sf13:'Confiança vertical',sf14:'Justiça e respeito',sf15:'Auto-eficácia',sf16:'Significado do trabalho',
  sf17:'Compromisso',sf18:'Satisfação no trabalho',sf19:'Insegurança laboral',sf20:'Saúde geral',
  sf21:'Conflito trabalho/família',sf22:'Problemas em dormir',sf23:'Burnout',sf24:'Stress',sf25:'Sintomas depressivos',
  sf26:'Insultos e provocações verbais',sf27:'Assédio sexual',sf28:'Ameaças e violência física',
}

const NIVEL_STYLE = {
  baixo:   { bg:'#dcfce7', color:'#166534', label:'Baixo' },
  médio:   { bg:'#fef9c3', color:'#854d0e', label:'Médio' },
  alto:    { bg:'#ffedd5', color:'#9a3412', label:'Alto'  },
  crítico: { bg:'#fee2e2', color:'#991b1b', label:'Crítico' },
}

const RH_LABEL = { sim:'Sim', parcial:'Parcialmente', nao:'Não' }
const STATUS_LABEL = { pendente:'Pendente', em_andamento:'Em andamento', concluida:'Concluída' }
const METODOLOGIA_PADRAO = `Este diagnóstico foi elaborado com base no instrumento COPSOQ II (Copenhagen Psychosocial Questionnaire, versão II), adaptado para o contexto brasileiro, em conformidade com os requisitos da NR-01 sobre gerenciamento de riscos ocupacionais, incluindo os fatores de risco psicossociais. O instrumento avalia 6 domínios e 28 subescalas em escala Likert de 1 a 5. Os scores são classificados como: Baixo (≤2), Médio (≤3), Alto (≤4) e Crítico (5).`

function mediaDominio(sfMap, sfs) {
  const vals = sfs.map(sf => sfMap[sf]).filter(v => v != null)
  return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null
}

function NivelBadge({ score }) {
  if (score == null) return null
  const n = nivelRisco(score)
  const { bg, color, label } = NIVEL_STYLE[n]
  return <span className="print-badge text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:bg, color }}>{label}</span>
}

function Secao({ titulo, children }) {
  return (
    <section className="relatorio-secao mb-8">
      <h2 className="text-base font-black text-navy border-b-2 pb-2 mb-4" style={{ borderColor:'#1a2e4a' }}>{titulo}</h2>
      {children}
    </section>
  )
}

function Campo({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted font-medium w-40 flex-shrink-0">{label}:</span>
      <span className="text-navy">{value}</span>
    </div>
  )
}

export default function RelatorioPage() {
  const { empresaAtiva } = useEmpresa()

  const [dados, setDados]       = useState(null)
  const [config, setConfig]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [personAberto, setPersonAberto] = useState(false)
  const [tituloRel, setTituloRel]           = useState('Relatório de Avaliação de Riscos Psicossociais')
  const [subtituloRel, setSubtituloRel]     = useState('Baseado na metodologia COPSOQ II conforme NR-01')
  const [metodologiaRel, setMetodologiaRel] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const debRef = useRef({})

  const [toast, setToast] = useState(null)

  // Carrega configurações da consultoria
  useEffect(() => {
    supabase.from('configuracoes').select('*').limit(1).maybeSingle()
      .then(({ data }) => {
        setConfig(data)
        if (!empresaAtiva?.id && data?.metodologia) setMetodologiaRel(data.metodologia)
        else if (!empresaAtiva?.id) setMetodologiaRel(METODOLOGIA_PADRAO)
      })
  }, [])

  // Carrega config salva do relatório da empresa
  useEffect(() => {
    if (!empresaAtiva?.id) return
    supabase.from('relatorios').select('*').eq('empresa_id', empresaAtiva.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTituloRel(data.titulo ?? 'Relatório de Avaliação de Riscos Psicossociais')
          setSubtituloRel(data.subtitulo ?? 'Baseado na metodologia COPSOQ II conforme NR-01')
          setMetodologiaRel(data.metodologia ?? config?.metodologia ?? METODOLOGIA_PADRAO)
        } else {
          setMetodologiaRel(config?.metodologia ?? METODOLOGIA_PADRAO)
        }
      })
  }, [empresaAtiva?.id])

  function autoSalvar(campo, valor) {
    if (!empresaAtiva?.id) return
    if (debRef.current[campo]) clearTimeout(debRef.current[campo])
    debRef.current[campo] = setTimeout(async () => {
      await supabase.from('relatorios').upsert(
        { empresa_id: empresaAtiva.id, [campo]: valor },
        { onConflict: 'empresa_id' }
      )
      setSavedMsg('Salvo ✓')
      setTimeout(() => setSavedMsg(''), 2000)
    }, 1000)
  }

  function handleTitulo(v)      { setTituloRel(v);      autoSalvar('titulo', v) }
  function handleSubtitulo(v)   { setSubtituloRel(v);   autoSalvar('subtitulo', v) }
  function handleMetodologia(v) { setMetodologiaRel(v); autoSalvar('metodologia', v) }

  const [modalLink, setModalLink]   = useState(false)
  const [copiadoLink, setCopiadoLink] = useState(false)
  const linkPublico = `${window.location.origin}/relatorio-pub?emp=${empresaAtiva?.id}`

  function copiarLinkPublico() {
    navigator.clipboard.writeText(linkPublico)
    setCopiadoLink(true)
    setTimeout(() => setCopiadoLink(false), 2000)
  }

  const load = useCallback(async () => {
    if (!empresaAtiva?.id) return
    setLoading(true)

    // 1. Carrega todos os setores da empresa
    const { data: setoresData } = await supabase
      .from('setores').select('id, nome, func_setor')
      .eq('empresa_id', empresaAtiva.id).order('nome')

    const setorIds = (setoresData ?? []).map(s => s.id)

    // 2. Carrega todos os dados em paralelo
    const [
      { data: riscos },
      { data: diagData },
      { data: acoes },
      { data: okrsData },
      { data: krsData },
      { data: kpis },
      { data: escutaData },
    ] = await Promise.all([
      setorIds.length
        ? supabase.from('riscos').select('fator,score,nivel,evidencias,setor_id').in('setor_id', setorIds)
        : { data: [] },
      setorIds.length
        ? supabase.from('diagnosticos').select('*').in('setor_id', setorIds)
        : { data: [] },
      setorIds.length
        ? supabase.from('acoes').select('*').in('setor_id', setorIds).order('created_at')
        : { data: [] },
      supabase.from('okrs').select('id,objetivo').eq('empresa_id', empresaAtiva.id).order('created_at'),
      supabase.from('key_results').select('*').order('created_at'),
      setorIds.length
        ? supabase.from('kpis').select('*').in('setor_id', setorIds).order('created_at')
        : { data: [] },
      setorIds.length
        ? supabase.from('escuta').select('*').in('setor_id', setorIds)
        : { data: [] },
    ])

    // 3. Agrega riscos: média por subfator entre todos os setores
    const sfAccum = {}
    const sfEv    = {}
    for (const r of riscos ?? []) {
      if (!sfAccum[r.fator]) sfAccum[r.fator] = []
      sfAccum[r.fator].push(r.score)
      if (r.evidencias) sfEv[r.fator] = sfEv[r.fator] ? `${sfEv[r.fator]}; ${r.evidencias}` : r.evidencias
    }
    const sfMap = Object.fromEntries(
      Object.entries(sfAccum).map(([sf, scores]) => [sf, scores.reduce((a,b) => a+b,0) / scores.length])
    )

    const okrs = (okrsData ?? []).map(o => ({
      ...o,
      krs: (krsData ?? []).filter(k => k.okr_id === o.id),
    }))

    // Diagnósticos e escutas indexados por setor_id
    const diagPorSetor   = Object.fromEntries((diagData ?? []).map(d => [d.setor_id, d]))
    const escutaPorSetor = Object.fromEntries((escutaData ?? []).map(e => [e.setor_id, e]))

    setDados({
      sfMap, sfEv,
      setores:       setoresData ?? [],
      diagPorSetor,
      escutaPorSetor,
      acoes:         acoes ?? [],
      okrs,
      kpis:          kpis ?? [],
    })
    setLoading(false)
  }, [empresaAtiva?.id])

  useEffect(() => { load() }, [load])

  if (!empresaAtiva) return (
    <EmptyState icon="🏢" title="Selecione uma empresa"
      description="Use o menu superior para selecionar uma empresa ativa."
      action={<Link to="/empresas" className="btn-primary">Ir para Empresas</Link>} />
  )

  const dataAtual = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
  const e = empresaAtiva
  const corPrimaria = config?.cor_primaria ?? '#1a2e4a'

  // Tem escuta se qualquer setor tiver escuta preenchida
  const temEscuta = dados ? Object.keys(dados.escutaPorSetor ?? {}).length > 0 : false
  const SEC = {
    perfil:      1,
    metodologia: 2,
    escuta:      temEscuta ? 3 : null,
    riscos:      temEscuta ? 4 : 3,
    riscosAltos: temEscuta ? 5 : 4,
    diagnostico: temEscuta ? 6 : 5,
    plano:       temEscuta ? 7 : 6,
    okrs:        temEscuta ? 8 : 7,
  }

  const rodape = config?.rodape ||
    `${config?.nome_consultoria ?? 'Avaliary'} | Relatório de Riscos Psicossociais | ${dataAtual} | ${e.nome}`

  return (
    <>
      {/* ── Estilos de impressão injetados dinamicamente ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          .relatorio-secao { page-break-before: always; }
          .relatorio-secao:first-of-type { page-break-before: avoid; }
          .no-break { page-break-inside: avoid; }
          body { background: white !important; font-size: 11pt; margin: 2cm; }
          .print-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .relatorio-rodape {
            position: fixed; bottom: 0; left: 0; right: 0;
            font-size: 9pt; color: #6b7a99; text-align: center;
            border-top: 1px solid #e2e8f0; padding: 6px;
            background: white;
          }
        }
      `}</style>

      {/* ── Controles (ocultos na impressão) ── */}
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-navy">Relatório</h1>
          <p className="text-sm text-muted">{e.nome}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs"
            onClick={() => setPersonAberto(v => !v)}>
            ✏️ Personalizar {personAberto ? '▲' : '▼'}
          </button>
          <button className="btn-secondary text-xs" onClick={() => { setModalLink(true); setCopiadoLink(false) }}>
            🔗 Link Público
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ── Painel de personalização ── */}
      {personAberto && (
        <div className="no-print card mb-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-navy">Personalizar relatório</span>
            {savedMsg && <span className="text-xs text-success font-semibold">{savedMsg}</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Título do relatório</label>
              <input className="input" value={tituloRel}
                onChange={e => handleTitulo(e.target.value)}
                placeholder="Título principal do relatório" />
            </div>
            <div>
              <label className="label">Subtítulo / referência metodológica</label>
              <input className="input" value={subtituloRel}
                onChange={e => handleSubtitulo(e.target.value)}
                placeholder="Ex: Baseado na metodologia COPSOQ II..." />
            </div>
          </div>
          <div>
            <label className="label">Metodologia (seção no relatório)</label>
            <textarea className="input resize-none" rows={4} value={metodologiaRel}
              onChange={e => handleMetodologia(e.target.value)}
              placeholder="Descreva a metodologia utilizada..." />
          </div>
        </div>
      )}

      {modalLink && (
        <Modal title="🔗 Link Público do Relatório" onClose={() => setModalLink(false)} size="sm">
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">
              Compartilhe este link com a empresa <strong className="text-navy">{empresaAtiva?.nome}</strong> para acesso ao relatório completo sem login.
            </p>
            <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
              <span className="text-xs text-navy break-all flex-1 text-left font-mono">{linkPublico}</span>
              <button onClick={copiarLinkPublico} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
                {copiadoLink ? '✅ Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkPublico)}`}
                alt="QR Code"
                width={200} height={200}
                className="rounded-xl border border-border"
              />
            </div>
            <p className="text-xs text-muted">O link mostra os dados atuais da empresa. Não expira.</p>
            <button className="btn-secondary w-full" onClick={() => setModalLink(false)}>Fechar</button>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

{loading && <LoadingSpinner />}

      {!loading && dados && (
        <div id="relatorio-print" className="bg-white rounded-2xl border border-border p-8 max-w-4xl space-y-0">

          {/* ── CAPA ── */}
          <section className="relatorio-secao flex flex-col items-center text-center py-12 min-h-[400px] justify-center gap-4">
            {config?.logo_url
              ? <img src={config.logo_url} alt="Logo" className="h-20 object-contain mb-2" />
              : <div className="text-2xl font-black" style={{ color: corPrimaria }}>{config?.nome_consultoria ?? 'Avaliary'}</div>
            }
            {config?.logo_url && config?.nome_consultoria && <p className="text-lg font-bold text-navy">{config.nome_consultoria}</p>}
            <div className="my-4 border-t border-border w-32" />
            <h1 className="text-2xl font-black text-navy">{tituloRel}</h1>
            <p className="text-sm text-muted">{subtituloRel}</p>
            <div className="mt-4 space-y-1">
              <p className="text-base font-bold text-navy">{e.nome}</p>
              <p className="text-sm text-muted">{dataAtual}</p>
            </div>
            {(config?.responsavel_nome || config?.responsavel_crp) && (
              <div className="mt-6 text-sm">
                {config.assinatura_url && (
                  <img src={config.assinatura_url} alt="Assinatura" className="h-12 object-contain mx-auto mb-1" />
                )}
                <p className="font-semibold text-navy">{config.responsavel_nome}</p>
                {config.responsavel_crp && <p className="text-muted">CRP {config.responsavel_crp}</p>}
                {config.responsavel_especializacao && <p className="text-muted text-xs">{config.responsavel_especializacao}</p>}
              </div>
            )}
          </section>

          {/* ── PERFIL DA EMPRESA ── */}
          <Secao titulo={`${SEC.perfil}. Perfil da Empresa`}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 no-break">
              <Campo label="Razão Social"         value={e.nome} />
              <Campo label="CNPJ"                 value={e.cnpj} />
              <Campo label="Ramo de Atividade"    value={e.setor_ramo} />
              <Campo label="Nº de Funcionários"   value={e.func_total ? `${e.func_total}` : null} />
              <Campo label="Data de Início"       value={e.data_inicio ? new Date(e.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
              <Campo label="Responsável"          value={e.responsavel} />
              <Campo label="Contato"              value={e.contato} />
              <Campo label="Rotatividade"         value={e.turnover} />
              <Campo label="Atestados/mês"        value={e.atestados} />
              <Campo label="RH Estruturado"       value={RH_LABEL[e.rh]} />
              {e.demanda   && <div className="col-span-2"><Campo label="Principal Demanda" value={e.demanda} /></div>}
              {e.historico && <div className="col-span-2"><Campo label="Histórico"         value={e.historico} /></div>}
            </div>
          </Secao>

          {/* ── METODOLOGIA ── */}
          <Secao titulo={`${SEC.metodologia}. Metodologia`}>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {metodologiaRel || METODOLOGIA_PADRAO}
            </p>
          </Secao>

          {/* ── ESCUTA DA EQUIPE ── */}
          {temEscuta && (
            <Secao titulo={`${SEC.escuta}. Escuta da Equipe`}>
              {dados.setores.filter(s => dados.escutaPorSetor[s.id]).map(s => {
                const esc = dados.escutaPorSetor[s.id]
                return (
                  <div key={s.id} className="mb-6">
                    {dados.setores.length > 1 && (
                      <h3 className="text-sm font-black text-navy mb-3 border-b border-border pb-1">
                        Setor: {s.nome}
                      </h3>
                    )}
                    {(esc.num_participantes || esc.data_entrevista) && (
                      <div className="flex gap-6 mb-3 text-sm no-break">
                        {esc.num_participantes && <Campo label="Participantes" value={`${esc.num_participantes} entrevistados`} />}
                        {esc.data_entrevista && <Campo label="Data" value={new Date(esc.data_entrevista + 'T00:00:00').toLocaleDateString('pt-BR')} />}
                      </div>
                    )}
                    {[
                      { key: 'clima',          nome: 'Clima e Relacionamentos' },
                      { key: 'lideranca',      nome: 'Liderança e Gestão' },
                      { key: 'carga',          nome: 'Carga e Organização do Trabalho' },
                      { key: 'saude',          nome: 'Saúde e Bem-Estar' },
                      { key: 'sentido',        nome: 'Sentido e Valores' },
                      { key: 'comportamentos', nome: 'Comportamentos Ofensivos' },
                    ].filter(t => esc[`${t.key}_sintese`] || esc[`${t.key}_atencao`])
                     .map(t => (
                      <div key={t.key} className="mb-4 no-break">
                        <h4 className="text-sm font-bold text-navy mb-2 border-b border-border pb-1">{t.nome}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {esc[`${t.key}_sintese`] && (
                            <div>
                              <p className="text-xs font-semibold text-muted mb-1">Síntese</p>
                              <p className="text-gray-700 whitespace-pre-line">{esc[`${t.key}_sintese`]}</p>
                            </div>
                          )}
                          {esc[`${t.key}_atencao`] && (
                            <div>
                              <p className="text-xs font-semibold text-muted mb-1">Pontos de atenção</p>
                              <p className="text-gray-700 whitespace-pre-line">{esc[`${t.key}_atencao`]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {esc.sintese_geral && (
                      <div className="mt-3 no-break">
                        <h4 className="text-sm font-bold text-navy mb-1">Síntese Geral</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{esc.sintese_geral}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </Secao>
          )}

          {/* ── AVALIAÇÃO DE RISCOS ── */}
          <Secao titulo={`${SEC.riscos}. Avaliação de Riscos por Domínio`}>
            {Object.keys(dados.sfMap).length === 0 ? (
              <p className="text-sm text-muted">Nenhum risco calculado para este setor.</p>
            ) : (
              <>
                <div className="no-break mb-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={DOMINIOS.map(d => ({ nome: d.nome.split(' ').slice(0,2).join(' '), valor: mediaDominio(dados.sfMap, d.sfs), cor: d.cor }))}
                      layout="vertical" margin={{ top:4, right:50, left:8, bottom:4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf4" />
                      <XAxis type="number" domain={[0,5]} ticks={[0,1,2,3,4,5]} tick={{ fontSize:10 }} />
                      <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize:10, fill:'#1a2e4a' }} />
                      <Tooltip formatter={v => v != null ? v.toFixed(2) : '—'} />
                      <Bar dataKey="valor" radius={[0,4,4,0]} maxBarSize={18}>
                        {DOMINIOS.map((d,i) => <Cell key={i} fill={d.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <table className="w-full text-xs no-break">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      <th className="text-left px-3 py-2 font-semibold text-muted">Subescala</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Domínio</th>
                      <th className="px-3 py-2 font-semibold text-muted text-center">Score</th>
                      <th className="px-3 py-2 font-semibold text-muted text-center">Nível</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Evidências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DOMINIOS.flatMap(d => d.sfs.map(sf => {
                      const score = dados.sfMap[sf]
                      if (score == null) return null
                      return (
                        <tr key={sf} className="border-b border-border">
                          <td className="px-3 py-2 text-navy">{SF_NOME[sf] ?? sf}</td>
                          <td className="px-3 py-2"><span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ background: d.cor }}>{d.id}</span></td>
                          <td className="px-3 py-2 text-center font-bold text-navy">{score.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center"><NivelBadge score={score} /></td>
                          <td className="px-3 py-2 text-muted">{dados.sfEv[sf] || '—'}</td>
                        </tr>
                      )
                    })).filter(Boolean)}
                  </tbody>
                </table>
              </>
            )}
          </Secao>

          {/* ── RISCOS ALTOS E CRÍTICOS ── */}
          <Secao titulo={`${SEC.riscosAltos}. Riscos Altos e Críticos`}>
            {(() => {
              const altos = Object.entries(dados.sfMap).filter(([,v]) => v >= 4)
              if (!altos.length) return <p className="text-sm text-success font-semibold">✅ Nenhum risco alto ou crítico identificado.</p>
              const dom = sf => DOMINIOS.find(d => d.sfs.includes(sf))
              return (
                <table className="w-full text-xs no-break">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      <th className="text-left px-3 py-2 font-semibold text-muted">Subescala</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Domínio</th>
                      <th className="px-3 py-2 font-semibold text-muted text-center">Score</th>
                      <th className="px-3 py-2 font-semibold text-muted text-center">Nível</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Evidências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {altos.sort(([,a],[,b]) => b-a).map(([sf, score]) => {
                      const d = dom(sf)
                      return (
                        <tr key={sf} className="border-b border-border">
                          <td className="px-3 py-2 font-semibold text-navy">{SF_NOME[sf]}</td>
                          <td className="px-3 py-2">{d && <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ background:d.cor }}>{d.id}</span>}</td>
                          <td className="px-3 py-2 text-center font-black text-navy">{score.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center"><NivelBadge score={score} /></td>
                          <td className="px-3 py-2 text-muted">{dados.sfEv[sf] || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </Secao>

          {/* ── DIAGNÓSTICO ── */}
          <Secao titulo={`${SEC.diagnostico}. Diagnóstico`}>
            {Object.keys(dados.diagPorSetor).length === 0 ? (
              <p className="text-sm text-muted">Diagnóstico não preenchido.</p>
            ) : (
              dados.setores.filter(s => dados.diagPorSetor[s.id]).map(s => {
                const diag = dados.diagPorSetor[s.id]
                return (
                  <div key={s.id} className="mb-6">
                    {dados.setores.length > 1 && (
                      <h3 className="text-sm font-black text-navy mb-3 border-b border-border pb-1">
                        Setor: {s.nome}
                      </h3>
                    )}
                    <div className="space-y-4 no-break">
                      {[
                        { key:'riscos_txt',    label:'Principais riscos identificados' },
                        { key:'protetores',    label:'Fatores protetores' },
                        { key:'recomendacoes', label:'Recomendações' },
                        { key:'conclusao',     label:'Conclusão' },
                      ].map(({ key, label }) => diag[key] ? (
                        <div key={key}>
                          <h4 className="text-sm font-bold text-navy mb-1">{label}</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{diag[key]}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )
              })
            )}
          </Secao>

          {/* ── PLANO DE AÇÃO ── */}
          <Secao titulo={`${SEC.plano}. Plano de Ação`}>
            {!dados.acoes.length ? (
              <p className="text-sm text-muted">Nenhuma ação cadastrada.</p>
            ) : (
              <>
                <table className="w-full text-xs no-break mb-4">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      <th className="text-left px-3 py-2 font-semibold text-muted">Domínio</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Descrição</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Responsável</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted">Prazo</th>
                      <th className="px-3 py-2 font-semibold text-muted text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.acoes.filter(a => !a.transversal).map(a => (
                      <tr key={a.id} className="border-b border-border">
                        <td className="px-3 py-2 font-bold text-navy">{a.dominio ?? '—'}</td>
                        <td className="px-3 py-2 text-navy">{a.descricao}</td>
                        <td className="px-3 py-2 text-muted">{a.responsavel ?? '—'}</td>
                        <td className="px-3 py-2 text-muted whitespace-nowrap">{a.prazo ? new Date(a.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="px-3 py-2 text-center text-muted">{STATUS_LABEL[a.status] ?? a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dados.acoes.some(a => a.transversal) && (
                  <>
                    <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Ações Transversais</p>
                    <table className="w-full text-xs no-break">
                      <thead>
                        <tr className="border-b border-border bg-bg">
                          <th className="text-left px-3 py-2 font-semibold text-muted">Descrição</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted">Responsável</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted">Prazo</th>
                          <th className="px-3 py-2 font-semibold text-muted text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.acoes.filter(a => a.transversal).map(a => (
                          <tr key={a.id} className="border-b border-border">
                            <td className="px-3 py-2 text-navy">{a.descricao}</td>
                            <td className="px-3 py-2 text-muted">{a.responsavel ?? '—'}</td>
                            <td className="px-3 py-2 text-muted whitespace-nowrap">{a.prazo ? new Date(a.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="px-3 py-2 text-center text-muted">{STATUS_LABEL[a.status] ?? a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </Secao>

          {/* ── OKRs e KPIs ── */}
          <Secao titulo={`${SEC.okrs}. OKRs e KPIs`}>
            {dados.okrs.length > 0 && (
              <div className="space-y-4 mb-5 no-break">
                {dados.okrs.map((o, i) => {
                  const pct = o.krs.length ? Math.round(o.krs.reduce((s,k) => s+(k.progresso??0),0) / o.krs.length) : 0
                  return (
                    <div key={o.id} className="border border-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-navy">{i+1}. {o.objetivo}</p>
                        <span className="text-xs font-bold text-navy">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full" style={{ width:`${pct}%`, background: pct===100?'#22c55e':'#3a7bd5' }} />
                      </div>
                      {o.krs.map(k => (
                        <div key={k.id} className="flex items-center gap-2 text-xs text-gray-700 py-0.5">
                          <span>{k.progresso===100 ? '✅' : '◻'}</span>
                          <span>{k.texto}</span>
                          <span className="ml-auto text-muted">{k.progresso ?? 0}%</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
            {dados.kpis.length > 0 && (
              <table className="w-full text-xs no-break">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th className="text-left px-3 py-2 font-semibold text-muted">KPI</th>
                    <th className="px-3 py-2 font-semibold text-muted text-center">Baseline</th>
                    <th className="px-3 py-2 font-semibold text-muted text-center">Atual</th>
                    <th className="px-3 py-2 font-semibold text-muted text-center">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.kpis.map(k => (
                    <tr key={k.id} className="border-b border-border">
                      <td className="px-3 py-2 text-navy">{k.nome}</td>
                      <td className="px-3 py-2 text-center text-muted">{k.baseline || '—'}</td>
                      <td className="px-3 py-2 text-center font-semibold text-navy">{k.atual || '—'}</td>
                      <td className="px-3 py-2 text-center text-muted">{k.meta || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dados.okrs.length && !dados.kpis.length && (
              <p className="text-sm text-muted">OKRs e KPIs não cadastrados.</p>
            )}
          </Secao>

          {/* Rodapé impresso */}
          <div className="relatorio-rodape hidden print:block text-xs text-muted text-center border-t border-border pt-2 mt-8">
            {rodape}
          </div>

        </div>
      )}
    </>
  )
}
