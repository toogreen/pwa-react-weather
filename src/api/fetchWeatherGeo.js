import axios from 'axios';

const URL = 'https://api.openweathermap.org/data/2.5/weather/';
const API_KEY = 'b494e3d192ab2872d5c026d61db4b91f';
  
export const fetchWeatherGeo = async (latitude, longitude, lang, query) => {
    
    const { data } = await axios.get(URL, {

        params: {
            lat: latitude,
            lon: longitude,
            units: 'metric',
            appid: API_KEY,
            lang: lang ? 'fr' : 'en',
            q: query
        }
        
    });
    return data;
}