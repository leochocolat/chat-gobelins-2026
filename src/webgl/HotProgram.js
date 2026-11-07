// Vendor
import { Program } from 'ogl';

export default class HotProgram extends Program {
    constructor(gl, name, options) {
        super(gl, options);

        if (!name) console.error('HotProgram: name is undefined');

        this._name = name;
        this._vertex = options.vertex;
        this._fragment = options.fragment;

        this._setupHotReload();
    }

    /**
     * Private
     */
    _setupHotReload() {
        if (!import.meta.hot) return;

        import.meta.hot.on('shader-update', ({ folder, file, code }) => {
            if (folder !== this._name) return;

            if (file.includes('vertex')) {
                this._vertex = code;
            } else if (file.includes('fragment')) {
                this._fragment = code;
            }

            this.setShaders({
                vertex: this._vertex,
                fragment: this._fragment,
            });
        });
    }
}
