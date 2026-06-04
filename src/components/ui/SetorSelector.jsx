import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresa } from '@/hooks/useEmpresa'

export function SetorSelector() {
  const { empresaAtiva, setorAtivo, setSetorAtivo } = useEmpresa()
  const [setores, setSetores] = useState([])

  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); return }
    supabase
      .from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).order('nome')
      .then(({ data }) => {
        const lista = data ?? []
        setSetores(lista)
        // Auto-seleciona o primeiro se nenhum ativo ou ativo não pertence a esta empresa
        if (lista.length && (!setorAtivo || !lista.find(s => s.id === setorAtivo.id))) {
          setSetorAtivo(lista[0])
        }
      })
  }, [empresaAtiva])

  if (!empresaAtiva || !setores.length) return null

  // Com apenas 1 setor: mostra badge não-clicável
  if (setores.length === 1) {
    return (
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-semibold text-muted">Setor:</span>
        <span className="text-xs px-3 py-1.5 rounded-full font-semibold border"
          style={{ background: '#1a2e4a', color: '#fff', borderColor: '#1a2e4a' }}>
          {setores[0].nome}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      <span className="text-xs font-semibold text-muted">Setor:</span>
      <div className="flex flex-wrap gap-1.5">
        {setores.map(s => (
          <button
            key={s.id}
            onClick={() => setSetorAtivo(s)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all border"
            style={setorAtivo?.id === s.id
              ? { background: '#1a2e4a', color: '#fff', borderColor: '#1a2e4a' }
              : { background: '#fff', color: '#6b7a99', borderColor: '#d4dbe8' }
            }
          >
            {s.nome}
          </button>
        ))}
      </div>
    </div>
  )
}
