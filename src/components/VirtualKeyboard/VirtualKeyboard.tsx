// Copyright (C) 2017-2026 Smart code 203358507

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classnames from 'classnames';
import styles from './styles.less';

type Key =
    | { type: 'char', value: string, label: string }
    | { type: 'space' | 'backspace' | 'clear' | 'submit' | 'close', label: string };

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

// AZERTY layout: digits, three letter rows, then an actions row.
const ROWS: Key[][] = [
    charRow('1234567890'),
    charRow('azertyuiop'),
    charRow('qsdfghjklm'),
    charRow('wxcvbn'),
    [
        { type: 'space', label: 'ESPACE' },
        { type: 'backspace', label: 'EFFACER' },
        { type: 'clear', label: 'TOUT EFFACER' },
        { type: 'submit', label: 'VALIDER' },
        { type: 'close', label: 'FERMER' },
    ],
];

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const VirtualKeyboard = ({ onInput, onBackspace, onClearAll, onSubmit, onClose }: Props) => {
    // Start on the first letter row.
    const [pos, setPos] = useState<{ row: number, col: number }>({ row: 1, col: 0 });
    const posRef = useRef(pos);
    posRef.current = pos;

    const activate = useCallback((key: Key) => {
        switch (key.type) {
            case 'char': onInput(key.value); break;
            case 'space': onInput(' '); break;
            case 'backspace': onBackspace(); break;
            case 'clear': onClearAll(); break;
            case 'submit': onSubmit(); break;
            case 'close': onClose(); break;
        }
    }, [onInput, onBackspace, onClearAll, onSubmit, onClose]);

    // Keyboard capture: while the overlay is open the arrow keys move the
    // highlighted key instead of the focus/caret of the page behind it.
    // The gamepad bridge injects real arrow / Enter / Escape keydowns via
    // uinput, so this handler is what makes the overlay controller-driven.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const { row, col } = posRef.current;
            switch (event.key) {
                case 'ArrowUp': {
                    const nextRow = clamp(row - 1, 0, ROWS.length - 1);
                    setPos({ row: nextRow, col: clamp(col, 0, ROWS[nextRow].length - 1) });
                    break;
                }
                case 'ArrowDown': {
                    const nextRow = clamp(row + 1, 0, ROWS.length - 1);
                    setPos({ row: nextRow, col: clamp(col, 0, ROWS[nextRow].length - 1) });
                    break;
                }
                case 'ArrowLeft':
                    setPos({ row, col: clamp(col - 1, 0, ROWS[row].length - 1) });
                    break;
                case 'ArrowRight':
                    setPos({ row, col: clamp(col + 1, 0, ROWS[row].length - 1) });
                    break;
                case 'Enter':
                    activate(ROWS[row][col]);
                    break;
                case 'Escape':
                    onClose();
                    break;
                default:
                    return;
            }
            // Handled: stop it from reaching the search input / page behind.
            event.preventDefault();
            event.stopPropagation();
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [activate, onClose]);

    return createPortal((
        <div className={styles['virtual-keyboard']}>
            <div className={styles['backdrop']} onClick={onClose} />
            <div className={styles['keyboard']} role={'dialog'} aria-label={'Clavier virtuel'}>
                {ROWS.map((keys, rowIndex) => (
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
                                {key.label}
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
