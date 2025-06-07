import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { Badge, Tooltip } from "@medusajs/ui"

import { PlaceholderCell } from "../../common/placeholder-cell"
import { HttpTypes } from "@medusajs/types"

type VariantCellProps = {
  variants?: HttpTypes.AdminProductVariant[] | null
}

export const VariantCell = ({ variants }: VariantCellProps) => {
  const { t } = useTranslation()
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})

  // Generate QR codes for variant barcodes
  useEffect(() => {
    if (!variants?.length) return

    const generateQRCodes = async () => {
      const codes: Record<string, string> = {}
      
      for (const variant of variants) {
        if (variant.barcode) {
          try {
            // Use existing QR code from metadata if available
            if (variant.metadata?.qr_code) {
              codes[variant.id] = variant.metadata.qr_code as string
            } else {
              // Generate new QR code
              const url = await QRCode.toDataURL(variant.barcode, { 
                errorCorrectionLevel: 'H' 
              })
              codes[variant.id] = url
            }
          } catch (error) {
            console.error("Failed to generate QR code:", error)
          }
        }
      }
      
      setQrCodes(codes)
    }

    generateQRCodes()
  }, [variants])

  if (!variants || !variants.length) {
    return <PlaceholderCell />
  }

  // Find the first variant with a barcode to display as a preview
  const variantWithBarcode = variants.find(v => v.barcode && qrCodes[v.id])

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Tooltip 
        content={
          <div className="max-w-xs">
            <p className="mb-2 font-medium">{t("products.variantCount", { count: variants.length })}</p>
            {variants.filter(v => v.barcode).length > 0 && (
              <div className="mt-2">
                <p className="text-xs mb-1">{t("fields.barcodes")}:</p>
                <div className="max-h-40 overflow-auto">
                  {variants.map(v => v.barcode && (
                    <div key={v.id} className="flex items-center gap-2 mb-1">
                      <Badge size="2xsmall">{v.barcode}</Badge>
                      {qrCodes[v.id] && (
                        <img 
                          src={qrCodes[v.id]} 
                          alt="QR Code" 
                          className="h-8 w-8" 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <span className="truncate">
            {t("products.variantCount", { count: variants.length })}
          </span>
          {variantWithBarcode && (
            <img 
              src={qrCodes[variantWithBarcode.id]} 
              alt="QR Code" 
              className="h-6 w-6" 
            />
          )}
        </div>
      </Tooltip>
    </div>
  )
}

export const VariantHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.variants")}</span>
    </div>
  )
}
