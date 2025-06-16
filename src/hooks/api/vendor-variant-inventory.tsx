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

const VENDOR_VARIANT_INV_KEY = "vendor_variant_inv" as const
export const vendorVariantInvKeys = queryKeysFactory(VENDOR_VARIANT_INV_KEY)

type Inventory = {
  id: string
  variant_id: string
  quantity: number
}

type InvResp = { inventory: Inventory | null }

export function useVendorVariantInventory(
  variantId: string,
  options?: Omit<
    UseQueryOptions<InvResp, FetchError, InvResp, QueryKey>,
    "queryKey" | "queryFn"
  >
) {
  const { data, ...rest } = useQuery({
    queryKey: vendorVariantInvKeys.detail(variantId),
    queryFn: () =>
      fetchQuery(`vendor/variants/${variantId}/inventory`, {
        method: "GET",
      }),
    ...options,
  })
  return { ...data, ...rest }
}

export function useAdjustVendorVariantInventory(
  variantId: string,
  options?: UseMutationOptions<
    InvResp,
    FetchError,
    { delta?: number; quantity?: number }
  >
) {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery(`/vendor/variants/${variantId}/inventory`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vendorVariantInvKeys.detail(variantId),
      })
    },
    ...options,
  })
}
