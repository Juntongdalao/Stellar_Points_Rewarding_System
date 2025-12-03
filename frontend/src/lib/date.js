const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
});

export function formatDate(value) {
    if (!value) return "—";
    try {
        return dateFormatter.format(new Date(value));
    } catch {
        return value;
    }
}

export function formatDateTime(value) {
    if (!value) return "—";
    try {
        return dateTimeFormatter.format(new Date(value));
    } catch {
        return value;
    }
}
