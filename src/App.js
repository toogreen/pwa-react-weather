import React, { useState, useEffect } from 'react';
import { fetchWeather } from './api/fetchWeather';
import { fetchWeatherGeo } from './api/fetchWeatherGeo';
import './App.css';
import $ from "jquery";
import getUserLocale from 'get-user-locale';
import geolocation from "geolocation";



// Determine language from the user's computer or browser

const locale =() => {
  
  if (getUserLocale().includes("fr")) {
    return(true)
  } else {
    return(false)
  }
}



const App = () => {
    const [query, setQuery] = useState('');
    const [weather, setWeather] = useState({});
    const [lang, setLang] = useState(locale);
    const [curCity, setcurCity] = useState('');


    // This is the main fucntion to search and fetch data at first
    const search = async (e) => {
        if (e.key === 'Enter') {
            const data = await fetchWeather(query, lang);
            setcurCity(query)
            // console.log(DataView)
            setWeather(data);
            // This removes what's in the input box
            setQuery('');
            // Added the below so that Android keyboard disappears when all is done.
            $(document.activeElement).filter(':input:focus').blur();


            // Added the below so use localStorage to remember this search
/*             if (typeof(Storage) !== "undefined") {


                var addToLocalStorageObject = function (name, key, value) {

                    // Get the existing data
                    var existing = localStorage.getItem("newsearch") 
                
                    // If no existing data, create an array
                    // Otherwise, convert the localStorage string to an array
                    existing = existing ? JSON.parse(existing) : {};
                
                    // Add new data to localStorage Array
                    existing[key] = query;
                
                    // Save back to localStorage
                    localStorage.setItem("newsearch", JSON.stringify(existing));

                
                };
            
            } */

        }
    }

    const geoSearch = async (e) => {
        geolocation.getCurrentPosition( async function (err, position) {
            if (err) throw err
            setQuery(weather.name);
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const data = await fetchWeatherGeo(latitude, longitude, lang, query);
            setWeather(data);
            setQuery('');
            $(document.activeElement).filter(':input:focus').blur();
        })
    }

    useEffect(() => {
        geolocation.getCurrentPosition( async function (err, position) {
            if (err) {
                throw err
            } else {
                geoSearch();
            }
        })
    }, []);




    // This is to toggle from FR to EN and refetch data in the other language
    const toggleLang = async (e) => {
        setLang(!lang); 
        const query = weather.name;
        const data = await fetchWeather(query, !lang);
        setWeather(data);
        // This removes what's in the input box
        setQuery('');
        $(document.activeElement).filter(':input:focus').blur();
    } 
    

    return(
        <div className="main-container">

            <button onClick={() => {toggleLang(); }} >{lang ? "EN" : "FR"}</button>
            
            <input 
                type="text"
                className="search"
                placeholder={lang ? "Entrez une ville" : "Enter a city"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={search}
            />

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
    )
}

export default App;