// Copyright (C) 2017-2026 Smart code 203358507

import { useEffect, useRef } from 'react';
import { useGamepad } from '../GamepadContext';

const FOCUSABLE = '[tabindex]:not([data-focus-guard])';

// Last focused element per scope, remembered by href: pages remount when
// navigating back from a detail page, so the cursor would otherwise reset —
// restore it on the item we left from instead.
const lastFocusedHrefByScope = new Map<string, string>();

const rememberFocus = (scopeId: string, element: HTMLElement | null) => {
    const href = element?.getAttribute('href');
    if (href) lastFocusedHrefByScope.set(scopeId, href);
};

const restoreFocus = (scopeId: string, elements: HTMLElement[]): boolean => {
    const href = lastFocusedHrefByScope.get(scopeId);
    if (!href) return false;
    const element = elements.find((el) => el.getAttribute('href') === href);
    if (!element) return false;
    element.focus();
    return true;
};

const getActiveScope = (fallback: HTMLDivElement | null): HTMLElement | null => {
    if (document.querySelector('[data-gamepad-modal]')) return null;

    const modals = document.querySelectorAll<HTMLElement>('.modals-container');
    for (const modal of modals) {
        if (modal.children.length > 0) return modal;
    }

    const dropdown = fallback?.querySelector<HTMLElement>('[class*="dropdown"][class*="open"]');
    if (dropdown) return dropdown;

    return fallback;
};

const useContentGamepadNavigation = (
    sectionRef: React.RefObject<HTMLDivElement>,
    gamepadHandlerId: string
) => {
    const gamepad = useGamepad();
    const lastFocused = useRef<HTMLDivElement | null>(null);
    const wasInOverlay = useRef(false);

    useEffect(() => {
        const handleGamepadNavigation = (
            direction: 'left' | 'right' | 'up' | 'down'
        ) => {
            const scope = getActiveScope(sectionRef.current);
            const inOverlay = scope !== sectionRef.current;

            if (inOverlay && !wasInOverlay.current) {
                const focused = sectionRef.current?.querySelector<HTMLDivElement>(':focus');
                if (focused) lastFocused.current = focused;
            }
            wasInOverlay.current = inOverlay;

            const elements = Array.from(
                scope?.querySelectorAll<HTMLDivElement>(FOCUSABLE) || []
            );
            if (elements.length === 0) return;

            const activeElement = (scope ?? document)?.querySelector<HTMLDivElement>(':focus');

            if (!activeElement) {
                restoreFocus(gamepadHandlerId, elements) || elements[0].focus();
                return;
            }

            let closestElement: HTMLDivElement | null = null;
            const cur = activeElement.getBoundingClientRect();
            const cx = cur.left + cur.width / 2;
            const cy = cur.top + cur.height / 2;
            let closestDistance = Infinity;

            elements.forEach((el) => {
                if (el === activeElement) return;
                const r = el.getBoundingClientRect();
                const ex = r.left + r.width / 2;
                const ey = r.top + r.height / 2;

                const isCorrectDirection =
                    (direction === 'left' && ex < cx) ||
                    (direction === 'right' && ex > cx) ||
                    (direction === 'up' && ey < cy) ||
                    (direction === 'down' && ey > cy);

                if (!isCorrectDirection) return;

                const dx = ex - cx;
                const dy = ey - cy;
                const isHorizontal = direction === 'left' || direction === 'right';
                const primary = isHorizontal ? Math.abs(dx) : Math.abs(dy);
                const secondary = isHorizontal ? Math.abs(dy) : Math.abs(dx);
                const distance = primary + secondary * 3;

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestElement = el;
                }
            });

            if (closestElement) {
                (closestElement as HTMLDivElement).focus();
                rememberFocus(gamepadHandlerId, closestElement);
            }
        };

        const onSelect = () => {
            const scope = getActiveScope(sectionRef.current);
            const inOverlay = scope !== sectionRef.current;

            if (inOverlay && !wasInOverlay.current) {
                const focused = sectionRef.current?.querySelector<HTMLDivElement>(':focus');
                if (focused) lastFocused.current = focused;
            }
            wasInOverlay.current = inOverlay;

            const elements = Array.from(
                scope?.querySelectorAll<HTMLDivElement>(FOCUSABLE) || []
            );
            if (elements.length === 0) {
                if (lastFocused.current) {
                    lastFocused.current.focus();
                    wasInOverlay.current = false;
                }
                return;
            }

            const activeElement = (scope ?? document)?.querySelector<HTMLDivElement>(':focus');

            if (!activeElement) {
                restoreFocus(gamepadHandlerId, elements) || elements[0].focus();
                return;
            }
            const isSelect = Array.from(activeElement.classList).some((cls) => cls.startsWith('select-input'));
            if (!isSelect) {
                rememberFocus(gamepadHandlerId, activeElement);
                activeElement?.click();

                requestAnimationFrame(() => {
                    const stillInOverlay = getActiveScope(sectionRef.current) !== sectionRef.current;
                    if (!stillInOverlay && wasInOverlay.current && lastFocused.current) {
                        lastFocused.current.focus();
                        wasInOverlay.current = false;
                    }
                });
            }
        };

        gamepad?.on('analog', gamepadHandlerId, handleGamepadNavigation);
        gamepad?.on('buttonA', gamepadHandlerId, onSelect);

        // Put the cursor back where it was as soon as the content renders
        // (items load asynchronously, hence the short retry loop). Never
        // steals focus from an element that already has it.
        let restoreAttempts = 0;
        const restoreTimer = window.setInterval(() => {
            restoreAttempts++;
            const active = document.activeElement;
            const alreadyFocused = active instanceof HTMLElement && active !== document.body;
            const elements = Array.from(
                sectionRef.current?.querySelectorAll<HTMLDivElement>(FOCUSABLE) || []
            );
            if (alreadyFocused || restoreFocus(gamepadHandlerId, elements) || restoreAttempts >= 10) {
                window.clearInterval(restoreTimer);
            }
        }, 200);

        return () => {
            window.clearInterval(restoreTimer);
            gamepad?.off('analog', gamepadHandlerId);
            gamepad?.off('buttonA', gamepadHandlerId);
        };
    }, [gamepad, gamepadHandlerId, sectionRef]);
};

export default useContentGamepadNavigation;
