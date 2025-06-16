import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { DataGrid, createDataGridHelper } from "../../../components/data-grid"
import { useRouteModal } from "../../../components/modals/index"
import { usePricePreferences } from "../../../hooks/api/price-preferences"
import { useRegions } from "../../../hooks/api/regions.tsx"
import { useStore } from "../../../hooks/api/store"
import { ProductCreateSchemaType } from "../product-create/types"

type VariantPricingFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const VariantPricingForm = ({ form }: VariantPricingFormProps) => {
  const { store } = useStore()
  const { regions } = useRegions({ limit: 9999 })
  const { price_preferences: pricePreferences } = usePricePreferences({})

  const { setCloseOnEscape } = useRouteModal()

  const columns = useVariantPriceGridColumns({
    currencies: store?.supported_currencies,
    regions,
    pricePreferences,
  })

  const variants = useWatch({
    control: form.control,
    name: "variants",
  }) as any

  return (
    <DataGrid
      columns={columns}
      data={variants}
      state={form}
      onEditingChange={(editing) => setCloseOnEscape(!editing)}
    />
  )
}

const columnHelper = createDataGridHelper<
  HttpTypes.AdminProductVariant,
  ProductCreateSchemaType
>()

const useVariantPriceGridColumns = ({
  currencies = [],
  regions = [],
  pricePreferences = [],
  sellerType = "manufacturer",
}: {
  currencies?: HttpTypes.AdminStore["supported_currencies"]
  regions?: HttpTypes.AdminRegion[]
  pricePreferences?: HttpTypes.AdminPricePreference[]
  sellerType?: "manufacturer" | "reseller"
}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    return [
      columnHelper.column({
        id: "title",
        header: t("fields.title"),
        cell: (context) => {
          const entity = context.row.original
          return (
            <DataGrid.ReadonlyCell context={context}>
              <div className="flex h-full w-full items-center gap-x-2 overflow-hidden">
                <span className="truncate">{entity.title}</span>
              </div>
            </DataGrid.ReadonlyCell>
          )
        },
        disableHiding: true,
      }),
      columnHelper.column({
        id: "admin_price",
        header: "Admin price (INR)",
        field: (ctx) => `variants.${ctx.row.index}.vendor_prices.admin` as any,
        type: "number",
        cell: (ctx) => <DataGrid.TextCell context={ctx} />,
      }),
      ...(sellerType === "manufacturer"
        ? [
            columnHelper.column({
              id: "reseller_price",
              header: "Reseller price (INR)",
              field: (ctx) =>
                `variants.${ctx.row.index}.vendor_prices.reseller` as any,
              type: "number",
              cell: (ctx) => <DataGrid.TextCell context={ctx} />,
            }),
          ]
        : []),
      columnHelper.column({
        id: "customer_price",
        header: "Customer price (INR)",
        field: (ctx) =>
          `variants.${ctx.row.index}.vendor_prices.customer` as any,
        type: "number",
        cell: (ctx) => <DataGrid.TextCell context={ctx} />,
      }),
    ]
  }, [t, currencies, regions, pricePreferences, sellerType])
}
