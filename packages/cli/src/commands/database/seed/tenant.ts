import { createTenantDatabaseMetadata } from '@logto/core-kit';
import {
  type AdminData,
  type UpdateAdminData,
  type CreateScope,
  type CreateRolesScope,
  defaultTenantId,
  adminTenantId,
  Applications,
  ApplicationsRoles,
  getMapiProxyM2mApp,
  getMapiProxyRole,
  defaultManagementApiAdminName,
  Roles,
  PredefinedScope,
  getManagementApiResourceIndicator,
} from '@logto/schemas';
import { generateStandardId } from '@logto/shared';
import { assert } from '@silverhand/essentials';
import type { CommonQueryMethods, DatabaseTransactionConnection } from '@silverhand/slonik';
import { sql } from '@silverhand/slonik';

import { insertInto } from '../../../database.js';
import { getDatabaseName } from '../../../queries/database.js';
import { consoleLog } from '../../../utils.js';

export const createTenant = async (pool: CommonQueryMethods, tenantId: string) => {
  const database = await getDatabaseName(pool, true);
  const { parentRole, role, password } = createTenantDatabaseMetadata(database, tenantId);
  const createTenant = {
    id: tenantId,
    dbUser: role,
    dbUserPassword: password,
  };

  await pool.query(insertInto(createTenant, 'tenants'));
  await pool.query(sql`
    create role ${sql.identifier([role])} with inherit login
      password '${sql.raw(password)}'
      in role ${sql.identifier([parentRole])};
  `);
};

export const seedAdminData = async (
  pool: CommonQueryMethods,
  data: AdminData | UpdateAdminData,
  ...additionalScopes: CreateScope[]
) => {
  const { resource, scopes, role } = data;

  assert(
    scopes.every(
      (scope) => resource.tenantId === scope.tenantId && scope.tenantId === role.tenantId
    ),
    new Error('All data should have the same tenant ID')
  );

  const processRole = async () => {
    if ('id' in role) {
      await pool.query(insertInto(role, 'roles'));

      return role.id;
    }

    // Query by role name for existing roles
    const { id } = await pool.one<{ id: string }>(sql`
      select id from roles
      where name=${role.name}
      and tenant_id=${String(role.tenantId)}
    `);

    return id;
  };

  await pool.query(insertInto(resource, 'resources'));
  await Promise.all(
    [...scopes, ...additionalScopes].map(async (scope) => pool.query(insertInto(scope, 'scopes')))
  );

  const roleId = await processRole();
  await Promise.all(
    scopes.map(async ({ id }) =>
      pool.query(
        insertInto(
          {
            id: generateStandardId(),
            roleId,
            scopeId: id,
            tenantId: resource.tenantId,
          } satisfies CreateRolesScope,
          'roles_scopes'
        )
      )
    )
  );
};

export const assignScopesToRole = async (
  pool: CommonQueryMethods,
  tenantId: string,
  roleId: string,
  ...scopeIds: string[]
) => {
  await Promise.all(
    scopeIds.map(async (scopeId) =>
      pool.query(
        insertInto(
          {
            id: generateStandardId(),
            roleId,
            scopeId,
            tenantId,
          } satisfies CreateRolesScope,
          'roles_scopes'
        )
      )
    )
  );
};

/**
 * For each initial tenant (`default` and `admin`), create a machine-to-machine application for
 * Management API proxy and assign the corresponding proxy role to it.
 */
export const seedManagementApiProxyApplications = async (
  connection: DatabaseTransactionConnection
) => {
  const tenantIds = [defaultTenantId, adminTenantId];

  // Create machine-to-machine applications for Management API proxy
  await connection.query(
    insertInto(
      tenantIds.map((tenantId) => getMapiProxyM2mApp(tenantId)),
      Applications.table
    )
  );
  consoleLog.succeed('Created machine-to-machine applications for Management API proxy');

  // Assign the proxy roles to the applications
  await connection.query(
    insertInto(
      tenantIds.map((tenantId) => ({
        tenantId: adminTenantId,
        id: generateStandardId(),
        applicationId: getMapiProxyM2mApp(tenantId).id,
        roleId: getMapiProxyRole(tenantId).id,
      })),
      ApplicationsRoles.table
    )
  );
  consoleLog.succeed('Assigned the proxy roles to the applications');
};

/**
 * Seed the legacy user role for accessing default Management API, and assign the `all` scope to
 * it. Used in OSS only.
 */
export const seedLegacyManagementApiUserRole = async (
  connection: DatabaseTransactionConnection
) => {
  const roleId = generateStandardId();
  await connection.query(
    insertInto(
      {
        tenantId: adminTenantId,
        id: roleId,
        name: defaultManagementApiAdminName,
        description: 'Legacy user role for accessing default Management API. Used in OSS only.',
      },
      Roles.table
    )
  );
  await connection.query(sql`
    insert into roles_scopes (id, role_id, scope_id, tenant_id)
    values (
      ${generateStandardId()},
      ${roleId},
      (
        select scopes.id from scopes
        join resources on scopes.resource_id = resources.id
        where resources.indicator = ${getManagementApiResourceIndicator(defaultTenantId)}
        and scopes.name = ${PredefinedScope.All}
        and scopes.tenant_id = ${adminTenantId}
      ),
      ${adminTenantId}
    );
  `);
};

/**
 * Automatically seed the Management M2M application if environment variables are provided.
 */
export const seedManagementM2MApplication = async (
  connection: DatabaseTransactionConnection,
  tenantId: string
) => {
  const appId = process.env.LOGTO_MANAGEMENT_APP_ID;
  const appSecret = process.env.LOGTO_MANAGEMENT_APP_SECRET;

  if (!appId || !appSecret) {
    consoleLog.info('Skipping Management M2M App seeding (env vars not set)');
    return;
  }

  // Create the M2M application
  const app = {
    tenantId,
    id: appId,
    name: 'Management API',
    secret: appSecret,
    description: 'Auto-seeded Management API M2M application',
    type: 'MachineToMachine',
    oidcClientMetadata: {
      redirectUris: [],
      postLogoutRedirectUris: [],
    },
    customClientMetadata: {},
    isThirdParty: false,
    createdAt: Date.now(),
    customData: {},
  };

  try {
    // Check if app exists
    const existing = await connection.maybeOne(sql`
      select id from applications where id = ${appId}
    `);

    if (existing) {
      consoleLog.info('Management M2M App already exists, updating secret...');
      await connection.query(sql`
        update applications set secret = ${appSecret} where id = ${appId}
      `);
    } else {
      await connection.query(insertInto(app, 'applications'));
      consoleLog.succeed('Created Management M2M App');
    }

    // Assign "Logto Management API access" role
    // This role is created by seedPreConfiguredManagementApiAccessRole
    const roleName = 'Logto Management API access';

    const role = await connection.maybeOne<{ id: string }>(sql`
      select id from roles where name = ${roleName} and tenant_id = ${tenantId}
    `);

    if (!role) {
      consoleLog.warn(`Role "${roleName}" not found, skipping assignment`);
      return;
    }

    const applicationRole = {
      id: generateStandardId(),
      tenantId,
      applicationId: appId,
      roleId: role.id,
    };

    // Check if assignment exists
    const existingAssignment = await connection.maybeOne(sql`
      select id from applications_roles 
      where application_id = ${appId} and role_id = ${role.id}
    `);

    if (!existingAssignment) {
      await connection.query(insertInto(applicationRole, 'applications_roles'));
      consoleLog.succeed('Assigned Management API access role to M2M App');
    }

  } catch (error) {
    consoleLog.error('Failed to seed Management M2M App:', error);
  }
};
