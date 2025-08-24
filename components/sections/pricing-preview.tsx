'use client'

import { Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function PricingPreview() {
  const plans = [
    {
      name: 'Plan Básico',
      description: 'Perfecto para pequeños negocios',
      price: '$25,000',
      period: '/mes',
      features: [
        'Hasta 100 mensajes/mes',
        'Plantillas incluidas',
        'Eliminación automática',
        'Soporte por email'
      ],
      cta: 'Comenzar Prueba',
      popular: false
    },
    {
      name: 'Plan Pro',
      description: 'Ideal para empresas en crecimiento',
      price: '$50,000',
      period: '/mes',
      features: [
        'Hasta 500 mensajes/mes',
        'Todas las plantillas incluidas',
        'Eliminación automática',
        'Soporte prioritario',
        'Estadísticas avanzadas'
      ],
      cta: 'Comenzar Prueba',
      popular: true
    },
    {
      name: 'Plan Enterprise',
      description: 'Para organizaciones grandes',
      price: '$100,000',
      period: '/mes',
      features: [
        'Hasta 2,000 mensajes/mes',
        'Plantillas personalizadas ilimitadas',
        'Eliminación automática',
        'Soporte 24/7',
        'Estadísticas avanzadas',
        'API de integración'
      ],
      cta: 'Contactar Ventas',
      popular: false
    }
  ]

  return (
    <section id="precios" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Precios Transparentes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sin costos ocultos, sin sorpresas. Elige el plan que mejor se adapte a tu negocio.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative text-center hover:shadow-2xl transition-all duration-300 group ${
                plan.popular
                  ? 'border-2 border-primary-500 bg-white scale-105'
                  : 'bg-white hover:scale-105'
              }`}
              padding="xl"
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-medium shadow-lg">
                    <Star size={16} className="mr-1" />
                    Más Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors duration-300">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors duration-300">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-1">
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-600">
                      <Check 
                        size={20} 
                        className="text-secondary-600 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" 
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <Button
                size="lg"
                className={`w-full ${
                  plan.popular
                    ? 'gradient-primary cta-glow'
                    : 'bg-gray-900 hover:bg-gray-800'
                } transition-all duration-300 hover:scale-105`}
                onClick={() => {
                  if (plan.cta === 'Contactar Ventas') {
                    window.location.href = '#contacto'
                  } else {
                    window.location.href = '/register'
                  }
                }}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm mb-4">
            💳 Pagos seguros con Wompi • Tarjetas y PSE • Prueba gratuita de 14 días
          </p>
          <p className="text-gray-400 text-xs">
            Precios en COP. Los impuestos se calculan según tu ubicación.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Pagos seguros procesados por Wompi • Acepta tarjetas de crédito, débito y PSE
          </p>
        </div>
      </div>
    </section>
  )
}