export default function hasPointer() {
    return window.matchMedia('(any-pointer: fine)').matches;
}