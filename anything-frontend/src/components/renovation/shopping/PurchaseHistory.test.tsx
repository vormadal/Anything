import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PurchaseHistory } from './PurchaseHistory'
import type { RenovationPurchaseResponse } from '@/lib/api-client/models/index'

const mockAttachments = jest.fn()
const mockUpload = jest.fn()
const mockDownload = jest.fn()
const mockDelete = jest.fn()

jest.mock('@/hooks/useRenovation', () => ({
  useRenovationPurchaseAttachments: (...args: unknown[]) => mockAttachments(...args),
  useUploadRenovationPurchaseAttachment: (...args: unknown[]) => mockUpload(...args),
  useDownloadRenovationPurchaseAttachment: (...args: unknown[]) => mockDownload(...args),
  useDeleteRenovationPurchaseAttachment: (...args: unknown[]) => mockDelete(...args),
}))

let mockOnline = true
jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnline,
}))

const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args), success: jest.fn() },
  Toaster: () => null,
}))

function query(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isLoading: false,
    isError: false,
    isPaused: false,
    isFetching: false,
    refetch: jest.fn(),
    ...overrides,
  }
}

function mutation(overrides: Record<string, unknown> = {}) {
  return { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue(undefined), isPending: false, ...overrides }
}

const purchase = {
  id: 100,
  vendor: 'Byggemarked',
  purchasedOn: { year: 2026, month: 10, day: 30 },
  totalAmount: 6380,
  attachmentCount: 2,
  notes: null,
  lines: [
    { lineId: 11, roomName: 'Bedroom', lineLabel: 'Flooring', unit: 'm²', quantity: 12.67, amount: 3662, inventoryItemId: null },
  ],
} as unknown as RenovationPurchaseResponse

const receipts = [
  { id: 1, name: 'Kvittering.pdf', contentType: 'application/pdf' },
  { id: 2, name: 'Garanti.png', contentType: 'image/png' },
]

let uploadMock: ReturnType<typeof mutation>
let downloadMock: ReturnType<typeof mutation>
let deleteMock: ReturnType<typeof mutation>

function renderHistory(purchases: RenovationPurchaseResponse[] = [purchase]) {
  return render(
    <PurchaseHistory
      projectId={7}
      purchases={purchases}
      onAddToInventory={jest.fn()}
      onDeletePurchase={jest.fn()}
    />,
  )
}

async function expandPurchase(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Byggemarked/ }))
}

describe('PurchaseHistory receipts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnline = true
    mockAttachments.mockReturnValue(query(receipts))
    uploadMock = mutation()
    downloadMock = mutation()
    deleteMock = mutation()
    mockUpload.mockReturnValue(uploadMock)
    mockDownload.mockReturnValue(downloadMock)
    mockDelete.mockReturnValue(deleteMock)
  })

  it('shows a paperclip and count on a purchase with receipts', () => {
    renderHistory()

    expect(screen.getByText('2 receipts')).toBeInTheDocument()
  })

  it('hides the receipt count when a purchase has none', () => {
    renderHistory([{ ...purchase, attachmentCount: 0 } as RenovationPurchaseResponse])

    expect(screen.queryByText(/receipt/)).not.toBeInTheDocument()
  })

  it('fetches receipts only once the purchase is expanded', async () => {
    const user = userEvent.setup()
    renderHistory()

    expect(mockAttachments).toHaveBeenCalledTimes(0)
    await expandPurchase(user)

    expect(mockAttachments).toHaveBeenCalledWith(7, 100)
  })

  it('lists receipts in the expanded purchase', async () => {
    const user = userEvent.setup()
    renderHistory()
    await expandPurchase(user)

    expect(screen.getByText('Kvittering.pdf')).toBeInTheDocument()
    expect(screen.getByText('Garanti.png')).toBeInTheDocument()
  })

  it('shows an empty state when no receipts are attached', async () => {
    const user = userEvent.setup()
    mockAttachments.mockReturnValue(query([]))
    renderHistory()
    await expandPurchase(user)

    expect(screen.getByText('No receipts attached yet.')).toBeInTheDocument()
  })

  it('shows a load error instead of the empty state when receipts fail to load', async () => {
    const user = userEvent.setup()
    mockAttachments.mockReturnValue(query(undefined, { isError: true }))
    renderHistory()
    await expandPurchase(user)

    expect(screen.getByText("Couldn't load receipts")).toBeInTheDocument()
    expect(screen.queryByText('No receipts attached yet.')).not.toBeInTheDocument()
  })

  it('uploads a chosen file to the purchase', async () => {
    const user = userEvent.setup()
    renderHistory()
    await expandPurchase(user)

    const file = new File(['content'], 'ny.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Receipt file'), file)

    await waitFor(() => expect(uploadMock.mutateAsync).toHaveBeenCalledWith({ purchaseId: 100, file }))
  })

  it('opens the file picker from the Attach receipt button', async () => {
    const user = userEvent.setup()
    renderHistory()
    await expandPurchase(user)

    const input = screen.getByLabelText('Receipt file')
    const clickSpy = jest.spyOn(input, 'click')
    await user.click(screen.getByRole('button', { name: 'Attach receipt' }))

    expect(clickSpy).toHaveBeenCalled()
  })

  it('shows a toast when the upload is rejected', async () => {
    const user = userEvent.setup()
    uploadMock.mutateAsync.mockRejectedValueOnce(new Error('File is too large'))
    renderHistory()
    await expandPurchase(user)

    await user.upload(
      screen.getByLabelText('Receipt file'),
      new File(['content'], 'ny.pdf', { type: 'application/pdf' }),
    )

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('File is too large'))
  })

  it('downloads a receipt from its download button', async () => {
    const user = userEvent.setup()
    renderHistory()
    await expandPurchase(user)

    await user.click(screen.getByRole('button', { name: 'Download Kvittering.pdf' }))

    expect(downloadMock.mutate).toHaveBeenCalledWith(
      { purchaseId: 100, attachmentId: 1, name: 'Kvittering.pdf' },
      expect.any(Object),
    )
  })

  it('deletes a receipt only after confirming', async () => {
    const user = userEvent.setup()
    renderHistory()
    await expandPurchase(user)

    await user.click(screen.getByRole('button', { name: 'Delete Garanti.png' }))
    const dialog = screen.getByRole('dialog')
    expect(deleteMock.mutateAsync).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(deleteMock.mutateAsync).toHaveBeenCalledWith({ purchaseId: 100, attachmentId: 2 }),
    )
  })

  it('keeps the confirm dialog closed when cancelled', async () => {
    const user = userEvent.setup()
    renderHistory()
    await expandPurchase(user)

    await user.click(screen.getByRole('button', { name: 'Delete Garanti.png' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(deleteMock.mutateAsync).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('disables attaching, downloading and deleting while offline', async () => {
    const user = userEvent.setup()
    mockOnline = false
    renderHistory()
    await expandPurchase(user)

    expect(screen.getByRole('button', { name: 'Attach receipt' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Download Kvittering.pdf' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Kvittering.pdf' })).toBeDisabled()
  })
})
