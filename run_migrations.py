import os
import glob
from sqlalchemy import create_engine, text

db_url = 'postgresql+psycopg2://postgres:04caa751d0c54e9a7ca4393b9ab5a404d049fd2677f0d4c87223df6ed16ea1e6@8.234.108.26:5432/himdrishti'
engine = create_engine(db_url)

migrations = sorted(glob.glob('e:/Projects/HimDrishti/db/migrations/*.sql'))
with engine.connect() as conn:
    for migration in migrations:
        print(f'Applying {os.path.basename(migration)}...')
        with open(migration, 'r') as f:
            sql = f.read()
            with conn.begin():
                conn.execute(text(sql))
print('Migrations complete.')