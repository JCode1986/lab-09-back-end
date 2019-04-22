'use strict';


require('dotenv').config();



//global constants
const PORT = process.env.PORT || 3000 ;
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

let responseDataObject = {};

//cache timouts
const timeouts = {
  weather: 15 * 1000,
  yelp: 24 * 1000 * 60 * 60,
  trails: 7 * 1000 * 60 * 60 * 24,
  event: 6 * 1000 * 60 * 60
}

//server definition
const app = express();
app.use(cors());

//API routes
app.get('/location', get_location);
app.get('/weather', get_weather);
// app.get('/yelp', get_yelp);
// app.get('/trails', get_trails);
// app.get('/events', get_events);

// server start



app.use('*', (request, response) => {
  response.send('Our server runs.');
})

//Error handler
function error_handler(error, response) {
  console.error(error);
  if (response) response.status(500).send('Sorry, something went wrong')
}


//Constructor Functions
function Location_data(search_query, formatted_query, latitude, longitude){
  this.search_query = search_query;
  this.formatted_query = formatted_query;
  this.latitude = latitude;
  this.longitude = longitude;
}

function Weather_data(summary, time){
  this.forecast = summary;
  this.time = time;
}

//Other Functions
function get_location(request, response) {

  //user input - ex: if they type in Seattle...search_quer = Seattle
  const search_query = request.query.data;
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${search_query}&key=${process.env.GEOCODE_API_KEY}`;
  //grabLocationData = Full JSON file

  // const grabLocationData = require('./data/geo.json');
  superagent.get(URL).then(result => {
    if(result.body.status === 'ZERO_RESULTS'){
      response.status(500).send('Sorry, something went wrong');
      return;
    }
    const searchedResult = result.body.results[0];
    //formatted_query = "Lynnwood, WA, USA"
    const formatted_query = searchedResult.formatted_address;

    const latitude = searchedResult.geometry.location.lat;
    const longitude = searchedResult.geometry.location.lng;

    //Create new object containing user input data
    //responseDataObject = {Seattle, Lynnwood, WA, USA, somenumber, somenumber}
    responseDataObject = new Location_data(search_query, formatted_query, latitude, longitude);
    response.send(responseDataObject);
  });

}

function get_weather(request, response) {

  const URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  superagent.get(URL).then(result => {

    if(result.body.latitude === Number(request.query.data.latitude) && result.body.longitude === Number(request.query.data.longitude)){
      //dailyData = array of daily data objects
      let dailyData = result.body.daily.data;
      const dailyWeather = dailyData.map((dailyDataObj) => {
        //summary = "Foggy in the morning."
        let summary = dailyDataObj.summary;
        //time = 1540018800; converted to standart time
        let time = new Date(dailyDataObj.time * 1000).toString().slice(0, 15) ;

        //For each entry within dailyData array
        //Create new weather object
        new Weather_data(summary, time);
        return new Weather_data(summary, time);
      });
      response.send(dailyWeather);
    }
  })
}

app.listen(PORT, () => {
  console.log(`app is up on PORT ${PORT}`)
})
