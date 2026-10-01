import React from 'react';
import clsx from 'clsx';

export const StatCard = ({ title, value, unit, icon: Icon, variant = 'default', subtext }) => {
  return (
    <div className={clsx('stat-card', variant === 'danger' && 'alert-stat')}>
      <div className="stat-info">
        <h3>{title}</h3>
        <div className="stat-value">
          <span>{value}</span>
          {unit && <span className="stat-unit">{unit}</span>}
        </div>
        {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{subtext}</div>}
      </div>
      <div className={clsx('stat-icon-wrapper', variant === 'danger' && 'danger')}>
        {Icon && <Icon size={24} />}
      </div>
    </div>
  );
};
