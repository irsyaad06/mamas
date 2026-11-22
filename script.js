(() => {
  const face = document.getElementById('robotFace');
  const eyeLeft = document.getElementById('eyeLeft');
  const eyeRight = document.getElementById('eyeRight');
  const pupilLeft = document.getElementById('pupilLeft');
  const pupilRight = document.getElementById('pupilRight');
  const nose = document.getElementById('robotNose');
  const noseLed = document.getElementById('noseLed');
  const mouth = document.getElementById('robotMouth');
  const mouthRim = mouth.querySelector('.mouth-rim');
  const voiceBarsContainer = document.getElementById('voiceBars');

  const BAR_COUNT = 11;
  const COLORS = ['cyan', 'emerald', 'amber', 'crimson', 'violet'];
  const MOODS = ['normal', 'happy', 'thinking', 'surprised'];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Bangun bar LED equalizer untuk mulut robot
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('span');
    bar.className = 'voice-bar';
    voiceBarsContainer.appendChild(bar);
    bars.push(bar);
  }

  // State utama
  const state = {
    // Target dan posisi pandangan saat ini (-1 .. 1)
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,

    // Mode mengikuti pointer vs otomatis melihat kanan-kiri
    pointerActive: false,
    lastPointerTime: 0,
    nextAutoLookTime: 0,
    autoLookSide: 1,

    // State bicara
    talkingEnabled: true,
    isSpeakingBurst: true,
    nextSpeechToggleTime: performance.now() + 3400,
    speechEnergy: 0,
    speechPhase: 0,
    syllableTarget: 0.5,
    nextSyllableTime: 0,

    // Warna & Mood
    colorIndex: 0,
    moodIndex: 0,

    // Blink
    nextBlinkTime: performance.now() + 1800,
    blinkingLeft: false,
    blinkingRight: false,
  };

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // ==================== KEDIP MATA ====================
  function blinkEyes(target = 'both', allowDouble = false) {
    const closeDuration = 125;

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

    // Kadang-kadang kedip dua kali secara alami
    if (allowDouble && Math.random() < 0.24) {
      setTimeout(() => {
        blinkEyes(target, false);
      }, closeDuration + 150);
    }
  }

  // ==================== MELIHAT KANAN KIRI OTOMATIS ====================
  function pickNextAutoLook(now) {
    // Bergantian melihat ke kanan, kiri, dan sesekali ke tengah
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
    // 1. Cek apakah pointer sudah idle > 2.4 detik -> kembali ke mode otomatis lihat kanan-kiri
    if (state.pointerActive && now - state.lastPointerTime > 2400) {
      state.pointerActive = false;
      pickNextAutoLook(now);
    }

    if (!state.pointerActive && now >= state.nextAutoLookTime) {
      pickNextAutoLook(now);
    }

    // 2. Gerakan mata halus (lerp)
    const eyeLerp = state.pointerActive ? 0.16 : 0.085;
    state.currentX += (state.targetX - state.currentX) * eyeLerp;
    state.currentY += (state.targetY - state.currentY) * eyeLerp;

    const maxMoveX = eyeLeft.clientWidth * 0.2;
    const maxMoveY = eyeLeft.clientHeight * 0.17;
    const tx = state.currentX * maxMoveX;
    const ty = state.currentY * maxMoveY;

    const pupilTransform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    pupilLeft.style.transform = pupilTransform;
    pupilRight.style.transform = pupilTransform;

    face.style.setProperty('--look-x', state.currentX.toFixed(3));
    face.style.setProperty('--look-y', state.currentY.toFixed(3));

    // 3. Kedip otomatis berkala
    if (now >= state.nextBlinkTime) {
      blinkEyes('both', true);
      state.nextBlinkTime = now + randomRange(2200, 5200);
    }

    // 4. Animasi mulut berbicara
    if (state.talkingEnabled) {
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
        }
      } else {
        state.syllableTarget = 0.06;
      }
    } else {
      state.syllableTarget = 0.04;
    }

    const energyLerp = state.syllableTarget > state.speechEnergy ? 0.28 : 0.18;
    state.speechEnergy += (state.syllableTarget - state.speechEnergy) * energyLerp;
    state.speechPhase += prefersReducedMotion ? 0.04 : 0.19;

    const centerIndex = (BAR_COUNT - 1) / 2;
    for (let i = 0; i < BAR_COUNT; i++) {
      const distFromCenter = Math.abs(i - centerIndex) / centerIndex;
      // Bentuk lonceng agar bagian tengah mulut paling tinggi saat bicara
      const envelope = 1 - distFromCenter * 0.62;
      const wave =
        Math.sin(state.speechPhase + i * 0.72) * 0.5 +
        Math.cos(state.speechPhase * 1.45 - i * 0.48) * 0.5;
      const normalizedWave = (wave + 1) * 0.5;

      const baseIdle = state.moodIndex === 1
        ? 14 + distFromCenter * 10 // sedikit melengkung ceria saat diam di mood happy
        : 14;

      const activeHeight = state.speechEnergy * envelope * (28 + normalizedWave * 58);
      const heightPct = Math.min(94, Math.max(12, baseIdle + activeHeight));

      bars[i].style.height = `${heightPct.toFixed(1)}%`;
      bars[i].style.opacity = (0.55 + (heightPct / 100) * 0.45).toFixed(2);
    }

    // Mulut sedikit membesar halus mengikuti ritme suara
    const mouthFlex = 1 + state.speechEnergy * 0.045;
    mouthRim.style.transform = `scaleY(${mouthFlex.toFixed(3)})`;

    // LED hidung ikut berdenyut halus saat berbicara
    const ledOpacity = 0.45 + state.speechEnergy * 0.55;
    noseLed.style.opacity = ledOpacity.toFixed(2);
    noseLed.style.transform = `scaleY(${(0.85 + state.speechEnergy * 0.35).toFixed(2)})`;

    requestAnimationFrame(animate);
  }

  // ==================== INTERAKSI PENGGUNA ====================
  function updatePointerLook(clientX, clientY) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const nx = Math.max(-1, Math.min(1, (clientX - cx) / (window.innerWidth * 0.42)));
    const ny = Math.max(-1, Math.min(1, (clientY - cy) / (window.innerHeight * 0.42)));

    state.targetX = nx;
    state.targetY = ny;
    state.pointerActive = true;
    state.lastPointerTime = performance.now();
  }

  window.addEventListener('pointermove', (e) => {
    updatePointerLook(e.clientX, e.clientY);
  });

  window.addEventListener('pointerdown', (e) => {
    updatePointerLook(e.clientX, e.clientY);
  });

  window.addEventListener('pointerleave', () => {
    state.pointerActive = false;
    state.nextAutoLookTime = performance.now() + 400;
  });

  // Klik mata kiri/kanan -> mengedip (wink)
  eyeLeft.addEventListener('click', (e) => {
    e.stopPropagation();
    blinkEyes('left');
  });

  eyeRight.addEventListener('click', (e) => {
    e.stopPropagation();
    blinkEyes('right');
  });

  eyeLeft.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      blinkEyes('left');
    }
  });

  eyeRight.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      blinkEyes('right');
    }
  });

  // Klik mulut -> toggle bicara / diam
  mouth.addEventListener('click', (e) => {
    e.stopPropagation();
    state.talkingEnabled = !state.talkingEnabled;
    mouth.setAttribute('aria-pressed', String(state.talkingEnabled));
    if (state.talkingEnabled) {
      state.isSpeakingBurst = true;
      state.nextSpeechToggleTime = performance.now() + 3200;
    }
    blinkEyes('both');
  });

  // Klik hidung -> langsung ganti warna robot (5 warna)
  function cycleColor() {
    state.colorIndex = (state.colorIndex + 1) % COLORS.length;
    face.dataset.color = COLORS[state.colorIndex];
  }

  nose.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleColor();
  });

  // Klik area putih mana saja -> kedip kedua mata
  document.body.addEventListener('click', () => {
    blinkEyes('both');
  });

  // Kontrol keyboard tambahan (opsional & tersembunyi)
  window.addEventListener('keydown', (e) => {
    if (e.target !== document.body) return;
    if (e.code === 'Space') {
      e.preventDefault();
      mouth.click();
    } else if (e.key === 'b' || e.key === 'B') {
      blinkEyes('both');
    } else if (e.key === 'c' || e.key === 'C') {
      cycleColor();
    } else if (e.key === 'ArrowLeft') {
      state.pointerActive = true;
      state.lastPointerTime = performance.now();
      state.targetX = -0.95;
      state.targetY = 0;
    } else if (e.key === 'ArrowRight') {
      state.pointerActive = true;
      state.lastPointerTime = performance.now();
      state.targetX = 0.95;
      state.targetY = 0;
    } else if (e.key === 'm' || e.key === 'M') {
      state.moodIndex = (state.moodIndex + 1) % MOODS.length;
      face.dataset.mood = MOODS[state.moodIndex];
      blinkEyes('both');
    }
  });

  // Mulai animasi
  pickNextAutoLook(performance.now());
  requestAnimationFrame(animate);
})();
