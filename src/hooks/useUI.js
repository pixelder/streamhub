import { useEffect, useState } from 'preact/hooks';
import { uiState, subscribeUI } from '../stores/ui.js';

export function useUI() {
  const [value, set] = useState(uiState);
  useEffect(() => subscribeUI(set), []);
  return value;
}
