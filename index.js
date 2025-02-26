import staticAdapter from '@sveltejs/adapter-static';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import archiver from 'archiver';
import fetch from 'node-fetch';
//import FormData from 'form-data';

let version = '2.0.0'
let nekowebApiUrl = 'https://nekoweb.org/api'
let log;

/**
 * @param {String} endpoint 
 * @param {RequestInit} options 
 */
async function genericRequest(endpoint, options) {
    const response = await fetch(nekowebApiUrl + endpoint, options);
    return response;
}

/**
 * @param {String} apiKey
 * @param {String?} cookie
*/
function getToken(apiKey, cookie) {
    if (cookie) {
        return {
            Origin: "https://nekoweb.org",
            Host: "nekoweb.org",
            'User-Agent': `svelte-adapter-nekoweb/${version} (https://github.com/jbcarreon123/svelte-adapter-nekoweb)`,
            Referer: `https://nekoweb.org/?${encodeURIComponent(
                `svelte-adapter-nekoweb@${version} deployment library (pls no bans)`
            )}`,
            Cookie: `token=${cookie}`
        }
    } else {
        return {
            'User-Agent': `svelte-adapter-nekoweb/${version} (https://github.com/jbcarreon123/svelte-adapter-nekoweb)`,
            Authorization: apiKey
        }
    }
}

async function getCSRFToken(token) {
    const ures = await genericRequest("/site/info", {
        method: "GET",
        headers: token,
    });

    const username = await ures.json();

    const response = await genericRequest("/csrf", {
        method: "GET",
        headers: {
            'Origin': "https://nekoweb.org",
            'Host': "nekoweb.org",
            "Content-Type": "multipart/form-data",
            ...token,
        },
    })
    
    if (!response.ok) {
        log.error(`Failed to get CSRF token: ${response.status} ${response.statusText} (${await response.text()})`);
    }

    const res = await response.text();

    return [res, username['username']];
};

async function getFileLimits(token) {
    const response = await genericRequest('/files/limits', {
        method: 'GET',
        headers: token
    })

    return await response.json()
}

async function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 8 } });
    const output = fs.createWriteStream(out);
    archive.pipe(output);
    archive.directory(source, false);
    return archive.finalize();
};

async function initFileUpload(token) {
    const response = await genericRequest('/files/big/create', {
        method: 'GET',
        headers: token
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create upload session: ${response.status} ${response.statusText} - ${errorText}`);
    } return response.json();
}

/**
 * @param {Number} fileSize  
 */
async function calculateChunks(fileSize) {
    const maxChunkSize = 100 * 1024 * 1024;
    const minChunkSize = 10 * 1024 * 1024;
    const minChunks = 3;

    let numberOfChunks = Math.ceil(fileSize / maxChunkSize);
    let chunkSize = Math.ceil(fileSize / numberOfChunks);

    if (chunkSize < minChunkSize) {
        chunkSize = minChunkSize;
        numberOfChunks = Math.ceil(fileSize / chunkSize);
    }

    if (numberOfChunks < minChunks) {
        numberOfChunks = minChunks;
        chunkSize = Math.ceil(fileSize / numberOfChunks);
    }

    return { chunkSize, numberOfChunks };
};

async function uploadFile(token, filePath, bigId) {
    const formData = new FormData();
    formData.append('id', bigId); const fileBuffer = await fsp.readFile(filePath);
    const fileBlob = new Blob([fileBuffer]);
    formData.append('file', fileBlob, 'build.zip');
    const response = await fetch('https://nekoweb.org/api/files/big/append', {
        method: 'POST',
        headers: {
            // @ts-ignore
            ...token
        },
        body: formData
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload: ${response.status} ${response.statusText} - ${errorText}`);
    } return response.text();

    // const fileBuffer = await fsp.readFile(filePath); TODO: Chunked Uploading
    // const {chunkSize, numberOfChunks} = await calculateChunks(fileBuffer.length);
    // console.log(`${fileBuffer.length}, ${chunkSize}`)

    // let uploadedBytes = 0;
    // for (let c = 0; c < numberOfChunks; c++) {
    //     const start = c * chunkSize;
    //     const end = Math.min(start + chunkSize, fileBuffer.length);
    //     const chunk = fileBuffer.subarray(start, end);

    //     const formData = new FormData();
    //     formData.append('id', bigId);
    //     const fileBlob = new Blob([chunk]);
    //     formData.append('file', fileBlob, `build.zip_c${c}.part`);

    //     let response = await genericRequest("/files/big/append", {
    //         method: "POST",
    //         headers: {
    //             ...token,
    //         },
    //         data: formData,
    //     });
    //     if (!response.ok) {
    //         throw new Error(`Failed to upload chunk ${c}: ${response.status} ${response.statusText} (${await response.text()}, ${bigId})`);
    //     } else {
    //         log(`Uploaded chunk ${c}`);
    //     }

    //     uploadedBytes += chunk.length;
    // }

    // return uploadedBytes;
}

async function finalizeUpload(apiToken, token, bigId) {
    const response = await genericRequest(`/files/import/${bigId}`, {
        method: 'POST',
        headers: {
            ...apiToken
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to import: ${response.status} ${response.statusText} (${await response.text()})`);
    } else if (!token['Cookie']) {
        return response.text();
    }

    const [csrfToken, username] = await getCSRFToken(token);
    console.log(`${csrfToken}, ${username}`);

    const formData = new FormData()
    formData.append('pathname', `.svelte-adapter-nekoweb.html`)
    formData.append('content', `<!-- deployed to Nekoweb using svelte-adapter-nekoweb on ${Date.now()} -->`)
    formData.append('csrf', csrfToken)
    formData.append('site', username)

    const resp = await genericRequest("/files/edit", {
        method: "POST",
        body: formData,
        headers: {
            ...token,
        },
    });
    if (!resp.ok) {
        log.error(`Failed to send cookie request: ${resp.status} ${resp.statusText} (${await resp.text()})`);
    }
    log('Sent cookie request')
}

/** @param {import('./index.js').default} options */
export default function (options) {
    const adapter = staticAdapter(options);
    return {
        name: 'adapter-nekoweb',
        /** @param {import('@sveltejs/kit').Builder} builder */
        adapt: async (builder) => {
            log = builder.log;
            const {
                apiKey,
                cookie,
                pages = 'build',
                assets = pages,
                folder = pages,
                fallback,
                precompress
            } = options ?? /** @type {import('./index.js').default} */ ({});
            if (!apiKey | apiKey == "") {
                builder.log.error(`Missing API key. You need to define it so you can deploy your site.`);
                throw new Error('Missing API key')
            } else if (!folder | folder == "") {
                builder.log.error(`Missing serve folder.`)
                throw new Error('Missing serve directory')
            }
            builder.rimraf(assets);
            builder.rimraf(pages);
            if (pages != assets) {
                builder.log.error(`Mismatched build dirs (assets: ${assets}, pages: ${pages}). Please fix this as Nekoweb does not support this.`);
                throw new Error('Mismatched build directories')
            }
            await adapter.adapt(builder);

            const token = getToken(apiKey, cookie);
            const apiToken = getToken(apiKey, null);

            const outDir = assets ?? "build";
            const tmpBuildDir = ".build-temp";
            const zipFileName = `${folder}.zip`;
            fs.cpSync(outDir, tmpBuildDir + `/${folder}`, {
                recursive: true
            });
            await zipDirectory(tmpBuildDir, zipFileName);
            builder.log(`Compressed "${outDir}"`)

            const bigId = await initFileUpload(apiToken);
            builder.log(`Created BigFile upload session (ID: ${bigId.id})`)

            await uploadFile(apiToken, zipFileName, bigId.id)
            builder.log(`Uploaded "${outDir}"`)

            try {
                await genericRequest("/files/delete", {
                    method: "POST",
                    headers: {
                        ...token,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `pathname=${folder}`,
                });
            } catch (e) { }

            await finalizeUpload(apiToken, token, bigId.id)
            builder.log(`Successfully deployed "${outDir}"`)
            await fsp.unlink(zipFileName);
            builder.rimraf(tmpBuildDir);
        }
    };
};