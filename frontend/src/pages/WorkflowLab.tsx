/**
 * @deprecated Use /data/workflows (WorkflowPage) instead.
 * WorkflowPage adds Breadcrumbs + proper layout and is the canonical page.
 * This route is kept for backward compatibility.
 */
import { Navigate } from 'react-router-dom'

export default function WorkflowLab() {
  return <Navigate to="/data/workflows" replace />
}
