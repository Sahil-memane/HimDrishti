import urllib.request
import json

base_url = 'https://api-gateway-1021025943839.asia-south1.run.app/api'

login_data = json.dumps({'email': 'planner01@gmail.com', 'password': 'password123'}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['access_token']
except Exception as e:
    print(f'Login failed: {e}')
    # Try the other user
    login_data = json.dumps({'email': 'mariner01@gmail.com', 'password': 'password123'}).encode('utf-8')
    req = urllib.request.Request(f'{base_url}/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['access_token']

print(f'Got token: {token[:10]}...')

req2 = urllib.request.Request(f'{base_url}/voyage/e04d1836-9a58-483c-8891-e35ab2f121e3/route',
    headers={'Authorization': f'Bearer {token}'})
res2 = urllib.request.urlopen(req2)
route = json.loads(res2.read())
print(f'Waypoints count: {len(route.get("waypoints", []))}')
if route.get("waypoints"):
    wp = route["waypoints"][0]
    print(f'Waypoint 0 lat type: {type(wp.get("lat"))} value: {wp.get("lat")}')
    print(f'Waypoint 0 lon type: {type(wp.get("lon"))} value: {wp.get("lon")}')
