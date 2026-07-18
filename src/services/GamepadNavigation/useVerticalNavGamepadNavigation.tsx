// Copyright (C) 2017-2026 Smart code 203358507

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGamepad } from '../GamepadContext';

const ROUTES = [
    { route: 'search', path: '/search' },
    { route: 'board', path: '/' },
    { route: 'discover', path: '/discover' },
    { route: 'library', path: '/library' },
    { route: 'calendar', path: '/calendar' },
    { route: 'addons', path: '/addons' },
    { route: 'settings', path: '/settings' },
];

const useVerticalGamepadNavigation = (_sectionRef: React.RefObject<HTMLDivElement>, currentRoute: string) => {
    const gamepad = useGamepad();
    const navigate = useNavigate();

    useEffect(() => {
        // Navigate directly instead of dispatching the digit shortcuts:
        // ShortcutsProvider ignores key events whenever an input has focus,
        // which is always the case on the search page (auto-focused input)
        // and made it impossible to leave with L1/R1.
        const moveTo = (direction: 'prev' | 'next') => {
            const currentIndex = ROUTES.findIndex(({ route }) => route === currentRoute);
            if (currentIndex === -1) return;

            let nextIndex = currentIndex;
            if (direction === 'next') nextIndex = Math.min(currentIndex + 1, ROUTES.length - 1);
            if (direction === 'prev') nextIndex = Math.max(currentIndex - 1, 0);

            if (nextIndex !== currentIndex) {
                navigate(ROUTES[nextIndex].path);
            }
        };

        gamepad?.on('buttonLT', currentRoute, () => moveTo('prev'));
        gamepad?.on('buttonRT', currentRoute, () => moveTo('next'));

        return () => {
            gamepad?.off('buttonLT', currentRoute);
            gamepad?.off('buttonRT', currentRoute);
        };
    }, [gamepad, currentRoute, navigate]);
};

export default useVerticalGamepadNavigation;
