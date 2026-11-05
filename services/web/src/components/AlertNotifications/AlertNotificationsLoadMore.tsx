interface Data {
  onClick: () => void;
  isLoading: boolean;
}

export default function AlertNotificationLoadMoreButton({
  onClick,
  isLoading,
}: Data) {
  return (
    <div className="border-t border-vigil-border px-4 py-2.5 text-center">
      <button
        type="button"
        disabled={isLoading}
        onClick={onClick}
        className="cursor-pointer text-[.75rem] text-vigil-blue hover:underline disabled:cursor-default disabled:text-vigil-muted-extra"
      >
        {isLoading ? 'Loading...' : 'Load more'}
      </button>
    </div>
  );
}
