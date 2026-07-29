import React from 'react';
import { GraduationCap, Award } from 'lucide-react';

export interface HeaderBannerProps {
  title?: string;
  subtitle?: string;
  logoSrc?: string;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  title = "St. Rita’s College of Balingasag",
  subtitle = "Higher Education Department • Information Technology Program (ITP 305)",
  logoSrc = "/srcb-logo.png"
}) => {
  return (
    <div className="srcb-banner-container">
      <div className="srcb-brand-flex">
        <div className="srcb-logo-wrapper" title="St. Rita's College of Balingasag Seal">
          <img src={logoSrc} alt="St. Rita's College of Balingasag Logo" className="srcb-header-logo-img" />
        </div>
        <div>
          <h2 className="srcb-title-main">
            {title}
            <Award size={18} className="text-secondary" style={{ color: 'var(--srcb-gold-accent)' }} />
          </h2>
          <p className="srcb-subtitle-info">
            <GraduationCap size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {subtitle}
          </p>
        </div>
      </div>

      <div className="srcb-motto-badge">
        Caritas • Veritas • Virtus
      </div>
    </div>
  );
};

export default HeaderBanner;
