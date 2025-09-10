import type { File } from '../storage-manager'

export const forkliftNavigatorFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React, { useState } from 'react'
import './index.css'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import FleetOverview from './components/FleetOverview'
import WarehouseMap from './components/WarehouseMap'
import PerformanceMetrics from './components/PerformanceMetrics'

function App() {
  const [activeView, setActiveView] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <div className="container mx-auto px-4 py-6">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'fleet' && <FleetOverview />}
        {activeView === 'warehouse' && <WarehouseMap />}
        {activeView === 'metrics' && <PerformanceMetrics />}
      </div>
    </div>
  )
}

export default App`,
    fileType: 'tsx',
    type: 'tsx',
    size: 600,
    isDirectory: false
  },
  {
    name: 'src/components/Header.tsx',
    path: 'src/components/Header.tsx',
    content: `import React from 'react'
import { Truck, Map, BarChart3, Settings, Bell } from 'lucide-react'

interface HeaderProps {
  activeView: string
  setActiveView: (view: string) => void
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Truck className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Forklift Navigator</h1>
            <span className="text-blue-200">Logistics Control Center</span>
          </div>

          <nav className="flex items-center space-x-6">
            <button
              onClick={() => setActiveView('dashboard')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'dashboard'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-700'
              }\`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('fleet')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'fleet'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-700'
              }\`}
            >
              Fleet
            </button>
            <button
              onClick={() => setActiveView('warehouse')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'warehouse'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-700'
              }\`}
            >
              <Map className="h-4 w-4 inline mr-2" />
              Warehouse
            </button>
            <button
              onClick={() => setActiveView('metrics')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'metrics'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-700'
              }\`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Metrics
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-blue-700">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-blue-700">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/components/Dashboard.tsx',
    path: 'src/components/Dashboard.tsx',
    content: `import React from 'react'
import { Truck, Package, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react'

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Active Forklifts',
      value: '24',
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Orders Today',
      value: '156',
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Avg. Delivery Time',
      value: '12m',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Active Alerts',
      value: '3',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  const recentActivities = [
    { time: '2 min ago', action: 'Forklift FL-012 delivered pallet to Zone B-5', type: 'delivery' },
    { time: '5 min ago', action: 'Maintenance scheduled for Forklift FL-008', type: 'maintenance' },
    { time: '8 min ago', action: 'New order received: Order #45678', type: 'order' },
    { time: '12 min ago', action: 'Forklift FL-015 battery low warning', type: 'alert' },
    { time: '15 min ago', action: 'Zone A-3 inventory replenished', type: 'inventory' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Last updated:</span>
          <span className="text-sm font-medium">2 minutes ago</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={\`p-3 rounded-full \${stat.bgColor}\`}>
                <stat.icon className={\`h-6 w-6 \${stat.color}\`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={\`w-2 h-2 rounded-full mt-2 \${activity.type === 'delivery' ? 'bg-green-500' : activity.type === 'maintenance' ? 'bg-orange-500' : activity.type === 'order' ? 'bg-blue-500' : activity.type === 'alert' ? 'bg-red-500' : 'bg-gray-500'}\`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Fleet Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Forklifts</span>
              <span className="text-sm font-medium">24/25</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '96%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Charging</span>
              <span className="text-sm font-medium">1/25</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '4%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Maintenance</span>
              <span className="text-sm font-medium">0/25</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Efficiency Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Orders per Hour</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">23.4</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Travel Time</span>
              <span className="text-sm font-medium">8.2 min</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Downtime</span>
              <span className="text-sm font-medium text-green-600">2.1%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Safety Incidents</span>
              <span className="text-sm font-medium text-green-600">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2000,
    isDirectory: false
  },
  {
    name: 'src/components/FleetOverview.tsx',
    path: 'src/components/FleetOverview.tsx',
    content: `import React, { useState } from 'react'
import { Truck, Battery, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

const FleetOverview: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState('all')

  const forklifts = [
    { id: 'FL-001', status: 'active', battery: 85, location: 'Zone A-5', lastActivity: '2 min ago', task: 'Delivering to Zone B-3' },
    { id: 'FL-002', status: 'charging', battery: 15, location: 'Charging Station 1', lastActivity: '5 min ago', task: 'Charging' },
    { id: 'FL-003', status: 'active', battery: 92, location: 'Zone C-2', lastActivity: '1 min ago', task: 'Picking order #1234' },
    { id: 'FL-004', status: 'maintenance', battery: 0, location: 'Maintenance Bay', lastActivity: '1 hour ago', task: 'Scheduled maintenance' },
    { id: 'FL-005', status: 'active', battery: 67, location: 'Zone B-7', lastActivity: '3 min ago', task: 'Delivering to Zone A-1' },
    { id: 'FL-006', status: 'idle', battery: 78, location: 'Zone D-4', lastActivity: '15 min ago', task: 'Waiting for assignment' }
  ]

  const filteredForklifts = selectedStatus === 'all'
    ? forklifts
    : forklifts.filter(forklift => forklift.status === selectedStatus)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'charging': return 'text-yellow-600 bg-yellow-100'
      case 'maintenance': return 'text-red-600 bg-red-100'
      case 'idle': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle
      case 'charging': return Battery
      case 'maintenance': return AlertTriangle
      case 'idle': return Clock
      default: return Truck
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Fleet Overview</h2>
        <div className="flex items-center space-x-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="charging">Charging</option>
            <option value="maintenance">Maintenance</option>
            <option value="idle">Idle</option>
          </select>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredForklifts.map((forklift) => {
          const StatusIcon = getStatusIcon(forklift.status)
          return (
            <div key={forklift.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{forklift.id}</h3>
                    <div className={\`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium \${getStatusColor(forklift.status)}\`}>
                      <StatusIcon className="h-3 w-3" />
                      <span className="capitalize">{forklift.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Battery</span>
                  <div className="flex items-center space-x-2">
                    <Battery className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{forklift.battery}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={\`h-2 rounded-full \${
                      forklift.battery > 50 ? 'bg-green-600' :
                      forklift.battery > 20 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }\`}
                    style={{ width: \`\${forklift.battery}%\` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Location</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{forklift.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Activity</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{forklift.lastActivity}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700">{forklift.task}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Fleet Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold mb-4">Fleet Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">{forklifts.filter(f => f.status === 'active').length}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-2">{forklifts.filter(f => f.status === 'charging').length}</div>
            <div className="text-sm text-gray-600">Charging</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">{forklifts.filter(f => f.status === 'maintenance').length}</div>
            <div className="text-sm text-gray-600">Maintenance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">{forklifts.filter(f => f.status === 'idle').length}</div>
            <div className="text-sm text-gray-600">Idle</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FleetOverview`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2500,
    isDirectory: false
  },
  {
    name: 'src/components/WarehouseMap.tsx',
    path: 'src/components/WarehouseMap.tsx',
    content: `import React, { useState } from 'react'
import { Map, Truck, Package, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react'

const WarehouseMap: React.FC = () => {
  const [zoom, setZoom] = useState(1)

  // Mock warehouse data
  const zones = [
    { id: 'A', name: 'Zone A', items: 1247, forklifts: 6, color: 'bg-blue-500' },
    { id: 'B', name: 'Zone B', items: 892, forklifts: 5, color: 'bg-green-500' },
    { id: 'C', name: 'Zone C', items: 654, forklifts: 4, color: 'bg-yellow-500' },
    { id: 'D', name: 'Zone D', items: 789, forklifts: 7, color: 'bg-purple-500' },
    { id: 'E', name: 'Zone E', items: 543, forklifts: 3, color: 'bg-red-500' }
  ]

  const forklifts = [
    { id: 'FL-001', x: 150, y: 120, status: 'active' },
    { id: 'FL-003', x: 280, y: 200, status: 'active' },
    { id: 'FL-005', x: 400, y: 150, status: 'active' },
    { id: 'FL-002', x: 50, y: 300, status: 'charging' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Warehouse Map</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
          {/* Warehouse Grid */}
          <div
            className="absolute inset-0 bg-white border-2 border-gray-200"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              transform: \`scale(\${zoom})\`,
              transformOrigin: 'top left'
            }}
          >
            {/* Zones */}
            {zones.map((zone, index) => (
              <div
                key={zone.id}
                className={\`absolute border-2 border-gray-300 rounded-lg flex items-center justify-center text-white font-bold \${zone.color}\`}
                style={{
                  left: \`\${100 + index * 120}px\`,
                  top: \`\${100 + (index % 2) * 120}px\`,
                  width: '100px',
                  height: '100px'
                }}
              >
                <div className="text-center">
                  <div className="text-lg">{zone.id}</div>
                  <div className="text-xs">{zone.items} items</div>
                  <div className="text-xs">{zone.forklifts} forklifts</div>
                </div>
              </div>
            ))}

            {/* Forklifts */}
            {forklifts.map((forklift) => (
              <div
                key={forklift.id}
                className={\`absolute w-6 h-6 rounded-full border-2 border-white shadow-lg \${
                  forklift.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                }\`}
                style={{
                  left: \`\${forklift.x}px\`,
                  top: \`\${forklift.y}px\`
                }}
                title={\`\${forklift.id} - \${forklift.status}\`}
              >
                <Truck className="h-4 w-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            ))}

            {/* Routes (simplified) */}
            <svg className="absolute inset-0 pointer-events-none">
              <path
                d="M 150 120 L 280 200 L 400 150"
                stroke="#3B82F6"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
              />
            </svg>
          </div>
        </div>

        {/* Map Legend */}
        <div className="mt-4 flex items-center justify-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Active Forklift</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Charging</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Zone</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-blue-500 border-dashed"></div>
            <span className="text-sm text-gray-600">Route</span>
          </div>
        </div>
      </div>

      {/* Zone Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
              <div className={\`w-3 h-3 rounded-full \${zone.color}\`}></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Items</span>
                <span className="text-sm font-medium">{zone.items.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Forklifts</span>
                <span className="text-sm font-medium">{zone.forklifts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Capacity</span>
                <span className="text-sm font-medium text-green-600">
                  {Math.round((zone.items / 2000) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WarehouseMap`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2200,
    isDirectory: false
  },
  {
    name: 'src/components/PerformanceMetrics.tsx',
    path: 'src/components/PerformanceMetrics.tsx',
    content: `import React from 'react'
import { TrendingUp, TrendingDown, Clock, Package, AlertTriangle, Target } from 'lucide-react'

const PerformanceMetrics: React.FC = () => {
  const metrics = [
    {
      title: 'Average Delivery Time',
      value: '8.2 min',
      change: '-12%',
      trend: 'up',
      icon: Clock,
      target: '10 min'
    },
    {
      title: 'Orders per Hour',
      value: '23.4',
      change: '+8%',
      trend: 'up',
      icon: Package,
      target: '20'
    },
    {
      title: 'Error Rate',
      value: '0.8%',
      change: '-25%',
      trend: 'up',
      icon: AlertTriangle,
      target: '< 2%'
    },
    {
      title: 'On-Time Delivery',
      value: '96.5%',
      change: '+3%',
      trend: 'up',
      icon: Target,
      target: '> 95%'
    }
  ]

  const timeData = [
    { time: '00:00', value: 12 },
    { time: '04:00', value: 8 },
    { time: '08:00', value: 22 },
    { time: '12:00', value: 28 },
    { time: '16:00', value: 25 },
    { time: '20:00', value: 15 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Performance Metrics</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Period:</span>
          <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <metric.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
              {metric.trend === 'up' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className={\`font-medium \${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }\`}>
                {metric.change}
              </span>
              <span className="text-gray-500">Target: {metric.target}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold mb-6">Hourly Performance</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Orders processed per hour</p>
            <p className="text-sm text-gray-500 mt-1">Performance chart visualization</p>
          </div>
        </div>

        {/* Time-based data points */}
        <div className="grid grid-cols-6 gap-4">
          {timeData.map((point, index) => (
            <div key={index} className="text-center">
              <div className="text-lg font-semibold text-gray-900">{point.value}</div>
              <div className="text-sm text-gray-500">{point.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Efficiency Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pick Rate</span>
              <span className="text-sm font-medium">45 items/hour</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Travel Efficiency</span>
              <span className="text-sm font-medium">87%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '87%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Load Factor</span>
              <span className="text-sm font-medium">92%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Safety & Quality</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Safety Incidents</span>
              <span className="text-sm font-medium text-green-600">0</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Equipment Uptime</span>
              <span className="text-sm font-medium text-green-600">97.8%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Order Accuracy</span>
              <span className="text-sm font-medium text-green-600">99.2%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Customer Satisfaction</span>
              <span className="text-sm font-medium text-green-600">4.8/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMetrics`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2000,
    isDirectory: false
  }
]
