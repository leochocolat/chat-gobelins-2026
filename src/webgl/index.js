// Vendor
import { Renderer, Camera, Mesh, Transform, RenderTarget, Plane, Torus, Color } from 'ogl';
import { gsap } from 'gsap';

// Utils
import WindowResizeObserver from 'utils/WindowResizeObserver';
import math from 'utils/math';
import device from 'utils/device';

// WebGL
import Atlas from 'webgl/Atlas';
import MouseTrail from 'webgl/MouseTrail';
import HotProgram from 'webgl/HotProgram';
import settings from 'webgl/settings';
import windowBackgrounds from 'webgl/windowBackgrounds';
import sortCharsByDensity from 'webgl/sortCharsByDensity';

// Shaders
import objectVertex from 'webgl/shaders/object/vertex.glsl?raw';
import objectFragment from 'webgl/shaders/object/fragment.glsl?raw';
import planeVertex from 'webgl/shaders/plane/vertex.glsl?raw';
import planeFragment from 'webgl/shaders/plane/fragment.glsl?raw';

const PERSPECTIVE = 800;

const CHARSET_PRESETS = {
    'Blocks': '█▉▊▋▌▍▎▏ ',
    'ASCII Dense': '@%#*+=-:. ',
    'ASCII Simple': '#=-. ',
    'Dots': '●◉◎○ ',
    'Braille': '⣿⣷⣯⣟⡿⢿⣻⣽⣾ ',
};

// Matches $breakpoints in style/resources/_variables.scss
const BREAKPOINTS = {
    medium: 500,
    large: 1050,
};

const RESPONSIVE = {
    small: {
        scale: 0.5,
        opacityFactor: 0.85,
    },
    medium: {
        scale: 0.5,
        opacityFactor: 0.85,
    },
    large: {
        scale: 1,
        opacityFactor: 1,
    },
};

export default class WebGL {
    constructor({ canvas, debugger: debugPanel, theme } = {}) {
        this._canvas = canvas;
        this._debugPanel = debugPanel;
        this._isDark = theme === 'dark';
        this._charset = null;

        this._bindAll();
        this._setup();
    }

    /**
     * Public
     */
    start() {
        this._setupEventListeners();
        this._resize();
        gsap.ticker.add(this._tickHandler);
    }

    pause() {
        this._isPaused = true;
    }

    resume() {
        this._isPaused = false;
    }

    // Replaces the atlas characters, null goes back to the settings charset
    setCharset(charset) {
        // Ends with a space so the lightest areas stay empty
        this._charset = charset ? `${sortCharsByDensity(charset, settings.atlas.font).join('')} ` : null;
        this._updateAtlas();
    }

    setTheme(theme) {
        this._isDark = theme === 'dark';
        this._plane.program.uniforms.uInvert.value = this._isDark ? 1 : 0;
        this._updateBackgroundColor();
        this._updateAtlas();
    }

    show(cb) {
        this._timelineShow?.kill();
        this._timelineHide?.kill();

        this._timelineShow = gsap.timeline({ onComplete: cb });
        this._timelineShow.fromTo(
            this._plane.program.uniforms.uTransition,
            { value: 0 },
            { value: 1, duration: 5, ease: 'power3.out' },
            0,
        );
        this._timelineShow.to(this._rotationTransition, { value: 1, duration: 5, ease: 'power3.out' }, 0);
        this._timelineShow.to(this._rotationAmplitudeTransition, { value: 1, duration: 3, ease: 'sine.out' }, 2);
    }

    hide(cb) {
        this._timelineShow?.kill();
        this._timelineHide?.kill();

        this._timelineHide = gsap.timeline({ onComplete: cb });
        this._timelineHide.fromTo(
            this._plane.program.uniforms.uTransition,
            { value: 1 },
            { value: 0, duration: 1, ease: 'power3.out' },
        );
    }

    destroy() {
        this._removeEventListeners();
        gsap.ticker.remove(this._tickHandler);
        this._timelineShow?.kill();
        this._timelineHide?.kill();
        this._renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
        this._atlas.destroy();
        this._mouseTrail.destroy();
    }

    /**
     * Private
     */
    _setup() {
        this._backgroundColor = new Color();

        this._mousePosition = {
            current: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
        };

        this._rotationAmplitudeTransition = {
            value: 0,
        };

        this._rotationTransition = {
            value: 0.2,
        };

        this._renderer = new Renderer({ canvas: this._canvas, antialias: true, alpha: false });
        this._gl = this._renderer.gl;
        this._scene = new Transform();
        this._camera = new Camera(this._gl, { fov: 45 });
        this._camera.position.set(0, 0, 5);

        this._renderTarget = new RenderTarget(this._gl, { magFilter: this._gl.NEAREST });
        this._rtScene = new Transform();
        this._rtCamera = new Camera(this._gl, { fov: 45 });
        this._rtCamera.position.set(0, 0, 5);

        this._atlas = new Atlas(this._gl, this._getAtlasOptions());
        this._mouseTrail = new MouseTrail(this._gl, settings.mouseTrail, settings.resolution);

        this._plane = this._createPlane();
        this._plane.setParent(this._scene);

        this._updateBackgroundColor();

        this._rtObject = this._createObject();
        this._rtObject.setParent(this._rtScene);

        if (this._debugPanel) this._setupDebugger();

        this.show();
    }

    _createObject() {
        const program = new HotProgram(this._gl, 'object', {
            vertex: objectVertex,
            fragment: objectFragment,
            uniforms: {
                uBaseColor: { value: new Color(settings.object.baseColor) },
                uFresnelColor: { value: new Color(settings.object.fresnelColor) },
                uFresnelPower: { value: settings.object.fresnelPower },
                uContrast: { value: settings.object.contrast },
                uBrightness: { value: settings.object.brightness },
                uSaturation: { value: settings.object.saturation },
            },
        });

        this._objectProgram = program;

        const geometry = new Torus(this._gl, { radius: 1, tube: 0.4, radialSegments: 32, tubularSegments: 96 });

        const container = new Transform();
        const mesh = new Mesh(this._gl, { geometry, program });
        mesh.setParent(container);

        return container;
    }

    _createPlane() {
        const geometry = new Plane(this._gl);

        const program = new HotProgram(this._gl, 'plane', {
            vertex: planeVertex,
            fragment: planeFragment,
            uniforms: {
                tMap: { value: this._renderTarget.texture },
                tAtlas: { value: this._atlas.texture },
                uResolution: { value: [0, 0] },
                uScreenResolution: { value: [0, 0] },
                uMapResolution: { value: [settings.resolution, settings.resolution] },
                uCharCount: { value: this._atlas.charCount },
                uSkipAscii: { value: settings.skipAscii ? 1 : 0 },
                uAsciiOpacity: { value: settings.asciiOpacity },
                tMouseTrail: { value: this._mouseTrail.texture },
                uMouseTrailStrength: { value: settings.mouseTrail.strength },
                uTime: { value: 0 },
                uTransition: { value: 0 },
                uInvert: { value: this._isDark ? 1 : 0 },
                uBackgroundColor: { value: this._backgroundColor },
            },
        });

        const plane = new Mesh(this._gl, { geometry, program });

        return plane;
    }

    // The plane shader inverts colors in dark mode, so the text color is pre-inverted to keep it as set
    _getAtlasOptions() {
        const options = { ...settings.atlas };

        if (this._charset) options.charset = this._charset;

        if (this._isDark) {
            const color = new Color(settings.atlas.textColor);
            options.textColor = `rgb(${(1 - color.r) * 255}, ${(1 - color.g) * 255}, ${(1 - color.b) * 255})`;
        }

        return options;
    }

    // Matches the page background, defined by the theme in style/core/_themes.scss
    _updateBackgroundColor() {
        const backgroundColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-background')
            .trim();
        this._backgroundColor.set(backgroundColor);
    }

    _getBreakpoint() {
        const width = WindowResizeObserver.innerWidth;

        if (width >= BREAKPOINTS.large) return 'large';
        if (width >= BREAKPOINTS.medium) return 'medium';
        return 'small';
    }

    // The square plane always covers the screen, even on viewports wider than settings.planeSize
    _getPlaneSize() {
        return Math.max(settings.planeSize, WindowResizeObserver.innerWidth, WindowResizeObserver.innerHeight);
    }

    _resize() {
        const width = WindowResizeObserver.innerWidth;
        const height = WindowResizeObserver.innerHeight;
        const dpr = WindowResizeObserver.dpr;

        const size = this._getPlaneSize();

        this._breakpoint = this._getBreakpoint();

        this._renderer.dpr = dpr;
        this._renderer.setSize(width, height);

        this._renderTarget.setSize(settings.resolution, settings.resolution);
        this._rtCamera.perspective({ aspect: 1 });

        // Fit output plane to screen
        this._plane.scale.x = size;
        this._plane.scale.y = size;
        this._camera.position[2] = PERSPECTIVE;
        this._camera.perspective({
            aspect: width / height,
            fov: (180 * (2 * Math.atan(height / 2 / PERSPECTIVE))) / Math.PI,
            far: 1000,
        });
        this._camera.updateProjectionMatrix();

        this._plane.program.uniforms.uResolution.value[0] = size;
        this._plane.program.uniforms.uResolution.value[1] = size;

        this._plane.program.uniforms.uScreenResolution.value[0] = width;
        this._plane.program.uniforms.uScreenResolution.value[1] = height;

        // Responsive adjustments
        this._plane.program.uniforms.uAsciiOpacity.value =
            settings.asciiOpacity * RESPONSIVE[this._breakpoint].opacityFactor;
    }

    _update(time, deltaTime) {
        this._updateMousePosition(time, deltaTime);
        this._updateObject(time, deltaTime);

        this._mouseTrail.update();
    }

    _updateObject(time) {
        const scale = settings.object.scale * RESPONSIVE[this._breakpoint].scale;
        this._rtObject.scale.set(scale, scale, scale);

        // Rotation
        const mouseRotationX =
            math.map(this._mousePosition.current.x, -1, 1, -Math.PI / 2, Math.PI / 2) *
            settings.mouseAmplitude *
            this._rotationAmplitudeTransition.value;
        const mouseRotationY =
            math.map(this._mousePosition.current.y, -1, 1, -Math.PI / 2, Math.PI / 2) *
            settings.mouseAmplitude *
            this._rotationAmplitudeTransition.value;

        const timeRotationX =
            Math.cos(time * settings.rotationSpeed) * settings.timeAmplitude * this._rotationAmplitudeTransition.value;
        const timeRotationY =
            Math.sin(time * settings.rotationSpeed) * settings.timeAmplitude * this._rotationAmplitudeTransition.value;

        const transitionRotationX = (-Math.PI / 2) * (1.0 - this._rotationTransition.value);
        const transitionRotationY = (Math.PI / 2) * (1.0 - this._rotationTransition.value);

        this._rtObject.rotation.x = mouseRotationY + timeRotationY + transitionRotationX;
        this._rtObject.rotation.y = mouseRotationX + timeRotationX + transitionRotationY;
    }

    _updateMousePosition(time, deltaTime) {
        this._mousePosition.current.x = math.lerp(
            this._mousePosition.current.x,
            this._mousePosition.target.x,
            (0.02 * deltaTime) / 6,
        );
        this._mousePosition.current.y = math.lerp(
            this._mousePosition.current.y,
            this._mousePosition.target.y,
            (0.02 * deltaTime) / 6,
        );
    }

    _render() {
        // RT Background Clear Color
        this._gl.clearColor(1, 1, 1, 1);

        this._renderer.render({ scene: this._rtScene, camera: this._rtCamera, target: this._renderTarget });

        // Output Background Clear Color
        this._gl.clearColor(this._backgroundColor.r, this._backgroundColor.g, this._backgroundColor.b, 1);

        this._renderer.render({ scene: this._scene, camera: this._camera });

        // Has to run right after rendering, the drawing buffer is cleared once the frame is displayed
        this._drawWindowBackgrounds();
    }

    _drawWindowBackgrounds() {
        if (!settings.windowBackgrounds) return;

        const dpr = this._renderer.dpr;

        for (const [canvas, { context, offset }] of windowBackgrounds.entries()) {
            // Screen rect, including the window scale animation
            const rect = canvas.getBoundingClientRect();

            if (rect.width === 0 || rect.height === 0) continue;

            // Unscaled size, so the copy stays sharp once the window is fully opened
            const width = Math.round(canvas.offsetWidth * dpr);
            const height = Math.round(canvas.offsetHeight * dpr);

            if (canvas.width !== width) canvas.width = width;
            if (canvas.height !== height) canvas.height = height;

            // Near the screen edges the offset reaches outside the scene, that part is left to the window background color
            context.clearRect(0, 0, width, height);
            context.drawImage(
                this._canvas,
                (rect.left + offset.x) * dpr,
                (rect.top + offset.y) * dpr,
                rect.width * dpr,
                rect.height * dpr,
                0,
                0,
                width,
                height,
            );
        }
    }

    _setupDebugger() {
        const asciiFolder = this._debugPanel.addFolder({ title: 'ASCII Rendering' });

        asciiFolder
            .addBinding(settings, 'resolution', {
                min: 32,
                max: 512,
                step: 1,
            })
            .on('change', () => this._updateResolution());

        asciiFolder
            .addBinding(settings, 'planeSize', {
                min: 512,
                max: 4096,
                step: 1,
            })
            .on('change', () => this._updatePlaneSize());

        asciiFolder.addBinding(settings, 'skipAscii').on('change', () => {
            this._plane.program.uniforms.uSkipAscii.value = settings.skipAscii ? 1 : 0;
        });

        asciiFolder.addBinding(settings, 'asciiOpacity', { min: 0, max: 1 }).on('change', () => {
            this._plane.program.uniforms.uAsciiOpacity.value = settings.asciiOpacity;
        });

        const trailFolder = this._debugPanel.addFolder({ title: 'Mouse Trail' });

        trailFolder
            .addBinding(settings.mouseTrail, 'showDebug')
            .on('change', () => this._mouseTrail.setVisible(settings.mouseTrail.showDebug));

        trailFolder
            .addBinding(settings.mouseTrail, 'debugScale')
            .on('change', () => this._mouseTrail.setScale(settings.mouseTrail.debugScale));

        trailFolder.addBinding(settings.mouseTrail, 'brushSize', {
            min: 0,
            max: 1,
            step: 0.01,
        });

        trailFolder.addBinding(settings.mouseTrail, 'fadeSpeed', {
            min: 0.01,
            max: 0.5,
            step: 0.01,
        });

        trailFolder
            .addBinding(settings.mouseTrail, 'strength', {
                min: 0,
                max: 1,
                step: 0.01,
            })
            .on('change', () => {
                this._plane.program.uniforms.uMouseTrailStrength.value = settings.mouseTrail.strength;
            });

        const atlasFolder = this._debugPanel.addFolder({ title: 'Atlas' });

        atlasFolder
            .addBinding(settings.atlas, 'showDebug')
            .on('change', () => this._atlas.setVisible(settings.atlas.showDebug));

        atlasFolder
            .addBinding(settings.atlas, 'debugScale')
            .on('change', () => this._atlas.setScale(settings.atlas.debugScale));

        const presetOptions = Object.keys(CHARSET_PRESETS).map((key) => ({ text: key, value: key }));

        atlasFolder
            .addBinding(settings, 'charsetPreset', {
                label: 'preset',
                options: presetOptions,
            })
            .on('change', () => {
                settings.atlas.charset = CHARSET_PRESETS[settings.charsetPreset];
                charsetBinding.refresh();
                this._updateAtlas();
            });

        const charsetBinding = atlasFolder
            .addBinding(settings.atlas, 'charset')
            .on('change', () => this._updateAtlas());

        atlasFolder
            .addBinding(settings.atlas, 'fontSize', {
                min: 10,
                max: 200,
                step: 1,
            })
            .on('change', () => this._updateAtlas());

        atlasFolder
            .addBinding(settings.atlas, 'charSize', {
                min: 10,
                max: 200,
                step: 1,
            })
            .on('change', () => this._updateAtlas());

        atlasFolder.addBinding(settings.atlas, 'font').on('change', () => this._updateAtlas());

        atlasFolder.addBinding(settings.atlas, 'textColor').on('change', () => this._updateAtlas());

        atlasFolder
            .addBinding(settings.atlas, 'offsetY', {
                min: -50,
                max: 50,
                step: 1,
            })
            .on('change', () => this._updateAtlas());

        const objectFolder = this._debugPanel.addFolder({ title: '3D Object' });

        objectFolder.addBinding(settings.object, 'baseColor').on('change', () => this._updateObjectMaterial());

        objectFolder.addBinding(settings.object, 'fresnelColor').on('change', () => this._updateObjectMaterial());

        objectFolder
            .addBinding(settings.object, 'fresnelPower', {
                min: 0,
                max: 5,
                step: 0.01,
            })
            .on('change', () => this._updateObjectMaterial());

        objectFolder
            .addBinding(settings.object, 'contrast', {
                min: 0,
                max: 3,
                step: 0.01,
            })
            .on('change', () => this._updateObjectMaterial());

        objectFolder
            .addBinding(settings.object, 'brightness', {
                min: 0,
                max: 3,
                step: 0.01,
            })
            .on('change', () => this._updateObjectMaterial());

        objectFolder
            .addBinding(settings.object, 'saturation', {
                min: 0,
                max: 3,
                step: 0.01,
            })
            .on('change', () => this._updateObjectMaterial());

        // Applied every frame in _updateObject
        objectFolder.addBinding(settings.object, 'scale', {
            min: 0.05,
            max: 2,
            step: 0.01,
        });

        const animFolder = this._debugPanel.addFolder({ title: 'Animation' });

        animFolder.addBinding(settings, 'rotationSpeed', {
            min: 0,
            max: 3,
            step: 0.01,
        });

        animFolder.addBinding(settings, 'mouseAmplitude', {
            min: -1,
            max: 1,
            step: 0.01,
        });

        animFolder.addBinding(settings, 'timeAmplitude', {
            min: -1,
            max: 1,
            step: 0.01,
        });

        const windowsFolder = this._debugPanel.addFolder({ title: 'Windows' });

        windowsFolder.addBinding(settings, 'windowBackgrounds', { label: 'backgrounds' }).on('change', () => {
            if (!settings.windowBackgrounds) this._clearWindowBackgrounds();
        });

        const transitionFolder = this._debugPanel.addFolder({ title: 'Transition' });

        transitionFolder.addBinding(this._plane.program.uniforms.uTransition, 'value', {
            label: 'Progress',
            min: 0,
            max: 1,
            step: 0.01,
        });

        transitionFolder.addButton({ title: 'Show' }).on('click', () => {
            this.show();
        });

        transitionFolder.addButton({ title: 'Hide' }).on('click', () => {
            this.hide();
        });

        this._debugPanel.registerFile(settings, settings.file);
    }

    // Leaves the window background color visible
    _clearWindowBackgrounds() {
        for (const [canvas, { context }] of windowBackgrounds.entries()) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    _updateResolution() {
        this._renderTarget.setSize(settings.resolution, settings.resolution);
        this._plane.program.uniforms.uMapResolution.value[0] = settings.resolution;
        this._plane.program.uniforms.uMapResolution.value[1] = settings.resolution;
        this._mouseTrail.resize(settings.resolution);
    }

    _updateAtlas() {
        this._atlas.rebuild(this._getAtlasOptions());
        this._plane.program.uniforms.tAtlas.value = this._atlas.texture;
        this._plane.program.uniforms.uCharCount.value = this._atlas.charCount;
    }

    _updatePlaneSize() {
        this._resize();
    }

    _updateObjectMaterial() {
        this._objectProgram.uniforms.uBaseColor.value = new Color(settings.object.baseColor);
        this._objectProgram.uniforms.uFresnelColor.value = new Color(settings.object.fresnelColor);
        this._objectProgram.uniforms.uFresnelPower.value = settings.object.fresnelPower;
        this._objectProgram.uniforms.uContrast.value = settings.object.contrast;
        this._objectProgram.uniforms.uBrightness.value = settings.object.brightness;
        this._objectProgram.uniforms.uSaturation.value = settings.object.saturation;
    }

    _bindAll() {
        this._tickHandler = this._tickHandler.bind(this);
        this._resizeHandler = this._resizeHandler.bind(this);
        this._mousemoveHandler = this._mousemoveHandler.bind(this);
        this._touchmoveHandler = this._touchmoveHandler.bind(this);
        this._touchstartHandler = this._touchstartHandler.bind(this);
    }

    /**
     * Events
     */
    _setupEventListeners() {
        WindowResizeObserver.addEventListener('resize', this._resizeHandler);
        window.addEventListener('mousemove', this._mousemoveHandler);
        window.addEventListener('touchmove', this._touchmoveHandler);
        window.addEventListener('touchstart', this._touchstartHandler);
    }

    _removeEventListeners() {
        WindowResizeObserver.removeEventListener('resize', this._resizeHandler);
        window.removeEventListener('mousemove', this._mousemoveHandler);
        window.removeEventListener('touchmove', this._touchmoveHandler);
        window.removeEventListener('touchstart', this._touchstartHandler);
    }

    /**
     * Handlers
     */
    _tickHandler(time, deltaTime) {
        if (this._isPaused) return;

        this._update(time, deltaTime);
        this._render();
    }

    _resizeHandler() {
        this._resize();
    }

    _mousemoveHandler(e) {
        if (!device.hasPointer()) return;

        this._mousemove(e.clientX, e.clientY);
    }

    _touchmoveHandler(e) {
        if (!device.isTouch()) return;

        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            this._mousemove(touch.clientX, touch.clientY);
        }
    }

    _touchstartHandler(e) {
        if (!device.isTouch()) return;

        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            this._mousemove(touch.clientX, touch.clientY);
        }
    }

    _mousemove(x, y) {
        const width = WindowResizeObserver.innerWidth;
        const height = WindowResizeObserver.innerHeight;
        const size = this._getPlaneSize();

        // Convert screen pixels to plane UV space
        // The camera is set so that world units match screen pixels at z=PERSPECTIVE
        // The plane is size*size centered at origin, so world coords range [-size/2, size/2]
        const worldX = x - width / 2;
        const worldY = y - height / 2;
        const nx = worldX / size + 0.5;
        const ny = worldY / size + 0.5;

        this._mouseTrail.addPoint(nx, ny);

        this._mousePosition.target.x = (x / width - 0.5) * 2.0;
        this._mousePosition.target.y = (y / height - 0.5) * 2.0;
    }
}
