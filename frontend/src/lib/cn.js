export function cn(...classes) {
    return classes
        .flatMap((value) => (typeof value === "string" ? value.split(" ") : value))
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}
