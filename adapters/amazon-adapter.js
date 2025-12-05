// adapters/amazon-adapter.js (YENİ VE TAMAMLANMIŞ HALİ)

const AmazonAdapter = {
  platformName: "Amazon Prime Video",

  /**
   * Amazon oynatıcısındaki dizi/film başlığını bulur.
   */
  detectShowTitle: () => {
    // BU SEÇİCİNİN ÇALIŞTIĞINI DOĞRULADIK (Mr. Robot)
    const titleSelector = 'h1[class*="atvwebplayersdk-title-text"]';
    let titleElement = document.querySelector(titleSelector);
    
    if (titleElement && titleElement.textContent) {
      console.log(`Amazon: Başlık "${titleSelector}" ile bulundu: ${titleElement.textContent}`);
      return titleElement.textContent;
    }

    console.warn(`Amazon: Başlık seçicisi ("${titleSelector}") bulunamadı. 2s sonra tekrar denenecek...`);
    return null;
  },

  /**
   * Ana <video> elementini döndürür.
   */
  getVideoElement: () => {
    // Bu seçici genellikle Amazon için doğrudur.
    return document.querySelector("video.webplayer-internal-video") || document.querySelector("video");
  },

  /**
   * X-Ray panelinin ekleneceği ana DOM elementini döndürür.
   */
  getPanelInjectionPoint: () => {
    // Paneli, oynatıcının en dıştaki konteynerine ekleyelim
    return document.querySelector("#dv-web-player") || document.body;
  },

  /**
   * Oynatıcı kontrollerine buton ekler.
   * @param {function} onClickCallback - main.js'deki showXRayPanel fonksiyonu
   * @param {string} buttonText - Butonda gösterilecek metin
   */
  injectXRayButton: (onClickCallback, buttonText) => {
    // YENİ SEÇİCİ (Kullanıcının 22.37.15 görüntüsünden alındı - SAĞ ÜST)
    const controlsSelector = 'div[class*="atvwebplayersdk-hideabletopbuttons-container"]';
    const controlBar = document.querySelector(controlsSelector);
    
    if (!controlBar) {
      console.warn(`Amazon: Kontrol çubuğu ("${controlsSelector}") bulunamadı. 2s sonra tekrar denenecek...`);
      setTimeout(() => AmazonAdapter.injectXRayButton(onClickCallback, buttonText), 2000);
      return;
    }
    
    console.log("Amazon: Buton ekleniyor...");
    const xrayButton = document.createElement("button");
    xrayButton.innerText = buttonText;
    
    // Native Amazon buton tasarımı
    xrayButton.style.background = "transparent";
    xrayButton.style.border = "none";
    xrayButton.style.color = "#f2f4f8";
    xrayButton.style.fontSize = "14px";
    xrayButton.style.fontWeight = "600";
    xrayButton.style.padding = "0 20px";
    xrayButton.style.marginRight = "0";
    xrayButton.style.height = "100%";
    xrayButton.style.display = "flex";
    xrayButton.style.alignItems = "center";
    xrayButton.style.cursor = "pointer";
    xrayButton.style.transition = "background 0.2s ease";
    
    // Native Amazon hover efekti
    xrayButton.addEventListener("mouseover", () => {
      xrayButton.style.background = "rgba(255, 255, 255, 0.1)";
    });
    
    xrayButton.addEventListener("mouseout", () => {
      xrayButton.style.background = "transparent";
    });
    
    xrayButton.onclick = onClickCallback; // main.js'den gelen showXRayPanel fonksiyonu
    
    // Butonu sağ üstteki diğer butonların *soluna* (başına) ekle
    controlBar.prepend(xrayButton);
    // isButtonInjected'ı main.js'de yönetiyoruz
  },

  /**
   * Amazon altyazı gözlemcisini başlatır.
   * @param {function} onSubtitleCallback - main.js'ye (altyazı, zaman) gönderen fonksiyon
   */
  startSubtitleObserver: (onSubtitleCallback) => {
    const videoElement = AmazonAdapter.getVideoElement();
    if (!videoElement) {
      console.warn("Amazon: Video elementi bulunamadı. 2s sonra tekrar denenecek...");
      setTimeout(() => AmazonAdapter.startSubtitleObserver(onSubtitleCallback), 2000);
      return;
    }

    // YENİ SEÇİCİ (Kullanıcının 22.36.31 görüntüsünden alındı - ALTYAZI KONTEYNERİ)
    const subtitleSelector = 'div[class*="atvwebplayersdk-captions-overlay"]';
    const subtitleContainer = document.querySelector(subtitleSelector);
    
    if (!subtitleContainer) {
      console.warn(`Amazon: Altyazı Konteyneri ("${subtitleSelector}") bulunamadı. Lütfen altyazıları açın. 2s sonra tekrar denenecek...`);
      setTimeout(() => AmazonAdapter.startSubtitleObserver(onSubtitleCallback), 2000);
      return;
    }

    console.log("Amazon: Altyazı gözlemcisi başlatıldı. İzlenen Konteyner:", subtitleContainer);
    const config = { childList: true, subtree: true };

    const callback = (mutationsList, observer) => {
      // YENİ SEÇİCİ (Kullanıcının 22.36.31 görüntüsünden alındı - ALTYAZI METNİ)
      const textNodes = subtitleContainer.querySelectorAll('span[class*="atvwebplayersdk-captions-text"]');
      if (textNodes.length === 0) return;
        
      let newText = Array.from(textNodes).map(span => span.textContent).join(' ');
      
      // Temizleme mantığımız
      newText = newText.toLowerCase()
                        .replace(/[''.,?!]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

      if (newText) {
        // "Beyne" temiz metni ve zamanı gönder
        onSubtitleCallback(newText, videoElement.currentTime);
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(subtitleContainer, config);
    
    // SPA cleanup için observer'ı global olarak sakla
    window.currentSubtitleObserver = observer;
  }
};

export default AmazonAdapter;
