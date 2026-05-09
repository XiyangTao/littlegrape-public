import { Container } from '@/components/ui/Container';
import { APP_INFO } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="bg-[var(--background-secondary)] border-t border-[var(--border-light)]">
      <Container className="py-8">
        <div className="text-center text-sm text-[var(--text-tertiary)]">
          <div>{APP_INFO.copyright}</div>
          <div className="mt-2">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors"
            >
              沪ICP备2024093866号-2
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
