import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY >= 400);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;

  return (
    <button
      aria-label="Back to top"
      className="back-to-top-button"
      onClick={() =>
        window.scrollTo({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          top: 0,
        })
      }
      type="button"
    >
      <ArrowUp aria-hidden="true" size={21} />
    </button>
  );
}
