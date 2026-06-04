import { createContext, useContext, useState } from 'react'

const EmpresaContext = createContext(null)

export function EmpresaProvider({ children }) {
  const [empresaAtiva, setEmpresaAtivaState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('psi_empresa_ativa')) } catch { return null }
  })
  const [setorAtivo, setSetorAtivoState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('psi_setor_ativo')) } catch { return null }
  })

  function setEmpresaAtiva(empresa) {
    setEmpresaAtivaState(empresa)
    // Limpa o setor ao trocar de empresa
    setSetorAtivoState(null)
    localStorage.removeItem('psi_setor_ativo')
    if (empresa) localStorage.setItem('psi_empresa_ativa', JSON.stringify(empresa))
    else localStorage.removeItem('psi_empresa_ativa')
  }

  function setSetorAtivo(setor) {
    setSetorAtivoState(setor)
    if (setor) localStorage.setItem('psi_setor_ativo', JSON.stringify(setor))
    else localStorage.removeItem('psi_setor_ativo')
  }

  return (
    <EmpresaContext.Provider value={{ empresaAtiva, setEmpresaAtiva, setorAtivo, setSetorAtivo }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
