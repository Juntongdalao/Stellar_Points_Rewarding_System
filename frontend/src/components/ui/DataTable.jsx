import { cn } from "../../lib/cn";

export default function DataTable({
    columns,
    data,
    keyExtractor = (row, index) => row.id ?? index,
    emptyMessage = "No records found.",
    className,
}) {
    if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error("DataTable requires at least one column definition");
    }

    return (
        <div className={cn("overflow-x-auto rounded-3xl border border-base-200/70 bg-white/95", className)}>
            <table className="table table-zebra w-full">
                <thead className="bg-surface-100">
                    <tr className="text-xs uppercase tracking-wide text-neutral/70">
                        {columns.map((col) => (
                            <th key={col.key || col.header} className={col.headerClassName}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 && (
                        <tr>
                            <td
                                className="py-10 text-center text-base text-base-content/70"
                                colSpan={columns.length}
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                    {data.map((row, rowIndex) => (
                        <tr key={keyExtractor(row, rowIndex)} className="hover">
                            {columns.map((col) => (
                                <td key={col.key || col.header} className={col.cellClassName}>
                                    {typeof col.render === "function"
                                        ? col.render(row, rowIndex)
                                        : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
