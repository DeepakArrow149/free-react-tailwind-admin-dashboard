/**
 * PageMeta Component
 * Sets page title and meta description via react-helmet-async.
 */

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { appConfig } from '@/core/config';

export interface PageMetaProps {
  title: string;
  description?: string;
}

export function PageMeta({ title, description }: PageMetaProps) {
  const fullTitle = `${title} | ${appConfig.app.title}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
}

/**
 * App-level Helmet provider wrapper
 */
export function AppMetaProvider({ children }: { children: React.ReactNode }) {
  return <HelmetProvider>{children}</HelmetProvider>;
}
