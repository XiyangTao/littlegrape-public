import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { DownloadHero } from "@/components/download/DownloadHero";
import { PlatformCard } from "@/components/download/PlatformCard";
import { QRCodeSection } from "@/components/download/QRCodeSection";

export const metadata: Metadata = {
  title: "下载小葡萄 - AI 英语学习应用",
  description: "下载小葡萄 APP，开启你的英语学习之旅。支持 Android 平台。",
};

export default function DownloadPage() {
  return (
    <>
      <DownloadHero />

      <Container className="py-8 md:py-12">
        <div className="max-w-sm mx-auto">
          <PlatformCard />
        </div>
      </Container>

      <QRCodeSection />
    </>
  );
}
