(() => {
  const face = document.getElementById('robotFace');
  const clayFaceGroup = document.getElementById('clayFaceGroup');
  const clayAntenna = document.getElementById('clayAntenna');
  const eyeLeft = document.getElementById('eyeLeft');
  const eyeRight = document.getElementById('eyeRight');
  const pupilLeft = document.getElementById('pupilLeft');
  const pupilRight = document.getElementById('pupilRight');
  const nose = document.getElementById('robotNose');
  const noseLed = document.getElementById('noseLed');
  const mouth = document.getElementById('robotMouth');
  const mouthRim = mouth.querySelector('.mouth-rim');
  const voiceBarsContainer = document.getElementById('voiceBars');
  const droppedLayer = document.getElementById('droppedLayer');
  const circularGate = document.getElementById('circularGate');
  const gateEnterBtn = document.getElementById('gateEnterBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundToggleLabel = document.getElementById('soundToggleLabel');
  const wakeSleepBtn = document.getElementById('wakeSleepBtn');
  const wakeSleepLabel = document.getElementById('wakeSleepLabel');
  const painAlertOverlay = document.getElementById('painAlertOverlay');
  const antennaBall = document.getElementById('antennaBall');
  const antennaStem = document.getElementById('antennaStem');
  const hudClockText = document.getElementById('hudClockText');
  const hudMoodCode = document.getElementById('hudMoodCode');
  const pixelSunglasses = document.getElementById('pixelSunglasses');

  // ==================== 8-BIT PIXEL GAME SOUND ENGINE (WEB AUDIO API) ====================
  const pixelAudio = (() => {
    let ctx = null;
    let enabled = true;
    let unlocked = false;
    let bgmTimer = null;
    let bgmStep = 0;

    // Tangga nada chiptune ceria (Hz) untuk BGM Gate & Stage
    const GATE_ARP = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23];
    const STAGE_ARP = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 587.33, 698.46];

    function ensureContext() {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) ctx = new AudioCtx();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      return ctx;
    }

    // Pemutar nada dasar gelombang square / triangle khas 8-bit NES/GameBoy
    function playTone(freq, duration = 0.08, type = 'square', volume = 0.06, delay = 0, slideTo = null) {
      if (!enabled) return;
      const audio = ensureContext();
      if (!audio || audio.state !== 'running') return;

      const now = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(audio.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    // 1. Efek Suara BGM Chiptune Lembut vs Mode Tidur (Jangkrik Malam + Dengkur Robot 8-Bit)
    function playCricketChirp() {
      // Krik-krik jangkrik malam 8-bit (pulsa cepat frekuensi tinggi 4.2kHz - 4.5kHz)
      for (let c = 0; c < 4; c++) {
        playTone(4350 + (c % 2) * 140, 0.022, 'sine', 0.024, c * 0.032);
      }
      // Kadang-kadang disusul krik kedua ("krik.. krik..")
      if (Math.random() < 0.72) {
        for (let c = 0; c < 4; c++) {
          playTone(4300 + (c % 2) * 130, 0.022, 'sine', 0.02, 0.21 + c * 0.032);
        }
      }
    }

    function playRobotSnore() {
      // Suara tarik napas dengkur rendah ("nggroook...")
      playTone(92, 0.42, 'triangle', 0.045, 0, 138);
      // Suara buang napas siulan kartun lucu ("...fiuuuu~")
      playTone(620, 0.48, 'sine', 0.028, 0.52, 340);
    }

    function startPixelLoop() {
      if (bgmTimer) return;
      bgmTimer = setInterval(() => {
        if (!enabled || !ctx || ctx.state !== 'running') return;

        // Jika robot sedang tidur (Dark Mode), ganti BGM menjadi suara jangkrik malam + dengkur kartun + bintang kelap-kelip
        const isRobotSleeping = document.body.classList.contains('is-dark-sleep');
        if (isRobotSleeping) {
          // Jangkrik berbunyi setiap beberapa ketukan
          if (bgmStep % 5 === 0) {
            playCricketChirp();
          }
          // Dengkur halus robot setiap ~2.8 detik (sinkron dengan animasi napas mulut)
          if (bgmStep % 12 === 2) {
            playRobotSnore();
          }
          // Nada lullaby kotak musik malam yang sangat pelan & jarang
          if (bgmStep % 8 === 4) {
            const nightNotes = [523.25, 659.25, 587.33, 493.88, 392.00];
            const n = nightNotes[(bgmStep / 8) % nightNotes.length | 0];
            playTone(n, 0.28, 'sine', 0.016, 0);
          }
          bgmStep++;
          return;
        }

        const notes = gateIsOpen ? STAGE_ARP : GATE_ARP;
        const note = notes[bgmStep % notes.length];
        // Bass / Arp 8-bit halus agar nyaman di telinga
        playTone(note * 0.5, 0.11, 'triangle', 0.032, 0);
        if (bgmStep % 2 === 0) {
          playTone(note, 0.07, 'square', 0.018, 0.02);
        }
        bgmStep++;
      }, 240);
    }

    // 2. Sound Rakit Robot / Buka Gate (Power-Up 1-UP Arpeggio)
    function playGateAssemble() {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((n, idx) => {
        playTone(n, 0.09, 'square', 0.065, idx * 0.055);
      });
      // Bunyi "snap" ketika komponen menyatu
      playTone(880, 0.12, 'triangle', 0.08, 0.72, 1318.5);
      playTone(1318.5, 0.18, 'square', 0.07, 0.80);
    }

    // 3. Sound Tombol Lompat ke Atas Dikit Lalu Jatuh Abstrak (Jump + Fall + Bounce)
    function playButtonJumpAndDrop(delaySec = 0) {
      // Melambung ke atas (pitch naik cepat seperti Mario jump)
      playTone(320, 0.12, 'square', 0.055, delaySec, 780);
      // Meluncur jatuh ke bawah (pitch turun)
      playTone(660, 0.18, 'triangle', 0.05, delaySec + 0.18, 220);
      // Mendarat memantul (2x blip pendek)
      playTone(280, 0.06, 'square', 0.05, delaySec + 0.62, 420);
      playTone(460, 0.07, 'square', 0.045, delaySec + 0.71);
    }

    // 4. Sound Kedip Mata (8-Bit Blip)
    function playBlink() {
      playTone(740, 0.04, 'square', 0.03, 0, 980);
    }

    // 5. Sound Klik Hidung / Ganti Warna (Coin Collect)
    function playColorCoin() {
      playTone(987.77, 0.07, 'square', 0.065, 0);
      playTone(1318.51, 0.22, 'square', 0.065, 0.07);
    }

    // 6. Sound Klik Antena / Ganti Mood (Power Morph)
    function playMoodChange() {
      playTone(440, 0.07, 'square', 0.055, 0);
      playTone(554.37, 0.07, 'square', 0.055, 0.06);
      playTone(659.25, 0.12, 'square', 0.06, 0.12);
    }

    // 7. Sound Buka & Tutup Modal Kartu
    function playModalOpen() {
      playTone(523.25, 0.06, 'square', 0.055, 0);
      playTone(659.25, 0.06, 'square', 0.055, 0.05);
      playTone(1046.50, 0.14, 'square', 0.06, 0.10);
    }

    function playModalClose() {
      playTone(783.99, 0.06, 'square', 0.05, 0);
      playTone(523.25, 0.1, 'square', 0.05, 0.05);
    }

    // 7b. Sound Masuk Mode Tidur (Lullaby 8-Bit Turun + Jangkrik Malam Pertama)
    function playSleepSound() {
      playTone(659.25, 0.12, 'triangle', 0.05, 0);
      playTone(523.25, 0.14, 'triangle', 0.045, 0.12);
      playTone(392.00, 0.16, 'triangle', 0.04, 0.25);
      playTone(261.63, 0.28, 'triangle', 0.035, 0.40);
      setTimeout(() => {
        if (document.body.classList.contains('is-dark-sleep')) {
          playCricketChirp();
        }
      }, 620);
    }

    // 8. Sound Hover Komponen (Micro Blip)
    function playHoverBlip() {
      playTone(1174.66, 0.028, 'square', 0.02, 0);
    }

    // 9. Sound Robot Berbicara (Animal Crossing / Retro RPG Voice Blip)
    function playRobotSyllable() {
      const baseFreqs = [349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25];
      const f = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];
      playTone(f, 0.045, 'square', 0.025, 0, f * 1.12);
    }

    // 10. Sound Error / Alarm Kesakitan Saat Memerah ("SAKITT WOII!!") & Glitch Destroy
    function playPainAlarm() {
      // Buzzer Error 8-Bit Kasar + Sirene Glitch Merah
      const errFreqs = [155, 116, 146, 98, 130, 87];
      errFreqs.forEach((f, i) => {
        playTone(f, 0.11, 'sawtooth', 0.095, i * 0.09, f * 0.72);
        playTone(f * 3.1, 0.06, 'square', 0.075, i * 0.09 + 0.03, f * 1.4);
      });
      // Alarm merah tinggi berdenyut selama layar memerah
      for (let k = 0; k < 4; k++) {
        playTone(880, 0.09, 'sawtooth', 0.08, 0.55 + k * 0.24, 420);
        playTone(135, 0.12, 'square', 0.085, 0.64 + k * 0.24, 92);
      }
    }

    // 11. Sound Glitch Error Saat Tombol Lama Memerah & Menghilang
    function playGlitchDestroy() {
      playTone(210, 0.055, 'sawtooth', 0.075, 0, 95);
      playTone(760, 0.04, 'square', 0.055, 0.045, 180);
      playTone(140, 0.09, 'sawtooth', 0.08, 0.09, 68);
      playTone(520, 0.045, 'square', 0.05, 0.15, 110);
    }

    // 12. Sound Mulut Mengunyah Tombol ("Feed the Robot" 8-Bit Chomp)
    function playMouthChomp() {
      playTone(180, 0.07, 'square', 0.085, 0, 90);
      playTone(260, 0.07, 'sawtooth', 0.08, 0.08, 120);
      playTone(523.25, 0.08, 'triangle', 0.07, 0.17, 783.99);
      playTone(1046.5, 0.14, 'square', 0.065, 0.25);
    }

    // 13. Sound Pusing Kursor Diputar-putar (8-Bit Dizzy Swirl)
    function playDizzySwirl() {
      const swirl = [523.25, 493.88, 440, 392, 440, 493.88, 587.33, 523.25];
      swirl.forEach((f, idx) => {
        playTone(f, 0.08, 'triangle', 0.06, idx * 0.065, f * 0.92);
      });
    }

    // 14. Sound Tarik Pipi / Antena Elastis (Boing Spring 8-Bit)
    function playElasticBoing() {
      playTone(190, 0.26, 'sine', 0.08, 0, 640);
      playTone(380, 0.18, 'triangle', 0.06, 0.08, 240);
      playTone(520, 0.14, 'sine', 0.05, 0.18, 420);
    }

    // 15. Sound Petik Bar Mulut (Mini Synth / Kalimba 8-Bit Pentatonik)
    function playMouthSynthBar(barIndex) {
      const scale = [
        261.63, 293.66, 329.63, 392.00, 440.00,
        523.25, 587.33, 659.25, 783.99, 880.00, 1046.50
      ];
      const freq = scale[barIndex % scale.length];
      playTone(freq, 0.16, 'triangle', 0.07, 0, freq * 1.01);
      playTone(freq * 2, 0.08, 'sine', 0.03, 0.01);
    }

    // 16. Sound Mencium ("Chu~ / Muah!" 8-Bit Pop Kiss)
    function playKissSound() {
      // Tarikan bibir singkat lalu pop tinggi manis ("chu~!")
      playTone(320, 0.07, 'sine', 0.065, 0, 190);
      playTone(540, 0.14, 'sine', 0.085, 0.08, 1280);
      playTone(1046.5, 0.12, 'triangle', 0.06, 0.21, 1567.98);
    }

    function unlockAndStart() {
      const audio = ensureContext();
      if (!audio) return;
      if (!unlocked) {
        unlocked = true;
        startPixelLoop();
      }
    }

    function toggleSound() {
      enabled = !enabled;
      if (enabled) {
        ensureContext();
        startPixelLoop();
        playColorCoin();
      }
      return enabled;
    }

    return {
      unlockAndStart,
      toggleSound,
      isEnabled: () => enabled,
      playGateAssemble,
      playButtonJumpAndDrop,
      playBlink,
      playColorCoin,
      playMoodChange,
      playSleepSound,
      playModalOpen,
      playModalClose,
      playHoverBlip,
      playRobotSyllable,
      playPainAlarm,
      playGlitchDestroy,
      playMouthChomp,
      playDizzySwirl,
      playElasticBoing,
      playMouthSynthBar,
      playKissSound
    };
  })();

  // Modal Elements
  const modalBackdrop = document.getElementById('clayModalBackdrop');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBadge = document.getElementById('modalBadge');
  const modalIcon = document.getElementById('modalIcon');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalTags = document.getElementById('modalTags');
  const modalExtra = document.getElementById('modalExtra');
  const modalFooter = document.getElementById('modalFooter');

  const BAR_COUNT = 11;
  const COLORS = ['sky', 'mint', 'sunny', 'berry', 'grape'];
  const MOODS = ['normal', 'happy', 'thinking', 'surprised', 'kissing', 'sleeping'];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Data Portofolio untuk Tombol-Tombol yang Jatuh dari Mata, Hidung, dan Mulut (Tanpa Emoji)
  const PORTFOLIO_DATA = {
    eyes: [
      {
        id: 'proj-robot',
        tag: 'Mata Kiri • Showcase',
        label: 'ClayBot Toy Lab',
        badgeCode: '01',
        theme: 'clay-theme-sky',
        title: 'ClayBot Interactive Web Toy',
        desc: 'Eksperimen karakter web interaktif berbasis Claymorphism 3D dengan mata yang mengikuti kursor, ekspresi dinamis, dan fisika tombol jatuh real-time.',
        tags: ['HTML5', 'CSS Claymorphism', 'Vanilla JS', 'Web Animation API'],
        highlights: [
          '60fps Eye Tracking & Auto-Gaze System',
          '5 Tema Warna Clay Pastel Interaktif',
          'Sistem Gravitasi Abstrak Anti-Nabrak Wajah'
        ],
        ctaText: 'Coba Ganti Ekspresi Robot',
        ctaAction: 'mood'
      },
      {
        id: 'proj-dashboard',
        tag: 'Mata Kiri • Web App',
        label: 'Nebula Studio OS',
        badgeCode: '02',
        theme: 'clay-theme-grape',
        title: 'Nebula Creative Dashboard OS',
        desc: 'Workspace kreatif di browser untuk desainer dan developer dengan kanvas kolaboratif, audio visualizer, dan komponen UI modular yang playful.',
        tags: ['TypeScript', 'Canvas 2D', 'WebAudio', 'Design System'],
        highlights: [
          'Real-time Kolaborasi Multi-Kursor',
          'Custom Synth & Micro-interaction Sound',
          'Skor Performa Lighthouse 99/100'
        ],
        ctaText: 'Lihat Efek Visual Clay',
        ctaAction: 'sparkle'
      },
      {
        id: 'proj-arcade',
        tag: 'Mata Kanan • Game',
        label: 'bouncy.icat.dev',
        badgeCode: '03',
        theme: 'clay-theme-sunny',
        title: 'Bouncy Clay Arcade Mini-Games',
        desc: 'Koleksi mini-game berbasis fisika 2D dengan visual seperti mainan tanah liat (clay). Dibuat untuk menghibur pengunjung sambil memamerkan kemampuan animasi.',
        tags: ['Physics 2D', 'SVG Morph', 'Gamepad API', 'Creative Coding'],
        highlights: [
          'Dimainkan lebih dari 25.000+ pengunjung',
          'Mendukung Sentuhan Mobile & Keyboard',
          'Efek visual pop & squash-stretch kartun'
        ],
        ctaText: 'Mainkan Efek Partikel Clay',
        ctaAction: 'sparkle'
      },
      {
        id: 'proj-ai',
        tag: 'Mata Kanan • AI Tool',
        label: 'PromptCraft 3D',
        badgeCode: '04',
        theme: 'clay-theme-coral',
        title: 'PromptCraft Clay Icon Generator',
        desc: 'Generator aset ikon bergaya 3D Claymorphism otomatis untuk mempercepat pembuatan landing page yang unik dan penuh warna.',
        tags: ['Generative UI', 'WebGL Shaders', 'Color Palette', 'Export SVG/PNG'],
        highlights: [
          'Custom Pencahayaan Clay & Inner Shadow',
          'Ekspor instan ke CSS & Figma Token',
          'Dipakai oleh ratusan kreator indie'
        ],
        ctaText: 'Ganti Warna Robot Sekarang',
        ctaAction: 'color'
      }
    ],
    nose: [
      {
        id: 'about-icat',
        tag: 'Hidung • Profil',
        label: 'Siapa itu icat?',
        badgeCode: 'ME',
        theme: 'clay-theme-berry',
        title: 'Hai! Gua Icat',
        desc: 'Creative Frontend Developer & UI/UX Engineer yang suka bikin website kerasa hidup, fun, dan nggak membosankan kayak template biasa. Buat gua, web adalah taman bermain interaktif!',
        tags: ['Creative Developer', 'UI/UX Craftsman', 'Jakarta, ID', 'Coffee Lover'],
        highlights: [
          'Spesialis Web Interaktif, Animasi & Micro-interactions',
          'Fokus pada pengalaman pengguna yang memorable (100vh Craft)',
          'Suka kolaborasi buat produk digital yang berani tampil beda'
        ],
        ctaText: 'Sapa Icat Sekarang',
        ctaAction: 'talk'
      },
      {
        id: 'about-skills',
        tag: 'Hidung • Tech Stack',
        label: 'Senjata & Skill',
        badgeCode: 'SK',
        theme: 'clay-theme-mint',
        title: 'Tech Stack & Superpowers',
        desc: 'Kombinasi engineering yang rapi dengan sentuhan visual kartun/3D yang ekspresif di berbagai perangkat.',
        tags: ['JavaScript / TS', 'React & Next.js', 'CSS Art & Motion', 'Three.js / Canvas', 'Node.js', 'Figma'],
        highlights: [
          'Frontend Architecture & Custom Design System',
          'Physics-based UI Animation & Interactive Storytelling',
          'Responsif, Aksesibel, dan Super Ringan'
        ],
        ctaText: 'Ganti Tema Warna Clay',
        ctaAction: 'color'
      },
      {
        id: 'about-exp',
        tag: 'Hidung • Journey',
        label: 'Pengalaman Seru',
        badgeCode: 'XP',
        theme: 'clay-theme-sunny',
        title: 'Perjalanan & Pencapaian',
        desc: 'Selama beberapa tahun terakhir membangun aplikasi web, landing page interaktif, dan produk SaaS untuk startup maupun brand kreatif.',
        tags: ['4+ Tahun Ngoding', '30+ Proyek Selesai', 'Open Source', 'Design Engineering'],
        highlights: [
          'Lead Frontend untuk berbagai kampanye digital interaktif',
          'Mengubah desain statis menjadi pengalaman hidup 60fps',
          'Rajin berbagi eksperimen UI kreatif di komunitas'
        ],
        ctaText: 'Ganti Ekspresi Wajah',
        ctaAction: 'mood'
      }
    ],
    mouth: [
      {
        id: 'contact-wa',
        tag: 'Mulut • Fast Response',
        label: 'Ngobrol & Kolaborasi',
        badgeCode: 'HI',
        theme: 'clay-theme-mint',
        title: 'Yuk Bikin Sesuatu yang Keren!',
        desc: 'Punya ide website unik, butuh creative developer buat tim kamu, atau sekadar mau ngobrol soal web interaktif? Pintu selalu terbuka!',
        tags: ['Freelance', 'Full-time', 'Creative Collab', 'Mentoring'],
        highlights: [
          'Respon cepat via Email atau DM Sosial Media',
          'Bisa kerja Remote dari mana saja',
          'Selalu ada detail interaktif di tiap proyek'
        ],
        ctaText: 'Kirim Email ke halo@icat.dev',
        ctaLink: 'mailto:halo@icat.dev?subject=Hai%20Icat!%20Kolaborasi%20Yuk'
      },
      {
        id: 'contact-github',
        tag: 'Mulut • Code Lab',
        label: 'GitHub & Open Source',
        badgeCode: 'GH',
        theme: 'clay-theme-sky',
        title: 'Gudang Kode & Eksperimen Icat',
        desc: 'Intip source code, komponen UI eksperimental, dan repositori open-source yang gua racik di waktu luang.',
        tags: ['GitHub', 'CodePen', 'Open Source', 'Starter Kits'],
        highlights: [
          'Puluhan eksperimen animasi CSS & JS murni',
          'Clean code tanpa ketergantungan library berat',
          'Siap di-fork dan dipelajari kapan saja'
        ],
        ctaText: 'Buka GitHub (@icat)',
        ctaLink: 'https://github.com'
      },
      {
        id: 'contact-socials',
        tag: 'Mulut • Sosmed',
        label: 'Instagram & LinkedIn',
        badgeCode: 'SO',
        theme: 'clay-theme-berry',
        title: 'Terhubung di Sosial Media',
        desc: 'Follow keseharian ngoding, behind-the-scenes pembuatan desain claymorphism, dan tips web development seru.',
        tags: ['Instagram', 'LinkedIn', 'X / Twitter', 'Dribbble'],
        highlights: [
          'Update rutin eksplorasi UI/UX & Motion',
          'Networking santai sesama developer & kreator',
          'Klik mulut robot untuk toggle mode bicara'
        ],
        ctaText: 'Buat Robot Bicara',
        ctaAction: 'talk'
      }
    ]
  };

  // Bangun bar LED equalizer sekaligus Mini Synth / Kalimba 8-Bit untuk mulut robot
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('span');
    bar.className = 'voice-bar';
    bar.dataset.barIndex = String(i);

    bar.addEventListener('pointerenter', () => {
      if (!gateIsOpen || MOODS[state.moodIndex] === 'sleeping') return;
      pixelAudio.unlockAndStart();
      pixelAudio.playMouthSynthBar(i);
      bar.classList.add('is-plucked');
      setTimeout(() => bar.classList.remove('is-plucked'), 220);
    });

    voiceBarsContainer.appendChild(bar);
    bars.push(bar);
  }

  // State utama
  const state = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,

    pointerActive: false,
    lastPointerTime: 0,
    nextAutoLookTime: 0,
    autoLookSide: 1,

    talkingEnabled: true,
    isSpeakingBurst: true,
    nextSpeechToggleTime: performance.now() + 3400,
    speechEnergy: 0,
    speechPhase: 0,
    syllableTarget: 0.5,
    nextSyllableTime: 0,

    colorIndex: 0,
    moodIndex: 2,

    nextBlinkTime: performance.now() + 1800,
    blinkingLeft: false,
    blinkingRight: false,

    // Daftar tombol yang sudah jatuh di layar agar tidak saling tumpang tindih
    droppedButtons: []
  };

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // ==================== PARTIKEL SPARK CLAY ====================
  function spawnClaySparks(x, y, count = 8) {
    if (prefersReducedMotion) return;
    const sparkColors = ['#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8'];

    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'clay-spark';
      spark.style.left = `${x - 7}px`;
      spark.style.top = `${y - 7}px`;
      spark.style.background = sparkColors[i % sparkColors.length];
      document.body.appendChild(spark);

      const angle = (Math.PI * 2 * i) / count + randomRange(-0.25, 0.25);
      const dist = randomRange(36, 86);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - randomRange(10, 28);

      const anim = spark.animate(
        [
          { transform: 'translate3d(0, 0, 0) scale(0.4)', opacity: 1 },
          { transform: `translate3d(${dx * 0.6}px, ${dy - 18}px, 0) scale(1.15)`, opacity: 1, offset: 0.45 },
          { transform: `translate3d(${dx}px, ${dy + 34}px, 0) scale(0)`, opacity: 0 }
        ],
        {
          duration: randomRange(480, 720),
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }
      );

      anim.onfinish = () => spark.remove();
    }
  }

  // ==================== SISTEM JATUH ABSTRAK (TIDAK MENUTUPI WAJAH ROBOT) ====================
  function computeSafeAbstractSpot(btnWidth, btnHeight, preferredSide = 'any') {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const faceRect = clayFaceGroup.getBoundingClientRect();

    // Zona terlarang: area wajah robot + margin aman agar wajah sama sekali tidak tertutup
    const padX = Math.max(24, vw * 0.03);
    const padY = Math.max(18, vh * 0.025);
    const forbidden = {
      left: faceRect.left - padX,
      right: faceRect.right + padX,
      top: faceRect.top - padY * 1.5,
      bottom: faceRect.bottom + padY * 0.6
    };

    const marginSide = 18;
    const topLimit = 28;
    const bottomLimit = vh - 24 - btnHeight;

    // Kandidat zona aman: Kiri Wajah, Kanan Wajah, dan Area Bawah Wajah
    const candidateZones = [];

    // 1. Zona Samping Kiri Wajah
    const leftMaxX = forbidden.left - btnWidth - 8;
    if (leftMaxX > marginSide + 10) {
      candidateZones.push({
        side: 'left',
        minX: marginSide,
        maxX: leftMaxX,
        minY: Math.max(topLimit + 20, vh * 0.18),
        maxY: Math.min(bottomLimit, vh * 0.86)
      });
    }

    // 2. Zona Samping Kanan Wajah
    const rightMinX = forbidden.right + 8;
    if (vw - marginSide - btnWidth > rightMinX + 10) {
      candidateZones.push({
        side: 'right',
        minX: rightMinX,
        maxX: vw - marginSide - btnWidth,
        minY: Math.max(topLimit + 20, vh * 0.18),
        maxY: Math.min(bottomLimit, vh * 0.86)
      });
    }

    // 3. Zona Lantai Bawah Wajah (Kiri-Bawah & Kanan-Bawah & Bawah)
    const belowMinY = Math.min(bottomLimit - 4, Math.max(forbidden.bottom + 6, vh * 0.74));
    if (bottomLimit >= belowMinY) {
      candidateZones.push({
        side: 'bottom',
        minX: marginSide,
        maxX: Math.max(marginSide + 10, vw - marginSide - btnWidth),
        minY: belowMinY,
        maxY: bottomLimit
      });
    }

    // Fallback jika layar sangat sempit (misal HP portrait)
    if (candidateZones.length === 0) {
      candidateZones.push({
        side: 'bottom',
        minX: 12,
        maxX: Math.max(16, vw - btnWidth - 12),
        minY: Math.max(40, vh - btnHeight - 110),
        maxY: Math.max(60, vh - btnHeight - 24)
      });
    }

    let pools = candidateZones.filter((z) => preferredSide === 'any' || z.side === preferredSide);
    if (pools.length === 0) pools = candidateZones;

    let bestSpot = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 42; attempt++) {
      const zone = pools[Math.floor(Math.random() * pools.length)];
      const x = randomRange(zone.minX, Math.max(zone.minX, zone.maxX));
      const y = randomRange(zone.minY, Math.max(zone.minY, zone.maxY));

      const cx = x + btnWidth / 2;
      const cy = y + btnHeight / 2;
      const insideForbidden =
        cx > forbidden.left &&
        cx < forbidden.right &&
        cy > forbidden.top &&
        cy < forbidden.bottom;

      let minDistance = 9999;
      for (const existing of state.droppedButtons) {
        const dx = cx - existing.cx;
        const dy = cy - existing.cy;
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) minDistance = dist;
      }

      const score = (insideForbidden ? -5000 : 0) + Math.min(minDistance, 220) + randomRange(0, 25);
      if (score > bestScore) {
        bestScore = score;
        bestSpot = {
          x,
          y,
          angle: randomRange(-15, 15)
        };
      }
    }

    return bestSpot;
  }

  // Animasi keluar: melambung KE ATAS DIKIT dulu, lalu JATUH KE BAWAH dengan goyangan abstrak & memantul
  function animateButtonPopAndFall(btn, originX, originY, targetX, targetY, finalAngle, delayMs = 0) {
    const startX = originX - btn.offsetWidth / 2;
    const startY = originY - btn.offsetHeight / 2;

    // Titik puncak loncatan ke atas sedikit dari sumber klik (mata/hidung/mulut)
    const apexX = startX + (targetX - startX) * 0.34 + randomRange(-24, 24);
    const apexY = startY - randomRange(52, 92);

    // Titik tengah saat meluncur jatuh abstrak
    const midFallX = startX + (targetX - startX) * 0.78 + randomRange(-18, 18);
    const midFallY = apexY + (targetY - apexY) * 0.62;

    // Pantulan kecil saat mendarat
    const bounceY = targetY - randomRange(14, 24);
    const spinUp = randomRange(-22, 22);
    const spinMid = finalAngle + (finalAngle >= 0 ? 12 : -12);

    btn.style.transform = `translate3d(${startX}px, ${startY}px, 0) scale(0.2)`;
    btn.style.opacity = '0';

    if (prefersReducedMotion) {
      btn.style.opacity = '1';
      btn.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) rotate(${finalAngle}deg) scale(1)`;
      return;
    }

    const keyframes = [
      {
        transform: `translate3d(${startX.toFixed(1)}px, ${startY.toFixed(1)}px, 0) rotate(0deg) scale(0.25)`,
        opacity: 0,
        offset: 0
      },
      {
        // Naik ke atas dikit
        transform: `translate3d(${apexX.toFixed(1)}px, ${apexY.toFixed(1)}px, 0) rotate(${spinUp.toFixed(1)}deg) scale(1.08)`,
        opacity: 1,
        offset: 0.24
      },
      {
        // Meluncur jatuh ke bawah secara abstrak
        transform: `translate3d(${midFallX.toFixed(1)}px, ${midFallY.toFixed(1)}px, 0) rotate(${spinMid.toFixed(1)}deg) scale(1.02)`,
        opacity: 1,
        offset: 0.56
      },
      {
        // Menyentuh titik jatuh + squash clay
        transform: `translate3d(${targetX.toFixed(1)}px, ${(targetY + 6).toFixed(1)}px, 0) rotate(${(finalAngle * 1.15).toFixed(1)}deg) scale(1.08, 0.88)`,
        opacity: 1,
        offset: 0.78
      },
      {
        // Memantul sedikit ke atas
        transform: `translate3d(${targetX.toFixed(1)}px, ${bounceY.toFixed(1)}px, 0) rotate(${(finalAngle * 0.85).toFixed(1)}deg) scale(0.96, 1.05)`,
        opacity: 1,
        offset: 0.9
      },
      {
        // Posisi akhir abstrak
        transform: `translate3d(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px, 0) rotate(${finalAngle.toFixed(1)}deg) scale(1)`,
        opacity: 1,
        offset: 1
      }
    ];

    const anim = btn.animate(keyframes, {
      duration: randomRange(820, 1020),
      delay: delayMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    btn._fallAnim = anim;

    anim.onfinish = () => {
      // Hentikan fill: 'forwards' supaya inline style.transform bisa dipakai saat tombol di-drag!
      anim.cancel();
      btn._fallAnim = null;
      btn.style.opacity = '1';
      btn.style.transform = `translate3d(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px, 0) rotate(${finalAngle.toFixed(1)}deg)`;
    };
  }

  // Daftar variasi bentuk clay unik (tanpa circle di samping teks)
  const CLAY_SHAPES = [
    'clay-shape-pebble',
    'clay-shape-splat',
    'clay-shape-ticket',
    'clay-shape-cloud',
    'clay-shape-gem',
    'clay-shape-wave'
  ];

  // Hapus tombol dari fitur sebelumnya dengan efek MEMERAH ERROR + GLITCHING
  function glitchRemoveOtherButtons(activeGroupId) {
    const toRemove = state.droppedButtons.filter((b) => b.groupId !== activeGroupId);
    if (toRemove.length === 0) return;

    state.droppedButtons = state.droppedButtons.filter((b) => b.groupId === activeGroupId);
    pixelAudio.playGlitchDestroy();

    toRemove.forEach((record, idx) => {
      const btn = record.el;
      if (!btn) return;
      btn.classList.add('is-glitch-removing');

      const bx = record.x;
      const by = record.y;
      const ba = record.angle;

      if (prefersReducedMotion) {
        btn.remove();
        return;
      }

      const glitchKeyframes = [
        {
          transform: `translate3d(${bx}px, ${by}px, 0) rotate(${ba}deg) scale(1)`,
          opacity: 1,
          offset: 0
        },
        {
          transform: `translate3d(${bx - 14}px, ${by + 4}px, 0) rotate(${ba - 8}deg) skewX(18deg) scale(1.08, 0.88)`,
          opacity: 1,
          offset: 0.18
        },
        {
          transform: `translate3d(${bx + 16}px, ${by - 6}px, 0) rotate(${ba + 10}deg) skewX(-20deg) scale(0.92, 1.12)`,
          opacity: 0.85,
          offset: 0.36
        },
        {
          transform: `translate3d(${bx - 10}px, ${by + 8}px, 0) rotate(${ba - 12}deg) skewX(15deg) scale(1.14, 0.75)`,
          opacity: 0.95,
          offset: 0.56
        },
        {
          transform: `translate3d(${bx + 12}px, ${by - 3}px, 0) rotate(${ba + 6}deg) skewX(-14deg) scale(1.25, 0.35)`,
          opacity: 0.5,
          offset: 0.78
        },
        {
          transform: `translate3d(${bx}px, ${by + 16}px, 0) rotate(${ba}deg) scale(0.05)`,
          opacity: 0,
          offset: 1
        }
      ];

      const anim = btn.animate(glitchKeyframes, {
        duration: 390,
        delay: idx * 40,
        easing: 'steps(6, end)',
        fill: 'forwards'
      });

      anim.onfinish = () => btn.remove();
    });
  }

  // Pasang interaksi Drag & Feed the Robot pada setiap tombol yang keluar
  function attachDragAndFeedToButton(btn, item) {
    let isDragging = false;
    let hasMoved = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let origX = 0;
    let origY = 0;

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();
      const record = state.droppedButtons.find((b) => b.id === item.id);
      if (!record) return;

      // Batalkan semua Web Animations yang masih nempel (fill: forwards) agar tombol bisa bebas di-drag
      if (btn._fallAnim) {
        btn._fallAnim.cancel();
        btn._fallAnim = null;
      }
      if (typeof btn.getAnimations === 'function') {
        btn.getAnimations().forEach((a) => a.cancel());
      }

      isDragging = true;
      hasMoved = false;
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      origX = record.x;
      origY = record.y;

      btn.style.opacity = '1';
      btn.style.transform = `translate3d(${origX.toFixed(1)}px, ${origY.toFixed(1)}px, 0) rotate(${record.angle.toFixed(1)}deg)`;

      btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      if (Math.hypot(dx, dy) > 6) {
        hasMoved = true;
        btn.classList.add('is-dragging');
      }
      if (!hasMoved) return;

      const record = state.droppedButtons.find((b) => b.id === item.id);
      if (!record) return;

      const newX = origX + dx;
      const newY = origY + dy;
      record.x = newX;
      record.y = newY;
      record.cx = newX + record.w / 2;
      record.cy = newY + record.h / 2;

      btn.style.transform = `translate3d(${newX.toFixed(1)}px, ${newY.toFixed(1)}px, 0) rotate(0deg) scale(1.06)`;

      // Cek apakah tombol didekatkan ke mulut robot ("Feed the Robot")
      const mouthRect = mouth.getBoundingClientRect();
      const mCx = mouthRect.left + mouthRect.width / 2;
      const mCy = mouthRect.top + mouthRect.height / 2;
      const distToMouth = Math.hypot(record.cx - mCx, record.cy - mCy);

      if (distToMouth < 110) {
        mouth.classList.add('is-hungry-open');
      } else {
        mouth.classList.remove('is-hungry-open');
      }
    });

    function finishDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      btn.classList.remove('is-dragging');
      mouth.classList.remove('is-hungry-open');

      const record = state.droppedButtons.find((b) => b.id === item.id);
      if (!record) return;

      // Jika hanya diklik tanpa digeser -> langsung buka modal kartu portofolio
      if (!hasMoved) {
        openPortfolioModal(item);
        return;
      }

      // Cek apakah dilepas di dekat mulut robot -> Mulut mengunyah tombol lalu buka modal!
      const mouthRect = mouth.getBoundingClientRect();
      const mCx = mouthRect.left + mouthRect.width / 2;
      const mCy = mouthRect.top + mouthRect.height / 2;
      const distToMouth = Math.hypot(record.cx - mCx, record.cy - mCy);

      if (distToMouth < 115) {
        pixelAudio.playMouthChomp();
        mouth.classList.remove('is-chomping');
        void mouth.offsetWidth;
        mouth.classList.add('is-chomping');
        spawnClaySparks(mCx, mCy, 12);

        state.droppedButtons = state.droppedButtons.filter((b) => b.id !== item.id);
        const eatAnim = btn.animate(
          [
            { transform: `translate3d(${record.x}px, ${record.y}px, 0) scale(1.05)`, opacity: 1 },
            { transform: `translate3d(${mCx - record.w / 2}px, ${mCy - record.h / 2}px, 0) rotate(25deg) scale(0.1)`, opacity: 0 }
          ],
          { duration: 240, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
        );
        eatAnim.onfinish = () => {
          btn.remove();
          openPortfolioModal(item);
        };
      } else {
        // Jika dilepas di tempat lain namun menutupi area wajah, geser halus ke titik aman terdekat
        const faceRect = clayFaceGroup.getBoundingClientRect();
        const pad = 16;
        const insideFace =
          record.cx > faceRect.left - pad &&
          record.cx < faceRect.right + pad &&
          record.cy > faceRect.top - pad &&
          record.cy < faceRect.bottom + pad;

        if (insideFace) {
          const safeSpot = computeSafeAbstractSpot(record.w, record.h, 'any');
          record.x = safeSpot.x;
          record.y = safeSpot.y;
          record.angle = safeSpot.angle;
          record.cx = safeSpot.x + record.w / 2;
          record.cy = safeSpot.y + record.h / 2;
        }
        btn.style.transform = `translate3d(${record.x.toFixed(1)}px, ${record.y.toFixed(1)}px, 0) rotate(${record.angle.toFixed(1)}deg)`;
      }
    }

    btn.addEventListener('pointerup', finishDrag);
    btn.addEventListener('pointercancel', finishDrag);
  }

  // Spawn atau pantulkan ulang grup tombol dari Mata / Hidung / Mulut
  function dropButtonsFromFeature(categoryKey, sourceElement, preferredSide = 'any', filterIndices = null, groupId = categoryKey) {
    const items = PORTFOLIO_DATA[categoryKey];
    if (!items) return;

    // Jika user klik fitur berbeda (misal habis klik mata lalu klik hidung), tombol fitur sebelumnya memerah & glitch hilang!
    glitchRemoveOtherButtons(groupId);

    const rect = sourceElement.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    spawnClaySparks(originX, originY, 9);

    const selectedItems = filterIndices
      ? items.filter((_, idx) => filterIndices.includes(idx))
      : items;

    selectedItems.forEach((item, index) => {
      let existingRecord = state.droppedButtons.find((b) => b.id === item.id);
      let btn;
      const shapeClass = CLAY_SHAPES[(index + categoryKey.length) % CLAY_SHAPES.length];

      if (existingRecord) {
        btn = existingRecord.el;
        state.droppedButtons = state.droppedButtons.filter((b) => b.id !== item.id);
      } else {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `clay-drop-btn ${shapeClass}`;
        btn.dataset.itemId = item.id;
        btn.innerHTML = `
          <span class="drop-btn-tag">${item.tag}</span>
          <span class="drop-btn-label">${item.label}</span>
        `;

        attachDragAndFeedToButton(btn, item);
        droppedLayer.appendChild(btn);
      }

      const bw = btn.offsetWidth || 190;
      const bh = btn.offsetHeight || 58;

      let sideHint = preferredSide;
      if (sideHint === 'any') {
        const sides = ['left', 'right', 'bottom'];
        sideHint = sides[(index + state.droppedButtons.length) % sides.length];
      }

      const spot = computeSafeAbstractSpot(bw, bh, sideHint);

      state.droppedButtons.push({
        id: item.id,
        groupId,
        el: btn,
        x: spot.x,
        y: spot.y,
        angle: spot.angle,
        w: bw,
        h: bh,
        cx: spot.x + bw / 2,
        cy: spot.y + bh / 2
      });

      pixelAudio.playButtonJumpAndDrop(index * 0.095);
      animateButtonPopAndFall(btn, originX, originY, spot.x, spot.y, spot.angle, index * 95);
    });
  }

  // ==================== MODAL DETAIL PORTOFOLIO ====================
  function openPortfolioModal(item) {
    pixelAudio.playModalOpen();
    modalBadge.textContent = item.tag;
    modalIcon.textContent = item.badgeCode || '01';
    modalTitle.textContent = item.title;
    modalDesc.textContent = item.desc;

    modalTags.innerHTML = '';
    item.tags.forEach((t) => {
      const span = document.createElement('span');
      span.className = 'modal-tag';
      span.textContent = t;
      modalTags.appendChild(span);
    });

    modalExtra.innerHTML = '';
    if (item.highlights && item.highlights.length > 0) {
      const box = document.createElement('div');
      box.className = 'modal-extra-box';
      item.highlights.forEach((line) => {
        const p = document.createElement('div');
        p.textContent = `• ${line}`;
        box.appendChild(p);
      });
      modalExtra.appendChild(box);
    }

    modalFooter.innerHTML = '';
    if (item.ctaLink) {
      const link = document.createElement('a');
      link.className = 'modal-cta-btn';
      link.href = item.ctaLink;
      link.target = item.ctaLink.startsWith('http') ? '_blank' : '_self';
      link.rel = 'noopener noreferrer';
      link.textContent = item.ctaText || 'Buka Tautan';
      modalFooter.appendChild(link);
    } else if (item.ctaAction) {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'modal-cta-btn';
      actionBtn.textContent = item.ctaText || 'Interaksi Robot';
      actionBtn.addEventListener('click', () => {
        closePortfolioModal();
        runModalAction(item.ctaAction);
      });
      modalFooter.appendChild(actionBtn);
    }

    modalBackdrop.hidden = false;
  }

  function closePortfolioModal() {
    if (!modalBackdrop.hidden) {
      pixelAudio.playModalClose();
    }
    modalBackdrop.hidden = true;
  }

  function runModalAction(action) {
    if (action === 'color') {
      cycleColor();
    } else if (action === 'mood') {
      cycleMood();
    } else if (action === 'talk') {
      state.talkingEnabled = true;
      state.isSpeakingBurst = true;
      state.nextSpeechToggleTime = performance.now() + 4500;
    } else if (action === 'sparkle') {
      const rect = clayFaceGroup.getBoundingClientRect();
      spawnClaySparks(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
    }
  }

  modalCloseBtn.addEventListener('click', closePortfolioModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closePortfolioModal();
  });

  // ==================== KEDIP MATA ====================
  function blinkEyes(target = 'both', allowDouble = false) {
    const closeDuration = 130;

    if (target === 'both' || target === 'left') {
      if (!state.blinkingLeft) {
        state.blinkingLeft = true;
        eyeLeft.classList.add('is-blinking');
        setTimeout(() => {
          eyeLeft.classList.remove('is-blinking');
          state.blinkingLeft = false;
        }, closeDuration);
      }
    }

    if (target === 'both' || target === 'right') {
      if (!state.blinkingRight) {
        state.blinkingRight = true;
        eyeRight.classList.add('is-blinking');
        setTimeout(() => {
          eyeRight.classList.remove('is-blinking');
          state.blinkingRight = false;
        }, closeDuration);
      }
    }

    if (allowDouble && Math.random() < 0.24) {
      setTimeout(() => {
        blinkEyes(target, false);
      }, closeDuration + 150);
    }
  }

  // ==================== MELIHAT KANAN KIRI OTOMATIS ====================
  function pickNextAutoLook(now) {
    const roll = Math.random();
    if (roll < 0.72) {
      state.autoLookSide = -state.autoLookSide;
      state.targetX = state.autoLookSide * randomRange(0.55, 0.95);
      state.targetY = randomRange(-0.22, 0.2);
    } else {
      state.targetX = randomRange(-0.18, 0.18);
      state.targetY = randomRange(-0.15, 0.15);
    }

    state.nextAutoLookTime = now + randomRange(1100, 2600);
  }

  // ==================== ANIMASI UTAMA ====================
  function animate(now) {
    if (state.pointerActive && now - state.lastPointerTime > 2400) {
      state.pointerActive = false;
      pickNextAutoLook(now);
    }

    if (!state.pointerActive && now >= state.nextAutoLookTime) {
      pickNextAutoLook(now);
    }

    const eyeLerp = state.pointerActive ? 0.16 : 0.085;
    state.currentX += (state.targetX - state.currentX) * eyeLerp;
    state.currentY += (state.targetY - state.currentY) * eyeLerp;

    const maxMoveX = eyeLeft.clientWidth * 0.18;
    const maxMoveY = eyeLeft.clientHeight * 0.16;
    const tx = state.currentX * maxMoveX;
    const ty = state.currentY * maxMoveY;

    const pupilTransform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    pupilLeft.style.transform = pupilTransform;
    pupilRight.style.transform = pupilTransform;

    face.style.setProperty('--look-x', state.currentX.toFixed(3));
    face.style.setProperty('--look-y', state.currentY.toFixed(3));

    const isSleeping = MOODS[state.moodIndex] === 'sleeping';
    const isKissing = MOODS[state.moodIndex] === 'kissing';

    if (!isSleeping && !isKissing && now >= state.nextBlinkTime) {
      blinkEyes('both', true);
      state.nextBlinkTime = now + randomRange(2200, 5200);
    }

    if (state.talkingEnabled && !isSleeping && !isKissing) {
      if (now >= state.nextSpeechToggleTime) {
        state.isSpeakingBurst = !state.isSpeakingBurst;
        state.nextSpeechToggleTime = now + (state.isSpeakingBurst
          ? randomRange(2200, 4600)
          : randomRange(650, 1400));
      }

      if (state.isSpeakingBurst) {
        if (now >= state.nextSyllableTime) {
          state.syllableTarget = randomRange(0.28, 1.0);
          state.nextSyllableTime = now + randomRange(85, 190);
          if (gateIsOpen && Math.random() < 0.65) {
            pixelAudio.playRobotSyllable();
          }
        }
      } else {
        state.syllableTarget = 0.08;
      }
    } else {
      state.syllableTarget = 0.02;
    }

    const energyLerp = state.syllableTarget > state.speechEnergy ? 0.28 : 0.18;
    state.speechEnergy += (state.syllableTarget - state.speechEnergy) * energyLerp;
    state.speechPhase += prefersReducedMotion ? 0.04 : 0.19;

    const centerIndex = (BAR_COUNT - 1) / 2;
    for (let i = 0; i < BAR_COUNT; i++) {
      const distFromCenter = Math.abs(i - centerIndex) / centerIndex;
      const envelope = 1 - distFromCenter * 0.62;
      const wave =
        Math.sin(state.speechPhase + i * 0.72) * 0.5 +
        Math.cos(state.speechPhase * 1.45 - i * 0.48) * 0.5;
      const normalizedWave = (wave + 1) * 0.5;

      const isMouthClosed = isSleeping || isKissing || !state.talkingEnabled;
      const baseIdle = isMouthClosed
        ? 8
        : state.moodIndex === 1
          ? 16 + distFromCenter * 10
          : 16;

      const activeHeight = isMouthClosed ? 0 : state.speechEnergy * envelope * (28 + normalizedWave * 56);
      const heightPct = Math.min(92, Math.max(8, baseIdle + activeHeight));

      bars[i].style.height = `${heightPct.toFixed(1)}%`;
      bars[i].style.opacity = (0.65 + (heightPct / 100) * 0.35).toFixed(2);
    }

    if (!isSleeping && !isKissing && state.talkingEnabled) {
      const mouthFlex = 1 + state.speechEnergy * 0.055;
      mouthRim.style.transform = `scaleY(${mouthFlex.toFixed(3)})`;
    } else {
      mouthRim.style.transform = '';
    }

    const ledOpacity = 0.55 + state.speechEnergy * 0.45;
    noseLed.style.opacity = ledOpacity.toFixed(2);
    noseLed.style.transform = `scaleY(${(0.85 + state.speechEnergy * 0.35).toFixed(2)})`;

    requestAnimationFrame(animate);
  }

  // ==================== DETEKSI KURSOR DIPUTAR-PUTAR -> ROBOT PUSING (DIZZY SPIRAL) ====================
  const dizzyTracker = {
    lastAngle: null,
    accumulatedAngle: 0,
    lastMoveTime: 0,
    dizzyTimeout: null,
    isDizzy: false
  };

  function checkPointerDizzySpin(clientX, clientY) {
    if (!gateIsOpen || dizzyTracker.isDizzy || MOODS[state.moodIndex] === 'sleeping') return;
    const now = performance.now();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    // Abaikan jika pointer terlalu dekat titik pusat
    if (Math.hypot(dx, dy) < 45) return;

    const angle = Math.atan2(dy, dx);
    if (dizzyTracker.lastAngle !== null && now - dizzyTracker.lastMoveTime < 220) {
      let delta = angle - dizzyTracker.lastAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      dizzyTracker.accumulatedAngle = dizzyTracker.accumulatedAngle * 0.96 + delta;

      // Jika kursor diputar ~2.5 putaran cepat mengelilingi wajah robot
      if (Math.abs(dizzyTracker.accumulatedAngle) > Math.PI * 4.8) {
        triggerDizzyMode();
      }
    } else {
      dizzyTracker.accumulatedAngle = 0;
    }

    dizzyTracker.lastAngle = angle;
    dizzyTracker.lastMoveTime = now;
  }

  function triggerDizzyMode() {
    dizzyTracker.isDizzy = true;
    dizzyTracker.accumulatedAngle = 0;
    const prevMood = MOODS[state.moodIndex] || 'thinking';
    face.dataset.mood = 'dizzy';
    if (hudMoodCode) hudMoodCode.textContent = 'DZY';
    pixelAudio.playDizzySwirl();

    clearTimeout(dizzyTracker.dizzyTimeout);
    dizzyTracker.dizzyTimeout = setTimeout(() => {
      dizzyTracker.isDizzy = false;
      if (face.dataset.mood === 'dizzy') {
        face.dataset.mood = prevMood;
        updateHudMoodBadge();
      }
    }, 3200);
  }

  // ==================== INTERAKSI KLIK MATA, HIDUNG, MULUT ====================
  function updatePointerLook(clientX, clientY) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const nx = Math.max(-1, Math.min(1, (clientX - cx) / (window.innerWidth * 0.42)));
    const ny = Math.max(-1, Math.min(1, (clientY - cy) / (window.innerHeight * 0.42)));

    state.targetX = nx;
    state.targetY = ny;
    state.pointerActive = true;
    state.lastPointerTime = performance.now();
    checkPointerDizzySpin(clientX, clientY);
  }

  window.addEventListener('pointermove', (e) => {
    pixelAudio.unlockAndStart();
    updatePointerLook(e.clientX, e.clientY);
  });

  window.addEventListener('pointerdown', (e) => {
    pixelAudio.unlockAndStart();
    updatePointerLook(e.clientX, e.clientY);
  });

  window.addEventListener('pointerleave', () => {
    state.pointerActive = false;
    state.nextAutoLookTime = performance.now() + 400;
  });

  // ==================== DETEKSI SPAM CLICK (MEMBESAR + MERAH + "SAKITT WOII!!") ====================
  const spamTracker = {
    timestamps: [],
    painTimeout: null,
    isPainActive: false
  };

  function registerFeatureClickAndCheckSpam(targetEl) {
    const now = performance.now();
    // Simpan riwayat klik dalam rentang 1.35 detik terakhir
    spamTracker.timestamps = spamTracker.timestamps.filter((t) => now - t < 1350);
    spamTracker.timestamps.push(now);

    // Jika user spam klik >= 4 kali dengan cepat di mata/hidung/mulut
    if (spamTracker.timestamps.length >= 4) {
      triggerPainRageMode(targetEl);
      return true;
    }
    return false;
  }

  function triggerPainRageMode(targetEl) {
    // Jika robot sedang tidur, paksa bangun karena kesakitan
    if (MOODS[state.moodIndex] === 'sleeping') {
      state.moodIndex = MOODS.indexOf('surprised');
      face.dataset.mood = 'surprised';
      mouth.classList.remove('is-closed');
    }

    spamTracker.isPainActive = true;
    document.body.classList.add('is-pain-rage');

    // Besarkan bagian yang di-spam click (dan seluruh fitur utama bila terus di-spam)
    [eyeLeft, eyeRight, nose, mouth].forEach((el) => el.classList.remove('is-swollen-pain'));
    if (targetEl) {
      targetEl.classList.add('is-swollen-pain');
    }
    if (spamTracker.timestamps.length >= 6) {
      [eyeLeft, eyeRight, nose, mouth].forEach((el) => el.classList.add('is-swollen-pain'));
    }

    // Tampilkan Shape Abstrak Warning "SAKITT WOII!!"
    if (painAlertOverlay) {
      painAlertOverlay.classList.add('is-active');
      painAlertOverlay.setAttribute('aria-hidden', 'false');
    }

    // Mulut berteriak penuh & bunyikan alarm 8-bit
    state.talkingEnabled = true;
    state.isSpeakingBurst = true;
    state.syllableTarget = 1.0;
    state.nextSpeechToggleTime = performance.now() + 2800;
    pixelAudio.playPainAlarm();

    clearTimeout(spamTracker.painTimeout);
    spamTracker.painTimeout = setTimeout(() => {
      spamTracker.isPainActive = false;
      spamTracker.timestamps = [];
      document.body.classList.remove('is-pain-rage');
      [eyeLeft, eyeRight, nose, mouth].forEach((el) => el.classList.remove('is-swollen-pain'));
      if (painAlertOverlay) {
        painAlertOverlay.classList.remove('is-active');
        painAlertOverlay.setAttribute('aria-hidden', 'true');
      }
    }, 2600);
  }

  // 1. Klik Mata Kiri -> Jika masih di Gate, rakit robot dulu! Jika sudah menyatu, cek spam & jatuhkan tombol
  eyeLeft.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gateIsOpen) {
      openCircularGate();
      return;
    }
    registerFeatureClickAndCheckSpam(eyeLeft);
    blinkEyes('left');
    dropButtonsFromFeature('eyes', eyeLeft, 'left', [0, 1], 'eyeLeft');
  });

  // 2. Klik Mata Kanan -> Jika masih di Gate, rakit robot dulu! Jika sudah menyatu, cek spam & jatuhkan tombol
  eyeRight.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gateIsOpen) {
      openCircularGate();
      return;
    }
    registerFeatureClickAndCheckSpam(eyeRight);
    blinkEyes('right');
    dropButtonsFromFeature('eyes', eyeRight, 'right', [2, 3], 'eyeRight');
  });

  eyeLeft.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      eyeLeft.click();
    }
  });

  eyeRight.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      eyeRight.click();
    }
  });

  // 3. Klik Hidung -> Jika masih di Gate, rakit robot dulu! Jika sudah menyatu, ganti warna & jatuhkan tombol
  function cycleColor() {
    state.colorIndex = (state.colorIndex + 1) % COLORS.length;
    const nextColor = COLORS[state.colorIndex];
    face.dataset.color = nextColor;
    document.body.dataset.color = nextColor;
    pixelAudio.playColorCoin();
  }

  function setMood(moodName) {
    const idx = MOODS.indexOf(moodName);
    if (idx === -1) return;
    state.moodIndex = idx;
    face.dataset.mood = moodName;

    const isSleeping = moodName === 'sleeping';
    const isKissing = moodName === 'kissing';
    if (isSleeping) {
      state.talkingEnabled = false;
      mouth.classList.add('is-closed');
      mouth.setAttribute('aria-pressed', 'false');
      document.body.classList.add('is-dark-sleep');
      pixelAudio.playSleepSound();
    } else if (isKissing) {
      state.talkingEnabled = false;
      mouth.classList.remove('is-closed');
      mouth.setAttribute('aria-pressed', 'false');
      document.body.classList.remove('is-dark-sleep');
      pixelAudio.playKissSound();
    } else {
      state.talkingEnabled = true;
      mouth.classList.remove('is-closed');
      mouth.setAttribute('aria-pressed', 'true');
      document.body.classList.remove('is-dark-sleep');
      blinkEyes('both');
      pixelAudio.playMoodChange();
    }

    if (wakeSleepBtn && wakeSleepLabel) {
      wakeSleepBtn.classList.toggle('is-sleeping', isSleeping);
      wakeSleepBtn.setAttribute('aria-pressed', String(isSleeping));
      wakeSleepLabel.textContent = isSleeping ? 'SLEEP' : 'WAKE';
    }
    updateHudMoodBadge();
  }

  function cycleMood() {
    const nextIdx = (state.moodIndex + 1) % MOODS.length;
    setMood(MOODS[nextIdx]);
  }

  nose.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gateIsOpen) {
      openCircularGate();
      return;
    }
    registerFeatureClickAndCheckSpam(nose);
    cycleColor();
    dropButtonsFromFeature('nose', nose, 'any');
  });

  // 4. Klik Mulut -> Jika masih di Gate, rakit robot dulu! Jika sudah menyatu, toggle mulut menutup/tidur vs bangun/bicara & jatuhkan tombol
  mouth.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gateIsOpen) {
      openCircularGate();
      return;
    }

    const isSpamming = registerFeatureClickAndCheckSpam(mouth);
    if (!isSpamming) {
      const currentMood = MOODS[state.moodIndex];
      if (currentMood !== 'kissing' && currentMood !== 'sleeping') {
        // Klik mulut pertama: ekspresi mencium ("Chu~!")
        setMood('kissing');
      } else if (currentMood === 'kissing') {
        // Klik mulut lagi dari mencium: masuk ke mode tidur
        setMood('sleeping');
      } else {
        // Klik mulut saat tidur: bangunkan kembali ke mode berpikir/bicara
        setMood('thinking');
        state.isSpeakingBurst = true;
        state.nextSpeechToggleTime = performance.now() + 3400;
      }
    }

    dropButtonsFromFeature('mouth', mouth, 'bottom');
  });

  // Klik Antena -> Jika masih di Gate, rakit robot dulu! Jika sudah menyatu, ganti mood
  clayAntenna.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gateIsOpen) {
      openCircularGate();
      return;
    }
    cycleMood();
  });

  // Klik area kosong -> kedip mata
  document.body.addEventListener('click', () => {
    blinkEyes('both');
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalBackdrop.hidden) {
      closePortfolioModal();
      return;
    }
    if (e.target !== document.body) return;
    if (e.code === 'Space') {
      e.preventDefault();
      mouth.click();
    } else if (e.key === 'b' || e.key === 'B') {
      blinkEyes('both');
    } else if (e.key === 'c' || e.key === 'C') {
      cycleColor();
    } else if (e.key === 'm' || e.key === 'M') {
      cycleMood();
    } else if (e.key === 's' || e.key === 'S') {
      setMood(MOODS[state.moodIndex] === 'sleeping' ? 'thinking' : 'sleeping');
    } else if (e.key === 'g' || e.key === 'G') {
      togglePixelSunglasses();
    } else if (e.key === 'k' || e.key === 'K') {
      setMood(MOODS[state.moodIndex] === 'kissing' ? 'thinking' : 'kissing');
    }
  });

  // Saat ukuran layar berubah, pastikan tombol yang sudah jatuh tetap berada di luar zona wajah
  window.addEventListener('resize', () => {
    if (state.droppedButtons.length === 0) return;
    const currentItems = [...state.droppedButtons];
    state.droppedButtons = [];
    currentItems.forEach((record) => {
      const spot = computeSafeAbstractSpot(record.w, record.h, 'any');
      record.x = spot.x;
      record.y = spot.y;
      record.angle = spot.angle;
      record.cx = spot.x + record.w / 2;
      record.cy = spot.y + record.h / 2;
      record.el.style.transform = `translate3d(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px, 0) rotate(${spot.angle.toFixed(1)}deg)`;
      state.droppedButtons.push(record);
    });
  });

  // ==================== KOMPONEN ROBOT TERPECAH BELAH DI GATE -> MENYATU SAAT TRANSISI ====================
  let gateIsOpen = false;
  const eyebrowLeft = document.querySelector('.eyebrow-left');
  const eyebrowRight = document.querySelector('.eyebrow-right');
  const cheekLeft = document.querySelector('.cheek-left');
  const cheekRight = document.querySelector('.cheek-right');
  const noseWrap = document.querySelector('.nose-wrap');
  const mouthWrap = document.querySelector('.mouth-wrap');

  // Daftar 9 komponen muka robot yang terpecah belah di berbagai penjuru layar saat di Gate
  const robotParts = [
    { el: clayAntenna, tx: '-26vw', ty: '-22vh', rot: -32, scale: 1.25, delay: 0 },
    { el: eyebrowLeft, tx: '-8vw', ty: '-30vh', rot: -28, scale: 1.15, delay: 40 },
    { el: eyebrowRight, tx: '16vw', ty: '-28vh', rot: 34, scale: 1.15, delay: 70 },
    { el: eyeLeft, tx: '-31vw', ty: '-4vh', rot: -18, scale: 0.94, delay: 20 },
    { el: eyeRight, tx: '31vw', ty: '-5vh', rot: 20, scale: 0.94, delay: 50 },
    { el: cheekLeft, tx: '-34vw', ty: '18vh', rot: -25, scale: 1.2, delay: 90 },
    { el: cheekRight, tx: '34vw', ty: '17vh', rot: 25, scale: 1.2, delay: 110 },
    { el: noseWrap, tx: '-24vw', ty: '24vh', rot: 28, scale: 1.15, delay: 60 },
    { el: mouthWrap, tx: '23vw', ty: '21vh', rot: -16, scale: 0.9, delay: 80 }
  ];

  let floatingAnims = [];

  // Sebarkan komponen-komponen wajah robot ke berbagai penjuru di atas Gate
  function scatterRobotPartsOnGate() {
    floatingAnims.forEach((a) => a.cancel());
    floatingAnims = [];

    robotParts.forEach((part, idx) => {
      if (!part.el) return;
      const baseTransform = `translate3d(${part.tx}, ${part.ty}, 0) rotate(${part.rot}deg) scale(${part.scale})`;
      const floatTransform = `translate3d(calc(${part.tx} + ${(idx % 2 === 0 ? 10 : -10)}px), calc(${part.ty} - 14px), 0) rotate(${part.rot + (idx % 2 === 0 ? 8 : -8)}deg) scale(${(part.scale * 1.04).toFixed(2)})`;

      part.el.style.transform = baseTransform;

      if (!prefersReducedMotion) {
        const anim = part.el.animate(
          [
            { transform: baseTransform },
            { transform: floatTransform }
          ],
          {
            duration: 2200 + idx * 190,
            direction: 'alternate',
            iterations: Infinity,
            easing: 'ease-in-out'
          }
        );
        floatingAnims.push(anim);
      }
    });
  }

  // Satukan seluruh komponen wajah robot dari posisi terpecah-belah menuju posisi wajah robot utuh!
  function openCircularGate() {
    if (gateIsOpen || !circularGate) return;
    gateIsOpen = true;

    pixelAudio.unlockAndStart();
    pixelAudio.playGateAssemble();

    // 1. Buka shade / blob gerbang
    circularGate.classList.add('is-opening');
    document.body.classList.add('gate-opened');

    // 2. Hentikan animasi mengambang, lalu luncurkan tiap komponen menyatu ke posisi aslinya (0, 0) dengan efek pegas clay
    floatingAnims.forEach((a) => a.cancel());
    floatingAnims = [];

    robotParts.forEach((part) => {
      if (!part.el) return;
      const startTransform = `translate3d(${part.tx}, ${part.ty}, 0) rotate(${part.rot}deg) scale(${part.scale})`;
      const overshootTransform = `translate3d(0px, 4px, 0) rotate(${(part.rot * -0.12).toFixed(1)}deg) scale(1.08, 0.92)`;
      const settleTransform = 'translate3d(0px, 0px, 0) rotate(0deg) scale(1)';

      if (prefersReducedMotion) {
        part.el.style.transform = '';
        return;
      }

      const assembleAnim = part.el.animate(
        [
          { transform: startTransform, offset: 0 },
          { transform: overshootTransform, offset: 0.78 },
          { transform: settleTransform, offset: 1 }
        ],
        {
          duration: 980,
          delay: part.delay,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        }
      );

      assembleAnim.onfinish = () => {
        assembleAnim.cancel();
        part.el.style.transform = '';
      };
    });

    // 3. Partikel clay pop + kedip mata saat seluruh komponen bertemu di tengah
    setTimeout(() => {
      const rect = clayFaceGroup.getBoundingClientRect();
      spawnClaySparks(rect.left + rect.width / 2, rect.top + rect.height / 2, 14);
      blinkEyes('both', true);
      state.talkingEnabled = true;
      state.isSpeakingBurst = true;
      state.nextSpeechToggleTime = performance.now() + 3600;
    }, 760);

    setTimeout(() => {
      circularGate.classList.add('is-hidden');
    }, 1250);
  }

  if (gateEnterBtn) {
    gateEnterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCircularGate();
    });
  }

  if (circularGate) {
    circularGate.addEventListener('click', () => {
      openCircularGate();
    });
  }

  // Hover sound 8-bit tipis di komponen utama
  [eyeLeft, eyeRight, nose, mouth, clayAntenna, gateEnterBtn, wakeSleepBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener('pointerenter', () => {
      pixelAudio.playHoverBlip();
    });
  });

  // Tombol Toggle Wake & Sleep (Light Mode / Dark Mode) di Sebelah Kiri SFX
  if (wakeSleepBtn) {
    wakeSleepBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pixelAudio.unlockAndStart();
      if (!gateIsOpen) {
        openCircularGate();
      }
      const isCurrentlySleeping = MOODS[state.moodIndex] === 'sleeping';
      setMood(isCurrentlySleeping ? 'thinking' : 'sleeping');
    });
  }

  // Tombol Toggle Sound ON / OFF di Pojok Kanan Bawah
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowOn = pixelAudio.toggleSound();
      soundToggleBtn.setAttribute('aria-pressed', String(isNowOn));
      soundToggleBtn.classList.toggle('is-muted', !isNowOn);
      if (soundToggleLabel) {
        soundToggleLabel.textContent = isNowOn ? 'SFX ON' : 'SFX OFF';
      }
    });
  }

  // ==================== TARIK PIPI & ANTENA ELASTIS (ELASTIC CLAY PULL) ====================
  function makeElasticClayPart(el, baseRotation = 0, maxPull = 68, isAntenna = false) {
    if (!el) return;
    let pulling = false;
    let startX = 0;
    let startY = 0;
    let moved = false;

    el.addEventListener('pointerdown', (e) => {
      if (!gateIsOpen) return;
      e.stopPropagation();
      pulling = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      el.classList.add('is-pulling');
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!pulling) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) moved = true;

      // Batasi tarikan secara elastis (logaritmik/redaman)
      const factor = Math.min(maxPull, dist * 0.65) / Math.max(1, dist);
      const tx = dx * factor;
      const ty = dy * factor;
      const stretchX = 1 + Math.abs(tx) / 95;
      const stretchY = 1 + Math.abs(ty) / 95;
      const angle = baseRotation + tx * 0.35;

      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg) scale(${stretchX.toFixed(2)}, ${stretchY.toFixed(2)})`;
    });

    function releasePull(e) {
      if (!pulling) return;
      pulling = false;
      el.classList.remove('is-pulling');

      if (!moved) {
        el.style.transform = '';
        if (isAntenna) {
          cycleMood();
        }
        return;
      }

      const currentTransform = el.style.transform || 'translate3d(0,0,0)';
      pixelAudio.playElasticBoing();

      if (!prefersReducedMotion) {
        const springAnim = el.animate(
          [
            { transform: currentTransform },
            { transform: `translate3d(0px, 0px, 0) rotate(${baseRotation - 12}deg) scale(0.82, 1.22)`, offset: 0.38 },
            { transform: `translate3d(0px, 0px, 0) rotate(${baseRotation + 8}deg) scale(1.14, 0.88)`, offset: 0.68 },
            { transform: `translate3d(0px, 0px, 0) rotate(${baseRotation}deg) scale(1, 1)`, offset: 1 }
          ],
          { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
        springAnim.onfinish = () => {
          el.style.transform = '';
        };
      } else {
        el.style.transform = '';
      }
    }

    el.addEventListener('pointerup', releasePull);
    el.addEventListener('pointercancel', releasePull);
  }

  makeElasticClayPart(cheekLeft, -8, 72, false);
  makeElasticClayPart(cheekRight, 8, 72, false);
  makeElasticClayPart(antennaBall, 0, 56, true);

  // ==================== JAM REAL-TIME & MOOD METER DI ANTENA + EASTER EGG KACAMATA PIXEL ====================
  const MOOD_CODES = {
    normal: 'NRM',
    happy: 'HPY',
    thinking: 'THK',
    surprised: 'WOW',
    kissing: 'CHU',
    sleeping: 'SLP',
    dizzy: 'DZY'
  };

  function updateHudMoodBadge() {
    if (!hudMoodCode) return;
    const currentMood = face.dataset.mood || 'thinking';
    hudMoodCode.textContent = MOOD_CODES[currentMood] || 'THK';
  }

  function updateHudClock() {
    if (!hudClockText) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    hudClockText.textContent = `${hh}:${mm}`;
  }

  updateHudClock();
  updateHudMoodBadge();
  setInterval(updateHudClock, 15000);

  // Easter Egg Kacamata Hitam Pixel: Double-click pada alis kiri/kanan atau tekan tombol 'G'
  function togglePixelSunglasses() {
    const active = face.classList.toggle('has-sunglasses');
    if (active) {
      pixelAudio.playColorCoin();
    } else {
      pixelAudio.playModalClose();
    }
  }

  [eyebrowLeft, eyebrowRight].forEach((eb) => {
    if (!eb) return;
    eb.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!gateIsOpen) {
        openCircularGate();
        return;
      }
      togglePixelSunglasses();
    });
  });

  // Mulai dalam kondisi komponen terpecah-belah di atas Gate
  scatterRobotPartsOnGate();
  pixelAudio.unlockAndStart();
  pickNextAutoLook(performance.now());
  requestAnimationFrame(animate);
})();
