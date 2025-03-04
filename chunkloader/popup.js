document.addEventListener('DOMContentLoaded', () => {
  // Load the stored data when the popup is opened
  chrome.storage.sync.get(['jsUrl', 'basePath', 'fileExtension', 'currentMatchIndex', 'bfBasePath', 'bfRange', 'bfPrefix', 'bfSuffix'], (data) => {
    if (data.jsUrl) {
      document.getElementById('jsUrl').value = data.jsUrl;
      updateBasePath(data.jsUrl);
      updateFileExtension(data.jsUrl);
    }
    if (data.basePath) {
      document.getElementById('basePath').value = data.basePath;
    }
    if (data.fileExtension) {
      document.getElementById('fileExtension').value = data.fileExtension;
    }
    if (typeof data.currentMatchIndex === 'number') {
      currentMatchIndex = data.currentMatchIndex;
    }
    if (data.bfBasePath) {
      document.getElementById('bfBasePath').value = data.bfBasePath;
    }
    if (data.bfRange) {
      document.getElementById('bfRange').value = data.bfRange;
    }
    if (data.bfPrefix) {
      document.getElementById('bfPrefix').value = data.bfPrefix;
    }
    if (data.bfSuffix) {
      document.getElementById('bfSuffix').value = data.bfSuffix;
    }
  });


  document.getElementById('jsUrl').addEventListener('input', () => {
    const jsUrl = document.getElementById('jsUrl').value;
    updateBasePath(jsUrl);
    updateFileExtension(jsUrl);
  });

  document.getElementById('autoSearch').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.executeScript(tabs[0].id, {
        code: `(${autoSearchAndSetUrl.toString()})(${currentMatchIndex}, ${JSON.stringify(patterns.map(pattern => pattern.source))});`
      }, (results) => {
        if (results && results[0]) {
          const foundUrl = results[0];
          document.getElementById('jsUrl').value = foundUrl;
          updateBasePath(foundUrl);
          updateFileExtension(foundUrl);

          // Increment and save the current match index to chrome.storage.sync
          currentMatchIndex = (currentMatchIndex + 1) % patterns.length;
          chrome.storage.sync.set({ currentMatchIndex });
        } else {
          alert('No suitable JS file found.');
        }
      });
    });
  });

  document.getElementById('loadChunks').addEventListener('click', () => {
    const jsUrl = document.getElementById('jsUrl').value;
    const basePath = document.getElementById('basePath').value;
    const fileExtension = document.getElementById('fileExtension').value;

    if (jsUrl && basePath) {
      // Save the URL, base path, and file extension to chrome.storage.sync
      chrome.storage.sync.set({ jsUrl, basePath, fileExtension });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.executeScript(tabs[0].id, {
          code: `window.loadAndImportChunks('${jsUrl}', '${basePath}', '${fileExtension}');`
        });
      });
    }
  });

  document.getElementById('bruteforceChunks').addEventListener('click', () => {
    const bfBasePath = document.getElementById('bfBasePath').value;
    const bfRange = document.getElementById('bfRange').value;
    const bfPrefix = document.getElementById('bfPrefix').value || '';
    const bfSuffix = document.getElementById('bfSuffix').value || '';

    if (bfBasePath && bfRange && bfSuffix) {
      // Save the data to chrome.storage.sync
      chrome.storage.sync.set({ bfBasePath, bfRange, bfPrefix, bfSuffix });

      // Generate the filenames based on the range, prefix, and suffix
      const filenames = generateFilenames(bfRange, bfPrefix, bfSuffix);

      // Inject the scripts to load the generated files
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.executeScript(tabs[0].id, {
          code: `
            (${function loadAndImportBruteforceChunks(basePath, filenames) {
              function loadScript(src) {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => console.log('Loaded', src);
                script.onerror = () => console.error('Error loading', src);
                document.head.appendChild(script);
              }
              filenames.forEach(filename => loadScript(basePath + '/' + filename));
            }})(${JSON.stringify(bfBasePath)}, ${JSON.stringify(filenames)});
          `
        });
      });
    }
  });
  // Update preview when any of these inputs change
  document.getElementById('bfBasePath').addEventListener('input', updatePreview);
  document.getElementById('bfRange').addEventListener('input', updatePreview);
  document.getElementById('bfPrefix').addEventListener('input', updatePreview);
  document.getElementById('bfSuffix').addEventListener('input', updatePreview);
  // Add event listeners for expanding and shrinking the textareas
  document.getElementById('jsUrl').addEventListener('focus', expandField);
  document.getElementById('jsUrl').addEventListener('blur', shrinkField);
  document.getElementById('basePath').addEventListener('focus', expandField);
  document.getElementById('basePath').addEventListener('blur', shrinkField);

  // document.getElementById('bruteforce').addEventListener('click', updatePreview);

  
});

// Function to load scripts by URL
function loadScript(src) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => console.log(`Loaded ${src}`);
  script.onerror = () => console.error(`Error loading ${src}`);
  document.head.appendChild(script);
}

let currentMatchIndex = 0;
const patterns = [
  /_buildManifest\.js(\?.*)?$/,
  /main(-[\w]{2}[\d]{4})?\.\w+(\.chunk)?\.js(\?.*)?$/,
  /main-\w+(\.chunk)?\.js(\?.*)?$/,
  /runtime(-[\w]{2}[\d]{4})?\.\w+(\.chunk)?\.js(\?.*)?$/,
  /runtime-\w+(\.chunk)?\.js(\?.*)?$/,
  /webpack-runtime-\w+\.js(\?.*)?$/,
  /app-\w+\.js(\?.*)?$/,
  /app\.\w+(\.chunk)?\.js(\?.*)?$/,
  /\w+\.modern\.js(\?.*)?$/
];

function updateBasePath(url) {
  const basePath = url.substring(0, url.lastIndexOf('/') + 1);
  document.getElementById('basePath').value = basePath;
}

function updateFileExtension(url) {
  const extensionInput = document.getElementById('fileExtension');
  const mainJsPattern = /main\.\w+(\.chunk)?\.js(\?.*)?$/;
  const appJsPattern = /app-\w+\.js(\?.*)?$/;
  const dotChunkFormatPattern = /\.\w+\.chunk\.js(\?.*)?$/;
  const dotModernFormatPattern = /\w+\.modern\.js(\?.*)?$/;

  if (mainJsPattern.test(url) || dotChunkFormatPattern.test(url)) {
    extensionInput.value = '.chunk.js';
  } else if (dotModernFormatPattern.test(url)) {
    extensionInput.value = '.modern.js';
  } else if (appJsPattern.test(url)) {
    extensionInput.value = '.js';
  } else {
    extensionInput.value = '.js';
  }
}

function autoSearchAndSetUrl(currentIndex, patternSources) {
  const scriptTags = Array.from(document.querySelectorAll('script[src]'));
  const patterns = patternSources.map(source => new RegExp(source));

  const matches = [];
  for (const pattern of patterns) {
    for (const script of scriptTags) {
      if (pattern.test(script.src)) {
        matches.push(script.src);
      }
    }
  }

  if (matches.length > 0) {
    return matches[currentIndex % matches.length];
  }

  return null;
}

function expandField() {
  this.style.height = '100px';
  this.style.whiteSpace = 'normal';
  this.style.overflow = 'visible';
}

function shrinkField() {
  this.style.height = '';
  this.style.whiteSpace = '';
  this.style.overflow = '';
}

function generateFilenames(range, prefix, suffix) {
  const filenames = [];
  let delay = 1000;

  if (/^\d+-\d+$/.test(range)) {
    const [start, end] = range.split('-').map(Number);
    for (let i = start; i <= end; i++) {
      filenames.push(`${prefix}${i}${suffix}`);
    }
  } else if (/^[a-zA-Z]-[a-zA-Z]$/.test(range)) {
    const [start, end] = range.split('-');
    const startCode = start.charCodeAt(0);
    const endCode = end.charCodeAt(0);
    for (let i = startCode; i <= endCode; i++) {

        filenames.push(`${prefix}${String.fromCharCode(i)}${suffix}`);
    }
  }

  return filenames;
}

function updatePreview() {
  const bfBasePath = document.getElementById('bfBasePath').value;
  const bfRange = document.getElementById('bfRange').value;
  const bfPrefix = document.getElementById('bfPrefix').value || '';
  const bfSuffix = document.getElementById('bfSuffix').value || '';
  console.log(bfBasePath, bfRange, bfPrefix, bfSuffix);
  let previewLink = '';
  if (bfBasePath && bfRange && bfSuffix) {
    const exampleFile = generateFilenames(bfRange, bfPrefix, bfSuffix)[0] || '';
    previewLink = bfBasePath + exampleFile;
  }

  document.getElementById('previewLink').textContent = previewLink;
}