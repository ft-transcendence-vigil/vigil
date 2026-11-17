import Logo from '../../components/shared/Logo';

export default function SetupCheckError() {
  return (
    <main role="alert" className="flex min-h-dvh flex-col bg-vigil-bg">
      <div className="flex flex-1 items-center justify-center px-5 pb-24 text-center">
        <div>
        <Logo className="mx-auto! mb-8! px-5! py-2!" />
          <h1 className="text-1xl font-semibold sm:text-2xl">Unable to connect</h1>
          <p className="mt-2 text-base text-vigil-muted">Please try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-9 cursor-pointer bg-vigil-accent px-4 text-sm font-semibold uppercase tracking-wider text-vigil-bg hover:opacity-85"
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}