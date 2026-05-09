import Image from 'next/image';

interface PhoneMockupProps {
  src: string;
  alt: string;
  className?: string;
}

export function PhoneMockup({ src, alt, className = '' }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* 手机外框 */}
      <div className="relative mx-auto w-[280px] h-[580px] bg-gray-900 rounded-[3rem] shadow-xl border-[14px] border-gray-900">
        {/* 刘海 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-gray-900 rounded-b-2xl z-10" />

        {/* 屏幕内容 */}
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-white">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-top"
            priority
          />
        </div>

        {/* 底部指示条 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-gray-300 rounded-full" />
      </div>
    </div>
  );
}
