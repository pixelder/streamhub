export default function Loading({ error, empty, children }) {
  return <div
    class="filler loading-indicator"
    role={error ? 'alert' : 'status'}
  >

    <div class="message">
      {!error && !empty && <div
        class="loading-spinner"
        style={{ background: 'var(--font-color3)' }}
      />}

      <h4>{error?.message || empty || children || 'Loading...'}</h4>

    </div>

  </div>;
}
