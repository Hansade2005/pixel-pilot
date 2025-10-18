import type { File } from '../storage-manager'

export const cryptoTradingDashboardFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import './index.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, PieChart } from 'lucide-react'

function App() {
  const stats = [
    {
      title: 'Portfolio Value',
      value: '$45,231.89',
      change: '+5.2%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: '24h Change',
      value: '+$2,350.80',
      change: '+2.1%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Positions',
      value: '12',
      change: '3 new',
      changeType: 'neutral',
      icon: Activity,
      color: 'bg-purple-500'
    },
    {
      title: 'Today\'s P&L',
      value: '+$1,234.56',
      change: '+8.4%',
      changeType: 'positive',
      icon: BarChart3,
      color: 'bg-orange-500'
    }
  ]

  const topCryptos = [
    { name: 'Bitcoin', symbol: 'BTC', price: '$43,250.00', change: '+2.34%', changeType: 'positive' },
    { name: 'Ethereum', symbol: 'ETH', price: '$2,650.80', change: '+1.87%', changeType: 'positive' },
    { name: 'Binance Coin', symbol: 'BNB', price: '$315.20', change: '-0.45%', changeType: 'negative' },
    { name: 'Cardano', symbol: 'ADA', price: '$0.48', change: '+3.21%', changeType: 'positive' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Crypto Trading Dashboard</h1>
          <p className="text-gray-400">Monitor your portfolio and trading performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <div className={"p-2 rounded-full " + stat.color}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <p className={"text-xs " + (
                  stat.changeType === 'positive' ? 'text-green-400' :
                  stat.changeType === 'negative' ? 'text-red-400' : 'text-gray-400'
                )}>
                  {stat.change} from yesterday
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Cryptocurrencies */}
          <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Top Cryptocurrencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCryptos.map((crypto, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{crypto.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{crypto.name}</p>
                        <p className="text-sm text-gray-400">{crypto.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{crypto.price}</p>
                      <Badge
                        variant={crypto.changeType === 'positive' ? 'default' : 'destructive'}
                        className={"text-xs " + (
                          crypto.changeType === 'positive'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        )}
                      >
                        {crypto.change}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                Buy Crypto
              </Button>
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                <TrendingDown className="h-4 w-4 mr-2" />
                Sell Crypto
              </Button>
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                <Activity className="h-4 w-4 mr-2" />
                Transaction History
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Market Overview */}
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">$1.2T</p>
                <p className="text-sm text-gray-400">Total Market Cap</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">$45.2B</p>
                <p className="text-sm text-gray-400">24h Volume</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">BTC Dominance</p>
                <p className="text-sm text-gray-400">52.4%</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
