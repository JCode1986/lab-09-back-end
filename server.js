'use strict';
//push this//
// immediate import and configuration
require('dotenv').config();

// global constants
const PORT = process.env.PORT || 3000 ;
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');//tallks to internet
const app = express();
app.use(cors());

const pg = require('pg')//talks to psql

//postgres setup//
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', error => console.error(error));
const sql = {};
sql.location = 'SELECT * FROM locations WHERE search_query=$1';
sql.insertLocation = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';

const api = {};
api.geoCode = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
api.darksky = 'https://api.darksky.net/forecast/';



app.get('/location', (request, response) => {
  const search_query = request.query.data;
  console.log('check database with',search_query);

  client.query('SELECT * FROM locations WHERE search_query=$1',[search_query]).then(result =>{
    console.log('result from DATABASE', result);
    if(result.rows.length){
      console.log('exists in DB');
      response.send(result.rows[0])
    }else{
      console.log('no existe')
      getGoogle(search_query,response);

    }
  }).catch(console.error)
})

app.get('/weather', (request, response) =>{
  const weatherJSON = require('./data/darksky.json');
  const dailyWeather = weatherJSON.daily;
  const dailyWeatherData = dailyWeather.data;
  let theDaily = dailyWeatherData.map(dayObj => {
    return new DailyWeather(dayObj);
  })
  response.send(theDaily);
})

app.use('*', (request, response) => {
  response.send('Our server runs.');
})

// ==============================================
// Helper Functions
// ==============================================

function DailyWeather(rawDayObj){
  this.forecast = rawDayObj.summary;
  this.time = new Date (rawDayObj.time * 1000).toString().slice(0, 15);
}
function getGoogle(search_query,response){
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${search_query}&key=${process.env.GEOCODE_API_KEY}`;
  superagent.get(url).then(result => {
    const resultBody = result.body;
    console.log(resultBody)
    const formatted_query = resultBody.results[0].formatted_address;
    const latitude = resultBody.results[0].geometry.location.lat;
    const longitude = resultBody.results[0].geometry.location.lng;
    const responseObject = { search_query, formatted_query, latitude, longitude};
    client.query(`INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4)`, [location.search_query,location.formatted_query, location.latitude , location.longitude]);
    response.send(responseObject);
})}

//server start
app.listen(PORT, ()=> {
  console.log(`app is up on PORT ${PORT}`);
});
