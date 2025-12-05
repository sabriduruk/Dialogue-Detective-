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
    // Eğer buton zaten varsa, tekrar ekleme ve çık
    if (document.getElementById('xray-button')) return;
    
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
    
    // Native HBO Max buton tasarımı
    xrayButton.style.background = "transparent";
    xrayButton.style.border = "none";
    xrayButton.style.color = "#ecebea";
    xrayButton.style.fontSize = "11px";
    xrayButton.style.fontWeight = "700";
    xrayButton.style.letterSpacing = "1.5px";
    xrayButton.style.textTransform = "uppercase";
    xrayButton.style.padding = "0 15px";
    xrayButton.style.height = "100%";
    xrayButton.style.display = "flex";
    xrayButton.style.alignItems = "center";
    xrayButton.style.justifyContent = "center";
    xrayButton.style.cursor = "pointer";
    xrayButton.style.transition = "color 0.2s ease";
    
    // Native HBO Max hover efekti
    xrayButton.addEventListener("mouseover", () => {
      xrayButton.style.color = "white";
      xrayButton.style.textShadow = "0 0 10px rgba(255, 255, 255, 0.5)";
    });
    
    xrayButton.addEventListener("mouseout", () => {
      xrayButton.style.color = "#ecebea";
      xrayButton.style.textShadow = "none";
    });
    
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
    
    // SPA cleanup için observer'ı global olarak sakla
    window.currentSubtitleObserver = observer;
  }
};

export default HBOAdapter;

