// Copyright (C) 2017-2023 Smart code 203358507

import React, { memo } from 'react';
import classnames from 'classnames';
import { VerticalNavBar, HorizontalNavBar } from 'stremio/components/NavBar';
import { useContentGamepadNavigation, useVerticalNavGamepadNavigation } from 'stremio/services/GamepadNavigation';
import styles from './MainNavBars.less';

const TABS = [
    { id: 'board', label: 'Board', icon: 'home', href: '/' },
    { id: 'discover', label: 'Discover', icon: 'discover', href: '/discover' },
    { id: 'library', label: 'Library', icon: 'library', href: '/library' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', href: '/calendar' },
    { id: 'addons', label: 'ADDONS', icon: 'addons', href: '/addons' },
    { id: 'settings', label: 'SETTINGS', icon: 'settings', href: '/settings' },
];

type Props = {
    className: string,
    route?: string,
    query?: string,
    children?: React.ReactNode,
};

const MainNavBars = memo(({ className, route, query, children }: Props) => {
    const navRef = React.useRef(null);
    const contentRef = React.useRef(null);

    const navRoute = route === 'continue_watching' ? 'library' : (route ?? '');
    useContentGamepadNavigation(contentRef, navRoute);
    useVerticalNavGamepadNavigation(navRef, navRoute);

    // TV: move through the nav sections with PageUp / PageDown — the gamepad
    // bridge maps L1 / R1 to those keys. Strict parity with the desktop
    // client's useVerticalNavGamepadNavigation: same route order (search
    // first), clamped at both ends, and the jump goes through the existing
    // digit shortcuts ('0' = search, '1'-'6' = tabs).
    React.useEffect(() => {
        const NAV_ROUTES = ['search', 'board', 'discover', 'library', 'calendar', 'addons', 'settings'];
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'PageUp' && event.key !== 'PageDown') return;
            if (document.querySelector('[data-virtual-keyboard]') !== null) return;
            event.preventDefault();
            const currentIndex = NAV_ROUTES.indexOf(navRoute);
            if (currentIndex === -1) return;
            const nextIndex = event.key === 'PageDown' ?
                Math.min(currentIndex + 1, NAV_ROUTES.length - 1)
                :
                Math.max(currentIndex - 1, 0);
            if (nextIndex !== currentIndex) {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: String(nextIndex), code: `Digit${nextIndex}`, bubbles: true }));
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [navRoute]);

    return (
        <div className={classnames(className, styles['main-nav-bars-container'])}>
            <HorizontalNavBar
                className={styles['horizontal-nav-bar']}
                route={route}
                query={query}
                backButton={false}
                searchBar={true}
                fullscreenButton={true}
                navMenu={true}
            />
            <VerticalNavBar
                ref={navRef}
                className={styles['vertical-nav-bar']}
                selected={route}
                tabs={TABS}
            />
            <div ref={contentRef} className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;

