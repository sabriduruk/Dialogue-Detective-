// adapters/hbomax-adapter.js (YENİ DOSYA)

const HBOAdapter = {
  platformName: "HBO Max",

  /**
   * HBO Max oynatıcısındaki dizi/film başlığını bulur.
   */
  detectShowTitle: () => {
    // Bu seçiciyi daha önce bulmuştuk (span[data-testid="player-ux-asset-title"])
    let titleElement = document.querySelector('span[data-testid="player-ux-asset-title"]');
    if (titleElement) return titleElement.textContent;
    
    // Fallback (eğer ana başlık bulunamazsa)
    titleElement = document.querySelector('div[class*="SeasonEpisodeSubtitleContainer"]');
    if (titleElement) return titleElement.textContent;

    console.warn("HBO Max: Başlık seçicisi bulunamadı.");
    return null; // main.js bunu yakalayıp tekrar deneyecek
  },

  /**
   * Ana <video> elementini döndürür.
   */
  getVideoElement: () => {
    return document.querySelector("video"); // HBO Max'te bu basitti
  },

  /**
   * X-Ray panelinin ekleneceği ana DOM elementini döndürür.
   */
  getPanelInjectionPoint: () => {
    // HBO Max'in ana React konteyneri
    return document.querySelector("#__next") || document.body;
  },

  /**
   * Oynatıcı kontrollerine buton ekler.
   * @param {function} onClickCallback - main.js'deki showXRayPanel fonksiyonu
   * @param {string} buttonText - Butonda gösterilecek metin
   */
  injectXRayButton: (onClickCallback, buttonText) => {
    // Bu seçiciyi daha önce bulmuştuk (div[class*="ControlsFooterBottomRight"])
    const controlsSelector = 'div[class*="ControlsFooterBottomRight"]';
    const controlBar = document.querySelector(controlsSelector);
    
    if (!controlBar) {
      console.warn(`HBO Max: Kontrol çubuğu ("${controlsSelector}") bulunamadı. 2s sonra tekrar denenecek...`);
      setTimeout(() => HBOAdapter.injectXRayButton(onClickCallback, buttonText), 2000);
      return;
    }
    
    console.log("HBO Max: Buton ekleniyor...");
    const xrayButton = document.createElement("button");
    xrayButton.id = "xray-button";
    xrayButton.innerText = buttonText;
    // ... (Stiller - main.js'ye taşınabilir ama şimdilik burada kalsın)
    xrayButton.style.fontSize = "14px";
    xrayButton.style.padding = "0 10px";
    xrayButton.style.margin = "0 10px";
    xrayButton.style.color = "white";
    xrayButton.style.background = "rgba(0, 0, 0, 0.5)";
    xrayButton.style.border = "1px solid white";
    xrayButton.style.cursor = "pointer";
    xrayButton.style.height = "32px"; 
    
    xrayButton.onclick = onClickCallback; // main.js'den gelen "beyin" fonksiyonunu tetikler
    
    controlBar.prepend(xrayButton);
    // isButtonInjected'ı main.js'de yönetmek daha doğru olur, şimdilik bu yeterli.
  },

  /**
   * HBO Max altyazı gözlemcisini başlatır.
   * @param {function} onSubtitleCallback - main.js'ye (altyazı, zaman) gönderen fonksiyon
   */
  startSubtitleObserver: (onSubtitleCallback) => {
    const videoElement = HBOAdapter.getVideoElement();
    if (!videoElement) {
      console.warn("HBO Max: Video elementi bulunamadı. 2s sonra tekrar denenecek...");
      setTimeout(() => HBOAdapter.startSubtitleObserver(onSubtitleCallback), 2000);
      return;
    }

    // Bu seçiciyi daha önce bulmuştuk (div[data-testid="caption_renderer_overlay"])
    const subtitleContainerSelector = 'div[data-testid="caption_renderer_overlay"]'; 
    const subtitleContainer = document.querySelector(subtitleContainerSelector);
    
    if (!subtitleContainer) {
      console.warn(`HBO Max: Altyazı Konteyneri ("${subtitleContainerSelector}") bulunamadı. Lütfen altyazıları açın. 2s sonra tekrar denenecek...`);
      setTimeout(() => HBOAdapter.startSubtitleObserver(onSubtitleCallback), 2000);
      return;
    }

    console.log("HBO Max: Altyazı gözlemcisi başlatıldı.");
    const config = { childList: true, subtree: true };

    const callback = (mutationsList, observer) => {
      // Bu seçiciyi de bulmuştuk (div[data-testid="cueBoxRowTextCue"])
      const textElements = document.querySelectorAll('div[data-testid="cueBoxRowTextCue"]');
      if (textElements.length === 0) return;

      // Temizleme mantığımız (Tuttle'a -> tuttle a)
      const newText = Array.from(textElements)
        .map(el => el.textContent)
        .join(' ')
        .toLowerCase()
        .replace(/[''.,?!]/g, ' ') // Noktalamayı BOŞLUKLA değiştir
        .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa indir
        .trim();

      if (newText) {
        // "Beyne" temiz metni ve zamanı gönder
        onSubtitleCallback(newText, videoElement.currentTime);
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(subtitleContainer, config);
  }
};

export default HBOAdapter;

