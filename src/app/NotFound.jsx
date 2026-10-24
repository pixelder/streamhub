import { usePage } from '../hooks/usePage.js';
import Icon from '../components/common/Icon.jsx';

export default function NotFound() {
  usePage('Page Not Found');
  return <div class="container">

    <p class="code">404</p>

    <h1 class="title">Page not found</h1>

    <p class="description">Sorry, we couldn’t find the page you’re looking for.</p>

    <div class="actions-404">

      <button class="btn" onClick={() => history.back()}><Icon name="arrow-left" />Go back</button>

      <a href="/" class="btn"><Icon name="house" />Home</a>

    </div>

  </div>;
}
