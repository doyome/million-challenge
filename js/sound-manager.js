window.QuizApp = window.QuizApp || {};

QuizApp.SoundManager = {
    audioContext: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    activeSounds: {},
    isMuted: false,
    _audioFiles: {}, // Cache for loaded audio files

    init: function() {
        if (this.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        this.masterGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        // Initial volumes
        this.masterGain.gain.value = 1.0;
        this.musicGain.gain.value = 0.6;
        this.sfxGain.gain.value = 0.8;
    },

    resumeContext: function() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    play: function(soundName, options = {}) {
        this.init();
        this.resumeContext();

        if (this.activeSounds[soundName] && !options.allowMultiple) {
            this.stop(soundName, 0.5);
        }

        const volume = options.volume !== undefined ? options.volume : 1.0;
        const loop = options.loop || false;
        
        let sourceNode = null;
        let gainNode = this.audioContext.createGain();
        
        const isMusic = soundName.startsWith('bg') || soundName.startsWith('suspense') || soundName === 'intro' || soundName === 'grandPrize';
        gainNode.connect(isMusic ? this.musicGain : this.sfxGain);

        // Smooth fade in for music
        if (isMusic) {
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 1.5);
        } else {
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            // Duck background music for sound effects
            this.duck(options.duration || 3.0);
        }

        const synthMethodName = '_generate' + soundName.charAt(0).toUpperCase() + soundName.slice(1);
        
        if (typeof this[synthMethodName] === 'function') {
            sourceNode = this[synthMethodName](gainNode, loop);
            
            if (!sourceNode && gainNode) {
                // some generators manage their own nodes completely
            } else if (sourceNode) {
                if (options.onEnd) {
                    // Usually we attach onended to the first source node
                    let targetNode = Array.isArray(sourceNode) ? sourceNode[0] : sourceNode;
                    if (targetNode) {
                        targetNode.onended = () => {
                            options.onEnd();
                            delete this.activeSounds[soundName];
                        };
                    }
                }
            }

            this.activeSounds[soundName] = { source: sourceNode, gain: gainNode };
        } else {
            console.warn(`Sound generator for ${soundName} not found.`);
        }
    },

    stop: function(soundName, fadeOut = 1.5) {
        if (!this.activeSounds[soundName]) return;

        const sound = this.activeSounds[soundName];
        if (fadeOut > 0) {
            sound.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
            sound.gain.gain.setValueAtTime(sound.gain.gain.value, this.audioContext.currentTime);
            sound.gain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + fadeOut);
            setTimeout(() => {
                this._stopSource(sound.source);
                delete this.activeSounds[soundName];
            }, fadeOut * 1000);
        } else {
            this._stopSource(sound.source);
            delete this.activeSounds[soundName];
        }
    },

    _stopSource: function(source) {
        if (!source) return;
        if (Array.isArray(source)) {
            source.forEach(s => {
                if (s.stop) { try { s.stop(); } catch(e){} }
                if (s.disconnect) s.disconnect();
            });
        } else {
            if (source.stop) { try { source.stop(); } catch(e){} }
            if (source.disconnect) source.disconnect();
        }
    },

    stopAll: function() {
        for (let soundName in this.activeSounds) {
            this.stop(soundName, 1.5);
        }
        // Give time for fadeout before clearing tracking, or just track fades internally
    },

    setVolume: function(type, level) {
        const clampedLevel = Math.max(0, Math.min(1, level));
        if (this.isMuted) return;

        switch(type) {
            case 'master':
                if (this.masterGain) this.masterGain.gain.value = clampedLevel;
                break;
            case 'music':
                if (this.musicGain) this.musicGain.gain.value = clampedLevel;
                break;
            case 'sfx':
                if (this.sfxGain) this.sfxGain.gain.value = clampedLevel;
                break;
        }
    },

    toggleMute: function() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
    },

    mute: function() {
        if (!this.masterGain) return;
        this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
        this.isMuted = true;
    },

    unmute: function() {
        if (!this.masterGain) return;
        this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.3);
        this.isMuted = false;
    },

    duck: function(duration) {
        if (!this.musicGain) return;
        const currentMusicVolume = 0.6; // Base volume
        const duckedVolume = currentMusicVolume * 0.2;
        const now = this.audioContext.currentTime;
        
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(duckedVolume, now + 0.5);
        
        this.musicGain.gain.setValueAtTime(duckedVolume, now + Math.max(0.5, duration - 1.0));
        this.musicGain.gain.linearRampToValueAtTime(currentMusicVolume, now + duration);
    },

    fadeOut: function(soundName, duration = 1.5) {
        this.stop(soundName, duration);
    },

    fadeIn: function(soundName, duration = 1.5) {
        this.play(soundName, { volume: 1.0 });
    },

    playCountdownTick: function(remaining) {
        if (remaining <= 5) {
            this.play('countdownUrgent', { allowMultiple: true, duration: 1.0 });
        } else {
            this.play('countdown', { allowMultiple: true, duration: 1.0 });
        }
    },

    // --- File Audio Generators ---
    _playAudioFile: function(url, volume) {
        if (this.isMuted) return null;
        try {
            const audio = new Audio(url);
            let targetVolume = volume !== undefined ? volume : 1.0;
            if (this.masterGain && this.sfxGain) {
                targetVolume = targetVolume * this.masterGain.gain.value * this.sfxGain.gain.value;
            }
            audio.volume = Math.max(0, Math.min(1, targetVolume));
            audio.play().catch(e => console.log('Audio file play ignored:', e));
            return {
                stop: () => { audio.pause(); audio.currentTime = 0; },
                disconnect: () => {}
            };
        } catch(e) {
            console.error('Audio file playback error', e);
            return null;
        }
    },

    // --- Soft Sound Generators ---

    _playTone: function(freq, type, startTime, duration, attack, decay, sustain, release, destination) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        // Use soft waves: sine or triangle. Map harsh waves to triangle.
        if (type === 'sawtooth' || type === 'square') type = 'triangle';
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Add a lowpass filter to soften the tone further
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200; // soft cutoff
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        
        // ADSR Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(1, startTime + attack);
        gain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
        gain.gain.setValueAtTime(sustain, startTime + duration - release);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
        
        return osc;
    },

    _createNoiseWithFilter: function(type, filterFreq, duration, destination) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(filterFreq, this.audioContext.currentTime);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + duration * 0.2);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start();
        return noise;
    },

    _generateClapping: function(destination, loop) {
        // High quality applause MP3 file instead of synth noise
        return this._playAudioFile('assets/sounds/applause.mp3', 1.0);
    },

    _generateSadCrowd: function(destination, loop) {
        // Sad crowd (aww) effect using descending lowpass filter on noise
        const duration = 2.5;
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + duration);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start();
        return noise;
    },

    _generateLockFlash: function(destination, loop) {
        // Soft chime / whoosh for lock effect
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        osc.start(now);
        osc.stop(now + 0.8);
        return osc;
    },

    _generateIntro: function(destination, loop) {
        // افتتاحية سينمائية قصيرة ومتصاعدة (وتر ماجور مشرق + باص عميق)
        const now = this.audioContext.currentTime;
        const sources = [];

        // باص عميق يمنح ثقلاً وفخامة
        sources.push(this._playTone(65.41, 'triangle', now, 3.5, 0.2, 0.4, 0.7, 1.5, destination));

        // وتر صاعد (Do - Mi - Sol - Do) بنبرات ناعمة متتابعة
        const rise = [261.63, 329.63, 392.00, 523.25];
        rise.forEach((freq, i) => {
            const t = now + i * 0.18;
            sources.push(this._playTone(freq, 'sine', t, 2.2 - i * 0.15, 0.06, 0.15, 0.55, 1.0, destination));
        });

        // لمسة لمعان عالية في النهاية
        sources.push(this._playTone(1046.50, 'sine', now + 0.75, 1.8, 0.05, 0.2, 0.35, 1.2, destination));
        return sources;
    },

    // خلفية ناعمة هادئة للشاشة الرئيسية
    _generateBgHome: function(destination, loop) {
        return this._createSuspenseBed(destination, { root: 174.61, level: 0.12 });
    },

    _generatePlayerEntry: function(destination, loop) {
        // نغمة ترحيب راقية: باص + أربيجيو صاعد + لمعة نهائية
        const now = this.audioContext.currentTime;
        const sources = [];

        sources.push(this._playTone(130.81, 'triangle', now, 2.4, 0.05, 0.3, 0.5, 1.2, destination));

        const arp = [392.00, 523.25, 659.25, 783.99];
        arp.forEach((freq, i) => {
            sources.push(this._playTone(freq, 'sine', now + i * 0.12, 0.9, 0.03, 0.1, 0.4, 0.5, destination));
        });

        sources.push(this._playTone(1046.50, 'sine', now + 0.55, 1.6, 0.04, 0.2, 0.35, 1.0, destination));
        return sources;
    },

    // === خلفية موسيقية مريحة (Ambient Pad) ===
    // وتر ماجور متناغم بموجات جيبية ناعمة + حركة بطيئة جدًا للمرشح (تنفّس هادئ)،
    // بلا نبضات أو درون منخفض مزعج — مريحة للأذن.
    _createSuspenseBed: function(destination, opts) {
        opts = opts || {};
        const now = this.audioContext.currentTime;
        const sources = [];
        const root = opts.root || 196.00; // Sol
        const level = opts.level !== undefined ? opts.level : 0.13;

        const bedGain = this.audioContext.createGain();
        bedGain.gain.setValueAtTime(0, now);
        bedGain.gain.linearRampToValueAtTime(level, now + 2.2); // دخول تدريجي ناعم

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 950;
        filter.Q.value = 0.3;
        filter.connect(bedGain);
        bedGain.connect(destination);

        // حركة بطيئة جدًا للمرشح تعطي إحساس التنفّس الهادئ
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(now);
        sources.push(lfo);

        // وتر ماجور متناغم: الأساس + الثالثة الكبرى + الخامسة + أوكتاف منخفض للدفء
        [root, root * 1.25, root * 1.5, root / 2].forEach(f => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            osc.connect(filter);
            osc.start(now);
            sources.push(osc);
        });

        return sources;
    },

    _generateQuestionAppear: function(destination, loop) {
        return this._playTone(440, 'sine', this.audioContext.currentTime, 1.5, 0.2, 0.2, 0.3, 1.0, destination);
    },

    _generateSelectAnswer: function(destination, loop) {
        return this._playTone(600, 'sine', this.audioContext.currentTime, 0.2, 0.02, 0.05, 0, 0.1, destination);
    },

    _generateLockAnswer: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const osc = this._playTone(300, 'sine', now, 0.5, 0.05, 0.1, 0.2, 0.3, destination);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
        return osc;
    },

    _createCinematicPad: function(destination, baseFreq, filterFreq, lfoRate) {
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.value = baseFreq;
        
        osc2.type = 'sine';
        osc2.frequency.value = baseFreq * 1.01; 

        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        lfo.type = 'sine';
        lfo.frequency.value = lfoRate;
        lfoGain.gain.value = filterFreq / 3;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(destination);

        osc.start();
        osc2.start();
        lfo.start();

        return [osc, osc2, lfo];
    },

    _generateSuspenseEasy: function(destination, loop) {
        return this._createSuspenseBed(destination, { root: 196.00, level: 0.12 });
    },
    _generateSuspenseMedium: function(destination, loop) {
        return this._createSuspenseBed(destination, { root: 174.61, level: 0.12 });
    },
    _generateSuspenseHard: function(destination, loop) {
        return this._createSuspenseBed(destination, { root: 146.83, level: 0.13 });
    },
    _generateSuspenseMillion: function(destination, loop) {
        return this._createSuspenseBed(destination, { root: 130.81, level: 0.13 });
    },
    
    _generateSuspenseReveal: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 3);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 2);
        gain.gain.setValueAtTime(0.7, now + 2.9);
        gain.gain.linearRampToValueAtTime(0, now + 3);
        
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now);
        osc.stop(now + 3);
        return osc;
    },

    _generateCorrect: function(destination, loop) {
        // Play the real applause sound for correct answers!
        this._playAudioFile('assets/sounds/applause.mp3', 1.0);
        
        const now = this.audioContext.currentTime;
        const sources = [];
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, i) => {
            sources.push(this._playTone(freq, 'sine', now + (i * 0.15), 1.5 - (i * 0.1), 0.1, 0.1, 0.5, 0.8, destination));
            // Add lower octave for depth
            sources.push(this._playTone(freq / 2, 'sine', now + (i * 0.15), 1.5 - (i * 0.1), 0.1, 0.1, 0.5, 0.8, destination));
        });
        return sources;
    },

    _generateWrong: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const sources = [];
        const notes = [311.13, 293.66, 277.18, 261.63]; 
        notes.forEach((freq, i) => {
            sources.push(this._playTone(freq, 'triangle', now + (i * 0.3), 1.0, 0.2, 0.2, 0.6, 0.8, destination));
            // Add lower octave for depth
            sources.push(this._playTone(freq / 2, 'triangle', now + (i * 0.3), 1.0, 0.2, 0.2, 0.6, 0.8, destination));
        });
        return sources;
    },

    _generateFiftyFifty: function(destination, loop) {
        const now = this.audioContext.currentTime;
        return [
            this._playTone(659.25, 'sine', now, 0.3, 0.05, 0.1, 0, 0.1, destination),
            this._playTone(523.25, 'sine', now + 0.3, 0.5, 0.05, 0.1, 0, 0.2, destination)
        ];
    },

    _generatePhoneAFriend: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const sources = [];
        for(let i=0; i<3; i++) {
            sources.push(this._playTone(440, 'sine', now + (i * 0.5), 0.4, 0.1, 0.1, 0.5, 0.2, destination));
            sources.push(this._playTone(480, 'sine', now + (i * 0.5), 0.4, 0.1, 0.1, 0.5, 0.2, destination)); 
        }
        return sources;
    },

    _generateCountdown: function(destination, loop) {
        return this._playTone(600, 'sine', this.audioContext.currentTime, 0.15, 0.02, 0.05, 0, 0.1, destination);
    },

    _generateCountdownUrgent: function(destination, loop) {
        return this._playTone(800, 'sine', this.audioContext.currentTime, 0.15, 0.02, 0.05, 0, 0.1, destination);
    },

    _generateAudienceVoting: function(destination, loop) {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300; // Very soft murmur

        noise.connect(filter);
        filter.connect(destination);
        noise.start();
        return noise;
    },

    _generateAudienceResult: function(destination, loop) {
        return this._generateClapping(destination, loop);
    },

    _generateNextQuestion: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const osc = this._playTone(300, 'sine', now, 1.2, 0.2, 0.2, 0.5, 0.8, destination);
        osc.frequency.linearRampToValueAtTime(400, now + 0.6);
        return osc;
    },

    _generateSafetyNet: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const sources = [];
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            sources.push(this._playTone(freq, 'sine', now, 2.5, 0.2, 0.3, 0.6, 1.5, destination));
        });
        return sources;
    },

    _generateGrandPrize: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const sources = [];
        [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach(freq => {
            sources.push(this._playTone(freq, 'triangle', now, 6.0, 1.0, 1.0, 0.8, 3.0, destination));
        });
        return sources;
    },

    _generateWalkAway: function(destination, loop) {
        const now = this.audioContext.currentTime;
        return this._playTone(220, 'sine', now, 3.0, 0.8, 0.5, 0.5, 2.0, destination);
    },

    _generateGameOver: function(destination, loop) {
        const now = this.audioContext.currentTime;
        const osc = this._playTone(150, 'triangle', now, 4.0, 0.2, 1.0, 0.4, 2.5, destination);
        osc.frequency.exponentialRampToValueAtTime(60, now + 3);
        return osc;
    }
};
