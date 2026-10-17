import type { ReactNode } from 'react';
import Button from '../shared/Button';

interface Data {
  title: string;
  description?: string | null;
  btnValue?: string | null;
  onClick?: () => void;
  children: ReactNode;
}

export default function CardLayout({
  title,
  description = null,
  btnValue = null,
  children,
  onClick,
}: Data) {
  return (
    <div className="bg-vigil-card border border-vigil-border p-6 pb-7 w-full xl:w-2/3">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px]">{title}</h1>
          {description && (
            <div className="text-[15px] text-vigil-muted-extra">
              {description}
            </div>
          )}
        </div>
        {btnValue && (
          <Button
            value={btnValue}
            onClick={onClick}
            className="text-[11px]! md:text-[12px]! lg:text-[13px]! py-2! md:py-2.5! px-5! md:px-7!"
          />
        )}
      </div>
      {children}
    </div>
  );
}
