import Breadcrumbs from '../components/Breadcrumbs'
import LLMPanel from '../components/LLMPanel'

export default function LLMPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <LLMPanel />
    </div>
  )
}
