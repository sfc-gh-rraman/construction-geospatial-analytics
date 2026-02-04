"""
TERRA Construction Site Data Generator

Generates realistic construction site data with:
- GPS breadcrumbs with real Phoenix, AZ coordinates
- Equipment telematics with Ghost Cycle patterns
- Volume surveys with plan vs actual
- Site documents for Cortex Search

Usage:
    python generate_sample_data.py --output ./data --format parquet
"""

import argparse
import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any

import pandas as pd
import numpy as np

# ============================================================================
# CONFIGURATION
# ============================================================================

# Real Phoenix/Chandler area coordinates for construction sites
SITES = [
    {"site_id": "alpha", "name": "Project Alpha", "type": "Highway Construction", 
     "lat": 33.4512, "lng": -112.0832, "center_lat": 33.4512, "center_lng": -112.0832},
    {"site_id": "beta", "name": "Project Beta", "type": "Solar Farm Prep",
     "lat": 33.4287, "lng": -112.1145, "center_lat": 33.4287, "center_lng": -112.1145},
    {"site_id": "gamma", "name": "Project Gamma", "type": "Commercial Pad",
     "lat": 33.4701, "lng": -112.0623, "center_lat": 33.4701, "center_lng": -112.0623},
    {"site_id": "delta", "name": "Project Delta", "type": "Reservoir Excavation",
     "lat": 33.4089, "lng": -112.0901, "center_lat": 33.4089, "center_lng": -112.0901},
    {"site_id": "echo", "name": "Project Echo", "type": "Residential Mass Grading",
     "lat": 33.4398, "lng": -112.1288, "center_lat": 33.4398, "center_lng": -112.1288},
]

EQUIPMENT_TYPES = [
    {"type": "haul_truck", "make": "CAT", "model": "793", "capacity": 240, "count": 30},
    {"type": "dozer", "make": "CAT", "model": "D10", "capacity": 0, "count": 8},
    {"type": "loader", "make": "CAT", "model": "992", "capacity": 50, "count": 6},
    {"type": "grader", "make": "CAT", "model": "14M", "capacity": 0, "count": 4},
]

# Choke point locations (relative to site center)
CHOKE_POINTS = [
    {"name": "Stockpile B Intersection", "lat_offset": 0.002, "lng_offset": 0.001},
    {"name": "North Road Bend", "lat_offset": 0.004, "lng_offset": -0.002},
]

# ============================================================================
# DATA GENERATORS
# ============================================================================

def generate_sites() -> pd.DataFrame:
    """Generate sites master data"""
    records = []
    for site in SITES:
        records.append({
            "site_id": site["site_id"],
            "site_name": site["name"],
            "site_type": site["type"],
            "latitude": site["lat"],
            "longitude": site["lng"],
            "status": "active",
            "client_name": f"Arizona DOT" if "Highway" in site["type"] else "Private Developer",
            "project_start_date": (datetime.now() - timedelta(days=random.randint(30, 120))).date(),
            "project_end_date": (datetime.now() + timedelta(days=random.randint(60, 180))).date(),
            "created_at": datetime.now()
        })
    return pd.DataFrame(records)


def generate_equipment() -> pd.DataFrame:
    """Generate equipment master data"""
    records = []
    eq_counter = 1
    
    for eq_type in EQUIPMENT_TYPES:
        for i in range(eq_type["count"]):
            # Distribute equipment across sites
            site = SITES[eq_counter % len(SITES)]
            prefix = eq_type["type"][0].upper()
            
            records.append({
                "equipment_id": f"{prefix}-{eq_counter:02d}",
                "site_id": site["site_id"],
                "equipment_name": f"{eq_type['make']} {eq_type['model']} #{i+1}",
                "equipment_type": eq_type["type"],
                "make": eq_type["make"],
                "model": eq_type["model"],
                "year": random.randint(2018, 2024),
                "capacity_tons": eq_type["capacity"] if eq_type["capacity"] > 0 else None,
                "status": random.choices(["active", "maintenance"], weights=[0.95, 0.05])[0],
                "created_at": datetime.now()
            })
            eq_counter += 1
    
    return pd.DataFrame(records)


def generate_gps_breadcrumbs(equipment_df: pd.DataFrame, hours: int = 24) -> pd.DataFrame:
    """
    Generate GPS breadcrumb data with realistic patterns including:
    - Normal haul routes
    - Ghost Cycles at choke points
    - Varied speeds by segment
    """
    records = []
    now = datetime.now()
    start_time = now - timedelta(hours=hours)
    
    # Only generate for haul trucks
    trucks = equipment_df[equipment_df["equipment_type"] == "haul_truck"]
    
    for _, truck in trucks.iterrows():
        site = next(s for s in SITES if s["site_id"] == truck["site_id"])
        current_time = start_time
        
        while current_time < now:
            # Simulate a cycle (roughly 15-20 minutes)
            cycle_duration = random.randint(12, 22)
            
            for minute in range(cycle_duration):
                ts = current_time + timedelta(minutes=minute)
                
                # Determine if this is a choke point (ghost cycle candidate)
                is_choke = random.random() < 0.15  # 15% chance at choke point
                
                if is_choke:
                    # Ghost cycle pattern: slow movement, low engine load
                    choke = random.choice(CHOKE_POINTS)
                    lat = site["center_lat"] + choke["lat_offset"] + random.uniform(-0.0005, 0.0005)
                    lng = site["center_lng"] + choke["lng_offset"] + random.uniform(-0.0005, 0.0005)
                    speed = random.uniform(1, 5)  # Crawling speed
                else:
                    # Normal operation
                    lat = site["center_lat"] + random.uniform(-0.01, 0.01)
                    lng = site["center_lng"] + random.uniform(-0.01, 0.01)
                    speed = random.uniform(8, 25)
                
                records.append({
                    "breadcrumb_id": str(uuid.uuid4()),
                    "equipment_id": truck["equipment_id"],
                    "site_id": truck["site_id"],
                    "timestamp": ts,
                    "latitude": lat,
                    "longitude": lng,
                    "altitude_m": 340 + random.uniform(-5, 5),
                    "speed_mph": speed,
                    "heading_degrees": random.uniform(0, 360),
                    "accuracy_m": random.uniform(1, 5),
                    "created_at": datetime.now()
                })
            
            current_time += timedelta(minutes=cycle_duration + random.randint(2, 8))
    
    return pd.DataFrame(records)


def generate_telematics(gps_df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate telematics data correlated with GPS.
    Key: Ghost Cycles show low engine load despite movement.
    """
    records = []
    
    for _, gps in gps_df.iterrows():
        speed = gps["speed_mph"]
        
        # Determine engine load based on speed pattern
        if speed < 5:
            # Low speed - either loading/dumping (high load) or ghost cycle (low load)
            is_ghost = random.random() < 0.6  # 60% of slow periods are ghost cycles
            engine_load = random.uniform(15, 30) if is_ghost else random.uniform(60, 85)
        else:
            # Normal hauling
            engine_load = random.uniform(55, 90)
        
        # Fuel rate correlates with engine load
        fuel_rate = 15 + (engine_load / 100) * 35
        
        records.append({
            "telematics_id": str(uuid.uuid4()),
            "equipment_id": gps["equipment_id"],
            "timestamp": gps["timestamp"],
            "engine_load_percent": engine_load,
            "fuel_rate_gph": fuel_rate + random.uniform(-2, 2),
            "engine_rpm": int(800 + engine_load * 15 + random.uniform(-50, 50)),
            "coolant_temp_f": random.uniform(180, 210),
            "oil_pressure_psi": random.uniform(40, 60),
            "transmission_gear": min(6, max(1, int(speed / 5) + 1)),
            "payload_tons": random.uniform(180, 240) if engine_load > 50 else 0,
            "created_at": datetime.now()
        })
    
    return pd.DataFrame(records)


def generate_cycle_events(equipment_df: pd.DataFrame, days: int = 7) -> pd.DataFrame:
    """Generate load/dump cycle events"""
    records = []
    trucks = equipment_df[equipment_df["equipment_type"] == "haul_truck"]
    
    for day in range(days):
        date = datetime.now() - timedelta(days=day)
        
        for _, truck in trucks.iterrows():
            # 8-12 cycles per day per truck
            cycles_today = random.randint(8, 12)
            
            for c in range(cycles_today):
                start = date.replace(hour=6) + timedelta(hours=c + random.uniform(0, 1))
                duration = random.uniform(12, 22)  # minutes
                
                records.append({
                    "cycle_id": str(uuid.uuid4()),
                    "equipment_id": truck["equipment_id"],
                    "site_id": truck["site_id"],
                    "cycle_start": start,
                    "cycle_end": start + timedelta(minutes=duration),
                    "load_location": f"Cut Zone {random.choice(['A', 'B', 'C'])}",
                    "dump_location": f"Fill Zone {random.choice(['1', '2', '3'])}",
                    "load_volume_yd3": random.uniform(180, 240),
                    "cycle_time_minutes": duration,
                    "haul_distance_miles": random.uniform(0.5, 2.0),
                    "fuel_consumed_gal": duration * random.uniform(0.4, 0.6),
                    "created_at": datetime.now()
                })
    
    return pd.DataFrame(records)


def generate_volume_surveys(days: int = 14) -> pd.DataFrame:
    """Generate volume survey data with plan vs actual"""
    records = []
    zones = ["Cut Zone North", "Cut Zone Central", "Cut Zone South", 
             "Fill Zone West", "Fill Zone East"]
    
    for site in SITES:
        for day in range(days):
            date = (datetime.now() - timedelta(days=days-1-day)).date()
            
            for zone in zones:
                is_cut = "Cut" in zone
                base_volume = random.uniform(8000, 15000)
                
                # Add some variance and trend
                actual = base_volume * (1 + random.uniform(-0.1, 0.05))
                plan = base_volume * 1.02  # Plan is slightly ahead
                
                records.append({
                    "survey_id": str(uuid.uuid4()),
                    "site_id": site["site_id"],
                    "zone_id": zone.replace(" ", "_").lower(),
                    "zone_name": zone,
                    "survey_date": date,
                    "survey_type": random.choice(["drone", "ground"]),
                    "cut_volume_yd3": actual if is_cut else 0,
                    "fill_volume_yd3": actual if not is_cut else 0,
                    "cut_plan_yd3": plan if is_cut else 0,
                    "fill_plan_yd3": plan if not is_cut else 0,
                    "elevation_avg_m": 340 + random.uniform(-5, 5),
                    "created_at": datetime.now()
                })
    
    return pd.DataFrame(records)


def generate_documents() -> pd.DataFrame:
    """Generate site documents for Cortex Search"""
    documents = [
        {
            "title": "Geotechnical Report - Project Alpha Phase 1",
            "type": "geotech",
            "site_id": "alpha",
            "content": """
            GEOTECHNICAL INVESTIGATION REPORT
            Project: Highway 87 Expansion - Phase 1
            
            SOIL CONDITIONS:
            The investigation revealed predominantly sandy clay with caliche layers at depths 
            of 3-5 meters. Bearing capacity in stable zones averages 2500 psf.
            
            CRITICAL FINDINGS:
            - Sector 3 Northwest Quadrant shows soft clay conditions requiring additional compaction
            - Recommended compaction: 95% modified Proctor density
            - Water table encountered at 8 meters - no dewatering required for earthwork
            
            RECOMMENDATIONS:
            1. Pre-compact soft zones before loading haul roads
            2. Monitor settlement in Fill Zone B weekly
            3. Maintain 12-15% moisture content for optimal compaction
            """,
            "summary": "Soil bearing capacity analysis identifying soft ground in Sector 3 NW quadrant requiring additional compaction to 95% modified Proctor."
        },
        {
            "title": "Site Safety Plan - Q1 2026",
            "type": "safety",
            "site_id": "alpha",
            "content": """
            SITE SAFETY PLAN
            Effective: January 1, 2026
            
            HAUL ROAD SAFETY:
            - Maximum speed: 15 mph loaded, 25 mph empty
            - Maintain 100-foot following distance
            - Right-of-way: Loaded trucks have priority
            
            PEDESTRIAN SAFETY:
            - Exclusion zones marked with orange fencing
            - All personnel must wear high-visibility vests
            - Pedestrian activity restricted during shift changes (07:00-08:00, 15:00-16:00)
            
            EQUIPMENT OPERATIONS:
            - Daily pre-shift equipment inspections required
            - Spotter required for all reversing operations
            - No operation within 50m of survey crews
            """,
            "summary": "Comprehensive safety protocols for earthwork operations including haul road speed limits and pedestrian exclusion zones."
        },
        {
            "title": "CAT 793 Operating Parameters",
            "type": "equipment",
            "site_id": None,
            "content": """
            CAT 793 HAUL TRUCK OPERATING GUIDELINES
            
            GRADE LIMITATIONS:
            - Maximum grade loaded: 10%
            - Maximum grade empty: 15%
            - Reduce speed by 5 mph on wet surfaces
            
            PAYLOAD GUIDELINES:
            - Optimal payload range: 220-240 tons
            - Do not exceed 250 tons
            - Target bed fill: 105-110%
            
            FUEL EFFICIENCY:
            - Target idle time: <15% of shift
            - Optimal engine load during haul: 70-85%
            - Engine idle should not exceed 15 minutes continuously
            
            TIRE MANAGEMENT:
            - Maintain 100 psi on clay surfaces
            - Reduce to 90 psi on rocky terrain
            - Inspect tires at each fuel stop
            """,
            "summary": "Optimal operating parameters for CAT 793 haul trucks including grade limitations and payload guidelines."
        },
        {
            "title": "Haul Road Construction Procedure",
            "type": "procedure",
            "site_id": None,
            "content": """
            HAUL ROAD CONSTRUCTION STANDARD
            
            ROAD GEOMETRY:
            - Minimum width: 40 feet for two-way traffic
            - Crown: 2% grade from centerline for drainage
            - Maximum grade: 10% sustained, 12% for short distances
            
            DRAINAGE:
            - Drainage ditch: 2 feet deep on uphill side
            - Culverts at low points every 500 feet
            - Cross-drain at all intersections
            
            SURFACING:
            - Base course: 12 inches compacted gravel
            - Wearing course: 6 inches crusite or similar
            - Water application: 3x daily in dry conditions
            
            MAINTENANCE:
            - Grade road surface weekly
            - Repair potholes within 24 hours of identification
            - Re-water after any dust complaints
            """,
            "summary": "Standard procedure for constructing and maintaining haul roads including drainage and surfacing specifications."
        },
        {
            "title": "Geotechnical Report - Fill Zone B",
            "type": "geotech",
            "site_id": "alpha",
            "content": """
            COMPACTION VERIFICATION REPORT
            Location: Fill Zone B
            Date: January 20, 2026
            
            DENSITY TEST RESULTS:
            - Central area: 94-96% of modified Proctor (PASSING)
            - Eastern section: 93-95% of modified Proctor (PASSING)
            - Northwest corner: 89-91% of modified Proctor (NEEDS WORK)
            
            MOISTURE CONTENT:
            - Target range: 12-15%
            - Measured: 14% average (WITHIN SPEC)
            
            RECOMMENDATIONS:
            - Northwest corner requires 2 additional compaction passes
            - Retest NW corner after additional compaction
            - Proceed with next lift in passing areas
            """,
            "summary": "Compaction verification for Fill Zone B showing NW corner at 89% density needs additional compaction passes."
        },
    ]
    
    records = []
    for i, doc in enumerate(documents):
        records.append({
            "document_id": str(uuid.uuid4()),
            "site_id": doc["site_id"],
            "title": doc["title"],
            "document_type": doc["type"],
            "content": doc["content"].strip(),
            "summary": doc["summary"],
            "author": f"Site Engineer {i % 3 + 1}",
            "document_date": (datetime.now() - timedelta(days=random.randint(1, 30))).date(),
            "file_path": f"/documents/{doc['type']}/{doc['title'].replace(' ', '_').lower()}.pdf",
            "created_at": datetime.now()
        })
    
    return pd.DataFrame(records)


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Generate TERRA sample data")
    parser.add_argument("--output", type=str, default="./data", help="Output directory")
    parser.add_argument("--format", type=str, choices=["parquet", "csv"], default="parquet")
    parser.add_argument("--hours", type=int, default=24, help="Hours of GPS data to generate")
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Generating TERRA sample data...")
    
    # Generate data
    print("  -> Sites...")
    sites_df = generate_sites()
    
    print("  -> Equipment...")
    equipment_df = generate_equipment()
    
    print("  -> GPS Breadcrumbs (this may take a moment)...")
    gps_df = generate_gps_breadcrumbs(equipment_df, hours=args.hours)
    
    print("  -> Equipment Telematics...")
    telematics_df = generate_telematics(gps_df)
    
    print("  -> Cycle Events...")
    cycles_df = generate_cycle_events(equipment_df)
    
    print("  -> Volume Surveys...")
    volumes_df = generate_volume_surveys()
    
    print("  -> Site Documents...")
    documents_df = generate_documents()
    
    # Save data
    print(f"\nSaving data to {output_dir} as {args.format}...")
    
    datasets = {
        "sites": sites_df,
        "equipment": equipment_df,
        "gps_breadcrumbs": gps_df,
        "equipment_telematics": telematics_df,
        "cycle_events": cycles_df,
        "volume_surveys": volumes_df,
        "site_documents": documents_df,
    }
    
    for name, df in datasets.items():
        if args.format == "parquet":
            df.to_parquet(output_dir / f"{name}.parquet", index=False)
        else:
            df.to_csv(output_dir / f"{name}.csv", index=False)
        print(f"  -> {name}: {len(df):,} rows")
    
    print(f"\nData generation complete!")
    print(f"Total GPS breadcrumbs: {len(gps_df):,}")
    print(f"Total telematics records: {len(telematics_df):,}")


if __name__ == "__main__":
    main()
