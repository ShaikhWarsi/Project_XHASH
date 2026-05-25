import Breadcrumbs from '../components/Breadcrumbs'
import ChinaMarketsPanel from '../components/ChinaMarketsPanel'

export default function ChinaMarketsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <ChinaMarketsPanel />
    </div>
  )
}
