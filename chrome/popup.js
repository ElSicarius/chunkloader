document.addEventListener('DOMContentLoaded', () => {
  // Load the stored URL and base path when the popup is opened
  chrome.storage.sync.get(['jsUrl', 'basePath'], (data) => {
    if (data.jsUrl) {
      document.getElementById('jsUrl').value = data.jsUrl;
      updateBasePath(data.jsUrl);
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
  });

  document.getElementById('loadChunks').addEventListener('click', () => {
    const jsUrl = document.getElementById('jsUrl').value;
    const basePath = document.getElementById('basePath').value;
    const fileExtension = document.getElementById('fileExtension').value;

    if (jsUrl && basePath) {
      // Save the URL and base path to chrome.storage.sync
      chrome.storage.sync.set({ jsUrl, basePath });

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
