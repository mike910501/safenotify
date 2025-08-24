import { 
  Heart, 
  Scissors, 
  UtensilsCrossed, 
  ShoppingBag, 
  Wrench, 
  Dumbbell, 
  GraduationCap, 
  Building 
} from 'lucide-react'
import { Card } from '@/components/ui/card'

export function Industries() {
  const industries = [
    {
      icon: Heart,
      title: 'Salud',
      description: 'Recordatorios de citas y seguimientos médicos'
    },
    {
      icon: Scissors,
      title: 'Belleza',
      description: 'Confirmaciones de reservas y promociones'
    },
    {
      icon: UtensilsCrossed,
      title: 'Restaurantes',
      description: 'Reservas, promociones y menús especiales'
    },
    {
      icon: ShoppingBag,
      title: 'Retail',
      description: 'Ofertas, nuevos productos y seguimiento de pedidos'
    },
    {
      icon: Wrench,
      title: 'Servicios',
      description: 'Citas de mantenimiento y servicios técnicos'
    },
    {
      icon: Dumbbell,
      title: 'Fitness',
      description: 'Clases, entrenamientos y motivación diaria'
    },
    {
      icon: GraduationCap,
      title: 'Educación',
      description: 'Comunicados escolares y eventos académicos'
    },
    {
      icon: Building,
      title: 'Otros',
      description: 'Cualquier industria que necesite comunicación'
    }
  ]

  return (
    <section id="industrias" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Para Todas las Industrias
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sin importar tu sector, SafeNotify se adapta a tus necesidades de comunicación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {industries.map((industry, index) => (
            <Card
              key={index}
              className="text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer bg-white border-gray-100"
              padding="lg"
            >
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-secondary-100 group-hover:bg-secondary-200 transition-colors duration-300">
                  <industry.icon
                    size={32}
                    className="text-secondary-600 group-hover:rotate-12 transition-transform duration-300"
                  />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-secondary-700 transition-colors duration-300">
                {industry.title}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {industry.description}
              </p>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            ¿No ves tu industria? SafeNotify funciona para cualquier negocio que necesite comunicarse con sus clientes.
          </p>
        </div>
      </div>
    </section>
  )
}