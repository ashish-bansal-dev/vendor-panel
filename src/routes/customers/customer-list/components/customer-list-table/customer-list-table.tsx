import { Container, Heading } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { _DataTable } from "../../../../../components/table/data-table"
import { useCustomers } from "../../../../../hooks/api/customers"
import { useCustomerTableColumns } from "../../../../../hooks/table/columns/use-customer-table-columns"
import { useCustomerTableFilters } from "../../../../../hooks/table/filters/use-customer-table-filters"
import { useCustomerTableQuery } from "../../../../../hooks/table/query/use-customer-table-query"
import { useDataTable } from "../../../../../hooks/use-data-table"

const PAGE_SIZE = 20

export const CustomerListTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw } = useCustomerTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { customers, count, isLoading, isError, error } = useCustomers(
    {
      offset: searchParams.offset,
      limit: searchParams.limit,
    },
    {
      placeholderData: keepPreviousData,
    },
    {
      groups: searchParams.groups,
      has_account: searchParams.has_account,
      order: searchParams.order,
      q: searchParams.q,
    }
  )

  const filters = useCustomerTableFilters()
  const columns = useColumns()

  const { table } = useDataTable({
    data: customers ?? [],
    columns,
    count,
    enablePagination: true,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{t("customers.domain")}</Heading>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        filters={filters}
        orderBy={[
          { key: "email", label: t("fields.email") },
          {
            key: "first_name",
            label: t("fields.firstName"),
          },
          { key: "last_name", label: t("fields.lastName") },
          {
            key: "has_account",
            label: t("customers.hasAccount"),
          },
          {
            key: "created_at",
            label: t("fields.createdAt"),
          },
          {
            key: "updated_at",
            label: t("fields.updatedAt"),
          },
        ]}
        isLoading={isLoading}
        navigateTo={(row) => row.original.id}
        queryObject={raw}
        search
        noRecords={{
          message: t("customers.list.noRecordsMessage"),
        }}
      />
    </Container>
  )
}

const useColumns = () => {
  const columns = useCustomerTableColumns()

  return useMemo(() => [...columns], [columns])
}
