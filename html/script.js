// HTML to SCORM Converter - Main JavaScript

// State
let htmlFile = null;
let isLoading = false;
let downloadUrl = null;

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
const generateManifestXML = (title, htmlFileName) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.acme.scorm.package" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>

  <organizations default="B0">
    <organization identifier="B0">
      <title>${title}</title>
      <item identifier="I1" identifierref="R1" isvisible="true">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="R1" type="webcontent" adlcp:scormtype="sco" href="${htmlFileName}">
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
        var findAPITries = 0;
        var isInitialized = false;
        var isFinished = false;

        function findAPI(win) {
          while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
            findAPITries++;
            if (findAPITries > 7) {
              console.error("SCORM Error: Could not find API. Too deeply nested.");
              return null;
            }
            win = win.parent;
          }
          return win.API;
        }

        function getAPI() {
          if (API == null) {
            if ((window.parent) && (window.parent != window)) {
              API = findAPI(window.parent);
            }
            if ((API == null) && (window.opener)) {
              API = findAPI(window.opener);
            }
            if (API == null) {
              console.error("SCORM Error: Unable to find SCORM API.");
            }
          }
          return API;
        }

        function initialize() {
          if (isInitialized) return;
          var api = getAPI();
          if (api) {
            var result = api.LMSInitialize("");
            if (result === "true") {
              isInitialized = true;
              var lessonStatus = api.LMSGetValue("cmi.core.lesson_status");
              if (lessonStatus === "not attempted") {
                api.LMSSetValue("cmi.core.lesson_status", "incomplete");
                api.LMSCommit("");
              }
              console.log("SCORM Initialized.");
            } else {
              console.error("SCORM Error: LMSInitialize failed.");
            }
          }
        }

        function finish() {
          if (!isInitialized || isFinished) return;
          var api = getAPI();
          if (api) {
            api.LMSSetValue("cmi.core.lesson_status", "completed");
            api.LMSCommit("");
            api.LMSFinish("");
            isFinished = true;
            console.log("SCORM Finished and marked as 'completed'.");
          }
        }

        window.addEventListener('load', function() {
          initialize();
        });

        window.addEventListener('beforeunload', function() {
          finish();
        });
      })();
    </script>
  `;

    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', scormScript + '</body>');
    } else {
        return htmlContent + scormScript;
    }
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
    if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
        showError('Invalid file type. Please upload an HTML file.');
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

// Convert Button Handler
convertButton.addEventListener('click', async () => {
    if (!htmlFile) {
        showError('Please select an HTML file first.');
        return;
    }

    setLoadingState(true);
    hideError();

    try {
        const htmlContent = await htmlFile.text();
        const injectedHtml = injectScormApi(htmlContent);

        const packageHtmlFileName = 'index.html';
        const courseTitle = htmlFile.name.replace(/\.[^/.]+$/, "") || "SCORM Activity";

        const manifestXML = generateManifestXML(courseTitle, packageHtmlFileName);

        const zip = new JSZip();
        zip.file(packageHtmlFileName, injectedHtml);
        zip.file('imsmanifest.xml', manifestXML);

        const content = await zip.generateAsync({ type: 'blob' });

        const safeFilename = htmlFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();

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
