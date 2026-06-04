import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { EmpresaProvider } from '@/hooks/useEmpresa'
import Layout from '@/components/layout/Layout'

// Páginas (cada uma a ser implementada conforme CLAUDE.md)
import LoginPage        from '@/pages/LoginPage'
import CadastroPage    from '@/pages/CadastroPage'
import DashboardPage    from '@/pages/DashboardPage'
import EmpresasPage     from '@/pages/EmpresasPage'
import SetoresPage      from '@/pages/SetoresPage'
import QuestionarioPage from '@/pages/QuestionarioPage'
import RespostasPage    from '@/pages/RespostasPage'
import RiscosPage       from '@/pages/RiscosPage'
import DiagnosticoPage  from '@/pages/DiagnosticoPage'
import PlanoAcaoPage    from '@/pages/PlanoAcaoPage'
import OkrsPage         from '@/pages/OkrsPage'
import ChecklistPage    from '@/pages/ChecklistPage'
import RelatorioPage    from '@/pages/RelatorioPage'
import EscutaPage      from '@/pages/EscutaPage'
import DenunciaPage    from '@/pages/DenunciaPage'
import DenunciasPage   from '@/pages/DenunciasPage'
import PerfilPage              from '@/pages/PerfilPage'
import ConfiguracoesPage       from '@/pages/admin/ConfiguracoesPage'
import UsuariosPage            from '@/pages/admin/UsuariosPage'
import PerguntasPage           from '@/pages/admin/PerguntasPage'

function PrivateRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <div className="flex h-screen items-center justify-center text-muted">Carregando...</div>
  return session ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { session, isAdmin, perfil } = useAuth()
  if (session === undefined || (session && perfil === null)) return null
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <EmpresaProvider>
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/questionario" element={<QuestionarioPage />} />
      <Route path="/denuncia"     element={<DenunciaPage />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<DashboardPage />} />
        <Route path="setores"     element={<SetoresPage />} />
        <Route path="respostas"   element={<RespostasPage />} />
        <Route path="riscos"      element={<RiscosPage />} />
        <Route path="diagnostico" element={<DiagnosticoPage />} />
        <Route path="plano-acao"  element={<PlanoAcaoPage />} />
        <Route path="okrs"        element={<OkrsPage />} />
        <Route path="checklist"   element={<ChecklistPage />} />
        <Route path="escuta"      element={<EscutaPage />} />
        <Route path="denuncias"   element={<DenunciasPage />} />
        <Route path="relatorio"   element={<RelatorioPage />} />
        <Route path="perfil"      element={<PerfilPage />} />

        {/* Rotas de administração — só para admins */}
        <Route path="admin/configuracoes" element={<AdminRoute><ConfiguracoesPage /></AdminRoute>} />
        <Route path="admin/usuarios"      element={<AdminRoute><UsuariosPage /></AdminRoute>} />
        <Route path="admin/perguntas"     element={<AdminRoute><PerguntasPage /></AdminRoute>} />
        <Route path="empresas"            element={<AdminRoute><EmpresasPage /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </EmpresaProvider>
  )
}
