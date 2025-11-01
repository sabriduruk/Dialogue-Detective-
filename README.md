# Actor Peek Eklentisi (Prototip)
**Sürüm:** v0.9.0 - Beta (HBO Max Prototipi)

Bu proje, bir tarayıcı eklentisi (Chrome Extension) prototipidir. Amacı, Amazon Prime'ın "X-Ray" özelliğine benzer bir yapıyı, **diyalog odaklı** olarak diğer streaming platformlarına (şu an için **HBO Max**) getirmektir.

Kullanıcı, "X-RAY" butonuna bastığında, eklenti son 15 saniyede geçen altyazıları analiz eder ve bu diyaloglarda adı geçen karakterlerin bir listesini (fotoğraf, karakter adı, oyuncu adı) gösterir.

## 🚀 Temel Özellikler

* **Platform Entegrasyonu:** Şu anda `hbomax.com` için özel olarak ayarlanmış seçicilerle (selectors) çalışır.
* **Otomatik Veri Çekme:** İzlenen içeriğin başlığını (örn: "True Detective") otomatik olarak algılar.
* **Kapsamlı Karakter Listesi:** TMDB API'sinin `aggregate_credits` özelliğini kullanarak, bir dizide *en az 2 bölümde* oynamış tüm (ana, yan, konuk) karakterlerin tam listesini çeker.
* **Gürültü Filtreleme:** TMDB'den gelen "Man #3" gibi 1 bölümlük figüranları otomatik olarak filtreler.
* **Dinamik Arayüz:** HBO Max oynatıcısına bir "X-RAY" butonu ve tıklandığında açılan bir karakter paneli enjekte eder.
* **Gerçek Zamanlı Altyazı Takibi:** `MutationObserver` kullanarak altyazıların göründüğü `div`'i izler ve her yeni altyazıyı zaman damgasıyla birlikte kaydeder.

## 🧠 Eşleştirme Mantığı ("Arama Haritası")

Bu prototipin kalbi, "Arama Haritası" (`characterLookupMap`) adı verilen özel bir eşleştirme mantığıdır.

1.  **Ön İşleme (`buildCharacterMap`):** Eklenti, TMDB'den gelen (örn: 300+) karakter listesini *bir kereliğine* işler.
    * `"Martin 'Marty' Hart"` gibi bir isimden `["martin", "marty", "hart"]` gibi anahtar kelimeler çıkarır.
    * Bu kelimeleri bir `Map` objesine (`{"marty": [Martin Hart Objesi], "tuttle": [Billy Tuttle Objesi]...}`) yerleştirir.

2.  **STOP_WORDS (Duraklama Listesi):** `"adam"`, `"lord"`, `"man"`, `"kral"` gibi hem özel isim hem de genel kelime olabilen sözcükler, haritaya eklenmeden önce filtrelenir. Bu, "Bu adam kim?" altyazısında "Adam Bryce" karakterinin çıkmasını engeller.

3.  **Anlık Arama (`showXRayPanel`):** Kullanıcı "X-RAY" butonuna bastığında:
    * Son 15 saniyenin altyazıları alınır (örn: `"...Tuttle'a ne oldu?"`).
    * Altyazı metni temizlenir (`"tuttle a ne oldu"`).
    * Bu temiz kelimeler (`tuttle`, `a`, `ne`, `oldu`) `STOP_WORDS` ile karşılaştırılır.
    * Filtrelenen kelimeler (`"tuttle"`) doğrudan `characterLookupMap` haritasında (`map.get("tuttle")`) aranır ve eşleşen karakterler *anında* bulunur.

Bu yöntem, `RegExp` veya "esnek arama"ya (`startsWith`) göre çok daha hızlı ve doğruluk oranı çok daha yüksektir.

## 🔧 Nasıl Çalıştırılır

1.  Projeyi klonla.
2.  `api.js` dosyasını aç ve `const API_KEY = "..."` satırına kendi TMDB v3 API anahtarını gir.
3.  Google Chrome'u aç, adres çubuğuna `chrome://extensions` yaz.
4.  Sağ üstteki "Geliştirici Modu" (Developer Mode) seçeneğini aktifleştir.
5.  Sol üstteki "Paketlenmemiş yükle" (Load unpacked) butonuna tıkla ve bu proje klasörünü seç.
6.  `hbomax.com`'da bir dizi açıp altyazıları etkinleştir. Eklenti çalışmaya başlayacaktır.

## 🔮 Sonraki Adımlar (Profesyonel Sürüm için)

* **Adaptör Modeli (Adapter Pattern):** `content.js`'i platformdan bağımsız hale getirmek. Platforma özel seçicileri (`hbomax.js`, `netflix.js` gibi) ayrı dosyalara taşımak.
* **API Anahtar Güvenliği:** API anahtarını koddan çıkarmak ve bir sunucu üzerinden (veya `chrome.storage.sync` ile) yönetmek.
* **Önbellekleme (Caching):** API'dan çekilen kadro listelerini `chrome.storage.local` kullanarak 24 saat gibi bir süre önbelleğe almak.
