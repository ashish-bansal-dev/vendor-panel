import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Divider, Heading, Input, Switch, toast } from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { useEffect, useState, useMemo } from "react"
import QRCode from "qrcode"

import { HttpTypes } from "@medusajs/types"
import { Form } from "../../../../../components/common/form"
import { Combobox } from "../../../../../components/inputs/combobox"
import { CountrySelect } from "../../../../../components/inputs/country-select"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateProductVariant } from "../../../../../hooks/api/products"
import {
  transformNullableFormData,
  transformNullableFormNumber,
} from "../../../../../lib/form-helpers"
import { optionalInt } from "../../../../../lib/validation"
import { fetchQuery } from "../../../../../lib/client"

type ProductEditVariantFormProps = {
  product: HttpTypes.AdminProduct
  variant?: HttpTypes.AdminProductVariant
}

const ProductEditVariantSchema = z.object({
  title: z.string().min(1),
  material: z.string().optional(),
  sku: z.string().optional(),
  ean: z.string().optional(),
  upc: z.string().optional(),
  barcode: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  manage_inventory: z.boolean(),
  allow_backorder: z.boolean(),
  weight: optionalInt,
  height: optionalInt,
  width: optionalInt,
  length: optionalInt,
  mid_code: z.string().optional(),
  hs_code: z.string().optional(),
  origin_country: z.string().optional(),
  options: z.record(z.string()),
})

// TODO: Either pass option ID or make the backend handle options constraints differently to handle the lack of IDs
export const ProductEditVariantForm = ({
  variant,
  product,
}: ProductEditVariantFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const defaultOptions = product.options?.reduce((acc: any, option: any) => {
    const varOpt = variant?.options?.find((o: any) => o.option_id === option.id)
    acc[option.title] = varOpt?.value
    return acc
  }, {})

  const form = useForm<z.infer<typeof ProductEditVariantSchema>>({
    defaultValues: {
      title: variant?.title || "",
      material: variant?.material || "",
      sku: variant?.sku || undefined,
      ean: variant?.ean || "",
      upc: variant?.upc || "",
      barcode: variant?.barcode || "",
      metadata: variant?.metadata || {},
      manage_inventory: true,
      allow_backorder: true,
      weight: variant?.weight || "",
      height: variant?.height || "",
      width: variant?.width || "",
      length: variant?.length || "",
      mid_code: variant?.mid_code || "",
      hs_code: variant?.hs_code || "",
      origin_country: variant?.origin_country || "",
      options: defaultOptions,
    },
    resolver: zodResolver(ProductEditVariantSchema),
  })

  const { mutateAsync, isPending } = useUpdateProductVariant(
    variant?.product_id!,
    variant?.id!
  )

  // Fetch seller handle
  const [sellerHandle, setSellerHandle] = useState<string>("")
  useEffect(() => {
    fetchQuery("/vendor/sellers/me", { method: "GET" })
      .then((res: any) => {
        if (res?.seller?.handle) setSellerHandle(res.seller.handle)
      })
      .catch(() => {})
  }, [])

  // Compute barcode based on seller, product title, and options (dot separators)
  const computedBarcode = useMemo(() => {
    if (!sellerHandle || !variant) return ""
    const sellerKey = sellerHandle.replace(/-/g, '.')
    const base = `${sellerKey}.${product.title}`
    let code = base
    if (variant.inventory_items && variant.inventory_items.length > 1) {
      code = `${base}.bundle`
    } else {
      const opts = variant.options || {}
      const keys = Object.keys(opts)
      const colorKey = keys.find((k) => /color/i.test(k)) || keys[0] || ''
      const sizeKey = keys.find((k) => /size/i.test(k))
      const color = opts[colorKey] as string || ''
      code = `${base}.${color}`
      if (sizeKey) {
        const size = (opts[sizeKey] as string) || ''
        if (size) code = `${code}.${size}`
      }
    }
    return code
  }, [sellerHandle, product.title, variant])

  // Watch barcode field and generate QR code image
  const barcodeVal = useWatch({ control: form.control, name: "barcode", defaultValue: variant?.barcode || "" })
  const [barcodeImage, setBarcodeImage] = useState<string>("")
  useEffect(() => {
    if (!barcodeVal) return
    QRCode.toDataURL(barcodeVal, { errorCorrectionLevel: 'H' })
      .then((url) => {
        setBarcodeImage(url)
        // Store QR code in metadata
        const metadata = form.getValues('metadata') || {}
        metadata.qr_code = url
        form.setValue('metadata', metadata)
      })
      .catch(() => {})
  }, [barcodeVal])

  // Pre-fill barcode if empty
  useEffect(() => {
    if (!barcodeVal && computedBarcode) {
      form.setValue('barcode', computedBarcode)
    }
  }, [barcodeVal, computedBarcode, form])

  // Watch manage_inventory to enable inventory_kit toggle
  const manageInventoryEnabled = useWatch({ control: form.control, name: 'manage_inventory', defaultValue: true })

  const handleSubmit = form.handleSubmit(async (data) => {
    const {
      title,
      weight,
      height,
      width,
      length,
      allow_backorder,
      manage_inventory,
      options,
      ...optional
    } = data

    const nullableData = transformNullableFormData(optional)

    await mutateAsync(
      {
        id: variant?.id!,
        weight: transformNullableFormNumber(weight),
        height: transformNullableFormNumber(height),
        width: transformNullableFormNumber(width),
        length: transformNullableFormNumber(length),
        title,
        allow_backorder,
        manage_inventory,
        options,
        ...nullableData,
      },
      {
        onSuccess: () => {
          handleSuccess("../")
          toast.success(t("products.variant.edit.success"))
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex size-full flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex size-full flex-col gap-y-8 overflow-auto">
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="title"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.title")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="manage_inventory"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <div className="bg-ui-bg-component shadow-elevation-card-rest flex gap-x-3 rounded-lg p-4">
                    <Form.Control>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => onChange(!!checked)}
                        {...field}
                      />
                    </Form.Control>
                    <div className="flex flex-col">
                      <Form.Label>{t("fields.manageInventory")}</Form.Label>
                      <Form.Hint>{t("products.variant.inventory.manageInventoryHint")}</Form.Hint>
                    </div>
                  </div>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="inventory_kit"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <div className="bg-ui-bg-component shadow-elevation-card-rest flex gap-x-3 rounded-lg p-4">
                    <Form.Control>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => onChange(!!checked)}
                        {...field}
                        disabled={!manageInventoryEnabled}
                      />
                    </Form.Control>
                    <div className="flex flex-col">
                      <Form.Label>{t("products.variant.inventory.inventoryKit")}</Form.Label>
                      <Form.Hint>{t("products.variant.inventory.inventoryKitHint")}</Form.Hint>
                    </div>
                  </div>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="material"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.material")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            {product.options?.map((option: any) => {
              return (
                <Form.Field
                  key={option.id}
                  control={form.control}
                  name={`options.${option.title}`}
                  render={({ field: { value, onChange, ...field } }) => {
                    return (
                      <Form.Item>
                        <Form.Label>{option.title}</Form.Label>
                        <Form.Control>
                          <Combobox
                            value={value}
                            onChange={(v) => {
                              onChange(v)
                            }}
                            {...field}
                            options={option.values.map((v: any) => ({
                              label: v.value,
                              value: v.value,
                            }))}
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
              )
            })}
          </div>
          <Divider />
          <div className="flex flex-col gap-y-8">
            <div className="flex flex-col gap-y-4">
              <Heading level="h2">
                {t("products.variant.inventory.header")}
              </Heading>
              <Form.Field
                control={form.control}
                name="sku"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>{t("fields.sku")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="ean"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>{t("fields.ean")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="upc"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>{t("fields.upc")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="barcode"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>{t("fields.barcode")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                      {barcodeImage && <div className="mt-2"><img src={barcodeImage} alt="barcode" style={{ height: 40 }} /></div>}
                    </Form.Item>
                  )
                }}
              />
            </div>
          </div>
          <Divider />
          <div className="flex flex-col gap-y-4">
            <Heading level="h2">{t("products.attributes")}</Heading>
            <Form.Field
              control={form.control}
              name="weight"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.weight")}</Form.Label>
                    <Form.Control>
                      <Input type="number" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="width"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.width")}</Form.Label>
                    <Form.Control>
                      <Input type="number" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="length"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.length")}</Form.Label>
                    <Form.Control>
                      <Input type="number" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="height"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.height")}</Form.Label>
                    <Form.Control>
                      <Input type="number" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="mid_code"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.midCode")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="hs_code"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.hsCode")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="origin_country"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>
                      {t("fields.countryOfOrigin")}
                    </Form.Label>
                    <Form.Control>
                      <CountrySelect {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button type="submit" size="small" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
