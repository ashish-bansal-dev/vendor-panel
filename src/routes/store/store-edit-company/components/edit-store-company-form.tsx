import { useForm } from "react-hook-form"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { StoreVendor } from "../../../../types/user"
import { KeyboundForm } from "../../../../components/utilities/keybound-form"
import { Form } from "../../../../components/common/form"
import { Button, Input, toast } from "@medusajs/ui"
import { useUpdateMe } from "../../../../hooks/api"

const EditStoreSchema = z.object({
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country_code: z.string().optional(),
  gstin: z.string().optional(),
  handle: z.string().optional(),
})

// Define a type for the complete form shape including display-only fields
type EditStoreFormShape = z.infer<typeof EditStoreSchema> & {
  handle: string;
};

export const EditStoreCompanyForm = ({ seller }: { seller: StoreVendor }) => {
  const { handleSuccess } = useRouteModal()

  const form = useForm<EditStoreFormShape>({
    defaultValues: {
      address_line: seller.address_line || "",
      postal_code: seller.postal_code || "",
      city: seller.city || "",
      state: seller.state || "",
      country_code: seller.country_code || "",
      gstin: seller.gstin || "",
      handle: seller.handle || "",
    },
    resolver: zodResolver(EditStoreSchema),
  })

  const { mutateAsync, isPending } = useUpdateMe()

  const handleSubmit = form.handleSubmit(async (values) => {
    // Construct the payload with only fields from EditStoreSchema
    const updateData: z.infer<typeof EditStoreSchema> = {
      address_line: values.address_line,
      postal_code: values.postal_code,
      city: values.city,
      state: values.state,
      country_code: values.country_code,
      gstin: values.gstin,
      handle: values.handle,
    };

    await mutateAsync(
      updateData,
      {
        onSuccess: () => {
          toast.success("Store updated")
          handleSuccess()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col overflow-y-auto">
        <RouteDrawer.Body className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-y-8">
            <Form.Field
              name="address_line"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Address</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="postal_code"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Postal Code</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name="country_code"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Country</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name="state"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>State</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name="city"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>City</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <Form.Field
              name="gstin"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>GSTIN</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="handle"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Handle</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              Cancel
            </Button>
          </RouteDrawer.Close>
          <Button type="submit" size="small" isLoading={isPending}>
            Save
          </Button>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
