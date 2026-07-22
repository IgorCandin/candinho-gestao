export type NutritionCardFact = {
  label: string;
  amount: string;
  daily_value: string;
};

export type NutritionCardResearch = {
  confirmed_product_name: string;
  confirmed_brand: string;
  serving_size: string;
  servings_per_container: string;
  nutrition_facts: NutritionCardFact[];
  ingredients: string;
  allergens: string;
  source_name: string;
  source_url: string;
};

type RenderResult = {
  full: Blob;
  thumbnail: Blob;
};

const WIDTH = 1080;
const HEIGHT = 1080;

function normalize(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height,
  );
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function wrapLines(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = normalize(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    const original = normalize(value);

    if (joined.length < original.length) {
      let last = lines[maxLines - 1];

      while (
        last.length > 1 &&
        context.measureText(`${last}…`).width > maxWidth
      ) {
        last = last.slice(0, -1);
      }

      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }

  return lines;
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  const original = normalize(value);

  if (context.measureText(original).width <= maxWidth) {
    return original;
  }

  let trimmed = original;

  while (
    trimmed.length > 1 &&
    context.measureText(`${trimmed}…`).width > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed.trimEnd()}…`;
}

function drawLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível converter a arte em imagem."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function buildCanvas(
  productName: string,
  research: NutritionCardResearch,
) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Seu navegador não conseguiu iniciar o gerador da Imagem 2.");
  }

  const gold = "#D9A441";
  const background = "#0B0E13";
  const panel = "#141820";
  const surface = "#0E1218";
  const line = "#303640";
  const text = "#F7F4ED";
  const muted = "#A8ADB7";

  context.textBaseline = "alphabetic";
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = panel;
  roundedRect(context, 28, 28, 1024, 1024, 34);
  context.fill();

  context.strokeStyle = "#262C35";
  context.lineWidth = 2;
  roundedRect(context, 28, 28, 1024, 1024, 34);
  context.stroke();

  context.fillStyle = gold;
  roundedRect(context, 64, 64, 8, 86, 4);
  context.fill();

  context.fillStyle = gold;
  context.font = '800 20px Arial, Helvetica, sans-serif';
  context.fillText("CANDINHO SUPLEMENTOS", 92, 86);

  context.fillStyle = muted;
  context.font = '700 17px Arial, Helvetica, sans-serif';
  context.fillText("INFORMAÇÃO NUTRICIONAL · IMAGEM 2", 92, 124);

  const title = normalize(
    research.confirmed_product_name || productName || "Produto",
  );

  context.fillStyle = text;
  context.font = '800 40px Arial, Helvetica, sans-serif';
  const titleLines = wrapLines(context, title, 880, 2);
  drawLines(context, titleLines, 64, 198, 46);

  const brand = normalize(research.confirmed_brand);

  if (brand) {
    context.fillStyle = muted;
    context.font = '600 20px Arial, Helvetica, sans-serif';
    context.fillText(fitText(context, brand, 900), 64, 286);
  }

  const facts = (Array.isArray(research.nutrition_facts)
    ? research.nutrition_facts
    : []
  )
    .map((fact) => ({
      label: normalize(fact.label),
      amount: normalize(fact.amount),
      daily_value: normalize(fact.daily_value),
    }))
    .filter((fact) => fact.label || fact.amount)
    .slice(0, 8);

  const tableTop = 320;
  const headerHeight = 46;
  const rowHeight = 39;
  const tableHeight = headerHeight + Math.max(1, facts.length) * rowHeight;
  const tableBottom = tableTop + tableHeight;

  context.fillStyle = surface;
  roundedRect(context, 64, tableTop, 952, tableHeight, 16);
  context.fill();

  context.strokeStyle = line;
  context.lineWidth = 2;
  roundedRect(context, 64, tableTop, 952, tableHeight, 16);
  context.stroke();

  context.fillStyle = muted;
  context.font = '800 16px Arial, Helvetica, sans-serif';
  context.textAlign = "left";
  context.fillText("NUTRIENTE / ATIVO", 82, tableTop + 30);

  context.textAlign = "right";
  context.fillText("QUANTIDADE", 780, tableTop + 30);
  context.fillText("%VD", 998, tableTop + 30);

  if (facts.length === 0) {
    context.textAlign = "left";
    context.fillStyle = muted;
    context.font = '600 17px Arial, Helvetica, sans-serif';
    context.fillText(
      "Nenhum nutriente/ativo estruturado foi encontrado na pesquisa.",
      82,
      tableTop + 76,
    );
  } else {
    facts.forEach((fact, index) => {
      const y = tableTop + headerHeight + index * rowHeight;

      context.strokeStyle = line;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(64, y);
      context.lineTo(1016, y);
      context.stroke();

      context.font = '600 18px Arial, Helvetica, sans-serif';
      context.fillStyle = text;
      context.textAlign = "left";
      context.fillText(
        fitText(context, fact.label, 500),
        82,
        y + 27,
      );

      context.textAlign = "right";
      context.fillText(
        fitText(context, fact.amount, 185),
        780,
        y + 27,
      );

      context.font = '700 17px Arial, Helvetica, sans-serif';
      context.fillStyle = gold;
      context.fillText(
        fitText(context, fact.daily_value, 185),
        998,
        y + 27,
      );
    });
  }

  context.textAlign = "left";

  const portionY = tableBottom + 48;

  context.fillStyle = gold;
  context.font = '800 16px Arial, Helvetica, sans-serif';
  context.fillText("PORÇÃO", 64, portionY);

  context.fillStyle = text;
  context.font = '600 19px Arial, Helvetica, sans-serif';

  const serving = [
    normalize(research.serving_size),
    normalize(research.servings_per_container),
  ]
    .filter(Boolean)
    .join(" · ");

  context.fillText(
    fitText(context, serving || "Não informada", 940),
    64,
    portionY + 27,
  );

  const ingredientsHeadingY = portionY + 72;

  context.fillStyle = gold;
  context.font = '800 16px Arial, Helvetica, sans-serif';
  context.fillText("INGREDIENTES", 64, ingredientsHeadingY);

  context.fillStyle = "#D7DAE0";
  context.font = '500 16px Arial, Helvetica, sans-serif';

  const ingredientLines = wrapLines(
    context,
    normalize(research.ingredients) ||
      "Não informado na fonte consultada.",
    940,
    2,
  );

  drawLines(
    context,
    ingredientLines,
    64,
    ingredientsHeadingY + 28,
    22,
  );

  const allergensHeadingY = ingredientsHeadingY + 94;

  context.fillStyle = gold;
  context.font = '800 16px Arial, Helvetica, sans-serif';
  context.fillText(
    "ALERGÊNICOS / OBSERVAÇÕES DE RÓTULO",
    64,
    allergensHeadingY,
  );

  context.fillStyle = "#D7DAE0";
  context.font = '500 16px Arial, Helvetica, sans-serif';

  const allergenLines = wrapLines(
    context,
    normalize(research.allergens) ||
      "Não informado na fonte consultada.",
    940,
    2,
  );

  drawLines(
    context,
    allergenLines,
    64,
    allergensHeadingY + 28,
    22,
  );

  context.strokeStyle = line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(64, 972);
  context.lineTo(1016, 972);
  context.stroke();

  const source = normalize(research.source_name) || "Fonte oficial";
  const host = sourceHost(normalize(research.source_url));
  const sourceLine = host ? `${source} · ${host}` : source;

  context.fillStyle = muted;
  context.font = '700 14px Arial, Helvetica, sans-serif';
  context.fillText(
    fitText(context, `Fonte consultada: ${sourceLine}`, 940),
    64,
    1005,
  );

  context.fillStyle = "#747B87";
  context.font = '500 13px Arial, Helvetica, sans-serif';
  context.fillText(
    "Conteúdo para consulta do catálogo. Confira sempre o rótulo físico do produto.",
    64,
    1032,
  );

  return canvas;
}

export async function renderNutritionCardToBlobs(
  productName: string,
  research: NutritionCardResearch,
): Promise<RenderResult> {
  const canvas = buildCanvas(productName, research);

  const full = await blobFromCanvas(canvas, "image/png");

  const thumbnailCanvas = document.createElement("canvas");
  thumbnailCanvas.width = 360;
  thumbnailCanvas.height = 360;

  const thumbnailContext = thumbnailCanvas.getContext("2d");

  if (!thumbnailContext) {
    throw new Error("Não foi possível criar a miniatura da Imagem 2.");
  }

  thumbnailContext.imageSmoothingEnabled = true;
  thumbnailContext.imageSmoothingQuality = "high";
  thumbnailContext.drawImage(canvas, 0, 0, 360, 360);

  const thumbnail = await blobFromCanvas(
    thumbnailCanvas,
    "image/webp",
    0.82,
  );

  return {
    full,
    thumbnail,
  };
}
