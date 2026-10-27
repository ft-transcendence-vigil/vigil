import type { ChangeEvent } from 'react';
import Button from '../../shared/Button';
import StepShell from './StepShell';
import type { TlsMode } from '../../../data/serviceOnboarding';

interface Props {
  stepNumber: number;
  totalSteps: number;
  serviceName: string;
  address: string;
  verifiedAddress: string | null;
  tlsMode: TlsMode;
  caPath: string;
  isVerifyingAddress: boolean;
  verifyAddressError: Error | null;
  tlsVerificationPending: boolean;
  tlsRetryAfterSeconds?: number;
  onAddressChange: (value: string) => void;
  onUseLocalhost: () => void;
  onVerifyAddress: () => void;
  onCaPathChange: (value: string) => void;
}

const buttonAnimation = 'transition-transform duration-150 active:scale-[0.98]';
const DEFAULT_ADDRESS = 'https://localhost';

export default function SecureConnectionStep({
  stepNumber,
  totalSteps,
  serviceName,
  address,
  verifiedAddress,
  tlsMode,
  caPath,
  isVerifyingAddress,
  verifyAddressError,
  tlsVerificationPending,
  tlsRetryAfterSeconds,
  onAddressChange,
  onUseLocalhost,
  onVerifyAddress,
  onCaPathChange,
}: Props) {
  const verified = verifiedAddress === address;
  const isBuiltin = address === DEFAULT_ADDRESS;
  const hostValue = address.replace(/^https:\/\//, '');

  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Secure connection"
      description={`VIGIL accepts telemetry over HTTPS only. Choose the address ${
        serviceName || 'your service'
      } will use to reach VIGIL.`}
    >
      <div className="mb-6 flex flex-col justify-between gap-4 border border-vigil-border bg-vigil-card p-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-[15px] font-semibold">
            Built-in VIGIL endpoint · https://localhost
          </h3>
          <p className="mt-2 text-[14px] leading-5 text-vigil-muted">
            Use this only when the service or Collector can reach VIGIL at
            localhost from its own runtime environment.
          </p>
        </div>
        <Button
          value={verified && isBuiltin ? 'using localhost' : 'use localhost'}
          onClick={onUseLocalhost}
          disabled={verified && isBuiltin}
          className={`${buttonAnimation} whitespace-nowrap`}
        />
      </div>
      <h3 className="mb-3 text-[15px] font-semibold">
        Or use another VIGIL address
      </h3>
      <div className="flex border border-vigil-border bg-vigil-card focus-within:border-vigil-blue">
        <span className="grid place-items-center border-r border-vigil-border px-3 text-[15px] text-vigil-muted">
          https://
        </span>
        <input
          value={hostValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onAddressChange(e.target.value)
          }
          placeholder="vigil.example.com:8443"
          className="mono min-w-0 flex-1 bg-transparent px-3 py-4 outline-none"
        />
      </div>
      <p className="mt-2 text-[13px] leading-5 text-vigil-muted">
        Enter a reachable hostname or IP and optional HTTPS port. This does not
        configure DNS, firewall rules, or port forwarding.
      </p>
      {!isBuiltin && (
        <div className="mt-4 flex flex-col gap-2">
          <div>
            <Button
              value={
                isVerifyingAddress
                  ? 'VERIFYING...'
                  : verified
                    ? 'VERIFIED'
                    : tlsVerificationPending
                      ? 'RETRY VERIFICATION'
                      : 'VERIFY ADDRESS'
              }
              onClick={onVerifyAddress}
              disabled={!address || isVerifyingAddress || verified}
              className={buttonAnimation}
            />
          </div>
          {tlsVerificationPending && (
            <p className="text-[13px] text-vigil-muted">
              Certificate setup is still pending.
              {tlsRetryAfterSeconds
                ? ` Retry after about ${tlsRetryAfterSeconds} seconds.`
                : ' Retry verification shortly.'}
            </p>
          )}
          {verifyAddressError && (
            <p className="text-[13px] text-red-400">
              {verifyAddressError.message}
            </p>
          )}
        </div>
      )}
      {verified && (
        <p className="mt-3 text-[11px] text-emerald-400">
          {tlsMode === 'local'
            ? 'Address verified with VIGIL local CA.'
            : 'Address verified with a publicly trusted certificate.'}
        </p>
      )}
      {verified && tlsMode === 'local' && (
        <div className="mt-3 border-t border-vigil-border pt-3">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-vigil-blue">
            VIGIL installation · Shared CA
          </p>
          <h3 className="mb-2 text-[14px] font-semibold">
            Trust VIGIL's certificate authority
          </h3>
          <p className="mb-4 text-[13px] leading-5 text-vigil-muted">
            Keep HTTPS verification enabled and make the VIGIL CA available to
            the component that sends telemetry.
          </p>
          <label className="mb-2 block text-[12px] uppercase tracking-wider text-vigil-muted">
            VIGIL CA file path in {serviceName || 'your service'}
          </label>
          <input
            value={caPath}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onCaPathChange(e.target.value)
            }
            className="mono w-full border border-vigil-border bg-vigil-card px-3 py-4 text-[14px] outline-none focus:border-[#2196f3]"
          />
        </div>
      )}
    </StepShell>
  );
}
