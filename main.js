// --- Global Beyin Değişkenleri ---
let currentCastList = []; 
let subtitleHistory = [];
let isButtonInjected = false;
let currentShowTitle = "";
let characterLookupMap = new Map();

// Standart buton metni
const BUTTON_TEXT = "Detect";

const AMAZON_TAG = "dialdetec-20";

// "Lord", "Adam" gibi unvanları ve genel kelimeleri haritaya eklemeyi engelle
const STOP_WORDS = [
  'lord', 'lady', 'ser', 'king', 'queen', 'sir', 'prince', 'princess',
  'man', 'woman', 'guard', 'police', 'doctor', 'cop', 'boy', 'girl', 
  'father', 'mother', 'mr', 'mrs', 'ms', 'detective', 'captain', 'major',
  'adam', 'kadin', 'kral', 'kraliçe', 'prens', 'prenses', 'doktor', 'bay', 'bayan',
  'baba', 'anne', 'oğul', 'kız',
  'a', 'i', 'o', 've', 'ile', 'ne', 'bu', 'şu', 'o',
  'bir', 'mi', 'de', 'da', 'ama', 'fakat', 'ya', 'veya'
];

/**
 * Oyuncu listesini (currentCastList) işleyerek hızlı bir
 * arama haritası (characterLookupMap) oluşturur.
 */
function buildCharacterMap() {
  console.log("Arama Haritası (Lookup Map) oluşturuluyor...");
  const nicknameRegex = /['"‘“](.*?)['"’”]/g;
  characterLookupMap.clear();

  currentCastList.forEach(castMember => {
    if (!castMember.character) return;
    let keywords = new Set();
    const characterName = castMember.character.toLowerCase();

    // Adın parçalarını ekle
    characterName.split(' ').forEach(part => {
      const cleanPart = part.replace(/[.,?!]/g, '');
      if (cleanPart.length > 2 && !STOP_WORDS.includes(cleanPart)) {
        keywords.add(cleanPart);
      }
    });
    // Takma adları ekle
    const matches = characterName.matchAll(nicknameRegex);
    for (const match of matches) {
      const nickname = match[1];
      if (nickname && nickname.length > 2 && !STOP_WORDS.includes(nickname)) {
        keywords.add(nickname);
      }
    }
    // Tam adın kendisini ekle
    if (characterName.length > 2 && !STOP_WORDS.includes(characterName)) {
        keywords.add(characterName);
    }
    // Anahtar kelimeleri haritaya ekle
    keywords.forEach(key => {
      if (characterLookupMap.has(key)) {
        characterLookupMap.get(key).push(castMember);
      } else {
        characterLookupMap.set(key, [castMember]);
      }
    });
  });
  console.log(`Arama Haritası oluşturuldu. ${characterLookupMap.size} adet benzersiz anahtar kelime bulundu.`);
}

/**
 * X-Ray butonuna tıklandığında tetiklenir. (AKILLI SKORLAMA VE ELEME)
 */
function showXRayPanel() {
  console.log("--- X-Ray Paneli Tetiklendi (Akıllı Skorlama) ---");

  // 1. TOGGLE KONTROLÜ
  const existingPanel = document.getElementById("xray-panel-container");
  if (existingPanel) {
    existingPanel.remove();
    return;
  }

  const videoElement = window.currentAdapter.getVideoElement();
  if (!videoElement) {
    console.error("Panel açılamıyor: Video elementi bulunamadı.");
    return;
  }

  const currentTime = videoElement.currentTime;
  const timeWindowInSeconds = 15;
  const startTime = currentTime - timeWindowInSeconds;

  const recentSubtitles = subtitleHistory.filter(sub => sub.time >= startTime && sub.time <= currentTime);
  
  if (recentSubtitles.length === 0) {
    console.log("Yakın zamanda altyazı bulunamadı.");
    createXRayPanelHTML([], timeWindowInSeconds);
    return;
  }

  // Altyazı kelimelerini topla
  const allWords = new Set();
  recentSubtitles.forEach(sub => {
    sub.text.split(' ').forEach(word => {
      if (word.length > 2 && !STOP_WORDS.includes(word)) {
        allWords.add(word);
      }
    });
  });

  console.log(`Analiz edilen kelimeler:`, allWords);

  // --- AKILLI SKORLAMA ---
  // Her karakterin puanını tutacak harita: { characterObj: score }
  const candidateScores = new Map();

  allWords.forEach(word => {
    if (characterLookupMap.has(word)) {
      const matchedCastMembers = characterLookupMap.get(word);
      
      // Puan Belirleme:
      // Kelime tek bir kişiye mi ait? (Unique = 10 Puan) Yoksa gruba mı? (Shared = 1 Puan)
      // Örn: "jamie" -> 1 kişi (10 puan). "lannister" -> 5 kişi (1 puan).
      const scoreToAdd = matchedCastMembers.length === 1 ? 10 : 1;

      matchedCastMembers.forEach(castMember => {
        const currentScore = candidateScores.get(castMember) || 0;
        candidateScores.set(castMember, currentScore + scoreToAdd);
      });
    }
  });

  // --- ELEME MANTIĞI ---
  let finalCharacters = [];
  
  if (candidateScores.size > 0) {
    // En yüksek puanı bul
    let maxScore = 0;
    candidateScores.forEach((score) => {
      if (score > maxScore) maxScore = score;
    });

    console.log(`En yüksek skor: ${maxScore}`);

    // Kural: Eğer güçlü bir eşleşme (>=10) varsa, zayıf eşleşmeleri (<10) ele.
    // Yoksa (sadece soyadı geçtiyse), hepsini göster.
    const threshold = maxScore >= 10 ? 10 : 1;

    candidateScores.forEach((score, castMember) => {
      if (score >= threshold) {
        finalCharacters.push(castMember);
      }
    });
  }

  console.log(`Bulunan karakterler (${finalCharacters.length} adet):`, finalCharacters);

  createXRayPanelHTML(finalCharacters, timeWindowInSeconds);
}

/**
 * Ekrana X-Ray panelini (HTML ve CSS) çizer. (GLASSMORPHISM UI + DRAG & DROP + CLICK OUTSIDE)
 */
function createXRayPanelHTML(characters, timeWindow) {
  // Eski paneli (varsa) kaldır (gerçi toggle bunu hallediyor ama güvenlik için kalsın)
  const oldPanel = document.getElementById("xray-panel-container");
  if (oldPanel) oldPanel.remove();

  const panelContainer = document.createElement("div");
  panelContainer.id = "xray-panel-container";
  
  // --- GLASSMORPHISM STİLLERİ ---
  panelContainer.style.position = "absolute";
  panelContainer.style.left = "24px";
  panelContainer.style.top = "24px";
  panelContainer.style.width = "320px";
  panelContainer.style.height = "calc(100% - 48px)";
  
  // Arka plan ve Bulanıklık
  panelContainer.style.backgroundColor = "rgba(20, 20, 20, 0.65)";
  panelContainer.style.backdropFilter = "blur(10px)";
  panelContainer.style.webkitBackdropFilter = "blur(10px)";
  
  // Sınırlar ve Gölgeler
  panelContainer.style.border = "1px solid rgba(255, 255, 255, 0.1)";
  panelContainer.style.borderRadius = "16px";
  panelContainer.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.5)";
  
  // Genel Stil
  panelContainer.style.color = "white";
  panelContainer.style.zIndex = "9999999";
  panelContainer.style.overflowY = "auto";
  panelContainer.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  // Başlık stillerine cursor: move ve user-select: none eklendi (sürüklenebilir)
  let innerHTML = `<div style="padding: 20px;"><h2 id="xray-panel-header" style="margin-top: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px; font-size: 18px; font-weight: 600; cursor: move; user-select: none;">In Scene (Last ${timeWindow}s)<button id="xray-close-btn" style="float: right; background: rgba(255, 255, 255, 0.1); color: white; border: none; font-size: 20px; cursor: pointer; padding: 0 8px; border-radius: 6px; transition: background 0.2s;">&times;</button></h2><div id="xray-character-list">`;

  if (characters.length === 0) {
    innerHTML += `<p style="color: #999;">No characters detected in recent dialogue.</p>`;
  } else {
    characters.forEach(cast => {
      const imgSrc = cast.profile_path || 'https://via.placeholder.com/100x150.png?text=No+Image';

      const encodedName = encodeURIComponent(cast.name).replace(/%20/g, '+');
      const encodedCharName = encodeURIComponent(cast.character).replace(/%20/g, '+');
      const encodedShowTitle = encodeURIComponent(currentShowTitle).replace(/%20/g, '+');

      const movieLink = `https://www.amazon.com/s?k=${encodedName}&i=movies-tv&tag=${AMAZON_TAG}`;
      const merchLink = `https://www.amazon.com/s?k=${encodedCharName}+${encodedShowTitle}&tag=${AMAZON_TAG}`;

      innerHTML += `<div style="display: flex; flex-direction: column; margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; transition: background 0.2s;">
          <div style="display: flex; align-items: center;">
            <img src="${imgSrc}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 8px; margin-right: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
            <div>
              <strong style="font-size: 15px; font-weight: 600;">${cast.character}</strong><br>
              <span style="font-size: 13px; color: rgba(255, 255, 255, 0.7);">${cast.name}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <a href="${movieLink}" target="_blank" style="flex: 1; font-size: 11px; color: rgba(255, 255, 255, 0.9); text-decoration: none; background: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 8px; text-align: center; transition: background 0.2s; font-weight: 500;">
              🎬 Movies
            </a>
            <a href="${merchLink}" target="_blank" style="flex: 1; font-size: 11px; color: white; background: linear-gradient(135deg, #ff9500, #ff6b00); text-decoration: none; padding: 8px; border-radius: 8px; text-align: center; font-weight: 600; transition: transform 0.2s; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);">
              🎁 Merch
            </a>
          </div>
        </div>`;
    });
  }
  // TMDB logosu ve feragatname
  innerHTML += `
      <div style="text-align: center; padding: 15px 0 5px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 15px; opacity: 0.6;">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" title="The Movie Database">
          <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="8" fill="#01b4e4"/>
            <text x="50" y="55" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">TMDb</text>
          </svg>
        </a>
        <p style="font-size: 10px; color: rgba(255, 255, 255, 0.5); margin-top: 5px; margin-bottom: 0;">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>`;
  innerHTML += `</div></div>`;
  panelContainer.innerHTML = innerHTML;

  // Paneli eklemek için platforma özel konteyneri kullan
  const injectionPoint = window.currentAdapter.getPanelInjectionPoint();
  injectionPoint.appendChild(panelContainer);
  
  // --- KAPAT BUTONU ---
  const closeBtn = document.getElementById("xray-close-btn");
  closeBtn.onclick = (e) => {
    e.stopPropagation(); // Sürüklemeyi tetiklememesi için
    panelContainer.remove();
    document.removeEventListener("click", handleClickOutside); // Cleanup
  };
  
  // --- SÜRÜKLE-BIRAK (DRAG & DROP) ---
  const header = document.getElementById("xray-panel-header");
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  header.addEventListener("mousedown", (e) => {
    // Kapat butonuna tıklandıysa sürükleme başlatma
    if (e.target.id === "xray-close-btn") return;
    
    isDragging = true;
    offsetX = e.clientX - panelContainer.offsetLeft;
    offsetY = e.clientY - panelContainer.offsetTop;
    panelContainer.style.transition = "none"; // Sürüklerken animasyonu kapat
  });
  
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    
    const newLeft = e.clientX - offsetX;
    const newTop = e.clientY - offsetY;
    
    panelContainer.style.left = `${newLeft}px`;
    panelContainer.style.top = `${newTop}px`;
  });
  
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      panelContainer.style.transition = "box-shadow 0.2s ease"; // Animasyonu geri aç (sadece gölge için)
    }
  });
  
  // --- DIŞARI TIKLAYINCA KAPANMA (CLICK OUTSIDE) ---
  function handleClickOutside(e) {
    const panel = document.getElementById("xray-panel-container");
    const xrayButton = document.getElementById("xray-button");
    
    // Panel yoksa listener'ı temizle
    if (!panel) {
      document.removeEventListener("click", handleClickOutside);
      return;
    }
    
    // Tıklanan yer panel veya içindeki bir element mi?
    const isClickInsidePanel = panel.contains(e.target);
    // Tıklanan yer açma butonu mu?
    const isClickOnButton = xrayButton && xrayButton.contains(e.target);
    
    // Eğer dışarı tıklandıysa paneli kapat
    if (!isClickInsidePanel && !isClickOnButton) {
      panel.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  }
  
  // Click outside listener'ı biraz gecikmeyle ekle (açma tıklamasını yakalamasın)
  setTimeout(() => {
    document.addEventListener("click", handleClickOutside);
  }, 100);
}

/**
 * SPA navigasyonları için UI ve state temizliği yapar.
 * URL değiştiğinde loader.js tarafından çağrılır.
 */
export function cleanupUI() {
  console.log("--- Cleanup: UI ve state temizleniyor ---");
  
  // Paneli kaldır
  const panel = document.getElementById("xray-panel-container");
  if (panel) panel.remove();
  
  // Butonu kaldır
  const btn = document.getElementById("xray-button");
  if (btn) btn.remove();
  
  // Değişkenleri sıfırla
  subtitleHistory = [];
  isButtonInjected = false;
  currentCastList = [];
  currentShowTitle = "";
  characterLookupMap.clear();
  
  // MutationObserver'ı durdur (adaptörler tarafından window'a kaydedilir)
  if (window.currentSubtitleObserver) {
    window.currentSubtitleObserver.disconnect();
    window.currentSubtitleObserver = null;
  }
  
  console.log("--- Cleanup tamamlandı ---");
}

// Ana Başlatıcı Fonksiyon
export async function initialize(adapter) {
  console.log(`Diyalog Dedektifi, ${adapter.platformName} üzerinde başlatılıyor...`);
  // api.js'yi dinamik olarak import et (Düzeltme)
  const { searchContent, getCast } = await import(chrome.runtime.getURL('common/api.js'));
  // Adaptörü global olarak ayarla ki diğer fonksiyonlar erişebilsin
  window.currentAdapter = adapter;

  // Platforma özel adaptörü kullanarak başlığı bul
  const title = adapter.detectShowTitle();
  if (title) currentShowTitle = title;
  if (!title) {
    console.warn("İçerik başlığı bulunamadı. 5 saniye sonra tekrar denenecek...");
    setTimeout(() => initialize(adapter), 5000); // Adaptör ile birlikte tekrar dene
    return;
  }
  
  console.log(`İçerik başlığı bulundu: "${title}"`);
  const content = await searchContent(title);
  if (!content || !content.id) {
    console.error(`Hata: "${title}" TMDB'de bulunamadı.`);
    return;
  }
  
  console.log(`TMDB'de bulundu. ID: ${content.id}, Tipi: ${content.media_type}`);
  const cast = await getCast(content.id, content.media_type);
  if (!cast || cast.length === 0) {
    console.error("Hata: Oyuncu kadrosu alınamadı veya boş.");
    return;
  }
  
  console.log(`Başarılı! ${cast.length} filtrelenmiş karakter hafızaya alındı.`);
  currentCastList = cast;
  
  // "Beyin" fonksiyonlarını çalıştır
  buildCharacterMap(); 
  
  // "Adaptör" fonksiyonlarını çalıştır
  adapter.injectXRayButton(showXRayPanel, BUTTON_TEXT); // 'showXRayPanel' fonksiyonunu callback olarak ver
  adapter.startSubtitleObserver(
    (newText, currentTime) => {
      // Bu, adaptörden gelen altyazı verisini 'subtitleHistory'e ekleyen callback'tir
      if (subtitleHistory.length === 0 || subtitleHistory[subtitleHistory.length - 1].text !== newText) {
        subtitleHistory.push({ text: newText, time: currentTime });
        console.log(`Yeni Altyazı [${currentTime.toFixed(2)}s]: ${newText}`);
        if (subtitleHistory.length > 100) subtitleHistory.shift();
      }
    }
  );
}