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
 * X-Ray butonuna tıklandığında tetiklenir. (TOGGLE MANTIĞI EKLENDİ)
 */
function showXRayPanel() {
  console.log("--- X-Ray Paneli Tetiklendi ---");

  // 1. TOGGLE KONTROLÜ: Panel zaten açıksa kapat ve çık.
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

  const allWords = new Set();
  recentSubtitles.forEach(sub => {
    sub.text.split(' ').forEach(word => {
      if (word.length > 2 && !STOP_WORDS.includes(word)) {
        allWords.add(word);
      }
    });
  });

  console.log(`Son ${timeWindowInSeconds}s metnindeki filtrelenmiş kelimeler:`, allWords);

  const foundCharacters = new Map(); 
  allWords.forEach(word => {
    if (characterLookupMap.has(word)) {
      const matchedCastMembers = characterLookupMap.get(word);
      matchedCastMembers.forEach(castMember => {
        foundCharacters.set(castMember.character, castMember);
      });
    }
  });

  const characterList = Array.from(foundCharacters.values());
  console.log(`Bulunan karakterler (${characterList.length} adet):`, characterList);

  createXRayPanelHTML(characterList, timeWindowInSeconds);
}

/**
 * Ekrana X-Ray panelini (HTML ve CSS) çizer. (GLASSMORPHISM UI)
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
  panelContainer.style.transition = "all 0.3s ease";

  let innerHTML = `<div style="padding: 20px;"><h2 style="margin-top: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px; font-size: 18px; font-weight: 600;">In Scene (Last ${timeWindow}s)<button id="xray-close-btn" style="float: right; background: rgba(255, 255, 255, 0.1); color: white; border: none; font-size: 20px; cursor: pointer; padding: 0 8px; border-radius: 6px; transition: background 0.2s;">&times;</button></h2><div id="xray-character-list">`;

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
  
  document.getElementById("xray-close-btn").onclick = () => {
    panelContainer.remove();
  };
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