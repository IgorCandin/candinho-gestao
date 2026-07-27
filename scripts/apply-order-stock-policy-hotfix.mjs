import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src", "components", "product-catalog-table.tsx");

if (!fs.existsSync(file)) {
  console.error("Arquivo não encontrado:", file);
  process.exit(1);
}

let source = fs.readFileSync(file, "utf8");

const oldLabel = `function stockLabel(product: CatalogProduct) {
  if (!product.active) return { label: "Inativo", tone: "gray" };
  if (product.available_quantity > 0 && product.incoming_quantity > 0) {
    return { label: "Disponível + reposição", tone: "green" };
  }
  if (product.available_quantity > 0) {
    return { label: "Disponível", tone: "green" };
  }
  if (product.incoming_quantity > 0) {
    return { label: "A caminho", tone: "orange" };
  }
  if (product.reserved_quantity > 0) {
    return { label: "Reservado", tone: "orange" };
  }
  return { label: "Sem estoque", tone: "red" };
}

function stockBorder(product: CatalogProduct) {
  if (product.available_quantity > 0) return "available";
  if (product.incoming_quantity > 0) return "incoming";
  return "empty";
}`;

const newLabel = `function stockLabel(product: CatalogProduct) {
  if (!product.active) return { label: "Inativo", tone: "gray" };
  if (product.available_quantity > 0 && product.incoming_quantity > 0) {
    return { label: "Disponível + reposição", tone: "green" };
  }
  if (product.available_quantity > 0) {
    return { label: "Disponível", tone: "green" };
  }
  if (product.incoming_quantity > 0) {
    return { label: "A caminho", tone: "orange" };
  }
  if (product.reserved_quantity > 0) {
    return { label: "Reservado", tone: "orange" };
  }
  if (product.stock_status === "restricted_order") {
    return { label: "Sob encomenda", tone: "gray" };
  }
  if (product.stock_status === "made_to_order") {
    return { label: "Sob encomenda", tone: "orange" };
  }
  return { label: "Sem estoque", tone: "red" };
}

function stockBorder(product: CatalogProduct) {
  if (product.available_quantity > 0) return "available";
  if (product.incoming_quantity > 0) return "incoming";
  if (product.stock_status === "made_to_order") return "incoming";
  if (product.stock_status === "restricted_order") return "available";
  return "empty";
}

function stockCardStyle(product: CatalogProduct) {
  if (product.available_quantity > 0 || product.incoming_quantity > 0) {
    return undefined;
  }

  if (product.stock_status === "made_to_order") {
    return { borderColor: "rgba(217,164,65,.58)" };
  }

  if (product.stock_status === "restricted_order") {
    return { borderColor: "rgba(145,151,163,.48)" };
  }

  return undefined;
}`;

if (!source.includes(oldLabel)) {
  console.error("Não encontrei o bloco stockLabel/stockBorder esperado. O arquivo pode ter mudado.");
  process.exit(2);
}
source = source.replace(oldLabel, newLabel);

const oldGallery = `<Link
                className={\`product-gallery-card stock-\${border} \${
                  hasPromotion(product) ? "has-operation-promotion" : ""
                }\`}
                href={salesMode ? "/produtos" : \`/produtos/\${product.id}\`}
                key={product.id}
              >`;

const newGallery = `<Link
                className={\`product-gallery-card stock-\${border} \${
                  hasPromotion(product) ? "has-operation-promotion" : ""
                }\`}
                style={stockCardStyle(product)}
                href={salesMode ? "/produtos" : \`/produtos/\${product.id}\`}
                key={product.id}
              >`;

if (!source.includes(oldGallery)) {
  console.error("Não encontrei o card da galeria esperado. Nenhuma alteração foi gravada.");
  process.exit(3);
}
source = source.replace(oldGallery, newGallery);

fs.writeFileSync(file, source, "utf8");
console.log("OK: política Sob encomenda aplicada em product-catalog-table.tsx");
