'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { cn } from '@/lib/utils'

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
      
      // Update active section
      const sections = ['how-it-works', 'industrias', 'precios', 'contacto']
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault()
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
    
    if (element) {
      const offsetTop = element.offsetTop - 80 // Account for fixed header
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
    }
    setIsMobileMenuOpen(false)
  }

  const navigation = [
    { name: 'Cómo Funciona', href: '#how-it-works' },
    { name: 'Industrias', href: '#industrias' },
    { name: 'Precios', href: '#precios' },
    { name: 'Contacto', href: '#contacto' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <AnimatedIcon
              icon={Shield}
              animation="pulse"
              className="text-primary-600"
              size={32}
            />
            <span className="text-xl font-bold text-gray-900">SafeNotify</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
                className={cn(
                  "font-medium transition-colors duration-200 relative",
                  activeSection === item.href.replace('#', '')
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-primary-600"
                )}
              >
                {item.name}
                {activeSection === item.href.replace('#', '') && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
                )}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = '/login'}
            >
              Iniciar Sesión
            </Button>
            <Button 
              size="sm" 
              className="gradient-primary"
              onClick={() => window.location.href = '/register'}
            >
              Comenzar
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <AnimatedIcon
              icon={isMobileMenuOpen ? X : Menu}
              size={24}
            />
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden animate-slide-down bg-white border-t border-gray-200 py-4 space-y-4">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
                className={cn(
                  "block font-medium transition-colors duration-200 px-4",
                  activeSection === item.href.replace('#', '')
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-primary-600"
                )}
              >
                {item.name}
              </a>
            ))}
            <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/login'}
              >
                Iniciar Sesión
              </Button>
              <Button 
                size="sm" 
                className="gradient-primary"
                onClick={() => window.location.href = '/register'}
              >
                Comenzar
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}