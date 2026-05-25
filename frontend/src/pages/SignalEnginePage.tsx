import SignalEngineDashboard from '../components/SignalEngineDashboard'
import Breadcrumbs from '../components/Breadcrumbs'

export default function SignalEnginePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <SignalEngineDashboard />
    </div>
  )
}
