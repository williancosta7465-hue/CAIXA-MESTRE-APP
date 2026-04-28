import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage.jsx'
import RecoverPasswordPage from './pages/RecoverPasswordPage.jsx'
import Shell from './components/Shell.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import RequirePermission from './auth/RequirePermission.jsx'
import DeliveryPage from './pages/DeliveryPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import EmployeesPage from './pages/EmployeesPage.jsx'
import PendentesPage from './pages/PendentesPage.jsx'
import AuditLogPage from './pages/AuditLogPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import EmployeeHistoryPage from './pages/EmployeeHistoryPage.jsx'
import { canAccessSettings, canEditCatalog, canMoveStock, canViewReports } from './utils/permissions.js'
import { autoBackupCheck } from './data/backup.js'
import { useAuth } from './auth/AuthProvider.jsx'

function AutoBackupWatcher() {
  const { session } = useAuth()
  
  useEffect(() => {
    // Verificar backup a cada 5 minutos
    const interval = setInterval(() => {
      autoBackupCheck({ usuario: session })
    }, 5 * 60 * 1000)
    
    // Verificar também ao carregar
    autoBackupCheck({ usuario: session })
    
    return () => clearInterval(interval)
  }, [session])
  
  return null
}

function DataImportWatcher() {
  const [importStatus, setImportStatus] = useState({ show: false, message: '', type: 'info' })
  
  useEffect(() => {
    const handleImportStart = (e) => {
      setImportStatus({ show: true, message: e.detail.message, type: 'info' })
    }
    
    const handleImportProgress = (e) => {
      setImportStatus({ show: true, message: e.detail.message, type: 'info' })
    }
    
    const handleImportSuccess = (e) => {
      setImportStatus({ show: true, message: e.detail.message, type: 'success' })
      // Esconder após 5 segundos
      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, show: false }))
      }, 5000)
    }
    
    const handleImportWarning = (e) => {
      setImportStatus({ show: true, message: e.detail.message, type: 'warning' })
      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, show: false }))
      }, 3000)
    }
    
    const handleImportError = (e) => {
      setImportStatus({ show: true, message: e.detail.message, type: 'error' })
      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, show: false }))
      }, 5000)
    }
    
    // Adicionar listeners
    window.addEventListener('dataImportStart', handleImportStart)
    window.addEventListener('dataImportProgress', handleImportProgress)
    window.addEventListener('dataImportSuccess', handleImportSuccess)
    window.addEventListener('dataImportWarning', handleImportWarning)
    window.addEventListener('dataImportError', handleImportError)
    
    // Limpar listeners
    return () => {
      window.removeEventListener('dataImportStart', handleImportStart)
      window.removeEventListener('dataImportProgress', handleImportProgress)
      window.removeEventListener('dataImportSuccess', handleImportSuccess)
      window.removeEventListener('dataImportWarning', handleImportWarning)
      window.removeEventListener('dataImportError', handleImportError)
    }
  }, [])
  
  if (!importStatus.show) return null
  
  const bgColor = importStatus.type === 'success' ? 'bg-emerald-600' :
                  importStatus.type === 'error' ? 'bg-red-600' :
                  importStatus.type === 'warning' ? 'bg-amber-600' :
                  'bg-blue-600'
  
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg text-sm`}>
      {importStatus.message}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <>
              <AutoBackupWatcher />
              <DataImportWatcher />
              <Shell />
            </>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="entrega"
          element={
            <RequirePermission allow={canMoveStock}>
              <DeliveryPage />
            </RequirePermission>
          }
        />
        <Route
          path="pedidos"
          element={
            <RequirePermission allow={canMoveStock}>
              <OrdersPage />
            </RequirePermission>
          }
        />
        <Route
          path="estoque"
          element={
            <RequirePermission allow={canEditCatalog}>
              <ProductsPage />
            </RequirePermission>
          }
        />
        <Route
          path="funcionarios"
          element={
            <RequirePermission allow={canEditCatalog}>
              <EmployeesPage />
            </RequirePermission>
          }
        />
        <Route
          path="relatorios"
          element={
            <RequirePermission allow={canViewReports}>
              <ReportsPage />
            </RequirePermission>
          }
        />
        <Route
          path="pendentes"
          element={
            <RequirePermission allow={canViewReports}>
              <PendentesPage />
            </RequirePermission>
          }
        />
        <Route
          path="config"
          element={
            <RequirePermission allow={canAccessSettings}>
              <SettingsPage />
            </RequirePermission>
          }
        />
        <Route
          path="auditoria"
          element={
            <RequirePermission allow={canAccessSettings}>
              <AuditLogPage />
            </RequirePermission>
          }
        />
        <Route
          path="usuarios"
          element={
            <RequirePermission allow={canAccessSettings}>
              <UsersPage />
            </RequirePermission>
          }
        />
        <Route
          path="funcionario/:employeeId/historico"
          element={
            <RequirePermission allow={canViewReports}>
              <EmployeeHistoryPage />
            </RequirePermission>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
