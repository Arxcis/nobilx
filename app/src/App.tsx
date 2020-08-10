import React, { useEffect, useMemo, useState } from 'react';
import ReactMapGL, { Layer, Source } from 'react-map-gl';
import './App.css';

const STATUS_AVAILABLE = 0
const STATUS_UNKNOWN = -1

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

type StationPosition = {
  latitude: number,
  longitude: number,
  status: StationStatus | null
}

const API_URL = "http://127.0.0.1:8081"
const MAPBOX_API_ACCESS_TOKEN = 'pk.eyJ1Ijoiam9uYXNqc28iLCJhIjoiY2tkbjEzZ2RoMWRwcTJ6bXJwanpnYmFmNyJ9.m7V5GeFoMDSkX8uhyGmYUQ'

function App() {

  const [positions, setPositions] = useState<StationPosition[]>([]);

  useEffect(() => {
    (async function () {
      let stations: any = { chargerstations: [] }
      let statuses: StationStatus[] = [];
      try {
        let res = await fetch(process.env.PUBLIC_URL + "/data/stations.json")
        if (!res.ok) throw res.statusText;
        stations = (await res.json())
      } catch (err) {
        console.warn(err)
      }

      try {
        let res = await fetch(process.env.PUBLIC_URL + "/data/statuses.json")
        if (!res.ok) throw res.statusText;
        statuses = await res.json() as StationStatus[];
      } catch (err) {
        console.warn(err)
      }

      try {
        let res = await fetch(API_URL + "/stations.json")
        if (!res.ok) throw res.statusText;
        stations = (await res.json())
      } catch (err) {
        console.warn(err)
      }

      try {
        let res = await fetch(API_URL + "/statuses.json")
        if (!res.ok) throw res.statusText;
        statuses = await res.json() as StationStatus[];
      } catch (err) {
        console.warn(err)
      }

      const chargingStations = stations.chargerstations as ChargingStation[]
      const pos = chargingStations.map(
        (station) => {
          const [lat, lng] = station
            .csmd
            .Position
            .match(/([\d]+\.[\d]+),([\d]+\.[\d]+)/)
            ?.slice(1) ?? ["0", "0"]


          const status = statuses.find(status => status.uuid === station.csmd.International_id) ?? null;
          return {
            longitude: parseFloat(lng),
            latitude: parseFloat(lat),
            status
          }
        }
      ) as StationPosition[];
      setPositions(pos)
    })();
  }, []);

  let positionsWithStatus = useMemo(() => positions
    .filter((position: StationPosition) => position.status)
    .filter((position: StationPosition) => position.status!.status !== STATUS_UNKNOWN), [positions]);

  const iconMap = useMemo(() => positionsWithStatus.reduce((acc: Map<string, StationPosition[]>, position: StationPosition) => {
    const MAX_COUNT = 8

    const availableCount = position.status!.connectors.reduce((acc, conn) => acc + (conn.status === STATUS_AVAILABLE ? 1 : 0), 0);
    const clampedAvailableCount = availableCount > MAX_COUNT ? MAX_COUNT : availableCount;
    const totalCount = position.status!.connectors.length;
    const clampedTotalCount = totalCount > MAX_COUNT ? MAX_COUNT : totalCount;

    const occupiedCount = totalCount - availableCount;
    let clampedOccupiedCount = clampedTotalCount - clampedAvailableCount;
    // Show always 1 occupied, if at least 1 IS occupied
    clampedOccupiedCount = clampedOccupiedCount === 0 && occupiedCount > 0 ? 1 : clampedOccupiedCount;

    const iconKey = "station-" + clampedOccupiedCount + "-" + clampedAvailableCount
    acc.set(iconKey, [...(acc.get(iconKey) ?? []), position]);

    return acc;
  }, new Map()), [positionsWithStatus]);



  const [viewport, setViewport] = useState({
    latitude: positionsWithStatus[0]?.latitude ?? 60.5,
    longitude: positionsWithStatus[0]?.longitude ?? 8.0,
    zoom: 5
  });

  function onViewportChange(viewport: any) {
    const { width, height, ...etc } = viewport
    setViewport({ ...etc })
  }
  if (positionsWithStatus[0] === undefined) return <p>Waiting for data...</p>;

  return (
    <ReactMapGL
      width='100vw'
      height='100vh'
      mapboxApiAccessToken={MAPBOX_API_ACCESS_TOKEN}
      {...viewport}
      onViewportChange={viewport => onViewportChange(viewport)}
      mapStyle="mapbox://styles/jonasjso/ckdnf47e32nq31imtzdpo76lw/draft"
      style={{
        height: '100vh',
        width: '100vw'
      }}
    >
      {Array.from(iconMap.entries()).map(([iconKey, iconPositions]) =>
        <Source
          key={iconKey}
          id={"source-" + iconKey}
          type="geojson"
          data={makePositionFeatures(iconPositions)}
        >
          <Layer
            type="symbol"
            layout={{
              'icon-image': iconKey,
              'icon-allow-overlap': true,
              'icon-size': [
                "interpolate", ["linear"], ["zoom"],
                5, .05,
                10, .1,
                15, .2
              ]
            }}
            paint={{}}
          />
        </Source>
      )}
    </ReactMapGL>

  );
}

function makePositionFeatures(positions: StationPosition[]) {
  return {
    type: 'FeatureCollection',
    features: positions.map((position: StationPosition) => (
      { type: 'Feature', geometry: { type: 'Point', coordinates: [position.longitude, position.latitude] } }
    )),
  } as any;
}


export default App;
