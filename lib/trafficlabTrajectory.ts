export interface TrajectorySample {
  lat: number;
  lng: number;
}

export interface TrajectoryTrack {
  id: string;
  label: string;
  lat: number;
  lng: number;
  speedKts: number;
  heading: number;
  altitudeFt: number;
  points: TrajectorySample[];
}

export interface DualViewSyncState {
  centerLat: number;
  centerLng: number;
  trackCount: number;
  fastestKts: number;
  overviewLabel: string;
  tacticalLabel: string;
}

interface FlightLike {
  icao: string;
  callsign: string;
  lat: number;
  lng: number;
  vel: number;
  hdg: number;
  alt: number;
}

function projectTrajectoryPoint(
  lat: number,
  lng: number,
  headingDeg: number,
  distanceDeg: number,
): TrajectorySample {
  const headingRad = (headingDeg * Math.PI) / 180;
  return {
    lat: lat + distanceDeg * Math.cos(headingRad),
    lng: lng + distanceDeg * Math.sin(headingRad),
  };
}

export function buildTrajectoryTracksFromFlights(
  flights: FlightLike[],
  maxTracks = 6,
): TrajectoryTrack[] {
  return flights
    .filter(
      (flight) => Number.isFinite(flight.lat) && Number.isFinite(flight.lng),
    )
    .slice(0, maxTracks)
    .map((flight) => {
      const speedKts = Math.max(0, Math.round((flight.vel ?? 0) * 1.94384));
      const heading = Number.isFinite(flight.hdg) ? Math.round(flight.hdg) : 0;
      const points = [
        { lat: flight.lat, lng: flight.lng },
        projectTrajectoryPoint(flight.lat, flight.lng, heading, 0.35),
        projectTrajectoryPoint(flight.lat, flight.lng, heading, 0.7),
      ];
      return {
        id: flight.icao || flight.callsign || "track",
        label: flight.callsign?.trim() || flight.icao || "Unknown track",
        lat: flight.lat,
        lng: flight.lng,
        speedKts,
        heading,
        altitudeFt: Math.round(flight.alt ?? 0),
        points,
      };
    });
}

export function buildDualViewSyncState(
  tracks: TrajectoryTrack[],
): DualViewSyncState {
  if (!tracks.length) {
    return {
      centerLat: 20,
      centerLng: 0,
      trackCount: 0,
      fastestKts: 0,
      overviewLabel: "No active tracks",
      tacticalLabel: "Awaiting live flight layer",
    };
  }

  const centerLat =
    tracks.reduce((sum, track) => sum + track.lat, 0) / tracks.length;
  const centerLng =
    tracks.reduce((sum, track) => sum + track.lng, 0) / tracks.length;
  const fastestKts = Math.max(...tracks.map((track) => track.speedKts));

  return {
    centerLat,
    centerLng,
    trackCount: tracks.length,
    fastestKts,
    overviewLabel: `${tracks.length} tracked movement${tracks.length === 1 ? "" : "s"}`,
    tacticalLabel: `Fastest ${fastestKts} kts · heading-led trajectories`,
  };
}
