# Orbit Runner 💫

Orbit Runner adalah game arcade survival berbasis HTML Canvas. Pemain mengendalikan pesawat di orbit, menghindari meteor, menembak ancaman, mengambil kristal, dan mengumpulkan power-up untuk bertahan selama mungkin.

🌐 **Demo Aplikasi:** https://orbit-runner-game.netlify.app

## Fitur

- **Kontrol Pesawat**: 4 arah (kiri, kanan, maju, mundur) dengan responsif di desktop dan mobile
- **Sistem Tembak**: Peluru ganda dengan skill upgrades:
  - 🔶 **Triple Shot**: Tembak 3 peluru sekaligus (kiri, tengah, kanan)
  - ⚡ **Rapid Fire**: Cooldown tembak lebih cepat
  - 🌀 **Spread Shot**: 5 peluru dalam formasi
  - 💜 **Piercing**: Peluru lebih besar dan tahan lama
- **Power-up**: Shield, magnet, slow field, dan boost
- **Stamina Bar**: Indikator boost bahan bakar di bagian bawah layar
- **Misi Bertahap**: Misi dinamis dengan reward power-up
- **Level Scaling**: Kesulitan meningkat seiring level naik
- **Combo & Skor**: Multiplier skor berdasarkan streak hit
- **UI Responsif**: Kontrol mobile terorganisir dalam grup (direction pad + action buttons)
- **Audio**: Efek suara arcade yang bisa dimatikan dengan toggle

## Cara Main

Buka `index.html` di browser modern.

**Kontrol Desktop:**
- `A` / `ArrowLeft`: bergerak ke kiri
- `D` / `ArrowRight`: bergerak ke kanan
- `W` / `ArrowUp`: maju
- `S` / `ArrowDown`: mundur
- `F` / `Enter`: tembak
- `Space` / `Shift`: boost
- `P` / `Escape`: pause
- `M`: toggle mute

**Kontrol Mobile:**
- Tombol **D-Pad** (←↑↓→): gerakan 4 arah
- Tombol **BOOST**: percepatan pesawat
- Tombol **FIRE**: tembak
- Semua tombol responsif dengan ukuran cocok untuk layar kecil

## Mekanik Game

### Power-Up & Skill
Kumpulkan item jatuh untuk mendapat:
- **Shield**: Proteksi dari 1 serangan
- **Magnet**: Tarik kristal otomatis
- **Slow Field**: Lambatkan semua gerakan
- **Triple Shot**: Triple tembakan
- **Rapid Fire**: Tembak lebih cepat
- **Spread Shot**: Tembakan menyebar
- **Piercing**: Peluru tembus

### Sistem Level
- Setiap 420m jarak = 1 level naik
- Spawn rate hazard meningkat dengan level
- Skor per detik meningkat dengan level

### Persyaratan Misi
5 misi tersedia untuk unlock power-up bonus:
1. Ambil 5 kristal → Perisai +1
2. Combo x5 → Boost penuh
3. Capai 900m → Magnet aktif
4. Ambil 18 kristal → Slow field
5. Capai 1800m → Bonus skor

