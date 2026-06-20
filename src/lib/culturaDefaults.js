export const TOPICOS_FIXOS_DEFAULT = [
  {
    id: 'comunicacao',
    nome: 'Comunicação interna',
    perguntas: [
      { id: 'c1', texto: 'As informações importantes chegam a mim de forma clara e no tempo certo.' },
      { id: 'c2', texto: 'Me sinto informado(a) sobre as decisões que afetam meu trabalho.' },
      { id: 'c3', texto: 'Os canais de comunicação da empresa funcionam bem.' },
    ],
  },
  {
    id: 'lideranca',
    nome: 'Liderança e gestão',
    perguntas: [
      { id: 'l1', texto: 'Meu líder imediato me apoia e está disponível quando preciso.' },
      { id: 'l2', texto: 'A liderança da empresa inspira confiança.' },
      { id: 'l3', texto: 'Recebo feedbacks claros e construtivos sobre meu desempenho.' },
    ],
  },
  {
    id: 'relacionamento',
    nome: 'Relacionamento entre colegas',
    perguntas: [
      { id: 'r1', texto: 'O relacionamento com meus colegas de trabalho é positivo.' },
      { id: 'r2', texto: 'Existe um ambiente de cooperação e trabalho em equipe.' },
      { id: 'r3', texto: 'Me sinto respeitado(a) pelos colegas.' },
    ],
  },
  {
    id: 'reconhecimento',
    nome: 'Reconhecimento e valorização',
    perguntas: [
      { id: 'rv1', texto: 'Me sinto reconhecido(a) pelo meu trabalho.' },
      { id: 'rv2', texto: 'A empresa valoriza as contribuições dos funcionários.' },
      { id: 'rv3', texto: 'O sistema de recompensas e benefícios é justo.' },
    ],
  },
  {
    id: 'condicoes',
    nome: 'Condições de trabalho',
    perguntas: [
      { id: 'ct1', texto: 'Tenho os recursos necessários para realizar meu trabalho bem.' },
      { id: 'ct2', texto: 'O ambiente físico de trabalho é adequado e confortável.' },
      { id: 'ct3', texto: 'A carga de trabalho que recebo é gerenciável.' },
    ],
  },
  {
    id: 'crescimento',
    nome: 'Crescimento e desenvolvimento',
    perguntas: [
      { id: 'cd1', texto: 'Tenho oportunidades de aprendizado e desenvolvimento profissional.' },
      { id: 'cd2', texto: 'A empresa investe no crescimento de seus colaboradores.' },
      { id: 'cd3', texto: 'Vejo possibilidade de crescimento na minha carreira aqui.' },
    ],
  },
  {
    id: 'cultura_org',
    nome: 'Alinhamento com a cultura da empresa',
    perguntas: [
      { id: 'cu1', texto: 'Me identifico com os valores e missão da empresa.' },
      { id: 'cu2', texto: 'A empresa age de acordo com os valores que prega.' },
      { id: 'cu3', texto: 'Me sinto parte da cultura desta empresa.' },
    ],
  },
  {
    id: 'equilibrio',
    nome: 'Equilíbrio entre vida pessoal e trabalho',
    perguntas: [
      { id: 'eq1', texto: 'Consigo equilibrar bem minha vida profissional e pessoal.' },
      { id: 'eq2', texto: 'A empresa respeita meu tempo fora do trabalho.' },
      { id: 'eq3', texto: 'Me sinto satisfeito(a) com a flexibilidade que tenho.' },
    ],
  },
]

export const CATEGORIAS_NPS_DEFAULT = [
  {
    id: 'satisfacao',
    nome: 'Satisfação Geral',
    perguntas: [
      { id: 's1', texto: 'Estou satisfeito com meu trabalho nesta empresa.' },
      { id: 's2', texto: 'Me sinto valorizado pela empresa.' },
      { id: 's3', texto: 'Recomendaria esta empresa para um amigo ou familiar.' },
    ],
  },
  {
    id: 'lideranca',
    nome: 'Liderança',
    perguntas: [
      { id: 'l1', texto: 'Meu líder imediato me apoia no dia a dia.' },
      { id: 'l2', texto: 'A liderança da empresa é transparente e confiável.' },
      { id: 'l3', texto: 'Recebo feedbacks construtivos regularmente.' },
    ],
  },
  {
    id: 'crescimento',
    nome: 'Crescimento',
    perguntas: [
      { id: 'cr1', texto: 'Tenho oportunidades de crescimento nesta empresa.' },
      { id: 'cr2', texto: 'A empresa investe no meu desenvolvimento profissional.' },
      { id: 'cr3', texto: 'Vejo um futuro de longo prazo aqui.' },
    ],
  },
  {
    id: 'ambiente',
    nome: 'Ambiente',
    perguntas: [
      { id: 'a1', texto: 'O ambiente de trabalho é saudável e respeitoso.' },
      { id: 'a2', texto: 'Me sinto psicologicamente seguro para me expressar.' },
      { id: 'a3', texto: 'A empresa se preocupa com o bem-estar dos colaboradores.' },
    ],
  },
]

export function configClimaInicial() {
  return {
    topicos_fixos: TOPICOS_FIXOS_DEFAULT.map(t => ({
      ...t, perguntas: t.perguntas.map(p => ({ ...p })),
    })),
    topicos_custom: [],
  }
}

export function configNpsInicial() {
  return {
    categorias: CATEGORIAS_NPS_DEFAULT.map(c => ({
      ...c, perguntas: c.perguntas.map(p => ({ ...p })),
    })),
  }
}
