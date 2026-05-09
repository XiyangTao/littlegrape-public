import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { APP_INFO } from '@/lib/constants';

export function DownloadHero() {
  return (
    <section className="pt-24 pb-8 md:pt-32 md:pb-12">
      <Container>
        <div className="text-center">
          {/* Logo */}
          <div className="inline-block">
            <Image
              src="/images/logo.png"
              alt={APP_INFO.name}
              width={120}
              height={120}
              className="rounded-3xl shadow-lg mx-auto"
            />
          </div>

          {/* 应用信息 */}
          <h1 className="mt-6 text-3xl md:text-4xl font-bold text-[var(--foreground)]">
            {APP_INFO.name}
          </h1>
          <p className="mt-2 text-lg text-[var(--text-secondary)]">
            {APP_INFO.slogan}
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            版本 {APP_INFO.version}
          </p>
        </div>
      </Container>
    </section>
  );
}
