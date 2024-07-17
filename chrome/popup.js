document.addEventListener('DOMContentLoaded', () => {
  // Load the stored URL, base path, and file extension when the popup is opened
  chrome.storage.sync.get(['jsUrl', 'basePath', 'fileExtension'], (data) => {
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
  });

  document.getElementById('jsUrl').addEventListener('input', () => {
    const jsUrl = document.getElementById('jsUrl').value;
    updateBasePath(jsUrl);
    updateFileExtension(jsUrl);
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
});

function updateBasePath(url) {
  const basePath = url.substring(0, url.lastIndexOf('/') + 1);
  document.getElementById('basePath').value = basePath;
}

function updateFileExtension(url) {
  const extensionInput = document.getElementById('fileExtension');
  const mainJsPattern = /main\.\w+\.js$/;
  if (mainJsPattern.test(url)) {
    extensionInput.value = '.chunk.js';
  } else {
    extensionInput.value = '.js';
  }
}
