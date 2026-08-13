import { Button, Card, Input } from '@qr/ui';
import { Building2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { publicApiUrl } from '../lib/api.js';

interface ContactResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data?: { readonly reference?: string };
}
export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ContactResponse | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch(`${publicApiUrl}/contact`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          universityName: values.get('universityName'),
          contactName: values.get('contactName'),
          email: values.get('email'),
          phone: values.get('phone') || undefined,
          message: values.get('message'),
          website: values.get('website'),
        }),
      });
      const body = (await response.json()) as ContactResponse;
      if (!response.ok) throw new Error(body.message || 'Your request could not be sent.');
      setConfirmation(body);
      form.reset();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Your request could not be sent.',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="contact-form-card">
      <div className="contact-form-heading">
        <span>
          <MessageSquareText size={21} />
        </span>
        <div>
          <p>Institutional enquiry</p>
          <h2>Request an Attendity demonstration</h2>
        </div>
      </div>
      <p className="contact-form-intro">
        Share the university context behind your attendance goals. The implementation desk will
        prepare a focused conversation—not a generic sales script.
      </p>
      <div className="contact-form-assurances">
        <span>
          <Building2 size={15} /> University-focused
        </span>
        <span>
          <ShieldCheck size={15} /> Privacy-aware enquiry
        </span>
      </div>
      <form className="contact-form" onSubmit={(event) => void submit(event)}>
        <fieldset>
          <legend>University and contact details</legend>
          <Input
            autoComplete="organization"
            label="University name"
            name="universityName"
            required
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input autoComplete="name" label="Contact name" name="contactName" required />
            <Input autoComplete="tel" label="Phone (optional)" name="phone" type="tel" />
          </div>
          <Input
            autoComplete="email"
            label="Official university email"
            name="email"
            required
            type="email"
          />
        </fieldset>
        <fieldset>
          <legend>What should the demonstration address?</legend>
          <label className="contact-message-field">
            Attendance goals, current process, campuses, or policy questions
            <textarea
              minLength={20}
              name="message"
              placeholder="Tell us what a successful Attendity rollout should improve…"
              required
            />
          </label>
        </fieldset>
        <label aria-hidden="true" className="absolute -left-[9999px]">
          Website
          <input autoComplete="off" name="website" tabIndex={-1} />
        </label>
        {confirmation ? (
          <p className="rounded-xl bg-emerald-50 p-4 text-sm text-primary" role="status">
            {confirmation.message}
            {confirmation.data?.reference ? ` Reference: ${confirmation.data.reference}.` : ''}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={pending} type="submit">
          {pending ? 'Sending request…' : 'Request a demonstration'}
        </Button>
        <p className="contact-form-footnote">
          By submitting, you confirm that you are authorised to make this university enquiry.
        </p>
      </form>
    </Card>
  );
}
