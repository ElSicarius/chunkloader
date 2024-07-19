function loadAndImportChunks(url, basePath, fileExtension) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(scriptContent => {
      const nextJsManifestFunctionRegex = /self\.__BUILD_MANIFEST\s*=\s*(function\s*\([^\)]*\)?\s*\{[\s\S]*?\}\s*\([^)]*\));?/;
      const nextJsManifestObjectRegex = /self\.__BUILD_MANIFEST\s*=\s*({[\s\S]*})/;
      const modernChunkRegex = /return\s+o\.p\s*\+\s*""\s*\+\s*\{([\s\S]*?)\}/;

      const nextJsManifestFunctionMatch = scriptContent.match(nextJsManifestFunctionRegex);
      const nextJsManifestObjectMatch = scriptContent.match(nextJsManifestObjectRegex);
      const modernChunkMatch = scriptContent.match(modernChunkRegex);

      if (nextJsManifestFunctionMatch) {
        handleNextJsManifestFunction(nextJsManifestFunctionMatch[1], url);
      } else if (nextJsManifestObjectMatch) {
        handleNextJsManifestObject(nextJsManifestObjectMatch[1], url);
      } else if (modernChunkMatch) {
        handleModernChunks(modernChunkMatch[1], basePath);
      } else if (url.includes('webpack-runtime-') || url.includes('runtime-')) {
        searchAndLoadWebpackChunks(scriptContent, basePath, fileExtension);
      } else {
        handleStandardChunks(scriptContent, basePath, fileExtension);
      }
    })
    .then(results => {
      console.log('All chunks have been loaded:', results);
    })
    .catch(error => {
      console.error('Error loading or importing chunks:', error);
    });
}

// Function to handle Next.js build manifest function
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

// Function to handle Next.js build manifest object
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

// Function to handle modern JS chunks
function handleModernChunks(chunkMapString, basePath) {
  const chunkMap = parseChunkMap(chunkMapString);
  for (const key in chunkMap) {
    if (chunkMap.hasOwnProperty(key)) {
      const chunkName = `${chunkMap[key]}.modern.js`;
      const chunkUrl = `${basePath}${chunkName}`;
      loadScript(chunkUrl);
    }
  }
}

// Function to handle standard chunk loading
function handleStandardChunks(scriptContent, basePath, fileExtension) {
  // Adjusted regex to avoid matching strings with spaces inside the quotes
  const standardChunkRegex = /{\s*(\d+:\s*"\w+",?\s*)+}/g;
  const matches = scriptContent.match(standardChunkRegex);

  if (!matches || matches.length === 0) {
    throw new Error("No chunk mappings found in the script content.");
  }

  // Process standard chunks
  matches.forEach(mappingString => {
    const jsonMappingString = mappingString.replace(/(\d+):/g, '"$1":');
    const mappingObject = JSON.parse(jsonMappingString);
    Object.keys(mappingObject).forEach(key => {
      const chunkName = `${key}.${mappingObject[key]}${fileExtension}`;
      const chunkUrl = `${basePath}${chunkName}`;
      loadScript(chunkUrl);
    });
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

(function () {
  switch (document.contentType) {
    case 'application/xml':
      return;
  }
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.textContent = injectedJS;
  document.documentElement.appendChild(script);
})();
