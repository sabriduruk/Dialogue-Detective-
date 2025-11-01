(async () => {
  const host = window.location.hostname;
  let adapterPath;

  if (host.includes("primevideo.com") || host.includes("amazon.com")) {
    adapterPath = 'adapters/amazon-adapter.js';
  } else if (host.includes("hbomax.com")) {
    adapterPath = 'adapters/hbomax-adapter.js'; // Artık etkin
  } else {
    console.log("Desteklenmeyen platform:", host);
    return;
  }

  try {
    // Önce "Beyni" (main.js) yükle
    const { initialize } = await import(chrome.runtime.getURL('main.js'));
    
    // Sonra platforma özel "Adaptörü" yükle
    const adapterModule = await import(chrome.runtime.getURL(adapterPath));
    const platformAdapter = adapterModule.default;

    // "Beyni", "Adaptör" ile birlikte çalıştır
    initialize(platformAdapter);
    
  } catch (error) {
    console.error("Diyalog Dedektifi yüklenirken hata oluştu:", error);
  }
})();