export const generateManifestXML = (title: string, htmlFileName: string): string => {
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

export const injectScormApi = (htmlContent: string): string => {
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
