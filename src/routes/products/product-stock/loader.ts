import { HttpTypes } from "@medusajs/types"
import { defer, LoaderFunctionArgs } from "react-router-dom"
import { sdk } from "../../../lib/client"
import { PRODUCT_VARIANT_IDS_KEY } from "../common/constants"

async function getProductStockData(id: string, productVariantIds?: string[]) {
  const CHUNK_SIZE = 20
  let offset = 0
  let totalCount = 0

  let allVariants: HttpTypes.AdminProductVariant[] = []

  do {
    const { variants: chunk, count } = await sdk.client.fetch(
      `/vendor/products/${id}/variants`,
      {
        method: "GET",
        query: {
          id: productVariantIds,
          offset,
          limit: CHUNK_SIZE,
          fields:
            "id,title,sku,inventory_items,inventory_items.*,inventory_items.inventory,inventory_items.inventory.id,inventory_items.inventory.title,inventory_items.inventory.sku,*inventory_items.inventory.location_levels,product.thumbnail",
        },
      }
    ) as HttpTypes.AdminProductVariantListResponse

    allVariants = [...allVariants, ...chunk]
    totalCount = count
    offset += CHUNK_SIZE
  } while (allVariants.length < totalCount)

  const { stock_locations } = await sdk.client.fetch(
    `/vendor/stock-locations`,
    {
      method: "GET",
      query: {
        limit: 9999,
        fields: "id,name",
      },
    }
  ) as HttpTypes.AdminStockLocationListResponse

  return {
    variants: allVariants,
    locations: stock_locations,
  }
}

export const productStockLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  const id = params.id!
  const searchParams = new URLSearchParams(request.url)
  const productVariantIds =
    searchParams.get(PRODUCT_VARIANT_IDS_KEY)?.split(",") || undefined

  const dataPromise = getProductStockData(id, productVariantIds)

  return defer({
    data: dataPromise,
  })
}
