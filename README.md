# svelte-adapter-nekoweb
[![jbcarreon123/svelte-adapter-nekoweb](https://img.shields.io/badge/github-svelte--adapter--nekoweb-green?style=for-the-badge&logo=github&logoColor=white)](https://github.com/jbcarreon123/svelte-adapter-nekoweb) [![NPM Downloads](https://img.shields.io/npm/dm/svelte-adapter-nekoweb?style=for-the-badge&logo=npm&color=red)](https://www.npmjs.com/package/svelte-adapter-nekoweb)

An adapter for Svelte that builds your Svelte(Kit) app using [@sveltejs/adapter-static](https://github.com/sveltejs/kit/blob/main/packages/adapter-static/) and deploys it automatically on [Nekoweb](https://nekoweb.org).

Note that this is a community project and is not affiliated with Nekoweb.

## Configuration
To use the adapter, install it:
```
// npm
npm i -D svelte-adapter-nekoweb
// bun
bun i -D svelte-adapter-nekoweb
```
then add it on your `svelte.config.js`:
```diff
+ import adapter from 'svelte-adapter-nekoweb';

export default {
	kit: {
		adapter: adapter({
		    apiKey: 'api key here (required)',
			cookie: 'nekoweb cookie here (optional, but recommended)',
			folder: 'serve folder (default is "build")',
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
then create your API key on https://nekoweb.org/api (Be careful! Don't share this to others as this API can modify your site!) then put the API key on `apiKey`.

if you want your page to go to the recently updated page, get your nekoweb cookie from the devtools and put it on `cookie`! see https://deploy.nekoweb.org/#getting-your-cookie for instructions of how (thanks @thnlqd for helping me implement this!)

and lastly, run `npm run build` or `bun run build` (or anything that can run `vite build`).