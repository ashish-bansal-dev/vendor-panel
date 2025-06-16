import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { RouteFocusModal, useRouteModal } from "../../../components/modals"
import { KeyboundForm } from "../../../components/utilities/keybound-form"
import { useUpdateProductVariantsBatch } from "../../../hooks/api/products"
import { castNumber } from "../../../lib/cast-number"
import { fetchQuery } from "../../../lib/client"
import { VariantPricingForm } from "../common/variant-pricing-form"
import { useUpsertVendorPricesBatch } from "../../../hooks/api/vendor-variant-prices"

export const UpdateVariantPricesSchema = zod.object({
  variants: zod.array(
    zod.object({
      prices: zod
        .record(zod.string(), zod.string().or(zod.number()).optional())
        .optional(),
      vendor_prices: zod
        .record(zod.string(), zod.string().or(zod.number()).optional())
        .optional(),
    })
  ),
})

export type UpdateVariantPricesSchemaType = zod.infer<
  typeof UpdateVariantPricesSchema
>

export const PricingEdit = ({
  product,
  variantId,
}: {
  product: HttpTypes.AdminProduct
  variantId?: string
}) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const upsertVendorPricesBatch = useUpsertVendorPricesBatch()

  const variants =
    (variantId
      ? product.variants?.filter((v) => v.id === variantId)
      : product.variants) || []

  const form = useForm<UpdateVariantPricesSchemaType>({
    defaultValues: {
      variants: variants?.map((variant: any) => ({
        title: variant.title,
        prices: variant.prices.reduce((acc: any, price: any) => {
          if (price.rules?.region_id) {
            acc[price.rules.region_id] = price.amount
          } else {
            acc[price.currency_code] = price.amount
          }
          return acc
        }, {}),
        vendor_prices: {},
      })) as any,
    },

    resolver: zodResolver(UpdateVariantPricesSchema, {}),
  })

  // Pre-fill vendor actor prices
  useEffect(() => {
    async function loadVendorPrices() {
      const updated = [...(variants || [])].map(() => ({
        admin: "",
        reseller: "",
        customer: "",
      }))

      try {
        const { prices } = await fetchQuery(`/vendor/variants/prices`, {
          method: "GET",
          query: { variant_ids: variants.map((v) => v.id).join(",") },
        })

        prices.forEach((p: any) => {
          const idx = variants.findIndex((v) => v.id === p.variant_id)
          if (idx === -1) return
          if (p.buyer_type === "admin") updated[idx].admin = p.price
          if (p.buyer_type === "reseller") updated[idx].reseller = p.price
          if (p.buyer_type === "customer") updated[idx].customer = p.price
        })
      } catch {}

      updated.forEach((vals, idx) => {
        form.setValue(
          `variants.${idx}.vendor_prices.admin` as any,
          vals.admin as any
        )
        form.setValue(
          `variants.${idx}.vendor_prices.reseller` as any,
          vals.reseller as any
        )
        form.setValue(
          `variants.${idx}.vendor_prices.customer` as any,
          vals.customer as any
        )
      })
    }

    loadVendorPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = form.handleSubmit(async (values) => {
    // Build vendor price payload map separate from core update
    const vendorPriceUpdates = values.variants.map((variant, ind) => ({
      id: variants[ind].id,
      vendor_prices: Object.entries((variant as any).vendor_prices || {})
        .filter(([, v]) => v !== "" && v !== undefined && v !== null)
        .map(([buyer_type, price]) => ({
          buyer_type,
          price: castNumber(price as any),
        })),
    }))

    await upsertVendorPricesBatch.mutateAsync({
      prices: vendorPriceUpdates.flatMap((vp) =>
        vp.vendor_prices.map((p) => ({ ...p, variant_id: vp.id }))
      ),
    })
    handleSuccess("..")
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex size-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-col overflow-hidden">
          <VariantPricingForm form={form as any} />
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex w-full items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              type="submit"
              variant="primary"
              size="small"
              isLoading={upsertVendorPricesBatch.isPending}
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
