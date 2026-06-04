import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Toast } from '@/components/ui'

export default function PerfilPage() {
  const { user, perfil, refreshPerfil } = useAuth()

  const [form, setForm] = useState({ nome: '', crp: '' })
  const [senha, setSenha] = useState({ nova: '', confirmar: '' })
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [salvando, setSalvando]           = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [toast, setToast]                 = useState(null)

  useEffect(() => {
    if (perfil) setForm({ nome: perfil.nome ?? '', crp: perfil.crp ?? '' })
  }, [perfil])

  async function salvarPerfil() {
    setSalvando(true)
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('perfis').update({ nome: form.nome, crp: form.crp }).eq('id', user.id),
      supabase.auth.updateUser({ data: { nome: form.nome, crp: form.crp } }),
    ])
    setSalvando(false)
    if (e1 || e2) { setToast({ message: 'Erro ao salvar: ' + (e1 ?? e2).message, type: 'error' }); return }
    setToast({ message: 'Perfil atualizado!', type: 'success' })
    refreshPerfil()
  }

  async function alterarSenha() {
    if (!senha.nova.trim()) return
    if (senha.nova !== senha.confirmar) { setToast({ message: 'As senhas não conferem.', type: 'error' }); return }
    if (senha.nova.length < 6) { setToast({ message: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' }); return }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: senha.nova })
    setSalvandoSenha(false)
    if (error) { setToast({ message: 'Erro: ' + error.message, type: 'error' }); return }
    setToast({ message: 'Senha alterada com sucesso!', type: 'success' })
    setSenha({ nova: '', confirmar: '' })
  }

  async function uploadFoto(file) {
    if (!file) return
    setUploadingFoto(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/foto.${ext}`
    const { error: errUp } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (errUp) { setToast({ message: 'Erro no upload: ' + errUp.message, type: 'error' }); setUploadingFoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    await supabase.from('perfis').update({ foto_url: publicUrl }).eq('id', user.id)
    setUploadingFoto(false)
    setToast({ message: 'Foto atualizada!', type: 'success' })
    refreshPerfil()
  }

  const fotoUrl = perfil?.foto_url
  const inicial = (perfil?.nome ?? user?.email ?? '?')[0].toUpperCase()

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader title="Meu Perfil" subtitle={user?.email} />

      {/* Foto de perfil */}
      <div className="card flex items-center gap-5">
        {fotoUrl
          ? <img src={fotoUrl} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
          : <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-2xl font-black text-primary">
              {inicial}
            </div>
        }
        <div>
          <p className="font-bold text-navy">{perfil?.nome ?? '—'}</p>
          <p className="text-xs text-muted capitalize">{perfil?.role ?? 'consultor'}</p>
          <label className="btn-secondary text-xs mt-2 cursor-pointer inline-block">
            {uploadingFoto ? 'Enviando…' : 'Alterar foto'}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => uploadFoto(e.target.files[0])} />
          </label>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="card space-y-4">
        <h2 className="text-sm font-bold text-navy border-b border-border pb-2">Dados pessoais</h2>
        <div>
          <label className="label">Nome completo</label>
          <input className="input" value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            placeholder="Seu nome completo" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input bg-gray-50 cursor-not-allowed" value={user?.email ?? ''} readOnly />
        </div>
        <div>
          <label className="label">CRP (número do conselho)</label>
          <input className="input" value={form.crp}
            onChange={e => setForm(p => ({ ...p, crp: e.target.value }))}
            placeholder="Ex: 06/123456" />
        </div>
        <button className="btn-primary" onClick={salvarPerfil} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar dados'}
        </button>
      </div>

      {/* Alterar senha */}
      <div className="card space-y-4">
        <h2 className="text-sm font-bold text-navy border-b border-border pb-2">Alterar senha</h2>
        <div>
          <label className="label">Nova senha</label>
          <input className="input" type="password" placeholder="Mínimo 6 caracteres"
            value={senha.nova} onChange={e => setSenha(p => ({ ...p, nova: e.target.value }))} />
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <input className="input" type="password" placeholder="Repita a senha"
            value={senha.confirmar} onChange={e => setSenha(p => ({ ...p, confirmar: e.target.value }))} />
        </div>
        <button className="btn-primary" onClick={alterarSenha}
          disabled={salvandoSenha || !senha.nova.trim()}>
          {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
