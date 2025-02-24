# adapter-nekoweb
An adapter for SvelteKit apps that builds your SvelteKit app using [@sveltejs/adapter-static](https://github.com/sveltejs/kit/blob/main/packages/adapter-static/) and deploys it automatically on [Nekoweb](https://nekoweb.org).

Note that this is a community project and is not affiliated with Nekoweb.

## Configuration
To use the adapter, install it:
```
// npm
npm i -D adapter-nekoweb
// bun
bun i -D adapter-nekoweb
```
then add it on your `svelte.config.js`:
```diff
+ import adapter from 'adapter-nekoweb';

export default {
	kit: {
		adapter: adapter({
		    apiKey: 'api key here (required)',
		    // Default adapter-static options are below
		    pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		})
	}
};
```
then create your API key on https://nekoweb.org/api (Be careful! Don't share this to others as this API can modify your site!)

and lastly, put the API key on `apiKey`.