import requests
import json

base_url = "https://api-gateway-hkfbvqcjfq-el.a.run.app/api"
print("Logging in...")
login_res = requests.post(f"{base_url}/auth/login", json={"email": "whitedevil11433@gmail.com", "password": "Shivam@2005"})
login_res.raise_for_status()
token = login_res.json()["access_token"]
print("Logged in!")

headers = {"Authorization": f"Bearer {token}"}
print("Fetching active voyages...")
voyages_res = requests.get(f"{base_url}/voyage", headers=headers)
voyages = voyages_res.json()
if not voyages.get("items"):
    print("No voyages found!")
    exit(0)

vid = voyages["items"][0]["voyage_id"]
print(f"Fetching route for {vid}...")
route_res = requests.get(f"{base_url}/voyage/{vid}/route", headers=headers)
if route_res.status_code == 200:
    route = route_res.json()
    if route.get("waypoints") and len(route["waypoints"]) > 0:
        print("First waypoint:", json.dumps(route["waypoints"][0], indent=2))
        print("Total waypoints:", len(route["waypoints"]))
    else:
        print("No waypoints in route!")
else:
    print("Error:", route_res.text)

