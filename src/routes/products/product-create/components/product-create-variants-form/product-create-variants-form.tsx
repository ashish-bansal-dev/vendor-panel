import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  createDataGridHelper,
  DataGrid,
} from "../../../../../components/data-grid"
import { useRouteModal } from "../../../../../components/modals"
import {
  ProductCreateOptionSchema,
  ProductCreateVariantSchema,
} from "../../constants"
import { ProductCreateSchemaType } from "../../types"

type ProductCreateVariantsFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  regions?: HttpTypes.AdminRegion[]
  store?: HttpTypes.AdminStore
  pricePreferences?: HttpTypes.AdminPricePreference[]
  sellerType?: "manufacturer" | "reseller"
}

export const ProductCreateVariantsForm = ({
  form,
  regions,
  store,
  pricePreferences,
  sellerType = "manufacturer",
}: ProductCreateVariantsFormProps) => {
  const { setCloseOnEscape } = useRouteModal()

  const currencyCodes = useMemo(
    () => store?.supported_currencies?.map((c) => c.currency_code) || [],
    [store]
  )

  const variants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  const options = useWatch({
    control: form.control,
    name: "options",
    defaultValue: [],
  })

  /**
   * NOTE: anything that goes to the datagrid component needs to be memoised otherwise DataGrid will rerender and inputs will loose focus
   */
  const columns = useColumns({
    options,
    sellerType,
  })

  const variantData = useMemo(() => {
    const ret: any[] = []

    variants.forEach((v, i) => {
      if (v.should_create) {
        ret.push({ ...v, originalIndex: i })
      }
    })

    return ret
  }, [variants])

  return (
    <div className="flex size-full flex-col divide-y overflow-hidden">
      <DataGrid
        columns={columns}
        data={variantData}
        state={form}
        onEditingChange={(editing) => setCloseOnEscape(!editing)}
      />
    </div>
  )
}

type VariantRow = ProductCreateVariantSchema & { originalIndex: number }
const columnHelper = createDataGridHelper<VariantRow, ProductCreateSchemaType>()

const useColumns = ({
  options,
  sellerType,
}: {
  options: ProductCreateOptionSchema[]
  sellerType: "manufacturer" | "reseller"
}) => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.column({
        id: "options",
        header: () => (
          <div className="flex size-full items-center overflow-hidden">
            <span className="truncate">
              {options.map((o) => o.title).join(" / ")}
            </span>
          </div>
        ),
        cell: (context) => {
          return (
            <DataGrid.ReadonlyCell context={context}>
              {options
                .map((o) => context.row.original.options[o.title])
                .join(" / ")}
            </DataGrid.ReadonlyCell>
          )
        },
        disableHiding: true,
      }),
      columnHelper.column({
        id: "title",
        name: t("fields.title"),
        header: t("fields.title"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.title`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),
      columnHelper.column({
        id: "sku",
        name: t("fields.sku"),
        header: t("fields.sku"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.sku`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),

      // Actor-specific price columns (all INR)
      columnHelper.column({
        id: "admin_price",
        header: t("Admin price (INR)"),
        field: (ctx) =>
          `variants.${ctx.row.original.originalIndex}.vendor_prices.admin`,
        type: "number",
        cell: (ctx) => <DataGrid.TextCell context={ctx} />,
      }),

      ...(sellerType === "manufacturer"
        ? [
            columnHelper.column({
              id: "reseller_price",
              header: t("Reseller price (INR)"),
              field: (ctx) =>
                `variants.${ctx.row.original.originalIndex}.vendor_prices.reseller`,
              type: "number",
              cell: (ctx) => <DataGrid.TextCell context={ctx} />,
            }),
          ]
        : []),

      columnHelper.column({
        id: "customer_price",
        header: t("Customer price (INR)"),
        field: (ctx) =>
          `variants.${ctx.row.original.originalIndex}.vendor_prices.customer`,
        type: "number",
        cell: (ctx) => <DataGrid.TextCell context={ctx} />,
      }),
    ],
    [options, t, sellerType]
  )
}
