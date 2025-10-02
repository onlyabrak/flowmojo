import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">FlowMojo</h1>
          <div className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-5xl font-bold text-gray-900">
            Lean Six Sigma Project Management
          </h2>
          <p className="text-xl text-gray-600">
            Streamline your continuous improvement projects with DMAIC methodology,
            powerful tools, and data-driven insights.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">DMAIC Framework</h3>
              <p className="text-gray-600">
                Structured approach through Define, Measure, Analyze, Improve, and Control phases
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-3xl mb-4">🛠️</div>
              <h3 className="text-xl font-semibold mb-2">Powerful Tools</h3>
              <p className="text-gray-600">
                Built-in tools including SIPOC, Fishbone diagrams, Pareto charts, FMEA, and more
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">Data Analytics</h3>
              <p className="text-gray-600">
                Track metrics, visualize data, and make informed decisions based on statistical analysis
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
