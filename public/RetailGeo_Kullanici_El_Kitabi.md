# RetailGeo Intelligence - Kullanici El Kitabi

## 1. Uygulamanin Amaci
RetailGeo Intelligence, yapay zeka (Gemini) ve harita verileri kullanarak bir lokasyonun ticari surdurulebilirligini, demografik yapisini ve hangi urunlerin o bolgede daha cok satabilecegini analiz eden stratejik bir perakende aracidir. Ozellikle **hazir giyim ve moda markalari** (Orn: Sarar) icin optimize edilmistir.

## 2. Temel Moduller

### A. Konum Analizi (Ana Sayfa)
Bu bolumde magaza acmayi dusundugunuz veya incelemek istediginiz adresi girersiniz.
- **Haritalar Taraniyor:** AI, Google Haritalar verilerini kullanarak 1km yariçapindaki tum luks markalari, kafeleri, okullari ve marketleri tarar.
- **Puanlar Hesaplaniyor:** Bulunan markalara (isaretcilere) gore Refah (Affluence), Trend ve Aile (Family) puanlari hesaplanir.
- **Baskin Persona Secimi:** Puanlara gore lokasyon; "Sehirli Profesyonel", "Genc & Trend" veya "Aile & Konut" olarak kategorize edilir.
- **Urun Dagitim Stratejisi:** Moda ve hazir giyim sektoru icin hangi koleksiyonlarin vitrinde agirlikli olmasi gerektigi belirlenir.

### B. Urun Analizi ve Akilli Envanter Eslestirme
- Analiz tamamlandiktan sonra "**Akilli Envanter Eslestirme**" ekrani acilir.
- Markaniza ait bir e-ticaret baglantisi (ornegin: `www.sarar.com`) girerek AI'dan o lokasyondaki hedef kitleye en uygun 25+ urunu listelemesini isteyebilirsiniz. AI bu urunleri yuzdelik skorlarla degerlendirerek Ust Giyim, Alt Giyim ve Aksesuar olarak raporlar.

## 3. Yonetici (Admin) Paneli ve Ozellestirme
Admin paneli, analiz mekanizmasinin beynidir. AI'in nelere dikkat etmesi gerektigini buradan tamamen kendi stratejinize gore ozellestirebilirsiniz. Sectiginiz kurallar, programin o saniyeden sonraki tum algilamasini yeniden programlar (Revize eder).

### Admin Paneline Nasil Girilir?
1. "Konum Analizi" ekraninda analiz butonunun altindaki **"Analiz Kriterlerini Duzenle (Kilitli)"** yazisina tiklayin.
2. Acilan sifre kutusuna yetkili sifresini girin: `admin123321admin` ve Giris'e basin.
3. Panele basariyla giris yaptiginizda (ADMIN MODE yesil ibaresi) gelismis ayar alanlari acilacaktir.

### Neler Degistirilebilir?
- **1. Harita Arama Kriterleri:** AI'in Google verilerinden hangi markalari "Luks", hangilerini "Uygun Fiyatli" veya "Trafik Yaratisi" olarak algilamasi gerektigini buradan duzenleyebilirsiniz. Kendi markanizin rakiplerini listeye ektebilirsiniz. Eklediginiz an, yeni analizlerde uygulamaniz sadece o markalari arayacaktir.
- **2. Puanlama & Segment Mantigi:** Hangi mekanin kac puan verecegini (Orn: Starbucks +8 Puan deil, +12 Puan olsun) veya "Genc & Trend" kategorisine girmek icin nelere daha yuksek puan gerektigini formullendirebilirsiniz.
- Deisiklikleri geri almak isterseniz, en altta cikan "Varsayilanlara Sifirla" baglantisini kullanabilirsiniz.

## 4. Teknik Notlar
Bu program arka planda Google uzerinden canli erisime sahip Gemini modellerini kullanmaktadir. Yapilan analizin kalitesi, sectiginiz lokasyonun Google Haritalar'daki isletme kaydi yogunluguna (zenginligine) bagli olarak degisebilir.
