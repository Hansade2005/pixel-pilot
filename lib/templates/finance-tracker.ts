import { File } from '@/lib/storage-manager'

export const financeTrackerFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/components/Sidebar.tsx',
    path: 'src/components/Sidebar.tsx',
    content: `import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, CreditCard, PieChart, Target, BarChart3, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Sidebar = () => {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: CreditCard, label: 'Transactions' },
    { path: '/budget', icon: PieChart, label: 'Budget' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/reports', icon: BarChart3, label: 'Reports' }
  ]

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">FinanceTracker</h1>
      </div>

      <nav className="mt-8">
        <div className="px-4 space-y-2">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={\`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors \${
                location.pathname === item.path
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }\`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <button className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default Sidebar`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Dashboard.tsx',
    path: 'src/pages/Dashboard.tsx',
    content: `import React from 'react'
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Balance',
      value: '$12,345.67',
      change: '+2.5%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Monthly Income',
      value: '$4,500.00',
      change: '+5.2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      title: 'Monthly Expenses',
      value: '$2,850.30',
      change: '-1.8%',
      changeType: 'negative',
      icon: TrendingDown,
      color: 'bg-red-500'
    },
    {
      title: 'Savings Goal',
      value: '68%',
      change: 'Target: $10,000',
      changeType: 'neutral',
      icon: PiggyBank,
      color: 'bg-purple-500'
    }
  ]

  const recentTransactions = [
    { id: 1, description: 'Grocery Shopping', amount: -85.50, date: '2024-01-15', category: 'Food' },
    { id: 2, description: 'Salary Deposit', amount: 3500.00, date: '2024-01-15', category: 'Income' },
    { id: 3, description: 'Netflix Subscription', amount: -15.99, date: '2024-01-14', category: 'Entertainment' },
    { id: 4, description: 'Gas Station', amount: -45.20, date: '2024-01-14', category: 'Transportation' },
    { id: 5, description: 'Coffee Shop', amount: -12.50, date: '2024-01-13', category: 'Food' }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your financial overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={\`text-sm mt-2 \${
                  stat.changeType === 'positive' ? 'text-green-600' :
                  stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                }\`}>
                  {stat.change}
                </p>
              </div>
              <div className={\`p-3 rounded-full \${stat.color}\`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTransactions.map(transaction => (
            <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-xs text-gray-500">{transaction.category} • {transaction.date}</p>
                </div>
              </div>
              <div className={\`text-sm font-semibold \${
                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
              }\`}>
                {transaction.amount > 0 ? '+' : ''}\${Math.abs(transaction.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Transactions →
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Transactions.tsx',
    path: 'src/pages/Transactions.tsx',
    content: `import React, { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const transactions = [
    { id: 1, description: 'Grocery Shopping', amount: -85.50, date: '2024-01-15', category: 'Food', type: 'Expense' },
    { id: 2, description: 'Salary Deposit', amount: 3500.00, date: '2024-01-15', category: 'Income', type: 'Income' },
    { id: 3, description: 'Netflix Subscription', amount: -15.99, date: '2024-01-14', category: 'Entertainment', type: 'Expense' },
    { id: 4, description: 'Gas Station', amount: -45.20, date: '2024-01-14', category: 'Transportation', type: 'Expense' },
    { id: 5, description: 'Coffee Shop', amount: -12.50, date: '2024-01-13', category: 'Food', type: 'Expense' },
    { id: 6, description: 'Freelance Payment', amount: 750.00, date: '2024-01-12', category: 'Income', type: 'Income' },
    { id: 7, description: 'Electricity Bill', amount: -120.00, date: '2024-01-12', category: 'Utilities', type: 'Expense' },
    { id: 8, description: 'Online Course', amount: -49.99, date: '2024-01-11', category: 'Education', type: 'Expense' }
  ]

  const categories = ['All', 'Food', 'Transportation', 'Entertainment', 'Utilities', 'Education', 'Income']

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || transaction.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">Track and manage all your financial transactions.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={\`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${
                      transaction.type === 'Income'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }\`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={\`\${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }\`}>
                      {transaction.amount > 0 ? '+' : ''}\${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Transactions`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Budget.tsx',
    path: 'src/pages/Budget.tsx',
    content: `import React from 'react'
import { PieChart, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Budget = () => {
  const budgetCategories = [
    { name: 'Food & Dining', spent: 450, budget: 600, color: 'bg-blue-500' },
    { name: 'Transportation', spent: 320, budget: 400, color: 'bg-green-500' },
    { name: 'Entertainment', spent: 180, budget: 200, color: 'bg-yellow-500' },
    { name: 'Utilities', spent: 250, budget: 300, color: 'bg-purple-500' },
    { name: 'Shopping', spent: 150, budget: 250, color: 'bg-pink-500' },
    { name: 'Healthcare', spent: 80, budget: 150, color: 'bg-indigo-500' }
  ]

  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0)
  const totalBudget = budgetCategories.reduce((sum, cat) => sum + cat.budget, 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Budget Overview</h1>
        <p className="text-gray-600 mt-2">Monitor your spending against your budget goals.</p>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">\${totalBudget}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">\${totalSpent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <PieChart className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-gray-900">\${totalBudget - totalSpent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Budget Categories</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {budgetCategories.map((category, index) => {
            const percentage = (category.spent / category.budget) * 100
            const isOverBudget = percentage > 100

            return (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={\`w-4 h-4 rounded \${category.color}\`}></div>
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">\${category.spent} / \${category.budget}</span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={\`h-2 rounded-full \${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}\`}
                    style={{ width: \`\${Math.min(percentage, 100)}%\` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{percentage.toFixed(1)}% used</span>
                  {isOverBudget && (
                    <span className="text-red-600 font-medium">Over budget</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Budget`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Goals.tsx',
    path: 'src/pages/Goals.tsx',
    content: `import React from 'react'
import { Target, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Goals = () => {
  const goals = [
    {
      id: 1,
      name: 'Emergency Fund',
      target: 10000,
      current: 6500,
      deadline: '2024-12-31',
      category: 'Savings'
    },
    {
      id: 2,
      name: 'Vacation to Europe',
      target: 5000,
      current: 2800,
      deadline: '2024-06-30',
      category: 'Travel'
    },
    {
      id: 3,
      name: 'New Laptop',
      target: 2000,
      current: 1200,
      deadline: '2024-08-15',
      category: 'Electronics'
    },
    {
      id: 4,
      name: 'Home Down Payment',
      target: 50000,
      current: 15000,
      deadline: '2025-12-31',
      category: 'Housing'
    }
  ]

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
          <p className="text-gray-600 mt-2">Set and track your savings goals.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const percentage = (goal.current / goal.target) * 100
          const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

          return (
            <div key={goal.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                    <p className="text-sm text-gray-600">{goal.category}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>\${goal.current.toLocaleString()} saved</span>
                  <span>\${goal.target.toLocaleString()} target</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: \`\${percentage}%\` }}
                  ></div>
                </div>
                <p className="text-right text-sm text-gray-600 mt-1">{percentage.toFixed(1)}% complete</p>
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-600">Deadline</p>
                  <p className="font-medium">{new Date(goal.deadline).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">Days left</p>
                  <p className="font-medium">{daysLeft} days</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Goals Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">4</p>
            <p className="text-sm text-gray-600">Active Goals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">$36,500</p>
            <p className="text-sm text-gray-600">Total Saved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">$77,000</p>
            <p className="text-sm text-gray-600">Total Target</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">47%</p>
            <p className="text-sm text-gray-600">Average Progress</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Goals`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Reports.tsx',
    path: 'src/pages/Reports.tsx',
    content: `import React, { useState } from 'react'
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  const spendingByCategory = [
    { category: 'Food & Dining', amount: 450, percentage: 28, color: 'bg-blue-500' },
    { category: 'Transportation', amount: 320, percentage: 20, color: 'bg-green-500' },
    { category: 'Entertainment', amount: 180, percentage: 11, color: 'bg-yellow-500' },
    { category: 'Utilities', amount: 250, percentage: 15, color: 'bg-purple-500' },
    { category: 'Shopping', amount: 150, percentage: 9, color: 'bg-pink-500' },
    { category: 'Healthcare', amount: 80, percentage: 5, color: 'bg-indigo-500' },
    { category: 'Other', amount: 120, percentage: 7, color: 'bg-gray-500' }
  ]

  const monthlyTrend = [
    { month: 'Aug', income: 4200, expenses: 2850 },
    { month: 'Sep', income: 4500, expenses: 3100 },
    { month: 'Oct', income: 4300, expenses: 2900 },
    { month: 'Nov', income: 4600, expenses: 2750 },
    { month: 'Dec', income: 4500, expenses: 2850 },
    { month: 'Jan', income: 4500, expenses: 2850 }
  ]

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-2">Analyze your spending patterns and financial trends.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">$26,500</p>
              <p className="text-sm text-green-600">+8.2% from last period</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">$17,350</p>
              <p className="text-sm text-red-600">-3.1% from last period</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Savings</p>
              <p className="text-2xl font-bold text-blue-600">$9,150</p>
              <p className="text-sm text-blue-600">+23.4% from last period</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <PieChart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-purple-600">34.5%</p>
              <p className="text-sm text-purple-600">+5.2% from last period</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Spending by Category</h2>
          <div className="space-y-4">
            {spendingByCategory.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={\`w-4 h-4 rounded \${item.color}\`}></div>
                  <span className="text-sm text-gray-700">{item.category}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">\${item.amount}</span>
                  <span className="text-sm text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Trend</h2>
          <div className="space-y-4">
            {monthlyTrend.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{month.month}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">\${month.income}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">\${month.expenses}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/App.css',
    path: 'src/App.css',
    content: `/* Finance Tracker Styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f9fafb;
}

/* Sidebar styles */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 256px;
  background: white;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

/* Progress bars */
.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Chart containers */
.chart-container {
  position: relative;
  height: 300px;
  margin: 20px 0;
}

/* Transaction table */
.transaction-table {
  width: 100%;
  border-collapse: collapse;
}

.transaction-table th,
.transaction-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.transaction-table th {
  background-color: #f9fafb;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.transaction-table tbody tr:hover {
  background-color: #f9fafb;
}

/* Budget progress bars */
.budget-progress {
  position: relative;
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  margin: 8px 0;
}

.budget-progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.budget-progress-fill.over-budget {
  background-color: #ef4444;
}

.budget-progress-fill.on-budget {
  background-color: #10b981;
}

.budget-progress-fill.warning {
  background-color: #f59e0b;
}

/* Goal cards */
.goal-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.goal-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Form inputs */
.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Buttons */
.btn-primary {
  background-color: #3b82f6;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #f9fafb;
  color: #374151;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  border: 1px solid #d1d5db;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #f3f4f6;
}

/* Status indicators */
.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.success {
  background-color: #dcfce7;
  color: #166534;
}

.status-indicator.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.status-indicator.error {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-indicator.info {
  background-color: #dbeafe;
  color: #1e40af;
}

/* Loading spinner */
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .main-content {
    margin-left: 0;
  }

  .transaction-table {
    font-size: 12px;
  }

  .transaction-table th,
  .transaction-table td {
    padding: 8px 12px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #111827;
    color: #f9fafb;
  }

  .card {
    background-color: #1f2937;
    border: 1px solid #374151;
  }

  .form-input {
    background-color: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }

  .form-input:focus {
    border-color: #3b82f6;
  }
}`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  }
]
