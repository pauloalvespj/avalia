// 41 perguntas do instrumento psicossocial — 7 domínios, 28 subfatores
const FREQ = [{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}]
const INT  = [{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}]

export const PERGUNTAS = [
  // ── 1. Exigência Laboral (sf1–sf4) ────────────────────────────────────────
  { id:'q1',  sf:'sf1',  bloco:1, blocoNome:'Exigência Laboral',            inv:false, opts:FREQ, item:'Carga de trabalho mal distribuída',       texto:'A sua carga de trabalho acumula-se por ser mal distribuída?' },
  { id:'q2',  sf:'sf1',  bloco:1, blocoNome:'Exigência Laboral',            inv:false, opts:FREQ, item:'Sem tempo para completar tarefas',         texto:'Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?' },
  { id:'q3',  sf:'sf2',  bloco:1, blocoNome:'Exigência Laboral',            inv:false, opts:FREQ, item:'Necessidade de trabalhar rapidamente',      texto:'Precisa trabalhar muito rapidamente?' },
  { id:'q4',  sf:'sf3',  bloco:1, blocoNome:'Exigência Laboral',            inv:false, opts:FREQ, item:'Trabalho exige atenção constante',          texto:'O seu trabalho exige a sua atenção constante?' },
  { id:'q5',  sf:'sf3',  bloco:1, blocoNome:'Exigência Laboral',            inv:false, opts:FREQ, item:'Trabalho exige decisões difíceis',          texto:'O seu trabalho exige que tome decisões difíceis?' },
  { id:'q6',  sf:'sf4',  bloco:1, blocoNome:'Exigência Laboral',            inv:false, opts:FREQ, item:'Trabalho exige emocionalmente',             texto:'O seu trabalho é emocionalmente exigente?' },

  // ── 2. Organização do Trabalho (sf5–sf8) ──────────────────────────────────
  { id:'q7',  sf:'sf5',  bloco:2, blocoNome:'Organização do Trabalho',      inv:true,  opts:FREQ, item:'Grau de influência no trabalho',           texto:'Tem influência sobre a forma como realiza o seu trabalho?' },
  { id:'q8',  sf:'sf6',  bloco:2, blocoNome:'Organização do Trabalho',      inv:true,  opts:FREQ, item:'Trabalho exige iniciativa',                texto:'O seu trabalho exige que tome iniciativa?' },
  { id:'q9',  sf:'sf6',  bloco:2, blocoNome:'Organização do Trabalho',      inv:true,  opts:FREQ, item:'Trabalho permite aprender coisas novas',   texto:'O seu trabalho permite-lhe aprender coisas novas?' },
  { id:'q10', sf:'sf7',  bloco:2, blocoNome:'Organização do Trabalho',      inv:true,  opts:FREQ, item:'Informado sobre decisões importantes',     texto:'É informado sobre decisões importantes relacionadas ao seu trabalho?' },
  { id:'q11', sf:'sf7',  bloco:2, blocoNome:'Organização do Trabalho',      inv:true,  opts:FREQ, item:'Recebe info necessária para trabalhar bem', texto:'Recebe todas as informações necessárias para realizar bem o seu trabalho?' },
  { id:'q12', sf:'sf8',  bloco:2, blocoNome:'Organização do Trabalho',      inv:true,  opts:FREQ, item:'Sabe exatamente suas responsabilidades',   texto:'Sabe exatamente quais são as suas responsabilidades no trabalho?' },

  // ── 3. Relações Sociais e Liderança (sf9–sf12) ────────────────────────────
  { id:'q13', sf:'sf9',  bloco:3, blocoNome:'Relações Sociais e Liderança', inv:true,  opts:FREQ, item:'Reconhecimento pela gerência',             texto:'Recebe reconhecimento pelo seu trabalho por parte da sua chefia?' },
  { id:'q14', sf:'sf9',  bloco:3, blocoNome:'Relações Sociais e Liderança', inv:true,  opts:FREQ, item:'Tratamento justo no trabalho',             texto:'É tratado de forma justa no seu local de trabalho?' },
  { id:'q15', sf:'sf10', bloco:3, blocoNome:'Relações Sociais e Liderança', inv:true,  opts:FREQ, item:'Ajuda e apoio do superior imediato',       texto:'O seu superior imediato oferece ajuda e apoio quando necessário?' },
  { id:'q16', sf:'sf11', bloco:3, blocoNome:'Relações Sociais e Liderança', inv:true,  opts:FREQ, item:'Bom ambiente entre colegas',               texto:'Existe um bom ambiente entre si e os seus colegas de trabalho?' },
  { id:'q17', sf:'sf12', bloco:3, blocoNome:'Relações Sociais e Liderança', inv:true,  opts:FREQ, item:'Oportunidades de desenvolvimento',         texto:'O seu trabalho oferece oportunidades de desenvolvimento das suas competências?' },
  { id:'q18', sf:'sf12', bloco:3, blocoNome:'Relações Sociais e Liderança', inv:true,  opts:FREQ, item:'Qualidade no planejamento (gestão)',        texto:'O planejamento e a gestão do trabalho são feitos com qualidade?' },

  // ── 4. Personalidade / Valores (sf13–sf15) ────────────────────────────────
  { id:'q19', sf:'sf13', bloco:4, blocoNome:'Personalidade / Valores',      inv:true,  opts:FREQ, item:'Gerência confia nos funcionários',         texto:'Sente que a chefia confia nos trabalhadores?' },
  { id:'q20', sf:'sf13', bloco:4, blocoNome:'Personalidade / Valores',      inv:true,  opts:FREQ, item:'Confia nas informações da gerência',        texto:'Confia nas informações que recebe da sua chefia?' },
  { id:'q21', sf:'sf14', bloco:4, blocoNome:'Personalidade / Valores',      inv:true,  opts:FREQ, item:'Conflitos resolvidos com justiça',          texto:'Os conflitos no trabalho são resolvidos de forma justa?' },
  { id:'q22', sf:'sf14', bloco:4, blocoNome:'Personalidade / Valores',      inv:true,  opts:FREQ, item:'Trabalho distribuído igualmente',           texto:'O trabalho é distribuído de forma igualitária entre os trabalhadores?' },
  { id:'q23', sf:'sf15', bloco:4, blocoNome:'Personalidade / Valores',      inv:true,  opts:INT,  item:'Autoeficácia – resolve problemas',          texto:'Sente-se capaz de resolver os problemas que surgem no seu trabalho?' },

  // ── 5. Interface Indivíduo-Trabalho (sf16–sf19) ───────────────────────────
  { id:'q24', sf:'sf16', bloco:5, blocoNome:'Interface Indivíduo-Trabalho', inv:true,  opts:INT,  item:'Significado do trabalho',                  texto:'O seu trabalho tem significado para si?' },
  { id:'q25', sf:'sf16', bloco:5, blocoNome:'Interface Indivíduo-Trabalho', inv:true,  opts:INT,  item:'Sente que o trabalho é importante',        texto:'Sente que o seu trabalho é importante?' },
  { id:'q26', sf:'sf17', bloco:5, blocoNome:'Interface Indivíduo-Trabalho', inv:true,  opts:INT,  item:'Identifica-se com os problemas da empresa', texto:'Identifica-se com os problemas e desafios da empresa?' },
  { id:'q27', sf:'sf18', bloco:5, blocoNome:'Interface Indivíduo-Trabalho', inv:true,  opts:INT,  item:'Satisfação global com o trabalho',          texto:'De forma geral, está satisfeito com o seu trabalho?' },
  { id:'q28', sf:'sf19', bloco:5, blocoNome:'Interface Indivíduo-Trabalho', inv:false, opts:FREQ, item:'Preocupação em ficar desempregado',         texto:'Tem receio de ficar desempregado?' },

  // ── 6. Saúde e Bem-Estar (sf20–sf25) ─────────────────────────────────────
  { id:'q29', sf:'sf20', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:true,  opts:INT,  item:'Saúde geral percebida',                    texto:'De forma geral, considera que a sua saúde é boa?' },
  { id:'q30', sf:'sf21', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Trabalho afeta vida privada (energia)',     texto:'O seu trabalho afeta a sua vida pessoal por causa do cansaço físico?' },
  { id:'q31', sf:'sf21', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Trabalho afeta vida privada (tempo)',       texto:'O seu trabalho ocupa tempo que gostaria de dedicar à sua vida pessoal?' },
  { id:'q32', sf:'sf22', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Insônia / acorda durante a noite',          texto:'Tem dificuldade em dormir ou acorda durante a noite por causa do trabalho?' },
  { id:'q33', sf:'sf23', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Exaustão física',                           texto:'Sente-se fisicamente esgotado ao final do dia de trabalho?' },
  { id:'q34', sf:'sf23', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Exaustão emocional',                        texto:'Sente-se emocionalmente esgotado pelo seu trabalho?' },
  { id:'q35', sf:'sf24', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Irritabilidade',                            texto:'Sente-se irritado ou impaciente por causa do trabalho?' },
  { id:'q36', sf:'sf24', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Ansiedade',                                 texto:'Sente-se ansioso em relação ao seu trabalho?' },
  { id:'q37', sf:'sf25', bloco:6, blocoNome:'Saúde e Bem-Estar',            inv:false, opts:FREQ, item:'Tristeza',                                  texto:'Sente-se triste ou desanimado por causa do trabalho?' },

  // ── 7. Comportamentos Ofensivos (sf26–sf28) ───────────────────────────────
  { id:'q38', sf:'sf26', bloco:7, blocoNome:'Comportamentos Ofensivos',     inv:false, opts:FREQ, item:'Insultos ou provocações verbais',           texto:'É alvo de insultos, provocações ou comentários ofensivos no trabalho?' },
  { id:'q39', sf:'sf27', bloco:7, blocoNome:'Comportamentos Ofensivos',     inv:false, opts:FREQ, item:'Assédio sexual indesejado',                 texto:'É alvo de assédio sexual no seu local de trabalho?' },
  { id:'q40', sf:'sf27', bloco:7, blocoNome:'Comportamentos Ofensivos',     inv:false, opts:FREQ, item:'Ameaças de violência',                      texto:'Recebe ameaças ou sofre intimidações no trabalho?' },
  { id:'q41', sf:'sf28', bloco:7, blocoNome:'Comportamentos Ofensivos',     inv:false, opts:FREQ, item:'Violência física',                          texto:'É alvo de violência física no seu local de trabalho?' },
]

// Classifica um score médio em nível de risco
export function nivelRisco(score) {
  if (score == null) return null
  if (score < 2.0) return 'baixo'
  if (score < 3.0) return 'moderado'
  if (score < 4.0) return 'alto'
  return 'crítico'
}

// Score global de um objeto de respostas { q1: v, q2: v, ... }
// (aplicando inversão onde necessário)
export function scoreResposta(respostasObj) {
  const scores = PERGUNTAS.map(p => {
    const v = respostasObj?.[p.id]
    return v != null ? (p.inv ? 6 - v : v) : null
  }).filter(s => s != null)
  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

// Calcula riscos por subfator — retorna array para upsert na tabela riscos
// respostasArr: [{ respostas: { q1: v, ... } }, ...]
export function calcularRiscos(respostasArr) {
  const sfAcum = {}
  for (const resp of respostasArr) {
    const r = resp.respostas ?? {}
    for (const p of PERGUNTAS) {
      const v = r[p.id]
      if (v == null) continue
      const s = p.inv ? (6 - v) : v
      if (!sfAcum[p.sf]) sfAcum[p.sf] = []
      sfAcum[p.sf].push(s)
    }
  }
  return Object.entries(sfAcum).map(([sf, vals]) => {
    const score = vals.reduce((a, b) => a + b, 0) / vals.length
    return { fator: sf, score, nivel: nivelRisco(score) }
  })
}
