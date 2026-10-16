import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeather } from './api/fetchWeather';
import { fetchWeatherGeo } from './api/fetchWeatherGeo';
import { fetchCityImage } from './api/fetchCityImage';
import './App.css';
import $ from "jquery";
import getUserLocale from 'get-user-locale';
import geolocation from "geolocation";

// Determine language from the user's computer or browser
const locale = () => {
  return getUserLocale().includes("fr");
};

const cityBackgrounds = {
    montreal: `${process.env.PUBLIC_URL}/images/cities/montreal.jpg`,
};

const getCityBackground = (cityName) => {
    const normalizedCity = (cityName || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const imageUrl = cityBackgrounds[normalizedCity] || `${process.env.PUBLIC_URL}/images/stjoseph.jpg`;
    return `linear-gradient( rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.45) ), url("${imageUrl}")`;
};

const getWeatherErrorMessage = (error, lang) => {
    if (error.response?.status === 404) {
        return lang ? "Ville introuvable. Vérifiez l’orthographe et réessayez." : "City not found. Check the spelling and try again.";
    }

    return lang ? "Impossible de récupérer la météo. Réessayez." : "Could not load weather. Please try again.";
};

const INSTALL_PROMPT_DISMISSED_KEY = 'weather-app-install-prompt-dismissed';

const isIOSDevice = () => (
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

const isAppInstalled = () => (
    window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true
);

const hasDismissedInstallPrompt = () => {
    try {
        return window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true';
    } catch (error) {
        console.warn('Unable to read install prompt preference.', error);
        return false;
    }
};

const saveInstallPromptDismissed = () => {
    try {
        window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    } catch (error) {
        console.warn('Unable to save install prompt preference.', error);
    }
};

const App = () => {
    const [query, setQuery] = useState('');
    const [weather, setWeather] = useState({});
    const [lang, setLang] = useState(locale);
    const [cityImage, setCityImage] = useState(null);
    const [imageCity, setImageCity] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [iosInstallInstructions, setIosInstallInstructions] = useState(false);
    const langRef = useRef(lang);
    langRef.current = lang;

    useEffect(() => {
        if (isAppInstalled() || hasDismissedInstallPrompt()) {
            return undefined;
        }

        let promptTimer;
        const onBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredInstallPrompt(event);
            promptTimer = window.setTimeout(() => setShowInstallPrompt(true), 2000);
        };
        const onAppInstalled = () => {
            window.clearTimeout(promptTimer);
            setShowInstallPrompt(false);
            setDeferredInstallPrompt(null);
        };

        if (isIOSDevice()) {
            setIosInstallInstructions(true);
            promptTimer = window.setTimeout(() => setShowInstallPrompt(true), 2000);
        }

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);

        return () => {
            window.clearTimeout(promptTimer);
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    useEffect(() => {
        if (!imageCity?.name) {
            setCityImage(null);
            return undefined;
        }

        let cancelled = false;
        setCityImage(null);
        fetchCityImage(imageCity.name, imageCity.country)
            .then((image) => {
                if (!cancelled) {
                    setCityImage(image);
                }
            })
            .catch((error) => {
                console.error('Unable to load a city image from free image sources.', error);
                if (!cancelled) {
                    setCityImage(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [imageCity]);

    // This is the main function to search and fetch data at first
    const search = async (e) => {
        if (e.key === 'Enter') {
            const cityName = query.trim();
            if (!cityName) {
                return;
            }

            setSearchError('');
            try {
                const data = await fetchWeather(cityName, lang);
                setWeather(data);
                if (!lang) {
                    setImageCity({ name: data.name, country: data.sys?.country });
                } else {
                    try {
                        const englishWeather = await fetchWeather(cityName, false);
                        setImageCity({ name: englishWeather.name, country: data.sys?.country });
                    } catch (error) {
                        console.error('Unable to get the English city name for the photo search.', error);
                        setImageCity(null);
                    }
                }
                setQuery('');
                $(document.activeElement).filter(':input:focus').blur();
            } catch (error) {
                console.error('Weather search failed.', error);
                setSearchError(getWeatherErrorMessage(error, lang));
            }
        }
    };

    const geoSearch = useCallback(() => {
        geolocation.getCurrentPosition(async function (err, position) {
            if (err) {
                console.error(err);
                return;
            }

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            try {
                const data = await fetchWeatherGeo(latitude, longitude, langRef.current);
                setWeather(data);
                if (!langRef.current) {
                    setImageCity({ name: data.name, country: data.sys?.country });
                } else {
                    try {
                        const englishWeather = await fetchWeatherGeo(latitude, longitude, false);
                        setImageCity({ name: englishWeather.name, country: data.sys?.country });
                    } catch (error) {
                        console.error('Unable to get the English city name for the photo search.', error);
                        setImageCity(null);
                    }
                }
                setSearchError('');
                setQuery('');
                $(document.activeElement).filter(':input:focus').blur();
            } catch (error) {
                console.error('Unable to load weather for the current location.', error);
                setSearchError(getWeatherErrorMessage(error, langRef.current));
            }
        });
    }, []);

    useEffect(() => {
        geoSearch();
    }, [geoSearch]);

    // This is to toggle from FR to EN and refetch data in the other language
    const toggleLang = async (e) => {
        const nextLang = !lang;
        setLang(nextLang);
        setSearchError('');
        if (!weather.name) {
            return;
        }

        try {
            const data = await fetchWeather(weather.name, nextLang);
            setWeather(data);
            setQuery('');
            $(document.activeElement).filter(':input:focus').blur();
        } catch (error) {
            console.error('Unable to change the weather language.', error);
            setSearchError(getWeatherErrorMessage(error, nextLang));
        }
    };

    const dismissInstallPrompt = () => {
        saveInstallPromptDismissed();
        setShowInstallPrompt(false);
    };

    const installApp = async () => {
        if (!deferredInstallPrompt) {
            return;
        }

        try {
            await deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            setDeferredInstallPrompt(null);
            if (outcome === 'accepted') {
                setShowInstallPrompt(false);
            } else {
                dismissInstallPrompt();
            }
        } catch (error) {
            console.error('Unable to show the app installation prompt.', error);
            setDeferredInstallPrompt(null);
            dismissInstallPrompt();
        }
    };

    const backgroundImage = cityImage
        ? `linear-gradient( rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.45) ), url("${cityImage.url}")`
        : getCityBackground(weather.name || query);

    return (
        <div className="main-container" style={{ backgroundImage }}>
            {showInstallPrompt && (
                <div className="install-prompt-backdrop">
                    <section
                        className="install-prompt"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="install-prompt-title"
                    >
                        <button
                            className="install-prompt-close"
                            type="button"
                            aria-label={lang ? "Fermer" : "Close"}
                            onClick={dismissInstallPrompt}
                        >
                            &times;
                        </button>
                        <h2 id="install-prompt-title">
                            {lang ? "Installer l’application météo" : "Install the Weather App"}
                        </h2>
                        <p>
                            {iosInstallInstructions
                                ? (lang
                                    ? "Pour installer l’application, touchez Partager, puis « Sur l’écran d’accueil »."
                                    : "To install, tap Share, then “Add to Home Screen.”")
                                : (lang
                                    ? "Ajoutez la météo à votre appareil pour y accéder rapidement."
                                    : "Add weather to your device for quick access.")}
                        </p>
                        <div className="install-prompt-actions">
                            {deferredInstallPrompt && (
                                <button type="button" onClick={installApp}>
                                    {lang ? "Installer" : "Install"}
                                </button>
                            )}
                            <button type="button" onClick={dismissInstallPrompt}>
                                {iosInstallInstructions
                                    ? (lang ? "Compris" : "Got it")
                                    : (lang ? "Plus tard" : "Maybe later")}
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {cityImage && (
                <>
                    <img
                        className="background-image-preload"
                        src={cityImage.url}
                        alt=""
                        onError={() => setCityImage(null)}
                    />
                    <a
                        className="image-credit"
                        href={cityImage.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Photo: {cityImage.title} - {cityImage.creator || 'author unknown'} ({cityImage.license})
                    </a>
                </>
            )}
            <button onClick={() => { toggleLang(); }} >{lang ? "EN" : "FR"}</button>

            <input
                type="text"
                className="search"
                placeholder={lang ? "Entrez une ville" : "Enter a city"}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchError('');
                }}
                onKeyPress={search}
            />

            {searchError && <p className="search-error" role="alert">{searchError}</p>}

            {weather.main && (
                <div className="city">
                    <h2 className="city-name">
                        <span>{weather.name}</span>
                        <sup>{weather.sys.country}</sup>
                    </h2>
                    <div className="city-temp">
                        {Math.round(weather.main.temp)}
                        <sup>&deg;C</sup>
                    </div>
                    <div className="info">
                        <img className="city-icon" src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt={weather.weather[0].description}/>
                        <p>{weather.weather[0].description}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;