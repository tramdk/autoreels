export const getTopPercent = (val: number | undefined, placement: string = 'top') => {
  let offset = val || 0;
  if (placement === 'bottom' && offset > 50) offset = offset - 100;
  if (placement === 'center' && offset > 50) offset = offset - 50;
  const base = placement === 'center' ? 50 : placement === 'bottom' ? 100 : 0;
  return `calc(${base}% + ${offset}%)`;
};

export const getLeftPercent = (val: number | undefined, align: string = 'center') => {
  let offset = val || 0;
  if (align === 'right' && offset > 50) offset = offset - 100;
  if (align === 'center' && offset > 50) offset = offset - 50;
  const base = align === 'center' ? 50 : align === 'right' ? 100 : 0;
  return `calc(${base}% + ${offset}%)`;
};

export const getTransform = (align: string = 'center', placement: string = 'top', extra: string = '') => {
  let t = '';
  if (align === 'center') t += ' translateX(-50%)';
  else if (align === 'right') t += ' translateX(-100%)';
  
  if (placement === 'center') t += ' translateY(-50%)';
  else if (placement === 'bottom') t += ' translateY(-100%)';
  
  return (t + ' ' + extra).trim();
};
