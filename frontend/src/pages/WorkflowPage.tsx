import Breadcrumbs from '../components/Breadcrumbs'
import WorkflowPanel from '../components/WorkflowPanel'

export default function WorkflowPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <WorkflowPanel />
    </div>
  )
}
