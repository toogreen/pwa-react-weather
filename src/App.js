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

const isIOSDevice = () => (
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

const isAppInstalled = () => (
    window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true
);

const App = () => {
    const [query, setQuery] = useState('');
    const [weather, setWeather] = useState({});
    const [lang, setLang] = useState(locale);
    const [cityImage, setCityImage] = useState(null);
    const [imageCity, setImageCity] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
    const [showInstallInstructions, setShowInstallInstructions] = useState(false);
    const [appInstalled, setAppInstalled] = useState(isAppInstalled);
    const iosDevice = isIOSDevice();
    const langRef = useRef(lang);
    langRef.current = lang;

    useEffect(() => {
        if (isAppInstalled()) {
            return undefined;
        }

        const onBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredInstallPrompt(event);
        };
        const onAppInstalled = () => {
            setAppInstalled(true);
            setDeferredInstallPrompt(null);
            setShowInstallInstructions(false);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);

        return () => {
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

    const installApp = async () => {
        if (iosDevice) {
            setShowInstallInstructions((isShown) => !isShown);
            return;
        }

        if (!deferredInstallPrompt) {
            return;
        }

        try {
            await deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            setDeferredInstallPrompt(null);
        } catch (error) {
            console.error('Unable to show the app installation prompt.', error);
            setDeferredInstallPrompt(null);
        }
    };

    const backgroundImage = cityImage
        ? `linear-gradient( rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.45) ), url("${cityImage.url}")`
        : getCityBackground(weather.name || query);

    return (
        <div className="main-container" style={{ backgroundImage }}>
            <a className="advertisement" href="https://aads.com/advertise/?partner=2458814">
                <img
                    src="https://aads.com/a_ads_banners/gif/english/468x60/simple_v1.gif"
                    alt="Advertise with Anonymous Ads"
                    width="468"
                    height="60"
                />
            </a>
            {!appInstalled && (iosDevice || deferredInstallPrompt) && (
                <>
                    <button
                        className="install-button"
                        type="button"
                        onClick={installApp}
                        aria-expanded={iosDevice ? showInstallInstructions : undefined}
                    >
                        {lang ? "Installer" : "Install"}
                    </button>
                    {iosDevice && showInstallInstructions && (
                        <section className="install-help" aria-live="polite">
                            {lang
                                ? "Pour installer, touchez Partager, puis « Sur l’écran d’accueil »."
                                : "To install, tap Share, then “Add to Home Screen.”"}
                        </section>
                    )}
                </>
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

            <footer className="page-footer">
                <a href="https://toogreen.ca">Copyright 2026 toogreen.ca</a>
            </footer>

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