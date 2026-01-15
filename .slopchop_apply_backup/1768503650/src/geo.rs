#![allow(clippy::cast_precision_loss)]
#![allow(clippy::cast_possible_truncation)]

use crate::types::{Location, Point};
use geo::{HaversineBearing, HaversineDestination, HaversineDistance, Point as GeoPoint};

/// Generates a curved path between two locations using a quadratic-like Bezier approach.
pub fn generate_curve(start: &Location, end: &Location, resolution: usize) -> Vec<Point> {
    let p1 = GeoPoint::new(start.lng, start.lat);
    let p2 = GeoPoint::new(end.lng, end.lat);

    // 1. Basic Geodesy
    let distance_meters = p1.haversine_distance(&p2);
    let bearing = p1.haversine_bearing(p2);
    
    // 2. Control Point Calculation
    // Logic: 15% of distance, but capped/damped for very long routes
    let offset_ratio = (0.15 - (distance_meters / 10_000_000.0)).clamp(0.08, 0.2);
    let offset_dist = distance_meters * offset_ratio;
    
    // Midpoint via basic averaging
    let mid_lng = f64::midpoint(p1.x(), p2.x());
    let mid_lat = f64::midpoint(p1.y(), p2.y());
    let midpoint = GeoPoint::new(mid_lng, mid_lat);

    // Project control point perpendicular to bearing
    let control_point = midpoint.haversine_destination(bearing + 90.0, offset_dist);

    // 3. Generate B-Spline Points (Quadratic Bezier)
    let mut points = Vec::with_capacity(resolution);

    for i in 0..=resolution {
        let t = i as f64 / resolution as f64;
        let inv_t = 1.0 - t;

        let lng = (inv_t.powi(2) * p1.x()) 
                + (2.0 * inv_t * t * control_point.x()) 
                + (t.powi(2) * p2.x());

        let lat = (inv_t.powi(2) * p1.y()) 
                + (2.0 * inv_t * t * control_point.y()) 
                + (t.powi(2) * p2.y());

        // Use Point::new constructor
        points.push(Point::new(lng as f32, lat as f32));
    }

    points
}

/// Calculate the heading (rotation) for an arrow placed at the midpoint.
pub fn calculate_arrow_rotation(path: &[Point]) -> f32 {
    if path.len() < 2 {
        return 0.0;
    }
    
    // Sample two points near the middle
    let mid_idx = path.len() / 2;
    let p1 = &path[mid_idx.saturating_sub(1)];
    let p2 = &path[mid_idx.saturating_add(1).min(path.len() - 1)];

    let gp1 = GeoPoint::new(f64::from(p1.x), f64::from(p1.y));
    let gp2 = GeoPoint::new(f64::from(p2.x), f64::from(p2.y));

    gp1.haversine_bearing(gp2) as f32
}