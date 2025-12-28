import type { File } from '../storage-manager'

export const cortexSecondBrainFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React, { useState } from 'react'
import './index.css'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import KnowledgeBase from './components/KnowledgeBase'
import NoteEditor from './components/NoteEditor'
import SearchInterface from './components/SearchInterface'
import MindMap from './components/MindMap'

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedNote, setSelectedNote] = useState(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <div className="container mx-auto px-4 py-6">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'knowledge' && <KnowledgeBase onNoteSelect={setSelectedNote} />}
        {activeView === 'editor' && <NoteEditor note={selectedNote} />}
        {activeView === 'search' && <SearchInterface />}
        {activeView === 'mindmap' && <MindMap />}
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
import { Brain, Database, Edit3, Search, Map, Settings } from 'lucide-react'

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
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cortex</h1>
            <span className="text-sm text-gray-500">Your Personal AI Engine</span>
          </div>

          <nav className="flex items-center space-x-6">
            <button
              onClick={() => setActiveView('dashboard')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('knowledge')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'knowledge'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <Database className="h-4 w-4 inline mr-2" />
              Knowledge
            </button>
            <button
              onClick={() => setActiveView('editor')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'editor'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <Edit3 className="h-4 w-4 inline mr-2" />
              Editor
            </button>
            <button
              onClick={() => setActiveView('search')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'search'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <Search className="h-4 w-4 inline mr-2" />
              Search
            </button>
            <button
              onClick={() => setActiveView('mindmap')}
              className={\`px-4 py-2 rounded-lg transition-colors \${
                activeView === 'mindmap'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }\`}
            >
              <Map className="h-4 w-4 inline mr-2" />
              Mind Map
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <Settings className="h-5 w-5 text-gray-600" />
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
import { Brain, FileText, Search, TrendingUp, Users, Clock } from 'lucide-react'

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Notes',
      value: '1,247',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Connections Made',
      value: '3,492',
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Search Queries',
      value: '892',
      icon: Search,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Insights Generated',
      value: '156',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const recentActivity = [
    { time: '2 min ago', action: 'Connected "Machine Learning" with "Neural Networks"', type: 'connection' },
    { time: '5 min ago', action: 'Added note: "Quantum Computing Fundamentals"', type: 'note' },
    { time: '8 min ago', action: 'Generated insight: "Pattern recognition improves with data volume"', type: 'insight' },
    { time: '12 min ago', action: 'Searched for: "artificial intelligence ethics"', type: 'search' },
    { time: '15 min ago', action: 'Updated mind map: "Technology Trends 2025"', type: 'mindmap' }
  ]

  const quickActions = [
    { title: 'New Note', description: 'Create a new knowledge entry', icon: FileText },
    { title: 'Quick Search', description: 'Find information instantly', icon: Search },
    { title: 'Generate Insight', description: 'AI-powered analysis', icon: Brain },
    { title: 'View Mind Map', description: 'Visual knowledge connections', icon: TrendingUp }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Knowledge Dashboard</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={\`w-2 h-2 rounded-full mt-2 \${
                  activity.type === 'connection' ? 'bg-blue-500' :
                  activity.type === 'note' ? 'bg-green-500' :
                  activity.type === 'insight' ? 'bg-purple-500' :
                  activity.type === 'search' ? 'bg-orange-500' :
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

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                    <action.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium text-gray-900 text-sm">{action.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Knowledge Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold mb-4">Knowledge Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">23</div>
            <div className="text-sm text-gray-600">Topics</div>
            <div className="text-xs text-gray-500 mt-1">Main knowledge areas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">89%</div>
            <div className="text-sm text-gray-600">Connected</div>
            <div className="text-xs text-gray-500 mt-1">Knowledge linkage</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">4.8★</div>
            <div className="text-sm text-gray-600">Quality Score</div>
            <div className="text-xs text-gray-500 mt-1">AI-assessed quality</div>
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
    name: 'src/components/KnowledgeBase.tsx',
    path: 'src/components/KnowledgeBase.tsx',
    content: `import React, { useState } from 'react'
import { FileText, Folder, Plus, Search, Tag, Calendar } from 'lucide-react'

interface KnowledgeBaseProps {
  onNoteSelect: (note: any) => void
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onNoteSelect }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Notes', count: 1247 },
    { id: 'technology', name: 'Technology', count: 342 },
    { id: 'science', name: 'Science', count: 298 },
    { id: 'business', name: 'Business', count: 201 },
    { id: 'personal', name: 'Personal', count: 406 }
  ]

  const notes = [
    {
      id: 1,
      title: 'Machine Learning Fundamentals',
      category: 'technology',
      tags: ['AI', 'ML', 'Data Science'],
      lastModified: '2025-01-15',
      content: 'Core concepts of machine learning algorithms...',
      connections: 12
    },
    {
      id: 2,
      title: 'Quantum Computing Overview',
      category: 'science',
      tags: ['Physics', 'Computing', 'Future Tech'],
      lastModified: '2025-01-14',
      content: 'Introduction to quantum computing principles...',
      connections: 8
    },
    {
      id: 3,
      title: 'Startup Growth Strategies',
      category: 'business',
      tags: ['Entrepreneurship', 'Growth', 'Strategy'],
      lastModified: '2025-01-13',
      content: 'Effective strategies for scaling startups...',
      connections: 15
    }
  ]

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Knowledge Base</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }\`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onNoteSelect(note)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{note.title}</h3>
                  <p className="text-sm text-gray-500 capitalize">{note.category}</p>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{note.content}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{note.lastModified}</span>
              </div>
              <span>{note.connections} connections</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search terms or create a new note</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create First Note
          </button>
        </div>
      )}
    </div>
  )
}

export default KnowledgeBase`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1800,
    isDirectory: false
  },
  {
    name: 'src/components/NoteEditor.tsx',
    path: 'src/components/NoteEditor.tsx',
    content: `import React, { useState } from 'react'
import { Save, ArrowLeft, Tag, Link, Brain } from 'lucide-react'

interface NoteEditorProps {
  note: any
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note }) => {
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tags, setTags] = useState(note?.tags || [])
  const [newTag, setNewTag] = useState('')

  const handleSave = () => {
    console.log('Saving note:', { title, content, tags })
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Knowledge Base</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {note ? 'Edit Note' : 'Create New Note'}
            </h2>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title..."
            className="w-full text-xl font-semibold border-none outline-none bg-transparent"
          />
        </div>

        {/* Content Editor */}
        <div className="p-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your thoughts, ideas, or knowledge..."
            className="w-full h-96 border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Tags Section */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <span>{tag}</span>
                <button
                  onClick={() => removeTag(tag)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addTag}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <div className="p-6 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-2">Suggested Connections</h4>
              <p className="text-sm text-gray-600">
                This note could be connected to "Machine Learning Fundamentals" and "Data Science Concepts"
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-2">Content Analysis</h4>
              <p className="text-sm text-gray-600">
                Your note covers advanced topics. Consider breaking it down into smaller, more focused notes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteEditor`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1600,
    isDirectory: false
  },
  {
    name: 'src/components/SearchInterface.tsx',
    path: 'src/components/SearchInterface.tsx',
    content: `import React, { useState } from 'react'
import { Search, Filter, FileText, Tag, Calendar, Brain } from 'lucide-react'

const SearchInterface: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    hasTags: false
  })

  const searchResults = [
    {
      id: 1,
      title: 'Machine Learning Fundamentals',
      content: 'Core concepts of machine learning algorithms and their applications...',
      category: 'technology',
      tags: ['AI', 'ML', 'Data Science'],
      relevance: 95,
      lastModified: '2025-01-15'
    },
    {
      id: 2,
      title: 'Neural Network Architecture',
      content: 'Understanding the structure and function of neural networks...',
      category: 'technology',
      tags: ['AI', 'Neural Networks', 'Deep Learning'],
      relevance: 87,
      lastModified: '2025-01-14'
    },
    {
      id: 3,
      title: 'Data Science Best Practices',
      content: 'Essential practices for effective data science workflows...',
      category: 'technology',
      tags: ['Data Science', 'Best Practices', 'Analytics'],
      relevance: 82,
      lastModified: '2025-01-13'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Intelligent Search</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">AI-Powered Results</span>
          <Brain className="h-4 w-4 text-purple-600" />
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="h-6 w-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your knowledge base with natural language..."
            className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filters:</span>
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Categories</option>
            <option value="technology">Technology</option>
            <option value="science">Science</option>
            <option value="business">Business</option>
            <option value="personal">Personal</option>
          </select>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Search Results */}
      {query && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Search Results</h3>
            <span className="text-sm text-gray-500">{searchResults.length} results found</span>
          </div>

          {searchResults.map((result) => (
            <div key={result.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{result.title}</h4>
                  <p className="text-gray-600 mb-3">{result.content}</p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span className="capitalize">{result.category}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{result.lastModified}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Brain className="h-4 w-4" />
                      <span>{result.relevance}% relevant</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Suggestions */}
      {!query && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Suggestions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Popular Searches</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-600 hover:text-blue-800">machine learning</a></li>
                <li><a href="#" className="text-blue-600 hover:text-blue-800">quantum computing</a></li>
                <li><a href="#" className="text-blue-600 hover:text-blue-800">neural networks</a></li>
                <li><a href="#" className="text-blue-600 hover:text-blue-800">data science</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recent Topics</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-600 hover:text-blue-800">AI ethics</a></li>
                <li><a href="#" className="text-blue-600 hover:text-blue-800">blockchain</a></li>
                <li><a href="#" className="text-blue-600 hover:text-blue-800">cybersecurity</a></li>
                <li><a href="#" className="text-blue-600 hover:text-blue-800">cloud computing</a></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchInterface`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1600,
    isDirectory: false
  },
  {
    name: 'src/components/MindMap.tsx',
    path: 'src/components/MindMap.tsx',
    content: `import React, { useState } from 'react'
import { Map, Plus, Minus, RotateCcw, Save } from 'lucide-react'

const MindMap: React.FC = () => {
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState(null)

  const mindMapData = {
    center: {
      id: 'center',
      title: 'Artificial Intelligence',
      x: 400,
      y: 300,
      connections: ['ml', 'nlp', 'vision', 'robotics']
    },
    nodes: [
      {
        id: 'ml',
        title: 'Machine Learning',
        x: 200,
        y: 200,
        connections: ['supervised', 'unsupervised', 'reinforcement'],
        color: 'bg-blue-500'
      },
      {
        id: 'nlp',
        title: 'Natural Language Processing',
        x: 600,
        y: 200,
        connections: ['sentiment', 'translation', 'chatbots'],
        color: 'bg-green-500'
      },
      {
        id: 'vision',
        title: 'Computer Vision',
        x: 200,
        y: 400,
        connections: ['recognition', 'detection', 'segmentation'],
        color: 'bg-purple-500'
      },
      {
        id: 'robotics',
        title: 'Robotics',
        x: 600,
        y: 400,
        connections: ['autonomous', 'industrial', 'service'],
        color: 'bg-orange-500'
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Knowledge Mind Map</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Save className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mind Map Canvas */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div
          className="relative bg-gray-50 rounded-lg overflow-hidden"
          style={{ height: '600px' }}
        >
          {/* Mind Map Visualization */}
          <div
            className="absolute inset-0"
            style={{
              transform: \`scale(\${zoom})\`,
              transformOrigin: 'center'
            }}
          >
            {/* Center Node */}
            <div
              className="absolute w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-center cursor-pointer hover:scale-105 transition-transform shadow-lg"
              style={{ left: mindMapData.center.x - 64, top: mindMapData.center.y - 64 }}
              onClick={() => setSelectedNode(mindMapData.center)}
            >
              <div>
                <div className="text-sm">AI</div>
                <div className="text-xs mt-1">Core</div>
              </div>
            </div>

            {/* Connected Nodes */}
            {mindMapData.nodes.map((node) => (
              <div key={node.id}>
                {/* Connection Line */}
                <svg className="absolute inset-0 pointer-events-none">
                  <line
                    x1={mindMapData.center.x}
                    y1={mindMapData.center.y}
                    x2={node.x}
                    y2={node.y}
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </svg>

                {/* Node */}
                <div
                  className={\`absolute w-24 h-24 \${node.color} rounded-full flex items-center justify-center text-white font-semibold text-center text-xs cursor-pointer hover:scale-105 transition-transform shadow-lg\`}
                  style={{ left: node.x - 48, top: node.y - 48 }}
                  onClick={() => setSelectedNode(node)}
                >
                  {node.title.split(' ').map(word => word[0]).join('')}
                </div>

                {/* Node Label */}
                <div
                  className="absolute bg-white px-3 py-1 rounded-lg shadow-sm border text-sm font-medium text-gray-900"
                  style={{
                    left: node.x - 40,
                    top: node.y + 40
                  }}
                >
                  {node.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Node Details */}
        {selectedNode && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedNode.title}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Connections:</span>
                <span className="font-medium ml-2">{selectedNode.connections?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Related Notes:</span>
                <span className="font-medium ml-2">12</span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <span className="font-medium ml-2">2 days ago</span>
              </div>
              <div>
                <span className="text-gray-500">Importance:</span>
                <span className="font-medium ml-2 text-green-600">High</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Map Controls</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center justify-center space-x-2">
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add Node</span>
          </button>
          <button className="p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center justify-center space-x-2">
            <Map className="h-4 w-4" />
            <span className="text-sm">Auto Layout</span>
          </button>
          <button className="p-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center justify-center space-x-2">
            <Save className="h-4 w-4" />
            <span className="text-sm">Save Layout</span>
          </button>
          <button className="p-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center justify-center space-x-2">
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm">Reset View</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MindMap`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1600,
    isDirectory: false
  }
]
