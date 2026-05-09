import { HeroSection } from "@/components/home/HeroSection";
import { FeatureSection } from "@/components/home/FeatureSection";
import { ScreenshotSection } from "@/components/home/ScreenshotSection";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeatureSection />
      <ScreenshotSection />
      <CTASection />
    </>
  );
}
