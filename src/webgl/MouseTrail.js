// Vendor
import { Texture } from 'ogl';

export default class MouseTrail {
    constructor(gl, settings = {}, size = 128) {
        this._gl = gl;
        this._settings = settings;
        this._size = size;

        this._points = [];

        this._setup();
    }

    /**
     * Getters
     */
    get texture() {
        return this._texture;
    }

    get canvas() {
        return this._canvas;
    }

    /**
     * Public
     */
    setVisible(visible) {
        this._canvas.style.display = visible ? 'block' : 'none';
    }

    setScale(scale) {
        this._canvas.style.transform = `scale(${ scale })`;
    }

    addPoint(x, y) {
        this._points.push({ x, y });
    }

    update() {
        const ctx = this._ctx;
        const size = this._size;
        const brushSize = this._settings.brushSize * 0.5 * size;
        const fadeSpeed = this._settings.fadeSpeed;

        // Fade
        ctx.fillStyle = `rgba(0, 0, 0, ${ fadeSpeed })`;
        ctx.fillRect(0, 0, size, size);

        // Draw new points
        for (let i = 0; i < this._points.length; i++) {
            const point = this._points[i];
            const px = point.x * size;
            const py = point.y * size;

            const gradient = ctx.createRadialGradient(px, py, 0, px, py, brushSize);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, brushSize, 0, Math.PI * 2);
            ctx.fill();
        }

        this._points.length = 0;

        this._texture.needsUpdate = true;
    }

    resize(size) {
        this._size = size;
        this._canvas.width = size;
        this._canvas.height = size;
        this._ctx = this._canvas.getContext('2d');
        this._ctx.fillStyle = 'black';
        this._ctx.fillRect(0, 0, size, size);
    }

    destroy() {
        this._canvas.remove();
    }

    /**
     * Private
     */
    _setup() {
        this._createCanvas();
        this._createTexture();
    }

    _createCanvas() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this._size;
        this._canvas.height = this._size;

        this._ctx = this._canvas.getContext('2d');
        this._ctx.fillStyle = 'black';
        this._ctx.fillRect(0, 0, this._size, this._size);

        this._canvas.style.position = 'fixed';
        this._canvas.style.left = '0';
        this._canvas.style.bottom = '0';
        this._canvas.style.zIndex = '999998';
        this._canvas.style.imageRendering = 'pixelated';
        this._canvas.style.border = 'solid 1px red';
        this._canvas.style.display = this._settings.showDebug ? 'block' : 'none';
        this._canvas.style.transform = `scale(${ this._settings.debugScale })`;
        this._canvas.style.transformOrigin = 'bottom left';

        document.body.appendChild(this._canvas);
    }

    _createTexture() {
        this._texture = new Texture(this._gl, {
            image: this._canvas,
            generateMipmaps: false,
            magFilter: this._gl.NEAREST,
            minFilter: this._gl.NEAREST,
        });
    }
}
