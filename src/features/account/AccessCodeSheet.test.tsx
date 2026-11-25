import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { updateSettings } from '../../settings/deviceSettings'
import type { AccessCodeResult } from '../../sync/account'
import { AccessCodeSheet } from './AccessCodeSheet'

const account = vi.hoisted(() => ({
  accessNeeded: { id: 'u1', email: 'freund@example.com' } as { id: string; email: string | null } | null,
  redeem: vi.fn<(code: string) => Promise<AccessCodeResult>>(),
  cancel: vi.fn(async () => {}),
}))

vi.mock('../../sync/account', () => ({
  useAccount: () => ({ account: null, guestDecision: null, signInError: null, accessNeeded: account.accessNeeded }),
  redeemAccessCode: account.redeem,
  cancelAccessCode: account.cancel,
}))

// jsdom may lack the modal dialog API that Sheet uses.
const dialog = HTMLDialogElement.prototype as Partial<HTMLDialogElement>
dialog.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
dialog.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
}

describe('access code sheet', () => {
  beforeEach(() => {
    updateSettings({ language: 'en' })
    account.accessNeeded = { id: 'u1', email: 'freund@example.com' }
    account.redeem.mockReset()
    account.cancel.mockClear()
  })

  it('stays hidden while no login waits for the code', () => {
    account.accessNeeded = null
    render(<AccessCodeSheet />)
    expect(screen.queryByTestId('accessCode')).toBeNull()
  })

  it('sends the typed code and says when it is wrong or locked', async () => {
    account.redeem.mockResolvedValueOnce('wrong').mockResolvedValueOnce('locked')
    render(<AccessCodeSheet />)
    expect(screen.getByText('Signed in as freund@example.com.')).toBeInTheDocument()
    const unlock = screen.getByTestId('redeemAccessCode')
    expect(unlock).toBeDisabled()
    await userEvent.type(screen.getByTestId('accessCode'), 'falsch')
    await userEvent.click(unlock)
    expect(account.redeem).toHaveBeenCalledWith('falsch')
    expect(await screen.findByRole('alert')).toHaveTextContent('This access code is not right.')
    await userEvent.click(unlock)
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many wrong codes')
  })

  it('shows no error after the right code', async () => {
    account.redeem.mockResolvedValueOnce('ok')
    render(<AccessCodeSheet />)
    await userEvent.type(screen.getByTestId('accessCode'), 'Bank Drücken 24{Enter}')
    expect(account.redeem).toHaveBeenCalledWith('Bank Drücken 24')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('signs the login out when cancelled', async () => {
    render(<AccessCodeSheet />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(account.cancel).toHaveBeenCalled()
  })
})
