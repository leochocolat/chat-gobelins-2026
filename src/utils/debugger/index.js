// Vendor
import { FolderApi, TabPageApi, Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

// Utils
import addUndoRedoFeature from './addUndoRedoFeature';
import DragManager from 'utils/DragManager';
import frameTimeout from 'utils/frameTimeout';

// Served by the Vite dev server (see vite/debuggerServer.js)
const DEBUGGER_SERVER_URL = '/__debugger/save';
const DEBUGGER_SERVER_CHECK_URL = '/__debugger/check';

// Add CSS backgroundColor option to Tweakpane's addFolder() method
Object.assign(FolderApi.prototype, {
    addFolder: function(options) {
        const folder = this.rackApi_.addFolder(options);
        if (options.backgroundColor) folder.element.style.backgroundColor = options.backgroundColor;
        return folder;
    },
});

addUndoRedoFeature({ FolderApi, TabPageApi });

class Debugger extends Pane {
    constructor(options = {}) {
        super();

        // Props
        this.__title = options.title || 'Debugger';
        this.__position = options.position; // Options: top-left, top-right, bottom-left, bottom-right

        // Setup
        this.registerPlugin(EssentialsPlugin);

        this.__files = [];
        this.__width = sessionStorage.getItem(`debugger/${ this._title }/width`) ? parseInt(sessionStorage.getItem(`debugger/${ this._title }/width`)) : 300;
        this.__offset = JSON.parse(sessionStorage.getItem(`debugger/${ this._title }/offset`)) || { x: 0, y: 0 };
        this.__isVisible = sessionStorage.getItem(`debugger/${ this._title }/isVisible`);

        this.__opacities = [1, 0.5, 0.2];
        this.__opacityIndex = sessionStorage.getItem(`debugger/${ this._title }/opacityIndex`) ? parseInt(sessionStorage.getItem(`debugger/${ this._title }/opacityIndex`)) : 0;
        this.__opacity = this.__opacities[this.__opacityIndex];

        this.__server = {
            state: 'disconnected',
        };

        this.__bindAll();
        this.__setup();

        // Wait for all the folders to be created
        frameTimeout(() => {
            this.__saveStates();
            this.__applyStates();

            this.__setupFoldEventListeners();
            this.__setupTabSelectEventListeners();
        }, 16);
    }

    /**
     * Public
     */
    destroy() {
        super.dispose();
        this.__removeEventListeners();
    }

    refresh() {
        super.refresh();

        this.__saveStates();
        this.__applyStates();

        this.__setupFoldEventListeners();
        this.__setupTabSelectEventListeners();
    }

    registerFile(data, file) {
        this.__files.push({ data, file });
    }

    save() {
        const promises = [];

        console.log(`Saving ${ this.__files.length } files...`);

        for (let i = 0; i < this.__files.length; i++) {
            const promise = fetch(DEBUGGER_SERVER_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: this.__files[i].data, file: this.__files[i].file }),
            }).then((e) => {
                if (e.status === 200) console.log(`Successfully saved file : "${ this.__files[i].file }"`);
            });
            promises.push(promise);
        }

        return Promise.all(promises);
    }

    download() {
        const filesData = this.__files.map(file => ({
            data: file.data,
            file: file.file,
        }));

        const json = JSON.stringify(filesData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        a.download = `debugger-${ date.toISOString() }.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    upload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const filesData = JSON.parse(e.target.result);
                        this.__files = filesData.map(fileData => ({
                            data: fileData.data,
                            file: fileData.file,
                        }));
                        console.log('Files uploaded successfully');
                    } catch (error) {
                        console.error('Error parsing uploaded file:', error);
                    }

                    this.save();
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    on(eventName, callback) {
        this.emitter_.on(eventName, callback);
    }

    off(eventName, callback) {
        this.emitter_.off(eventName, callback);
    }

    emit(eventName, payload) {
        this.emitter_.emit(eventName, payload);
    }

    /**
     * Private
     */
    __setup() {
        this.__setupStyle();
        this.__createDragButton();
        this.__createExpandDragArea();
        this.__checkDebuggerServer();
        this.__createSaveBlades();
        this.__setupEventListeners();
        this.__updatePosition();
        this.__updateVisibility();
        this.__updateOpacity();
        this.__updateSize();
        this.__checkOutOfView();
    }

    __saveStates() {
        this.__saveTree();
    }

    __applyStates() {
        this.__applySavedTabPagesStates();
        this.__applySavedFolderStates();
    }

    __saveTree() {
        this.__tree = [];
        this.__folders = [];
        this.__tabs = [];
        this.__tabPages = [];

        this.__traverse(this, (children) => {
            this.__tree.push(children);

            switch (Object.getPrototypeOf(children).constructor.name) {
                case 'FolderApi':
                    this.__folders.push(children);
                    break;
                case 'TabApi':
                    this.__tabs.push(children);
                    break;
                case 'TabPageApi':
                    this.__tabPages.push(children);
                    break;
            }
        });

        // Prevent duplicated uid
        const encounteredUIDs = {};

        for (let i = 0; i < this.__tree.length; i++) {
            const obj = this.__tree[i];
            const uid = obj.uid;
            if (encounteredUIDs[uid]) {
                let index = 1;
                let newUID = `${ uid }_${ index }`;
                while (encounteredUIDs[newUID]) {
                    index++;
                    newUID = `${ uid }_${ index }`;
                }
                obj.uid = newUID;
            }
            encounteredUIDs[obj.uid] = true;
        }
    }

    __applySavedFolderStates() {
        for (let i = 0; i < this.__folders.length; i++) {
            const folder = this.__folders[i];
            if (sessionStorage.getItem(`${ folder.uid }/expanded`)) {
                folder.expanded = JSON.parse(sessionStorage.getItem(`${ folder.uid }/expanded`));
            } else {
                // Folders are closed by default
                folder.expanded = false;
            }
        }
    }

    __applySavedTabPagesStates() {
        for (let i = 0; i < this.__tabPages.length; i++) {
            const tab = this.__tabPages[i];
            if (sessionStorage.getItem(`${ tab.uid }/selected`)) {
                tab.selected = JSON.parse(sessionStorage.getItem(`${ tab.uid }/selected`));
            }
        }
    }

    __traverse(element, callback) {
        if (!element.uid) element.uid = this.__title || (element.title || element.label);

        callback(element);

        if (element.children) {
            const children = element.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                let uid = child.title || child.label;
                if (!uid) uid = Object.getPrototypeOf(child).constructor.name;
                child.uid = `${ element.uid }/${ uid }`;
                this.__traverse(child, callback);
            }
        }

        if (element.pages) {
            const pages = element.pages;
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const uid = page.title;
                page.uid = `${ element.uid }/${ uid }`;
                this.__traverse(page, callback);
            }
        }
    }

    __setupStyle() {
        if (this.__position) this.containerElem_.classList.add(this.__position);

        this.element.style.position = 'fixed';
        this.element.style.pointerEvents = 'all';
        this.element.style.overflow = 'scroll';
        this.element.style.maxHeight = '100vh';
    }

    __checkDebuggerServer() {
        if (import.meta.env.PROD) {
            this.__server.state = 'disconnected';
            return;
        }

        const interval = 5000;

        // Initial check
        fetch(DEBUGGER_SERVER_CHECK_URL, { method: 'GET' }).then((res) => {
            this.__server.state = res.ok ? 'connected' : 'disconnected';
        });

        // Check interval
        // this._checkDebuggerServerInterval = setInterval(() => {
        //     fetch(DEBUGGER_SERVER_CHECK_URL, { method: 'GET' }).then((res) => {
        //         this.__server.state = res.ok ? 'connected' : 'disconnected';
        //     }, () => {
        //         this.__server.state = 'disconnected';
        //     });
        // }, interval);
    }

    __createDragButton() {
        this.__dragButton = this.addButton({ title: this.__title });

        this.__dragButtonElement = this.__dragButton.element.querySelector('button');
        this.__dragButtonElement.style.cursor = 'grab';
    }

    __createExpandDragArea() {
        this.__expandDragArea = document.createElement('div');
        this.__expandDragArea.classList.add('expand-drag-area');
        this.element.appendChild(this.__expandDragArea);
    }

    __createSaveBlades() {
        this.addBlade({ view: 'separator', index: 1 });

        this.addButton({ title: '💾 Save', index: 5 }).on('click', this.__clickSaveHandler);
        this.addBinding(this.__server, 'state', { readonly: true, label: 'State', interval: 100, index: 2 });

        /*
         * Uncomment for download / upload buttons
         * this.addButton({ title: '⬇️ Download', index: 3 }).on('click', this.__clickDownloadHandler);
         * this.addButton({ title: '⬆️ Upload', index: 4 }).on('click', this.__clickUploadHandler);
         */

        this.addBlade({ view: 'separator', index: 6 });
    }

    __updatePosition() {
        sessionStorage.setItem(`debugger/${ this._title }/offset`, JSON.stringify(this.__offset));
        this.element.style.transform = `translate(${ this.__offset.x }px, ${ this.__offset.y }px)`;
    }

    __updateVisibility() {
        sessionStorage.setItem(`debugger/${ this._title }/isVisible`, this.__isVisible ? true : '');
        this.element.style.visibility = this.__isVisible ? 'visible' : 'hidden';
    }

    __updateOpacity() {
        sessionStorage.setItem(`debugger/${ this._title }/opacityIndex`, `${ this.__opacityIndex }`);
        this.__opacity = this.__opacities[this.__opacityIndex];
        this.element.style.opacity = this.__opacity;
    }

    __updateSize() {
        this.element.style.width = `${ this.__width }px`;
    }

    __checkOutOfView() {
        const x = this.element.offsetLeft + this.__offset.x;
        const y = this.element.offsetTop + this.__offset.y;

        if (x + this.__width <= 0) {
            this.__offset.x = 0;
        }

        if (x >= window.innerWidth) {
            this.__offset.x = 0;
        }

        if (y < 0) {
            this.__offset.y = 0;
        }

        if (y >= window.innerHeight) {
            this.__offset.y = 0;
        }

        this.__updatePosition();
    }

    __bindAll() {
        this.__dragHandler = this.__dragHandler.bind(this);
        this.__dragButtonMousedownHandler = this.__dragButtonMousedownHandler.bind(this);
        this.__dragButtonMouseupHandler = this.__dragButtonMouseupHandler.bind(this);
        this.__tapHandler = this.__tapHandler.bind(this);
        this.__keydownHandler = this.__keydownHandler.bind(this);
        this.__clickSaveHandler = this.__clickSaveHandler.bind(this);
        this.__clickDownloadHandler = this.__clickDownloadHandler.bind(this);
        this.__clickUploadHandler = this.__clickUploadHandler.bind(this);
        this.__dragExpandHandler = this.__dragExpandHandler.bind(this);
        this.__foldHandler = this.__foldHandler.bind(this);
        this.__selectHandler = this.__selectHandler.bind(this);
    }

    __setupEventListeners() {
        this.__dragManager = new DragManager({ el: this.__dragButtonElement });
        this.__dragManagerExpand = new DragManager({ el: this.__expandDragArea });
        this.__dragManager.addEventListener('drag', this.__dragHandler);
        this.__dragManager.addEventListener('tap', this.__tapHandler);
        this.__dragButtonElement.addEventListener('mousedown', this.__dragButtonMousedownHandler);
        this.__dragButtonElement.addEventListener('mouseup', this.__dragButtonMouseupHandler);
        this.__dragManagerExpand.addEventListener('drag', this.__dragExpandHandler);
        window.addEventListener('keydown', this.__keydownHandler);
    }

    __removeEventListeners() {
        this.__dragManager.destroy();
        this.__dragManagerExpand.destroy();
        this.__dragButtonElement.removeEventListener('mousedown', this.__dragButtonMousedownHandler);
        this.__dragButtonElement.removeEventListener('mouseup', this.__dragButtonMouseupHandler);
        window.removeEventListener('keydown', this.__keydownHandler);
    }

    __setupFoldEventListeners() {
        for (let i = 0; i < this.__folders.length; i++) {
            const folder = this.__folders[i];
            folder.on('fold', this.__foldHandler);
        }
    }

    __setupTabSelectEventListeners() {
        for (let i = 0; i < this.__tabs.length; i++) {
            const tab = this.__tabs[i];
            tab.on('select', this.__selectHandler);
        }
    }

    __dragHandler(e) {
        this.__offset.x -= e.delta.x;
        this.__offset.y -= e.delta.y;
        this.__updatePosition();
    }

    __tapHandler() { }

    __dragButtonMousedownHandler() {
        this.__dragButtonElement.style.cursor = 'grabbing';
    }

    __dragButtonMouseupHandler() {
        this.__dragButtonElement.style.cursor = 'grab';
    }

    __keydownHandler(e) {
        const cmd = e.metaKey || e.ctrlKey;
        const h = e.key === 'h';
        const H = e.key === 'H';

        if (cmd && h) {
            e.preventDefault();
            this.__isVisible = !this.__isVisible;
            this.__updateVisibility();
        }

        if (cmd && H) {
            e.preventDefault();
            this.__opacityIndex = (this.__opacityIndex + 1) % this.__opacities.length;
            this.__updateOpacity();
        }
    }

    __clickSaveHandler() {
        this.emit('save');
        this.save();
    }

    __clickDownloadHandler() {
        this.emit('download');
        this.download();
    }

    __clickUploadHandler() {
        this.emit('upload');
        this.upload();
    }

    __dragExpandHandler(e) {
        const direction = this.__position && this.__position.includes('left') ? -1 : 1;
        this.__width += e.delta.x * direction;
        sessionStorage.setItem(`debugger/${ this._title }/width`, JSON.stringify(this.__width));

        this.__updateSize();
    }

    __foldHandler(e) {
        const folder = e.target;
        sessionStorage.setItem(`${ folder.uid }/expanded`, folder.expanded);
    }

    __selectHandler(e) {
        const tab = e.target;
        const index = e.index;

        for (let i = 0; i < tab.pages.length; i++) {
            const page = tab.pages[i];
            sessionStorage.setItem(`${ page.uid }/selected`, i === index);
        }
    }
}

/*
 * const environment = 'production';
 * const environment = 'development';
 * const environment = process.env.NODE_ENV;
 * const D = environment !== 'production' ? Debugger : null;
 */

const D = Debugger;

export default D;
