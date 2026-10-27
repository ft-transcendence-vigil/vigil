import Button from '../../shared/Button';
import StepShell from './StepShell';

interface Props {
  stepNumber: number;
  totalSteps: number;
  caPath: string;
  onDownloadCa: () => void;
  isDownloadingCa: boolean;
  downloadCaError: Error | null;
}

const buttonAnimation = 'transition-transform duration-150 active:scale-[0.98]';

export default function CaAvailabilityStep({
  stepNumber,
  totalSteps,
  caPath,
  onDownloadCa,
  isDownloadingCa,
  downloadCaError,
}: Props) {
  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Make the VIGIL CA available"
      description="This VIGIL address uses the installation's local certificate authority. Download its public CA certificate and make it available to the process that sends telemetry."
    >
      <div className="border border-vigil-border bg-vigil-card p-4">
        <h3 className="mb-2 text-[15px] font-semibold">
          Download the VIGIL CA
        </h3>
        <p className="mb-4 text-[13px] leading-5 text-vigil-muted">
          This is the public CA certificate only. It does not contain VIGIL's
          private key.
        </p>
        <Button
          value={isDownloadingCa ? 'DOWNLOADING...' : 'GET vigil-ca.crt'}
          onClick={onDownloadCa}
          disabled={isDownloadingCa}
          className={buttonAnimation}
        />
        {downloadCaError && (
          <p className="mt-3 text-[13px] text-red-400">
            {downloadCaError.message}
          </p>
        )}
      </div>
      <div className="mt-4 border border-vigil-border bg-vigil-card p-4">
        <p className="mb-2 text-[12px] uppercase tracking-wider text-vigil-muted">
          Expected path inside your service
        </p>
        <code className="mono text-[13px]">{caPath}</code>
        <p className="mt-3 text-[13px] leading-5 text-vigil-muted">
          Downloading the file does not put it at this path automatically. If
          the service runs in Docker, mount the certificate into the container
          as a read-only file.
        </p>
      </div>
    </StepShell>
  );
}
