// API functions for X-Ray Vision Extension

// TMDB API Bilgileri
const API_KEY = "c50a16c48d277bfd1f7166628c42147e";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w200"; // Karakter resimleri için

/**
 * Bir dizi veya filmi ismine göre arar ve TMDB ID'sini bulur.
 * @param {string} query - Aranacak dizi/film adı (Örn: "True Detective")
 * @returns {Promise<object|null>} - Bulunan ilk sonucun detayları
 */
export async function searchContent(query) {
  const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      console.log("TMDB Arama Sonucu:", data.results[0]);
      return data.results[0]; // İlk ve en alakalı sonucu dön
    }
    return null;
  } catch (error) {
    console.error("TMDB Arama Hatası:", error);
    return null;
  }
}

/**
 * Bir içerik ID'si (dizi veya film) kullanarak OYNAYAN TÜM KARAKTERLERİN listesini çeker.
 * Dizi ise (tv), tüm sezonlardaki BİRLEŞTİRİLMİŞ (aggregate) kadroyu çeker.
 * Film ise (movie), o filmin kadrosunu çeker.
 * @param {string} contentId - TMDB içeriğinin ID'si
 * @param {string} mediaType - 'tv' (dizi) veya 'movie' (film)
 * @returns {Promise<Array|null>} - Benzersiz karakterlerin tam listesi
 */
export async function getCast(contentId, mediaType = 'tv') {
  let url = '';
  // Gürültüyü filtrelemek için minimum bölüm sayısı (SADECE DİZİLER İÇİN)
  const MIN_EPISODE_COUNT = 2;

  if (mediaType === 'tv') {
    console.log(`Dizinin TÜM (aggregate) kadrosu (min ${MIN_EPISODE_COUNT} bölüm) çekiliyor...`);
    url = `${BASE_URL}/tv/${contentId}/aggregate_credits?api_key=${API_KEY}&language=en-US`;
  } else if (mediaType === 'movie') {
    console.log("Film kadrosu çekiliyor...");
    url = `${BASE_URL}/movie/${contentId}/credits?api_key=${API_KEY}&language=en-US`;
  } else {
    console.error("Geçersiz medya tipi:", mediaType);
    return null;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const characterMap = new Map();

    data.cast.forEach(person => {
      if (mediaType === 'tv' && person.roles) {
        // Dizi (aggregate) ise: rollerini ve bölüm sayılarını kontrol et
        person.roles.forEach(role => {
          // SADECE min bölüm sayısını geçen ve Map'te olmayanları ekle
          if (role.character && role.episode_count >= MIN_EPISODE_COUNT && !characterMap.has(role.character)) {
            characterMap.set(role.character, {
              name: person.name,
              character: role.character,
              profile_path: person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : null
            });
          }
        });
      } else if (mediaType === 'movie' && person.character) {
        // Film (normal) ise: bölüm sayısı yok, direkt ekle
        if (!characterMap.has(person.character)) {
          characterMap.set(person.character, {
            name: person.name,
            character: person.character,
            profile_path: person.profile_path ? `${IMAGE_BASE_URL}${person.profile_path}` : null
          });
        }
      }
    });
    
    const castList = Array.from(characterMap.values());
    
    console.log(`TMDB Oyuncu Listesi: Toplam ${data.cast.length} kişi arasından ${castList.length} filtrelenmiş karakter bulundu.`);
    return castList;
  } catch (error) {
    console.error("TMDB Oyuncu Listesi Hatası:", error);
    return null;
  }
}
