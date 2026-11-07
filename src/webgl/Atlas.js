// Vendor
import { Texture } from 'ogl';

export default class Atlas {
    constructor(gl, options = {}) {
        this._gl = gl;
        this._fontSize = options.fontSize;
        this._charSize = options.charSize;
        this._charset = options.charset;
        this._font = options.font;
        this._textColor = options.textColor;
        this._offsetY = options.offsetY || 0;
        this._isVisible = options.showDebug;
        this._scale = options.scale || 1;

        this._setup();
    }

    /**
     * Getters
     */
    get texture() {
        return this._texture;
    }

    get charset() {
        return this._charset;
    }

    get canvas() {
        return this._canvas;
    }

    get charCount() {
        return this._charset.length;
    }

    /**
     * Public
     */
    setVisible(visible) {
        this._isVisible = visible;
        this._canvas.style.display = visible ? 'block' : 'none';
    }

    setScale(scale) {
        this._scale = scale;
        this._canvas.style.transform = `scale(${ scale })`;
    }

    rebuild(options = {}) {
        if (options.fontSize !== undefined) this._fontSize = options.fontSize;
        if (options.charSize !== undefined) this._charSize = options.charSize;
        if (options.charset !== undefined) this._charset = options.charset;
        if (options.font !== undefined) this._font = options.font;
        if (options.textColor !== undefined) this._textColor = options.textColor;
        if (options.offsetY !== undefined) this._offsetY = options.offsetY;

        this._canvas.width = this._charset.length * this._charSize;
        this._canvas.height = this._charSize;

        this._drawGlyphs();

        this._texture.image = this._canvas;
        this._texture.needsUpdate = true;

        this._ensureFontLoaded();
    }

    destroy() {
        this._canvas.remove();
    }

    /**
     * Private
     */
    _setup() {
        this._createCanvas();
        this._drawGlyphs();
        this._createTexture();
        this._ensureFontLoaded();
    }

    _ensureFontLoaded() {
        document.fonts.load(`${ this._fontSize }px "${ this._font }"`, this._charset).then(() => {
            this._drawGlyphs();
            this._texture.image = this._canvas;
            this._texture.needsUpdate = true;
        }).catch(() => {});
    }

    _createCanvas() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this._charset.length * this._charSize;
        this._canvas.height = this._charSize;

        this._canvas.style.position = 'fixed';
        this._canvas.style.left = '0';
        this._canvas.style.top = '0';
        this._canvas.style.zIndex = '999999';
        this._canvas.style.border = 'solid 1px red';
        this._canvas.style.display = this._isVisible ? 'block' : 'none';
        this._canvas.style.transform = `scale(${ this._scale })`;
        this._canvas.style.transformOrigin = 'top left';

        document.body.appendChild(this._canvas);
    }

    _drawGlyphs() {
        const ctx = this._canvas.getContext('2d');

        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        ctx.font = `${ this._fontSize }px "${ this._font }"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < this._charset.length; i++) {
            const char = this._charset[i];
            ctx.fillStyle = 'white';
            ctx.fillRect(this._charSize * i, 0, this._charSize, this._charSize);
            ctx.fillStyle = this._textColor;
            ctx.fillText(char, this._charSize * i + this._charSize / 2, this._charSize / 2 + this._offsetY);
        }
    }

    _createTexture() {
        this._texture = new Texture(this._gl, {
            image: this._canvas,
            generateMipmaps: false,
        });
    }
}
