import { generateDarkColor } from '@logto/core-kit';

import type { CreateSignInExperience } from '../db-entries/index.js';
import { SignInMode } from '../db-entries/index.js';
import {
  MfaFactor,
  MfaPolicy,
  OrganizationRequiredMfaPolicy,
  SignInIdentifier,
} from '../foundations/index.js';

import { adminTenantId, defaultTenantId } from './tenant.js';

export const defaultPrimaryColor = '#2563EB';
const aicoLogoDataUrl =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImxvZ29HcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzNkZTFlNyIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOTA1NmZmIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KCiAgICA8bWFzayBpZD0iYmFyTWFzayI+CiAgICAgIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IndoaXRlIiAvPgogICAgICA8cmVjdCB4PSIxNzgiIHk9IjE5MCIgd2lkdGg9IjM0IiBoZWlnaHQ9IjExNSIgcng9IjE3IiBmaWxsPSJibGFjayIgLz4KICAgICAgPHJlY3QgeD0iMjMzIiB5PSIxMDAiIHdpZHRoPSIzNCIgaGVpZ2h0PSIyNTUiIHJ4PSIxNyIgZmlsbD0iYmxhY2siIC8+CiAgICAgIDxyZWN0IHg9IjI4OCIgeT0iMTkwIiB3aWR0aD0iMzQiIGhlaWdodD0iMTE1IiByeD0iMTciIGZpbGw9ImJsYWNrIiAvPgogICAgPC9tYXNrPgogIDwvZGVmcz4KCiAgPHBhdGggZD0iTTE5MCw4MAogICAgICAgICAgIEMyMTUsMzAgMjg1LDMwIDMxMCw4MAogICAgICAgICAgIEw0NDUsMzcwCiAgICAgICAgICAgQzQ3MCw0MzAgNDE1LDQ2NSAzODAsNDQ1CiAgICAgICAgICAgQzMzMCw0MTUgMTcwLDQxNSAxMjAsNDQ1CiAgICAgICAgICAgQzg1LDQ2NSAzMCw0MzAgNTUsMzcwIFoiCiAgICAgICAgZmlsbD0idXJsKCNsb2dvR3JhZCkiCiAgICAgICAgbWFzaz0idXJsKCNiYXJNYXNrKSIgLz4KPC9zdmc+Cg==';

export const createDefaultSignInExperience = (
  forTenantId: string,
  isCloud: boolean
): Readonly<CreateSignInExperience> =>
  Object.freeze({
    tenantId: forTenantId,
    id: 'default',
    color: {
      primaryColor: defaultPrimaryColor,
      isDarkModeEnabled: false,
      darkPrimaryColor: generateDarkColor(defaultPrimaryColor),
    },
    branding: {
      logoUrl: isCloud ? undefined : aicoLogoDataUrl,
      darkLogoUrl: isCloud ? undefined : aicoLogoDataUrl,
    },
    hideLogtoBranding: false,
    languageInfo: {
      autoDetect: true,
      fallbackLanguage: 'en' as const,
    },
    termsOfUseUrl: null,
    privacyPolicyUrl: null,
    signUp: {
      identifiers: [isCloud ? SignInIdentifier.Email : SignInIdentifier.Username],
      password: true,
      verify: isCloud,
    },
    signIn: {
      methods: [
        {
          identifier: isCloud ? SignInIdentifier.Email : SignInIdentifier.Username,
          password: true,
          verificationCode: false,
          isPasswordPrimary: true,
        },
      ],
    },
    socialSignInConnectorTargets: [],
    signInMode: SignInMode.SignInAndRegister,
    customCss: null,
    customContent: {},
    customUiAssets: null,
    passwordPolicy: {},
    mfa: {
      factors: [],
      policy: MfaPolicy.UserControlled,
    },
  });

/** @deprecated Use `createDefaultSignInExperience()` instead. */
export const defaultSignInExperience = createDefaultSignInExperience(defaultTenantId, false);

export const createAdminTenantSignInExperience = (): Readonly<CreateSignInExperience> =>
  Object.freeze({
    ...defaultSignInExperience,
    tenantId: adminTenantId,
    color: {
      ...defaultSignInExperience.color,
      isDarkModeEnabled: true,
    },
    signInMode: SignInMode.Register,
    branding: {
      logoUrl: aicoLogoDataUrl,
      darkLogoUrl: aicoLogoDataUrl,
    },
    mfa: {
      factors: [MfaFactor.TOTP, MfaFactor.WebAuthn, MfaFactor.BackupCode],
      policy: MfaPolicy.NoPrompt,
      organizationRequiredMfaPolicy: OrganizationRequiredMfaPolicy.Mandatory,
    },
  });
