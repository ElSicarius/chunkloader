function loadAndImportChunks(url, basePath, fileExtension) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(scriptContent => {
      // tentative pour cette spécificité
      // c'est dégeulasse, oui....
      // Le fichier _buildManifest.js est un fichier généré par Next.js qui contient les informations sur les chunks à charger
      // On va le chercher et essayer de charger les chunks qu'il contient
      // la méthode régex ici est la seule logie en mon sens
      const nextJsManifestRegex = /self\.__BUILD_MANIFEST\s*=\s*(function\s*\([^\)]*\)?\s*\{[\s\S]*?\}\s*\([^)]*\));?/;
      const nextJsMatch = scriptContent.match(nextJsManifestRegex);
      const modernChunkRegex = /return\s+o\.p\s*\+\s*""\s*\+\s*\{([\s\S]*?)\}/;
      const modernChunkMatch = scriptContent.match(modernChunkRegex);


      if (nextJsMatch) {
        // Extract the function call and execute it to get the manifest
        const manifestFunctionCall = nextJsMatch[1];
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
      } else if (url.includes('webpack-runtime-')) {
        // Handle Webpack runtime, don't mind me :).....
        searchAndLoadWebpackChunks(scriptContent, basePath);
      } else if (modernChunkMatch) {
        // Handle modern JS chunks
        const chunkMapString = modernChunkMatch[1];
        const chunkMap = parseChunkMap(chunkMapString);
        for (const key in chunkMap) {
          if (chunkMap.hasOwnProperty(key)) {
            const chunkName = `${chunkMap[key]}.modern.js`;
            const chunkUrl = `${basePath}${chunkName}`;
            loadScript(chunkUrl);
          }
        }
      } else {
        // Handle standard chunk loading
        const standardChunkRegex = /{\s*(\d+:\s*"[^"]+",?\s*)+}/g;
        const matches = scriptContent.match(standardChunkRegex);

        if (!matches || matches.length === 0) {
          throw new Error("No chunk mappings found in the script content.");
        }

        // Process standard chunks
        matches.forEach(mappingString => {
          const jsonMappingString = mappingString.replace(/(\d+):/g, '"$1":');
          const mappingObject = JSON.parse(jsonMappingString);
          Object.keys(mappingObject).forEach(key => {
            const chunkName = `${basePath}${key}.${mappingObject[key]}${fileExtension}`;
            loadScript(chunkName);
          });
        });
      }
    })
    .then(results => {
      console.log('All chunks have been loaded:', results);
    })
    .catch(error => {
      console.error('Error loading or importing chunks:', error);
    });
}

// Function to load a script dynamically
function loadScript(src) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => {
    console.log(`Loaded ${src}`);
  };
  script.onerror = () => {
    console.error(`Error loading ${src}`);
  };
  document.head.appendChild(script);
}

// Function to fetch and load chunks from Webpack runtime
function searchAndLoadWebpackChunks(scriptContent, basePath) {
  const chunkNameMapRegex = /{\s*(\d+:\s*"[^"]+",?\s*)+}/g;
  const matches = scriptContent.match(chunkNameMapRegex);

  if (matches && matches.length >= 2) {
    const chunkNameMap1 = parseChunkMap(matches[0]);
    const chunkNameMap2 = parseChunkMap(matches[1]);

    const allKeys = new Set([...Object.keys(chunkNameMap1), ...Object.keys(chunkNameMap2)]);
    allKeys.forEach(key => {
      const namePart1 = chunkNameMap1[key] || key;
      const namePart2 = chunkNameMap2[key] || key;
      const chunkName = `${namePart1}-${namePart2}.js`;
      const chunkUrl = `${basePath}${chunkName}`;
      loadScript(chunkUrl);
    });
  } else {
    console.error('No chunk name mappings found in the Webpack runtime.');
  }
}


// Function to find the correct URL for the chunk
function findChunkUrl(baseUrl, chunkName) {
  const baseSegments = baseUrl.split('/');
  const chunkSegments = chunkName.split('/');
  const staticIndex = baseSegments.lastIndexOf('static');

  if (staticIndex !== -1) {
    const mergedPath = [
      ...baseSegments.slice(0, staticIndex + 1),
      ...chunkSegments.slice(1)
    ];
    return mergedPath.join('/');
  }

  return `${baseUrl}/${chunkName}`;
}

// Function to parse chunk map
function parseChunkMap(chunkMapString) {
  const trimmed = chunkMapString.replace(/[{}]/g, '').trim();
  return trimmed.split(/\s*,\s*/).reduce((acc, pair) => {
    const [key, value] = pair.split(/\s*:\s*/);
    acc[key] = value.replace(/"/g, '');
    return acc;
  }, {});
}

// Expose the function to the global scope
window.loadAndImportChunks = loadAndImportChunks;

const injectedJS = `
  (${loadAndImportChunks.toString()})();
`;

(function() {
  switch(document.contentType) {
    case 'application/xml':
      return;
  }
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.textContent = injectedJS;
  document.documentElement.appendChild(script);
})();
