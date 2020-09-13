import React, { useState } from 'react';

import { fetchWeather } from './api/fetchWeather';
import './App.css';
import $ from "jquery"


const App = () => {
    const [query, setQuery] = useState('');
    const [weather, setWeather] = useState({})

    const search = async (e) => {
        if (e.key === 'Enter') {
            const data = await fetchWeather(query);
            // console.log(DataView)
            setWeather(data);
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

    return(
        <div className="main-container">
            <input 
                type="text"
                className="search"
                placeholder="Search for a city..."
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