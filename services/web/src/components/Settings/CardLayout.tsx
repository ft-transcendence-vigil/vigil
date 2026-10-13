import type { ReactNode } from 'react';

interface Data {
  title: string;
  children: ReactNode;
}

export default function CardLayout({ title, children }: Data) {
  return (
    <div className="bg-vigil-card border border-vigil-border p-6 pb-7 w-full xl:w-2/3">
      <h1 className="text-[18px] mb-5">{title}</h1>
      {children}
    </div>
  );
}
