import type { File } from '../storage-manager'

export const pskServicesFiles: Omit<File, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'src/App.tsx',
    path: 'src/App.tsx',
    content: `import React, { useState } from 'react'
import './index.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Services from './components/Services'
import Portfolio from './components/Portfolio'
import Testimonials from './components/Testimonials'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  const [activeSection, setActiveSection] = useState('home')

  return (
    <div className="min-h-screen">
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      <Hero />
      <Services />
      <Portfolio />
      <Testimonials />
      <Contact />
      <Footer />
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
    content: `import React, { useState } from 'react'
import { Menu, X, Sparkles } from 'lucide-react'

interface HeaderProps {
  activeSection: string
  setActiveSection: (section: string) => void
}

const Header: React.FC<HeaderProps> = ({ activeSection, setActiveSection }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Services', href: '#services' },
    { name: 'Portfolio', href: '#portfolio' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'Contact', href: '#contact' },
  ]

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              PSK Services
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200">
              Get Quote
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-left">
                Get Quote
              </button>
            </nav>
          </div>
        )}
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
    name: 'src/components/Hero.tsx',
    path: 'src/components/Hero.tsx',
    content: `import React from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'

const Hero: React.FC = () => {
  return (
    <section id="home" className="pt-20 pb-16 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Premium Event Services</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Elevate Your Event
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Experience
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            From intimate gatherings to grand celebrations, we bring your vision to life with
            unparalleled elegance and precision. Every detail matters.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 font-semibold">
              <span>Start Planning</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-full hover:border-purple-600 hover:text-purple-600 transition-all duration-200 font-semibold">
              View Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">500+</div>
            <div className="text-gray-600">Events Planned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">50K+</div>
            <div className="text-gray-600">Happy Clients</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">15+</div>
            <div className="text-gray-600">Years Experience</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">5★</div>
            <div className="text-gray-600">Client Rating</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  },
  {
    name: 'src/components/Services.tsx',
    path: 'src/components/Services.tsx',
    content: `import React from 'react'
import { Calendar, Users, Music, Camera, Utensils, MapPin } from 'lucide-react'

const Services: React.FC = () => {
  const services = [
    {
      icon: Calendar,
      title: 'Event Planning',
      description: 'Comprehensive event planning from concept to execution, ensuring every detail is perfect.',
      features: ['Timeline Management', 'Vendor Coordination', 'Budget Planning', 'Risk Assessment']
    },
    {
      icon: Users,
      title: 'Guest Management',
      description: 'Professional guest list management and RSVP handling for seamless event attendance.',
      features: ['Digital Invitations', 'RSVP Tracking', 'Guest Communication', 'Seating Arrangements']
    },
    {
      icon: Music,
      title: 'Entertainment',
      description: 'Curated entertainment options from live bands to DJs, ensuring the perfect atmosphere.',
      features: ['Live Performers', 'DJ Services', 'Sound Systems', 'Lighting Design']
    },
    {
      icon: Camera,
      title: 'Photography & Videography',
      description: 'Professional photography and videography to capture your special moments forever.',
      features: ['Photo Booth', 'Live Streaming', 'Photo Albums', 'Highlight Videos']
    },
    {
      icon: Utensils,
      title: 'Catering',
      description: 'Exquisite catering services with customized menus for every taste and dietary need.',
      features: ['Custom Menus', 'Dietary Accommodations', 'Bartending', 'Cake Design']
    },
    {
      icon: MapPin,
      title: 'Venue Selection',
      description: 'Expert venue selection and negotiation to find the perfect location for your event.',
      features: ['Venue Scouting', 'Contract Negotiation', 'Site Inspections', 'Layout Design']
    }
  ]

  return (
    <section id="services" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We offer comprehensive event services to make your special occasion unforgettable
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-6">
                <service.icon className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600 mb-6">{service.description}</p>

              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  {
    name: 'src/components/Portfolio.tsx',
    path: 'src/components/Portfolio.tsx',
    content: `import React, { useState } from 'react'
import { ExternalLink, Calendar, MapPin, Users } from 'lucide-react'

const Portfolio: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all')

  const projects = [
    {
      id: 1,
      title: 'Grand Wedding Celebration',
      category: 'wedding',
      image: 'https://via.placeholder.com/400x300?text=Wedding+Event',
      date: 'December 2023',
      location: 'Beverly Hills, CA',
      guests: 150,
      description: 'An elegant outdoor wedding with custom floral arrangements and live orchestra.'
    },
    {
      id: 2,
      title: 'Corporate Product Launch',
      category: 'corporate',
      image: 'https://via.placeholder.com/400x300?text=Corporate+Event',
      date: 'November 2023',
      location: 'Silicon Valley, CA',
      guests: 300,
      description: 'High-tech product launch with interactive demonstrations and networking sessions.'
    },
    {
      id: 3,
      title: 'Charity Gala Dinner',
      category: 'charity',
      image: 'https://via.placeholder.com/400x300?text=Charity+Event',
      date: 'October 2023',
      location: 'New York City, NY',
      guests: 200,
      description: 'Elegant charity gala supporting local community initiatives.'
    }
  ]

  const filteredProjects = activeFilter === 'all'
    ? projects
    : projects.filter(project => project.category === activeFilter)

  const categories = [
    { id: 'all', name: 'All Events' },
    { id: 'wedding', name: 'Weddings' },
    { id: 'corporate', name: 'Corporate' },
    { id: 'charity', name: 'Charity' },
    { id: 'birthday', name: 'Birthdays' },
    { id: 'cultural', name: 'Cultural' }
  ]

  return (
    <section id="portfolio" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Portfolio</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our collection of successfully executed events that showcase our expertise
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveFilter(category.id)}
              className={\`px-6 py-3 rounded-full font-medium transition-all duration-200 \${
                activeFilter === category.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }\`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
              <div className="h-48 bg-gradient-to-br from-purple-500 to-blue-600 rounded-t-lg relative overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Event+Image'
                  }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4" />
                    <span>View Project</span>
                  </button>
                </div>

                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-gray-800/80 text-white text-sm rounded-full capitalize">
                    {project.category}
                  </span>
                </div>

                {/* Remixes Count */}
                <div className="absolute bottom-3 right-3">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white text-sm font-medium">
                      {project.guests} guests
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{project.title}</h3>
                <p className="text-gray-600 mb-4">{project.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{project.date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Portfolio`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1800,
    isDirectory: false
  },
  {
    name: 'src/components/Testimonials.tsx',
    path: 'src/components/Testimonials.tsx',
    content: `import React from 'react'
import { Star, Quote } from 'lucide-react'

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Bride',
      company: 'Wedding Celebration',
      content: 'PSK Services made our wedding day absolutely perfect. Every detail was handled with such care and professionalism. Our guests are still talking about how amazing everything was!',
      rating: 5,
      image: 'https://via.placeholder.com/60x60?text=SJ'
    },
    {
      name: 'Michael Chen',
      role: 'CEO',
      company: 'TechCorp Inc.',
      content: 'For our company product launch, PSK Services delivered beyond our expectations. The event was flawless and helped us make a lasting impression on our clients and partners.',
      rating: 5,
      image: 'https://via.placeholder.com/60x60?text=MC'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Event Organizer',
      company: 'Charity Foundation',
      content: 'Working with PSK Services on our annual gala was a dream. Their attention to detail and creative solutions helped us raise more funds than ever before. Highly recommended!',
      rating: 5,
      image: 'https://via.placeholder.com/60x60?text=ER'
    }
  ]

  return (
    <section id="testimonials" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Clients Say</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from the people who've experienced our exceptional service
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-xl relative">
              <Quote className="h-8 w-8 text-purple-600 mb-4 opacity-50" />

              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              <div className="flex items-center space-x-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/60x60?text=Client'
                  }}
                />

                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-sm text-purple-600">{testimonial.company}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1 mt-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1400,
    isDirectory: false
  },
  {
    name: 'src/components/Contact.tsx',
    path: 'src/components/Contact.tsx',
    content: `import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    message: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Let's Plan Your Event</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ready to create something extraordinary? Get in touch with us and let's start planning your perfect event.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Get In Touch</h3>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Phone</h4>
                    <p className="text-gray-600">+1 (555) 123-4567</p>
                    <p className="text-gray-600">Mon-Fri: 9AM - 6PM PST</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Email</h4>
                    <p className="text-gray-600">hello@pskservices.com</p>
                    <p className="text-gray-600">We'll respond within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Office</h4>
                    <p className="text-gray-600">123 Event Plaza</p>
                    <p className="text-gray-600">Los Angeles, CA 90210</p>
                    <p className="text-gray-600">United States</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="">Select event type</option>
                    <option value="wedding">Wedding</option>
                    <option value="corporate">Corporate Event</option>
                    <option value="birthday">Birthday Party</option>
                    <option value="charity">Charity Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Tell us about your vision
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                    placeholder="Describe your event vision, special requirements, or any questions you have..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                >
                  <Send className="h-5 w-5" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact`,
    fileType: 'tsx',
    type: 'tsx',
    size: 2200,
    isDirectory: false
  },
  {
    name: 'src/components/Footer.tsx',
    path: 'src/components/Footer.tsx',
    content: `import React from 'react'
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold">PSK Services</span>
            </div>
            <p className="text-gray-400 mb-4">
              Creating unforgettable experiences through exceptional event planning and execution.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Event Planning</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Venue Selection</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Catering</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Entertainment</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Photography</a></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
              <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Services</a></li>
              <li><a href="#portfolio" className="text-gray-400 hover:text-white transition-colors">Portfolio</a></li>
              <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-purple-600" />
                <span className="text-gray-400">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <span className="text-gray-400">hello@pskservices.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-purple-600 mt-1" />
                <span className="text-gray-400">
                  123 Event Plaza<br />
                  Los Angeles, CA 90210<br />
                  United States
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 PSK Services. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer`,
    fileType: 'tsx',
    type: 'tsx',
    size: 1200,
    isDirectory: false
  }
]
