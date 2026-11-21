import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { MissionConfig, TrajectoryResult } from '../../sim';

// Fix for custom Leaflet marker icons using standard HTML DivIcon
const padMarkerIcon = L.divIcon({
  className: 'custom-pad-marker',
  html: `<div class="w-8 h-8 rounded-full bg-orange-500/90 border-2 border-white shadow-xl shadow-orange-500/60 flex items-center justify-center text-white text-xs font-bold ring-4 ring-orange-500/30 animate-pulse">🚀</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

interface Props {
  mission: MissionConfig;
  trajectory: TrajectoryResult;
}

export function DownrangeMap({ mission, trajectory }: Props) {
  const padLat = mission.launchSite.latitude_deg; // 13.7199
  const padLon = mission.launchSite.longitude_deg; // 80.2304
  const azimuthRad = (mission.launchSite.azimuth_deg * Math.PI) / 180.0;

  // Compute geographical coordinates (lat, lon) along downrange path
  // Approximate spherical geodesic step: 1 deg lat ~= 111 km, 1 deg lon ~= 111 km * cos(lat)
  const trajectoryCoords = useMemo(() => {
    const coords: [number, number][] = [];
    const states = trajectory.states;

    for (let i = 0; i < states.length; i += 5) {
      const s = states[i];
      const downrangeKm = s.downrange_m / 1000.0;
      // Heading along azimuth: dLat = cos(Az) * d, dLon = sin(Az) * d
      const dLat = (downrangeKm * Math.cos(azimuthRad)) / 111.0;
      const dLon = (downrangeKm * Math.sin(azimuthRad)) / (111.0 * Math.cos((padLat * Math.PI) / 180.0));

      coords.push([padLat + dLat, padLon + dLon]);
      // Stop plotting past southern Indian Ocean limit (~3500 km downrange)
      if (downrangeKm > 3500) break;
    }
    return coords;
  }, [trajectory.states, azimuthRad, padLat, padLon]);

  // Compute indicative booster splashdown hazard corridors
  const { groundStraponsCorridor, ps1Corridor } = useMemo(() => {
    const calcBox = (centerDistKm: number, lengthKm: number, widthKm: number): [number, number][] => {
      const halfL = lengthKm / 2;
      const halfW = widthKm / 2;

      const offsets = [
        [-halfL, -halfW],
        [halfL, -halfW],
        [halfL, halfW],
        [-halfL, halfW],
      ];

      return offsets.map(([dl, dw]) => {
        const totalDist = centerDistKm + dl;
        const totalCross = dw;

        const dLat = (totalDist * Math.cos(azimuthRad) - totalCross * Math.sin(azimuthRad)) / 111.0;
        const dLon = (totalDist * Math.sin(azimuthRad) + totalCross * Math.cos(azimuthRad)) /
          (111.0 * Math.cos((padLat * Math.PI) / 180.0));

        return [padLat + dLat, padLon + dLon];
      });
    };

    return {
      groundStraponsCorridor: calcBox(75, 40, 20),
      ps1Corridor: calcBox(380, 110, 45),
    };
  }, [azimuthRad, padLat, padLon]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="flex-none px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="text-xs font-mono font-semibold tracking-wider text-slate-200">
            SRIHARIKOTA DOWNRANGE FLIGHT CORRIDOR
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Azimuth: {mission.launchSite.azimuth_deg.toFixed(1)}° (SE over Bay of Bengal)
        </span>
      </div>

      <div className="flex-1 w-full relative min-h-[320px]">
        <MapContainer
          center={[11.5, 83.5]}
          zoom={5}
          scrollWheelZoom={false}
          className="w-full h-full z-0"
          style={{ background: '#091528' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.75}
          />

          {/* Launch Pad Marker */}
          <Marker position={[padLat, padLon]} icon={padMarkerIcon}>
            <Popup className="font-mono text-xs">
              <div className="font-bold text-slate-900">{mission.launchSite.name}</div>
              <div className="text-[11px] text-slate-600">
                Coords: {padLat.toFixed(4)}° N, {padLon.toFixed(4)}° E
              </div>
              <div className="text-[11px] text-orange-600 font-semibold mt-1">
                PSLV First Launch Pad (FLP)
              </div>
            </Popup>
          </Marker>

          {/* Downrange Ascent Polyline */}
          <Polyline
            positions={trajectoryCoords}
            pathOptions={{ color: '#0ea5e9', weight: 3.5, dashArray: '6, 6' }}
          >
            <Tooltip sticky className="font-mono text-xs">
              Ascent Ground Track (Azimuth {mission.launchSite.azimuth_deg}°)
            </Tooltip>
          </Polyline>

          {/* S12 Ground Strap-ons Splashdown Footprint */}
          <Polygon
            positions={groundStraponsCorridor}
            pathOptions={{ color: '#f97316', fillColor: '#ea580c', fillOpacity: 0.35, weight: 1.5 }}
          >
            <Tooltip sticky className="font-mono text-xs">
              Indicative S12 Strap-ons Splashdown Footprint (~75 km downrange)
            </Tooltip>
          </Polygon>

          {/* PS1 Core Splashdown Footprint */}
          <Polygon
            positions={ps1Corridor}
            pathOptions={{ color: '#ef4444', fillColor: '#dc2626', fillOpacity: 0.25, weight: 1.5 }}
          >
            <Tooltip sticky className="font-mono text-xs">
              Indicative PS1 Core Stage Splashdown Footprint (~380 km downrange)
            </Tooltip>
          </Polygon>
        </MapContainer>
      </div>

      {/* Mandatory Scientific Honesty Map Disclaimer */}
      <div className="flex-none px-4 py-2 bg-slate-950/95 border-t border-slate-800 text-[10px] font-mono text-slate-400">
        <span className="text-amber-400 font-semibold">NOTE: </span>
        Indicative corridor computed by our model, not an official range-safety hazard area. 2D planar ascent; coastal dogleg maneuver not modelled.
      </div>
    </div>
  );
}
