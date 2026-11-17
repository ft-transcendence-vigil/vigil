interface Data {
  loaded: number;
  errors: number;
  warnings: number;
}

export default function LogsSummary({ loaded, errors, warnings }: Data) {
  return (
    <div>
      <span className="inline-block mono text-[14px] my-4.5 mx-2 text-vigil-muted">
        {loaded} loaded
      </span>
      <span className="inline-block mono text-[14px] my-4.5 mx-2 text-vigil-log-error">
        {errors} errors
      </span>
      <span className="inline-block mono text-[14px] my-4.5 mx-2 text-vigil-warning">
        {warnings} warnings
      </span>
    </div>
  );
}
