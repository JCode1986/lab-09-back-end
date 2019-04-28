'use strict';

require('dotenv').config();

//global constants
const PORT = process.env.PORT || 3000 ;
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

// postgres client setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', error => console.error(error))

let response_data_object = {};

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
app.get('/yelp', get_yelp);
app.get('/trails', get_trails);
app.get('/meetups', get_meetups);
app.get('/movies', get_movies);

app.use('*', (request, response) => {
  response.send('Our server runs.');
})

// Text
const SQL = {};
SQL.getLocation = 'SELECT * FROM locations WHERE search_query=$1'
SQL.insertLocation = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)'

const API = {};
API.geoCode = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
API.darksky = 'https://api.darksky.net/forecast/';

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

  client.query(SQL.getLocation, [search_query])
    .then(result => {
      if (result.rowCount > 0)
        return response.send(result.rows[0]);
      superagent.get(URL)
        .then(result => {
          const searched_result = result.body.results[0];
          const formatted_query = searched_result.formatted_address;
          const latitude = searched_result.geometry.location.lat;
          const longitude = searched_result.geometry.location.lng;

          response_data_object = new Location_data(search_query, formatted_query, latitude, longitude);
          response.send(response_data_object);
          client.query(SQL.insertLocation, [search_query, formatted_query, latitude, longitude]);
        })
        .catch((error) => {
          error_handler(error, response);
        })

    }).catch((error) => {
      error_handler(error, response);
    })
}

function get_weather(request, response) {
  const URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  superagent.get(URL)
    .then(result => {
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
          return new Weather_data(summary, time);
        });
        response.send(dailyWeather);
      }
    })
    .catch((error) => {
      error_handler(error, response);
    })
}

function get_yelp(request, response) {
  const URL = `https://api.yelp.com/v3/businesses/search`;
  superagent.get(URL)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .query(`latitude=${request.query.data.latitude}`)
    .query(`longitude=${request.query.data.longitude}`)
    .then(result => {
      return response.send(result.body.businesses);
    })
    .catch((error) => {
      error_handler(error, response);
    })
}

function get_trails(request, response) {
  const URL = `https://www.hikingproject.com/data/get-trails`;
  superagent.get(URL)
    .query(`key=${process.env.TRAIL_API_KEY}`)
    .query(`lat=${request.query.data.latitude}`)
    .query(`lon=${request.query.data.longitude}`)
    .then(result => {
      return response.send(result.body.trails);
    })
    .catch((error) => {
      error_handler(error, response);
    })
}

function get_meetups(request, response) {
  response.send('Under Construction...');
}

function get_movies(request, response) {
  response.send('Under Construction...')
}

app.listen(PORT, () => {
  console.log(`app is up on PORT ${PORT}`)
})
