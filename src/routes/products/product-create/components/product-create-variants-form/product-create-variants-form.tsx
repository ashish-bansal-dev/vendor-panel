import { HttpTypes } from "@medusajs/types"
import { useMemo, useState, useCallback, useEffect } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, IconButton, toast, Drawer } from "@medusajs/ui"
import { XMark } from "@medusajs/icons"

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
import {
  FileUpload,
  FileType,
} from "../../../../../components/common/file-upload"
import { uploadFilesQuery } from "../../../../../lib/client"

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

type ProductCreateVariantsFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  regions?: HttpTypes.AdminRegion[]
  store?: HttpTypes.AdminStore
  pricePreferences?: HttpTypes.AdminPricePreference[]
}

type VariantImages = {
  [key: number]: string[]
}

type VariantMetadata = {
  cost_price: string
  mrp?: string
  images?: string
}

const CustomRightDrawer = ({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) => {
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscapeKey)
    }
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [open, handleEscapeKey])

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Content className="!left-auto !right-0">
        {children}
      </Drawer.Content>
    </Drawer>
  )
}

export const ProductCreateVariantsForm = ({
  form,
  regions,
  store,
  pricePreferences,
}: ProductCreateVariantsFormProps) => {
  const { setCloseOnEscape } = useRouteModal()
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<
    number | null
  >(null)
  const [variantImages, setVariantImages] = useState<VariantImages>({})
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [originalImages, setOriginalImages] = useState<VariantImages>({})

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

  const saveVariantImages = useCallback(
    (variantIndex: number, images: string[]) => {
      const currentVariants = form.getValues("variants")
      const updatedVariants = [...currentVariants]
      const currentVariant = updatedVariants[variantIndex]

      // Ensure metadata exists
      if (!currentVariant.metadata) {
        currentVariant.metadata = {}
      }

      // Cast to the correct type
      const currentMetadata =
        currentVariant.metadata as Partial<VariantMetadata>

      // Create new metadata object with images
      const metadata = {
        ...currentMetadata,
        cost_price: currentMetadata.cost_price || "",
        mrp: currentMetadata.mrp || "",
        images: images.join(","),
      } as Record<string, string>

      // Update the variant with new metadata
      updatedVariants[variantIndex] = {
        ...currentVariant,
        metadata,
      }

      // Save to form state
      form.setValue("variants", updatedVariants)

      // Log for debugging
      console.log("Saved variant images:", {
        variantIndex,
        images,
        metadata,
        updatedVariant: updatedVariants[variantIndex],
      })

      setUnsavedChanges(false)
    },
    [form]
  )

  const handleSaveImages = useCallback(() => {
    if (selectedVariantIndex !== null) {
      saveVariantImages(
        selectedVariantIndex,
        variantImages[selectedVariantIndex] || []
      )
      toast.success("Images saved successfully")
      setSelectedVariantIndex(null)
    }
  }, [selectedVariantIndex, saveVariantImages])

  const handleCancelChanges = useCallback(() => {
    if (selectedVariantIndex !== null && originalImages[selectedVariantIndex]) {
      setVariantImages((prev) => ({
        ...prev,
        [selectedVariantIndex]: [...originalImages[selectedVariantIndex]],
      }))
    }
    setSelectedVariantIndex(null)
    toast.info("Changes discarded")
  }, [selectedVariantIndex, originalImages])

  const openImageDrawer = useCallback(
    (index: number) => {
      const currentVariants = form.getValues("variants")
      const currentVariant = currentVariants[index]

      // Ensure metadata exists
      const currentMetadata = (currentVariant.metadata ||
        {}) as Partial<VariantMetadata>

      // Get current images from metadata
      let currentImages: string[] = []
      if (currentMetadata.images) {
        currentImages = currentMetadata.images
          .split(",")
          .filter((img) => img.trim() !== "")
      }

      console.log("Opening image drawer:", {
        index,
        currentMetadata,
        currentImages,
      })

      // Store original images for potential restore on cancel
      setOriginalImages((prev) => ({
        ...prev,
        [index]: [...currentImages],
      }))

      // Set current images for editing
      setVariantImages((prev) => ({
        ...prev,
        [index]: [...currentImages],
      }))

      setSelectedVariantIndex(index)
      setUnsavedChanges(false)
    },
    [form]
  )

  /**
   * NOTE: anything that goes to the datagrid component needs to be memoised otherwise DataGrid will rerender and inputs will loose focus
   */
  const columns = useColumns({
    options,
    currencies: currencyCodes,
    regions,
    pricePreferences,
    form,
    variantImages,
    setVariantImages,
    openImageDrawer,
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
      {selectedVariantIndex !== null && (
        <CustomRightDrawer open={true} onClose={handleCancelChanges}>
          <Drawer.Header>
            <Drawer.Title>Variant Images</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <div className="flex flex-col gap-y-4">
              <div className="grid grid-cols-4 gap-4">
                {variantImages[selectedVariantIndex]?.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Variant image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <IconButton
                      variant="transparent"
                      size="small"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const newImages = [
                          ...variantImages[selectedVariantIndex],
                        ]
                        newImages.splice(index, 1)
                        setVariantImages({
                          ...variantImages,
                          [selectedVariantIndex]: newImages,
                        })
                        setUnsavedChanges(true)
                      }}
                    >
                      <XMark />
                    </IconButton>
                  </div>
                ))}
              </div>
              <FileUpload
                label="Upload More Images"
                hint="Drag and drop images here or click to upload"
                multiple={true}
                formats={SUPPORTED_FORMATS}
                onUploaded={async (files) => {
                  try {
                    const { files: uploadedFiles } =
                      await uploadFilesQuery(files)
                    if (uploadedFiles?.length) {
                      const newImages = [
                        ...(variantImages[selectedVariantIndex] || []),
                        ...uploadedFiles.map((f: HttpTypes.AdminFile) => f.url),
                      ]
                      setVariantImages({
                        ...variantImages,
                        [selectedVariantIndex]: newImages,
                      })
                      setUnsavedChanges(true)
                      toast.success("Images uploaded successfully")
                    }
                  } catch (error) {
                    console.error("Failed to upload images:", error)
                    toast.error("Failed to upload images")
                  }
                }}
              />
              <div className="flex justify-end gap-x-2 mt-4">
                <Button variant="secondary" onClick={handleCancelChanges}>
                  Cancel
                </Button>
                <Button onClick={handleSaveImages}>Save Images</Button>
              </div>
            </div>
          </Drawer.Body>
        </CustomRightDrawer>
      )}
    </div>
  )
}

const columnHelper = createDataGridHelper<
  ProductCreateVariantSchema & { originalIndex: number },
  ProductCreateSchemaType
>()

const useColumns = ({
  options,
  currencies = [],
  regions = [],
  pricePreferences = [],
  form,
  variantImages,
  setVariantImages,
  openImageDrawer,
}: {
  options: ProductCreateOptionSchema[]
  currencies?: string[]
  regions?: HttpTypes.AdminRegion[]
  pricePreferences?: HttpTypes.AdminPricePreference[]
  form: UseFormReturn<ProductCreateSchemaType>
  variantImages: VariantImages
  setVariantImages: (images: VariantImages) => void
  openImageDrawer: (index: number) => void
}) => {
  const { t } = useTranslation()

  const handleImageUpload = async (files: FileType[], variantIndex: number) => {
    try {
      const { files: uploadedFiles } = await uploadFilesQuery(files)
      if (uploadedFiles?.length) {
        const newImages = [
          ...(variantImages[variantIndex] || []),
          ...uploadedFiles.map((f: HttpTypes.AdminFile) => f.url),
        ]
        setVariantImages({
          ...variantImages,
          [variantIndex]: newImages,
        })
        // Don't save automatically, just update the UI
        toast.success("Images uploaded successfully")
      }
    } catch (error) {
      console.error("Failed to upload images:", error)
      toast.error("Failed to upload images")
    }
  }

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
        id: "image",
        name: "Item Image",
        header: "Item Image (Optional)",
        cell: (context) => {
          const variantIndex = context.row.original.originalIndex
          const images = variantImages[variantIndex] || []

          return (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {images.slice(0, 3).map((imageUrl, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-full border-2 border-ui-bg-base overflow-hidden"
                  >
                    <img
                      src={imageUrl}
                      alt={`Variant image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {images.length > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-ui-bg-base bg-ui-bg-subtle flex items-center justify-center text-xs">
                    +{images.length - 3}
                  </div>
                )}
              </div>
              <Button
                variant="transparent"
                size="small"
                onClick={() => openImageDrawer(variantIndex)}
              >
                Manage Images
              </Button>
              <div className="hidden">
                <FileUpload
                  label=""
                  hint=""
                  multiple={true}
                  formats={SUPPORTED_FORMATS}
                  onUploaded={(files) => handleImageUpload(files, variantIndex)}
                />
              </div>
            </div>
          )
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

      // columnHelper.column({
      //   id: "manage_inventory",
      //   name: t("fields.managedInventory"),
      //   header: t("fields.managedInventory"),
      //   field: (context) =>
      //     `variants.${context.row.original.originalIndex}.manage_inventory`,
      //   type: "boolean",
      //   cell: (context) => {
      //     return <DataGrid.BooleanCell context={context} />
      //   },
      // }),
      // columnHelper.column({
      //   id: "allow_backorder",
      //   name: t("fields.allowBackorder"),
      //   header: t("fields.allowBackorder"),
      //   field: (context) =>
      //     `variants.${context.row.original.originalIndex}.allow_backorder`,
      //   type: "boolean",
      //   cell: (context) => {
      //     return <DataGrid.BooleanCell context={context} />
      //   },
      // }),
      columnHelper.column({
        id: "mrp",
        name: "MRP",
        header: "MRP (Optional)",
        field: (context) =>
          `variants.${context.row.original.originalIndex}.metadata.mrp`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),
      columnHelper.column({
        id: "cost_price",
        name: "Sell Price",
        header: "Sell Price (Required)",
        field: (context) =>
          `variants.${context.row.original.originalIndex}.metadata.cost_price`,
        type: "text",
        cell: (context) => {
          const error =
            form.formState.errors.variants?.[context.row.original.originalIndex]
              ?.metadata?.cost_price
          return (
            <div className="flex flex-col gap-y-1">
              <DataGrid.TextCell context={context} />
              {error && (
                <span className="text-red-500 text-xs">{error.message}</span>
              )}
            </div>
          )
        },
      }),

      columnHelper.column({
        id: "inventory_kit",
        name: t("fields.inventoryKit"),
        header: t("fields.inventoryKit"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.inventory_kit`,
        type: "boolean",
        cell: (context) => {
          return <DataGrid.BooleanCell context={context} />
        },
      }),

      // ...createDataGridPriceColumns<
      //   ProductCreateVariantSchema,
      //   ProductCreateSchemaType
      // >({
      //   currencies,
      //   regions,
      //   pricePreferences,
      //   getFieldName: (context, value) => {
      //     if (context.column.id?.startsWith("currency_prices")) {
      //       return `variants.${context.row.original.originalIndex}.prices.${value}`
      //     }
      //     return `variants.${context.row.original.originalIndex}.prices.${value}`
      //   },
      //   t,
      // }),
    ],
    [
      currencies,
      regions,
      options,
      pricePreferences,
      t,
      form,
      variantImages,
      setVariantImages,
      openImageDrawer,
    ]
  )
}
