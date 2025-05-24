import { Container, Heading, Text } from "@medusajs/ui"
import { StoreVendor } from "../../../../../types/user"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Pencil } from "@medusajs/icons"

export const CompanySection = ({ seller }: { seller: StoreVendor }) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Company</Heading>
          <Text size="small" className="text-ui-fg-subtle text-pretty">
            Manage your company's details
          </Text>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Pencil />,
                  label: "Edit",
                  to: "edit-company",
                },
              ],
            },
          ]}
        />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Address
        </Text>
        <Text size="small" leading="compact">
          {seller.address_line || "-"}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Postal Code
        </Text>
        <Text size="small" leading="compact">
          {seller.postal_code || "-"}
        </Text>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Country
        </Text>
        <Text size="small" leading="compact">
          {seller.country_code || "-"}
        </Text>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          State
        </Text>
        <Text size="small" leading="compact">
          {seller.state || "-"}
        </Text>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          City
        </Text>
        <Text size="small" leading="compact">
          {seller.city || "-"}
        </Text>
      </div>


      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          GSTIN
        </Text>
        <Text size="small" leading="compact">
          {seller.gstin || "-"}
        </Text>
      </div>
      {/* Display Type */}
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Profile Type
        </Text>
        <Text size="small" leading="compact">
          {seller.type ? seller.type.charAt(0).toUpperCase() + seller.type.slice(1) : "-"}
        </Text>
      </div>
      {/* Display Verification Status */}
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Document Verification
        </Text>
        <Text size="small" leading="compact">
          {seller.verification_status ? seller.verification_status.charAt(0).toUpperCase() + seller.verification_status.slice(1) : "-"}
        </Text>
      </div>
      {/* Display Handle */}
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Handle
        </Text>
        <Text size="small" leading="compact">
          {seller.handle || "-"}
        </Text>
      </div>
    </Container>
  )
}
