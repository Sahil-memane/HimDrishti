from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from db import SessionLocal, Waypoint, RiskScore
from grid import build_navigation_grid, get_closest_node, haversine
from engine import attach_attributes, run_astar_search

app = FastAPI(title="Model 3: A* Routing Engine")

class RouteRequest(BaseModel):
    voyage_id: str
    start_lat: float
    start_lon: float
    dest_lat: float
    dest_lon: float
    risk_tolerance: str
    speed_knots: float
    fuel_consumption_lph: float
    departure_time: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/route")
def calculate_route(req: RouteRequest):
    db = SessionLocal()
    try:
        # 1. Build grid over bounding box
        # We add a 2.0 degree padding around the start and dest
        min_lat = min(req.start_lat, req.dest_lat) - 2.0
        max_lat = max(req.start_lat, req.dest_lat) + 2.0
        min_lon = min(req.start_lon, req.dest_lon) - 2.0
        max_lon = max(req.start_lon, req.dest_lon) + 2.0
        
        # Build 0.2 degree resolution grid
        G, lon_steps, lat_steps = build_navigation_grid(min_lat, max_lat, min_lon, max_lon, resolution=0.2)
        
        # 2. Attach attributes and compute costs
        attach_attributes(G, db, req.risk_tolerance)
        
        # 3. Find start and dest nodes
        start_node = get_closest_node(G, req.start_lon, req.start_lat)
        dest_node = get_closest_node(G, req.dest_lon, req.dest_lat)
        
        if not start_node or not dest_node:
            raise HTTPException(status_code=400, detail="Start or destination outside of valid bounds")
            
        # Check if start or dest are themselves blocked
        if G.nodes[start_node].get('blocked') or G.nodes[dest_node].get('blocked'):
            raise HTTPException(status_code=422, detail="Start or destination is in a blocked cell")
            
        # 4. Run A* search
        path = run_astar_search(G, start_node, dest_node, req.risk_tolerance)
        
        if not path:
            raise HTTPException(status_code=422, detail="Destination unreachable (no safe path exists)")
            
        # 5. Compute Route Metrics & Save to DB
        # Delete old waypoints and risk scores for this voyage
        db.query(Waypoint).filter(Waypoint.voyage_id == req.voyage_id).delete()
        db.query(RiskScore).filter(RiskScore.voyage_id == req.voyage_id).delete()
        
        dep_time = datetime.fromisoformat(req.departure_time.replace('Z', '+00:00'))
        
        waypoints_list = []
        total_distance_km = 0.0
        total_fuel_l = 0.0
        cumulative_sic = 0.0
        min_iceberg_dist = float('inf')
        max_wave = 0.0
        
        prev_node = None
        for i, node_id in enumerate(path):
            node_data = G.nodes[node_id]
            
            # Calculate node risk factors
            ice_risk = min(node_data['sic'] / 100.0, 1.0)
            iceberg_risk = max(0.0, min((100 - node_data['iceberg_dist_km']) / 80.0, 1.0))
            weather_risk = min(node_data['wave_height_m'] / 5.0, 1.0)
            
            if prev_node:
                prev_data = G.nodes[prev_node]
                dist_km = haversine(prev_data['lon'], prev_data['lat'], node_data['lon'], node_data['lat'])
                total_distance_km += dist_km
                
                # Add segment RiskScore
                rs = RiskScore(
                    voyage_id=req.voyage_id,
                    segment=f"LINESTRING({prev_data['lon']} {prev_data['lat']}, {node_data['lon']} {node_data['lat']})",
                    ice_risk=ice_risk,
                    iceberg_risk=iceberg_risk,
                    weather_risk=weather_risk,
                    combined_score=node_data.get('cost_score', 0)
                )
                db.add(rs)
                
            # 1 knot = 1.852 km/h
            speed_kmh = req.speed_knots * 1.852
            hours_elapsed = total_distance_km / speed_kmh if speed_kmh > 0 else 0
            eta = dep_time + timedelta(hours=hours_elapsed)
            
            total_fuel_l = hours_elapsed * req.fuel_consumption_lph
            
            cumulative_sic += node_data['sic']
            min_iceberg_dist = min(min_iceberg_dist, node_data['iceberg_dist_km'])
            max_wave = max(max_wave, node_data['wave_height_m'])
            
            wp = Waypoint(
                voyage_id=req.voyage_id,
                sequence_no=i,
                position=f"POINT({node_data['lon']} {node_data['lat']})",
                eta=eta,
                cumulative_fuel_l=total_fuel_l,
                segment_risk_score=node_data.get('cost_score', 0)
            )
            db.add(wp)
            
            waypoints_list.append({
                "sequence": i,
                "lat": node_data['lat'],
                "lon": node_data['lon'],
                "eta": str(eta),
                "cumulative_fuel": total_fuel_l,
                "risk_score": node_data.get('cost_score', 0),
                "risk_factors": {
                    "ice_risk": ice_risk,
                    "iceberg_risk": iceberg_risk,
                    "weather_risk": weather_risk
                }
            })
            
            prev_node = node_id
            
        avg_sic = cumulative_sic / len(path)
        overall_risk = sum([wp['risk_score'] for wp in waypoints_list]) / len(waypoints_list)
        
        db.commit()
        
        # Generate Explainability Reasoning
        reasoning = (
            f"Path optimized for {req.risk_tolerance} risk tolerance. "
            f"Avoided all critical hazards (SIC > 90%, Icebergs < 20km). "
            f"Maintained minimum iceberg clearance of {min_iceberg_dist:.1f}km. "
            f"Average Sea Ice Concentration along route is {avg_sic:.1f}%. "
            f"Peak wave height encountered: {max_wave:.1f}m."
        )
        
        return {
            "status": "success",
            "voyage_id": req.voyage_id,
            "reasoning": reasoning,
            "metrics": {
                "total_distance_km": total_distance_km,
                "total_fuel_l": total_fuel_l,
                "eta_destination": str(eta),
                "average_sic": avg_sic,
                "min_iceberg_dist": min_iceberg_dist,
                "max_wave_height": max_wave,
                "overall_risk_score": overall_risk
            },
            "waypoints": waypoints_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
