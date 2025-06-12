(function () {
    'use strict';

    const jsQueue = new Set();
    /* ---------- helper minimal ---------- */
    function loadScript(remoteUrl) {
        if (remoteUrl.endsWith('.js')) jsQueue.add(remoteUrl); // on ne fait que collecter
    }

    function findChunkUrl(base, c) {
        const b = base.split('/'), k = b.lastIndexOf('static');
        return k !== -1 ? [...b.slice(0, k + 1), ...c.split('/').slice(1)].join('/') : `${base}/${c}`;
    }


    /* ---------- Next.js manifest OBJECT parser ---------- */

    function searchAndLoadWebpackChunks(scriptContent, basePath, fileExtension) {
        const chunkNameMapRegex = /{\s*(\d+:\s*"[^"]+",?\s*)+}/g;
        const matches = scriptContent.match(chunkNameMapRegex);

        if (matches && matches.length >= 2) {
            const chunkNameMap1 = parseChunkMap(matches[0]);
            const chunkNameMap2 = parseChunkMap(matches[1]);

            const allKeys = new Set([...Object.keys(chunkNameMap1), ...Object.keys(chunkNameMap2)]);
            allKeys.forEach(key => {
                const namePart1 = chunkNameMap1[key] || key;
                const namePart2 = chunkNameMap2[key] || key;
                const chunkName = `${namePart1}-${namePart2}${fileExtension}`;
                const chunkUrl = `${basePath}${chunkName}`;
                loadScript(chunkUrl);
            });
        } else {
            console.error('No chunk name mappings found in the Webpack runtime.');
        }
    }

    /* ---------- Chunk-map parser ---------- */
    const parseChunkMap = (str) => str.replace(/[{}]/g, '').trim().split(/\s*,\s*/)
        .reduce((o, p) => { const [k, v] = p.split(/\s*:\s*/); o[k] = v.replace(/"/g, ''); return o; }, {});

    /* ---------- other handlers ---------- */
    const stdRe = /{\s*(\d+:\s*"\w+",?\s*)+}/g;
    const runRe = /{\s*(\d+:\s*"[^"]+",?\s*)+}/g;

    const handleStandard = (code, base, ext) =>
        (code.match(stdRe) || []).forEach(m => {
            const obj = JSON.parse(m.replace(/(\d+):/g, '"$1":'));
            Object.entries(obj).forEach(([k, v]) => loadScript(`${base}${k}.${v}${ext}`));
        });

    function handleNextJsManifestObject(manifestObjectString, url) {
        const buildManifest = eval(`(${manifestObjectString})`);
        const allChunks = [];
        for (const key in buildManifest) {
            if (Array.isArray(buildManifest[key])) {
                console.log(`Adding ${buildManifest[key].length} chunks from ${key}`);
                allChunks.push(...buildManifest[key]);
            }
        }
        allChunks.forEach(chunk => {
            const chunkUrl = findChunkUrl(url, chunk);
            loadScript(chunkUrl);
        });
    }
    function handleNextJsManifestFunction(manifestFunctionCall, url) {
        const buildManifest = eval(`(function() { return ${manifestFunctionCall}; })()`);
        const allChunks = [];
        for (const key in buildManifest) {
            if (Array.isArray(buildManifest[key])) {
                console.log(`Adding ${buildManifest[key].length} chunks from ${key}`);
                allChunks.push(...buildManifest[key]);
            }
        }
        allChunks.forEach(chunk => {
            const chunkUrl = findChunkUrl(url, chunk);
            loadScript(chunkUrl);
        });
    }

    const handleModern = (mapStr, base) => Object.values(parseChunkMap(mapStr))
        .forEach(n => loadScript(`${base}${n}.modern.js`));

    /**
     * Scanne le code pour :
     *  - import('path/to/file.js')
     *  - import … from 'path/to/file.js'
     * Résout les chemins relatifs par rapport à `base` et appelle loadScript(url) pour chaque fichier.
     */
    function handleRelativeImports(code, base) {
        // 1) Assure que base se termine par '/'
        const baseDir = base.endsWith('/')
            ? base
            : base.replace(/\/[^/]*$/, '/');

        // 2) Deux regex : dynamique et statique
        const regexes = [
            // import('foo.js')
            /import\(\s*['"`]([^'"`\s]+\.js)['"`]\s*\)/g,
            // import x, y, z from 'foo.js'  OR  import {x} from "foo.js"
            /import\s*(?:[\s\S]+?)\s*from\s*['"`]([^'"`\s]+\.js)['"`]/g
        ];

        // 3) Pour chaque pattern, on itère sur toutes les occurrences
        regexes.forEach(re => {
            let match;
            while ((match = re.exec(code)) !== null) {
                console.log('[Loader] found import', match[0]);
                const specifier = match[1];
                // Si URL absolue, on l'utilise telle quelle
                const fullUrl = new URL(specifier, baseDir).href;
                loadScript(fullUrl);
            }
        });
    }

    /* ---------- main ---------- */
    function loadAndImportChunks(url, basePath, fileExtension) {
        console.log('[Loader] fetch', url);
        fetch(url, { cache: 'no-cache' })
            .then(r => { if (!r.ok) throw Error(r.status); return r.text(); })
            .then(scriptContent => {
                const nextJsManifestFunctionRegex = /self\.__BUILD_MANIFEST\s*=\s*(function\s*\([^\)]*\)?\s*\{[\s\S]*?\}\s*\([^)]*\));?/;
                const nextJsManifestObjectRegex = /self\.__BUILD_MANIFEST\s*=\s*({[\s\S]*})/;
                const modernChunkRegex = /return\s+o\.p\s*\+\s*""\s*\+\s*\{([\s\S]*?)\}/;

                const miscRegexes = [
                    // import('foo.js')
                    /import\(\s*['"`]([^'"`\s]+\.js)['"`]\s*\)/g,
                    // import x, y, z from 'foo.js'  OR  import {x} from "foo.js"
                    /import\s*(?:[\s\S]+?)\s*from\s*['"`]([^'"`\s]+\.js)['"`]/g
                ];

                const nextJsManifestFunctionMatch = scriptContent.match(nextJsManifestFunctionRegex);
                const nextJsManifestObjectMatch = scriptContent.match(nextJsManifestObjectRegex);
                const modernChunkMatch = scriptContent.match(modernChunkRegex);

                if (nextJsManifestFunctionMatch) {
                    console.log('[Loader] found Next.js manifest function');
                    return handleNextJsManifestFunction(nextJsManifestFunctionMatch[1], url);
                } else if (nextJsManifestObjectMatch) {
                    console.log('[Loader] found Next.js manifest object');
                    return handleNextJsManifestObject(nextJsManifestObjectMatch[1], url);
                } else if (modernChunkMatch) {
                    console.log('[Loader] found modern chunk map');
                    return handleModern(modernChunkMatch[1], basePath);
                } else if (url.includes('webpack-runtime-') || url.includes('runtime-')) {
                    console.log('[Loader] found Webpack runtime');
                    return searchAndLoadWebpackChunks(scriptContent, basePath, fileExtension);
                }
                console.log('Script content:', scriptContent.slice(0, 1000), '…');
                // Find all import() statements and load them
                if (miscRegexes.some(re => re.test(scriptContent))) {
                    console.log('[Loader] found relative imports');
                    handleRelativeImports(scriptContent, basePath, fileExtension);
                }
                console.log('[Loader] no special patterns found, handling as standard script');
                // default
                return handleStandard(scriptContent, basePath, fileExtension);


            })
            .then(() => {
                console.log('[Loader] done –', jsQueue.size, 'JS files');
                if (jsQueue.size) {
                    jsQueue.forEach(remoteUrl => {
                        const script = document.createElement('script');
                        script.src = remoteUrl;
                        script.defer = true;
                        script.onload = () => console.log('[Page] ✔ Loaded', remoteUrl);
                        script.onerror = () => console.warn('[Page] ✘ Failed', remoteUrl);
                        document.head.appendChild(script);
                    });
                    jsQueue.clear();
                }
            })
            .catch(e => console.error('[Loader] Error', e));
    }
    window.loadAndImportChunks = loadAndImportChunks;

})();
