export default function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';

    // iPadOS 13+ reports a desktop Safari UA, so fall back to touch detection.
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i).test(userAgent) || isIPadOS;
}
