import { Shield, Mail, Phone, MapPin } from 'lucide-react'
import { AnimatedIcon } from '@/components/ui/animated-icon'

export function Footer() {
  const navigation = {
    product: [
      { name: 'Cómo Funciona', href: '#how-it-works' },
      { name: 'Industrias', href: '#industrias' },
      { name: 'Precios', href: '#precios' },
      { name: 'Prueba Gratuita', href: '/register' },
    ],
    company: [
      { name: 'Acerca de SafeNotify', href: '#' },
      { name: 'Privacidad por Diseño', href: '#' },
      { name: 'Contacto', href: '#contacto' },
    ],
    legal: [
      { name: 'Política de Privacidad', href: '/privacy' },
      { name: 'Términos y Condiciones', href: '/terms' },
      { name: 'Tratamiento de Datos', href: '/data-policy' },
    ],
  }

  const contact = [
    { icon: Mail, label: 'Correo', value: 'informacion@safenotify.co', href: 'mailto:informacion@safenotify.co' },
    { icon: Phone, label: 'WhatsApp', value: '+57 300 123 4567', href: 'https://wa.me/573001234567' },
    { icon: MapPin, label: 'Ubicación', value: 'Bogotá, Colombia', href: '#' },
  ]

  return (
    <footer id="contacto" className="bg-dark-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <AnimatedIcon
                icon={Shield}
                animation="pulse"
                className="text-primary-400"
                size={32}
              />
              <span className="text-xl font-bold text-white">SafeNotify</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-sm">
              Sistema simple de notificaciones con eliminación automática de datos. 
              Tu privacidad es nuestra prioridad, sin almacenamiento permanente.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              {contact.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center text-gray-400 hover:text-primary-400 transition-colors duration-200 group"
                >
                  <AnimatedIcon 
                    icon={item.icon} 
                    size={16} 
                    className="mr-3 group-hover:scale-110 transition-transform duration-200" 
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-300">{item.label}:</span>
                    <span className="ml-2">{item.value}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Producto</h3>
            <ul className="space-y-2">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} SafeNotify. Todos los derechos reservados.
            </p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              Privacidad por diseño • Eliminación automática garantizada
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}