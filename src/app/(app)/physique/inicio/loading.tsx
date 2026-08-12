import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brand-assets";

export default function PhysiqueEntryLoading() {
  const brand = BRAND_ASSETS.physique.complete;

  return (
    <div className="physique-entry-loading-v4525">
      <div className="physique-entry-loading-orbit-v4525">
        <span />
        <Image
          src={brand.src}
          alt={brand.alt}
          width={brand.width}
          height={brand.height}
          priority
        />
      </div>
      <small>Preparando Physique</small>
    </div>
  );
}
