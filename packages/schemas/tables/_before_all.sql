/* This SQL will run before all other queries. */

DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'logto_tenant_${database}') THEN
      CREATE ROLE logto_tenant_${database} PASSWORD '${password}' NOINHERIT;
   END IF;
END
$do$;
