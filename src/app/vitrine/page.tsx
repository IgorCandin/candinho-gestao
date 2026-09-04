import PublicCatalogPage from "@/app/catalogo/page";
import styles from "./vitrine.module.css";

export const revalidate = 10;

export default async function StorefrontV2Page() {
  return <div className={styles.page}><PublicCatalogPage /></div>;
}
