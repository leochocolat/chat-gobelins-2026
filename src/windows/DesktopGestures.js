// Windows
import WindowManager from 'windows';

// Wheel delta for the whole overview transition, positive values open it (swipe up with natural scrolling, wheel down with a mouse)
const WHEEL_DISTANCE = 1000;
// Without wheel events for this long, the gesture is released
const WHEEL_RELEASE_DELAY = 150;
// Snap duration for the whole transition, shorter when releasing close to the end
const RELEASE_DURATION = 1;
// Elements where pointer events are not on the background
const FOREGROUND_ELEMENTS = '.window, .navigation, .tp-dfwv';

/**
 * Overview and desktop modes from the wheel and background clicks, like macOS Mission Control and Show Desktop
 */
export default class DesktopGestures {
    constructor() {
        this._wheelDirection = 0;
        this._wheelTimeout = null;
        this._isBackgroundPointerdown = false;

        this._bindAll();
    }

    /**
     * Public
     */
    start() {
        this._setupEventListeners();
    }

    destroy() {
        this._removeEventListeners();
        clearTimeout(this._wheelTimeout);
    }

    /**
     * Private
     */
    // Scrolling content, like the messages, keeps the wheel even at the end of its scroll
    _isInScrollableElement(element) {
        while (element && element !== document.body) {
            const { overflowY } = getComputedStyle(element);
            const isScrollable = overflowY === 'auto' || overflowY === 'scroll';

            if (isScrollable && element.scrollHeight > element.clientHeight) return true;

            element = element.parentElement;
        }

        return false;
    }

    _isBackground(element) {
        return !element.closest(FOREGROUND_ELEMENTS);
    }

    _bindAll() {
        this._wheelHandler = this._wheelHandler.bind(this);
        this._wheelReleaseHandler = this._wheelReleaseHandler.bind(this);
        this._pointerdownHandler = this._pointerdownHandler.bind(this);
        this._clickHandler = this._clickHandler.bind(this);
    }

    /**
     * Events
     */
    _setupEventListeners() {
        window.addEventListener('wheel', this._wheelHandler, { passive: true });
        window.addEventListener('pointerdown', this._pointerdownHandler);
        window.addEventListener('click', this._clickHandler);
    }

    _removeEventListeners() {
        window.removeEventListener('wheel', this._wheelHandler);
        window.removeEventListener('pointerdown', this._pointerdownHandler);
        window.removeEventListener('click', this._clickHandler);
    }

    /**
     * Handlers
     */
    // The windows follow the wheel, then snap once it's released
    _wheelHandler(e) {
        if (this._isInScrollableElement(e.target) || WindowManager.mode === 'desktop' || e.deltaY === 0) return;

        if (WindowManager.mode === 'default') {
            if (e.deltaY < 0) return;
            WindowManager.startMode('overview');
        }

        this._wheelDirection = Math.sign(e.deltaY);
        WindowManager.setProgress(WindowManager.progress + e.deltaY / WHEEL_DISTANCE);

        clearTimeout(this._wheelTimeout);
        this._wheelTimeout = setTimeout(this._wheelReleaseHandler, WHEEL_RELEASE_DELAY);
    }

    // Finishes the transition in the direction of the gesture
    _wheelReleaseHandler() {
        const progress = this._wheelDirection > 0 ? 1 : 0;
        const duration = Math.abs(progress - WindowManager.progress) * RELEASE_DURATION;

        WindowManager.animateProgress(progress, { duration, ease: 'power3.out' });
    }

    // A click ending a window drag over the background doesn't count
    _pointerdownHandler(e) {
        this._isBackgroundPointerdown = this._isBackground(e.target);
    }

    _clickHandler(e) {
        if (!this._isBackgroundPointerdown || !this._isBackground(e.target)) return;

        WindowManager.setMode(WindowManager.mode === 'default' ? 'desktop' : 'default');
    }
}
