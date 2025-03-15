import { Adapter } from '@sveltejs/kit';

/** 
 * The options for the adapter.
 */
export interface AdapterOptions {
	/**
	 * Your Nekoweb API key.
	 * You can get one by going to https://nekoweb.org/api
	 * @description **Warning**: Putting your API key into your code is not recommended.
	 */
	apiKey: string;
	/**
	 * Your Nekoweb serve folder. Defaults to "build".
	 * It must be the same as 'Serve folder' on https://nekoweb.org/settings
	 * We recommend serving your site in a folder instead of on the root path as it can break stuff.
	 */
	folder?: string;
	/**
	 * Your Nekoweb account cookie. This is required if you want your update count to go up
	 * You can get one by following the instructions on https://deploy.nekoweb.org/#getting-your-cookie
	 * @description **Warning**: Putting your account cookie into your code is not recommended.
	 */
	cookie?: string;
	pages?: string;
	assets?: string;
	fallback?: string;
	precompress?: boolean;
	strict?: boolean;
}

/** 
 * Builds the site using `adapter-static`, and
 * deploys it to Nekoweb.
 */
export default function adapter(options?: AdapterOptions): Adapter;