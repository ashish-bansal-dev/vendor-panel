import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@medusajs/types"
import { Button, ProgressStatus, ProgressTabs, toast } from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useState } from "react"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useCreateShippingOptions } from "../../../../../hooks/api/shipping-options"
import { castNumber } from "../../../../../lib/cast-number"
import {
  FulfillmentSetType,
  ShippingOptionPriceType,
} from "../../../common/constants"
import { CreateShippingOptionDetailsForm } from "./create-shipping-option-details-form"
import { CreateShippingOptionsPricesForm } from "./create-shipping-options-prices-form"
import {
  CreateShippingOptionDetailsSchema,
  CreateShippingOptionSchema,
} from "./schema"
import { useFulfillmentProviderOptions } from "../../../../../hooks/api"

enum Tab {
  DETAILS = "details",
  PRICING = "pricing",
}

type CreateShippingOptionFormProps = {
  zone: HttpTypes.AdminServiceZone
  locationId: string
  isReturn?: boolean
  type: FulfillmentSetType
}

export function CreateShippingOptionsForm({
  zone,
  isReturn,
  locationId,
  type,
}: CreateShippingOptionFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DETAILS)
  const [validDetails, setValidDetails] = useState(false)

  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<CreateShippingOptionSchema>({
    defaultValues: {
      name: "",
      price_type: ShippingOptionPriceType.FlatRate,
      enabled_in_store: true,
      shipping_profile_id: "",
      provider_id: "manual_manual",
      fulfillment_option_id: "",
      region_prices: {},
      currency_prices: {},
      conditional_region_prices: {},
      conditional_currency_prices: {},
    },
    resolver: zodResolver(CreateShippingOptionSchema),
  })

  const selectedProviderId = useWatch({
    control: form.control,
    name: "provider_id",
  })

  const { fulfillment_options: fulfillmentProviderOptions } =
    useFulfillmentProviderOptions(selectedProviderId, {
      enabled: !!selectedProviderId,
    })

  const isCalculatedPriceType =
    form.watch("price_type") === ShippingOptionPriceType.Calculated

  const { mutateAsync, isPending: isLoading } = useCreateShippingOptions()

  const handleSubmit = form.handleSubmit(async (data) => {
    const currencyPrices = Object.entries(data.currency_prices)
      .map(([code, value]) => {
        if (!value) {
          return undefined
        }

        return {
          currency_code: code,
          amount: castNumber(value),
        }
      })
      .filter((p): p is { currency_code: string; amount: number } => !!p)

    const fulfillmentOptionData = fulfillmentProviderOptions?.find(
      (fo) => fo.id === data.fulfillment_option_id
    )!

    await mutateAsync(
      {
        name: data.name,
        service_zone_id: zone.id,
        shipping_profile_id: data.shipping_profile_id,
        provider_id: data.provider_id,
        prices: currencyPrices,
        data: fulfillmentOptionData as unknown as Record<string, unknown>,
        rules: [
          {
            value: isReturn ? "true" : "false",
            attribute: "is_return",
            operator: "eq",
          },
          {
            value: "true",
            attribute: "enabled_in_store",
            operator: "eq",
          },
        ],
        type: {
          // TODO: FETCH TYPES
          label: "Type label",
          description: "Type description",
          code: "type-code",
        },
      },
      {
        onSuccess: ({ shipping_option }) => {
          toast.success(
            t(
              `stockLocations.shippingOptions.create.${
                isReturn ? "returns" : "shipping"
              }.successToast`,
              { name: shipping_option?.name }
            )
          )
          handleSuccess(`/settings/locations/${locationId}`)
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  const onTabChange = (tab: Tab) => {
    if (tab === Tab.PRICING) {
      form.clearErrors()

      const result = CreateShippingOptionDetailsSchema.safeParse({
        ...form.getValues(),
      })

      if (!result.success) {
        const [firstError, ...rest] = result.error.errors

        for (const error of rest) {
          const _path = error.path.join(".") as keyof CreateShippingOptionSchema

          form.setError(_path, {
            message: error.message,
            type: error.code,
          })
        }

        // Focus the first error
        form.setError(
          firstError.path.join(".") as keyof CreateShippingOptionSchema,
          {
            message: firstError.message,
            type: firstError.code,
          },
          {
            shouldFocus: true,
          }
        )

        setValidDetails(false)
        return
      }

      setValidDetails(true)
    }

    setActiveTab(tab)
  }

  const pricesStatus: ProgressStatus =
    form.getFieldState("currency_prices")?.isDirty ||
    form.getFieldState("region_prices")?.isDirty ||
    activeTab === Tab.PRICING
      ? "in-progress"
      : "not-started"

  const detailsStatus: ProgressStatus = validDetails
    ? "completed"
    : "in-progress"

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        className="flex h-full flex-col"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          const isEnterKey = e.key === "Enter"
          const isModifierPressed = e.metaKey || e.ctrlKey
          const shouldContinueToPricing =
            activeTab !== Tab.PRICING && !isCalculatedPriceType

          if (!isEnterKey) {
            return
          }
          e.preventDefault()

          if (!isModifierPressed) {
            return
          }

          if (shouldContinueToPricing) {
            e.stopPropagation()
            onTabChange(Tab.PRICING)
            return
          }

          handleSubmit()
        }}
      >
        <ProgressTabs
          value={activeTab}
          className="flex h-full flex-col overflow-hidden"
          onValueChange={(tab) => onTabChange(tab as Tab)}
        >
          <RouteFocusModal.Header>
            <ProgressTabs.List className="border-ui-border-base -my-2 ml-2 min-w-0 flex-1 border-l">
              <ProgressTabs.Trigger
                value={Tab.DETAILS}
                status={detailsStatus}
                className="w-full max-w-[200px]"
              >
                <span className="w-full cursor-auto overflow-hidden text-ellipsis whitespace-nowrap">
                  {t("stockLocations.shippingOptions.create.tabs.details")}
                </span>
              </ProgressTabs.Trigger>
              {!isCalculatedPriceType && (
                <ProgressTabs.Trigger
                  value={Tab.PRICING}
                  status={pricesStatus}
                  className="w-full max-w-[200px]"
                >
                  <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    {t("stockLocations.shippingOptions.create.tabs.prices")}
                  </span>
                </ProgressTabs.Trigger>
              )}
            </ProgressTabs.List>
          </RouteFocusModal.Header>

          <RouteFocusModal.Body className="size-full overflow-hidden">
            <ProgressTabs.Content
              value={Tab.DETAILS}
              className="size-full overflow-y-auto"
            >
              <CreateShippingOptionDetailsForm
                form={form}
                zone={zone}
                isReturn={isReturn}
                type={type}
                locationId={locationId}
                fulfillmentProviderOptions={fulfillmentProviderOptions || []}
                selectedProviderId={selectedProviderId}
              />
            </ProgressTabs.Content>
            <ProgressTabs.Content value={Tab.PRICING} className="size-full">
              <CreateShippingOptionsPricesForm form={form} type={type} />
            </ProgressTabs.Content>
          </RouteFocusModal.Body>
          <RouteFocusModal.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <RouteFocusModal.Close asChild>
                <Button variant="secondary" size="small">
                  {t("actions.cancel")}
                </Button>
              </RouteFocusModal.Close>
              {activeTab === Tab.PRICING || isCalculatedPriceType ? (
                <Button
                  size="small"
                  className="whitespace-nowrap"
                  isLoading={isLoading}
                  key="submit-btn"
                  type="submit"
                >
                  {t("actions.save")}
                </Button>
              ) : (
                <Button
                  size="small"
                  className="whitespace-nowrap"
                  isLoading={isLoading}
                  onClick={() => onTabChange(Tab.PRICING)}
                  key="continue-btn"
                  type="button"
                >
                  {t("actions.continue")}
                </Button>
              )}
            </div>
          </RouteFocusModal.Footer>
        </ProgressTabs>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
