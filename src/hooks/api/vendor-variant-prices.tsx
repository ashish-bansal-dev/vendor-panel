import { fetchQuery } from "../../lib/client"
import {
  useQuery,
  UseQueryOptions,
  QueryKey,
  useMutation,
  UseMutationOptions,
} from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const VENDOR_VARIANT_PRICE_KEY = "vendor_variant_price" as const
export const vendorVariantPriceKeys = queryKeysFactory(VENDOR_VARIANT_PRICE_KEY)

type PriceRow = {
  id: string
  variant_id: string
  buyer_type: string
  buyer_id?: string | null
  buyer_group_id?: string | null
  price: number
}

type ListResp = { prices: PriceRow[] }
type SingleResp = { price: PriceRow }

export function useVendorVariantPrices(
  variantId: string,
  options?: Omit<
    UseQueryOptions<ListResp, FetchError, ListResp, QueryKey>,
    "queryKey" | "queryFn"
  >
) {
  const { data, ...rest } = useQuery({
    queryKey: vendorVariantPriceKeys.detail(variantId),
    queryFn: () =>
      fetchQuery(`/vendor/variants/${variantId}/prices`, {
        method: "GET",
      }),
    ...options,
  })
  return { ...data, ...rest }
}

export function useUpsertVendorVariantPrice(
  variantId: string,
  options?: UseMutationOptions<SingleResp, FetchError, any>
) {
  return useMutation({
    mutationFn: (payload: any) =>
      fetchQuery(`/vendor/variants/${variantId}/prices`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vendorVariantPriceKeys.detail(variantId),
      })
    },
    ...options,
  })
}

export function useUpsertVendorPricesBatch(
  options?: UseMutationOptions<any, FetchError, { prices: any[] }>
) {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/variants/prices/batch", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (_data, variables) => {
      // Invalidate cached vendor variant price queries for updated variant ids
      const variantIds = Array.from(
        new Set((variables?.prices ?? []).map((p: any) => p.variant_id))
      )
      variantIds.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: vendorVariantPriceKeys.detail(id),
        })
      })
    },
    ...options,
  })
}
