import { useState } from "react"
import { Plus } from "lucide-react"
import type { User } from "@/lib/types"
import { isValidEmail, isValidIndianMobile } from "@/lib/format"
import { useDb } from "@/data/store"
import { createUser, updateUser } from "@/services/admin"
import { ROLE_LABEL } from "@/app/navigation"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { Avatar, Callout, StatusBadge } from "@/components/ui/feedback"
import { DataTable, SearchFilterBar, type Column } from "@/components/ui/data"
import { FormField, SelectInput, TextInput } from "@/components/ui/forms"
import { Modal } from "@/components/ui/overlays"

const ROLES = [
  "admin",
  "sales",
  "surveyor",
  "inventory",
  "installer",
  "service",
] as const

export default function UsersPage() {
  const db = useDb()
  const { run, fire, pending } = useAction()
  const [q, setQ] = useState("")
  const [role, setRole] = useState("")
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    role: "sales" as User["role"],
    title: "",
  })
  const [tried, setTried] = useState(false)
  const rows = db.users.filter(
    (u) =>
      (!role || u.role === role) &&
      (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
  )
  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (u) => u.name,
      render: (u) => (
        <span className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" />
          <span>
            <span className="block font-medium">{u.name}</span>
            <span className="block text-[12px] text-muted">{u.title}</span>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (u) => u.role,
      render: (u) => (
        <select
          aria-label={`Role for ${u.name}`}
          value={u.role}
          onChange={(e) =>
            fire(
              `role-${u.id}`,
              () => updateUser(u.id, { role: e.target.value as User["role"] }),
              "Role updated",
            )
          }
          className="field h-9 w-auto text-[13px]"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (u) => (
        <span className="text-[13px]">
          {u.email}
          <span className="block text-muted">{u.phone}</span>
        </span>
      ),
    },
    {
      key: "st",
      header: "Status",
      render: (u) => (
        <StatusBadge tone={u.active ? "success" : "neutral"}>
          {u.active ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "act",
      header: "",
      align: "right",
      render: (u) => (
        <Button
          size="sm"
          variant={u.active ? "danger" : "secondary"}
          loading={pending === `act-${u.id}`}
          onClick={() =>
            fire(
              `act-${u.id}`,
              () => updateUser(u.id, { active: !u.active }),
              u.active ? "User deactivated" : "User reactivated",
            )
          }
        >
          {u.active ? "Deactivate" : "Reactivate"}
        </Button>
      ),
    },
  ]
  const errs = {
    name: f.name.trim().length < 2 ? "Name is required." : "",
    email: !isValidEmail(f.email) ? "Valid email required." : "",
    phone: !isValidIndianMobile(f.phone) ? "Valid mobile required." : "",
  }
  return (
    <>
      <PageHeader
        eyebrow="Management"
        title="Users"
        description="Team members and their roles."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => (setTried(false), setOpen(true))}
          >
            Add user
          </Button>
        }
      />
      <Callout tone="info" className="mb-5">
        Roles here drive the demo interface. Real permissions must be enforced
        by the backend.
      </Callout>
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search users…"
            filters={[
              {
                id: "r",
                label: "Role",
                value: role,
                onChange: setRole,
                options: ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
              },
            ]}
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(u) => u.id}
          pageSize={25}
        />
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add user"
        footer={
          <Button
            variant="primary"
            loading={pending === "add"}
            onClick={() => {
              setTried(true)
              if (Object.values(errs).some(Boolean)) return
              run(
                "add",
                () =>
                  createUser({ ...f, title: f.title || ROLE_LABEL[f.role] }),
                "User added",
              )
                .then(
                  () => (
                    setOpen(false),
                    setF({
                      name: "",
                      email: "",
                      phone: "",
                      role: "sales",
                      title: "",
                    })
                  ),
                )
                .catch(() => undefined)
            }}
          >
            Add user
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            required
            error={tried ? errs.name : undefined}
          >
            <TextInput
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </FormField>
          <FormField label="Role" required>
            <SelectInput
              value={f.role}
              onChange={(e) =>
                setF({ ...f, role: e.target.value as User["role"] })
              }
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </FormField>
          <FormField
            label="Email"
            required
            error={tried ? errs.email : undefined}
          >
            <TextInput
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </FormField>
          <FormField
            label="Mobile"
            required
            error={tried ? errs.phone : undefined}
          >
            <TextInput
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Job title" optional className="sm:col-span-2">
            <TextInput
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
