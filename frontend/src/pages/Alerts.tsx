import Breadcrumbs from '../components/Breadcrumbs'
import AlertsPanel from '../components/AlertsPanel'

export default function AlertsPage() {
  return (
    <div className="flex flex-col gap-4 p-3">
      <Breadcrumbs />
      <div className="max-w-lg">
        <AlertsPanel />
      </div>
    </div>
  )
}
