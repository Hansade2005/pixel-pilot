import type { File } from '../storage-manager'

export const cryptoTradingDashboardFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import './index.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Crypto Trading Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Portfolio Value</h2>
          <p className="text-2xl font-bold text-green-400">$45,231.89</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">24h Change</h2>
          <p className="text-2xl font-bold text-green-400">+2,350.80</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Today's P&L</h2>
          <p className="text-2xl font-bold text-green-400">+$1,234.56</p>
        </div>
      </div>
    </div>
  )
}

export default App`,
    fileType: 'tsx',
    type: 'tsx',
    size: 800,
    isDirectory: false
  },
]
