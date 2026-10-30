const CONSENT_KEY = 'adConsent';
const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5829964164858117';

// Returns 'granted', 'denied', or null when the user has not chosen yet
export const getStoredConsent = () => {
    try {
        const value = localStorage.getItem(CONSENT_KEY);
        return value === 'granted' || value === 'denied' ? value : null;
    } catch (error) {
        return null;
    }
};

export const storeConsent = (value) => {
    try {
        localStorage.setItem(CONSENT_KEY, value);
    } catch (error) {
        console.error('Unable to save the cookie consent choice.', error);
    }
};

// AdSense is only loaded after the user accepts, so no Google ad cookies are set before consent
export const loadAdSense = () => {
    if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) {
        return;
    }

    if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted'
        });
    }

    const script = document.createElement('script');
    script.src = ADSENSE_SRC;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
};
