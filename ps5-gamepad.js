/**
 * PokéBonk PS5 DualSense Gamepad Adapter & Local API Interceptor
 * 1. Intercepts api.pokebonk.com requests to eliminate CORS and enable 100% offline saves
 * 2. Maps DualSense controller inputs to PokéBonk's internal engine & DOM events
 */
(function () {
    'use strict';

    // ==========================================
    // 1. API INTERCEPTOR (Elimina erro de CORS)
    // ==========================================
    const STORAGE_KEY = 'pb_ps5_profile';

    function getLocalProfile() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}

        const initial = {
            v: 1,
            name: "Treinador PS5",
            created: Date.now(),
            stardust: 150,
            totalStardust: 150,
            unlocked: [1, 4, 7, 25],
            league: [],
            starter: 4,
            forms: [],
            research: {},
            captured: {},
            seen: [1, 4, 7, 25],
            shinies: [],
            skins: [],
            lab: {},
            biomes: { forest: 0 },
            quests: {},
            counters: {},
            runs: [],
            best: {},
            times: {},
            kills: {},
            medals: {},
            endless: {},
            settings: {
                autoAttack: true,
                bgMusic: true,
                sfx: true,
                screenShake: true,
                damageNumbers: true
            },
            lastSpecies: 4,
            lastBiome: "forest",
            banished: [],
            itemsOwned: [],
            itemsOff: [],
            daily: {},
            weekly: {},
            dailyStreak: {}
        };
        saveLocalProfile(initial);
        return initial;
    }

    function saveLocalProfile(profile) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {}
    }

    function jsonResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status: status,
            statusText: "OK",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }

    const originalFetch = window.fetch;
    window.fetch = async function (resource, options = {}) {
        const url = typeof resource === 'string' ? resource : (resource?.url || '');

        if (url.includes('api.pokebonk.com')) {
            const method = (options.method || 'GET').toUpperCase();

            // 1. /status
            if (url.includes('/status')) {
                return jsonResponse({
                    maintenance: { on: false, title: "", message: "", eta: 0 },
                    bypass: false,
                    season: {
                        n: 1,
                        name: "GEN 1",
                        start: 1700000000000,
                        end: 2000000000000,
                        live: true,
                        dust: 1,
                        message: ""
                    },
                    registration: { inviteOnly: false }
                });
            }

            // 2. /auth/guest, /auth/me, /auth/login, /auth/register
            if (url.includes('/auth/')) {
                return jsonResponse({
                    guest: true,
                    id: "ps5_trainer",
                    name: "Treinador PS5",
                    token: "ps5_local_token",
                    created: 1700000000000
                });
            }

            // 3. /profile/prefs
            if (url.includes('/profile/prefs')) {
                try {
                    const body = options.body ? JSON.parse(options.body) : {};
                    const prof = getLocalProfile();
                    Object.assign(prof, body);
                    saveLocalProfile(prof);
                } catch (e) {}
                return jsonResponse({ ok: true });
            }

            // 4. /profile/starter
            if (url.includes('/profile/starter')) {
                try {
                    const body = options.body ? JSON.parse(options.body) : {};
                    const prof = getLocalProfile();
                    if (body.id) prof.starter = body.id;
                    saveLocalProfile(prof);
                } catch (e) {}
                return jsonResponse({ ok: true });
            }

            // 5. /profile
            if (url.includes('/profile')) {
                const prof = getLocalProfile();
                return jsonResponse({ profile: prof });
            }

            // 6. /runs
            if (url.includes('/runs')) {
                if (url.includes('/finish')) {
                    try {
                        const body = options.body ? JSON.parse(options.body) : {};
                        const prof = getLocalProfile();
                        if (body.result) {
                            prof.runs = prof.runs || [];
                            prof.runs.push({
                                date: Date.now(),
                                score: body.result.score || 0,
                                kills: body.result.kills || 0,
                                win: !!body.result.win
                            });
                            prof.stardust = (prof.stardust || 0) + (body.result.stardust || 50);
                            saveLocalProfile(prof);
                        }
                    } catch (e) {}
                    return jsonResponse({ ok: true });
                }
                // Iniciar run
                return jsonResponse({
                    id: "ps5_run_" + Date.now(),
                    seed: Math.floor(Math.random() * 1e9),
                    ranked: false,
                    offline: false,
                    ticket: { id: "ps5_run_" + Date.now() }
                });
            }

            // 7. Qualquer outro endpoint da API
            return jsonResponse({
                ok: true,
                data: [],
                players: [],
                clans: [],
                news: []
            });
        }

        return originalFetch.apply(this, arguments);
    };

    // ==========================================
    // 2. CONTROLES DUALSENSE (PS5)
    // ==========================================
    const DEADZONE = 0.22;
    const CAM_SENSITIVITY = 14; // Sensibilidade de giro da câmera no analógico direito
    const REPEAT_DELAY = 300;   // Delay inicial de repetição do D-Pad (ms)
    const REPEAT_RATE = 140;    // Taxa de repetição contínua do D-Pad (ms)

    const keyState = {
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false,
        KeyR: false,
        KeyQ: false,
        KeyE: false,
        Space: false,
        ShiftLeft: false,
        Escape: false
    };

    const dpadState = {
        12: { key: 'ArrowUp', code: 'ArrowUp', lastPress: 0, initial: false },
        13: { key: 'ArrowDown', code: 'ArrowDown', lastPress: 0, initial: false },
        14: { key: 'ArrowLeft', code: 'ArrowLeft', lastPress: 0, initial: false },
        15: { key: 'ArrowRight', code: 'ArrowRight', lastPress: 0, initial: false }
    };

    const btnState = {};

    function emitKey(code, key, down) {
        if (keyState[code] === down) return;
        keyState[code] = down;

        const input = window.__game?.input;
        if (input && typeof input.touchKey === 'function') {
            input.touchKey(code, down);
        }

        window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
            code: code,
            key: key,
            keyCode: getKeyCode(code),
            which: getKeyCode(code),
            bubbles: true,
            cancelable: true
        }));
    }

    function getKeyCode(code) {
        switch (code) {
            case 'KeyW': return 87;
            case 'KeyA': return 65;
            case 'KeyS': return 83;
            case 'KeyD': return 68;
            case 'KeyR': return 82;
            case 'KeyQ': return 81;
            case 'KeyE': return 69;
            case 'Space': return 32;
            case 'ShiftLeft': return 16;
            case 'Escape': return 27;
            case 'ArrowUp': return 38;
            case 'ArrowDown': return 40;
            case 'ArrowLeft': return 37;
            case 'ArrowRight': return 39;
            default: return 0;
        }
    }

    function handleDpad(gp, now) {
        for (const [btnIdx, data] of Object.entries(dpadState)) {
            const pressed = gp.buttons[btnIdx] && gp.buttons[btnIdx].pressed;
            if (pressed) {
                if (!data.initial) {
                    data.initial = true;
                    data.lastPress = now;
                    triggerMenuNavigation(data.code, data.key);
                } else if (now - data.lastPress > REPEAT_DELAY) {
                    data.lastPress = now - (REPEAT_DELAY - REPEAT_RATE);
                    triggerMenuNavigation(data.code, data.key);
                }
            } else {
                data.initial = false;
            }
        }
    }

    function triggerMenuNavigation(code, key) {
        emitKey(code, key, true);
        setTimeout(() => emitKey(code, key, false), 40);

        const choices = document.querySelectorAll('.choice-card, .level-up-option, button.choice');
        if (choices.length > 0) {
            const active = document.activeElement;
            const arr = Array.from(choices);
            const idx = arr.indexOf(active);
            if (code === 'ArrowDown' || code === 'ArrowRight') {
                const next = (idx + 1) % arr.length;
                arr[next]?.focus();
            } else if (code === 'ArrowUp' || code === 'ArrowLeft') {
                const prev = (idx - 1 + arr.length) % arr.length;
                arr[prev]?.focus();
            }
        }
    }

    function pollController() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];

        if (gp && gp.connected) {
            const now = performance.now();
            const input = window.__game?.input;

            // 1. ANALÓGICO ESQUERDO (L-Stick) -> Movimentação 360° analógica + WASD
            const lx = gp.axes[0] || 0;
            const ly = gp.axes[1] || 0;
            const lMag = Math.hypot(lx, ly);

            if (lMag > DEADZONE) {
                const normX = lx / lMag;
                const normY = ly / lMag;
                const scale = (lMag - DEADZONE) / (1 - DEADZONE);

                if (input) {
                    input.stickX = normX * scale;
                    input.stickY = -normY * scale;
                }

                emitKey('KeyW', 'w', ly < -DEADZONE);
                emitKey('KeyS', 's', ly > DEADZONE);
                emitKey('KeyA', 'a', lx < -DEADZONE);
                emitKey('KeyD', 'd', lx > DEADZONE);
            } else {
                if (input) {
                    input.stickX = 0;
                    input.stickY = 0;
                }
                emitKey('KeyW', 'w', false);
                emitKey('KeyS', 's', false);
                emitKey('KeyA', 'a', false);
                emitKey('KeyD', 'd', false);
            }

            // 2. ANALÓGICO DIREITO (R-Stick) -> Câmera (look / drag)
            const rx = gp.axes[2] || 0;
            const ry = gp.axes[3] || 0;

            if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
                const dx = (Math.abs(rx) > DEADZONE ? rx : 0) * CAM_SENSITIVITY;
                const dy = (Math.abs(ry) > DEADZONE ? ry : 0) * CAM_SENSITIVITY;

                if (input && typeof input.look === 'function') {
                    input.locked = true;
                    input.look(dx, dy);
                } else {
                    const canvas = document.getElementById('game') || window;
                    canvas.dispatchEvent(new MouseEvent('mousemove', {
                        movementX: dx,
                        movementY: dy,
                        bubbles: true,
                        cancelable: true
                    }));
                }
            }

            // 3. GATILHO R2 -> Tecla R (Ultimate / Recarga)
            const r2Pressed = (gp.buttons[7] && (gp.buttons[7].pressed || gp.buttons[7].value > 0.4));
            emitKey('KeyR', 'r', !!r2Pressed);

            // 4. GATILHO L2 / Botão Quadrado -> Tecla Q
            const l2Pressed = (gp.buttons[6] && (gp.buttons[6].pressed || gp.buttons[6].value > 0.4)) || (gp.buttons[2] && gp.buttons[2].pressed);
            emitKey('KeyQ', 'q', !!l2Pressed);

            // 5. Botão Triângulo / R1 -> Tecla E
            const ePressed = (gp.buttons[3] && gp.buttons[3].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
            emitKey('KeyE', 'e', !!ePressed);

            // 6. Botão L1 -> Shift (Sprint)
            const l1Pressed = gp.buttons[4] && gp.buttons[4].pressed;
            emitKey('ShiftLeft', 'Shift', !!l1Pressed);

            // 7. Botão X (Cruz, buttons[0]) -> Pulo / Confirmação
            const xPressed = gp.buttons[0] && gp.buttons[0].pressed;
            if (xPressed && !btnState[0]) {
                emitKey('Space', ' ', true);
                if (document.activeElement && typeof document.activeElement.click === 'function') {
                    document.activeElement.click();
                }
            } else if (!xPressed && btnState[0]) {
                emitKey('Space', ' ', false);
            }
            btnState[0] = xPressed;

            // 8. Botão Círculo (buttons[1]) -> Voltar / Cancelar / Pause
            const oPressed = gp.buttons[1] && gp.buttons[1].pressed;
            if (oPressed && !btnState[1]) {
                emitKey('Escape', 'Escape', true);
            } else if (!oPressed && btnState[1]) {
                emitKey('Escape', 'Escape', false);
            }
            btnState[1] = oPressed;

            // 9. Botão Options (buttons[9]) -> Pause
            const optPressed = gp.buttons[9] && gp.buttons[9].pressed;
            if (optPressed && !btnState[9]) {
                emitKey('Escape', 'Escape', true);
            } else if (!optPressed && btnState[9]) {
                emitKey('Escape', 'Escape', false);
            }
            btnState[9] = optPressed;

            // 10. D-PAD -> Navegação de Menus
            handleDpad(gp, now);
        }

        requestAnimationFrame(pollController);
    }

    history.pushState(null, document.title, location.href);
    window.addEventListener('popstate', function () {
        history.pushState(null, document.title, location.href);
    });

    window.addEventListener('gamepadconnected', () => requestAnimationFrame(pollController));
    window.addEventListener('click', () => requestAnimationFrame(pollController), { once: true });
    requestAnimationFrame(pollController);

    console.log('[PS5] PokéBonk DualSense & API Interceptor ativo.');
})();
