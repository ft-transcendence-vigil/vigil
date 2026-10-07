export default function Logo({ className = 'text-4xl px-7' }) {
  return (
    <h1
      className={`logo font-semibold uppercase bg-vigil-blue text-vigil-surface w-fit py-1 skew-x-10 -rotate-3 mx-auto lg:m-0 lg:mb-0 ${className}`}
    >
      vigil
    </h1>
  );
}
