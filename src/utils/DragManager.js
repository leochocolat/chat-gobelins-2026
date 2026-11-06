// Utils
import EventDispatcher from 'utils/EventDispatcher';
import device from 'utils/device';

const TAP_TRESHOLD = 2;

class DragManager extends EventDispatcher {
    constructor(options = {}) {
        super();

        this.el = options.el || document.body;
        this.preventDefault = options.preventDefault;
        this._touchStartPosition = { x: 0, y: 0 };
        this._touchPosition = { x: 0, y: 0 };

        this._dragDelta = { x: 0, y: 0 };

        this._enabled = true;

        this._isDragging = false;
        this._hasTouched = false;

        this._bindAll();
        this._setup();
    }

    /**
     * Getters & Setters
     */
    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
    }

    // Useful when raycasting or triggering sounds
    get hasTouched() {
        return this._hasTouched;
    }

    /**
     * Public
     */
    destroy() {
        this._removeEventListeners();
    }

    /**
     * Private
     */
    _setup() {
        this._setupEventListeners();
    }

    _bindAll() {
        this._touchstartHandler = this._touchstartHandler.bind(this);
        this._touchmoveHandler = this._touchmoveHandler.bind(this);
        this._touchendHandler = this._touchendHandler.bind(this);
        this._mousedownHandler = this._mousedownHandler.bind(this);
        this._mousemoveHandler = this._mousemoveHandler.bind(this);
        this._mouseupHandler = this._mouseupHandler.bind(this);
    }

    _setupEventListeners() {
        if (device.isTouch()) {
            this.el.addEventListener('touchstart', this._touchstartHandler, { passive: false });
            this.el.addEventListener('touchmove', this._touchmoveHandler, { passive: false });
            this.el.addEventListener('touchend', this._touchendHandler, { passive: false });
        } else {
            this.el.addEventListener('mousedown', this._mousedownHandler, { passive: true });
            window.addEventListener('mousemove', this._mousemoveHandler, { passive: true });
            window.addEventListener('mouseup', this._mouseupHandler, { passive: true });
        }
    }

    _removeEventListeners() {
        if (device.isTouch()) {
            this.el.removeEventListener('touchstart', this._touchstartHandler);
            this.el.removeEventListener('touchmove', this._touchmoveHandler);
            this.el.removeEventListener('touchend', this._touchendHandler);
        } else {
            this.el.removeEventListener('mousedown', this._mousedownHandler);
            window.removeEventListener('mousemove', this._mousemoveHandler);
            window.removeEventListener('mouseup', this._mouseupHandler);
        }
    }

    /**
     * Handlers
     */
    _dragstartHandler(e) {
        if (!this._enabled) return;
        this.dispatchEvent('dragstart', e);
    }

    _dragHandler(e) {
        if (!this._enabled) return;
        this.dispatchEvent('drag', e);
    }

    _dragendHandler(e) {
        this._isTap = false;
        if (!this._enabled) return;
        this.dispatchEvent('dragend', e);
    }

    _tapHandler(e) {
        clearTimeout(this._tapTimeout);
        this._isTap = true;
        this._tapTimeout = setTimeout(() => {
            this._isTap = false;
        }, 1000);

        if (!this._enabled) return;
        this.dispatchEvent('tap', e);
    }

    _touchdownHandler(e) {
        if (!this._enabled) return;
        this.dispatchEvent('touchdown', e);
    }

    _touchupHandler(e) {
        if (!this._enabled) return;
        this.dispatchEvent('touchup', e);
    }

    // Mouse
    _mousedownHandler(e) {
        this._isDragging = true;
        this._hasTouched = true;

        const position = {
            x: e.clientX,
            y: e.clientY,
        };

        const delta = { x: 0, y: 0 };

        this._touchPosition.x = position.x;
        this._touchPosition.y = position.y;

        this._touchStartPosition.x = position.x;
        this._touchStartPosition.y = position.y;

        this._touchdownHandler({ position, delta, startPosition: this._touchStartPosition });
        this._dragstartHandler({ position, delta, startPosition: this._touchStartPosition });
    }

    _mousemoveHandler(e) {
        if (!this._isDragging) return;

        const position = {
            x: e.clientX,
            y: e.clientY,
        };

        const delta = {
            x: this._touchPosition.x - position.x,
            y: this._touchPosition.y - position.y,
        };

        this._touchPosition.x = position.x;
        this._touchPosition.y = position.y;

        this._dragDelta.x = delta.x;
        this._dragDelta.y = delta.y;

        this._dragHandler({ position, delta, startPosition: this._touchStartPosition });
    }

    _mouseupHandler() {
        const position = this._touchPosition;
        const delta = this._dragDelta;

        if (
            this._isDragging &&
            Math.abs(position.x - this._touchStartPosition.x) < TAP_TRESHOLD &&
            Math.abs(position.y - this._touchStartPosition.y) < TAP_TRESHOLD
        ) {
            this._tapHandler({ position, delta, startPosition: this._touchStartPosition });
        } else {
            this._dragendHandler({ position, delta, startPosition: this._touchStartPosition });
        }

        this._isDragging = false;
        this._touchupHandler({ position, delta, startPosition: this._touchStartPosition });
    }

    // Touch
    _touchstartHandler(e) {
        this._isDragging = true;
        this._hasTouched = true;

        const position = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };

        const delta = { x: 0, y: 0 };

        this._touchPosition.x = position.x;
        this._touchPosition.y = position.y;

        this._touchStartPosition.x = position.x;
        this._touchStartPosition.y = position.y;

        this._touchdownHandler({ position, delta, touches: e.touches, startPosition: this._touchStartPosition });
        this._dragstartHandler({ position, delta, touches: e.touches, startPosition: this._touchStartPosition });

        if (this.preventDefault) {
            e.preventDefault();
        }
    }

    _touchmoveHandler(e) {
        if (!this._isDragging) return;

        const position = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        };

        const delta = {
            x: this._touchPosition.x - position.x,
            y: this._touchPosition.y - position.y,
        };

        this._touchPosition.x = position.x;
        this._touchPosition.y = position.y;

        this._dragDelta.x = delta.x;
        this._dragDelta.y = delta.y;

        this._dragHandler({ position, delta, startPosition: this._touchStartPosition, event: e });

        if (this.preventDefault) {
            e.preventDefault();
        }
    }

    _touchendHandler(e) {
        const position = this._touchPosition;
        const delta = this._dragDelta;

        if (
            this._isDragging &&
            Math.abs(position.x - this._touchStartPosition.x) < TAP_TRESHOLD &&
            Math.abs(position.y - this._touchStartPosition.y) < TAP_TRESHOLD
        ) {
            this._tapHandler({ position, delta, touches: e.touches });
        } else {
            this._dragendHandler({ position, delta, touches: e.touches, startPosition: this._touchStartPosition });
        }

        this._isDragging = false;
        this._touchupHandler({ position, delta, touches: e.touches, startPosition: this._touchStartPosition });

        if (this.preventDefault) {
            e.preventDefault();
        }
    }
}

export default DragManager;
