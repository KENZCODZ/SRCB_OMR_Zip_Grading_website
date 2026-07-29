import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MetricTileProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'info';
  trend?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  trend
}) => {
  return (
    <div className={`metric-card metric-card-${color}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-wrapper">
            <Icon size={20} className={`icon-${color}`} />
          </div>
        )}
      </div>

      <div className="metric-body">
        <h3 className="metric-value">{value}</h3>
        {trend && <span className="metric-trend">{trend}</span>}
      </div>

      <p className="metric-subtitle">{subtitle}</p>
    </div>
  );
};

export default MetricTile;
