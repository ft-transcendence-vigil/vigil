import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="grid h-full min-h-64 place-items-center text-center">
      <div>
        <p className="text-5xl font-semibold text-vigil-blue sm:text-6xl">
          404
        </p>
        <h1 className="mt-3 text-1xl font-semibold sm:text-2xl">
          Page not found
        </h1>
        <p className="mt-2 text-base text-vigil-muted">
          This page doesn't exist or was moved.
        </p>
        <Link
          to="/overview"
          className="mt-6 inline-grid h-10 place-items-center bg-vigil-blue px-5 text-sm font-semibold uppercase tracking-wider text-vigil-bg hover:opacity-85"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
