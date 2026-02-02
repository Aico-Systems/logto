import { generateDarkColor } from '@logto/core-kit';
import { sql } from '@silverhand/slonik';

import type { AlterationScript } from '../lib/types/alteration.js';

const defaultPrimaryColor = '#6139F6';
const aicoLogoDataUrl =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxvZ29HcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzNkZTFlNyIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOTA1NmZmIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KCiAgICA8bWFzayBpZD0iYmFyTWFzayI+CiAgICAgIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IndoaXRlIiAvPgogICAgICA8cmVjdCB4PSIxNzgiIHk9IjE5MCIgd2lkdGg9IjM0IiBoZWlnaHQ9IjExNSIgcng9IjE3IiBmaWxsPSJibGFjayIgLz4KICAgICAgPHJlY3QgeD0iMjMzIiB5PSIxMDAiIHdpZHRoPSIzNCIgaGVpZ2h0PSIyNTUiIHJ4PSIxNyIgZmlsbD0iYmxhY2siIC8+CiAgICAgIDxyZWN0IHg9IjI4OCIgeT0iMTkwIiB3aWR0aD0iMzQiIGhlaWdodD0iMTE1IiByeD0iMTciIGZpbGw9ImJsYWNrIiAvPgogICAgPC9tYXNrPgogIDwvZGVmcz4KCiAgPHBhdGggZD0iTTE5MCw4MAogICAgICAgICAgIEMyMTUsMzAgMjg1LDMwIDMxMCw4MAogICAgICAgICAgIEw0NDUsMzcwCiAgICAgICAgICAgQzQ3MCw0MzAgNDE1LDQ2NSAzODAsNDQ1CiAgICAgICAgICAgQzMzMCw0MTUgMTcwLDQxNSAxMjAsNDQ1CiAgICAgICAgICAgQzg1LDQ2NSAzMCw0MzAgNTUsMzcwIFoiCiAgICAgICAgZmlsbD0idXJsKCNsb2dvR3JhZCkiCiAgICAgICAgbWFzaz0idXJsKCNiYXJNYXNrKSIgLz4KPC9zdmc+Cg==';

const data = {
  tenantId: 'admin',
  id: 'default',
  color: {
    primaryColor: defaultPrimaryColor,
    isDarkModeEnabled: true,
    darkPrimaryColor: generateDarkColor(defaultPrimaryColor),
  },
  branding: {
    style: 'Logo_Slogan',
    logoUrl: aicoLogoDataUrl,
    darkLogoUrl: aicoLogoDataUrl,
    slogan: 'admin_console.welcome.title',
  },
  languageInfo: {
    autoDetect: true,
    fallbackLanguage: 'en',
  },
  termsOfUseUrl: null,
  signUp: {
    identifiers: ['username'],
    password: true,
    verify: false,
  },
  signIn: {
    methods: [
      {
        identifier: 'username',
        password: true,
        verificationCode: false,
        isPasswordPrimary: true,
      },
    ],
  },
  socialSignInConnectorTargets: [],
  customCss: null,
} as const;

const alteration: AlterationScript = {
  up: async (pool) => {
    const hasActiveUsers = await pool.exists(sql`
      select id
      from users
      where tenant_id = 'admin'
      and is_suspended = false
      limit 1
    `);
    await pool.query(sql`
      insert into sign_in_experiences (
        tenant_id,
        id,
        color,
        branding,
        language_info,
        terms_of_use_url,
        sign_up,
        sign_in,
        social_sign_in_connector_targets,
        sign_in_mode,
        custom_css
      ) values (
        ${data.tenantId},
        ${data.id},
        ${sql.jsonb(data.color)},
        ${sql.jsonb(data.branding)},
        ${sql.jsonb(data.languageInfo)},
        ${data.termsOfUseUrl},
        ${sql.jsonb(data.signUp)},
        ${sql.jsonb(data.signIn)},
        ${sql.jsonb(data.socialSignInConnectorTargets)},
        ${hasActiveUsers ? 'SignIn' : 'Register'},
        ${data.customCss}
      );
    `);
  },
  down: async (pool) => {
    await pool.query(sql`
      delete from sign_in_experiences
        where tenant_id = 'admin'
        and id = 'default';
    `);
  },
};

export default alteration;
