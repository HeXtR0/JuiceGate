# 🍓 Juice Gate V2 — 3D Hyper-Casual Koşu Oyunu

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Ready-22c55e?style=for-the-badge&logo=github)](https://hextr0.github.io/JuiceGate/)
[![Three.js](https://img.shields.io/badge/Three.js-r149-f59e0b?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Platform](https://img.shields.io/badge/Platform-PC%20%26%20Mobil-8b5cf6?style=for-the-badge)](https://github.com/HeXtR0/JuiceGate)
[![License](https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge)](LICENSE)

Meyve temalı, dinamik kapı atış mekaniğine ve boss savaşlarına sahip 3D koşu oyunu. Kapıları ateşleyerek sayınızı katlayın, silahınızı yükseltin, çürük meyve sürülerini ezin ve bölüm sonunda **Patlıcan Kral**'ı alt edin!

---

## 🎮 Canlı Oyna (GitHub Pages)

Oyun GitHub Pages üzerinden doğrudan tarayıcıda oynanabilir:  
👉 **[Juice Gate Canlı Demo](https://hextr0.github.io/JuiceGate/)**

> **💡 GitHub Pages Kurulumu (Tek Seferlik):**  
> GitHub Pages'in aktif olması için repoda:  
> 1. **Settings** ➔ **Pages** menüsüne gidin.  
> 2. **Build and deployment > Source** ayarını **GitHub Actions** olarak seçin.  
> 3. `.github/workflows/deploy.yml` otomatik olarak oyunu yayına alacaktır.

---

## 🕹️ Kontroller

| Platform | Girdi | Aksiyon |
| :--- | :--- | :--- |
| **PC (Klavye)** | `A` / `D` veya `←` / `→` | Sağa / Sola yönlendirme |
| **PC (Fare)** | Tıklayıp Sürükle | Hassas yatay kontrol |
| **Mobil (Dokunmatik)** | Parmağı Sürükle | Akıcı yatay takip |
| **Ateş Etme** | Otomatik | Karakter menzile girdiğinde otomatik ateş eder |
| **Ses Aç/Kapat** | Sağ Alttaki `🔊` Butonu | Müzik ve ses efektlerini açar / kapatır |

---

## ✨ Oyun Mekanikleri & Özellikler

- **Kapı Atış Mekaniği:**  
  Yeşil kapılar (`+`) meyve sayınızı artırır, kırmızı kapılar (`−`) azaltır. Kapılara ateş ettikçe kapıların değerini yükseltebilirsiniz!
- **Variller ve Silah Yükseltmesi:**  
  Yoldaki varil yığınlarını patlatarak silahınızı seviye atlatabilir (tekli, çiftli, çoklu mermi) ve ateş gücünüzü artırabilirsiniz. (Varillere çarpmamaya dikkat edin!)
- **Çürük Meyve Ordusu:**  
  Size doğru koşan çürük düşman meyveleri vurun veya ezin. Meyve sayınız 0'a düşerse kaybedersiniz.
- **Boss Savaşı (Patlıcan Kral):**  
  Her parkurun sonunda devasa **Patlıcan Kral** sizi bekler. Yeterli meyve ve ateş gücüyle boss'u yenerek bir sonraki seviyeye geçin!
- **Sıfır Kurulum & Bağımsızlık:**  
  Herhangi bir `npm`, derleme veya harici paket yöneticisi gerektirmez. Üçüncü parti bağımlılıklar yerel `lib/` klasöründe yer alır.

---

## 🚀 Yerel Çalıştırma

Oyun tamamen yerel ve bağımsız olarak tasarlanmıştır:

1. Bu depoyu indirin veya klonlayın:
   ```bash
   git clone https://github.com/HeXtR0/JuiceGate.git
   ```
2. Klasördeki **`index.html`** dosyasına çift tıklayın!  
   *Herhangi bir sunucu (server) veya kurulum gerekmez, doğrudan tarayıcınızda açılır.*

---

## 📁 Proje Yapısı

```
JuiceGate/
├── .github/
│   └── workflows/
│       └── deploy.yml    # Otomatik GitHub Pages dağıtım iş akışı
├── lib/
│   └── three.min.js      # Three.js kütüphanesi (r149, çevrimdışı destek)
├── .gitignore            # Git dışlama kuralları
├── .nojekyll             # GitHub Pages statik dosya optimizasyonu
├── game.js               # Tüm 3D sahne, mantık, fizik ve ses motoru
├── index.html            # Oyun arayüzü, canvas ve HUD katmanı
├── LICENSE               # MIT Lisansı
└── README.md             # Dokümantasyon
```

---

## 🛠️ Oyun İçi Ayarlar (game.js)

`game.js` dosyasının en üst kısmındaki sabitleri değiştirerek oynanışı kolayca özelleştirebilirsiniz:

```javascript
const HALF = 4.5;              // Yolun yarı genişliği
const GATE_SPACING = 40;       // Bölümler arası mesafe
const ACT_DIST = 62;           // Düşmanların koşmaya başladığı mesafe
const BULLET_SPEED = 46;       // Mermi hızı
const HITS_PER_POINT = 5;      // Kapıya kaç mermi = +1 puan
const MAX_VISIBLE = 36;        // Ekranda çizilen maksimum meyve sayısı
```

---

## 📄 Lisans

Bu proje [MIT](LICENSE) lisansı altında sunulmaktadır.
