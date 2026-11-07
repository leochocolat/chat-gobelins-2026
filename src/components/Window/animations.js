// Vendor
import { gsap } from 'gsap';

const ENTER_DURATION = 0.7;
const ENTER_STAGGER = 0.1;
const LEAVE_DURATION = 0.5;

let enterQueueLength = 0;

/**
 * Private
 */
// Windows entering in the same frame show one after another
const getEnterDelay = () => {
    const delay = enterQueueLength * ENTER_STAGGER;

    enterQueueLength++;
    requestAnimationFrame(() => {
        enterQueueLength = 0;
    });

    return delay;
};

/**
 * Public
 */
export const enter = (el, onComplete) => {
    const timeline = gsap.timeline({ delay: getEnterDelay(), onComplete });

    timeline.fromTo(el, { scale: 0 }, { scale: 1, duration: ENTER_DURATION, ease: 'expo.out' }, 0);
    timeline.fromTo(
        el.querySelector('.container'),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.4, ease: 'sine.inOut' },
        0.1,
    );

    return timeline;
};

// Accepts one window or a list of windows, played at the same time
export const leave = (elements, onComplete) => {
    const windows = gsap.utils.toArray(elements);
    const timeline = gsap.timeline({ onComplete });

    timeline.to(
        windows.map((el) => el.querySelector('.container')),
        { opacity: 0, duration: 0.2, ease: 'sine.out' },
        0,
    );
    timeline.to(windows, { scale: 0, duration: LEAVE_DURATION, ease: 'expo.inOut' }, 0.05);
    timeline.to(windows, { opacity: 0, duration: 0.3, ease: 'sine.inOut' }, 0.15);

    return timeline;
};
