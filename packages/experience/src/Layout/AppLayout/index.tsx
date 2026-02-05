import classNames from 'classnames';
import { useContext } from 'react';
import { Outlet } from 'react-router-dom';

import PageContext from '@/Providers/PageContextProvider/PageContext';
import usePlatform from '@/hooks/use-platform';
import LogtoSignature from '@/shared/components/LogtoSignature';
import { getBrandingLogoUrl } from '@/shared/utils/logo';
import { layoutClassNames } from '@/utils/consts';

import CustomContent from './CustomContent';
import DotGrid from './DotGrid';
import styles from './index.module.scss';

const AppLayout = () => {
  const { experienceSettings, theme } = useContext(PageContext);
  const { isMobile } = usePlatform();
  const hideLogtoBranding = experienceSettings?.hideLogtoBranding === true;

  const logoUrl = experienceSettings
    ? getBrandingLogoUrl({
      theme,
      branding: experienceSettings.branding,
      isDarkModeEnabled: experienceSettings.color.isDarkModeEnabled,
    })
    : undefined;

  return (
    <div className={styles.viewBox}>
      {/* Interactive dot grid background */}
      {!isMobile && <DotGrid />}
      {/* Logo at top-left */}
      {logoUrl && (
        <div className={styles.topLogo}>
          <img src={logoUrl} alt="Logo" className={styles.logo} />
        </div>
      )}
      <div className={classNames(styles.container, layoutClassNames.pageContainer)}>
        {!isMobile && <CustomContent className={layoutClassNames.customContent} />}
        <main className={classNames(styles.main, layoutClassNames.mainContent)}>
          <Outlet />
          {!hideLogtoBranding && (
            <LogtoSignature
              className={classNames(styles.signature, layoutClassNames.signature)}
              theme={theme}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
