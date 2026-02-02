import { Theme } from '@logto/schemas';
import { useEffect, useRef } from 'react';

import LogtoLogtoDark from '@/shared/assets/icons/logto-logo-dark.svg?react';
import LogtoLogoLight from '@/shared/assets/icons/logto-logo-light.svg?react';
import LogtoLogoShadow from '@/shared/assets/icons/logto-logo-shadow.svg?react';

import styles from './index.module.scss';

const brandName = 'AICO';
const brandUrl = '/';

const guardStyleSelector = 'style[data-logto-signature-guard="true"]';

const signatureGuardStyle = `
[data-logto-signature-container="secured"][data-logto-signature-container="secured"] {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

[data-logto-signature="secured"][data-logto-signature="secured"] {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  font: var(--font-label-2) !important;
  font-weight: normal !important;
  color: var(--color-neutral-variant-60) !important;
  padding: 4px 8px !important;
  text-decoration: none !important;
  opacity: 75% !important;
  direction: ltr !important;
  position: relative !important;
  inset: auto !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  transform: none !important;
  pointer-events: auto !important;
}

[data-logto-signature="secured"][data-logto-signature="secured"]:is(:hover, :active, :focus-visible) {
  opacity: 100% !important;
}

[data-logto-signature="secured"][data-logto-signature="secured"] [data-logto-signature-icon="static"] {
  display: block !important;
}

[data-logto-signature="secured"][data-logto-signature="secured"] [data-logto-signature-icon="highlight"] {
  display: none !important;
}

[data-logto-signature="secured"][data-logto-signature="secured"]:is(:hover, :active, :focus-visible)
  [data-logto-signature-icon="static"] {
  display: none !important;
}

[data-logto-signature="secured"][data-logto-signature="secured"]:is(:hover, :active, :focus-visible)
  [data-logto-signature-icon="highlight"] {
  display: block !important;
}

[data-logto-signature-text] {
  margin-inline-end: 4px !important;
}

body.mobile [data-logto-signature="secured"][data-logto-signature="secured"] {
  color: var(--color-neutral-variant-80) !important;
  font: var(--font-label-3) !important;
}
`;

type Props = {
  readonly className?: string;
  readonly theme: Theme;
};

const LogtoSignature = ({ className, theme }: Props) => {
  const LogtoLogo = theme === Theme.Light ? LogtoLogoLight : LogtoLogtoDark;

  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Tamper protection removed for local customization
  }, []);

  return (
    <div ref={containerRef} className={className} data-logto-signature-container="secured">
      <a
        ref={anchorRef}
        aria-label={brandName}
        className={styles.signature}
        data-logto-signature="secured"
        href={brandUrl}
      >
        <span data-logto-signature-text className={styles.text}>
          {brandName}
        </span>
        <LogtoLogoShadow data-logto-signature-icon="static" className={styles.staticIcon} />
        <LogtoLogo data-logto-signature-icon="highlight" className={styles.highlightIcon} />
      </a>
    </div>
  );
};

export default LogtoSignature;
