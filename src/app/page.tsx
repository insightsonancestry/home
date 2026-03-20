import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { LogoTicker } from "@/components/LogoTicker";
import { ProductShowcase } from "@/components/ProductShowcase";
import { FAQs } from "@/components/FAQs";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Insights on Ancestry",
  description: "New genetics service",
}

export default function Home() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>
      {/* Spacer to offset fixed header height (navbar 56px) */}
      <div className="h-14" />
      <Hero />
      <LogoTicker />
      <Features />
      <ProductShowcase />
      <FAQs />
      <Footer />
    </>
  );
}