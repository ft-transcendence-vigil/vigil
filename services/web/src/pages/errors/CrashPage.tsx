import { Link } from 'react-router-dom';
import type { FallbackProps } from 'react-error-boundary';

export default function CrashPage({ resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      className="grid h-full min-h-64 place-items-center text-center"
    >
      <div>
        <h2 className="mb-2 text-2xl font-semibold sm:text-3xl">
          Something went wrong
        </h2>
        <p className="mb-6 text-base text-vigil-muted sm:text-lg">
          This page failed to load.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={resetErrorBoundary}
            className="h-10 cursor-pointer bg-vigil-blue px-5 text-sm font-semibold uppercase tracking-wider text-vigil-bg hover:opacity-85"
          >
            Try again
          </button>
          <Link
            to="/overview"
            className="grid h-10 place-items-center border border-vigil-border px-5 text-sm uppercase tracking-wider text-vigil-muted hover:text-[#ffffffc2]"
          >
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
