'use client';

import { useEffect, useRef } from 'react';

import styles from './RecruitmentFormPage.module.css';

type Props = {
  percent: number;
};

export function TrainingProgressBar({ percent }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${percent}%`;
    }
  }, [percent]);

  return <div ref={barRef} className={styles.trainingProgressBar} />;
}
