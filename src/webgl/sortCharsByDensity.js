const SIZE = 32;

let canvas;
let context;

/**
 * Private
 */
const getContext = () => {
    if (context) return context;

    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    context = canvas.getContext('2d', { willReadFrequently: true });

    return context;
};

const getDensity = (char) => {
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillText(char, SIZE / 2, SIZE / 2);

    const { data } = context.getImageData(0, 0, SIZE, SIZE);
    let density = 0;

    for (let i = 3; i < data.length; i += 4) density += data[i];

    return density;
};

/**
 * Public
 */
// Densest glyph first, the plane shader maps the darkest areas to the first character of the atlas
export default function sortCharsByDensity(chars, font) {
    const context = getContext();

    context.font = `${SIZE}px "${font}"`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const densities = new Map([...chars].map((char) => [char, getDensity(char)]));

    return [...chars].sort((a, b) => densities.get(b) - densities.get(a));
}
