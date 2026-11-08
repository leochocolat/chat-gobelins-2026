// Vendor
import { gsap } from 'gsap';

// Utils
import WindowResizeObserver from 'utils/WindowResizeObserver';
import getNavigationHeight from 'utils/getNavigationHeight';

// Windows
import ManagedWindow from 'windows/ManagedWindow';
import { getDesktopLayout, getOverviewLayout } from 'windows/layouts';

const PROGRESS_DURATION = 0.8;

/**
 * Positions, z-order and modes of every window
 * Modes: 'default', 'overview' to see every window, 'desktop' to see the background
 * The progress goes from the window own positions (0) to the layout of the mode (1)
 */
class WindowManager {
    constructor() {
        this._windows = new Map();
        this._order = []; // From back to front
        this._mode = 'default';
        this._progress = 0;
        this._layout = {};
        this._progressTween = null;

        this._bindAll();
        this._setupEventListeners();
    }

    /**
     * Getters
     */
    get mode() {
        return this._mode;
    }

    get progress() {
        return this._progress;
    }

    /**
     * Public
     */
    add({ id, el, handle, width, height }) {
        const managedWindow = new ManagedWindow({ id, el, handle, width, height, viewport: this._getViewport() });

        managedWindow.locked = this._mode !== 'default';
        managedWindow.addEventListener('dragend', this._dragendHandler);

        this._windows.set(id, managedWindow);
        this._order.push(id);
        this._updateZIndexes();

        // A window opened in the overview takes its place in it
        if (this._mode !== 'default') this._refreshLayout();

        return managedWindow;
    }

    remove(id) {
        const managedWindow = this._windows.get(id);

        if (!managedWindow) return;

        managedWindow.removeEventListener('dragend', this._dragendHandler);
        managedWindow.destroy();

        this._windows.delete(id);
        this._order = this._order.filter((item) => item !== id);
        this._updateZIndexes();
    }

    bringToFront(id) {
        if (this._order.at(-1) === id) return;

        this._order = this._order.filter((item) => item !== id);
        this._order.push(id);
        this._updateZIndexes();
    }

    // Picking a window in the overview brings every window back
    focus(id) {
        this.bringToFront(id);

        if (this._mode === 'overview') this.setMode('default');
    }

    // Starts a mode from the window positions, the progress then moves the windows to its layout
    startMode(mode) {
        this._progressTween?.kill();
        this._mode = mode;
        this._progress = 0;

        for (const managedWindow of this._windows.values()) {
            managedWindow.locked = mode !== 'default';
        }

        this._refreshLayout();
    }

    // Direct control, from a gesture
    setProgress(progress) {
        this._progressTween?.kill();
        this._progress = gsap.utils.clamp(0, 1, progress);
        this._applyAll();
    }

    // Back to the default mode once the progress reaches 0
    animateProgress(progress, { duration = PROGRESS_DURATION, ease = 'expo.inOut' } = {}) {
        this._progressTween?.kill();
        this._progressTween = gsap.to(this, {
            _progress: progress,
            duration,
            ease,
            onUpdate: this._applyAll,
            onComplete: () => {
                if (progress === 0) this.startMode('default');
            },
        });
    }

    // Animated switch, from the default mode or back to it
    setMode(mode) {
        if (mode === 'default') {
            this.animateProgress(0);
            return;
        }

        this.startMode(mode);
        this.animateProgress(1);
    }

    reset() {
        if (this._mode !== 'default') this.setMode('default');
    }

    /**
     * Private
     */
    _getViewport() {
        return {
            width: WindowResizeObserver.innerWidth,
            height: WindowResizeObserver.innerHeight,
            top: getNavigationHeight(),
        };
    }

    _refreshLayout() {
        const rects = {};

        for (const [id, managedWindow] of this._windows) {
            rects[id] = managedWindow.rect;
        }

        const viewport = this._getViewport();

        if (this._mode === 'overview') this._layout = getOverviewLayout(rects, viewport);
        else if (this._mode === 'desktop') this._layout = getDesktopLayout(rects, viewport);
        else this._layout = {};

        this._applyAll();
    }

    // Runs within the gsap update, so windows move before their WebGL background is copied
    _applyAll() {
        for (const [id, managedWindow] of this._windows) {
            managedWindow.apply(this._layout[id], this._progress);
        }
    }

    _updateZIndexes() {
        this._order.forEach((id, index) => {
            this._windows.get(id).setZIndex(index + 1);
        });
    }

    _bindAll() {
        this._applyAll = this._applyAll.bind(this);
        this._resizeHandler = this._resizeHandler.bind(this);
        this._dragendHandler = this._dragendHandler.bind(this);
    }

    /**
     * Events
     */
    _setupEventListeners() {
        WindowResizeObserver.addEventListener('resize', this._resizeHandler);
    }

    /**
     * Handlers
     */
    // Arranged windows follow their layout, the others come back into view
    _resizeHandler() {
        if (this._mode !== 'default') {
            this._refreshLayout();
            return;
        }

        const viewport = this._getViewport();

        for (const managedWindow of this._windows.values()) {
            managedWindow.bringIntoView(viewport);
        }
    }

    _dragendHandler({ managedWindow }) {
        managedWindow.bringIntoView(this._getViewport());
    }
}

export default new WindowManager();
