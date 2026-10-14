import { redirect } from 'next/navigation';

// Face grouping ("People") depends on the server-side AI worker, which is not
// enabled in production. Until it is, the page is hidden from navigation and
// any old links land on the photo gallery instead of an upsell for a feature
// that does not run.
export default function PeoplePage() {
  redirect('/photos');
}
