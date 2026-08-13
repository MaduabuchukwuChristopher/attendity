import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInstitutionTerminology, INSTITUTION_TYPES, INSTITUTION_TYPE_LABELS } from '@qr/shared';
import type {
  AcademicTerminologyPreset,
  InstitutionSettings,
  InstitutionTerminology,
  InstitutionType,
} from '@qr/types';
import { Button, Card, CardHeader, ErrorState, Input, Skeleton } from '@qr/ui';
import type { SemanticTone } from '@qr/ui';
import { BellRing, Building2, Image, Languages, MapPin, Palette, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { apiClient } from '../../api/client.js';
import { FormActionFeedback } from '../../components/form-action-feedback.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';
import { apiErrorMessage } from '../auth/auth-utils.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useInstitutionSettings } from './use-institution-settings.js';
import { InstitutionLogoField, type InstitutionLogoChange } from './institution-logo-field.js';

const selectClassName =
  'h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';

const terminologyFields: readonly {
  readonly key: keyof InstitutionTerminology;
  readonly label: string;
}[] = [
  { key: 'institution', label: 'Institution (singular)' },
  { key: 'institutionPlural', label: 'Institution (plural)' },
  { key: 'primaryUnit', label: 'Primary academic unit' },
  { key: 'primaryUnitPlural', label: 'Primary units (plural)' },
  { key: 'department', label: 'Department (singular)' },
  { key: 'departmentPlural', label: 'Departments (plural)' },
  { key: 'programme', label: 'Programme (singular)' },
  { key: 'programmePlural', label: 'Programmes (plural)' },
  { key: 'course', label: 'Learning unit (singular)' },
  { key: 'coursePlural', label: 'Learning units (plural)' },
  { key: 'educator', label: 'Educator (singular)' },
  { key: 'educatorPlural', label: 'Educators (plural)' },
  { key: 'student', label: 'Learner (singular)' },
  { key: 'studentPlural', label: 'Learners (plural)' },
  { key: 'academicPeriod', label: 'Academic period' },
  { key: 'academicPeriodPlural', label: 'Academic periods (plural)' },
];

function formText(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function Section({
  icon,
  title,
  description,
  children,
  tone,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly tone: SemanticTone;
}) {
  return (
    <Card className="p-6 sm:p-7" tone={tone}>
      <CardHeader description={description} icon={icon} title={title} tone={tone} />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function InstitutionBrandingSection({ settings }: { readonly settings: InstitutionSettings }) {
  const client = useQueryClient();
  const { notify } = useDashboardToast();
  const [change, setChange] = useState<InstitutionLogoChange>({ kind: 'unchanged' });
  const save = useMutation({
    mutationFn: async () => {
      if (change.kind === 'unchanged') return settings;
      if (change.kind === 'remove')
        return (
          await apiClient.put<{ readonly data: InstitutionSettings }>('/settings/branding', {
            logoAssetId: null,
          })
        ).data.data;
      const uploaded = (
        await apiClient.post<{
          readonly data: { readonly assetId: string; readonly url: string };
        }>('/uploads/institution-logo', change.file, {
          headers: {
            'Content-Type': change.file.type,
            'x-file-name': encodeURIComponent(change.file.name),
          },
        })
      ).data.data;
      return (
        await apiClient.put<{ readonly data: InstitutionSettings }>('/settings/branding', {
          logoAssetId: uploaded.assetId,
          logoUrl: uploaded.url,
        })
      ).data.data;
    },
    onSuccess: async () => {
      setChange({ kind: 'unchanged' });
      await client.invalidateQueries({ queryKey: ['institution-settings'] });
      notify({
        tone: 'success',
        title: 'Institution branding saved',
        message: 'The approved logo will appear on supported new documents and exports.',
      });
    },
    onError: (error) =>
      notify({
        tone: 'error',
        title: 'Branding not saved',
        message: apiErrorMessage(
          error,
          'The institution logo could not be saved. Retry the upload.',
        ),
      }),
  });
  const errorMessage = save.isError
    ? apiErrorMessage(save.error, 'The institution logo could not be saved. Retry the upload.')
    : undefined;

  return (
    <Card className="mt-8 p-6 sm:p-7" tone="blue">
      <CardHeader
        description="Upload the tenant-owned logo used on supported PDFs, QR posters, printed records, and spreadsheets."
        icon={<Image aria-hidden="true" size={19} />}
        title="Institution branding"
        tone="blue"
      />
      <div className="mt-6">
        <InstitutionLogoField
          current={
            settings.logoUrl ? { assetId: settings.logoAssetId ?? '', url: settings.logoUrl } : null
          }
          disabled={save.isPending}
          onChange={setChange}
        />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <FormActionFeedback
            message={save.isSuccess ? 'Institution branding saved successfully.' : errorMessage}
            status={save.isSuccess ? 'success' : save.isError ? 'error' : 'idle'}
          />
        </div>
        <Button
          disabled={save.isPending || change.kind === 'unchanged'}
          onClick={() => save.mutate()}
          type="button"
        >
          {save.isPending ? 'Saving branding…' : 'Save institution branding'}
        </Button>
      </div>
    </Card>
  );
}

function SettingsForm({ settings }: { readonly settings: InstitutionSettings }) {
  const client = useQueryClient();
  const [institutionType, setInstitutionType] = useState(settings.institutionType);
  const [terminologyPreset, setTerminologyPreset] = useState(settings.terminologyPreset);
  const presetType: InstitutionType =
    terminologyPreset === 'custom' ? institutionType : terminologyPreset;
  const preview = getInstitutionTerminology(presetType, settings.terminologyOverrides);
  const save = useMutation({
    mutationFn: (body: Omit<InstitutionSettings, 'terminology'>) =>
      apiClient.put('/settings', body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['institution-settings'] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const terminologyOverrides = Object.fromEntries(
      terminologyFields
        .map(({ key }) => [key, formText(data, `terminology.${key}`)] as const)
        .filter(([, value]) => value.length > 0),
    ) as Partial<InstitutionTerminology>;
    save.mutate({
      institutionName: formText(data, 'institutionName'),
      institutionType: formText(data, 'institutionType') as InstitutionType,
      countryCode: formText(data, 'countryCode'),
      countryName: formText(data, 'countryName'),
      primaryColor: formText(data, 'primaryColor'),
      secondaryColor: formText(data, 'secondaryColor'),
      terminologyPreset: formText(data, 'terminologyPreset') as AcademicTerminologyPreset,
      terminologyOverrides,
      staffTitlePreference: formText(data, 'staffTitlePreference'),
      studentIdentifierLabel: formText(data, 'studentIdentifierLabel'),
      studentIdentifierExample: formText(data, 'studentIdentifierExample'),
      studentIdentifierPattern: formText(data, 'studentIdentifierPattern'),
      studentIdentifierGuidance: formText(data, 'studentIdentifierGuidance'),
      timeZone: formText(data, 'timeZone'),
      dateFormat: formText(data, 'dateFormat') as InstitutionSettings['dateFormat'],
      attendanceRequirement: Number(data.get('attendanceRequirement')),
      qrRotationSeconds: Number(data.get('qrRotationSeconds')),
      gpsRadiusMetres: Number(data.get('gpsRadiusMetres')),
      lateArrivalMinutes: Number(data.get('lateArrivalMinutes')),
      academicSession: formText(data, 'academicSession'),
      currentSemester: formText(data, 'currentSemester'),
      electiveRegistrationRequiresApproval: data.has('electiveRegistrationRequiresApproval'),
      reminderPolicy: {
        allowedChannels: {
          in_app: data.has('reminder.in_app'),
          email: data.has('reminder.email'),
          push: data.has('reminder.push'),
          sms: data.has('reminder.sms'),
        },
        maximumWindowMinutes: Number(data.get('reminder.maximumWindowMinutes')),
      },
    });
  };

  return (
    <form className="mt-8 grid gap-6" onSubmit={submit}>
      <Section
        description="These details identify the tenant while preserving existing records and permissions."
        icon={<Building2 size={19} />}
        title="Institution identity"
        tone="navy"
      >
        <Input
          defaultValue={settings.institutionName}
          label="Institution name"
          name="institutionName"
          required
        />
        <label className="grid gap-2 text-sm font-medium">
          Institution type
          <select
            className={selectClassName}
            defaultValue={settings.institutionType}
            name="institutionType"
            onChange={(event) => setInstitutionType(event.currentTarget.value as InstitutionType)}
          >
            {INSTITUTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {INSTITUTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Input
            defaultValue={settings.primaryColor}
            label="Primary colour"
            name="primaryColor"
            pattern="#[0-9A-Fa-f]{6}"
            required
          />
          <Input
            className="p-1"
            defaultValue={settings.primaryColor}
            label="Preview"
            name="primaryColorPreview"
            type="color"
          />
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Input
            defaultValue={settings.secondaryColor}
            label="Secondary colour"
            name="secondaryColor"
            pattern="#[0-9A-Fa-f]{6}"
            required
          />
          <Input
            className="p-1"
            defaultValue={settings.secondaryColor}
            label="Preview"
            name="secondaryColorPreview"
            type="color"
          />
        </div>
      </Section>

      <Section
        description="Country, time zone, and date formatting control how schedules and records are presented."
        icon={<MapPin size={19} />}
        title="Locale and time"
        tone="teal"
      >
        <Input
          autoCapitalize="characters"
          defaultValue={settings.countryCode}
          label="ISO country code"
          maxLength={2}
          minLength={2}
          name="countryCode"
          placeholder="NG"
          required
        />
        <Input
          defaultValue={settings.countryName}
          label="Country name"
          name="countryName"
          required
        />
        <Input
          defaultValue={settings.timeZone}
          label="IANA time zone"
          name="timeZone"
          placeholder="Africa/Lagos"
          required
        />
        <label className="grid gap-2 text-sm font-medium">
          Date format
          <select className={selectClassName} defaultValue={settings.dateFormat} name="dateFormat">
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </label>
      </Section>

      <Section
        description="Choose a preset for familiar academic language, or customise every label."
        icon={<Languages size={19} />}
        title="Academic terminology"
        tone="violet"
      >
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Terminology preset
          <select
            className={selectClassName}
            defaultValue={settings.terminologyPreset}
            name="terminologyPreset"
            onChange={(event) =>
              setTerminologyPreset(event.currentTarget.value as AcademicTerminologyPreset)
            }
          >
            {INSTITUTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {INSTITUTION_TYPE_LABELS[type]}
              </option>
            ))}
            <option value="custom">Custom terminology</option>
          </select>
        </label>
        <div className="sm:col-span-2 rounded-2xl border border-border bg-background p-4 dark:border-slate-700 dark:bg-dark-background">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Label preview</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {preview.primaryUnitPlural} · {preview.departmentPlural} · {preview.coursePlural} ·{' '}
            {preview.educatorPlural} · {preview.studentPlural} · {preview.academicPeriodPlural}
          </p>
        </div>
        {terminologyPreset === 'custom'
          ? terminologyFields.map(({ key, label }) => (
              <Input
                defaultValue={settings.terminologyOverrides[key] ?? ''}
                key={key}
                label={label}
                name={`terminology.${key}`}
                placeholder={getInstitutionTerminology(institutionType)[key]}
              />
            ))
          : null}
        <Input
          defaultValue={settings.staffTitlePreference}
          label="Preferred staff title"
          name="staffTitlePreference"
          required
        />
        <Input
          defaultValue={settings.studentIdentifierLabel}
          label="Student identifier label"
          name="studentIdentifierLabel"
          required
        />
        <Input
          defaultValue={settings.studentIdentifierExample}
          label="Student identifier example"
          name="studentIdentifierExample"
          placeholder="UNI/DEP/2026/001"
          required
        />
        <Input
          defaultValue={settings.studentIdentifierPattern}
          label="Student identifier validation pattern"
          name="studentIdentifierPattern"
          required
        />
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Student identifier guidance
          <textarea
            className={`${selectClassName} min-h-24 py-3`}
            defaultValue={settings.studentIdentifierGuidance}
            maxLength={240}
            name="studentIdentifierGuidance"
            required
          />
        </label>
      </Section>

      <Section
        description="Defaults are applied consistently to attendance sessions and academic reporting."
        icon={<ShieldCheck size={19} />}
        title="Academic and attendance defaults"
        tone="green"
      >
        <Input
          defaultValue={settings.academicSession}
          label="Current academic session"
          name="academicSession"
          pattern="\d{4}/\d{4}"
          placeholder="2026/2027"
          required
        />
        <Input
          defaultValue={settings.currentSemester}
          label={`Current ${preview.academicPeriod.toLowerCase()}`}
          name="currentSemester"
          required
        />
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-100/60 px-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/50 sm:col-span-2">
          <input
            defaultChecked={settings.electiveRegistrationRequiresApproval}
            name="electiveRegistrationRequiresApproval"
            type="checkbox"
          />
          Require administrator approval before elective registrations become active
        </label>
        {[
          { name: 'attendanceRequirement', label: 'Minimum attendance (%)', min: 0, max: 100 },
          { name: 'qrRotationSeconds', label: 'QR rotation (seconds)', min: 30, max: 120 },
          { name: 'gpsRadiusMetres', label: 'GPS radius (metres)', min: 10, max: 1000 },
          { name: 'lateArrivalMinutes', label: 'Late arrival (minutes)', min: 0, max: 120 },
        ].map(({ name, label, min, max }) => (
          <Input
            defaultValue={settings[name as keyof InstitutionSettings] as number}
            key={name}
            label={label}
            max={max}
            min={min}
            name={name}
            required
            type="number"
          />
        ))}
      </Section>

      <Section
        description="Govern which reminder channels users may choose and how far ahead a reminder can be scheduled. Provider availability is enforced separately."
        icon={<BellRing size={19} />}
        title="Class reminder policy"
        tone="gold"
      >
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">Allowed delivery channels</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['in_app', 'In-app'],
                ['email', 'Email'],
                ['push', 'PWA push'],
                ['sms', 'SMS-ready'],
              ] as const
            ).map(([channel, label]) => (
              <label
                className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-200 bg-amber-100/60 px-3 text-sm dark:border-amber-800 dark:bg-amber-950/50"
                key={channel}
              >
                <input
                  defaultChecked={settings.reminderPolicy.allowedChannels[channel]}
                  name={`reminder.${channel}`}
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Input
          defaultValue={settings.reminderPolicy.maximumWindowMinutes}
          label="Maximum reminder window (minutes)"
          max="10080"
          min="5"
          name="reminder.maximumWindowMinutes"
          required
          type="number"
        />
        <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          SMS remains unavailable to users until an approved provider is configured. Allowing it
          here only prepares the policy.
        </div>
      </Section>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Palette size={18} />
          </span>
          <div>
            <p className="font-semibold">Apply institution configuration</p>
            <p className="text-sm text-slate-500">Changes are tenant-scoped and audit logged.</p>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 gap-3 sm:max-w-xl">
          <MutationFormFeedback
            error={save.error}
            errorFallback="Settings could not be saved. Review each value and try again."
            status={save.isSuccess ? 'success' : save.isError ? 'error' : 'idle'}
            submissionId={save.submittedAt}
            successMessage="Institution settings saved successfully."
            successTitle="Settings saved"
          />
          <Button className="w-fit sm:justify-self-end" disabled={save.isPending} type="submit">
            {save.isPending ? 'Saving…' : 'Save institution settings'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

export default function SettingsPage() {
  const settings = useInstitutionSettings();
  if (settings.isLoading)
    return (
      <DashboardLayout>
        <Skeleton className="h-96" />
      </DashboardLayout>
    );
  if (settings.isError || !settings.data)
    return (
      <DashboardLayout>
        <ErrorState
          title="Unable to load institution settings"
          description="Please retry your request."
          retry={() => void settings.refetch()}
        />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <p className="text-sm font-semibold text-primary">Institution administration</p>
      <h1 className="mt-1 text-3xl font-bold">Institution settings</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Configure Attendity for your institution without changing the underlying tenant architecture
        or historical attendance records.
      </p>
      <InstitutionBrandingSection settings={settings.data} />
      <SettingsForm key={JSON.stringify(settings.data)} settings={settings.data} />
    </DashboardLayout>
  );
}
