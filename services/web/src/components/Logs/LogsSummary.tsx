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
      <span className="inline-block mono text-[14px] my-4.5 mx-2 text-[#ff6b81]">
        {errors} errors
      </span>
      <span className="inline-block mono text-[14px] my-4.5 mx-2 text-[#f59e0b]">
        {warnings} warnings
      </span>
    </div>
  );
}
