import axios from 'axios';

const URL = 'https://api.openweathermap.org/data/2.5/weather/';
const API_KEY = 'b494e3d192ab2872d5c026d61db4b91f';

export const fetchWeather = async (query) => {
    const { data } = await axios.get(URL, {
        params: {
            q: query,
            units: 'metric',
            APPID: API_KEY,
        }
    });

    return data;
}