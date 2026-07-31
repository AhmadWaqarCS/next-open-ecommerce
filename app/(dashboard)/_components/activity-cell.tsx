"use client";

interface ActivityCellProps {
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  userNames?: Record<number, string>;
  isTrash?: boolean;
}

export default function ActivityCell({
  createdBy,
  updatedBy,
  deletedBy,
  createdAt,
  updatedAt,
  deletedAt,
  userNames = {},
  isTrash = false,
}: ActivityCellProps) {
  const getUsername = (id?: number | null) => {
    if (id === null || id === undefined) return "System";
    return userNames[id] || `User #${id}`;
  };

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isTrash) {
    const delDateStr = formatDate(deletedAt);
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium space-y-0.5">
        <div>
          Deleted by:{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {getUsername(deletedBy)}
          </span>
        </div>
        {delDateStr && (
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {delDateStr}
          </div>
        )}
      </div>
    );
  }

  const createdDateStr = formatDate(createdAt);
  const updatedDateStr = formatDate(updatedAt);

  return (
    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium space-y-0.5">
      <div>
        Created by:{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {getUsername(createdBy)}
        </span>
        {createdDateStr && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-1">
            ({createdDateStr})
          </span>
        )}
      </div>
      <div>
        Updated by:{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {getUsername(updatedBy)}
        </span>
        {updatedDateStr && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-1">
            ({updatedDateStr})
          </span>
        )}
      </div>
    </div>
  );
}
