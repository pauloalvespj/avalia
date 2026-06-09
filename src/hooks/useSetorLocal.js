import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Hook que gerencia um seletor de setor local (não afeta o contexto global)
// setorId = null significa "Todos"
export function useSetorLocal(empresaAtiva) {
  const [setores, setSetores] = useState([])
  const [setorId, setSetorId] = useState(null) // null = Todos (padrão)

  useEffect(() => {
    if (!empresaAtiva) { setSetores([]); setSetorId(null); return }
    supabase.from('setores').select('id, nome').eq('empresa_id', empresaAtiva.id).eq('ativo', true).order('nome')
      .then(({ data }) => {
        const lista = data ?? []
        setSetores(lista)
        if (lista.length === 1) setSetorId(lista[0].id)
      })
  }, [empresaAtiva?.id])

  const nomeSetor = setorId
    ? (setores.find(s => s.id === setorId)?.nome ?? '')
    : 'Todos os setores'

  return { setores, setorId, setSetorId, nomeSetor }
}
