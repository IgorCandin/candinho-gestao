"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function setNativeSelectValue(
  select: HTMLSelectElement,
  value: string,
) {
  const descriptor =
    Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    );

  descriptor?.set?.call(select, value);

  select.dispatchEvent(
    new Event("input", { bubbles: true }),
  );
  select.dispatchEvent(
    new Event("change", { bubbles: true }),
  );
}

function titleOf(panel: HTMLElement) {
  return (
    panel.querySelector<HTMLElement>(".panel-head h2")
      ?.textContent?.trim() ?? ""
  );
}

function enhancePayment(panel: HTMLElement) {
  const labels = Array.from(
    panel.querySelectorAll<HTMLElement>("label.field"),
  );

  const modeField = labels.find(
    (label) =>
      label
        .querySelector<HTMLElement>("span")
        ?.textContent?.trim() === "Situação",
  );

  const select =
    modeField?.querySelector<HTMLSelectElement>(
      "select",
    );

  if (!modeField || !select) return;

  modeField.classList.add(
    "v4515-fitness-payment-native",
  );

  let control =
    panel.querySelector<HTMLElement>(
      ".v4515-fitness-payment-choice",
    );

  if (!control) {
    control = document.createElement("div");
    control.className =
      "v4515-fitness-payment-choice";

    const options = [
      {
        value: "receivable",
        title: "A receber",
        text: "Sem data combinada.",
      },
      {
        value: "paid",
        title: "Pago",
        text: "Registrar recebimento agora.",
      },
      {
        value: "combined",
        title: "Pagamento combinado",
        text: "Cobrança com data acordada.",
      },
    ];

    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.paymentMode = option.value;
      button.innerHTML = `
        <strong>${option.title}</strong>
        <small>${option.text}</small>
      `;

      button.addEventListener("click", () => {
        setNativeSelectValue(select, option.value);
      });

      control.append(button);
    }

    modeField.insertAdjacentElement(
      "afterend",
      control,
    );
  }

  function sync() {
    control
      ?.querySelectorAll<HTMLButtonElement>(
        "button[data-payment-mode]",
      )
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.paymentMode ===
            select.value,
        );
      });
  }

  if (select.dataset.v4515PaymentBound !== "1") {
    select.dataset.v4515PaymentBound = "1";
    select.addEventListener("change", sync);
  }

  sync();
}

export function FitnessSaleStreamlinedUX() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/fitness/vendas/nova") {
      return;
    }

    document.body.classList.add(
      "v4515-fitness-sale",
    );

    let frame = 0;

    function apply() {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const form =
          document.querySelector<HTMLElement>(
            "form.new-sale-layout",
          );

        form?.classList.add(
          "v4515-fitness-sale-form",
        );

        const panels = Array.from(
          document.querySelectorAll<HTMLElement>(
            "form.new-sale-layout article.panel",
          ),
        );

        const customerPanel = panels.find(
          (panel) => titleOf(panel) === "Cliente",
        );

        if (customerPanel) {
          customerPanel.classList.add(
            "v4515-fitness-customer-panel",
          );

          const picker =
            customerPanel.querySelector<HTMLElement>(
              ".fitness-customer-combobox-v4515",
            );

          customerPanel.classList.toggle(
            "v4515-has-existing-customer",
            picker?.dataset.selected === "true",
          );

          for (const label of customerPanel.querySelectorAll<HTMLElement>(
            "label.field",
          )) {
            const labelText =
              label
                .querySelector<HTMLElement>("span")
                ?.textContent?.trim() ?? "";

            if (
              [
                "Nome",
                "Telefone",
                "Instagram",
                "Cidade",
                "Origem",
              ].includes(labelText)
            ) {
              label.classList.add(
                "v4515-fitness-customer-extra",
              );
            }

            if (labelText === "Data da venda") {
              label.classList.add(
                "v4515-fitness-sale-date",
              );
            }
          }
        }

        const itemsPanel = panels.find(
          (panel) => titleOf(panel) === "Itens",
        );

        if (itemsPanel) {
          const title =
            itemsPanel.querySelector<HTMLElement>(
              ".panel-head h2",
            );
          const description =
            itemsPanel.querySelector<HTMLElement>(
              ".panel-head p",
            );

          if (title) title.textContent = "Produtos";
          if (description) {
            description.textContent =
              "Selecione a peça, tamanho, cor, quantidade e valor.";
          }

          const add =
            itemsPanel.querySelector<HTMLButtonElement>(
              ".panel-head button",
            );

          if (
            add &&
            !/produto/i.test(add.textContent ?? "")
          ) {
            const icon = add.querySelector("svg");
            add.textContent = "";
            if (icon) add.append(icon);
            add.append(
              document.createTextNode(
                " Adicionar produto",
              ),
            );
          }
        }

        const paymentPanel = panels.find(
          (panel) =>
            titleOf(panel) === "Pagamento",
        );

        if (paymentPanel) {
          paymentPanel.classList.add(
            "v4515-fitness-payment-panel",
          );
          enhancePayment(paymentPanel);
        }
      });
    }

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "data-selected",
        "value",
      ],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      document.body.classList.remove(
        "v4515-fitness-sale",
      );
    };
  }, [pathname]);

  return null;
}
