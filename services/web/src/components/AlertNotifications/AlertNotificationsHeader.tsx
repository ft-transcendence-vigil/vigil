interface Data {
  unseenCount: number;
}

export default function AlertNotificationsHeader({ unseenCount }: Data) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5">
      <h2 className="text-[.95rem] font-bold text-white">
        Notifications
        {unseenCount > 0 && (
          <span className="ml-2 text-[.62rem] font-medium text-vigil-blue">
            {unseenCount} new
          </span>
        )}
      </h2>
    </div>
  );
}
