-- Sample Queries for Trip Tracking Data Analysis

-- 1. View all location points for a specific trip
SELECT 
  tl.timestamp,
  tl.latitude,
  tl.longitude,
  tl.speed,
  tl.accuracy,
  tl.heading
FROM trip_locations tl
WHERE tl.trip_id = 'YOUR_TRIP_ID_HERE'
ORDER BY tl.timestamp ASC;

-- 2. Get latest position for all active trips
SELECT 
  t.id AS trip_id,
  t.origin,
  t.destination,
  t.status,
  tl.latitude,
  tl.longitude,
  tl.speed,
  tl.timestamp AS last_update
FROM trips t
LEFT JOIN LATERAL (
  SELECT * FROM trip_locations
  WHERE trip_id = t.id
  ORDER BY timestamp DESC
  LIMIT 1
) tl ON true
WHERE t.tracking_enabled = true
ORDER BY tl.timestamp DESC;

-- 3. Calculate actual distance traveled vs planned
WITH trip_distances AS (
  SELECT 
    trip_id,
    COUNT(*) AS location_points,
    -- Simple distance calculation (approximate)
    SUM(
      6371 * acos(
        cos(radians(LAG(latitude) OVER (PARTITION BY trip_id ORDER BY timestamp))) 
        * cos(radians(latitude)) 
        * cos(radians(longitude) - radians(LAG(longitude) OVER (PARTITION BY trip_id ORDER BY timestamp))) 
        + sin(radians(LAG(latitude) OVER (PARTITION BY trip_id ORDER BY timestamp))) 
        * sin(radians(latitude))
      )
    ) AS actual_distance_km
  FROM trip_locations
  GROUP BY trip_id
)
SELECT 
  t.id,
  t.origin,
  t.destination,
  t.distance_km AS planned_distance_km,
  ROUND(td.actual_distance_km::numeric, 2) AS actual_distance_km,
  ROUND((td.actual_distance_km - t.distance_km)::numeric, 2) AS difference_km,
  td.location_points,
  t.status
FROM trips t
JOIN trip_distances td ON t.id = td.trip_id
ORDER BY t.planned_departure DESC;

-- 4. Get tracking statistics by driver
SELECT 
  d.full_name AS driver_name,
  COUNT(DISTINCT t.id) AS trips_tracked,
  COUNT(tl.id) AS total_location_points,
  AVG(tl.speed) AS avg_speed_kmh,
  MAX(tl.speed) AS max_speed_kmh,
  MIN(tl.accuracy) AS best_gps_accuracy_m,
  AVG(tl.accuracy) AS avg_gps_accuracy_m
FROM drivers d
JOIN trips t ON d.id = t.driver_id
JOIN trip_locations tl ON t.id = tl.trip_id
WHERE t.tracking_enabled = true
GROUP BY d.id, d.full_name
ORDER BY trips_tracked DESC;

-- 5. Find trips with tracking issues (few location points)
SELECT 
  t.id,
  t.origin,
  t.destination,
  t.tracking_started_at,
  t.tracking_stopped_at,
  COUNT(tl.id) AS location_points,
  EXTRACT(EPOCH FROM (t.tracking_stopped_at - t.tracking_started_at))/60 AS tracking_duration_minutes
FROM trips t
LEFT JOIN trip_locations tl ON t.id = tl.trip_id
WHERE t.tracking_enabled = true OR t.tracking_stopped_at IS NOT NULL
GROUP BY t.id
HAVING COUNT(tl.id) < 5  -- Less than 5 location points
ORDER BY t.tracking_started_at DESC;

-- 6. Get hourly location update rate for a trip
SELECT 
  DATE_TRUNC('hour', timestamp) AS hour,
  COUNT(*) AS updates,
  AVG(speed) AS avg_speed,
  AVG(accuracy) AS avg_accuracy
FROM trip_locations
WHERE trip_id = 'YOUR_TRIP_ID_HERE'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour;

-- 7. Find trips with speeding (speed > threshold)
SELECT DISTINCT
  t.id,
  t.origin,
  t.destination,
  d.full_name AS driver_name,
  MAX(tl.speed) AS max_speed_recorded,
  COUNT(CASE WHEN tl.speed > 100 THEN 1 END) AS speeding_instances
FROM trips t
JOIN drivers d ON t.driver_id = d.id
JOIN trip_locations tl ON t.id = tl.trip_id
WHERE tl.speed > 100  -- Speed threshold in km/h
GROUP BY t.id, t.origin, t.destination, d.full_name
ORDER BY max_speed_recorded DESC;

-- 8. Get trip route summary (start, mid, end points)
WITH ranked_locations AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY timestamp ASC) AS rn,
    COUNT(*) OVER (PARTITION BY trip_id) AS total_points
  FROM trip_locations
)
SELECT 
  trip_id,
  CASE 
    WHEN rn = 1 THEN 'Start'
    WHEN rn = CEIL(total_points / 2.0) THEN 'Midpoint'
    WHEN rn = total_points THEN 'End'
  END AS point_type,
  latitude,
  longitude,
  speed,
  timestamp
FROM ranked_locations
WHERE rn = 1 OR rn = CEIL(total_points / 2.0) OR rn = total_points
ORDER BY trip_id, timestamp;

-- 9. Clean up old tracking data (older than 90 days)
-- CAUTION: This permanently deletes data
DELETE FROM trip_locations
WHERE timestamp < NOW() - INTERVAL '90 days';

-- 10. Get tracking coverage by vehicle
SELECT 
  v.plate_number,
  v.make,
  v.model,
  COUNT(DISTINCT t.id) AS total_trips,
  COUNT(DISTINCT CASE WHEN t.tracking_enabled THEN t.id END) AS tracked_trips,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN t.tracking_enabled THEN t.id END) / 
    NULLIF(COUNT(DISTINCT t.id), 0),
    2
  ) AS tracking_coverage_percent
FROM vehicles v
LEFT JOIN trips t ON v.id = t.vehicle_id
GROUP BY v.id, v.plate_number, v.make, v.model
ORDER BY tracking_coverage_percent DESC;
