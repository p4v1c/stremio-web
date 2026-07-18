// Copyright (C) 2017-2026 Smart code 203358507

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classnames from 'classnames';
import { useGamepad } from 'stremio/services';
import styles from './styles.less';

type Key =
    | { type: 'char', value: string, label: string }
    | { type: 'space' | 'backspace' | 'clear' | 'submit' | 'close' | 'layer', label: string };

type Layer = 'abc' | 'sym';

type Props = {
    // Append a single character to the search input.
    onInput: (char: string) => void,
    // Remove the last character.
    onBackspace: () => void,
    // Clear the whole input.
    onClearAll: () => void,
    // Submit the current query (acts like Enter in the input) and close.
    onSubmit: () => void,
    // Close the overlay without submitting.
    onClose: () => void,
};

const charRow = (chars: string): Key[] =>
    chars.split('').map((value) => ({ type: 'char', value, label: value.toUpperCase() }));

const ACTIONS_ROW: Key[] = [
    { type: 'layer', label: '?123' },
    { type: 'space', label: 'ESPACE' },
    { type: 'backspace', label: 'EFFACER' },
    { type: 'clear', label: 'TOUT EFFACER' },
    { type: 'submit', label: 'VALIDER' },
    { type: 'close', label: 'FERMER' },
];

// Two layers sharing the digits and actions rows: AZERTY letters, and
// accents + punctuation. The `layer` key toggles between them.
const LAYERS: Record<Layer, Key[][]> = {
    abc: [
        charRow('1234567890'),
        charRow('azertyuiop'),
        charRow('qsdfghjklm'),
        charRow('wxcvbn'),
        ACTIONS_ROW,
    ],
    sym: [
        charRow('1234567890'),
        charRow('éèêàâçùûîô'),
        charRow('.,\'"-_:;!?'),
        charRow('@&#()[]/\\+'),
        ACTIONS_ROW,
    ],
};

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const VirtualKeyboard = ({ onInput, onBackspace, onClearAll, onSubmit, onClose }: Props) => {
    // Start on the first letter row.
    const [pos, setPos] = useState<{ row: number, col: number }>({ row: 1, col: 0 });
    const [layer, setLayer] = useState<Layer>('abc');
    const rows = LAYERS[layer];
    const posRef = useRef(pos);
    posRef.current = pos;
    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    const activate = useCallback((key: Key) => {
        switch (key.type) {
            case 'char': onInput(key.value); break;
            case 'space': onInput(' '); break;
            case 'backspace': onBackspace(); break;
            case 'clear': onClearAll(); break;
            case 'submit': onSubmit(); break;
            case 'close': onClose(); break;
            case 'layer':
                setLayer((current) => {
                    const next: Layer = current === 'abc' ? 'sym' : 'abc';
                    setPos(({ row, col }) => ({ row, col: clamp(col, 0, LAYERS[next][row].length - 1) }));
                    return next;
                });
                break;
        }
    }, [onInput, onBackspace, onClearAll, onSubmit, onClose]);

    const move = useCallback((direction?: string) => {
        const { row, col } = posRef.current;
        const rows = rowsRef.current;
        switch (direction) {
            case 'up': {
                const nextRow = clamp(row - 1, 0, rows.length - 1);
                setPos({ row: nextRow, col: clamp(col, 0, rows[nextRow].length - 1) });
                break;
            }
            case 'down': {
                const nextRow = clamp(row + 1, 0, rows.length - 1);
                setPos({ row: nextRow, col: clamp(col, 0, rows[nextRow].length - 1) });
                break;
            }
            case 'left':
                setPos({ row, col: clamp(col - 1, 0, rows[row].length - 1) });
                break;
            case 'right':
                setPos({ row, col: clamp(col + 1, 0, rows[row].length - 1) });
                break;
        }
    }, []);

    const activateCurrent = useCallback(() => {
        const { row, col } = posRef.current;
        activate(rowsRef.current[row][col]);
    }, [activate]);

    // Gamepad: same pattern as GamepadModal — lock the gamepad context while
    // the overlay is open so the spatial navigation behind it stays inert.
    // D-pad and left stick both emit 'analog', A activates, B closes.
    const gamepad = useGamepad();
    useEffect(() => {
        gamepad?.lock('virtual-keyboard');
        gamepad?.on('analog', 'virtual-keyboard-nav', move);
        gamepad?.on('buttonA', 'virtual-keyboard-select', activateCurrent);
        gamepad?.on('buttonB', 'virtual-keyboard-close', onClose);
        return () => {
            gamepad?.off('analog', 'virtual-keyboard-nav');
            gamepad?.off('buttonA', 'virtual-keyboard-select');
            gamepad?.off('buttonB', 'virtual-keyboard-close');
            gamepad?.unlock();
        };
    }, [gamepad, move, activateCurrent, onClose]);

    // Physical keyboards: while the overlay is open the arrow keys move the
    // highlighted key instead of the focus/caret of the page behind it.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowUp': move('up'); break;
                case 'ArrowDown': move('down'); break;
                case 'ArrowLeft': move('left'); break;
                case 'ArrowRight': move('right'); break;
                case 'Enter': activateCurrent(); break;
                case 'Escape': onClose(); break;
                default: return;
            }
            // Handled: stop it from reaching the search input / page behind.
            event.preventDefault();
            event.stopPropagation();
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [move, activateCurrent, onClose]);

    return createPortal((
        <div className={styles['virtual-keyboard']} data-virtual-keyboard>
            <div className={styles['backdrop']} onClick={onClose} />
            <div className={styles['keyboard']} role={'dialog'} aria-label={'Clavier virtuel'}>
                {rows.map((keys, rowIndex) => (
                    <div className={styles['row']} key={rowIndex}>
                        {keys.map((key, colIndex) => (
                            <div
                                key={colIndex}
                                className={classnames(
                                    styles['key'],
                                    styles[`key-${key.type}`],
                                    { [styles['focused']]: pos.row === rowIndex && pos.col === colIndex }
                                )}
                                onMouseEnter={() => setPos({ row: rowIndex, col: colIndex })}
                                onClick={() => activate(key)}
                            >
                                {key.type === 'layer' ? (layer === 'abc' ? '?123' : 'ABC') : key.label}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    ), document.body);
};

VirtualKeyboard.displayName = 'VirtualKeyboard';

export default VirtualKeyboard;
