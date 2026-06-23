import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
}) => {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className={styles.skeletonCard}>
      <Skeleton height="1.5rem" width="60%" className={styles.margin} />
      <Skeleton height="1rem" width="40%" className={styles.margin} />
      <Skeleton height="3rem" className={styles.margin} />
      <div className={styles.row}>
        <Skeleton height="2rem" width="30%" />
        <Skeleton height="2rem" width="30%" />
      </div>
    </div>
  );
};
