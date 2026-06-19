import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Toast } from '@/components/ui'

const VAZIO = {
  nome_consultoria: '', cnpj: '', logo_url: '', slogan: '',
  email_comercial: '', telefone: '', site: '', endereco: '',
  responsavel_nome: '', responsavel_crp: '', responsavel_especializacao: '',
}

function Secao({ titulo, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-bold text-navy border-b border-border pb-2">{titulo}</h2>
      {children}
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

export default function ConfiguracoesPage() {
  const { user, refreshPerfil } = useAuth()
  const [form, setForm]         = useState(VAZIO)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('configuracoes').select('*').eq('admin_id', user.id).maybeSingle()
      if (data) setForm({ ...VAZIO, ...data })
      setLoading(false)
    }
    load()
  }, [user])

  function set(campo) {
    return e => setForm(prev => ({ ...prev, [campo]: e.target.value }))
  }

  async function salvar(patch = {}) {
    setSaving(true)
    const payload = { ...form, ...patch, admin_id: user.id }
    const { error } = await supabase
      .from('configuracoes')
      .upsert(payload, { onConflict: 'admin_id' })
    setSaving(false)
    if (error) setToast({ message: 'Erro ao salvar: ' + error.message, type: 'error' })
    else setToast({ message: 'Configurações salvas!', type: 'success' })
  }

  async function uploadImagem(bucket, campo, file, setUploading) {
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${campo}.${ext}`
    const { error: errUp } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (errUp) { setToast({ message: 'Erro no upload: ' + errUp.message, type: 'error' }); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    setForm(prev => ({ ...prev, [campo]: publicUrl }))
    await salvar({ [campo]: publicUrl })
    setUploading(false)
    if (campo === 'logo_url') refreshPerfil()
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-muted text-sm">Carregando...</div>

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações"
        subtitle="Dados da consultoria e personalização do sistema"
        action={
          <button className="btn-primary" onClick={() => salvar()} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        }
      />

      {/* Identidade */}
      <Secao titulo="🏢 Identidade da Consultoria">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Campo label="Nome da consultoria">
              <input className="input" value={form.nome_consultoria} onChange={set('nome_consultoria')}
                placeholder="Ex: Psique Consultoria" />
            </Campo>
          </div>
          <Campo label="CNPJ">
            <input className="input" value={form.cnpj} onChange={set('cnpj')}
              placeholder="00.000.000/0001-00" />
          </Campo>
          <Campo label="Slogan / Descrição curta">
            <input className="input" value={form.slogan} onChange={set('slogan')}
              placeholder="Ex: Saúde mental é estratégia" />
          </Campo>
        </div>

        {/* Logo */}
        <div className="flex items-start gap-4">
          <div>
            <label className="label">Logo</label>
            {form.logo_url
              ? <img src={form.logo_url} alt="Logo" className="h-16 rounded-xl border border-border object-contain bg-bg p-1" />
              : <div className="h-16 w-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted text-xs">Sem logo</div>
            }
          </div>
          <div className="pt-5">
            <label className="btn-secondary text-xs cursor-pointer">
              {uploadingLogo ? 'Enviando…' : 'Escolher arquivo'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => uploadImagem('logos', 'logo_url', e.target.files[0], setUploadingLogo)} />
            </label>
            {form.logo_url && (
              <button className="ml-2 text-xs text-danger hover:underline"
                onClick={() => { setForm(p => ({ ...p, logo_url: '' })); salvar({ logo_url: '' }) }}>
                Remover
              </button>
            )}
          </div>
        </div>
      </Secao>

      {/* Contato */}
      <Secao titulo="📞 Contato e Localização">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="E-mail comercial">
            <input className="input" type="email" value={form.email_comercial} onChange={set('email_comercial')}
              placeholder="contato@consultoria.com.br" />
          </Campo>
          <Campo label="Telefone / WhatsApp">
            <input className="input" value={form.telefone} onChange={set('telefone')}
              placeholder="(11) 99999-9999" />
          </Campo>
          <Campo label="Site">
            <input className="input" value={form.site} onChange={set('site')}
              placeholder="https://consultoria.com.br" />
          </Campo>
        </div>
        <Campo label="Endereço completo">
          <input className="input" value={form.endereco} onChange={set('endereco')}
            placeholder="Rua, número, complemento, cidade — Estado, CEP" />
        </Campo>
      </Secao>

      {/* Responsável técnico */}
      <Secao titulo="🎓 Responsável Técnico">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nome do(a) psicólogo(a)">
            <input className="input" value={form.responsavel_nome} onChange={set('responsavel_nome')}
              placeholder="Dra. Ana Silva" />
          </Campo>
          <Campo label="CRP">
            <input className="input" value={form.responsavel_crp} onChange={set('responsavel_crp')}
              placeholder="06/123456" />
          </Campo>
          <div className="col-span-2">
            <Campo label="Especialização / Titulação">
              <input className="input" value={form.responsavel_especializacao} onChange={set('responsavel_especializacao')}
                placeholder="Ex: Mestre em Psicologia Organizacional" />
            </Campo>
          </div>
        </div>
      </Secao>


      <div className="flex justify-end">
        <button className="btn-primary px-6" onClick={() => salvar()} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
