import axios from 'axios';

const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';
const OPENVERSE_API_URL = 'https://api.openverse.org/v1/images/';

const normalize = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getTextFromHtml = (value = '') => {
    const document = new DOMParser().parseFromString(value, 'text/html');
    return document.body.textContent.trim();
};

const isReusableLicense = (license = '') => (
    /^(CC0|Public domain|PD(?:\s|$)|CC BY(?:-SA)?(?:\s|$))/i.test(license)
);

const isLikelyCityPhoto = (title, tags, width, height, cityTerms) => {
    const searchableText = normalize(`${title} ${tags}`);
    const excludedTerms = /\b(map|maps|mapping|locator|location|diagram|chart|atlas|route|routes|transit|metro|subway|coat of arms|flag|logo|illustration|drawing)\b/;

    return cityTerms.every((term) => normalize(title).includes(term))
        && !excludedTerms.test(searchableText)
        && Number(width) > Number(height);
};

export const fetchCityImage = async (cityName, countryCode) => {
    const cityTerms = normalize(cityName).split(/\s+/).filter(Boolean);
    if (!cityTerms.length) {
        return null;
    }

    const searchQueries = [
        `${cityName} skyline`,
        [cityName, countryCode].filter(Boolean).join(' ')
    ];

    try {
        for (const searchTerms of searchQueries) {
            const { data } = await axios.get(COMMONS_API_URL, {
                params: {
                    action: 'query',
                    generator: 'search',
                    gsrsearch: searchTerms,
                    gsrnamespace: 6,
                    gsrlimit: 30,
                    prop: 'imageinfo',
                    iiprop: 'url|extmetadata',
                    iiurlwidth: 1600,
                    format: 'json',
                    origin: '*'
                }
            });

            const pages = Object.values(data.query?.pages || {}).sort((a, b) => a.index - b.index);
            for (const page of pages) {
                const title = page.title.replace(/^File:/i, '');
                const imageInfo = page.imageinfo?.[0];
                if (!imageInfo?.thumburl || !isLikelyCityPhoto(
                    title,
                    '',
                    imageInfo.thumbwidth,
                    imageInfo.thumbheight,
                    cityTerms
                )) {
                    continue;
                }

                const metadata = imageInfo.extmetadata || {};
                const license = getTextFromHtml(metadata.LicenseShortName?.value || '');
                if (!isReusableLicense(license)) {
                    continue;
                }

                return {
                    url: imageInfo.thumburl,
                    pageUrl: imageInfo.descriptionurl,
                    title,
                    creator: getTextFromHtml(metadata.Artist?.value || ''),
                    license
                };
            }
        }
    } catch (error) {
        console.error('Wikimedia Commons image search failed; trying Openverse.', error);
    }

    const { data } = await axios.get(OPENVERSE_API_URL, {
        params: {
            q: `${cityName} skyline`,
            license: 'cc0,by,by-sa',
            page_size: 20
        }
    });
    const openverseResult = data.results?.find((result) => {
        const tags = (result.tags || []).map((tag) => tag.name).join(' ');
        return result.thumbnail && isLikelyCityPhoto(
            result.title || '',
            tags,
            result.width,
            result.height,
            cityTerms
        );
    });

    if (openverseResult) {
        const licenseNames = {
            cc0: 'CC0',
            by: 'CC BY',
            'by-sa': 'CC BY-SA'
        };

        return {
            url: openverseResult.thumbnail,
            pageUrl: openverseResult.foreign_landing_url,
            title: openverseResult.title,
            creator: openverseResult.creator || '',
            license: `${licenseNames[openverseResult.license] || openverseResult.license} ${openverseResult.license_version || ''}`.trim()
        };
    }

    return null;
};
