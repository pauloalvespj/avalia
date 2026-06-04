import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const CATEGORIAS = [
  'Assédio moral',
  'Assédio sexual',
  'Discriminação',
  'Violência no trabalho',
  'Desvio de conduta',
  'Conflito de interesses',
  'Irregularidade administrativa',
  'Outro',
]

function randomChars(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < n; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

function Toggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: '6px 20px',
          borderRadius: 8,
          border: value === true ? '2px solid #3a7bd5' : '1.5px solid #d1d5db',
          background: value === true ? '#3a7bd5' : '#fff',
          color: value === true ? '#fff' : '#6b7280',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          transition: 'all .15s',
        }}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: '6px 20px',
          borderRadius: 8,
          border: value === false ? '2px solid #3a7bd5' : '1.5px solid #d1d5db',
          background: value === false ? '#3a7bd5' : '#fff',
          color: value === false ? '#fff' : '#6b7280',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          transition: 'all .15s',
        }}
      >
        Não
      </button>
    </div>
  )
}

export default function DenunciaPage() {
  const [params] = useSearchParams()
  const empresaId = params.get('empresa')

  const [empresa, setEmpresa] = useState(null)
  const [loadingEmpresa, setLoadingEmpresa] = useState(true)
  const [empresaError, setEmpresaError] = useState(false)

  const [form, setForm] = useState({
    categoria: '',
    descricao: '',
    quando_ocorreu: '',
    frequencia: '',
    envolve_lideranca: false,
    tem_testemunha: false,
    contexto: '',
    quer_contato: false,
    como_contato: '',
  })

  const [saving, setSaving] = useState(false)
  const [protocolo, setProtocolo] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!empresaId) { setEmpresaError(true); setLoadingEmpresa(false); return }
    supabase.from('empresas').select('nome').eq('id', empresaId).single()
      .then(({ data, error }) => {
        if (error || !data) setEmpresaError(true)
        else setEmpresa(data)
        setLoadingEmpresa(false)
      })
  }, [empresaId])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (!form.categoria) { setErro('Selecione uma categoria.'); return }
    if (form.descricao.trim().length < 20) { setErro('A descrição precisa ter pelo menos 20 caracteres.'); return }

    setSaving(true)
    const prot = `AV-${new Date().getFullYear()}-${randomChars(4)}`

    const payload = {
      empresa_id:        empresaId,
      protocolo:         prot,
      categoria:         form.categoria,
      descricao:         form.descricao.trim(),
      quando_ocorreu:    form.quando_ocorreu || null,
      frequencia:        form.frequencia || null,
      envolve_lideranca: form.envolve_lideranca,
      tem_testemunha:    form.tem_testemunha,
      contexto:          form.contexto.trim() || null,
      quer_contato:      form.quer_contato,
      como_contato:      form.quer_contato ? form.como_contato.trim() || null : null,
    }

    const { error } = await supabase.from('denuncias').insert(payload)
    setSaving(false)

    if (error) {
      setErro('Erro ao registrar. Tente novamente em instantes.')
      return
    }

    setProtocolo(prot)
  }

  const fieldStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px solid #d1d5db',
    fontSize: 14,
    color: '#1a2e4a',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  }

  if (loadingEmpresa) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ width: 36, height: 36, border: '4px solid #3a7bd5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (empresaError || !empresaId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a2e4a', marginBottom: 8 }}>Link inválido</h2>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Este link não corresponde a nenhuma empresa cadastrada. Solicite um novo link ao responsável.</p>
        </div>
      </div>
    )
  }

  if (protocolo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>
          <div style={{ width: 72, height: 72, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e4a', marginBottom: 8 }}>Denúncia registrada</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Sua denúncia foi recebida com segurança. Guarde seu número de protocolo para acompanhamento.</p>
          <div style={{ background: '#f0f4f8', borderRadius: 12, padding: '16px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Protocolo</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#3a7bd5', letterSpacing: 3, fontFamily: 'monospace' }}>{protocolo}</div>
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Sua identidade permanece 100% protegida. A empresa será notificada e o caso será analisado.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        select:focus, textarea:focus, input:focus { border-color: #3a7bd5 !important; box-shadow: 0 0 0 3px rgba(58,123,213,0.15) }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '24px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              🔒 100% Anônimo
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e4a', margin: '0 0 4px' }}>Canal de Denúncias</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{empresa.nome}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', borderLeft: '4px solid #3a7bd5' }}>
                <p style={{ fontSize: 13, color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                  Sua identidade nunca será revelada. Não armazenamos dados que possam identificá-lo(a).
                </p>
              </div>

              <div>
                <label style={labelStyle}>Categoria da denúncia *</label>
                <select style={fieldStyle} value={form.categoria} onChange={e => set('categoria', e.target.value)} required>
                  <option value="">Selecione...</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Descreva o ocorrido *</label>
                <textarea
                  style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }}
                  placeholder="Descreva os fatos com o máximo de detalhes possível (mínimo 20 caracteres)..."
                  value={form.descricao}
                  onChange={e => set('descricao', e.target.value)}
                  required
                />
                <span style={{ fontSize: 12, color: form.descricao.length < 20 ? '#ef4444' : '#9ca3af' }}>
                  {form.descricao.length} caracteres {form.descricao.length < 20 ? `(mínimo 20)` : ''}
                </span>
              </div>

              <div>
                <label style={labelStyle}>Quando ocorreu?</label>
                <select style={fieldStyle} value={form.quando_ocorreu} onChange={e => set('quando_ocorreu', e.target.value)}>
                  <option value="">Prefiro não informar</option>
                  <option value="Hoje">Hoje</option>
                  <option value="Esta semana">Esta semana</option>
                  <option value="Este mês">Este mês</option>
                  <option value="Há mais tempo">Há mais tempo</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Com que frequência acontece?</label>
                <select style={fieldStyle} value={form.frequencia} onChange={e => set('frequencia', e.target.value)}>
                  <option value="">Prefiro não informar</option>
                  <option value="Foi uma vez">Foi uma vez</option>
                  <option value="Acontece às vezes">Acontece às vezes</option>
                  <option value="Acontece frequentemente">Acontece frequentemente</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Envolve liderança ou gestão?</label>
                <Toggle value={form.envolve_lideranca} onChange={v => set('envolve_lideranca', v)} />
              </div>

              <div>
                <label style={labelStyle}>Há testemunhas?</label>
                <Toggle value={form.tem_testemunha} onChange={v => set('tem_testemunha', v)} />
              </div>

              <div>
                <label style={labelStyle}>Contexto adicional (opcional)</label>
                <textarea
                  style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
                  placeholder="Informações adicionais que possam ajudar na apuração..."
                  value={form.contexto}
                  onChange={e => set('contexto', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Deseja ser contatado(a) sobre esta denúncia?</label>
                <Toggle value={form.quer_contato} onChange={v => set('quer_contato', v)} />
                {form.quer_contato && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      style={fieldStyle}
                      placeholder="E-mail ou forma de contato de sua preferência"
                      value={form.como_contato}
                      onChange={e => set('como_contato', e.target.value)}
                    />
                    <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
                      ⚠️ Informar um contato pode reduzir o anonimato.
                    </p>
                  </div>
                )}
              </div>

              {erro && (
                <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: saving ? '#93c5fd' : '#3a7bd5',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background .15s',
                }}
              >
                {saving ? 'Enviando...' : '🔒 Enviar denúncia com segurança'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: 0 }}>
                Ao enviar, você receberá um protocolo de acompanhamento.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
