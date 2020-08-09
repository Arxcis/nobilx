import React from 'react';
import logo from './logo.svg';
import './App.css';
import { useEffect } from 'react';
import ReactMapboxGl, { Layer, Feature } from 'react-mapbox-gl';
import { useMemo } from 'react';
import { useState } from 'react';

const STATIONS_URL = "http://127.0.0.1:8081/stations.json"
const STATUSES_URL = "http://127.0.0.1:8081/statuses.json"


function App() {
  const Map = useMemo(() => ReactMapboxGl({
    accessToken:
      'pk.eyJ1Ijoiam9uYXNqc28iLCJhIjoiY2tkbjEzZ2RoMWRwcTJ6bXJwanpnYmFmNyJ9.m7V5GeFoMDSkX8uhyGmYUQ'
  }), []);

  const [positions, setPositions] = useState([]);

  useEffect(() => {
    (async function() {
      let res = await fetch(STATIONS_URL)
      let stations = await res.json();

      res = await fetch(STATUSES_URL)
      let statuses = await res.json();  

      const pos = stations.chargerstations.map(
        (station: any) =>  {
          const [lat, lng]: [string, string] = station
            .csmd
            .Position
            .match(/([\d]+\.[\d]+),([\d]+\.[\d]+)/)
            .slice(1)

          return [parseFloat(lng), parseFloat(lat)]
        }
      );
      setPositions(pos)
    })();
  }, []);

  console.log(positions)

  return (
    // in render()
    <Map
      style="mapbox://styles/mapbox/streets-v9"
      containerStyle={{
        height: '100vh',
        width: '100vw'
      }}
      center={[positions[0]?.[0]??0, positions[0]?.[1]??0]}
      zoom={[8]} 
    >
      <Layer type="symbol" id="marker" layout={{ 'icon-image': 'marker-15', 'icon-allow-overlap': true }}>
        {positions.map((position: [number, number]) => <Feature coordinates={position} />)}
      </Layer>
    </Map>
  );
}

export default App;
