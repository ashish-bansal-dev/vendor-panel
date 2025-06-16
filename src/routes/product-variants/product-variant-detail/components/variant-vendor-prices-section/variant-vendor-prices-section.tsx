import { useTranslation } from "react-i18next"
import { Container, Heading, Button, Input } from "@medusajs/ui"
import { useState } from "react"

import {
  useVendorVariantPrices,
  useUpsertVendorVariantPrice,
} from "../../../../../hooks/api/vendor-variant-prices"

type Row = {
  id: string
  variant_id: string
  buyer_type: string
  buyer_id?: string | null
  buyer_group_id?: string | null
  price: number
}

export function VariantVendorPricesSection({ variant }: { variant: any }) {
  const { t } = useTranslation()
  const { prices } = useVendorVariantPrices(variant.id)
  const upsert = useUpsertVendorVariantPrice(variant.id)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")

  // form for creating new generic price (buyer_type level)
  const [newBuyerType, setNewBuyerType] = useState("admin")
  const [newPrice, setNewPrice] = useState("")

  const startEdit = (row: Row) => {
    setEditingId(row.id)
    setEditingValue(String(row.price))
  }

  const saveEdit = (row: Row) => {
    if (!editingValue) return
    upsert.mutate({
      buyer_type: row.buyer_type,
      buyer_id: row.buyer_id ?? undefined,
      buyer_group_id: row.buyer_group_id ?? undefined,
      price: Number(editingValue),
    })
    setEditingId(null)
    setEditingValue("")
  }

  const addPrice = () => {
    if (!newPrice) return
    upsert.mutate({
      buyer_type: newBuyerType,
      price: Number(newPrice),
    })
    setNewPrice("")
  }

  return (
    <Container className="flex flex-col divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Custom Prices</Heading>
      </div>

      {prices
        ?.sort((a, b) => {
          const order = ["admin", "reseller", "customer"]
          return order.indexOf(a.buyer_type) - order.indexOf(b.buyer_type)
        })
        .map((row) => {
          const label =
            row.buyer_type.charAt(0).toUpperCase() +
            row.buyer_type.slice(1) +
            (row.buyer_id ? `:${row.buyer_id}` : "") +
            (row.buyer_group_id ? `:${row.buyer_group_id}` : "")

          const isEditing = editingId === row.id

          return (
            <div
              key={row.id}
              className="txt-small text-ui-fg-subtle flex items-center justify-between gap-x-4 px-6 py-2"
            >
              <span className="flex-1">{label}</span>

              {isEditing ? (
                <>
                  <Input
                    type="number"
                    value={editingValue}
                    className="w-24"
                    onChange={(e) => setEditingValue(e.target.value)}
                  />
                  <Button
                    size="small"
                    variant="primary"
                    onClick={() => saveEdit(row)}
                    isLoading={upsert.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="w-24 text-right">{row.price}</span>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => startEdit(row)}
                  >
                    Edit
                  </Button>
                </>
              )}
            </div>
          )
        })}

      {!prices?.length && (
        <span className="txt-small text-ui-fg-subtle px-6 py-4">
          {t("placeholders.noPrices" as any)}
        </span>
      )}

      <div className="flex items-center gap-x-4 px-6 py-4">
        <select
          value={newBuyerType}
          onChange={(e) => setNewBuyerType(e.target.value)}
          className="w-32 border rounded p-1 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="reseller">Reseller</option>
          <option value="customer">Customer</option>
        </select>
        <Input
          type="number"
          placeholder="Price"
          value={newPrice}
          className="w-24"
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <Button
          size="small"
          variant="primary"
          onClick={addPrice}
          isLoading={upsert.isPending}
        >
          Add
        </Button>
      </div>
    </Container>
  )
}
