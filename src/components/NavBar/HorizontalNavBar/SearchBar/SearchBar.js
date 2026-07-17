// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useNavigate } = require('react-router');
const { useSearchParams } = require('react-router-dom');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: useRouteFocused } = require('stremio/common/useRouteFocused');
const Button = require('stremio/components/Button').default;
const TextInput = require('stremio/components/TextInput').default;
const VirtualKeyboard = require('stremio/components/VirtualKeyboard').default;
const { default: usePlayUrl } = require('stremio/common/usePlayUrl');
const { withCoreSuspender } = require('stremio/common/CoreSuspender');
const useSearchHistory = require('./useSearchHistory');
const useLocalSearch = require('./useLocalSearch');
const styles = require('./styles');
const useBinaryState = require('stremio/common/useBinaryState');

const SearchBar = React.memo(({ className, query, active }) => {
    const { t } = useTranslation();
    const routeFocused = useRouteFocused();
    const searchHistory = useSearchHistory();
    const localSearch = useLocalSearch();
    const navigate = useNavigate();
    const { handlePlayUrl } = usePlayUrl();

    const [historyOpen, openHistory, closeHistory, ] = useBinaryState(query === null ? true : false);
    const [keyboardOpen, openKeyboard, closeKeyboard, ] = useBinaryState(false);
    const [currentQuery, setCurrentQuery] = React.useState(query || '');
    const [, setSearchParams] = useSearchParams();
    const searchInputRef = React.useRef(null);
    const containerRef = React.useRef(null);

    const searchBarOnClick = React.useCallback(() => {
        if (!active) {
            navigate('/search');
        }
    }, [active]);

    const searchHistoryOnClose = React.useCallback((event) => {
        if (historyOpen && containerRef.current && !containerRef.current.contains(event.target)) {
            closeHistory();
        }
    }, [historyOpen]);

    React.useEffect(() => {
        document.addEventListener('mousedown', searchHistoryOnClose);
        return () => {
            document.removeEventListener('mousedown', searchHistoryOnClose);
        };
    }, [searchHistoryOnClose]);

    const queryInputOnChange = React.useCallback(() => {
        const value = searchInputRef.current.value;
        setCurrentQuery(value);
        openHistory();
    }, []);

    const queryInputOnPaste = React.useCallback((event) => {
        const pasted = event.clipboardData.getData('text');
        if (pasted) {
            handlePlayUrl(pasted);
        }
    }, [handlePlayUrl]);

    const queryInputOnSubmit = React.useCallback((event) => {
        event.preventDefault();
        const value = event.target.value;
        // Empty input + Enter: open the on-screen keyboard instead of
        // submitting a blank search (the natural gamepad flow, since the A
        // button is mapped to Enter). A non-empty input submits normally.
        if (!value.trim().length) {
            openKeyboard();
            return;
        }
        setSearchParams({ search: value });
        closeHistory();
    }, []);

    // --- Virtual keyboard: drives the existing input via its ref so live
    // search and history keep working exactly as with a physical keyboard. ---
    const virtualKeyboardInput = React.useCallback((char) => {
        if (!searchInputRef.current) return;
        searchInputRef.current.value += char;
        queryInputOnChange();
    }, [queryInputOnChange]);

    const virtualKeyboardBackspace = React.useCallback(() => {
        if (!searchInputRef.current) return;
        searchInputRef.current.value = searchInputRef.current.value.slice(0, -1);
        queryInputOnChange();
    }, [queryInputOnChange]);

    const virtualKeyboardClear = React.useCallback(() => {
        if (!searchInputRef.current) return;
        searchInputRef.current.value = '';
        queryInputOnChange();
    }, [queryInputOnChange]);

    const virtualKeyboardSubmit = React.useCallback(() => {
        if (searchInputRef.current) {
            const value = searchInputRef.current.value;
            if (value.trim().length) {
                setSearchParams({ search: value });
                closeHistory();
            }
        }
        closeKeyboard();
    }, []);

    const queryInputClear = React.useCallback(() => {
        searchInputRef.current.value = '';
        setCurrentQuery('');
        setSearchParams({});
        navigate('/search');
    }, []);

    const updateLocalSearchDebounced = React.useCallback(debounce((query) => {
        localSearch.search(query);
    }, 250), []);

    React.useEffect(() => {
        updateLocalSearchDebounced(currentQuery);
    }, [currentQuery]);

    React.useEffect(() => {
        if (routeFocused && active) {
            searchInputRef.current.focus();
        }
    }, [routeFocused, active]);

    React.useEffect(() => {
        return () => {
            updateLocalSearchDebounced.cancel();
        };
    }, []);

    return (
        <div className={classnames(className, styles['search-bar-container'], { 'active': active })} onClick={searchBarOnClick} ref={containerRef}>
            {
                active ?
                    <TextInput
                        key={query}
                        ref={searchInputRef}
                        className={styles['search-input']}
                        type={'text'}
                        placeholder={t('SEARCH_OR_PASTE_LINK')}
                        defaultValue={query}
                        tabIndex={-1}
                        onChange={queryInputOnChange}
                        onPaste={queryInputOnPaste}
                        onSubmit={queryInputOnSubmit}
                        onClick={openHistory}
                    />
                    :
                    <div className={styles['search-input']}>
                        <div className={styles['placeholder-label']}>{ t('SEARCH_OR_PASTE_LINK') }</div>
                    </div>
            }
            {
                active ?
                    <Button className={styles['submit-button-container']} onClick={openKeyboard} title={'Clavier virtuel'}>
                        <Icon className={styles['icon']} name={'edit'} />
                    </Button>
                    :
                    null
            }
            {
                currentQuery.length > 0 ?
                    <Button className={styles['submit-button-container']} onClick={queryInputClear}>
                        <Icon className={styles['icon']} name={'close'} />
                    </Button>
                    :
                    <Button className={styles['submit-button-container']}>
                        <Icon className={styles['icon']} name={'search'} />
                    </Button>
            }
            {
                historyOpen && (searchHistory?.items?.length || localSearch?.items?.length) ?
                    <div className={styles['menu-container']}>
                        {
                            searchHistory?.items?.length > 0 ?
                                <div className={styles['items']}>
                                    <div className={styles['title']}>
                                        <div className={styles['label']}>{ t('STREMIO_TV_SEARCH_HISTORY_TITLE') }</div>
                                        <button className={styles['search-history-clear']} onClick={searchHistory.clear}>
                                            { t('CLEAR_HISTORY') }
                                        </button>
                                    </div>
                                    {
                                        searchHistory.items.slice(0, 8).map(({ query, deepLinks }, index) => (
                                            <Button key={index} className={styles['item']} href={deepLinks.search} onClick={closeHistory}>
                                                {query}
                                            </Button>
                                        ))
                                    }
                                </div>
                                :
                                null
                        }
                        {
                            localSearch?.items?.length ?
                                <div className={styles['items']}>
                                    <div className={styles['title']}>
                                        <div className={styles['label']}>{ t('SEARCH_SUGGESTIONS') }</div>
                                    </div>
                                    {
                                        localSearch.items.map(({ query, deepLinks }, index) => (
                                            <Button key={index} className={styles['item']} href={deepLinks.search} onClick={closeHistory}>
                                                {query}
                                            </Button>
                                        ))
                                    }
                                </div>
                                :
                                null
                        }
                    </div>
                    :
                    null
            }
            {
                active && keyboardOpen ?
                    <VirtualKeyboard
                        onInput={virtualKeyboardInput}
                        onBackspace={virtualKeyboardBackspace}
                        onClearAll={virtualKeyboardClear}
                        onSubmit={virtualKeyboardSubmit}
                        onClose={closeKeyboard}
                    />
                    :
                    null
            }
        </div>
    );
});

SearchBar.displayName = 'SearchBar';

SearchBar.propTypes = {
    className: PropTypes.string,
    query: PropTypes.string,
    active: PropTypes.bool
};

const SearchBarFallback = ({ className }) => {
    const { t } = useTranslation();
    return (
        <label className={classnames(className, styles['search-bar-container'])}>
            <div className={styles['search-input']}>
                <div className={styles['placeholder-label']}>{ t('SEARCH_OR_PASTE_LINK') }</div>
            </div>
            <Button className={styles['submit-button-container']} tabIndex={-1}>
                <Icon className={styles['icon']} name={'search'} />
            </Button>
        </label>
    );
};

SearchBarFallback.propTypes = SearchBar.propTypes;

module.exports = withCoreSuspender(SearchBar, SearchBarFallback);
