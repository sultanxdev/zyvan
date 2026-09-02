import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { MetricsBar } from '@/components/metrics-bar';
import { ProblemSolution } from '@/components/problem-solution';
import { ArchitecturePipeline } from '@/components/architecture-pipeline';
import { WebhookSimulator } from '@/components/webhook-simulator';
import { FeaturesGrid } from '@/components/features-grid';
import { CodeQuickstart } from '@/components/code-quickstart';
import { Pricing } from '@/components/pricing';
import { FAQ } from '@/components/faq';
import { CtaBanner } from '@/components/cta-banner';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-zinc-950 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <MetricsBar />
        <ProblemSolution />
        <ArchitecturePipeline />
        <WebhookSimulator />
        <FeaturesGrid />
        <CodeQuickstart />
        <Pricing />
        <FAQ />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
