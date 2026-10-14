import type { ReactNode } from 'react';

interface Data {
  title: string;
  description?: string | null;
  children: ReactNode;
}

export default function CardLayout({
  title,
  description = null,
  children,
}: Data) {
  return (
    <div className="bg-vigil-card border border-vigil-border p-6 pb-7 w-full xl:w-2/3">
      <h1 className="text-[18px] mb-5">{title}</h1>
      {description && (
        <div className="text-[15px] text-vigil-muted-extra -mt-3.5 mb-5">
          {description}
        </div>
      )}
      {children}
    </div>
  );
}
