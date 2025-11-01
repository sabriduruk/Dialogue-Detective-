console.log("🚀 X-Ray Vision Eklentisi HBO Max'e yüklendi! (v9 - Lookup Map)");

// --- Global Değişkenler ---
let currentCastList = []; 
let subtitleHistory = [];
let isButtonInjected = false;
// YENİ: Hızlı arama için "arama haritası"
let characterLookupMap = new Map();

// "Lord", "Adam" gibi unvanları ve genel kelimeleri haritaya eklemeyi engelle
const STOP_WORDS = [
  // İngilizce Unvanlar/Kelimeler
  'lord', 'lady', 'ser', 'king', 'queen', 'sir', 'prince', 'princess',
  'man', 'woman', 'guard', 'police', 'doctor', 'cop', 'boy', 'girl', 
  'father', 'mother', 'mr', 'mrs', 'ms', 'detective', 'captain', 'major',
  
  // GÜNCELLENMİŞ TÜRKÇE UNVANLAR/KELİMELER
  'adam', 'kadin', 'kral', 'kraliçe', 'prens', 'prenses', 'doktor', 'bay', 'bayan',
  'baba', 'anne', 'oğul', 'kız',

  // Bağlaçlar ve Çöp Kelimeler
  'a', 'i', 'o', 've', 'ile', 'ne', 'bu', 'şu', 'o',
  'bir', 'mi', 'de', 'da', 'ama', 'fakat', 'ya', 'veya'
];

// detectShowTitle fonksiyonu
function detectShowTitle() {
  console.log("Başlık aranıyor...");
  const showSelector = 'span[data-testid="player-ux-asset-title"]';
  let titleElement = document.querySelector(showSelector);
  
  if (titleElement && titleElement.textContent) {
    console.log(`Dizinin ana başlığı "${showSelector}" ile bulundu:`, titleElement.textContent);
    return titleElement.textContent;
  }
  
  const episodeSelector = 'div[class*="SeasonEpisodeSubtitleContainer"]';
  titleElement = document.querySelector(episodeSelector);
  
  if (titleElement && titleElement.textContent) {
    console.log(`Bölüm başlığı "${episodeSelector}" ile bulundu:`, titleElement.textContent);
    return titleElement.textContent;
  }

  console.log("Başlık elementleri (dizi veya bölüm) bulunamadı.");
  return null;
}

// injectXRayButton fonksiyonu
function injectXRayButton() {
  if (isButtonInjected) return;
  const controlsSelector = 'div[class*="ControlsFooterBottomRight"]';
  const controlBar = document.querySelector(controlsSelector);
  
  if (!controlBar) {
    console.warn(`X-Ray butonu için kontrol çubuğu ("${controlsSelector}") bulunamadı. 2 saniye sonra tekrar denenecek...`);
    setTimeout(injectXRayButton, 2000);
    return;
  }

  console.log("X-Ray butonu kontrol çubuğuna ekleniyor...");
  const xrayButton = document.createElement("button");
  xrayButton.id = "xray-button";
  xrayButton.innerText = "X-RAY";
  xrayButton.style.fontSize = "14px";
  xrayButton.style.padding = "0 10px";
  xrayButton.style.margin = "0 10px";
  xrayButton.style.color = "white";
  xrayButton.style.background = "rgba(0, 0, 0, 0.5)";
  xrayButton.style.border = "1px solid white";
  xrayButton.style.cursor = "pointer";
  xrayButton.style.height = "32px"; 

  xrayButton.onclick = showXRayPanel; // X-Ray panelini aç
  
  controlBar.prepend(xrayButton);
  isButtonInjected = true;
  console.log("X-Ray butonu başarıyla eklendi.");
}

// --- YENİ FONKSİYON ---
/**
 * Oyuncu listesini (currentCastList) işleyerek hızlı bir
 * arama haritası (characterLookupMap) oluşturur.
 */
function buildCharacterMap() {
  console.log("Arama Haritası (Lookup Map) oluşturuluyor...");
  const nicknameRegex = /['"'"](.*?)['"'"]/g;
  characterLookupMap.clear();

  currentCastList.forEach(castMember => {
    if (!castMember.character) return;

    const characterName = castMember.character.toLowerCase();
    let keywords = new Set();

    // 1. Adın parçalarını ekle (örn: "billy", "lee", "tuttle")
    characterName.split(' ').forEach(part => {
      // Noktalamadan arındır (örn: "hart.")
      const cleanPart = part.replace(/[.,?!]/g, '');
      if (cleanPart.length > 2 && !STOP_WORDS.includes(cleanPart)) {
        keywords.add(cleanPart);
      }
    });

    // 2. Takma adları ekle (örn: "marty")
    const matches = characterName.matchAll(nicknameRegex);
    for (const match of matches) {
      const nickname = match[1];
      if (nickname && nickname.length > 2 && !STOP_WORDS.includes(nickname)) {
        keywords.add(nickname);
      }
    }

    // 3. Tam adın kendisini de ekle (eğer takma ad içeriyorsa, örn: "martin 'marty' hart")
    if (characterName.length > 2 && !STOP_WORDS.includes(characterName)) {
        keywords.add(characterName);
    }

    // Bulunan tüm anahtar kelimeleri haritaya bu karakter objesiyle eşleştir
    keywords.forEach(key => {
      // Haritada bu anahtar kelime zaten varsa, listeye ekle (örn: "Eddie" 2 kişiye ait olabilir)
      if (characterLookupMap.has(key)) {
        characterLookupMap.get(key).push(castMember);
      } else {
        characterLookupMap.set(key, [castMember]);
      }
    });
  });

  console.log(`Arama Haritası oluşturuldu. ${characterLookupMap.size} adet benzersiz anahtar kelime bulundu.`);
}

// --- GÜNCELLENEN FONKSİYONLAR ---

/**
 * Altyazı elementini izleyen MutationObserver'ı başlatır.
 * (Noktalama temizliği güncellendi)
 */
function startSubtitleObserver() {
  const videoElement = document.querySelector("video");
  if (!videoElement) {
    console.warn("Video elementi bulunamadı. Altyazı gözlemcisi 2s sonra tekrar deneyecek...");
    setTimeout(startSubtitleObserver, 2000);
    return;
  }
  
  const subtitleContainerSelector = 'div[data-testid="caption_renderer_overlay"]'; 
  const subtitleContainer = document.querySelector(subtitleContainerSelector);
  
  if (!subtitleContainer) {
    console.warn(`Altyazı Konteyneri ("${subtitleContainerSelector}") bulunamadı. Lütfen altyazıları açtığınızdan emin olun. 2s sonra tekrar denenecek...`);
    setTimeout(startSubtitleObserver, 2000);
    return;
  }

  console.log("Altyazı gözlemcisi (MutationObserver) başlatıldı. İzlenen Konteyner:", subtitleContainer);

  const config = { childList: true, subtree: true };

  const callback = (mutationsList, observer) => {
    const textElements = document.querySelectorAll('div[data-testid="cueBoxRowTextCue"]');
    if (textElements.length === 0) return;

    // YENİ TEMİZLEME: "Tuttle'a" -> "tuttle a"
    const newText = Array.from(textElements)
      .map(el => el.textContent)
      .join(' ')
      .toLowerCase()
      .replace(/[''.,?!]/g, ' ') // Noktalamayı BOŞLUKLA değiştir
      .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa indir
      .trim();
    
    if (newText) {
      const currentTime = videoElement.currentTime;
      if (subtitleHistory.length === 0 || subtitleHistory[subtitleHistory.length - 1].text !== newText) {
        subtitleHistory.push({ text: newText, time: currentTime });
        console.log(`Yeni Altyazı [${currentTime.toFixed(2)}s]: ${newText}`);
        if (subtitleHistory.length > 100) subtitleHistory.shift();
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(subtitleContainer, config);
}

/**
 * X-Ray butonuna tıklandığında tetiklenir.
 * (Lookup Map kullanmak için TAMAMEN YENİDEN YAZILDI)
 */
function showXRayPanel() {
  console.log("--- X-Ray Paneli Açılıyor (v9 - Lookup Map) ---");

  const videoElement = document.querySelector("video");
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

  // Altyazı metinlerini tek bir kelime dizisinde birleştir
  const allWords = new Set();
  recentSubtitles.forEach(sub => {
    sub.text.split(' ').forEach(word => {
      if (word.length > 2 && !STOP_WORDS.includes(word)) { // 'a', 'adam' gibi kelimeleri atla
        allWords.add(word);
      }
    });
  });

  console.log(`Son ${timeWindowInSeconds}s metnindeki filtrelenmiş kelimeler:`, allWords);

  // Benzersiz bulunan karakterleri sakla
  const foundCharacters = new Map(); 

  // Haritada kelimeleri ara
  allWords.forEach(word => {
    if (characterLookupMap.has(word)) {
      // O kelimeyle eşleşen TÜM karakterleri al (örn: "Eddie" 2 kişiyi döndürebilir)
      const matchedCastMembers = characterLookupMap.get(word);
      matchedCastMembers.forEach(castMember => {
        // Karakteri Map'e ekle (aynı karakterin tekrar eklenmesini önler)
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
 * (Bu fonksiyon değişmedi)
 * @param {Array} characters - Gösterilecek karakter objeleri listesi
 * @param {number} timeWindow - Analiz edilen zaman aralığı (örn: 15)
 */
function createXRayPanelHTML(characters, timeWindow) {
  // Eski paneli (varsa) kaldır
  const oldPanel = document.getElementById("xray-panel-container");
  if (oldPanel) {
    oldPanel.remove();
  }

  // Ana panel konteyneri (sol taraf)
  const panelContainer = document.createElement("div");
  panelContainer.id = "xray-panel-container";
  panelContainer.style.position = "absolute";
  panelContainer.style.left = "20px";
  panelContainer.style.top = "20px";
  panelContainer.style.width = "300px";
  panelContainer.style.height = "calc(100% - 40px)"; // Yüksekliği doldur
  panelContainer.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
  panelContainer.style.color = "white";
  panelContainer.style.border = "1px solid #444";
  panelContainer.style.borderRadius = "8px";
  panelContainer.style.zIndex = "9999999"; // Her şeyin üstünde
  panelContainer.style.overflowY = "auto"; // Kaydırma çubuğu
  panelContainer.style.fontFamily = "Arial, sans-serif";

  // Panel içeriği
  let innerHTML = `
    <div style="padding: 20px;">
      <h2 style="margin-top: 0; border-bottom: 1px solid #555; padding-bottom: 10px;">
        Sahnede (Son ${timeWindow}s)
        <button id="xray-close-btn" style="float: right; background: #333; color: white; border: none; font-size: 20px; cursor: pointer; padding: 0 8px;">&times;</button>
      </h2>
      <div id="xray-character-list">
  `;

  if (characters.length === 0) {
    innerHTML += `<p style="color: #999;">Bu zaman aralığında bilinen bir karakter tespit edilmedi.</p>`;
  } else {
    characters.forEach(cast => {
      // Varsayılan resim (eğer profil resmi yoksa)
      const imgSrc = cast.profile_path || 'https://via.placeholder.com/100x150.png?text=No+Image';
      
      innerHTML += `
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <img src="${imgSrc}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px; margin-right: 10px;">
          <div>
            <strong style="font-size: 16px;">${cast.character}</strong>
            <br>
            <span style="font-size: 14px; color: #ccc;">${cast.name}</span>
          </div>
        </div>
      `;
    });
  }

  innerHTML += `</div></div>`; // Listeyi ve padding'i kapat
  panelContainer.innerHTML = innerHTML;

  // Paneli sayfaya ekle (video oynatıcının olduğu yere)
  const playerContainer = document.querySelector("#__next"); // HBO Max'in ana konteyneri
  if (playerContainer) {
    playerContainer.appendChild(panelContainer);
  } else {
    document.body.appendChild(panelContainer); // Fallback
  }

  // Kapat butonuna tıklandığında paneli kaldır
  document.getElementById("xray-close-btn").onclick = () => {
    panelContainer.remove();
  };
}

/**
 * Eklentiyi başlatan ana fonksiyon
 * (buildCharacterMap çağrısı eklendi)
 */
async function initialize() {
  // 5 saniye bekleme süresini 3'e indirelim
  console.log("Eklenti 3 saniye içinde başlayacak...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  const title = detectShowTitle();

  if (title) {
    console.log(`İçerik başlığı bulundu: "${title}"`);
    const content = await searchContent(title);
    
    if (content && content.id) {
      console.log(`TMDB'de bulundu. ID: ${content.id}, Tipi: ${content.media_type}`);
      
      // api.js'den gelen filtrelenmiş (min 2 bölüm) listeyi al
      const cast = await getCast(content.id, content.media_type);
      
      if (cast && cast.length > 0) {
        console.log(`Başarılı! ${cast.length} filtrelenmiş karakter hafızaya alındı.`);
        currentCastList = cast;
        
        // --- YENİ ADIM ---
        // Oyuncu listesini haritaya dönüştür
        buildCharacterMap(); 
        
        // Geri kalanları başlat
        injectXRayButton();
        startSubtitleObserver();
        
      } else {
        console.error("Hata: Oyuncu kadrosu alınamadı veya boş.");
      }
    } else {
      console.error(`Hata: "${title}" TMDB'de bulunamadı.`);
    }
    
  } else {
    console.warn("İçerik başlığı bulunamadı. 5 saniye sonra tekrar denenecek...");
    setTimeout(initialize, 5000);
  }
}

// initialize() fonksiyonunu doğrudan çağır
initialize();
