import React from 'react';
import logo from './logo.svg';
import './App.css';
import { useEffect } from 'react';
import ReactMapboxGl, { Layer, Feature } from 'react-mapbox-gl';
import { useMemo } from 'react';
import { useState } from 'react';

const STATIONS_URL = "http://127.0.0.1:8081/stations.json"
const STATUSES_URL = "http://127.0.0.1:8081/statuses.json"
const STATUS_AVAILABLE = 0
const STATUS_UNKNOWN = -1
const STATUS_OCCUPIED = 1
const STATUS_ERROR = 2

type Connector = {
  uuid: string;
  status: number;
  error: number;
  timestamp: number;
}

type StationStatus = {
  uuid: string;
  status: number;
  connectors: Connector[];
}

type ChargingStation = {
  csmd: {
    International_id: string;
    Position: string;
  };
}

type DerivedStation = [number, number, StationStatus | null]

function App() {
  const Map = useMemo(() => ReactMapboxGl({
    accessToken:
      'pk.eyJ1Ijoiam9uYXNqc28iLCJhIjoiY2tkbjEzZ2RoMWRwcTJ6bXJwanpnYmFmNyJ9.m7V5GeFoMDSkX8uhyGmYUQ'
  }), []);

  const [positions, setPositions] = useState<DerivedStation[]>([]);

  useEffect(() => {
    (async function () {
      let res = await fetch(STATIONS_URL)
      let stations = (await res.json())

      res = await fetch(STATUSES_URL)
      let statuses = await res.json() as StationStatus[];

      const chargingStations = stations.chargerstations as ChargingStation[]
      const pos = chargingStations.map(
        (station) => {
          const [lat, lng] = station
            .csmd
            .Position
            .match(/([\d]+\.[\d]+),([\d]+\.[\d]+)/)
            ?.slice(1) ?? ["0", "0"]


          const status = statuses.find(status => status.uuid === station.csmd.International_id) ?? null;
          return [parseFloat(lng), parseFloat(lat), status]
        }
      ) as DerivedStation[];
      setPositions(pos)
    })();
  }, []);

  console.log(positions)

  if (positions[0] === undefined) return null;

  return (
    // in render()
    <Map
      style="mapbox://styles/mapbox/streets-v9"
      containerStyle={{
        height: '100vh',
        width: '100vw'
      }}
      center={[positions[0][0], positions[0][1]]}
      zoom={[8]}
    >
      <Layer type="symbol" id="marker" layout={{
        'icon-image': 'marker-11',
        'icon-allow-overlap': true,
        'icon-size': 1.2
      }}
      >
        {positions
          .filter((position: DerivedStation) => position[2])
          .filter((position: DerivedStation) => position[2]?.status !== STATUS_UNKNOWN)
          .map(
            (position: DerivedStation) =>
              <Feature coordinates={[position[0], position[1]]} key={position[2]?.uuid ?? ""} />)
        }
      </Layer>
    </Map>
  );
}

export default App;
