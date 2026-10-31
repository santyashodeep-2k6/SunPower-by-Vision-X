import { useRef } from "react"
import { Download, Printer } from "lucide-react"
import { downloadFile } from "@/lib/format"
import { Modal } from "@/components/ui/overlays"
import { Button } from "@/components/ui/Button"

export function DocumentPreview({
  open,
  onClose,
  title,
  html,
  filename,
}: {
  open: boolean
  onClose: () => void
  title: string
  html: string
  filename: string
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description="Preview of the generated document."
      footer={
        <>
          <Button
            variant="ghost"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => frame.current?.contentWindow?.print()}
          >
            Print / Save as PDF
          </Button>
          <Button
            variant="dark"
            icon={<Download className="h-4 w-4" />}
            onClick={() => downloadFile(filename, html, "text/html")}
          >
            Download
          </Button>
        </>
      }
    >
      <iframe
        ref={frame}
        title={title}
        srcDoc={html}
        className="h-[62vh] w-full rounded-2xl border border-forest/10 bg-white"
      />
    </Modal>
  )
}
