import { File } from '@/lib/storage-manager'

export const ecommercePlatformFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
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
import { ShoppingCart, User, Search } from 'lucide-react'

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              ShopHub
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Link to="/products" className="text-gray-700 hover:text-blue-600">
              Products
            </Link>

            <Link to="/cart" className="relative text-gray-700 hover:text-blue-600">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Link>

            <button className="text-gray-700 hover:text-blue-600">
              <User className="h-6 w-6" />
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
import { Star, Truck, Shield, HeadphonesIcon } from 'lucide-react'

const Home = () => {
  const featuredProducts = [
    {
      id: 1,
      name: 'Wireless Headphones',
      price: '$299',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      rating: 4.5
    },
    {
      id: 2,
      name: 'Smart Watch',
      price: '$399',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      rating: 4.8
    },
    {
      id: 3,
      name: 'Laptop Pro',
      price: '$1299',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      rating: 4.7
    }
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to ShopHub
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Discover amazing products with AI-powered recommendations and seamless shopping experience
            </p>
            <Link
              to="/products"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-600">{product.rating}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{product.price}</p>
                  <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Truck className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Free Shipping</h3>
              <p className="text-gray-600">Free shipping on orders over $50</p>
            </div>
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure Payment</h3>
              <p className="text-gray-600">100% secure payment processing</p>
            </div>
            <div className="text-center">
              <HeadphonesIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p className="text-gray-600">Round the clock customer support</p>
            </div>
          </div>
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
    name: 'src/pages/Products.tsx',
    path: 'src/pages/Products.tsx',
    content: `import React, { useState } from 'react'
import { Filter, Grid, List } from 'lucide-react'

const Products = () => {
  const [viewMode, setViewMode] = useState('grid')

  const products = [
    {
      id: 1,
      name: 'Wireless Headphones',
      price: 299,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
      rating: 4.5,
      inStock: true
    },
    {
      id: 2,
      name: 'Smart Watch',
      price: 399,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
      rating: 4.8,
      inStock: true
    },
    {
      id: 3,
      name: 'Laptop Pro',
      price: 1299,
      category: 'Computers',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300',
      rating: 4.7,
      inStock: false
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Products</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('grid')}
            className={\`p-2 rounded \${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}\`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={\`p-2 rounded \${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}\`}
          >
            <List className="h-5 w-5" />
          </button>
          <button className="flex items-center space-x-2 bg-gray-200 text-gray-600 px-4 py-2 rounded">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className={\`grid \${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6\`}>
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{product.category}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-blue-600">\${product.price}</span>
                <span className={\`text-sm \${product.inStock ? 'text-green-600' : 'text-red-600'}\`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <button
                disabled={!product.inStock}
                className={\`w-full py-2 rounded transition-colors \${product.inStock ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}\`}
              >
                {product.inStock ? 'Add to Cart' : 'Unavailable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Products`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Cart.tsx',
    path: 'src/pages/Cart.tsx',
    content: `import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Minus, Trash2 } from 'lucide-react'

const Cart = () => {
  const cartItems = [
    {
      id: 1,
      name: 'Wireless Headphones',
      price: 299,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'
    },
    {
      id: 2,
      name: 'Smart Watch',
      price: 399,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'
    }
  ]

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = subtotal > 50 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          {cartItems.map(item => (
            <div key={item.id} className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow mb-4">
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-gray-600">\${item.price}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 rounded bg-gray-200 hover:bg-gray-300">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 border rounded">{item.quantity}</span>
                <button className="p-1 rounded bg-gray-200 hover:bg-gray-300">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">\${item.price * item.quantity}</p>
                <button className="text-red-600 hover:text-red-800">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>\${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>\${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>\${tax.toFixed(2)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>\${total.toFixed(2)}</span>
            </div>
          </div>

          <Link
            to="/checkout"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors block text-center mt-6"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Cart`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/pages/Checkout.tsx',
    path: 'src/pages/Checkout.tsx',
    content: `import React, { useState } from 'react'
import { CreditCard, Truck } from 'lucide-react'

const Checkout = () => {
  const [paymentMethod, setPaymentMethod] = useState('card')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Billing Information */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="card"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="card" className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Credit/Debit Card
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="paypal"
                  name="payment"
                  value="paypal"
                  checked={paymentMethod === 'paypal'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="paypal" className="flex items-center">
                  PayPal
                </label>
              </div>
            </div>

            {paymentMethod === 'card' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input type="text" placeholder="MM/YY" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input type="text" placeholder="123" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span>Wireless Headphones (x2)</span>
              <span>$598.00</span>
            </div>
            <div className="flex justify-between">
              <span>Smart Watch (x1)</span>
              <span>$399.00</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>$79.84</span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>$1,076.84</span>
            </div>
          </div>

          <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center">
            <Truck className="h-5 w-5 mr-2" />
            Place Order
          </button>
        </div>
      </div>
    </div>
  )
}

export default Checkout`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  },
  {
    name: 'src/App.css',
    path: 'src/App.css',
    content: `/* Custom styles for the e-commerce platform */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Loading animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

/* Custom button hover effects */
.btn-primary {
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Product card animations */
.product-card {
  transition: all 0.3s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* Form styling */
.form-input {
  transition: all 0.3s ease;
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Notification styles */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification.success {
  background-color: #10b981;
  color: white;
}

.notification.error {
  background-color: #ef4444;
  color: white;
}

.notification.info {
  background-color: #3b82f6;
  color: white;
}`,
    fileType: 'file',
    type: 'file',
    size: 0,
    isDirectory: false
  }
]
