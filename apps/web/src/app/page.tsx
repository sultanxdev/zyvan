import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { FeaturesGrid } from '@/components/features-grid';
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
        <HowItWorks />
        <FeaturesGrid />
        <Pricing />
        <FAQ />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
