import { json } from '@sveltejs/kit';

/**
 * Web app manifest, so the site can be installed on a phone — which is how a lot of Bible reading
 * happens. Served from a route rather than as a static file so it stays in step with the theme.
 */
export function GET({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=86400' });

	return json(
		{
			name: 'Akribos — Die Bibel im Urtext studieren',
			short_name: 'Akribos',
			description:
				'Bibelübersetzungen parallel lesen, mit Strong-Nummern, Grammatik und Wörterbuch zum Urtext.',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			lang: 'de',
			background_color: '#ffffff',
			theme_color: '#1c1917',
			icons: [{ src: '/icon.png', sizes: '1326x1326', type: 'image/png', purpose: 'any' }]
		},
		{ headers: { 'content-type': 'application/manifest+json' } }
	);
}
