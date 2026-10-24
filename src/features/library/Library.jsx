import { useLayoutEffect } from 'preact/hooks';
import { navigate } from '../../app/navigation.js';
import { libraryProfileUrl } from '../profile/links.js';

// Existing library URLs and collection links continue to resolve.
export default function Library() {
  const target = libraryProfileUrl(location.search, location.hash);
  useLayoutEffect(() => navigate(target, true), [target]);
  return <p><a href={target}>Open your library in Profile</a></p>;
}
