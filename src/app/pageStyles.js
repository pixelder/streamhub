export const pageStyles = {
  explore: ['/explore/styles.css'],
  search: ['/search/styles.css'],
  library: ['/library/styles.css'],
  profile: ['/library/styles.css'],
  sports: ['/sports/styles.css'],
  tools: ['/tools/styles.css'],
  'not-found': ['/404/styles.css']
};

export function preparePageStyles(page, document = globalThis.document) {
  const links = [];
  const cleanups = [];
  if (page === 'tools') {
    // Typography has a local fallback; a font CDN failure must not block Tools.
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@5.2.8/index.min.css';
    document.head.append(font);
    links.push(font);
  }
  const pending = (pageStyles[page] || []).map(href => new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    const timer = setTimeout(() => reject(new Error('Page styles took too long to load.')), 15000);
    link.onload = () => { clearTimeout(timer); resolve(); };
    link.onerror = () => { clearTimeout(timer); reject(new Error('Page styles could not be loaded.')); };
    if (page === 'sports') document.head.insertBefore(link, document.querySelector('[data-base-style]'));
    else document.head.append(link);
    links.push(link);
    cleanups.push(() => { clearTimeout(timer); resolve(); });
  }));
  return {
    ready: Promise.all(pending),
    dispose() {
      cleanups.forEach(cleanup => cleanup());
      links.forEach(link => { link.onload = link.onerror = null; link.remove(); });
    }
  };
}
