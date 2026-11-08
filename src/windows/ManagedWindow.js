// Vendor
import { gsap } from 'gsap';

// Utils
import EventDispatcher from 'utils/EventDispatcher';
import DragManager from 'utils/DragManager';
import randomFromRange from 'utils/randomFromRange';
import lerp from 'utils/math/lerp';

const VIEWPORT_MARGIN = 100;
const VIEWPORT_PADDING = 5;
const SNAP_DURATION = 0.6;

/**
 * One window: its own position, drag, snap back into view and transform
 * Viewports are { width, height, top }, top being the bottom of the navigation
 */
export default class ManagedWindow extends EventDispatcher {
    constructor({ id, el, handle, width, height, viewport }) {
        super();

        this._id = id;
        this._el = el;
        this._handle = handle;
        this._width = width;
        this._height = height;

        this._position = { x: 0, y: 0 };
        this._isDragging = false;
        this._snapTween = null;

        this._bindAll();
        this._setup(viewport);
    }

    /**
     * Getters & Setters
     */
    get id() {
        return this._id;
    }

    // Own position and size, the overview and desktop layouts are computed from it
    get rect() {
        return { x: this._position.x, y: this._position.y, width: this._width, height: this._height };
    }

    // Disables dragging, while arranged in the overview or desktop modes
    set locked(value) {
        this._dragManager.enabled = !value;
    }

    /**
     * Public
     */
    // Between its own position and its target in the current mode, without target it goes back to its own position
    apply(target, progress) {
        // Finishes snapping first, so going back ends at the snapped position
        this._snapTween?.progress(1).kill();

        const { x, y, scale } = target ?? { ...this._position, scale: 1 };

        gsap.set(this._el, {
            x: lerp(this._position.x, x, progress),
            y: lerp(this._position.y, y, progress),
            scale: lerp(1, scale, progress),
        });
    }

    bringIntoView(viewport) {
        // The drag end brings it back into view, with the final position
        if (this._isDragging) return;

        const minX = VIEWPORT_PADDING;
        const minY = viewport.top + VIEWPORT_PADDING;
        const maxX = Math.max(viewport.width - this._width - VIEWPORT_PADDING, minX);
        const maxY = Math.max(viewport.height - this._height - VIEWPORT_PADDING, minY);
        const x = gsap.utils.clamp(minX, maxX, this._position.x);
        const y = gsap.utils.clamp(minY, maxY, this._position.y);

        this._snapTween?.kill();

        if (x === this._position.x && y === this._position.y) return;

        this._snapTween = gsap.to(this._position, {
            x,
            y,
            duration: SNAP_DURATION,
            ease: 'power3.out',
            onUpdate: this._applyPosition,
        });
    }

    setZIndex(zIndex) {
        this._el.style.zIndex = zIndex;
    }

    destroy() {
        this._snapTween?.kill();
        this._removeEventListeners();
    }

    /**
     * Private
     */
    _setup(viewport) {
        this._dragManager = new DragManager({ el: this._handle });
        this._setupEventListeners();
        this._placeRandomly(viewport);
    }

    // In view and away from the sides when possible
    _placeRandomly(viewport) {
        const rangeX = this._getInitialRange(this._width, viewport.width);
        const rangeY = this._getInitialRange(this._height, viewport.height, viewport.top);

        this._position.x = randomFromRange(rangeX.min, rangeX.max);
        this._position.y = randomFromRange(rangeY.min, rangeY.max);

        this._applyPosition();
    }

    _getInitialRange(size, viewportSize, minPosition = 0) {
        // Shrinks the margin when the window doesn't fit with the full one
        const margin = Math.min(VIEWPORT_MARGIN, Math.max((viewportSize - size) / 2, 0));
        const min = Math.max(margin, minPosition);

        return { min, max: Math.max(min, viewportSize - size - margin) };
    }

    // Position only, the scale belongs to the enter and leave animations in the default mode
    _applyPosition() {
        gsap.set(this._el, { x: this._position.x, y: this._position.y });
    }

    _bindAll() {
        this._applyPosition = this._applyPosition.bind(this);
        this._dragstartHandler = this._dragstartHandler.bind(this);
        this._dragHandler = this._dragHandler.bind(this);
        this._touchupHandler = this._touchupHandler.bind(this);
    }

    /**
     * Events
     */
    _setupEventListeners() {
        this._dragManager.addEventListener('dragstart', this._dragstartHandler);
        this._dragManager.addEventListener('drag', this._dragHandler);
        this._dragManager.addEventListener('touchup', this._touchupHandler);
    }

    _removeEventListeners() {
        this._dragManager.destroy();
    }

    /**
     * Handlers
     */
    _dragstartHandler() {
        this._snapTween?.kill();
        this._isDragging = true;
        this.dispatchEvent('dragstart', { managedWindow: this });
    }

    _dragHandler(e) {
        if (!this._isDragging) return;

        this._position.x -= e.delta.x;
        this._position.y -= e.delta.y;

        this._applyPosition();
    }

    _touchupHandler() {
        // DragManager dispatches this on every mouseup, even outside of this window
        if (!this._isDragging) return;

        this._isDragging = false;
        this.dispatchEvent('dragend', { managedWindow: this });
    }
}
