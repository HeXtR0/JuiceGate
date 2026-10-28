# 🍓 Juice Gate

Meyve temalı kapı-atış koşu oyunu. Kapıları ateşleyerek sayını büyüt, çürük meyve ordusunu ez, sonunda Patlıcan Kral'ı yen!

## Nasıl oynanır
- **Sürükle** (telefon / fare) veya **A-D / ← →** ile sola sağa git. Ateş otomatik.
- Kapılar: **yeşil +** = meyve kazanırsın, **kırmızı −** = kaybedersin. Kapıyı **ateşlersen** sayısı artar!
- Varil yığınlarını yok edersen **silahın yükselir** (daha çok mermi). Barile çarparsan 4 meyve kaybedersin.
- Düşmanlar sana çarparsa meyve kaybedersin. Sayın 0 olursa kaybedersin.
- Yolun sonunda **Patlıcan Kral** seni bekliyor.

## Çalıştırma
`index.html` dosyasına çift tıkla. Sunucu / kurulum gerekmez.
GitHub Pages: Settings → Pages → Source: GitHub Actions (hazır `deploy.yml` var).

## Dosyalar
- `index.html`: arayüz (menü, çubuk, ekranlar)
- `game.js`: tüm oyun (3D sahne, düşmanlar, kapılar, boss, ses)
- `lib/three.min.js`: Three.js r149 (internet gerekmez)

## Ayarlar (game.js'in en üstü)
- `HITS_PER_POINT`: kapıya kaç mermi = +1 (büyütürsen kapılar zor büyür)
- `ACT_DIST`: düşmanlar kaç metreden koşmaya başlar
