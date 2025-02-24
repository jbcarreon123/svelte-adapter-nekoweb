import { Adapter } from '@sveltejs/kit';

export interface AdapterOptions {
	/**
	 * Your Nekoweb API key.
	 * You can get one by going to https://nekoweb.org/api
	 */
	apiKey: string;
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