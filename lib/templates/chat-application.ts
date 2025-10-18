import { File } from '@/lib/storage-manager'

export const chatApplicationFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
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
    name: 'src/components/Navbar.tsx',
    path: 'src/components/Navbar.tsx',
    content: `import React from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              ChatApp
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/chat" className="text-gray-700 hover:text-blue-600">
              <MessageCircle className="h-6 w-6" />
            </Link>

            <Link to="/profile" className="text-gray-700 hover:text-blue-600">
              <User className="h-6 w-6" />
            </Link>

            <button className="text-gray-700 hover:text-blue-600">
              <Settings className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Home.tsx',
    path: 'src/pages/Home.tsx',
    content: `import React from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Users, Zap, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Home = () => {
  const features = [
    {
      icon: MessageCircle,
      title: 'Real-time Messaging',
      description: 'Instant message delivery with typing indicators and read receipts.'
    },
    {
      icon: Users,
      title: 'Group Chats',
      description: 'Create and manage group conversations with multiple participants.'
    },
    {
      icon: Zap,
      title: 'Fast & Reliable',
      description: 'Lightning-fast performance with offline message sync.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'End-to-end encryption keeps your conversations secure.'
    }
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Connect Instantly
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Experience seamless real-time messaging with our AI-powered chat application. Built for speed, security, and simplicity.
            </p>
            <Link
              to="/chat"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Chatting
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose ChatApp?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center bg-white p-6 rounded-lg shadow-md">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Connect?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who trust ChatApp for their communication needs.
          </p>
          <Link
            to="/chat"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Chat.tsx',
    path: 'src/pages/Chat.tsx',
    content: `import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hey! How are you doing?",
      sender: "Alice",
      timestamp: "10:30 AM",
      isOwn: false
    },
    {
      id: 2,
      text: "I'm doing great! Thanks for asking. How about you?",
      sender: "You",
      timestamp: "10:32 AM",
      isOwn: true
    },
    {
      id: 3,
      text: "Pretty good! Just working on some new features.",
      sender: "Alice",
      timestamp: "10:33 AM",
      isOwn: false
    }
  ])

  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage,
        sender: "You",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true
      }
      setMessages([...messages, message])
      setNewMessage('')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Chat Header */}
      <div className="bg-white rounded-t-lg shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">A</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Alice Johnson</h2>
            <p className="text-sm text-gray-600">Online</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-800">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="bg-white shadow-md h-96 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map(message => (
            <div key={message.id} className={\`flex \${message.isOwn ? 'justify-end' : 'justify-start'}\`}>
              <div className={\`max-w-xs lg:max-w-md px-4 py-2 rounded-lg \${message.isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}\`}>
                <p>{message.text}</p>
                <p className={\`text-xs mt-1 \${message.isOwn ? 'text-blue-200' : 'text-gray-600'}\`}>
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white rounded-b-lg shadow-md p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button type="button" className="text-gray-600 hover:text-gray-800">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" className="text-gray-600 hover:text-gray-800">
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Profile.tsx',
    path: 'src/pages/Profile.tsx',
    content: `import React, { useState } from 'react'
import { Camera, Edit2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Passionate about technology and building amazing chat applications.',
    avatar: null
  })

  const handleSave = () => {
    setIsEditing(false)
    // Here you would typically save to backend
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {isEditing ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            <span>{isEditing ? 'Save' : 'Edit'}</span>
          </button>
        </div>

        {/* Avatar */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white font-semibold">J</span>
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 bg-gray-800 text-white p-1 rounded-full">
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-gray-600">{profile.email}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              disabled={!isEditing}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/App.css',
    path: 'src/App.css',
    content: `/* Chat Application Styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Message bubbles */
.message-bubble {
  max-width: 70%;
  word-wrap: break-word;
  position: relative;
}

.message-bubble.own {
  background-color: #3b82f6;
  color: white;
  margin-left: auto;
}

.message-bubble.other {
  background-color: #e5e7eb;
  color: #1f2937;
}

/* Chat input styling */
.chat-input {
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.chat-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Avatar styles */
.avatar {
  border-radius: 50%;
  object-fit: cover;
}

.avatar.online::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background-color: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  padding: 0.5rem;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #9ca3af;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Scrollbar styling */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Notification badge */
.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

/* Online status indicator */
.status-indicator {
  position: relative;
  display: inline-block;
}

.status-indicator.online::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.away::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background-color: #f59e0b;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.offline::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background-color: #6b7280;
  border-radius: 50%;
  border: 2px solid white;
}`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  }
]
