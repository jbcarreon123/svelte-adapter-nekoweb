import adapterStatic from '@sveltejs/adapter-static';
import staticAdapter from '@sveltejs/adapter-static';
import { exec } from 'child_process';
import fs from 'fs-extra';
import fsp from 'fs/promises';
import archiver from 'archiver';
import { promisify } from 'util';
import fetch from 'node-fetch';

// @ts-ignore
async function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 8 } });
    const output = fs.createWriteStream(out);
    archive.pipe(output);
    archive.directory(source, false);
    return archive.finalize();
};
async function initFileUpload(apiKey) {
    const response = await fetch('https://nekoweb.org/api/files/big/create', {
        method: 'GET',
        headers: {
            Authorization: apiKey
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create upload session: ${response.status} ${response.statusText} - ${errorText}`);
    } return response.json();
}
async function uploadFileToNekoweb(apiKey, filePath, bigId) {
    const formData = new FormData();
    formData.append('id', bigId); const fileBuffer = await fsp.readFile(filePath);
    const fileBlob = new Blob([fileBuffer]);
    formData.append('file', fileBlob, 'build.zip');
    const response = await fetch('https://nekoweb.org/api/files/big/append', {
        method: 'POST',
        headers: {
            // @ts-ignore
            Authorization: apiKey
        },
        body: formData
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload: ${response.status} ${response.statusText} - ${errorText}`);
    } return response.text();
}
async function importSiteFromNekoweb(apiKey, bigId) {
    const response = await fetch(`https://nekoweb.org/api/files/import/${bigId}`, {
        method: 'POST',
        headers: {
            // @ts-ignore
            Authorization: apiKey
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to import: ${response.status} ${response.statusText}`);
    } return response.text();
}

/** @param {import('./index.js').default} options */
export default function (options) {
    const adapter = staticAdapter(options);
    return {
        name: 'adapter-nekoweb',
        /** @param {import('@sveltejs/kit').Builder} builder */
        adapt: async (builder) => {
            const {
                apiKey,
                pages = 'build',
                assets = pages,
                fallback,
                precompress
            } = options ?? /** @type {import('./index.js').default} */ ({});
            builder.rimraf(assets);
            builder.rimraf(pages);
            if (pages != assets) {
                builder.log.error(`Mismatched build dirs (assets: ${assets}, pages: ${pages}). Please fix this as Nekoweb does not support this.`);
                throw new Error('Mismatched build directories')
            }
            await adapter.adapt(builder);
            const outDir = assets ?? "build";
            const tmpBuildDir = ".build-temp"
            const zipFileName = 'build.zip';
            fs.copySync(outDir, tmpBuildDir + "/build");
            await zipDirectory(tmpBuildDir, zipFileName);
            builder.log(`Compressed "${outDir}"`)
            const bigId = await initFileUpload(apiKey);
            builder.log(`Created BigFile upload session`)
            await uploadFileToNekoweb(apiKey, zipFileName, bigId.id);
            builder.log(`Uploaded "${outDir}"`)
            await importSiteFromNekoweb(apiKey, bigId.id);
            builder.log(`Deployed "${outDir}"`)
            await fsp.unlink(zipFileName);
            builder.rimraf(tmpBuildDir);
        }
    };
};