import os
import glob
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:04caa751d0c54e9a7ca4393b9ab5a404d049fd2677f0d4c87223df6ed16ea1e6@8.234.108.26:5432/himdrishti"
engine = create_engine(db_url)

# The docker-compose mounts backend/api-gateway to /app. The db folder is outside, so we pass it differently.
# But we'll run this on the host via 'docker exec -i himdrishti-api-gateway-1 python - < run_migrations_host.py'
import sys
sql_script = sys.stdin.read()
with engine.connect() as conn:
    # Some statements like CREATE EXTENSION might need a commit
    with conn.begin():
        conn.execute(text(sql_script))
