import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://ragtime:ragtime_local_db_secret_pass@localhost:5432/ragtime_db')
    await conn.execute("""
        DO $do$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ragtime_app') THEN
                CREATE ROLE ragtime_app WITH LOGIN PASSWORD 'ragtime_local_db_secret_pass' NOSUPERUSER NOBYPASSRLS;
            END IF;
        END
        $do$;
        GRANT ALL PRIVILEGES ON DATABASE ragtime_db TO ragtime_app;
        GRANT ALL ON SCHEMA public TO ragtime_app;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ragtime_app;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ragtime_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ragtime_app;
        GRANT ragtime_app TO ragtime;
    """)
    print("Role ragtime_app configured!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
