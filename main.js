// --- Global Beyin Değişkenleri ---
let currentCastList = []; 
let subtitleHistory = [];
let isButtonInjected = false;
let characterLookupMap = new Map();

// Standart buton metni
const BUTTON_TEXT = "DİYALOG";

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
 * X-Ray butonuna tıklandığında tetiklenir.
 */
function showXRayPanel() {
  console.log("--- X-Ray Paneli Açılıyor (v9 - Lookup Map) ---");
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
 * Ekrana X-Ray panelini (HTML ve CSS) çizer.
 */
function createXRayPanelHTML(characters, timeWindow) {
  const oldPanel = document.getElementById("xray-panel-container");
  if (oldPanel) oldPanel.remove();
  const panelContainer = document.createElement("div");
  panelContainer.id = "xray-panel-container";
  // ... (Tüm panel CSS stilleri buraya gelecek - kodun çok uzamaması için 
  //     Cursor'ın bunu content.js'den kopyalaması lazım)
  panelContainer.style.position = "absolute";
  panelContainer.style.left = "20px";
  panelContainer.style.top = "20px";
  panelContainer.style.width = "300px";
  panelContainer.style.height = "calc(100% - 40px)";
  panelContainer.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
  panelContainer.style.color = "white";
  panelContainer.style.border = "1px solid #444";
  panelContainer.style.borderRadius = "8px";
  panelContainer.style.zIndex = "9999999";
  panelContainer.style.overflowY = "auto";
  panelContainer.style.fontFamily = "Arial, sans-serif";

  let innerHTML = `<div style="padding: 20px;"><h2 style="margin-top: 0; border-bottom: 1px solid #555; padding-bottom: 10px;">Sahnede (Son ${timeWindow}s)<button id="xray-close-btn" style="float: right; background: #333; color: white; border: none; font-size: 20px; cursor: pointer; padding: 0 8px;">&times;</button></h2><div id="xray-character-list">`;

  if (characters.length === 0) {
    innerHTML += `<p style="color: #999;">Bu zaman aralığında bilinen bir karakter tespit edilmedi.</p>`;
  } else {
    characters.forEach(cast => {
      const imgSrc = cast.profile_path || '[https://via.placeholder.com/100x150.png?text=No+Image](https://via.placeholder.com/100x150.png?text=No+Image)';
      innerHTML += `<div style="display: flex; align-items: center; margin-bottom: 15px;"><img src="${imgSrc}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px; margin-right: 10px;"><div><strong style="font-size: 16px;">${cast.character}</strong><br><span style="font-size: 14px; color: #ccc;">${cast.name}</span></div></div>`;
    });
  }
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