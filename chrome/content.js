function loadAndImportChunks(url, basePath, fileExtension) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(scriptContent => {
      const regex = /{\s*(\d+:\s*"[^"]+",?\s*)+}/g;
      const matches = scriptContent.match(regex);
      if (!matches || matches.length === 0) {
        throw new Error("No chunk mappings found in the script content.");
      }

      // Parse the base path from the URL
      matches.forEach(mappingString => {
        const jsonMappingString = mappingString.replace(/(\d+):/g, '"$1":');
        const mappingObject = JSON.parse(jsonMappingString);
        Object.keys(mappingObject).forEach(key => {
          const chunkName = `${basePath}${key}.${mappingObject[key]}${fileExtension}`;
          const script = document.createElement('script');
          script.src = chunkName;
          script.onload = () => {
            console.log(`Loaded ${chunkName}`);
          };
          script.onerror = () => {
            console.error(`Error loading ${chunkName}`);
          };
          document.head.appendChild(script);
        });
      });
    })
    .then(results => {
      console.log('All chunks have been loaded:', results);
    })
    .catch(error => {
      console.error('Error loading or importing chunks:', error);
    });
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
