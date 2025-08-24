import { Header, Footer } from '@/components/layout'
import { Hero, Industries, PricingPreview } from '@/components/sections'

export default function Home() {
  return (
    <div className="min-h-screen bg-light-50">
      <Header />
      <main>
        <Hero />
        <Industries />
        <PricingPreview />
      </main>
      <Footer />
    </div>
  )
}
