import Image from 'next/image';
import { Container } from '@/components/ui/Container';

export function QRCodeSection() {
  return (
    <section className="py-12 md:py-16">
      <Container>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            扫码下载
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-8">
            使用手机扫描二维码即可下载 Android 安装包
          </p>

          <div className="flex items-center justify-center">
            {/* Android 二维码 */}
            <div className="text-center">
              <div className="w-40 h-40 bg-white rounded-2xl flex items-center justify-center border border-[var(--border-light)] overflow-hidden">
                <Image
                  src="/images/qrcode-android.png"
                  alt="Android 下载二维码"
                  width={160}
                  height={160}
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Android APK</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
