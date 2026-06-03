import { useState } from 'react'
import Card from '../components/ui/Card'
import SectorAllocationChart from '../components/SectorAllocationChart'
const MOCK_SECTORS = [
  { name: 'Technology', exposure: 35, color: '#3b82f6', children: [{ name: 'Semiconductors', exposure: 12, color: '#60a5fa' }, { name: 'Software', exposure: 15, color: '#93c5fd' }, { name: 'Hardware', exposure: 8, color: '#bfdbfe' }] },
  { name: 'Healthcare', exposure: 18, color: '#22c55e', children: [{ name: 'Pharma', exposure: 8, color: '#4ade80' }, { name: 'MedTech', exposure: 6, color: '#86efac' }, { name: 'Biotech', exposure: 4, color: '#bbf7d0' }] },
  { name: 'Financials', exposure: 15, color: '#eab308', children: [{ name: 'Banks', exposure: 7, color: '#facc15' }, { name: 'Insurance', exposure: 5, color: '#fde047' }, { name: 'FinTech', exposure: 3, color: '#fef08a' }] },
  { name: 'Energy', exposure: 12, color: '#f97316' },
  { name: 'Consumer', exposure: 10, color: '#a855f7' },
  { name: 'Real Estate', exposure: 6, color: '#ec4899' },
  { name: 'Materials', exposure: 4, color: '#14b8a6' },
]
export default function SectorHeatmapPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="SECTOR HEATMAP">
        <SectorAllocationChart sectors={MOCK_SECTORS} size={400} />
      </Card>
    </div>
  )
}
