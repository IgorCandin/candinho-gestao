/** User-supplied marks; secondary brand colors used as restrained dark tints. */
export function bankCardBrand(institution: string) {
  const name = institution.toLocaleLowerCase("pt-BR");
  if (name.includes("sicoob")) return { logo: "/bank-sicoob-user.png", color: "#a5c71b", background: "#07373d" };
  if (name.includes("nubank")) return { logo: "/bank-nubank-user.png", color: "#c58bec", background: "#38124e" };
  if (name.includes("brasil")) return { logo: "/bank-bb-user.png", color: "#ffeb3b", background: "#082d66" };
  if (name.includes("brb")) return { logo: "/bank-brb-user.png", color: "#1eacd8", background: "#071e43" };
  if (name.includes("caixa")) return { logo: "/bank-caixa-user.png", color: "#ff8422", background: "#083882" };
  if (name.includes("mercado pago")) return { logo: "/bank-mercadopago-user.png", color: "#ffe600", background: "#063b66" };
  if (name.includes("neon")) return { logo: "/bank-neon-user.png", color: "#00dfd3", background: "#064458" };
  if (name.includes("shopee")) return { logo: null, color: "#ff925e", background: "#49251d" };
  return { logo: null, color: "#64c7cf", background: "#152a35" };
}
