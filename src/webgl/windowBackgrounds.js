// Utils
import randomFromRange from 'utils/randomFromRange';

// Offset of the copied scene, in pixels, so windows don't look perfectly transparent
const OFFSET_MIN = 4;
const OFFSET_MAX = 12;

// 2D canvases filled every frame with the part of the WebGL scene behind them, see WebGL._drawWindowBackgrounds
const backgrounds = new Map();

/**
 * Private
 */
// Random direction, never close to 0
const getRandomOffset = () => {
    const sign = Math.random() < 0.5 ? -1 : 1;
    return sign * randomFromRange(OFFSET_MIN, OFFSET_MAX);
};

export default {
    add(canvas) {
        backgrounds.set(canvas, {
            context: canvas.getContext('2d'),
            offset: { x: getRandomOffset(), y: getRandomOffset() },
        });
    },

    remove(canvas) {
        backgrounds.delete(canvas);
    },

    entries() {
        return backgrounds.entries();
    },
};
