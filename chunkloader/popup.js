// popup.js – Manifest V3 • 12 jun 2025
// ------------------------------------------------------------

'use strict';

/***********************
 *  Constantes & état  *
 ***********************/
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
  /\w+\.modern\.js(\?.*)?$/,
  /index--[\w\-]+\.js$/
];

/************************
 *  Helper d’injection   *
 ************************/
/**
 * Exécute `func` dans la page active (isolated world) et renvoie son résultat.
 * Écrit un log avant / après exécution.
 */
async function inject(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[Popup] inject →', func.name || 'anonymous', 'args=', args, 'tab=', tab.id);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world:  'MAIN',
    func,
    args
  });
  console.log('[Popup] inject ←', func.name || 'anonymous', 'result=', result);
  return result;
}

/**********************
 *  Initialisation UI *
 **********************/
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup] DOMContentLoaded');

  // raccourcis DOM
  const $ = (id) => document.getElementById(id);
  const jsUrl          = $('jsUrl');
  const basePath       = $('basePath');
  const fileExtension  = $('fileExtension');
  const bfBasePath     = $('bfBasePath');
  const bfRange        = $('bfRange');
  const bfPrefix       = $('bfPrefix');
  const bfSuffix       = $('bfSuffix');
  const previewLinkLbl = $('previewLink');

   const runAllBtn = document.createElement('button');
  runAllBtn.textContent = 'Run Against All';
  runAllBtn.className = 'btn btn-success mb-3 small-button';
  jsUrl.parentNode.insertBefore(runAllBtn, jsUrl.nextSibling);
  runAllBtn.addEventListener('click', runAgainstAll);

  /* === 1. Restauration depuis storage === */
  chrome.storage.sync.get([
    'jsUrl',
    'basePath',
    'fileExtension',
    'currentMatchIndex',
    'bfBasePath',
    'bfRange',
    'bfPrefix',
    'bfSuffix'
  ], (data) => {
    console.log('[Popup] Storage restored', data);

    if (data.jsUrl) {
      jsUrl.value = data.jsUrl;
      updateBasePath(data.jsUrl);
      updateFileExtension(data.jsUrl);
    }
    if (data.basePath)      basePath.value      = data.basePath;
    if (data.fileExtension) fileExtension.value = data.fileExtension;
    if (typeof data.currentMatchIndex === 'number') currentMatchIndex = data.currentMatchIndex;

    if (data.bfBasePath) bfBasePath.value = data.bfBasePath;
    if (data.bfRange)    bfRange.value    = data.bfRange;
    if (data.bfPrefix)   bfPrefix.value   = data.bfPrefix;
    if (data.bfSuffix)   bfSuffix.value   = data.bfSuffix;

    updatePreview();
  });

  /* === 2. Événements UI === */
  // Saisie URL JS : mise à jour automatique basePath + extension
  jsUrl.addEventListener('input', () => {
    console.log('[Popup] jsUrl input', jsUrl.value);
    updateBasePath(jsUrl.value);
    updateFileExtension(jsUrl.value);
  });

  // Bouton AutoSearch
  $('autoSearch').addEventListener('click', async () => {
    console.log('[Popup] btn autoSearch');
    const foundUrl = await inject(autoSearchAndSetUrl, [
      currentMatchIndex,
      patterns.map((p) => p.source)
    ]);

    if (foundUrl) {
      console.log('[Popup] autoSearch found', foundUrl);
      jsUrl.value = foundUrl;
      updateBasePath(foundUrl);
      updateFileExtension(foundUrl);

      currentMatchIndex = (currentMatchIndex + 1) % patterns.length;
      chrome.storage.sync.set({ currentMatchIndex });
    } else {
      console.warn('[Popup] autoSearch → no match');
      alert('No suitable JS file found.');
    }
  });

  // Bouton LoadChunks
  $('loadChunks').addEventListener('click', async () => {
    const [url, base, ext] = [jsUrl.value, basePath.value, fileExtension.value];
    console.log('[Popup] btn loadChunks', { url, base, ext });
    if (!url || !base) return;

    chrome.storage.sync.set({ jsUrl: url, basePath: base, fileExtension: ext });
    await inject((u, b, e) => {
      console.log('[Page] window.loadAndImportChunks(', u, b, e, ')');
      window.loadAndImportChunks(u, b, e);
    }, [url, base, ext]);
  });

  // Bouton BruteforceChunks
  $('bruteforceChunks').addEventListener('click', async () => {
    const cfg = {
      bp:  bfBasePath.value,
      rng: bfRange.value,
      pre: bfPrefix.value || '',
      suf: bfSuffix.value || ''
    };
    console.log('[Popup] btn bruteforceChunks', cfg);
    if (!(cfg.bp && cfg.rng && cfg.suf)) return;

    chrome.storage.sync.set({ bfBasePath: cfg.bp, bfRange: cfg.rng, bfPrefix: cfg.pre, bfSuffix: cfg.suf });
    const files = generateFilenames(cfg.rng, cfg.pre, cfg.suf);
    console.log('[Popup] bruteforce filenames', files);

    await inject((basePath, filenames) => {
      console.log('[Page] bruteforce inject', basePath, filenames);
      filenames.forEach((f) => {
        const s = document.createElement('script');
        s.src = `${basePath}/${f}`;
        s.defer = true;
        s.onload  = () => console.log('[Page] ✔ Loaded', f);
        s.onerror = () => console.warn('[Page] ✘ Failed', f);
        document.head.appendChild(s);
      });
    }, [cfg.bp, files]);
  });

  // Aperçu Bruteforce en live
  ['bfBasePath', 'bfRange', 'bfPrefix', 'bfSuffix'].forEach((id) =>
    $(id).addEventListener('input', updatePreview)
  );

  // Expand / shrink textarea
  ['jsUrl', 'basePath'].forEach((id) => {
    $(id).addEventListener('focus', expandField);
    $(id).addEventListener('blur',  shrinkField);
  });
});


async function runAgainstAll() {
  console.log('[Popup] runAgainstAll start');
  // Récupère tous les <script src> du document page
  const allUrls = await inject(() => {
    return Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.src);
  });
  console.log('[Popup] Found script URLs:', allUrls);

  // Pour chaque URL, déduit basePath et extension, puis lance loadChunks
  for (const url of allUrls) {
    const base = url.substring(0, url.lastIndexOf('/') + 1);
    let ext = '.js';
    if (/\.chunk\.js(\?.*)?$/.test(url))        ext = '.chunk.js';
    else if (/\.modern\.js(\?.*)?$/.test(url))  ext = '.modern.js';
    else if (/\.js(\?.*)?$/.test(url))           ext = '.js';
    console.log('[Popup] running on', url, base, ext);
    await inject((u, b, e) => window.loadAndImportChunks(u, b, e), [url, base, ext]);
  }
  console.log('[Popup] runAgainstAll complete');
}

/*******************************************************************
 *  Fonctions                                                       *
 *******************************************************************/
function updateBasePath(url) {
  const basePath = url.substring(0, url.lastIndexOf('/') + 1);
  console.log('[Popup] updateBasePath →', basePath);
  document.getElementById('basePath').value = basePath;
}

function updateFileExtension(url) {
  const input = document.getElementById('fileExtension');
  const patMain  = /main\.\w+(\.chunk)?\.js(\?.*)?$/;
  const patApp   = /app-\w+\.js(\?.*)?$/;
  const patChunk = /\.\w+\.chunk\.js(\?.*)?$/;
  const patMod   = /\w+\.modern\.js(\?.*)?$/;

  let ext = '.js';
  if (patMain.test(url) || patChunk.test(url))      ext = '.chunk.js';
  else if (patMod.test(url))                        ext = '.modern.js';
  else if (patApp.test(url))                        ext = '.js';
  input.value = ext;
  console.log('[Popup] updateFileExtension →', ext);
}

function autoSearchAndSetUrl(currentIdx, patternSources) {
  console.log('[Page] autoSearchAndSetUrl start', currentIdx, patternSources);
  const scripts  = [...document.querySelectorAll('script[src]')];
  const patterns = patternSources.map((s) => new RegExp(s));
  const matches  = [];

  for (const p of patterns) {
    for (const s of scripts) if (p.test(s.src)) matches.push(s.src);
  }
  console.log('[Page] autoSearchAndSetUrl matches', matches);
  return matches.length ? matches[currentIdx % matches.length] : null;
}

function expandField()  { this.style.height = '100px'; this.style.whiteSpace = 'normal'; this.style.overflow = 'visible'; }
function shrinkField()  { this.style.height = '';      this.style.whiteSpace = '';       this.style.overflow = '';       }

function generateFilenames(range, pre, suf) {
  const out = [];
  if (/^\d+-\d+$/.test(range)) {
    const [a, b] = range.split('-').map(Number);
    for (let i = a; i <= b; ++i) out.push(`${pre}${i}${suf}`);
  } else if (/^[a-zA-Z]-[a-zA-Z]$/.test(range)) {
    const [a, b] = range.split('-');
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); ++c)
      out.push(`${pre}${String.fromCharCode(c)}${suf}`);
  }
  return out;
}

function updatePreview() {
  const bp   = document.getElementById('bfBasePath').value;
  const rng  = document.getElementById('bfRange').value;
  const pre  = document.getElementById('bfPrefix').value || '';
  const suf  = document.getElementById('bfSuffix').value || '';

  const example = bp && rng && suf ? generateFilenames(rng, pre, suf)[0] : undefined;
  const url     = example ? bp + example : '';
  document.getElementById('previewLink').textContent = url;
  console.log('[Popup] previewLink updated →', url);
}
