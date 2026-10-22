import Icon from '../common/Icon.jsx';

export default function Progress({ value = 0, ring = false }) {
  if (value < 5)
    return null;
  if (!ring)
    return <div class="progress-bar">

      <div class="progress" style={{ width: `${value}%` }} />

    </div>;
  const done = value === 100,
    angle = value * 3.6;
  return <div class={`progress-wrapper ${done ? 'watched' : ''}`}>

    <div
      class="progress-ring"
      style={{
        background: `conic-gradient(var(--${done ? 'success' : 'progress-color'}) ${angle}deg, var(--color1) 0deg)`
      }}
    >

      <div class="progress-label">{done ? <Icon name="check" /> : `${Math.floor(value)}%`}</div>

      <div class="progress-center" />
      {!done && <>
        <div class="dot fixed-dot" />
        <div class="dot-container" style={{ transform: `rotate(${angle}deg)` }}>

          <div class="dot moving-dot" />

        </div>
      </>}

    </div>

  </div>;
}
