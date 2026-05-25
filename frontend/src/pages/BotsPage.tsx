import Breadcrumbs from '../components/Breadcrumbs'
import BotsPanel from '../components/BotsPanel'

export default function BotsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <BotsPanel />
    </div>
  )
}
