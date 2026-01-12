// HTML to SCORM Converter - Main JavaScript

// State
let htmlFile = null;
let isLoading = false;
let downloadUrl = null;

// Helpers
const isZipFile = (file) => {
    const name = (file?.name || '').toLowerCase();
    return file?.type === 'application/zip' || name.endsWith('.zip');
};

const stripExtension = (name) => name.replace(/\.[^/.]+$/, "");

const safeSlug = (name) => stripExtension(name)
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'scorm_activity';

const randomId = (prefix = 'id') => {
    // Simple unique-ish ID without external deps
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const looksLikeHtml = (filename) => (filename || '').toLowerCase().endsWith('.html') || (filename || '').toLowerCase().endsWith('.htm');

const isProbablyBinary = (ext) => {
    const e = (ext || '').toLowerCase();
    return [
        'png','jpg','jpeg','gif','webp','svg','ico',
        'mp3','wav','ogg','mp4','webm','mov',
        'woff','woff2','ttf','otf','eot',
        'pdf','zip'
    ].includes(e);
};

const getExt = (path) => {
    const m = (path || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
};

// DOM Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadIcon = document.getElementById('uploadIcon');
const fileIcon = document.getElementById('fileIcon');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const convertButton = document.getElementById('convertButton');
const resetButton = document.getElementById('resetButton');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const downloadView = document.getElementById('downloadView');
const uploadView = document.getElementById('uploadView');
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');
const downloadLink = document.getElementById('downloadLink');

// SCORM Service Functions
const generateManifestXML = (title, htmlFileName, manifestId) => {
    const orgId = 'ORG_1';
    const itemId = 'ITEM_1';
    const resId = 'RES_1';

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>

  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${title}</title>
      <item identifier="${itemId}" identifierref="${resId}" isvisible="true">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="${resId}" type="webcontent" adlcp:scormtype="sco" href="${htmlFileName}">
      <file href="${htmlFileName}"/>
    </resource>
  </resources>

</manifest>`;
};

const injectScormApi = (htmlContent) => {
    const scormScript = `
    <script type="text/javascript">
      (function() {
        var API = null;
        var isInitialized = false;
        var isFinished = false;
        var findAPITries = 0;
        var MAX_TRIES = 12;

        // Set this to true in your content to auto-complete on exit
        // window.__SCORM_AUTO_COMPLETE_ON_EXIT__ = true;
        function autoCompleteOnExitEnabled() {
          return !!window.__SCORM_AUTO_COMPLETE_ON_EXIT__;
        }

        function findAPI(win) {
          while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
            findAPITries++;
            if (findAPITries > 30) {
              return null;
            }
            win = win.parent;
          }
          return win.API;
        }

        function getAPI() {
          if (API != null) return API;

          // 1) direct
          if (window.API) { API = window.API; return API; }

          // 2) walk parents
          if (window.parent && window.parent !== window) {
            API = findAPI(window.parent);
            if (API) return API;
          }

          // 3) top
          try {
            if (window.top && window.top !== window) {
              API = findAPI(window.top);
              if (API) return API;
            }
          } catch (e) {}

          // 4) opener
          if (window.opener) {
            API = findAPI(window.opener);
            if (API) return API;
          }

          return null;
        }

        function initializeOnce() {
          if (isInitialized) return;
          var api = getAPI();
          if (!api) return;

          var result = api.LMSInitialize("");
          if (result === "true") {
            isInitialized = true;
            try {
              var lessonStatus = api.LMSGetValue("cmi.core.lesson_status");
              if (lessonStatus === "not attempted" || lessonStatus === "") {
                api.LMSSetValue("cmi.core.lesson_status", "incomplete");
                api.LMSCommit("");
              }
            } catch (e) {}
          }
        }

        function initializeWithRetry() {
          var tries = 0;
          function tick() {
            tries++;
            initializeOnce();
            if (isInitialized) return;
            if (tries < MAX_TRIES) {
              setTimeout(tick, 150);
            }
          }
          tick();
        }

        function setCompleted() {
          if (!isInitialized || isFinished) return;
          var api = getAPI();
          if (!api) return;
          try {
            api.LMSSetValue("cmi.core.lesson_status", "completed");
            api.LMSCommit("");
            api.LMSFinish("");
            isFinished = true;
          } catch (e) {}
        }

        window.addEventListener('load', function() {
          initializeWithRetry();
        });

        window.addEventListener('beforeunload', function() {
          if (autoCompleteOnExitEnabled()) {
            initializeOnce();
            setCompleted();
          } else {
            // Still attempt to finish cleanly if already completed
            if (isInitialized && isFinished) {
              try {
                var api = getAPI();
                if (api) api.LMSFinish("");
              } catch (e) {}
            }
          }
        });

        // Expose a tiny hook (optional)
        window.__SCORM_FINISH__ = function() {
          initializeOnce();
          setCompleted();
        };
      })();
    </script>
  `;

    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', scormScript + '</body>');
    }
    return htmlContent + scormScript;
};

// UI Functions
const showError = (message) => {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
};

const hideError = () => {
    errorMessage.classList.add('hidden');
    errorText.textContent = '';
};

const updateFileDisplay = (file) => {
    if (file) {
        fileName.textContent = file.name;
        fileSize.textContent = `(${(file.size / 1024).toFixed(2)} KB)`;
        uploadIcon.classList.add('hidden');
        fileIcon.classList.remove('hidden');
        convertButton.disabled = false;
    } else {
        uploadIcon.classList.remove('hidden');
        fileIcon.classList.add('hidden');
        convertButton.disabled = true;
    }
};

const setLoadingState = (loading) => {
    isLoading = loading;
    if (loading) {
        convertButton.innerHTML = '<span class="spinner"></span>Processing...';
        convertButton.disabled = true;
    } else {
        convertButton.innerHTML = 'Convert to SCORM';
        convertButton.disabled = !htmlFile;
    }
};

// File Handling
const handleFileSelect = (file) => {
    const isHtml = file && (file.type === 'text/html' || file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm'));
    const isZip = file && isZipFile(file);

    if (!isHtml && !isZip) {
        showError('Invalid file type. Please upload an HTML file or a ZIP.');
        htmlFile = null;
        updateFileDisplay(null);
        return;
    }

    hideError();
    htmlFile = file;
    updateFileDisplay(file);

    // Clear previous conversion if exists
    if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        downloadUrl = null;
    }
};

// Drag and Drop Handlers
dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('border-dragging');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-dragging');
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-dragging');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// File Input Handler
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// ZIP Processing
const pickEntryHtmlFromZip = (zip) => {
    // Prefer index.html, then the shortest path html, else first html.
    const files = Object.keys(zip.files || {}).filter((p) => !zip.files[p].dir);
    const htmls = files.filter((p) => looksLikeHtml(p));
    if (!htmls.length) return null;

    const preferred = htmls.find((p) => p.toLowerCase().endsWith('index.html'))
        || htmls.find((p) => p.toLowerCase().endsWith('/index.html'));
    if (preferred) return preferred;

    // Shortest path (likely root)
    htmls.sort((a, b) => a.length - b.length);
    return htmls[0];
};

const addAllZipFilesToZip = async (sourceZip, targetZip) => {
    const paths = Object.keys(sourceZip.files || {}).filter((p) => !sourceZip.files[p].dir);

    for (const path of paths) {
        const ext = getExt(path);
        const fileObj = sourceZip.files[path];

        // Read as text for likely-text files, else as uint8array
        if (!isProbablyBinary(ext) && ext !== 'bin') {
            const text = await fileObj.async('string');
            targetZip.file(path, text);
        } else {
            const bin = await fileObj.async('uint8array');
            targetZip.file(path, bin);
        }
    }
};

// Convert Button Handler
convertButton.addEventListener('click', async () => {
    if (!htmlFile) {
        showError('Please select an HTML file or ZIP first.');
        return;
    }

    setLoadingState(true);
    hideError();

    try {
        const zipOut = new JSZip();
        const manifestId = randomId('scorm');

        let entryHtmlPath = 'index.html';
        let courseTitle = stripExtension(htmlFile.name) || 'SCORM Activity';


        if (isZipFile(htmlFile)) {
            const zipIn = await JSZip.loadAsync(await htmlFile.arrayBuffer());
            const picked = pickEntryHtmlFromZip(zipIn);
            if (!picked) {
                showError('ZIP does not contain an HTML entry file. Please include an index.html (or any .html) inside the ZIP.');
                setLoadingState(false);
                return;
            }

            entryHtmlPath = picked;

            // Copy everything to output zip first
            await addAllZipFilesToZip(zipIn, zipOut);

            // Read, inject, and overwrite the entry html
            const originalHtml = await zipIn.files[entryHtmlPath].async('string');
            const injectedHtml = injectScormApi(originalHtml);
            zipOut.file(entryHtmlPath, injectedHtml);

            // Manifest should point to the entry path (keep structure)
            const manifestXML = generateManifestXML(courseTitle, entryHtmlPath, manifestId);
            zipOut.file('imsmanifest.xml', manifestXML);
        } else {
            const originalHtml = await htmlFile.text();
            const injectedHtml = injectScormApi(originalHtml);

            entryHtmlPath = 'index.html';
            courseTitle = stripExtension(htmlFile.name) || 'SCORM Activity';

            const manifestXML = generateManifestXML(courseTitle, entryHtmlPath, manifestId);

            zipOut.file(entryHtmlPath, injectedHtml);
            zipOut.file('imsmanifest.xml', manifestXML);
        }

        const content = await zipOut.generateAsync({ type: 'blob' });
        const safeFilename = safeSlug(htmlFile.name);

        downloadUrl = URL.createObjectURL(content);
        downloadLink.href = downloadUrl;
        downloadLink.download = `${safeFilename}_scorm_1.2.zip`;

        successText.textContent = 'Package created successfully! Ready for download.';
        successMessage.classList.remove('hidden');
        downloadView.classList.remove('hidden');
        uploadView.classList.add('hidden');

    } catch (err) {
        console.error(err);
        showError('An error occurred during conversion. Please check the console.');
    } finally {
        setLoadingState(false);
    }
});

// Reset Button Handler
resetButton.addEventListener('click', () => {
    if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        downloadUrl = null;
    }

    htmlFile = null;
    hideError();
    updateFileDisplay(null);
    successMessage.classList.add('hidden');
    downloadView.classList.add('hidden');
    uploadView.classList.remove('hidden');
    fileInput.value = '';
});
