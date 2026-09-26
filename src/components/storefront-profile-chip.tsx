type StorefrontProfileChipProps = {
  name: string;
  profession?: string | null;
  photoUrl?: string | null;
  compact?: boolean;
};

export function StorefrontProfileChip({ name, profession, photoUrl, compact = false }: StorefrontProfileChipProps) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
  return <div className={`storefront-profile-chip${compact ? " compact" : ""}`}>
    {photoUrl ? <span className="storefront-profile-avatar has-photo" style={{ backgroundImage: `url(${photoUrl})` }} aria-hidden="true"/> : <span className="storefront-profile-avatar" aria-hidden="true">{initials}</span>}
    <span className="storefront-profile-copy"><strong>{name}</strong>{profession ? <small>{profession}</small> : <small>Cliente Candinho</small>}</span>
  </div>;
}
