import { useState } from 'preact/hooks';

export default function Synopsis({ children, className = '' }) {
  const [expanded, set] = useState(false);
  return <div
    class={`synopsis ${className} ${expanded ? 'expanded' : ''}`}
    onClick={() => set(!expanded)}
  >

    <p class="overview">{children || 'No description available.'}</p>

  </div>;
}
