import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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
  moderado: { bg:'#fef9c3', color:'#854d0e', label:'Moderado' },
  alto:    { bg:'#ffedd5', color:'#9a3412', label:'Alto'  },
  crítico: { bg:'#fee2e2', color:'#991b1b', label:'Crítico' },
}

const STATUS_LABEL = { pendente:'Pendente', em_andamento:'Em andamento', concluida:'Concluída' }

function nivelRisco(s) {
  if (s < 2.0) return 'baixo'
  if (s < 3.0) return 'moderado'
  if (s < 4.0) return 'alto'
  return 'crítico'
}

function mediaDominio(sfMap, sfs) {
  const vals = sfs.map(sf => sfMap[sf]).filter(v => v != null)
  return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null
}

function NivelBadge({ score }) {
  if (score == null) return null
  const n = nivelRisco(score)
  const { bg, color, label } = NIVEL_STYLE[n]
  return (
    <span style={{
      background: bg,
      color,
      fontSize: '11px',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '9999px',
      display: 'inline-block',
    }}>{label}</span>
  )
}

function Secao({ titulo, children }) {
  return (
    <section style={{ marginBottom: '32px', pageBreakBefore: 'always' }}>
      <h2 style={{
        fontSize: '14px',
        fontWeight: 900,
        color: '#1a2e4a',
        borderBottom: '2px solid #1a2e4a',
        paddingBottom: '8px',
        marginBottom: '16px',
      }}>{titulo}</h2>
      {children}
    </section>
  )
}

export default function RelatorioPublicoPage() {
  const [params] = useSearchParams()
  const empresaId = params.get('emp')

  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  // Dados carregados ao vivo do Supabase
  const [empresa, setEmpresa]               = useState(null)
  const [setores, setSetores]               = useState([])
  const [sfMap, setSfMap]                   = useState({})
  const [sfEv, setSfEv]                     = useState({})
  const [diagPorSetor, setDiagPorSetor]     = useState({})
  const [escutaPorSetor, setEscutaPorSetor] = useState({})
  const [acoes, setAcoes]                   = useState([])
  const [okrs, setOkrs]                     = useState([])
  const [kpis, setKpis]                     = useState([])
  const [config, setConfig]                 = useState({})
  const [relatorioConfig, setRelatorioConfig] = useState({})

  useEffect(() => {
    if (!empresaId) { setNotFound(true); setLoading(false); return }

    async function carregar() {
      // 1ª rodada: empresa, setores, config e customização do relatório em paralelo
      const [
        { data: empData,     error: empErr },
        { data: setoresData },
        { data: configData },
        { data: relConfig },
      ] = await Promise.all([
        supabase.from('empresas')
          .select('id,nome,cnpj,setor_ramo,func_total,responsavel,contato,turnover,atestados,rh,demanda,historico')
          .eq('id', empresaId).single(),
        supabase.from('setores').select('id,nome,func_setor').eq('empresa_id', empresaId).order('nome'),
        supabase.from('configuracoes').select('*').limit(1).maybeSingle(),
        supabase.from('relatorios').select('titulo,subtitulo,metodologia').eq('empresa_id', empresaId).maybeSingle(),
      ])

      if (empErr || !empData) { setNotFound(true); setLoading(false); return }

      const setorIds = (setoresData ?? []).map(s => s.id)

      // 2ª rodada: tudo que depende dos setores, em paralelo
      const [
        { data: riscos },
        { data: diagData },
        { data: acoesData },
        { data: okrsData },
        { data: krsData },
        { data: kpisData },
        { data: escutaData },
      ] = await Promise.all([
        setorIds.length
          ? supabase.from('riscos').select('fator,score,nivel,evidencias,setor_id').in('setor_id', setorIds)
          : Promise.resolve({ data: [] }),
        setorIds.length
          ? supabase.from('diagnosticos').select('*').in('setor_id', setorIds)
          : Promise.resolve({ data: [] }),
        setorIds.length
          ? supabase.from('acoes').select('*').in('setor_id', setorIds).order('created_at')
          : Promise.resolve({ data: [] }),
        supabase.from('okrs').select('id,objetivo').eq('empresa_id', empresaId).order('created_at'),
        supabase.from('key_results').select('*').order('created_at'),
        setorIds.length
          ? supabase.from('kpis').select('*').in('setor_id', setorIds).order('created_at')
          : Promise.resolve({ data: [] }),
        setorIds.length
          ? supabase.from('escuta').select('*').in('setor_id', setorIds)
          : Promise.resolve({ data: [] }),
      ])

      // Agrega riscos: acumula scores por subfator entre todos os setores
      const sfAccum = {}
      const evMap   = {}
      for (const r of riscos ?? []) {
        if (!sfAccum[r.fator]) sfAccum[r.fator] = []
        sfAccum[r.fator].push(r.score)
        if (r.evidencias) evMap[r.fator] = evMap[r.fator] ? `${evMap[r.fator]}; ${r.evidencias}` : r.evidencias
      }
      const sfMapCalc = Object.fromEntries(
        Object.entries(sfAccum).map(([sf, scores]) => [sf, scores.reduce((a,b) => a+b,0) / scores.length])
      )

      // Aninha key results nos OKRs
      const okrsComKrs = (okrsData ?? []).map(o => ({
        ...o,
        krs: (krsData ?? []).filter(k => k.okr_id === o.id),
      }))

      setEmpresa(empData)
      setSetores(setoresData ?? [])
      setSfMap(sfMapCalc)
      setSfEv(evMap)
      setDiagPorSetor(Object.fromEntries((diagData   ?? []).map(d => [d.setor_id, d])))
      setEscutaPorSetor(Object.fromEntries((escutaData ?? []).map(e => [e.setor_id, e])))
      setAcoes(acoesData ?? [])
      setOkrs(okrsComKrs)
      setKpis(kpisData ?? [])
      setConfig(configData ?? {})
      setRelatorioConfig(relConfig ?? {})
      setLoading(false)
    }

    carregar()
  }, [empresaId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#1a2e4a', fontSize: '14px' }}>Carregando relatório...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1a2e4a', marginBottom: '8px' }}>
            Empresa não encontrada
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '14px' }}>
            O parâmetro <code>emp</code> está ausente ou o ID não corresponde a nenhuma empresa. Verifique o link com o consultor responsável.
          </p>
        </div>
      </div>
    )
  }

  const titulo      = relatorioConfig.titulo    ?? 'Relatório de Avaliação de Riscos Psicossociais'
  const subtitulo   = relatorioConfig.subtitulo ?? 'Baseado na metodologia COPSOQ II conforme NR-01'
  const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const corPrimaria = config?.cor_primaria ?? '#1a2e4a'

  const temEscuta = Object.keys(escutaPorSetor).length > 0
  const SEC = {
    perfil:      1,
    escuta:      temEscuta ? 2 : null,
    riscos:      temEscuta ? 3 : 2,
    riscosAltos: temEscuta ? 4 : 3,
    diagnostico: temEscuta ? 5 : 4,
    plano:       temEscuta ? 6 : 5,
    okrs:        temEscuta ? 7 : 6,
  }

  const rodape = config?.rodape ||
    `${config?.nome_consultoria ?? 'Avaliary'} | Relatório de Riscos Psicossociais | ${dataGeracao} | ${empresa.nome}`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .relatorio-rodape-pub { display: block !important; }
        }
        .relatorio-rodape-pub { display: none; }
        body { background: #f1f5f9; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      {/* Barra superior com botão de impressão (oculta na impressão) */}
      <div className="no-print" style={{
        background: '#1a2e4a',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>{titulo}</span>
          <span style={{ fontSize: '12px', opacity: 0.7, marginLeft: '12px' }}>{empresa.nome}</span>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: '#3a7bd5',
            color: 'white',
            border: 'none',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      <div style={{ maxWidth: '860px', margin: '32px auto', padding: '0 16px 64px' }}>
        <div id="relatorio-pub-print" style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '48px',
        }}>

          {/* CAPA */}
          <section style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            paddingTop: '48px',
            paddingBottom: '48px',
            minHeight: '360px',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {config?.logo_url
              ? <img src={config.logo_url} alt="Logo" style={{ height: '80px', objectFit: 'contain', marginBottom: '8px' }} />
              : <div style={{ fontSize: '24px', fontWeight: 900, color: corPrimaria }}>{config?.nome_consultoria ?? 'Avaliary'}</div>
            }
            {config?.logo_url && config?.nome_consultoria && (
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a2e4a' }}>{config.nome_consultoria}</p>
            )}
            <div style={{ borderTop: '1px solid #e2e8f0', width: '80px', margin: '8px 0' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1a2e4a', margin: 0 }}>{titulo}</h1>
            {subtitulo && <p style={{ fontSize: '13px', color: '#6b7a99', margin: 0 }}>{subtitulo}</p>}
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a2e4a', margin: '0 0 4px' }}>{empresa.nome}</p>
              <p style={{ fontSize: '13px', color: '#6b7a99', margin: 0 }}>Gerado em {dataGeracao}</p>
            </div>
            {(config?.responsavel_nome || config?.responsavel_crp) && (
              <div style={{ marginTop: '24px', fontSize: '13px' }}>
                {config.assinatura_url && (
                  <img src={config.assinatura_url} alt="Assinatura" style={{ height: '48px', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
                )}
                <p style={{ fontWeight: 600, color: '#1a2e4a', margin: '0 0 2px' }}>{config.responsavel_nome}</p>
                {config.responsavel_crp && <p style={{ color: '#6b7a99', margin: '0 0 2px' }}>CRP {config.responsavel_crp}</p>}
                {config.responsavel_especializacao && <p style={{ color: '#6b7a99', fontSize: '11px', margin: 0 }}>{config.responsavel_especializacao}</p>}
              </div>
            )}
          </section>

          {/* PERFIL DA EMPRESA */}
          <Secao titulo={`${SEC.perfil}. Perfil da Empresa`}>
            <div style={{ fontSize: '14px', color: '#1a2e4a' }}>
              <span style={{ fontWeight: 600 }}>Empresa: </span>{empresa.nome}
            </div>
            {setores.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7a99', marginBottom: '6px' }}>Setores avaliados:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1a2e4a' }}>
                  {setores.map(s => (
                    <li key={s.id}>{s.nome}{s.func_setor ? ` — ${s.func_setor} funcionários` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
          </Secao>

          {/* ESCUTA DA EQUIPE */}
          {temEscuta && (
            <Secao titulo={`${SEC.escuta}. Escuta da Equipe`}>
              {setores.filter(s => escutaPorSetor[s.id]).map(s => {
                const esc = escutaPorSetor[s.id]
                return (
                  <div key={s.id} style={{ marginBottom: '24px' }}>
                    {setores.length > 1 && (
                      <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#1a2e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
                        Setor: {s.nome}
                      </h3>
                    )}
                    {(esc.num_participantes || esc.data_entrevista) && (
                      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '13px' }}>
                        {esc.num_participantes && <span><strong>Participantes:</strong> {esc.num_participantes} entrevistados</span>}
                        {esc.data_entrevista && <span><strong>Data:</strong> {new Date(esc.data_entrevista + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
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
                      <div key={t.key} style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a2e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>{t.nome}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                          {esc[`${t.key}_sintese`] && (
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7a99', marginBottom: '4px' }}>Síntese</p>
                              <p style={{ color: '#374151', whiteSpace: 'pre-line', margin: 0 }}>{esc[`${t.key}_sintese`]}</p>
                            </div>
                          )}
                          {esc[`${t.key}_atencao`] && (
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7a99', marginBottom: '4px' }}>Pontos de atenção</p>
                              <p style={{ color: '#374151', whiteSpace: 'pre-line', margin: 0 }}>{esc[`${t.key}_atencao`]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {esc.sintese_geral && (
                      <div style={{ marginTop: '12px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a2e4a', marginBottom: '4px' }}>Síntese Geral</h4>
                        <p style={{ fontSize: '13px', color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.6, margin: 0 }}>{esc.sintese_geral}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </Secao>
          )}

          {/* AVALIAÇÃO DE RISCOS */}
          <Secao titulo={`${SEC.riscos}. Avaliação de Riscos por Domínio`}>
            {Object.keys(sfMap).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7a99' }}>Nenhum risco calculado.</p>
            ) : (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={DOMINIOS.map(d => ({ nome: d.nome.split(' ').slice(0,2).join(' '), valor: mediaDominio(sfMap, d.sfs), cor: d.cor }))}
                      layout="vertical"
                      margin={{ top: 4, right: 50, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf4" />
                      <XAxis type="number" domain={[0,5]} ticks={[0,1,2,3,4,5]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 10, fill: '#1a2e4a' }} />
                      <Tooltip formatter={v => v != null ? v.toFixed(2) : '—'} />
                      <Bar dataKey="valor" radius={[0,4,4,0]} maxBarSize={18}>
                        {DOMINIOS.map((d,i) => <Cell key={i} fill={d.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Subescala</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Domínio</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Nível</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Evidências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DOMINIOS.flatMap(d => d.sfs.map(sf => {
                      const score = sfMap[sf]
                      if (score == null) return null
                      return (
                        <tr key={sf} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', color: '#1a2e4a' }}>{SF_NOME[sf] ?? sf}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', background: d.cor, padding: '2px 6px', borderRadius: '4px' }}>{d.id}</span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#1a2e4a' }}>{score.toFixed(1)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}><NivelBadge score={score} /></td>
                          <td style={{ padding: '8px 12px', color: '#6b7a99' }}>{sfEv[sf] || '—'}</td>
                        </tr>
                      )
                    })).filter(Boolean)}
                  </tbody>
                </table>
              </>
            )}
          </Secao>

          {/* RISCOS ALTOS E CRÍTICOS */}
          <Secao titulo={`${SEC.riscosAltos}. Riscos Altos e Críticos`}>
            {(() => {
              const altos = Object.entries(sfMap).filter(([,v]) => v >= 4)
              if (!altos.length) return (
                <p style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Nenhum risco alto ou crítico identificado.</p>
              )
              const dom = sf => DOMINIOS.find(d => d.sfs.includes(sf))
              return (
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Subescala</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Domínio</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Nível</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Evidências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {altos.sort(([,a],[,b]) => b-a).map(([sf, score]) => {
                      const d = dom(sf)
                      return (
                        <tr key={sf} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a2e4a' }}>{SF_NOME[sf]}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {d && <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', background: d.cor, padding: '2px 6px', borderRadius: '4px' }}>{d.id}</span>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 900, color: '#1a2e4a' }}>{score.toFixed(1)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}><NivelBadge score={score} /></td>
                          <td style={{ padding: '8px 12px', color: '#6b7a99' }}>{sfEv[sf] || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </Secao>

          {/* DIAGNÓSTICO */}
          <Secao titulo={`${SEC.diagnostico}. Diagnóstico`}>
            {Object.keys(diagPorSetor).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7a99' }}>Diagnóstico não preenchido.</p>
            ) : (
              setores.filter(s => diagPorSetor[s.id]).map(s => {
                const diag = diagPorSetor[s.id]
                return (
                  <div key={s.id} style={{ marginBottom: '24px' }}>
                    {setores.length > 1 && (
                      <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#1a2e4a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
                        Setor: {s.nome}
                      </h3>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        { key:'riscos_txt',    label:'Principais riscos identificados' },
                        { key:'protetores',    label:'Fatores protetores' },
                        { key:'recomendacoes', label:'Recomendações' },
                        { key:'conclusao',     label:'Conclusão' },
                      ].map(({ key, label }) => diag[key] ? (
                        <div key={key}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a2e4a', marginBottom: '4px' }}>{label}</h4>
                          <p style={{ fontSize: '13px', color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.6, margin: 0 }}>{diag[key]}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )
              })
            )}
          </Secao>

          {/* PLANO DE AÇÃO */}
          <Secao titulo={`${SEC.plano}. Plano de Ação`}>
            {!acoes.length ? (
              <p style={{ fontSize: '13px', color: '#6b7a99' }}>Nenhuma ação cadastrada.</p>
            ) : (
              <>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Domínio</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Descrição</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Responsável</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Prazo</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acoes.filter(a => !a.transversal).map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1a2e4a' }}>{a.dominio ?? '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#1a2e4a' }}>{a.descricao}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7a99' }}>{a.responsavel ?? '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7a99', whiteSpace: 'nowrap' }}>{a.prazo ? new Date(a.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7a99' }}>{STATUS_LABEL[a.status] ?? a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {acoes.some(a => a.transversal) && (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ações Transversais</p>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Descrição</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Responsável</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>Prazo</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acoes.filter(a => a.transversal).map(a => (
                          <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 12px', color: '#1a2e4a' }}>{a.descricao}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7a99' }}>{a.responsavel ?? '—'}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7a99', whiteSpace: 'nowrap' }}>{a.prazo ? new Date(a.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7a99' }}>{STATUS_LABEL[a.status] ?? a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </Secao>

          {/* OKRs E KPIs */}
          <Secao titulo={`${SEC.okrs}. OKRs e KPIs`}>
            {okrs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                {okrs.map((o, i) => {
                  const krs = o.krs ?? []
                  const pct = krs.length ? Math.round(krs.reduce((s,k) => s+(k.progresso??0),0) / krs.length) : 0
                  return (
                    <div key={o.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a2e4a', margin: 0 }}>{i+1}. {o.objetivo}</p>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a2e4a' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ height: '100%', borderRadius: '9999px', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#3a7bd5' }} />
                      </div>
                      {krs.map((k, ki) => (
                        <div key={ki} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151', padding: '2px 0' }}>
                          <span>{k.progresso === 100 ? '✅' : '◻'}</span>
                          <span>{k.texto}</span>
                          <span style={{ marginLeft: 'auto', color: '#6b7a99' }}>{k.progresso ?? 0}%</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
            {kpis.length > 0 && (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7a99' }}>KPI</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Baseline</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Atual</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#6b7a99', textAlign: 'center' }}>Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((k, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px', color: '#1a2e4a' }}>{k.nome}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7a99' }}>{k.baseline || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#1a2e4a' }}>{k.atual || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7a99' }}>{k.meta || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!okrs.length && !kpis.length && (
              <p style={{ fontSize: '13px', color: '#6b7a99' }}>OKRs e KPIs não cadastrados.</p>
            )}
          </Secao>

          <div className="relatorio-rodape-pub" style={{
            fontSize: '10px',
            color: '#6b7a99',
            textAlign: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '8px',
            marginTop: '32px',
          }}>
            {rodape}
          </div>

        </div>
      </div>
    </>
  )
}
