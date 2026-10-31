import { useEffect, useState } from "react"
import type { Photo, Priority } from "@/lib/types"
import { productOf } from "@/lib/rules"
import { useDb } from "@/data/store"
import { createTicket } from "@/services/aftersales"
import { useAction } from "@/lib/useAction"
import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/feedback"
import {
  FileUploader,
  FormField,
  SearchableDropdown,
  SelectInput,
  TextArea,
} from "@/components/ui/forms"
import { Modal, useToast } from "@/components/ui/overlays"
import { WarrantyCard } from "./WarrantyCard"
import { useWarrantyCheck } from "./useWarrantyCheck"

export function CreateTicketModal({
  open,
  onClose,
  customerId: fixedCustomer,
  raisedBy,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  customerId?: string
  raisedBy: "customer" | "staff"
  onCreated?: (id: string) => void
}) {
  const db = useDb()
  const toast = useToast()
  const { run, pending } = useAction()
  const [customerId, setCustomerId] = useState(fixedCustomer ?? "")
  const [instId, setInstId] = useState("")
  const [serial, setSerial] = useState("")
  const [issue, setIssue] = useState("")
  const [priority, setPriority] = useState<Priority>("Medium")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tried, setTried] = useState(false)
  const installs = db.installations.filter(
    (i) => i.customerId === customerId && i.status === "Completed",
  )
  const units = db.units.filter(
    (u) => u.installationId === instId && u.status === "Installed",
  )
  const { result, loading } = useWarrantyCheck(
    serial || installs.find((i) => i.id === instId)?.reference,
  )
  useEffect(() => {
    if (open) {
      setCustomerId(fixedCustomer ?? "")
      setSerial("")
      setIssue("")
      setPhotos([])
      setTried(false)
    }
  }, [open, fixedCustomer])
  useEffect(() => {
    setInstId(installs[0]?.id ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])
  useEffect(() => setSerial(""), [instId])
  const save = () => {
    setTried(true)
    if (!instId || issue.trim().length < 10) return
    run(
      "ticket",
      () =>
        createTicket({
          customerId,
          installationId: instId,
          serial: serial || undefined,
          issue,
          priority,
          photos,
          raisedBy,
        }),
      (id) => `Ticket ${id} raised`,
    )
      .then((id) => (onClose(), onCreated?.(id)))
      .catch(() => undefined)
  }
  const customers = db.customers
    .filter((c) =>
      db.installations.some(
        (i) => i.customerId === c.id && i.status === "Completed",
      ),
    )
    .map((c) => ({
      value: c.id,
      label: c.name,
      description: `${c.phone} · ${db.installations
        .filter((i) => i.customerId === c.id)
        .map((i) => i.reference)
        .join(", ")}`,
    }))
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        raisedBy === "customer"
          ? "Raise a service request"
          : "Create service ticket"
      }
      description="Select the installed component — its warranty record is retrieved automatically."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending === "ticket"}
            onClick={save}
          >
            {raisedBy === "customer" ? "Submit request" : "Create ticket"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {!fixedCustomer && (
            <FormField
              label="Customer"
              required
              error={tried && !customerId ? "Select a customer." : undefined}
            >
              <SearchableDropdown
                options={customers}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Search customer name or phone…"
              />
            </FormField>
          )}
          <FormField
            label="Installation"
            required
            error={
              tried && !instId
                ? "No completed installation for this customer."
                : undefined
            }
          >
            <SelectInput
              value={instId}
              onChange={(e) => setInstId(e.target.value)}
              placeholder={
                installs.length ? undefined : "No completed installation"
              }
              options={installs.map((i) => ({
                value: i.id,
                label: `${i.reference} — ${i.capacity} kW ${i.systemType}`,
              }))}
            />
          </FormField>
          <FormField
            label="Installed equipment"
            hint="Choose the component with the issue, or leave as general workmanship."
          >
            <SelectInput
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="General / workmanship"
              options={units.map((u) => ({
                value: u.serial,
                label: `${productOf(db, u.productId)?.name} — ${u.serial}`,
              }))}
            />
          </FormField>
          <FormField
            label="Describe the issue"
            required
            error={
              tried && issue.trim().length < 10
                ? "At least 10 characters."
                : undefined
            }
          >
            <TextArea
              rows={3}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. Inverter shows error E-07 and does not start in the morning"
            />
          </FormField>
          <FormField label="Priority">
            <SelectInput
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              options={["Low", "Medium", "High", "Critical"]}
            />
          </FormField>
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">
              Warranty record
            </p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : result ? (
              <WarrantyCard v={result} compact />
            ) : (
              <p className="rounded-2xl bg-forest/[0.04] p-4 text-[13px] text-muted">
                Select an installation to retrieve its warranty.
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">
              Photographs (optional)
            </p>
            <FileUploader
              photos={photos}
              onAdd={(p) => setPhotos((l) => [...l, p])}
              onRemove={(id) => setPhotos((l) => l.filter((p) => p.id !== id))}
              onError={(m) => toast({ tone: "error", title: m })}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
