export default function InlineSpinner({ label = "Loading", className = "" }) {
    return (
        <div className={`flex items-center gap-2 text-sm text-neutral/70 ${className}`}>
            <span className="loading loading-spinner loading-sm text-primary" aria-hidden="true" />
            <span>{label}</span>
        </div>
    );
}
