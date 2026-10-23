/** Parse input only; each Bank action retains its own blank/sign/zero rules. */
export function parseBankMoneyInput(value: string): number {
  const raw = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (/^[+-]?\d+\.\d{3}$/.test(raw)) {
    throw new Error("Valor ambíguo. Para milhar, informe 1234,00 ou 1.234,00.");
  }
  const brazilian = /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/;
  const decimal = /^[+-]?(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/;
  if (!(raw.includes(",") ? brazilian : decimal).test(raw)) {
    throw new Error("Formato monetário inválido. Use, por exemplo, 1234,56.");
  }
  const parsed = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  if (!Number.isSafeInteger(Math.round(parsed * 100))) throw new Error("Valor monetário fora do limite seguro.");
  return parsed;
}
