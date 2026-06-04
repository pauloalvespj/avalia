// 41 perguntas do instrumento psicossocial — 7 blocos, 28 subfatores
export const PERGUNTAS = [
  { id:'q1',  sf:'sf1',  bloco:1, blocoNome:'Exigências do trabalho',        texto:'A sua carga de trabalho acumula-se por ser mal distribuída?',                                                                       inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q2',  sf:'sf1',  bloco:1, blocoNome:'Exigências do trabalho',        texto:'Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?',                                                inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q3',  sf:'sf2',  bloco:1, blocoNome:'Exigências do trabalho',        texto:'Precisa trabalhar muito rapidamente?',                                                                                               inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q4',  sf:'sf3',  bloco:1, blocoNome:'Exigências do trabalho',        texto:'O seu trabalho exige a sua atenção constante?',                                                                                     inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q5',  sf:'sf3',  bloco:1, blocoNome:'Exigências do trabalho',        texto:'O seu trabalho exige que tome decisões difíceis?',                                                                                  inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q6',  sf:'sf4',  bloco:1, blocoNome:'Exigências do trabalho',        texto:'O seu trabalho exige emocionalmente de si?',                                                                                        inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q7',  sf:'sf5',  bloco:2, blocoNome:'Organização e conteúdo',        texto:'Tem um elevado grau de influência no seu trabalho?',                                                                                inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q8',  sf:'sf6',  bloco:2, blocoNome:'Organização e conteúdo',        texto:'O seu trabalho exige que tenha iniciativa?',                                                                                        inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q9',  sf:'sf6',  bloco:2, blocoNome:'Organização e conteúdo',        texto:'O seu trabalho permite-lhe aprender coisas novas?',                                                                                 inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q10', sf:'sf7',  bloco:2, blocoNome:'Organização e conteúdo',        texto:'No seu local de trabalho, é informado com antecedência sobre decisões importantes, mudanças ou planos para o futuro?',           inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q11', sf:'sf7',  bloco:2, blocoNome:'Organização e conteúdo',        texto:'Recebe toda a informação de que necessita para fazer bem o seu trabalho?',                                                         inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q12', sf:'sf8',  bloco:2, blocoNome:'Organização e conteúdo',        texto:'Sabe exactamente quais as suas responsabilidades?',                                                                                 inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q13', sf:'sf9',  bloco:3, blocoNome:'Relações sociais e liderança',  texto:'O seu trabalho é reconhecido e apreciado pela gerência?',                                                                          inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q14', sf:'sf9',  bloco:3, blocoNome:'Relações sociais e liderança',  texto:'É tratado de forma justa no seu local de trabalho?',                                                                               inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q15', sf:'sf10', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'Com que frequência tem ajuda e apoio do seu superior imediato?',                                                                   inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q16', sf:'sf11', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'Existe um bom ambiente de trabalho entre si e os seus colegas?',                                                                   inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q17', sf:'sf12', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'A liderança oferece boas oportunidades de desenvolvimento aos indivíduos e ao grupo?',                                            inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q18', sf:'sf12', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'A liderança é boa no planeamento do trabalho?',                                                                                    inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q19', sf:'sf13', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'A gerência confia nos seus funcionários para fazerem o seu trabalho bem?',                                                        inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q20', sf:'sf13', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'Confia na informação que lhe é transmitida pela gerência?',                                                                        inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q21', sf:'sf14', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'Os conflitos são resolvidos de uma forma justa?',                                                                                  inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q22', sf:'sf14', bloco:3, blocoNome:'Relações sociais e liderança',  texto:'O trabalho é igualmente distribuído pelos funcionários?',                                                                          inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q23', sf:'sf15', bloco:4, blocoNome:'Valores no trabalho',           texto:'Sou sempre capaz de resolver problemas, se tentar o suficiente.',                                                                  inv:true,  opts:[{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}] },
  { id:'q24', sf:'sf16', bloco:4, blocoNome:'Valores no trabalho',           texto:'O seu trabalho tem algum significado para si?',                                                                                    inv:true,  opts:[{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}] },
  { id:'q25', sf:'sf16', bloco:4, blocoNome:'Valores no trabalho',           texto:'Sente que o seu trabalho é importante?',                                                                                           inv:true,  opts:[{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}] },
  { id:'q26', sf:'sf17', bloco:4, blocoNome:'Valores no trabalho',           texto:'Sente que os problemas do seu local de trabalho são seus também?',                                                                 inv:true,  opts:[{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}] },
  { id:'q27', sf:'sf18', bloco:4, blocoNome:'Valores no trabalho',           texto:'Quão satisfeito está com o seu trabalho de uma forma global?',                                                                    inv:true,  opts:[{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}] },
  { id:'q28', sf:'sf19', bloco:5, blocoNome:'Saúde e bem-estar (1)',         texto:'Com que frequência tem dormido mal por causa do trabalho?',                                                                        inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q29', sf:'sf19', bloco:5, blocoNome:'Saúde e bem-estar (1)',         texto:'Com que frequência se tem sentido esgotado?',                                                                                      inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q30', sf:'sf20', bloco:5, blocoNome:'Saúde e bem-estar (1)',         texto:'Com que frequência se tem sentido fisicamente exausto?',                                                                           inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q31', sf:'sf21', bloco:5, blocoNome:'Saúde e bem-estar (1)',         texto:'Com que frequência tem tido problemas para se relaxar após um dia de trabalho?',                                                  inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q32', sf:'sf22', bloco:6, blocoNome:'Saúde e bem-estar (2)',         texto:'Tem sentido tensão?',                                                                                                              inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q33', sf:'sf23', bloco:6, blocoNome:'Saúde e bem-estar (2)',         texto:'Tem sentido irritabilidade?',                                                                                                      inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q34', sf:'sf23', bloco:6, blocoNome:'Saúde e bem-estar (2)',         texto:'Tem sentido ansiedade?',                                                                                                           inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q35', sf:'sf24', bloco:6, blocoNome:'Saúde e bem-estar (2)',         texto:'Tem sentido tristeza?',                                                                                                            inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q36', sf:'sf25', bloco:6, blocoNome:'Saúde e bem-estar (2)',         texto:'Com que frequência se tem sentido bem?',                                                                                           inv:true,  opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q37', sf:'sf26', bloco:6, blocoNome:'Saúde e bem-estar (2)',         texto:'A sua saúde em geral é boa?',                                                                                                      inv:true,  opts:[{v:1,t:'Nada/Quase nada'},{v:2,t:'Um pouco'},{v:3,t:'Moderadamente'},{v:4,t:'Muito'},{v:5,t:'Extremamente'}] },
  { id:'q38', sf:'sf27', bloco:7, blocoNome:'Comportamentos ofensivos',      texto:'No último ano, tem sido exposto a assédio moral (bullying)?',                                                                      inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q39', sf:'sf27', bloco:7, blocoNome:'Comportamentos ofensivos',      texto:'No último ano, tem sido exposto a assédio sexual indesejado?',                                                                     inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q40', sf:'sf28', bloco:7, blocoNome:'Comportamentos ofensivos',      texto:'No último ano, tem sido exposto a ameaças de violência?',                                                                          inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
  { id:'q41', sf:'sf28', bloco:7, blocoNome:'Comportamentos ofensivos',      texto:'No último ano, tem sido exposto a violência física?',                                                                              inv:false, opts:[{v:1,t:'Nunca/Quase nunca'},{v:2,t:'Raramente'},{v:3,t:'Às vezes'},{v:4,t:'Frequentemente'},{v:5,t:'Sempre'}] },
]

// Nível de risco a partir do score (1-5)
export function nivelRisco(score) {
  if (score <= 2) return 'baixo'
  if (score <= 3) return 'médio'
  if (score <= 4) return 'alto'
  return 'crítico'
}

// Recebe array de objetos { respostas: { q1: v, q2: v, ... } }
// Retorna array de { fator: 'sf1', score, nivel, evidencias } por subfator — pronto para upsert em riscos
export function calcularRiscos(listaRespostas) {
  if (!listaRespostas?.length) return []

  const sfAcum = {}
  for (const p of PERGUNTAS) {
    if (!sfAcum[p.sf]) sfAcum[p.sf] = []
  }

  for (const row of listaRespostas) {
    const r = row.respostas ?? {}
    for (const p of PERGUNTAS) {
      const raw = r[p.id]
      if (raw == null) continue
      sfAcum[p.sf].push(p.inv ? 6 - raw : raw)
    }
  }

  return Object.entries(sfAcum)
    .filter(([, vals]) => vals.length > 0)
    .map(([sf, vals]) => {
      const score = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
      return { fator: sf, score, nivel: nivelRisco(score), evidencias: '' }
    })
}

// Score médio global de uma única resposta (para exibição na listagem)
export function scoreResposta(respostas) {
  let sum = 0, count = 0
  for (const p of PERGUNTAS) {
    const raw = respostas?.[p.id]
    if (raw == null) continue
    sum += p.inv ? 6 - raw : raw
    count++
  }
  return count ? sum / count : null
}
