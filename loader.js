// SPA desteği için URL değişiklik gözlemcisi
let lastUrl = location.href;
let mainModule = null;

/**
 * Eklentiyi başlatan ana fonksiyon.
 * İlk yükleme ve SPA navigasyonlarında çağrılır.
 */
async function startApp() {
  const host = window.location.hostname;
  let adapterPath;

  if (host.includes("primevideo.com") || host.includes("amazon.com")) {
    adapterPath = 'adapters/amazon-adapter.js';
  } else if (host.includes("hbomax.com")) {
    adapterPath = 'adapters/hbomax-adapter.js';
  } else {
    console.log("Desteklenmeyen platform:", host);
    return;
  }

  try {
    // Önce "Beyni" (main.js) yükle (sadece ilk seferde import et)
    if (!mainModule) {
      mainModule = await import(chrome.runtime.getURL('main.js'));
    }
    
    // Sonra platforma özel "Adaptörü" yükle
    const adapterModule = await import(chrome.runtime.getURL(adapterPath));
    const platformAdapter = adapterModule.default;

    // "Beyni", "Adaptör" ile birlikte çalıştır
    mainModule.initialize(platformAdapter);
    
  } catch (error) {
    console.error("Diyalog Dedektifi yüklenirken hata oluştu:", error);
  }
}

/**
 * SPA URL Değişiklik Gözlemcisi
 * Her 1 saniyede bir URL'i kontrol eder.
 * URL değişirse eklentiyi temizler ve yeniden başlatır.
 */
setInterval(() => {
  if (location.href !== lastUrl) {
    console.log(`--- SPA Navigasyonu Tespit Edildi ---`);
    console.log(`Eski URL: ${lastUrl}`);
    console.log(`Yeni URL: ${location.href}`);
    
    lastUrl = location.href;
    
    // Önce mevcut UI ve state'i temizle
    if (mainModule && mainModule.cleanupUI) {
      mainModule.cleanupUI();
    }
    
    // Sonra eklentiyi yeni sayfa için yeniden başlat
    // Biraz bekle ki DOM güncellensin
    setTimeout(() => {
      startApp();
    }, 1500);
  }
}, 1000);

// İlk yükleme
startApp();