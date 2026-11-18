// Keyboard + mouse input. Held keys give steering/throttle; one-shot presses
// (enter vehicle, reload, map, radio, pause, confirm) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost.
export const ACT_CONFIRM = 1;
export const ACT_ENTER = 2;
export const ACT_RELOAD = 4;
export const ACT_MAP = 8;
export const ACT_RADIO = 16;
export const ACT_PAUSE = 32;
export const ACT_SLOT = 64; // + slot number in slotIndex

const FWD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let slotIndex = -1;
  let mouseX = 0.5;
  let mouseDown = false;
  let clicked = false;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) { if (FWD.has(e.code) || BACK.has(e.code) || LEFT.has(e.code) || RIGHT.has(e.code)) held.add(e.code); return; }
    held.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACT_CONFIRM;
    else if (e.code === 'KeyF') actions |= ACT_ENTER;
    else if (e.code === 'KeyR') actions |= ACT_RELOAD;
    else if (e.code === 'KeyM') actions |= ACT_MAP;
    else if (e.code === 'KeyQ') actions |= ACT_RADIO;
    else if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACT_PAUSE;
    else if (e.code >= 'Digit1' && e.code <= 'Digit5') { actions |= ACT_SLOT; slotIndex = Number(e.code.slice(-1)) - 1; }
    if (!['F5', 'F12'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (e) => { mouseX = e.clientX / window.innerWidth; });
  canvas.addEventListener('pointerdown', (e) => { mouseDown = true; clicked = true; if (e.button === 0) actions |= ACT_CONFIRM; });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  const any = (set) => [...set].some((c) => held.has(c));
  return {
    throttle() { return (any(FWD) ? 1 : 0) - (any(BACK) ? 1 : 0); },
    steer() { return (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0); },
    handbrake() { return held.has('Space'); },
    sprint() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    mouseX() { return mouseX; },
    mouseDown() { return mouseDown; },
    takeClick() { const c = clicked; clicked = false; return c; },
    takeActions() {
      const taken = actions; const slot = slotIndex;
      actions = 0; slotIndex = -1;
      return { flags: taken, slot };
    },
  };
}
