'use client'

import { ArrowRight, Shield, Zap, Users, CheckCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Hero() {
  const features = [
    {
      icon: Shield,
      title: 'Privacidad por Diseño',
      description: 'Datos eliminados automáticamente después del envío',
    },
    {
      icon: Zap,
      title: 'Sin Almacenamiento Permanente',
      description: 'No guardamos tu información personal ni mensajes',
    },
    {
      icon: Users,
      title: 'Transparencia Total',
      description: 'Proceso claro y simple, sin sorpresas ocultas',
    },
  ]

  const stats = [
    { label: 'Eliminación Automática', value: '100%' },
    { label: 'Almacenamiento Permanente', value: '0%' },
    { label: 'Transparencia', value: 'Total' },
    { label: 'Privacidad', value: 'Garantizada' },
  ]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50 parallax-slow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.1),transparent_50%)] parallax-slow" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-secondary-100 text-secondary-700 text-sm font-medium mb-8 animate-fade-in-down">
            <CheckCircle size={16} className="mr-2" />
            Datos eliminados automáticamente
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 animate-fade-in-up">
            Notificaciones
            <br />
            <span className="text-gradient-primary">Empresariales</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Sistema de notificaciones con eliminación automática de datos. 
            Privacidad por diseño, sin almacenamiento permanente y transparencia total en el proceso.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="xl" 
              className="gradient-primary group cta-glow hover:scale-105 transition-transform duration-300"
              onClick={() => window.location.href = '/register'}
            >
              Prueba Gratuita
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform arrow-pulse" />
            </Button>
            <Button 
              variant="outline" 
              size="xl" 
              className="group"
              onClick={() => window.location.href = '/login'}
            >
              <Play size={18} className="mr-2 group-hover:scale-110 transition-transform" />
              Ver Demo en Vivo
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {features.map((feature, index) => (
            <Card
              key={index}
              className="text-center bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer"
              padding="lg"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-xl bg-primary-100 group-hover:bg-primary-200 transition-colors duration-300">
                  {index === 0 && (
                    <Shield
                      size={32}
                      className="text-primary-600 icon-pulse-gentle transition-colors duration-300"
                    />
                  )}
                  {index === 1 && (
                    <Zap
                      size={32}
                      className="text-primary-600 icon-rotate-hover transition-colors duration-300"
                    />
                  )}
                  {index === 2 && (
                    <Users
                      size={32}
                      className="text-primary-600 icon-bounce-hover transition-colors duration-300"
                    />
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <p className="text-sm text-gray-500 mb-4">
            Compromiso real con la privacidad de tus datos
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="text-sm font-medium text-gray-400">
              Sin logos falsos • Sin testimonios inventados • Solo transparencia real
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}