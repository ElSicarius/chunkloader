chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchDirectory") {
      const tabId = sender.tab.id;
      chrome.debugger.attach({ tabId }, "1.0", () => {
        chrome.debugger.sendCommand({ tabId }, "Page.enable", {}, () => {
          chrome.debugger.sendCommand({ tabId }, "Page.navigate", { url: request.url }, () => {
            chrome.debugger.sendCommand({ tabId }, "Page.addScriptToEvaluateOnNewDocument", {
              source: `
                new Promise(resolve => {
                  const interval = setInterval(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    if (links.length) {
                      clearInterval(interval);
                      resolve(links.map(link => link.href));
                    }
                  }, 100);
                }).then(links => links);
              `
            }, (result) => {
              sendResponse(result);
              chrome.debugger.detach({ tabId });
            });
          });
        });
      });
      return true; // Required to use sendResponse asynchronously
    }
  });
  