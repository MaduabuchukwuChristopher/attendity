import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstitutionLogoField } from '../src/features/settings/institution-logo-field.js';

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:institution-logo'),
    revokeObjectURL: vi.fn(),
  });
});

describe('institution logo field', () => {
  it('previews a selected logo and reports its file details', () => {
    const onChange = vi.fn();
    render(<InstitutionLogoField current={null} onChange={onChange} />);
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'university-logo.png', {
      type: 'image/png',
    });

    fireEvent.change(screen.getByLabelText('Institution logo'), { target: { files: [file] } });

    expect(screen.getByAltText('Selected institution logo')).toHaveAttribute(
      'src',
      'blob:institution-logo',
    );
    expect(screen.getByText(/university-logo\.png/i)).toBeVisible();
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'upload', file });
  });

  it('can remove the current managed logo without accepting an arbitrary URL', () => {
    const onChange = vi.fn();
    render(
      <InstitutionLogoField
        current={{ assetId: 'asset-id', url: 'https://res.cloudinary.com/demo/logo.png' }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove institution logo' }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'remove' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
