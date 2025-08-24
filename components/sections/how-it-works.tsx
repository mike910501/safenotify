'use client'

import { Upload, File, Send, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    const element = document.getElementById('how-it-works')
    if (element) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [])

  const steps = [
    {
      icon: Upload,
      title: 'Sube tu archivo CSV',
      description: 'Carga tu lista de contactos desde un archivo CSV simple',
      animation: 'animate-spin-slow'
    },
    {
      icon: File,
      title: 'Selecciona plantilla',
      description: 'Elige entre nuestras plantillas profesionales prediseñadas',
      animation: 'animate-bounce'
    },
    {
      icon: Send,
      title: 'Envía mensajes',
      description: 'Los mensajes se envían automáticamente a todos tus contactos',
      animation: 'animate-pulse'
    },
    {
      icon: Trash2,
      title: 'Datos eliminados automáticamente',
      description: 'Toda la información se borra permanentemente después del envío',
      animation: 'animate-fade-in'
    }
  ]

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            ¿Cómo Funciona?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Proceso simple en 4 pasos. Sin complicaciones, sin datos permanentes.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {steps.map((step, index) => (
            <Card
              key={index}
              className={`text-center relative bg-white hover:shadow-xl transition-all duration-500 group ${
                isVisible ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              padding="lg"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Step Number */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-6 mt-4">
                <div className="p-4 rounded-full bg-primary-100 group-hover:bg-primary-200 transition-colors duration-300">
                  <step.icon
                    size={40}
                    className={`text-primary-600 transition-all duration-300 ${
                      index === 0 ? 'group-hover:animate-spin' : ''
                    }${
                      index === 1 ? 'group-hover:animate-bounce' : ''
                    }${
                      index === 2 ? 'group-hover:translate-x-1' : ''
                    }${
                      index === 3 ? 'group-hover:opacity-50' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-primary-700 transition-colors duration-300">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {step.description}
              </p>

              {/* Connector Line (except for last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary-200">
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary-400 rounded-full"></div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 italic">
            🔒 Tu información está segura: eliminamos todos los datos después del envío
          </p>
        </div>
      </div>
    </section>
  )
}