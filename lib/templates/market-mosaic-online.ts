import type { File } from '../storage-manager'

export const marketMosaicOnlineFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React, { useState } from 'react'
import './index.css'
import Header from './components/Header'
import Overview from './components/Overview'
import Analytics from './components/Analytics'
import Reports from './components/Reports'
import Settings from './components/Settings'

function App() {
  const [activeView, setActiveView] = useState('overview')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <div className="container mx-auto px-4 py-6">
        {activeView === 'overview' && <Overview />}
        {activeView === 'analytics' && <Analytics />}
        {activeView === 'reports' && <Reports />}
        {activeView === 'settings' && <Settings />}
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
import { BarChart3, PieChart, FileText, Settings, Bell, User } from 'lucide-react'

interface HeaderProps {
  activeView: string
  setActiveView: (view: string) => void
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Market Mosaic</h1>
            <span className="text-sm text-gray-500">Analytics Dashboard</span>
          </div>

          <nav className="flex items-center space-x-6">
            <button
              onClick={() => setActiveView('overview')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'overview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'analytics'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <PieChart className="h-4 w-4 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveView('reports')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'reports'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Reports
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'settings'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Settings
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <User className="h-5 w-5 text-gray-600" />
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
    name: 'src/components/Overview.tsx',
    path: 'src/components/Overview.tsx',
    content: `import React from 'react'
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, Eye } from 'lucide-react'

const Overview: React.FC = () => {
  const metrics = [
    {
      title: 'Total Revenue',
      value: '$124,563',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Users',
      value: '45,231',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '-0.4%',
      trend: 'down',
      icon: ShoppingCart,
      color: 'text-purple-600'
    },
    {
      title: 'Page Views',
      value: '892,145',
      change: '+15.3%',
      trend: 'up',
      icon: Eye,
      color: 'text-orange-600'
    },
  ]

  const recentActivity = [
    { time: '2 min ago', action: 'New user registration from Germany', type: 'user' },
    { time: '5 min ago', action: 'Large order placed: $2,450', type: 'order' },
    { time: '8 min ago', action: 'Payment failed for order #12345', type: 'error' },
    { time: '12 min ago', action: 'New product added to catalog', type: 'product' },
    { time: '15 min ago', action: 'User feedback submitted', type: 'feedback' },
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={\`p-2 rounded-lg bg-gray-100\`}>
                  <metric.icon className={\`h-6 w-6 \${metric.color}\`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-1">
              {metric.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={\`text-sm font-medium \${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }\`}>
                {metric.change}
              </span>
              <span className="text-sm text-gray-500">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Revenue chart visualization</p>
              <p className="text-sm text-gray-500 mt-1">Interactive charts would be displayed here</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={\`w-2 h-2 rounded-full mt-2 \${
                  activity.type === 'user' ? 'bg-blue-500' :
                  activity.type === 'order' ? 'bg-green-500' :
                  activity.type === 'error' ? 'bg-red-500' :
                  activity.type === 'product' ? 'bg-purple-500' :
                  'bg-gray-500'
                }\`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Top Products</h3>
          <div className="space-y-3">
            {[
              { name: 'Premium Widget', sales: 1245, revenue: '$24,900' },
              { name: 'Basic Gadget', sales: 892, revenue: '$17,840' },
              { name: 'Pro Package', sales: 567, revenue: '$33,990' },
            ].map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sales} sold</p>
                </div>
                <span className="text-sm font-semibold text-green-600">{product.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Traffic Sources</h3>
          <div className="space-y-3">
            {[
              { source: 'Organic Search', percentage: 45, visitors: '12,340' },
              { source: 'Direct', percentage: 28, visitors: '7,672' },
              { source: 'Social Media', percentage: 18, visitors: '4,932' },
              { source: 'Paid Ads', percentage: 9, visitors: '2,466' },
            ].map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{source.source}</span>
                  <span className="text-sm text-gray-600">{source.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: \`\${source.percentage}%\` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">{source.visitors} visitors</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Geographic Data</h3>
          <div className="space-y-3">
            {[
              { country: 'United States', users: 15420, percentage: 34 },
              { country: 'United Kingdom', users: 8934, percentage: 20 },
              { country: 'Germany', users: 6789, percentage: 15 },
              { country: 'France', users: 5432, percentage: 12 },
              { country: 'Canada', users: 3456, percentage: 8 },
            ].map((country, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{country.country}</p>
                  <p className="text-xs text-gray-500">{country.users.toLocaleString()} users</p>
                </div>
                <span className="text-sm font-semibold">{country.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2500,
    isDirectory: false
  },
  {
    name: 'src/components/Analytics.tsx',
    path: 'src/components/Analytics.tsx',
    content: `import React from 'react'
import { BarChart3, PieChart, TrendingUp, Users, Clock, Target } from 'lucide-react'

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Advanced Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Sales Analytics</h3>
          </div>
          <p className="text-gray-600 text-sm">Detailed sales performance metrics and trends</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold">User Behavior</h3>
          </div>
          <p className="text-gray-600 text-sm">User engagement and behavior analysis</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold">Conversion Tracking</h3>
          </div>
          <p className="text-gray-600 text-sm">Conversion funnel and optimization insights</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold">Real-time Data</h3>
          </div>
          <p className="text-gray-600 text-sm">Live data streaming and instant insights</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold mb-4">Advanced Charts</h3>
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Advanced analytics visualizations</p>
            <p className="text-sm text-gray-500 mt-2">Interactive charts, heatmaps, and predictive analytics</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1000,
    isDirectory: false
  },
  {
    name: 'src/components/Reports.tsx',
    path: 'src/components/Reports.tsx',
    content: `import React from 'react'
import { FileText, Download, Calendar, Filter } from 'lucide-react'

const Reports: React.FC = () => {
  const reports = [
    { name: 'Monthly Sales Report', type: 'Sales', date: '2024-01-01', size: '2.4 MB' },
    { name: 'User Analytics Report', type: 'Analytics', date: '2024-01-01', size: '1.8 MB' },
    { name: 'Financial Summary', type: 'Finance', date: '2024-01-01', size: '3.1 MB' },
    { name: 'Customer Insights', type: 'Customers', date: '2024-01-01', size: '2.7 MB' },
    { name: 'Performance Metrics', type: 'Performance', date: '2024-01-01', size: '1.5 MB' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Reports & Exports</h2>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Available Reports</h3>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Calendar className="h-4 w-4" />
              <span>Schedule Report</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {reports.map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{report.type}</span>
                    <span>{report.date}</span>
                    <span>{report.size}</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reports`,
    fileType: 'tsx',
    type: 'tsx',
    size: 800,
    isDirectory: false
  },
  {
    name: 'src/components/Settings.tsx',
    path: 'src/components/Settings.tsx',
    content: `import React from 'react'
import { Settings, Bell, Shield, Database, User } from 'lucide-react'

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Configure your notification preferences</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Configure Notifications
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold">Security</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Manage your account security settings</p>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Security Settings
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold">Data Management</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Export, import, or delete your data</p>
          <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Manage Data
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold">Profile</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Update your profile information</p>
          <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings`,
    fileType: 'tsx',
    type: 'tsx',
    size: 800,
    isDirectory: false
  }
]
